import { APP_GLYPHS, type AppId } from "./appGlyphs";
import styles from "./AppIcon.module.css";

// A real app's home-screen icon, as the phone shows it on a notification: a
// rounded tile in the app's own colours with its glyph. These are the owners'
// marks, drawn only to show the noise Cairn turns down.
type Look = { tile: string; ink: string; scale?: number; outline?: string; split?: [string, string] };

const LOOKS: Record<AppId, Look> = {
  instagram: {
    tile: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)",
    ink: "#ffffff",
    scale: 0.62,
  },
  tiktok: { tile: "#000000", ink: "#ffffff", scale: 0.58, split: ["#25f4ee", "#fe2c55"] },
  youtube: { tile: "#ffffff", ink: "#ff0000", scale: 0.7 },
  whatsapp: { tile: "linear-gradient(180deg, #5ff777 0%, #12b83c 100%)", ink: "#ffffff", scale: 0.62 },
  snapchat: { tile: "#fffc00", ink: "#ffffff", scale: 0.66, outline: "#000000" },
  x: { tile: "#000000", ink: "#ffffff", scale: 0.52 },
  reddit: { tile: "#ff4500", ink: "#ffffff", scale: 0.64 },
  netflix: { tile: "#000000", ink: "#e50914", scale: 0.5 },
  discord: { tile: "#5865f2", ink: "#ffffff", scale: 0.62 },
  twitch: { tile: "#9146ff", ink: "#ffffff", scale: 0.56 },
  spotify: { tile: "#000000", ink: "#1ed760", scale: 0.64 },
  threads: { tile: "#000000", ink: "#ffffff", scale: 0.56 },
  telegram: { tile: "linear-gradient(180deg, #37aee2 0%, #1e96c8 100%)", ink: "#ffffff", scale: 0.66 },
  facebook: { tile: "#0866ff", ink: "#ffffff", scale: 0.62 },
  pinterest: { tile: "#ffffff", ink: "#e60023", scale: 0.66 },
};

export const APP_NAMES: Record<AppId, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
  snapchat: "Snapchat",
  x: "X",
  reddit: "Reddit",
  netflix: "Netflix",
  discord: "Discord",
  twitch: "Twitch",
  spotify: "Spotify",
  threads: "Threads",
  telegram: "Telegram",
  facebook: "Facebook",
  pinterest: "Pinterest",
};

export function AppIcon({ app, className }: { app: AppId; className?: string }) {
  const look = LOOKS[app];
  const d = APP_GLYPHS[app];
  const s = look.scale ?? 0.6;
  const at = `translate(${12 - 12 * s} ${12 - 12 * s}) scale(${s})`;
  return (
    <span className={`${styles.icon} ${className ?? ""}`} style={{ background: look.tile }} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        {look.split && (
          <>
            <path d={d} fill={look.split[0]} transform={`translate(-0.55 -0.45) ${at}`} />
            <path d={d} fill={look.split[1]} transform={`translate(0.55 0.45) ${at}`} />
          </>
        )}
        <path
          d={d}
          fill={look.ink}
          transform={at}
          stroke={look.outline}
          strokeWidth={look.outline ? 1.1 : undefined}
          strokeLinejoin="round"
          paintOrder="stroke"
        />
      </svg>
    </span>
  );
}
