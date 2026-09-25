"use client";

import { useId, useRef, useState } from "react";
import { COLOURS, PRICE, SHIP_WINDOW } from "@/lib/content";
import { store, useStore } from "@/lib/store";
import { Arrow, Check, Minus, Plus } from "@/components/icons";
import styles from "./Preorder.module.css";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX = 6;

// Two stones cost $88 instead of $98, so every pair in the order is priced as one.
export function total(pocket: number, home: number) {
  const stones = pocket + home;
  const pairs = Math.floor(stones / 2);
  return pairs * PRICE.pair + (stones % 2) * PRICE.single;
}

export function Preorder() {
  const { pocket, home, colour } = useStore((s) => s);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const emailId = useId();
  const stones = pocket + home;
  const sum = total(pocket, home);
  const saving = stones * PRICE.single - sum;
  const colourName = COLOURS.find((c) => c.id === colour)?.name ?? "Granite";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setError(email.trim() ? "That email doesn't look complete. Check the part after the @." : "Enter your email so we can hold your stones.");
      emailRef.current?.focus();
      return;
    }
    setError("");
    setDone(true);
  };

  return (
    <section id="preorder" className="section" data-ground="yellow" aria-labelledby="preorder-title">
      <div className={`inner ${styles.grid}`}>
        <div>
          <h2 id="preorder-title" className="title">
            Pre-order Cairn.
          </h2>
          <p className="lede">
            ${PRICE.single} a stone. Any two for ${PRICE.pair}. {SHIP_WINDOW}, and you pay nothing until then.
          </p>
        </div>

        {done ? (
          <div className={styles.done} role="status">
            <Check />
            <p className={styles.doneTitle}>Reserved. Enjoy the quiet.</p>
            <p>
              {stones} {stones === 1 ? "stone" : "stones"} in {colourName}, ${sum}. We’d write to {email.trim()} before
              shipping, if Cairn were real.
            </p>
          </div>
        ) : (
          <form className={styles.form} data-ground="chalk" onSubmit={submit} noValidate>
            <fieldset className={styles.models}>
              <legend className="visually-hidden">Stones</legend>
              <Stepper label="Cairn Pocket" hint="Tap to lock" value={pocket} other={home} onChange={(v) => store.set({ pocket: v })} />
              <Stepper label="Cairn Home" hint="Guards a room" value={home} other={pocket} onChange={(v) => store.set({ home: v })} />
            </fieldset>

            <fieldset className={styles.colours}>
              <legend>Colour</legend>
              <div>
                {COLOURS.map((c) => (
                  <label key={c.id} className={styles.colour}>
                    <input type="radio" name="order-colour" value={c.id} checked={colour === c.id} onChange={() => store.set({ colour: c.id })} />
                    <span className={styles.chip} style={{ background: c.hex }} aria-hidden="true" />
                    {c.name}
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
                <output aria-live="polite">${sum}</output>
              </p>
              {saving > 0 && <p className={styles.saving}>Pair price saves you ${saving}</p>}
            </div>

            <span className="plate-wrap">
              <button type="submit" className="plate" disabled={stones === 0}>
                Reserve for ${sum} <Arrow />
              </button>
            </span>
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
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={`One more ${label}`} onClick={() => onChange(value + 1)} disabled={value >= MAX}>
          <Plus />
        </button>
      </div>
    </div>
  );
}
