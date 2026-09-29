"use client";

import { FINISHES } from "@/lib/content";
import { store, useStore } from "@/lib/store";
import { DialAnchor } from "@/components/dial/DialAnchor";
import styles from "./Finishes.module.css";

// Four titanium finishes: the whole dial on a studio sweep, framed with room
// round it at every width, a touch above the usual eye line so the ceramic
// top shows over the knurl and the band. Each swatch is the dial seen from
// above, in its colour; picking one recolours the dial and carries into the
// pre-order.
export function Finishes() {
  const finish = useStore((s) => s.finish);
  const current = FINISHES.find((f) => f.id === finish) ?? FINISHES[0]!;

  return (
    <section id="finishes" className={styles.finishes} data-theme="day" aria-labelledby="finishes-title">
      <div className={styles.window}>
        <DialAnchor kind="home" order={4} tilt={0.34} still={`/stills/home-${finish}-studio.webp`} className={styles.anchor} />
      </div>
      <div className={styles.copy}>
        <h2 id="finishes-title" className="title" data-reveal="">
          Four finishes. One light.
        </h2>
        <p className="lede">Turned titanium in four colours. The band glows in the mode’s colour on every one.</p>
        <fieldset className={styles.swatches}>
          <legend className="visually-hidden">Finish</legend>
          {FINISHES.map((f) => (
            <label key={f.id} className={styles.swatch} style={{ "--finish": f.hex } as React.CSSProperties}>
              <input type="radio" name="finish" value={f.id} checked={finish === f.id} onChange={() => store.set({ finish: f.id })} />
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <circle className={styles.ring} cx="16" cy="16" r="15" />
                <circle className={styles.cap} cx="16" cy="16" r="10.4" />
                <circle className={styles.pip} cx="21.2" cy="10.8" r="1.8" />
              </svg>
              <span className={styles.name}>{f.name}</span>
            </label>
          ))}
        </fieldset>
        <p className={styles.picked} aria-live="polite">
          <strong>{current.name}.</strong> {current.note}.
        </p>
      </div>
    </section>
  );
}
