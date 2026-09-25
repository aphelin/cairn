import styles from "./StoneAnchor.module.css";

// A place in the layout where a stone sits. The still render fills it until
// the WebGL stone takes over; both use the same framing, so the swap is silent.
export function StoneAnchor({
  stone,
  order,
  still,
  className,
  priority,
  arrive,
}: {
  stone: "main" | "home";
  order?: number;
  still: string;
  className?: string;
  priority?: boolean;
  /** "jump": the travelling stone arrives here without gliding over what lies between. */
  arrive?: "jump";
}) {
  return (
    <div
      className={`${styles.anchor} ${stone === "home" ? styles.home : ""} ${className ?? ""}`}
      data-stone={stone}
      data-stone-order={order}
      data-stone-arrive={arrive}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export; the still is pre-sized */}
      <img
        className={styles.still}
        src={still}
        alt=""
        width={800}
        height={560}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </div>
  );
}
