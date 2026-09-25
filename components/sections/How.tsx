import { STEPS } from "@/lib/content";
import { AppGlyph, Arrow } from "@/components/icons";
import { StoneAnchor } from "@/components/stone/StoneAnchor";
import styles from "./How.module.css";

// Three waypoints on one trail line. The middle one is the stone itself.
export function How() {
  return (
    <section id="how" className="section" data-ground="chalk" aria-labelledby="how-title">
      <div className="inner">
        <h2 id="how-title" className="title">
          Choose. Tap. Walk away.
        </h2>
        <ol className={styles.trail}>
          <li className={styles.step}>
            <div className={styles.visual} aria-hidden="true">
              <div className={styles.tiles}>
                {["chirp", "reels", "news", "mail"].map((g, i) => (
                  <span key={g} data-on={i < 3 ? "" : undefined}>
                    <AppGlyph name={g} />
                  </span>
                ))}
              </div>
            </div>
            <Waypoint />
            <StepText {...STEPS[0]!} />
          </li>
          <li className={styles.step}>
            <div className={styles.visual}>
              <StoneAnchor stone="main" order={1} still="/stills/pocket-granite.webp" className={styles.stone} />
            </div>
            <Waypoint />
            <StepText {...STEPS[1]!} />
          </li>
          <li className={styles.step}>
            <div className={styles.visual} aria-hidden="true">
              <span className={styles.post}>
                <span className={styles.back}>
                  <Arrow />
                  Back to the stone
                </span>
              </span>
            </div>
            <Waypoint />
            <StepText {...STEPS[2]!} />
          </li>
        </ol>
      </div>
    </section>
  );
}

// A trail mark on the line, black on white: red is kept for "you are here".
function Waypoint() {
  return (
    <span className={styles.waypoint} aria-hidden="true">
      <span className="blaze">
        <span />
      </span>
    </span>
  );
}

function StepText({ title, text, time }: { title: string; text: string; time: string }) {
  return (
    <div className={styles.text}>
      <h3>{title}</h3>
      <p>{text}</p>
      <p className={styles.time}>{time}</p>
    </div>
  );
}
