import { Nav } from "@/components/nav/Nav";
import { Hero } from "@/components/hero/Hero";
import { Statement } from "@/components/sections/Statement";
import { How } from "@/components/sections/How";
import { Devices } from "@/components/sections/Devices";
import { PocketStory } from "@/components/sections/PocketStory";
import { PocketTry } from "@/components/sections/PocketTry";
import { Inside } from "@/components/sections/Inside";
import { Finishes } from "@/components/sections/Finishes";
import { AppDemo } from "@/components/sections/AppDemo";
import { TimeBack } from "@/components/sections/TimeBack";
import { Details } from "@/components/sections/Details";
import { Compare } from "@/components/sections/Compare";
import { Reviews } from "@/components/sections/Reviews";
import { Preorder } from "@/components/sections/Preorder";
import { Faq } from "@/components/sections/Faq";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";
import { DialLayer } from "@/components/dial/DialLayer";
import { Motion } from "@/components/motion/Motion";
import { ModeTheme } from "@/components/motion/ModeTheme";

export default function Page() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Statement />
        <How />
        <Devices />
        <PocketStory />
        <PocketTry />
        <Inside />
        <Finishes />
        <AppDemo />
        <TimeBack />
        <Details />
        <Compare />
        <Reviews />
        <Preorder />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <DialLayer />
      <Motion />
      <ModeTheme />
    </>
  );
}
