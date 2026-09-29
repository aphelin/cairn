import styles from "./Logo.module.css";

// The Cairn mark is the dial seen from above, with its sweep: the anodised
// ring, the ceramic face and its indicator dot, and the scale arc it turns
// through, open at the bottom like any knob's. The dot points at where the
// dial is set, and the arc fills with the mode's colour up to it when quiet is on, just like
// the real one lights its seam.
const ANGLES = [-135, -45, 45, 135];
const ARC = "M5.96 26.04A14.2 14.2 0 1 1 26.04 26.04";
const ARC_LENGTH = 66.92;

export function Mark({ level = 2, knurl = false, className }: { level?: number; knurl?: boolean; className?: string }) {
  const at = Math.max(0, Math.min(3, Math.round(level)));
  const deg = ANGLES[at] ?? 45;
  return (
    <svg className={`${styles.mark} ${className ?? ""}`} viewBox="0 0 32 32" aria-hidden="true" data-on={at > 0 ? "" : undefined}>
      <path className={styles.track} d={ARC} />
      <path className={styles.fill} d={ARC} style={{ strokeDasharray: `${((ARC_LENGTH * at) / 3).toFixed(2)} ${ARC_LENGTH}` }} />
      <circle className={styles.ring} cx="16" cy="16" r="11.3" />
      {knurl && (
        <g className={styles.knurl}>
          {Array.from({ length: 72 }, (_, i) => (
            <line key={i} x1="16" y1="4.9" x2="16" y2="6.6" transform={`rotate(${i * 5} 16 16)`} />
          ))}
        </g>
      )}
      <circle className={styles.cap} cx="16" cy="16" r="7.9" />
      <circle className={styles.dot} cx="16" cy="10.8" r="2" style={{ transform: `rotate(${deg}deg)` }} />
    </svg>
  );
}

export function Logo({ level, className }: { level?: number; className?: string }) {
  return (
    <span className={`${styles.logo} ${className ?? ""}`}>
      <Mark level={level} />
      <span className={styles.word}>Cairn</span>
    </span>
  );
}
