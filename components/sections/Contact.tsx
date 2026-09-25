"use client";

import { useId, useRef, useState } from "react";
import { Arrow, Check } from "@/components/icons";
import styles from "./Contact.module.css";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Launch news and a way to write in. Both are demos: they validate and confirm, and send nothing.
export function Contact() {
  return (
    <section id="contact" className="section" data-ground="blue" aria-labelledby="contact-title">
      <div className={`inner ${styles.grid}`}>
        <div>
          <h2 id="contact-title" className="title">
            Write to us.
          </h2>
          <Newsletter />
        </div>
        <ContactForm />
      </div>
    </section>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);

  if (done)
    return (
      <p className={styles.done} role="status">
        <Check /> You’re on the list. Two emails a year, at most.
      </p>
    );

  return (
    <form
      className={styles.newsletter}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!EMAIL.test(email.trim())) {
          setError(email.trim() ? "Check that email: it looks incomplete." : "Enter an email to get launch news.");
          ref.current?.focus();
          return;
        }
        setDone(true);
      }}
    >
      <h3>Launch news</h3>
      <p className={styles.small}>Two emails a year, at most.</p>
      <div className="field">
        <label htmlFor={id} className="visually-hidden">
          Email for launch news
        </label>
        <div className={styles.inline}>
          <input
            ref={ref}
            id={id}
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          <span className="plate-wrap">
            <button type="submit" className="plate">
              Sign up
            </button>
          </span>
        </div>
        {error && (
          <p id={`${id}-error`} className="field-error">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

function ContactForm() {
  const [values, setValues] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof values, string>>>({});
  const [sent, setSent] = useState("");
  const id = useId();
  const form = useRef<HTMLFormElement>(null);

  if (sent)
    return (
      <div className={styles.sent} role="status">
        <Check />
        <p className={styles.sentTitle}>Thank you, {sent}.</p>
        <p>This is a demo, so nothing was sent. If Cairn were real, we’d reply within two days.</p>
      </div>
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = "Tell us your name.";
    if (!EMAIL.test(values.email.trim())) next.email = values.email.trim() ? "That email looks incomplete." : "We need an email to reply to.";
    if (values.message.trim().length < 10) next.message = "Write a little more, at least ten characters.";
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setSent(values.name.trim().split(/\s+/)[0]!);
  };

  const field = (name: keyof typeof values, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field">
      <label htmlFor={`${id}-${name}`}>{label}</label>
      {name === "message" ? (
        <textarea
          id={`${id}-${name}`}
          name={name}
          className="input"
          rows={4}
          value={values[name]}
          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
          aria-invalid={errors[name] ? "true" : undefined}
          aria-describedby={errors[name] ? `${id}-${name}-error` : undefined}
        />
      ) : (
        <input
          id={`${id}-${name}`}
          name={name}
          className="input"
          value={values[name]}
          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
          aria-invalid={errors[name] ? "true" : undefined}
          aria-describedby={errors[name] ? `${id}-${name}-error` : undefined}
          {...props}
        />
      )}
      {errors[name] && (
        <p id={`${id}-${name}-error`} className="field-error">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form ref={form} className={styles.contact} onSubmit={submit} noValidate aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Send a note</h3>
      <div className={styles.row}>
        {field("name", "Name", { autoComplete: "name" })}
        {field("email", "Email", { type: "email", autoComplete: "email", inputMode: "email" })}
      </div>
      {field("message", "Message")}
      <span className="plate-wrap">
        <button type="submit" className="plate">
          Send note <Arrow />
        </button>
      </span>
      <p className="demo-note">A demo: nothing is sent.</p>
    </form>
  );
}
