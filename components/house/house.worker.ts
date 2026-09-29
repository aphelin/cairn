import { make } from "./make";
import { paintOffscreen } from "./textures";

// Builds the house and bakes its light off the main thread, so scrolling
// toward How never waits on it, and paints its surfaces here too where the
// browser can paint off the page. The arrays and bitmaps are handed over,
// not copied.
self.onmessage = async () => {
  const { built, transfer } = await make(() => Promise.resolve());
  const off = await paintOffscreen();
  self.postMessage({ built, painted: off?.painted ?? null }, { transfer: [...transfer, ...(off?.transfer ?? [])] });
};
