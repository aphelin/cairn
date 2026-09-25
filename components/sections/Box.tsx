import { BOX, SPECS } from "@/lib/content";
import styles from "./Box.module.css";

// What comes in each box, and the facts that decide whether it works for you.
export function Box() {
  return (
    <section id="box" className="section" data-ground="blue" aria-labelledby="box-title">
      <div className={`inner ${styles.grid}`}>
        <h2 id="box-title" className="title">
          In the box.
        </h2>
        <div className={styles.boxes}>
          <List title="Cairn Pocket" items={BOX.pocket} />
          <List title="Cairn Home" items={BOX.home} />
        </div>
        <dl className={styles.specs}>
          {SPECS.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={styles.box}>
      <h3>{title}</h3>
      <ul>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
