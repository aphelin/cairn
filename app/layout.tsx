import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Barlow descends from highway and trail signage: condensed on the plates and
// headings, open in the text.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cairn · An off switch, set in stone",
  description:
    "Tap your phone on Cairn and the apps you choose stay locked until you walk back. A design concept for a product that doesn't exist.",
  applicationName: "Cairn",
  authors: [{ name: "Aphelin", url: "https://github.com/aphelin" }],
  openGraph: {
    title: "Cairn · An off switch, set in stone",
    description: "A small stone that locks your distracting apps. A design concept.",
    type: "website",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#f2c200",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${barlow.variable} ${barlowCondensed.variable}`}>
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
