"use client";

import { COLOURS } from "@/lib/content";
import { store, useStore } from "@/lib/store";
import { StoneAnchor } from "@/components/stone/StoneAnchor";
import styles from "./Colours.module.css";

// Four colours, each named for the place its stone is found. Picking one
// recolours every stone on the page and carries into the pre-order.
export function Colours() {
  const colour = useStore((s) => s.colour);
  const current = COLOURS.find((c) => c.id === colour) ?? COLOURS[1]!;

  return (
    <section id="colours" className="section" data-ground="green" aria-labelledby="colours-title">
      <div className={`inner ${styles.grid}`}>
        <div className={styles.visual}>
          {/* The photograph lies between here and the stones, so the stone arrives rather than glides. */}
          <StoneAnchor stone="main" order={3} still={`/stills/pocket-${colour}.webp`} className={styles.stone} arrive="jump" />
          <p className={styles.caption} aria-live="polite">
            <strong>{current.name}.</strong> Found at {current.found}.
          </p>
        </div>
        <div className={styles.pick}>
          <h2 id="colours-title" className="title">
            Four stones, from four places.
          </h2>
          <fieldset className={styles.swatches}>
            <legend className="visually-hidden">Colour</legend>
            {COLOURS.map((c) => (
              <label key={c.id} className={styles.swatch}>
                <input
                  type="radio"
                  name="colour"
                  value={c.id}
                  checked={colour === c.id}
                  onChange={() => store.set({ colour: c.id })}
                />
                <span className={styles.chip} style={{ background: c.hex }} aria-hidden="true" />
                <span className={styles.name}>{c.name}</span>
              </label>
            ))}
          </fieldset>
        </div>
      </div>
    </section>
  );
}
