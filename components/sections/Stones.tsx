"use client";

import { useId, useState } from "react";
import { MODELS, PRICE } from "@/lib/content";
import { store } from "@/lib/store";
import { Arrow } from "@/components/icons";
import { StoneAnchor } from "@/components/stone/StoneAnchor";
import styles from "./Stones.module.css";

// Two stones. Pocket is the one that travelled down the page; Home shows its
// range as contour rings you can widen with the slider.
export function Stones() {
  const [range, setRange] = useState(4);
  const rangeId = useId();
  const maskId = `range-${useId().replace(/:/g, "")}`;
  const pocket = MODELS[0]!;
  const home = MODELS[1]!;

  return (
    <section id="stones" className="section" data-ground="blue" aria-labelledby="stones-title">
      <div className="inner">
        <h2 id="stones-title" className="title">
          Two stones. Two kinds of quiet.
        </h2>
        <div className={styles.pair}>
          <article className={styles.model} aria-labelledby="model-pocket">
            <div className={styles.visual}>
              <StoneAnchor stone="main" order={2} still="/stills/pocket-granite.webp" className={styles.stone} />
            </div>
            <Details model={pocket} id="model-pocket" />
          </article>

          <article className={styles.model} aria-labelledby="model-home">
            <div className={styles.visual}>
              <div className={styles.homeFrame}>
                {/* Range rings on the ground around the stone; the mask keeps them behind it. */}
                <svg className={styles.range} viewBox="-50 -35 100 70" aria-hidden="true">
                  <defs>
                    <mask id={maskId} maskUnits="userSpaceOnUse" x="-400" y="-300" width="800" height="600">
                      <rect x="-400" y="-300" width="800" height="600" fill="white" />
                      <ellipse cx="2" cy="-3.5" rx="41.5" ry="26.5" fill="black" />
                    </mask>
                  </defs>
                  <g mask={`url(#${maskId})`}>
                    <g className={styles.rings} style={{ transform: `translate(2px, 16px) scale(${0.55 + (range / 15) * 0.9})` }}>
                      {[1, 2, 3, 4].map((i) => (
                        <ellipse key={i} cx="0" cy="0" rx={34 + i * 15} ry={(34 + i * 15) * 0.4} />
                      ))}
                    </g>
                  </g>
                </svg>
                <StoneAnchor stone="home" still="/stills/home-granite.webp" />
              </div>
            </div>
            <Details model={home} id="model-home" />
            <div className={styles.slider}>
              <label htmlFor={rangeId}>Range</label>
              <input
                id={rangeId}
                type="range"
                min={1}
                max={15}
                step={1}
                value={range}
                onChange={(e) => setRange(Number(e.target.value))}
                aria-valuetext={`${range} metres`}
              />
              <output htmlFor={rangeId}>{range} m</output>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Details({ model, id }: { model: (typeof MODELS)[number]; id: string }) {
  return (
    <div className={styles.details}>
      <h3 id={id}>{model.name}</h3>
      <p className={styles.text}>{model.text}</p>
      <ul className={styles.facts}>
        {[model.verb, ...model.facts].map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <div className={styles.buy}>
        <span className={styles.price}>${PRICE.single}</span>
        <span className="plate-wrap">
          <a
            className="plate"
            href="#preorder"
            onClick={() => store.set(model.id === "pocket" ? { pocket: 1, home: 0 } : { pocket: 0, home: 1 })}
          >
            Pre-order {model.name.replace("Cairn ", "")} <Arrow />
          </a>
        </span>
      </div>
    </div>
  );
}
