import styles from "./Doorway.module.css";

// One photograph, a quiet beat between the stones and their colours: Pocket
// where it lives, by the door. Generated from the site's own render of the stone.
export function Doorway() {
  return (
    <figure className={styles.band} data-ground="chalk">
      <picture>
        <source media="(max-width: 700px)" srcSet="/photos/pocket-hallway-1200.webp" />
        <img
          src="/photos/pocket-hallway-2400.webp"
          alt="Cairn Pocket on an oak shelf by a front door, a phone lying on it and keys beside it."
          width={2400}
          height={1018}
          loading="lazy"
          decoding="async"
        />
      </picture>
      <figcaption className={styles.plate}>
        <strong>By the door</strong>
        <span>Cairn Pocket in Granite</span>
      </figcaption>
    </figure>
  );
}
