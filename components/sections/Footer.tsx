import { AUTHOR } from "@/lib/content";
import { Arrow, CairnMark } from "@/components/icons";
import styles from "./Footer.module.css";

// The end of the trail: a black enamel plate.
export function Footer() {
  return (
    <footer className={`section ${styles.footer}`} data-ground="black">
      <div className="inner">
        <p className={styles.close}>
          <CairnMark className={styles.mark} />
          Put the noise down.
        </p>
        <span className="plate-wrap">
          <a className="plate" href="#preorder">
            Pre-order Cairn <Arrow />
          </a>
        </span>
        <div className={styles.fine}>
          <p>
            Cairn is a design concept. There is no product, nothing ships, nothing you type here is sent anywhere, and the reviews are
            invented.
          </p>
          <p>
            Concept, design and build by {AUTHOR.name}
            {AUTHOR.links.map((l) => (
              <span key={l.href}>
                {" · "}
                <a href={l.href} rel="me noopener" target="_blank">
                  {l.label}
                </a>
              </span>
            ))}{" "}
            · © 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
