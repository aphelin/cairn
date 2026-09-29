"use client";

import { memo, useEffect, useId, useRef, useState, type RefObject } from "react";
import { useSpring } from "@/lib/useSpring";
import { sound } from "@/lib/sound";
import { Arrow } from "@/components/icons";
import styles from "./TimeBack.module.css";

// The visitor's own arithmetic, both ways: the hours a day they give the apps
// they'd lock, as days a year, and the share of that they'd hand to Cairn, as
// days a year back. Every number comes from their two answers, so nothing
// here is a borrowed statistic.

const DAYS = 365;

// How much of that time they'd lock away. Their guess, not a promise.
type Share = { id: string; label: string; part: number; spoken: string };
const HALF: Share = { id: "half", label: "Half", part: 0.5, spoken: "half" };
const SHARES: Share[] = [
  { id: "quarter", label: "A quarter", part: 0.25, spoken: "a quarter" },
  HALF,
  { id: "most", label: "Most", part: 0.75, spoken: "three quarters" },
];

// 1.5 reads as "1½ hours" on screen, and as "1 hour 30 minutes" when spoken.
const shown = (h: number) => (h < 1 ? "30 minutes" : `${Math.floor(h)}${h % 1 ? "½" : ""} ${h > 1 ? "hours" : "hour"}`);
const spoken = (h: number) => {
  const whole = Math.floor(h);
  const hours = whole ? `${whole} ${whole === 1 ? "hour" : "hours"}` : "";
  return [hours, h % 1 ? "30 minutes" : ""].filter(Boolean).join(" ");
};

const daysOf = (hours: number, part = 1) => Math.round((hours * DAYS * part) / 24);

const sentence = (hours: number, share: Share) =>
  `${spoken(hours)} a day is ${daysOf(hours)} days a year on those apps. ` +
  `Lock ${share.spoken} of it away and Cairn gives back ${daysOf(hours, share.part)} days.`;

// The dial's feel: a click when sound is on, and a 6 ms buzz on touch.
function detent(up: boolean) {
  sound.click(up);
  try {
    navigator.vibrate?.(6);
  } catch {
    // haptics are a nicety
  }
}

// Whether something that starts below the fold has arrived. It starts true,
// so the page without script, and a visit that lands mid-page, show the real
// numbers; only a part still below the fold empties, to fill as it comes in.
// The margin says where "arrived" is. Reduced motion never empties.
function useArrival(ref: RefObject<HTMLElement | null>, margin: string) {
  const [seen, setSeen] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let first = true;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        } else if (first && entry.boundingClientRect.top > 0) {
          setSeen(false);
        } else if (first) {
          io.disconnect();
        }
        first = false;
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return [seen, setSeen] as const;
}

// The year, a dot a day and a week to a column, starting on a Thursday as
// a calendar would: the days given back first, then the days still on the
// apps, then the rest of the year.
const Dots = memo(function Dots({ back, spent }: { back: number; spent: number }) {
  return (
    <div className={styles.year}>
      {Array.from({ length: DAYS }, (_, i) => (
        <span key={i} data-day={i < back ? "back" : i < spent ? "spent" : undefined} />
      ))}
    </div>
  );
});

// The year keeps its own springs, a little slower than the figures', and a
// dot flips only as its spring passes it: a change sweeps across the grid
// as a wave rather than landing all at once. Its arrival is slower still.
const Year = memo(function Year({ back, spent, soft }: { back: number; spent: number; soft: boolean }) {
  const [stiffness, damping] = soft ? [60, 16] : [90, 19];
  const backNow = Math.round(useSpring(back, stiffness, damping));
  const spentNow = Math.round(useSpring(spent, stiffness, damping));
  return <Dots back={backNow} spent={Math.max(spentNow, backNow)} />;
});

export function TimeBack() {
  const [hours, setHours] = useState(3);
  const [share, setShare] = useState(HALF);
  // What the live region says; empty until the visitor changes something.
  const [said, setSaid] = useState("");
  // Until the visitor touches a control, the numbers travel on a softer
  // spring, so the arrival reads as a count rather than a jump.
  const [touched, setTouched] = useState(false);
  const stat = useRef<HTMLParagraphElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  // The figures start counting just before they rise into view, so no frame
  // on screen ever reads zero. The year fills once its top rows are in view,
  // so the sweep is seen.
  const [counted, setCounted] = useArrival(stat, "0px 0px 12% 0px");
  const [filled, setFilled] = useArrival(frame, "0px 0px -10% 0px");
  const hoursId = useId();
  const shareId = useId();
  const shareName = useId();

  const spent = daysOf(hours);
  const back = daysOf(hours, share.part);
  const [stiffness, damping] = touched ? [170, 22] : [70, 17];
  const spentNow = Math.round(useSpring(counted ? spent : 0, stiffness, damping));
  const backNow = Math.round(useSpring(counted ? back : 0, stiffness, damping));

  // A change before either part has arrived shows the real numbers at once.
  const settle = () => {
    setTouched(true);
    setCounted(true);
    setFilled(true);
  };

  const pickHours = (h: number) => {
    if (h === hours) return;
    detent(h > hours);
    setHours(h);
    settle();
    setSaid(sentence(h, share));
  };

  const pickShare = (s: Share) => {
    if (s === share) return;
    detent(SHARES.indexOf(s) > SHARES.indexOf(share));
    setShare(s);
    settle();
    setSaid(sentence(hours, s));
  };

  return (
    <section id="time" className="section" data-theme="night" aria-labelledby="time-title">
      <div className={`inner ${styles.wrap}`}>
        <h2 id="time-title" className="title" data-reveal="">
          Where does the day go?
        </h2>

        <div className={styles.board}>
          <div className={styles.control}>
            <div className={styles.head}>
              <label htmlFor={hoursId}>Hours a day on apps you’d lock</label>
              {/* The reading keeps the width of its longest, so dragging
                  never rewraps the label and moves the board under it. */}
              <span className={styles.value} aria-hidden="true">
                <span>{shown(hours)}</span>
                <span className={styles.widest}>{shown(0.5)}</span>
              </span>
            </div>
            <input
              id={hoursId}
              className={styles.range}
              type="range"
              min={0.5}
              max={8}
              step={0.5}
              value={hours}
              onChange={(e) => pickHours(Number(e.target.value))}
              aria-valuetext={spoken(hours)}
              style={{ "--fill": (hours - 0.5) / 7.5 } as React.CSSProperties}
            />
          </div>

          <div className={styles.control}>
            <div className={styles.head}>
              <span id={shareId}>How much of it you’d lock away</span>
            </div>
            <div
              className={styles.segments}
              role="radiogroup"
              aria-labelledby={shareId}
              style={{ "--at": SHARES.indexOf(share) } as React.CSSProperties}
            >
              <span className={styles.thumb} aria-hidden="true" />
              {SHARES.map((s) => (
                <label key={s.id} className={styles.segment}>
                  <input
                    className="visually-hidden"
                    type="radio"
                    name={shareName}
                    value={s.id}
                    checked={share === s}
                    onChange={() => pickShare(s)}
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          <p ref={stat} className={`${styles.stat} ${styles.spent}`}>
            <span className={styles.figure} aria-hidden="true">
              {spentNow}
            </span>
            <span className="visually-hidden">{spent}</span>
            <span className={styles.caption}>
              <span className={styles.key} aria-hidden="true" />
              days a year on those apps
            </span>
          </p>

          <p className={`${styles.stat} ${styles.back}`}>
            <span className={styles.figure} aria-hidden="true">
              {backNow}
            </span>
            <span className="visually-hidden">{back}</span>
            <span className={styles.caption}>
              <span className={styles.key} aria-hidden="true" />
              days a year Cairn gives back
            </span>
          </p>
        </div>

        <div ref={frame} className={styles.frame} aria-hidden="true">
          <Year back={filled ? back : 0} spent={filled ? spent : 0} soft={!touched} />
        </div>

        <p className="visually-hidden" aria-live="polite">
          {said}
        </p>

        <a className="btn btn-lg" href="#preorder">
          Get them back <Arrow />
        </a>
      </div>
    </section>
  );
}
