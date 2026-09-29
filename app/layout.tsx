import type { Metadata, Viewport } from "next";
import { Doto, Mona_Sans } from "next/font/google";
import "./globals.css";

// Mona Sans carries the page, from wide heavy headlines to plain text; its
// width axis does the work a second family would. Doto is the dial's own
// voice: a dot-matrix face for readouts and nothing else.
const mona = Mona_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-mona",
  display: "swap",
});

const doto = Doto({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-doto",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Cairn · Turn your phone down",
  description:
    "Cairn is a dial for your desk or bedside. Turn it, and the apps you choose stay locked in the room until you get up and turn it down. A design concept for a product that doesn't exist.",
  applicationName: "Cairn",
  authors: [{ name: "Aphelin", url: "https://github.com/aphelin" }],
  openGraph: {
    title: "Cairn · Turn your phone down",
    description: "A dial that locks your distracting apps while your phone is in the room. A design concept.",
    type: "website",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${mona.variable} ${doto.variable}`}>
      <head>
        {/* Marks JS as available before first paint, so the hero can start noisy. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
