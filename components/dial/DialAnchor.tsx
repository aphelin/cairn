import type { Kind } from "./stage";
import styles from "./DialAnchor.module.css";

// A place in the layout where a device sits. The 3D stage draws the device
// into this box; until it runs, a still render of the same framing stands in.
// The anchor also directs the shot: `level` pins the dial's zone here
// ("store" follows the visitor's choice), `explode` lets the exploded view
// pull it apart, and `tilt`, `zoom`, `focus` and `clip` set the camera. A
// clipped close-up fills its box, so its still covers the box too, and the
// box's border radius rounds the drawing's corners.
export function DialAnchor({
  kind,
  name,
  order = 0,
  still,
  level = "store",
  explode,
  tilt,
  zoom,
  focus,
  clip,
  className,
  priority = false,
}: {
  kind: Kind;
  name?: string;
  order?: number;
  still: string;
  level?: "store" | number;
  explode?: boolean;
  tilt?: number;
  zoom?: number;
  focus?: "seam" | "lights" | "crown";
  clip?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`${styles.anchor} ${clip ? styles.close : ""} ${className ?? ""}`}
      data-dial={kind}
      data-dial-name={name}
      data-dial-order={order}
      data-dial-level={level}
      data-dial-explode={explode ? "live" : undefined}
      data-dial-tilt={tilt}
      data-dial-zoom={zoom}
      data-dial-focus={focus}
      data-dial-clip={clip ? "" : undefined}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static export; the still is pre-sized */}
      <img
        className={styles.still}
        src={still}
        alt=""
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </div>
  );
}
