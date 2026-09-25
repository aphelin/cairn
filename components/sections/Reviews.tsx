import { REVIEWS } from "@/lib/content";
import styles from "./Reviews.module.css";

export function Reviews() {
  return (
    <section id="reviews" className="section" data-ground="green" aria-labelledby="reviews-title">
      <div className="inner">
        <h2 id="reviews-title" className="title">
          Quiet, reported.
        </h2>
        <p className={styles.note}>These reviews are fictional, like Cairn.</p>
        <ul className={styles.list}>
          {REVIEWS.map((r) => (
            <li key={r.name}>
              <figure>
                <blockquote>
                  <p>{r.text}</p>
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
