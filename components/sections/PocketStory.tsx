"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { POCKET_APPS, POCKET_STORY } from "@/lib/content";
import { store, useStore } from "@/lib/store";
import { APP_NAMES } from "@/components/brand/AppIcon";
import type { PocketScene } from "@/components/pocket/scene";
import styles from "./PocketStory.module.css";

// Cairn Pocket's story, scrolled through in real 3D. The stage holds still
// while the section scrolls past it, and the scroll plays the story: the
// disc, your phone as it is, the tap, what's inside, and the wall by the
// door it lives on. The words change with it, one beat at a time.
//
// Reduced motion, a lost WebGL context, or no scripts at all get the same
// story told once: the words in order beside one composed frame of the end.
//
// The scene is heavy to build (its own WebGL context, a baked studio and a
// dozen shader programs, and on some GPUs a compile holds up every frame on
// screen), so it's built long before the story is reached: from the
// visitor's first move, wherever they are, a slice at a time in idle moments
// while the page's frames are on time, its GPU work once the page's device
// canvas is up. Until it has drawn, a still of its first frame holds the stage.

const REDUCED = "(prefers-reduced-motion: reduce)";
// Narrow screens, portrait tablets among them, stack the scene over the
// words; the same query as PocketStory.module.css's, so the 3D composition
// and the layout always agree.
const NARROW = "(max-width: 820px), (max-aspect-ratio: 21/20)";
// A small screen draws fewer pixels: the same width as the CSS's narrow
// breakpoint, so an 820px tablet is small to both.
const SMALL = "(max-width: 820px)";
const subscribeReduced = (cb: () => void) => {
  const m = window.matchMedia(REDUCED);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );

// When each beat's words are on screen, in progress through the section:
// fading in between the first two values and out between the last two. The
// first is up from the start; the last stays to the end.
// The tap's words arrive with the tap itself (at 0.42), to name the moment.
const WINDOWS: [number, number, number, number][] = [
  [-1, 0, 0.12, 0.16],
  [0.18, 0.215, 0.345, 0.375],
  [0.4, 0.425, 0.585, 0.615],
  [0.66, 0.695, 0.785, 0.815],
  [0.875, 0.91, 2, 3],
];

// The hallway wall comes up behind the last beat's words (the scene's
// WALL window): a scrim comes with it, so they stay on a dark ground.
const WALL: [number, number] = [0.8, 0.88];

// The build's pace (ms): a slice waits for the page to be still this long, or,
// through a long smooth scroll, goes after GIVE once its frames are on time,
// and after LIMIT whatever the frames are doing.
const QUIET = 150;
const GIVE = 200;
const LIMIT = 1000;
// A frame later than this (ms) is one held up (by another scene's compile, say).
const LATE = 40;
// The drawing's fade over the still (PocketStory.module.css), and its catch-up
// with the scroll afterwards (ms).
const FADE = 320;
const CATCH = 480;
// Up to here the drawing can arrive on screen by fading in over the still (the
// story at 0) and catching up; past it, it simply cuts in.
const CUT = 0.16;
const CATCH_MAX = 0.2;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

const APPS = POCKET_APPS.map((a) => APP_NAMES[a]);
const APP_LIST = `${APPS.slice(0, -1).join(", ")} and ${APPS[APPS.length - 1]}`;
// A measure never breaks from its number ("56 mm").
const LEDE = POCKET_STORY.lede.replace(/(\d) (?=mm\b)/g, "$1\u00a0");

// Stacked, the scene keeps to the stage above the words: down to the top of
// their tallest beat, less a gap. On a short phone, where that would leave it
// less than 70% of the stage, the gap narrows, but never below NEAR: the
// ground's fade is only half dark that high, and a phone there would show
// through the words.
const NEAR = 16;
const room = (stage: DOMRect, words: DOMRect) => {
  const top = words.top - stage.top;
  return Math.min(top - NEAR, Math.max(0.7 * stage.height, top - Math.max(24, 0.08 * stage.height)));
};

export function PocketStory() {
  const reduced = useReducedMotion();
  const finish = useStore((s) => s.finish);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const still = reduced || status === "fallback";
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const poster = useRef<HTMLImageElement>(null);
  const beats = useRef<(HTMLElement | null)[]>([]);
  const scene = useRef<PocketScene | null>(null);
  const progress = useRef(0);
  const pinned = useRef(false);

  // The 3D stage: built ahead of time (see above), drawing only while it's
  // on screen, and following the visitor's finish and zone.
  useEffect(() => {
    const el = frame.current!;
    const cv = canvas.current!;
    const words = copy.current!;
    let cancelled = false;
    let visible = false;
    let started = false;
    // Close enough that the build stops waiting for good moments.
    let urgent = false;
    let lastScroll = -Infinity;
    let s: PocketScene | null = null;
    let raf = 0;
    const small = () => window.matchMedia(SMALL).matches;
    const narrow = () => window.matchMedia(NARROW).matches;
    // The stage's size, and the height the scene may use from its top (all
    // of it, unless stacked over the words), which the still of the first
    // frame is placed by too.
    const measure = () => {
      const r = el.getBoundingClientRect();
      const n = narrow();
      const h = n ? room(r, words.getBoundingClientRect()) : r.height;
      section.current?.style.setProperty("--room", `${h.toFixed(1)}px`);
      return { width: r.width, height: r.height, narrow: n, small: small(), room: h };
    };
    const run = () => s?.setActive(visible && !document.hidden);
    const onScroll = () => {
      lastScroll = performance.now();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
    const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    // A task of its own: posted from a frame's callback, it runs once that
    // frame has gone out.
    const task = () =>
      new Promise<void>((r) => {
        const c = new MessageChannel();
        c.port1.onmessage = () => r();
        c.port2.postMessage(0);
      });
    const idle = () =>
      new Promise<void>((r) => {
        if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => r(), { timeout: 500 });
        else window.setTimeout(r, 50);
      });

    // The page's last few frame intervals, watched while the scene is built:
    // while another scene's shaders compile, the GPU holds frames up, and a
    // slice started then would wait on it too.
    const gaps: number[] = [];
    let watching = false;
    let lastFrame = 0;
    const watch = (now: number) => {
      if (!watching) return;
      if (lastFrame) {
        gaps.push(now - lastFrame);
        if (gaps.length > 4) gaps.shift();
      }
      lastFrame = now;
      raf = requestAnimationFrame(watch);
    };
    // On time: no more than one of the last four frames late.
    const onTime = () => gaps.length === 4 && gaps.filter((g) => g >= LATE).length <= 1;

    // A good moment for the build's next slice: in idle time once the page's
    // frames are on time and it has been still a moment (or, through a long
    // smooth scroll, a moment later). Once the story is close, right after
    // the next frame has gone out, so a slice never holds one up.
    const pace = async () => {
      if (cancelled) return;
      if (!urgent) {
        await idle();
        const from = performance.now();
        while (!urgent && !cancelled) {
          const now = performance.now();
          if (onTime() && (now - lastScroll > QUIET || now - from > GIVE)) break;
          if (now - from > LIMIT) break;
          await nextFrame();
        }
        if (!urgent) return idle();
      }
      await nextFrame();
      await task();
    };

    // The first frame the visitor sees. On screen near the start, the
    // drawing fades in over the still at the still's own moment (the story
    // at 0), then catches up with the scroll; anywhere else, it's simply there.
    const reveal = async (sc: PocketScene) => {
      const blend = visible && (reduced || progress.current <= CUT);
      sc.show(blend ? 0 : progress.current);
      if (blend) el.dataset.fade = "";
      setStatus("ready");
      run();
      if (blend && !reduced) {
        await sleep(FADE);
        if (cancelled) return;
        if (progress.current > CATCH_MAX) sc.show(progress.current);
        else {
          const t0 = performance.now();
          await new Promise<void>((done) => {
            const step = (now: number) => {
              if (cancelled) return done();
              const k = Math.min(1, (now - t0) / CATCH);
              sc.setProgress(progress.current * easeInOut(k));
              if (k < 1) raf = requestAnimationFrame(step);
              else done();
            };
            raf = requestAnimationFrame(step);
          });
          if (cancelled) return;
        }
      }
      scene.current = sc;
      sc.setProgress(progress.current);
    };

    let { finish, level } = store.get();
    const start = async () => {
      if (started) return;
      started = true;
      unlisten();
      // The still of the first frame loads now, not when it's nearly in view.
      if (poster.current) poster.current.loading = "eager";
      watching = true;
      raf = requestAnimationFrame(watch);
      // Even loading the scene's code is a step: its module is evaluated in one go.
      await pace();
      if (cancelled) return;
      const { createPocketScene } = await import("@/components/pocket/scene");
      if (cancelled) return;
      const made = { finish, level };
      try {
        s = await createPocketScene(
          cv,
          { lost: () => setStatus("fallback") },
          { still: reduced, finish, level, ...measure() },
          () => cancelled,
          pace,
          gpu,
        );
      } catch {
        watching = false;
        if (!cancelled) setStatus("fallback");
        return;
      }
      if (!s || cancelled) {
        watching = false;
        return;
      }
      // Anything that changed while it was being built.
      const box = measure();
      if (box.width > 0) s.resize(box);
      if (finish !== made.finish) s.setFinish(finish);
      if (level !== made.level) s.setLevel(level);
      // The first frame, and the page's re-render for it, in a moment of their
      // own, once the GPU has caught up with the build (close to the story
      // too, for a moment: the still holds the stage meanwhile).
      await pace();
      await s.caughtUp(600);
      for (const until = performance.now() + 400; !cancelled && !onTime() && performance.now() < until; ) await nextFrame();
      await task();
      watching = false;
      if (cancelled) return;
      await reveal(s);
    };

    // The build's GPU work waits for the page's device canvas and a moment
    // more: it builds its own programs first, and only once the visitor has
    // shown an intent, so a phone never makes a context before a touch.
    const gpu = async () => {
      while (!urgent && !cancelled && document.documentElement.dataset.gl !== "ready") await sleep(200);
      if (!urgent && !cancelled) await sleep(400);
    };

    // It starts on the visitor's first move (as the device canvas does), or
    // once that canvas is up on its own, wherever the visitor is.
    const INTENTS = ["pointermove", "pointerdown", "scroll", "keydown", "touchstart"] as const;
    const onIntent = () => void start();
    for (const type of INTENTS) window.addEventListener(type, onIntent, { once: true, passive: true });
    const unlisten = () => INTENTS.forEach((type) => window.removeEventListener(type, onIntent));
    void (async () => {
      while (!started && !cancelled && document.documentElement.dataset.gl !== "ready") await sleep(500);
      if (!cancelled) void start();
    })();

    // The last resort: close to the story and still not built, it goes
    // without waiting for good moments.
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        near.disconnect();
        urgent = true;
        void start();
      },
      { rootMargin: "60% 0px" },
    );
    const seen = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]!.isIntersecting;
      run();
    });
    near.observe(el);
    seen.observe(el);

    // The words' tallest beat moves the room too.
    const sized = new ResizeObserver(() => {
      const box = measure();
      if (box.width > 0) s?.resize(box);
    });
    sized.observe(el);
    sized.observe(words);

    // The pointer's lean starts once the drawing has caught up, so it never
    // moves off the still it fades in over.
    const onPointer = (e: PointerEvent) => {
      const sc = scene.current;
      if (!sc || !visible || e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      sc.setPointer((e.clientX - (r.left + r.width / 2)) / (r.width / 2), (e.clientY - (r.top + r.height / 2)) / (r.height / 2));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", run);

    const unsubscribe = store.subscribe(() => {
      const next = store.get();
      if (next.finish !== finish) s?.setFinish(next.finish);
      if (next.level !== level) s?.setLevel(next.level);
      finish = next.finish;
      level = next.level;
    });

    return () => {
      cancelled = true;
      watching = false;
      unlisten();
      cancelAnimationFrame(raf);
      near.disconnect();
      seen.disconnect();
      sized.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", run);
      unsubscribe();
      s?.dispose();
      scene.current = null;
    };
  }, [reduced]);

  // The scroll: one progress value for the scene and the words, scrubbed so
  // it follows the page with a little give.
  useEffect(() => {
    const items = beats.current.filter((b): b is HTMLElement => b !== null);
    if (still) {
      for (const el of items) {
        el.style.opacity = "";
        el.style.transform = "";
      }
      section.current?.style.removeProperty("--wall");
      // Dropping the pin (the context was lost) shortens the page: the
      // sections below re-measure where their scroll starts.
      if (pinned.current) {
        pinned.current = false;
        void import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => requestAnimationFrame(() => ScrollTrigger.refresh()));
      }
      return;
    }
    let shown = -1;
    const apply = (p: number) => {
      progress.current = p;
      scene.current?.setProgress(p);
      let best = 0;
      let most = 0;
      items.forEach((el, i) => {
        const [a, b, c, d] = WINDOWS[i]!;
        const come = i === 0 ? 1 : smooth((p - a) / (b - a));
        const go = smooth((p - c) / (d - c));
        const o = come * (1 - go);
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translate3d(0, ${((1 - come) * 26 - go * 18).toFixed(1)}px, 0)`;
        if (o > most) {
          most = o;
          best = i;
        }
      });
      if (best !== shown) {
        shown = best;
        section.current!.dataset.beat = String(best);
      }
      section.current!.style.setProperty("--wall", smooth((p - WALL[0]) / (WALL[1] - WALL[0])).toFixed(3));
    };
    apply(progress.current);

    let kill = () => {};
    let cancelled = false;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const proxy = { p: progress.current };
      let last = 0;
      const tween = gsap.to(proxy, {
        p: 1,
        ease: "none",
        onUpdate: () => apply(proxy.p),
        scrollTrigger: {
          trigger: track.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          // After a frame held up by something else on the page, the story
          // lands where the scroll is instead of racing through the beats
          // it missed.
          onUpdate: (self) => {
            const now = performance.now();
            if (now - last > 200 && Math.abs(self.progress - proxy.p) > 0.04) self.getTween()?.progress(1);
            last = now;
          },
        },
      });
      pinned.current = true;
      // A section above that settles its height after load (How measures its
      // own words) moves the track, and nothing tells the trigger: it would
      // keep its old start, and the story would run behind the stage. So a
      // change in the page's height has it measure again, once things settle.
      // Only a real change in height counts, and never mid-scroll: a refresh
      // re-measures every trigger on the page, and one run while the hero's
      // track is being scrolled stalls its story.
      const st = tween.scrollTrigger;
      let timer = 0;
      let height = document.body.offsetHeight;
      let scrolled = 0;
      const onScroll = () => {
        scrolled = performance.now();
      };
      const check = () => {
        if (performance.now() - scrolled < 500) {
          timer = window.setTimeout(check, 500);
          return;
        }
        const t = track.current;
        if (!st || !t) return;
        if (Math.abs(t.getBoundingClientRect().top + window.scrollY - st.start) > 1) ScrollTrigger.refresh();
      };
      const settle = new ResizeObserver(() => {
        const h = document.body.offsetHeight;
        if (h === height) return;
        height = h;
        window.clearTimeout(timer);
        timer = window.setTimeout(check, 200);
      });
      settle.observe(document.body);
      window.addEventListener("scroll", onScroll, { passive: true });
      kill = () => {
        settle.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.clearTimeout(timer);
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });
    return () => {
      cancelled = true;
      kill();
    };
  }, [still]);

  return (
    <section ref={section} id="pocket" className={styles.story} data-theme="night" data-static={still ? "" : undefined} data-beat="0" aria-labelledby="pocket-title">
      <div ref={track} className={styles.track}>
        <div className={styles.stage}>
          {/* The drawing (and the phone's screen inside it) is depicted; its
              text equivalent is the page's own words. */}
          <figure ref={frame} className={styles.scene} data-scene={status}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export; the still is pre-sized */}
            <img className={styles.still} src="/stills/pocket-door.webp" alt="" width={1496} height={1122} loading="lazy" decoding="async" />
            {/* The story's first frame, in the visitor's finish, until the scene has drawn. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- static export; the still is pre-sized */}
            <img ref={poster} className={styles.poster} src={`/stills/pocket-story-${finish}.webp`} alt="" width={1512} height={1512} loading="lazy" decoding="async" />
            <canvas ref={canvas} className={styles.canvas} aria-hidden="true" data-depicted="" />
            <figcaption className="visually-hidden">
              Cairn Pocket turns to show its white ceramic face. A phone beside it buzzes with {APP_LIST}. It taps the disc: a ripple
              spreads, and those apps lock. It comes apart: under the ceramic top are a copper antenna and a tiny chip on a thin
              board, a ferrite sheet, the titanium body and the suction pad, and no battery. Then it sticks to the hallway wall by the
              front door.
            </figcaption>
          </figure>
          <div className={styles.scrim} aria-hidden="true" />

          <div ref={copy} className={styles.copy}>
            <div
              ref={(el) => {
                beats.current[0] = el;
              }}
              className={`${styles.beat} ${styles.intro}`}
            >
              <h2 id="pocket-title" className={`title ${styles.title}`} data-reveal="">
                {POCKET_STORY.title}
              </h2>
              <p className="lede">{LEDE}</p>
            </div>
            <ol className={styles.beats}>
              {POCKET_STORY.beats.map((b, i) => (
                <li
                  key={b.title}
                  ref={(el) => {
                    beats.current[i + 1] = el;
                  }}
                  className={styles.beat}
                >
                  <p className={styles.line}>{b.title}</p>
                  {b.text && <p className={styles.text}>{b.text}</p>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
