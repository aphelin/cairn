import { AUTHOR } from "@/lib/content";
import { LiveMark } from "@/components/brand/LiveMark";
import { Arrow } from "@/components/icons";
import styles from "./Footer.module.css";

// The close: the name, signed large under the closing line, and the fine
// print that says none of this ships.
export function Footer() {
  return (
    <footer className={`section ${styles.footer}`} data-theme="night">
      <div className="inner">
        <div className={styles.close}>
          <p className={styles.line}>Turn it down.</p>
          <a className="btn btn-lg" href="#preorder">
            Pre-order Cairn <Arrow />
          </a>
        </div>
        <p className={styles.word} aria-hidden="true">
          <LiveMark knurl className={styles.mark} />
          Cairn
        </p>
        <div className={styles.fine}>
          <p>
            Cairn is a design concept. There is no product, nothing ships, nothing you type here is sent anywhere, and the reviews are
            invented. App names and icons belong to their owners; Cairn isn’t affiliated with any of&nbsp;them.
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
            · ©&nbsp;2026
          </p>
        </div>
      </div>
    </footer>
  );
}
