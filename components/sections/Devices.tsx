"use client";

import { MODELS, PRICE } from "@/lib/content";
import { store } from "@/lib/store";
import { DialAnchor } from "@/components/dial/DialAnchor";
import { Arrow } from "@/components/icons";
import styles from "./Devices.module.css";

// The two devices side by side. Home stands in the first tile
// with its band lit; Pocket, stuck to the wall, has its own.
export function Devices() {
  return (
    <section id="devices" className="section" data-theme="mist" aria-labelledby="devices-title">
      <div className="inner">
        <header className={styles.head}>
          <h2 id="devices-title" className="title" data-reveal="">
            One you turn. One you tap.
          </h2>
          <p className="lede">
            ${PRICE.single} each. Any two for ${PRICE.pair}.
          </p>
        </header>
        <div className={styles.tiles}>
          {MODELS.map((m) => (
            <article key={m.id} className={styles.tile} aria-labelledby={`model-${m.id}`}>
              <div className={styles.stage}>
                {m.id === "home" ? (
                  <DialAnchor kind="home" order={2} still="/stills/home-night-room.webp" className={styles.anchor} />
                ) : (
                  <DialAnchor kind="pocket" order={0} tilt={1.32} still="/stills/pocket-night.webp" className={styles.anchorPocket} />
                )}
              </div>
              <div className={styles.copy}>
                <h3 id={`model-${m.id}`} className={`subtitle ${styles.name}`}>
                  {m.name}
                </h3>
                <p className={styles.text}>
                  <strong className={styles.kind}>{m.kind}.</strong> {m.text}
                </p>
                <ul className={styles.facts}>
                  {m.facts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <div className={styles.buy}>
                  <p className={`num ${styles.price}`}>${PRICE.single}</p>
                  <a
                    className="btn"
                    href="#preorder"
                    onClick={() => store.set(m.id === "home" ? { home: 1, pocket: 0 } : { home: 0, pocket: 1 })}
                  >
                    Pre-order {m.id === "home" ? "Home" : "Pocket"} <Arrow />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
