import { REVIEWS } from "@/lib/content";
import styles from "./Reviews.module.css";

// Three short quotes, set large. They're invented, and the page says so.
export function Reviews() {
  return (
    <section id="reviews" className="section" data-theme="day" aria-labelledby="reviews-title">
      <div className="inner">
        <div className={styles.head}>
          <h2 id="reviews-title" className="title" data-reveal="">
            Quiet, reported.
          </h2>
          <p className={styles.note}>These reviews are fictional, like Cairn.</p>
        </div>
        <ul className={styles.list}>
          {REVIEWS.map((r) => (
            <li key={r.name} className={styles.card}>
              <figure>
                <blockquote>
                  <p>“{keepShort(r.text)}”</p>
                </blockquote>
                <figcaption>
                  <strong>{r.name}</strong> {r.where}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// A one-letter word ("a", "I") never ends a line: it goes down with the word
// it belongs to, so a large quote never reads "just a / phone".
function keepShort(text: string) {
  return text.replace(/(^|\s)([aAI]) /g, "$1$2\u00a0");
}
