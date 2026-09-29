"use client";

import { useId, useRef, useState } from "react";
import { FINISHES, PRICE, SHIP_WINDOW } from "@/lib/content";
import { store, useStore } from "@/lib/store";
import { useSpring } from "@/lib/useSpring";
import { DialAnchor } from "@/components/dial/DialAnchor";
import { Arrow, Check, Minus, Plus } from "@/components/icons";
import styles from "./Preorder.module.css";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX = 6;

// Two devices cost $88 instead of $98, so every pair in the order is priced as one.
export function total(pocket: number, home: number) {
  const devices = pocket + home;
  const pairs = Math.floor(devices / 2);
  return pairs * PRICE.pair + (devices % 2) * PRICE.single;
}

export function Preorder() {
  const { pocket, home, finish } = useStore((s) => s);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const emailId = useId();
  const devices = pocket + home;
  const sum = total(pocket, home);
  const shown = useSpring(sum);
  const saving = devices * PRICE.single - sum;
  const finishName = FINISHES.find((f) => f.id === finish)?.name ?? "Graphite";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setError(email.trim() ? "That email doesn’t look complete. Check the part after the @." : "Enter your email so we can hold your order.");
      emailRef.current?.focus();
      return;
    }
    setError("");
    setDone(true);
  };

  return (
    <section id="preorder" className={`section ${styles.root}`} data-theme="night" aria-labelledby="preorder-title">
      <div className={`inner ${styles.grid}`}>
        <div className={styles.side}>
          <h2 id="preorder-title" className="title" data-reveal="">
            Pre-order Cairn.
          </h2>
          <p className="lede">
            ${PRICE.single} each. Any two for ${PRICE.pair}. {SHIP_WINDOW}, and you pay nothing until then.
          </p>
          <DialAnchor kind="home" order={5} still={`/stills/home-${finish}-order.webp`} className={styles.anchor} />
        </div>

        {done ? (
          <div className={styles.done} role="status">
            <Check className={styles.doneIcon} />
            <p className={styles.doneTitle}>Reserved. Enjoy the quiet.</p>
            <p>
              {devices} {devices === 1 ? "device" : "devices"} in {finishName}, ${sum}. We’d write to {email.trim()} before shipping, if Cairn
              were real.
            </p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={submit} noValidate>
            <fieldset className={styles.models}>
              <legend className="visually-hidden">Devices</legend>
              <Stepper label="Cairn Home" hint="The dial" value={home} other={pocket} onChange={(v) => store.set({ home: v })} />
              <Stepper label="Cairn Pocket" hint="The disc" value={pocket} other={home} onChange={(v) => store.set({ pocket: v })} />
            </fieldset>

            <fieldset className={styles.finishes}>
              <legend className="label">Finish</legend>
              <div>
                {FINISHES.map((f) => (
                  <label key={f.id} className={styles.finish} style={{ "--finish": f.hex } as React.CSSProperties}>
                    <input type="radio" name="order-finish" value={f.id} checked={finish === f.id} onChange={() => store.set({ finish: f.id })} />
                    <span className={styles.chip} aria-hidden="true" />
                    {f.name}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="field">
              <label htmlFor={emailId}>Email</label>
              <input
                ref={emailRef}
                id={emailId}
                className="input"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? "true" : undefined}
                aria-describedby={error ? `${emailId}-error` : undefined}
              />
              {error && (
                <p id={`${emailId}-error`} className="field-error">
                  {error}
                </p>
              )}
            </div>

            <div className={styles.summary}>
              <p className={styles.total}>
                <span>Total</span>
                <output className="num" aria-live="polite">
                  ${Math.round(shown)}
                </output>
              </p>
              {saving > 0 && <p className={styles.saving}>Pair price saves you ${saving}</p>}
            </div>

            <button type="submit" className="btn btn-lg" disabled={devices === 0}>
              Reserve for ${sum} <Arrow />
            </button>
            <p className="demo-note">A demo: nothing is sent or charged.</p>
          </form>
        )}
      </div>
    </section>
  );
}

function Stepper({
  label,
  hint,
  value,
  other,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  other: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className={styles.stepper}>
      <span className={styles.stepLabel} id={id}>
        <strong>{label}</strong>
        <span>{hint}</span>
      </span>
      <div className={styles.buttons} role="group" aria-labelledby={id}>
        <button type="button" aria-label={`One fewer ${label}`} onClick={() => onChange(value - 1)} disabled={value <= 0 || value + other <= 1}>
          <Minus />
        </button>
        <output className="num" aria-live="polite">
          {value}
        </output>
        <button type="button" aria-label={`One more ${label}`} onClick={() => onChange(value + 1)} disabled={value >= MAX}>
          <Plus />
        </button>
      </div>
    </div>
  );
}
