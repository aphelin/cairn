import { FAQ } from "@/lib/content";
import { Plus } from "@/components/icons";
import styles from "./Faq.module.css";

export function Faq() {
  return (
    <section id="faq" className="section" data-ground="chalk" aria-labelledby="faq-title">
      <div className={`inner ${styles.grid}`}>
        <h2 id="faq-title" className={`title ${styles.title}`}>
          Questions, answered.
        </h2>
        <div className={styles.list}>
          {FAQ.map((f) => (
            <details key={f.q} name="faq" className={styles.item}>
              <summary>
                <span>{f.q}</span>
                <Plus className={styles.icon} />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
