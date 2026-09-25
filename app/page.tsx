import { Signpost } from "@/components/nav/Signpost";
import { Hero } from "@/components/hero/Hero";
import { How } from "@/components/sections/How";
import { Stones } from "@/components/sections/Stones";
import { Colours } from "@/components/sections/Colours";
import { AppDemo } from "@/components/sections/AppDemo";
import { TimeBack } from "@/components/sections/TimeBack";
import { Box } from "@/components/sections/Box";
import { Compare } from "@/components/sections/Compare";
import { Reviews } from "@/components/sections/Reviews";
import { Preorder } from "@/components/sections/Preorder";
import { Faq } from "@/components/sections/Faq";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";
import { StoneLayer } from "@/components/stone/StoneLayer";
import { Motion } from "@/components/motion/Motion";

export default function Page() {
  return (
    <>
      <Signpost />
      <main id="main">
        <Hero />
        <How />
        <Stones />
        <Colours />
        <AppDemo />
        <TimeBack />
        <Box />
        <Compare />
        <Reviews />
        <Preorder />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <StoneLayer />
      <Motion />
    </>
  );
}
