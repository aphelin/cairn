"use client";

import { useState } from "react";
import { BOX, MODELS } from "@/lib/content";
import { DialAnchor } from "@/components/dial/DialAnchor";
import styles from "./Details.module.css";

// What comes in the box, and the facts a buyer checks before paying, each
// said as a sentence. The material is shown, not described: the dial itself,
// up close at the glass band.
export function Details() {
  const [unlocks, setUnlocks] = useState(3);

  return (
    <section id="details" className="section" data-theme="day" aria-labelledby="details-title">
      <div className="inner">
        <h2 id="details-title" className="title" data-reveal="">
          What you get.
        </h2>
        <div className={styles.bento}>
          <article className={`${styles.tile} ${styles.box}`} aria-labelledby="box-title">
            <h3 id="box-title" className="subtitle">
              In the box
            </h3>
            <div className={styles.boxes}>
              {MODELS.map((m) => (
                <div key={m.id}>
                  <p className={styles.boxName}>{m.name}</p>
                  <ul className={styles.list}>
                    {BOX[m.id].map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>

          <article className={`${styles.tile} ${styles.phones}`}>
            <h3 className={styles.say}>Works with the phone you have.</h3>
            <p className={styles.note}>iPhone on iOS 17 or later, Android 12 or later. Pocket needs NFC, which almost every phone has.</p>
          </article>

          <article className={`${styles.tile} ${styles.app}`}>
            {/* No-break spaces hold each phrase on one line; a nowrap span would
                switch off the heading's balanced wrapping. */}
            <h3 className={styles.say}>A free app. No&nbsp;subscription, no&nbsp;account.</h3>
            <p className={styles.note}>Everything stays on your phone.</p>
          </article>

          <article className={`${styles.tile} ${styles.unlocks}`}>
            <h3 className={styles.say}>Three emergency unlocks a month.</h3>
            <div className={styles.widget}>
              <span>
                <strong className="num">{unlocks}</strong> left this month
              </span>
              <button type="button" onClick={() => setUnlocks((u) => Math.max(0, u - 1))} disabled={unlocks === 0}>
                {unlocks === 0 ? "Back on the first" : "Use one"}
              </button>
            </div>
          </article>

          <article className={`${styles.tile} ${styles.material}`} data-theme="night">
            <div className={styles.macroBox}>
              <DialAnchor kind="home" order={4.5} zoom={4.6} focus="lights" tilt={0.24} clip still="/stills/detail-macro.webp" className={styles.macro} />
            </div>
            <h3 className={styles.say}>Titanium, a&nbsp;ceramic&nbsp;top, and a band of light.</h3>
          </article>
        </div>
      </div>
    </section>
  );
}
