"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent } from "react";
import { STEPS, ZONES, type Level } from "@/lib/content";
import { AppIcon, APP_NAMES } from "@/components/brand/AppIcon";
import { Lock } from "@/components/icons";
import { HouseStage } from "@/components/house/HouseStage";
import type { WalkState } from "@/components/house/scene";
import styles from "./How.module.css";

// How it works, acted out in a model of a home. The house stays in view while
// the three steps pass it: the phones buzz while you choose; the zone grows
// from the desk to the room to the whole house as you turn; and when you get
// up, you walk across the house to turn it down. This section keeps its own
// mode; the hero's dial is the visitor's.

const CHOSEN = ["instagram", "tiktok", "youtube", "x"] as const;
const MODE = ["off", "desk", "room", "home"] as const;
const STEP_ID = ["choose", "turn", "get-up"] as const;

const REDUCED = "(prefers-reduced-motion: reduce)";
// Where the house holds at the top and the steps pass beneath it: the same
// query as How.module.css's.
const STACKED = "(max-width: 820px), (max-aspect-ratio: 21/20)";
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

// The zone's colour, as tokens: the chip and the readout dot take the current
// mode (ink when off); locks keep the last colour that was on, so they don't
// flash ink while the zone draws back in.
const zoneVars = (level: Level, lit: Level) =>
  ({
    "--zone": level > 0 ? `var(--mode-${MODE[level]})` : "var(--fg)",
    "--zone-ink": level > 0 ? `var(--mode-${MODE[level]}-ink)` : "var(--bg)",
    "--zone-lit": `var(--mode-${MODE[lit]})`,
    "--zone-lit-ink": `var(--mode-${MODE[lit]}-ink)`,
  }) as CSSProperties;

export function How() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [scrolled, setScrolled] = useState<Level>(1);
  const [picked, setPicked] = useState<Level | null>(null);
  const [walkLevel, setWalkLevel] = useState<Level>(3);
  const [walkState, setWalkState] = useState<WalkState>("idle");
  const [replay, setReplay] = useState(0);
  const [tail, setTail] = useState(0);
  const [held, setHeld] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);

  // Reduced motion keeps one still frame at Room; the chips still change it.
  const walking = !reduced && picked === null && step === 2;
  const level: Level = reduced ? (picked ?? 2) : (picked ?? (step === 0 ? 0 : step === 1 ? scrolled : walkLevel));

  const againShown = walking && walkState === "done";

  const [lit, setLit] = useState<Level>(2);
  if (level > 0 && level !== lit) setLit(level);

  // Which step is beside the house, and how far through Turn the reader is.
  // A chip the visitor picks holds until the story moves on.
  useEffect(() => {
    const items = [...list.current!.querySelectorAll<HTMLElement>("[data-step]")];
    const turn = items[1]!;
    let raf = 0;
    let lastStep = -1;
    let lastLevel = -1;
    const measure = () => {
      raf = 0;
      const vh = window.innerHeight;
      const stacked = window.matchMedia(STACKED).matches;
      const below = stage.current!.getBoundingClientRect().bottom;
      const line = stacked ? Math.min(vh * 0.86, Math.max(vh * 0.5, below + (vh - below) * 0.36)) : vh * 0.6;
      let s = 0;
      items.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= line) s = i;
      });
      const r = turn.getBoundingClientRect();
      const p = (line - r.top) / Math.max(1, r.height);
      const l: Level = p < 0.36 ? 1 : p < 0.7 ? 2 : 3;
      if (s === lastStep && l === lastLevel) return;
      if (s === 2 && lastStep !== 2) {
        setWalkLevel(3);
        setWalkState("idle");
      }
      lastStep = s;
      lastLevel = l;
      setStep(s);
      setScrolled(l);
      setPicked(null);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    queue();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    // The steps' words, measured. Stacked, the last step's hang below the grid
    // by their height, so they leave with the house, and the house is sized
    // so the tallest step's fit under it (How.module.css).
    const bodies = items.map((el) => el.firstElementChild as HTMLElement);
    const last = bodies[bodies.length - 1]!;
    const sized = new ResizeObserver(() => {
      setTail(Math.ceil(last.offsetHeight));
      setHeld(Math.ceil(Math.max(...bodies.map((b) => b.offsetHeight))));
    });
    bodies.forEach((b) => sized.observe(b));
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      sized.disconnect();
    };
  }, []);

  const pick = (l: Level) => setPicked(l);
  const onChipKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const by: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next: number | null = null;
    if (e.key in by) next = (level + by[e.key]! + 4) % 4;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 3;
    if (next === null) return;
    e.preventDefault();
    pick(next as Level);
    chips.current[next]?.focus();
  };

  const again = () => {
    setWalkLevel(3);
    setWalkState("walking");
    setReplay((n) => n + 1);
  };

  return (
    <section
      id="how"
      className={`section ${styles.how}`}
      data-theme="day"
      data-mode={MODE[level]}
      data-step={STEP_ID[step]}
      data-walk={walking ? walkState : "idle"}
      aria-labelledby="how-title"
      style={
        {
          ...zoneVars(level, lit),
          "--tail": `${tail}px`,
          ...(held > 0 && { "--held": `${held}px` }),
        } as CSSProperties
      }
    >
      <div className={`inner ${styles.grid}`}>
        <h2 id="how-title" className={`title ${styles.title}`} data-reveal="">
          On in a second. Off takes a walk.
        </h2>

        <div ref={stage} className={styles.stage}>
          <div className={styles.frame}>
            <HouseStage
              level={level}
              walk={walking}
              still={reduced}
              replay={replay}
              labels={step > 0}
              pocket={step === 1}
              walker={walking && walkState === "walking"}
              onLevel={setWalkLevel}
              onWalk={setWalkState}
            />
          </div>
        </div>

        <ol ref={list} className={styles.list}>
          {STEPS.map((s, i) => (
            <li key={s.title} data-step={i} data-active={step === i ? "" : undefined} className={styles.step}>
              <div className={styles.body}>
                <span className={`num ${styles.num}`} aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="subtitle">{s.title}</h3>
                <p className={styles.text}>{s.text}</p>

                {i === 0 && (
                  <ul className={styles.apps} aria-label="Apps chosen to lock">
                    {CHOSEN.map((app) => (
                      <li key={app} className={styles.app}>
                        <AppIcon app={app} className={styles.appIcon} />
                        <span className={styles.badge} aria-hidden="true">
                          <Lock />
                        </span>
                        <span className="visually-hidden">{APP_NAMES[app]}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {i === 1 && (
                  <div className={styles.turn}>
                    <div className={styles.chips} role="radiogroup" aria-label="Zone in the model" onKeyDown={onChipKey}>
                      <span className={styles.thumb} style={{ "--at": level } as React.CSSProperties} aria-hidden="true" />
                      {ZONES.map((z, k) => (
                        <button
                          key={z.id}
                          ref={(el) => {
                            chips.current[k] = el;
                          }}
                          type="button"
                          role="radio"
                          aria-checked={level === k}
                          tabIndex={level === k ? 0 : -1}
                          className={styles.chip}
                          data-zone={z.id}
                          onClick={() => pick(k as Level)}
                        >
                          {z.label}
                        </button>
                      ))}
                    </div>
                    <p className={styles.line} aria-live="polite">
                      {ZONES[level]!.line}
                    </p>
                  </div>
                )}

                {/* Always there (hidden until a walk is done), so these words
                    are one height throughout and leave with the house. */}
                {i === 2 && !reduced && (
                  <button
                    type="button"
                    className={`btn btn-ghost ${styles.again}`}
                    data-shown={againShown ? "" : undefined}
                    tabIndex={againShown ? 0 : -1}
                    aria-hidden={againShown ? undefined : true}
                    onClick={again}
                  >
                    Walk it again
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
