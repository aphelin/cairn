// A clean, generic handset for Pocket's story, in millimetres, centred on
// its middle with the display facing +z: a rounded slab with a metal band,
// frosted glass behind, a glass display lit by the painted screen, side
// buttons and a camera plateau. It depicts any modern phone, not a brand.

import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type Texture,
} from "three";
import type { AppId } from "@/components/brand/appGlyphs";
import { PhoneScreen, type ScreenState } from "./screen";

export const HANDSET = { w: 71.6, h: 147.6, d: 8.25, corner: 11.6 };
// Where the phone's NFC antenna sits, behind the top of the display: the
// point that meets Pocket's face in a tap.
export const NFC = new Vector3(0, HANDSET.h / 2 - 14, -HANDSET.d / 2);

function rounded(w: number, h: number, r: number) {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// Maps a flat shape's UVs to 0..1 over its width and height, so a texture
// covers it exactly.
function fitUV(g: BufferGeometry, w: number, h: number) {
  const pos = g.attributes.position!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  return g;
}

export class Handset {
  readonly group = new Group();
  readonly screen: PhoneScreen;
  private materials: Material[] = [];

  // `px`: the screen's texels a point.
  constructor(apps: AppId[], px = 2) {
    const { w, h, d, corner } = HANDSET;
    const bevel = 1.5;
    this.screen = new PhoneScreen(apps, px);

    // The band: a dark, lightly brushed metal, so it reads as a phone's
    // frame and never as Cairn's own titanium. The phone is only ever seen
    // at arm's length, so it's drawn with the plain PBR material: its band,
    // back and lenses share one program, which the story compiles before
    // it's needed (see scene.ts).
    const band = new MeshStandardMaterial({ color: new Color("#3c3c41"), metalness: 1, roughness: 0.34 });
    // The back: frosted glass, dark, with a little more gloss than a matte
    // back would have, for the thin coat on it.
    const back = new MeshStandardMaterial({ color: new Color("#1c1c20"), metalness: 0, roughness: 0.4 });
    const body = new ExtrudeGeometry(rounded(w - bevel * 2, h - bevel * 2, corner - bevel), {
      depth: d - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 6,
      curveSegments: 20,
    }).translate(0, 0, -(d - bevel * 2) / 2);
    const shell = new Mesh(body, [back, band]);
    this.group.add(shell);

    // The display: black glass that the screen lights from behind, glossy
    // enough to catch the studio's strips. It has no colour of its own, only
    // the screen's light and what it reflects.
    const sw = w - bevel * 2;
    const sh = h - bevel * 2;
    const glass = new MeshStandardMaterial({
      color: new Color(0, 0, 0),
      emissive: new Color(1, 1, 1),
      emissiveMap: this.screen.texture,
      emissiveIntensity: 0.92,
      metalness: 0,
      roughness: 0.06,
    });
    const display = new Mesh(fitUV(new ShapeGeometry(rounded(sw, sh, corner - bevel), 24), sw, sh), glass);
    display.position.z = d / 2 + 0.02;
    this.group.add(display);

    // Buttons: the action button and volume on the left, the side button on
    // the right.
    for (const [x, y, len] of [
      [-1, 42, 6],
      [-1, 27, 12],
      [-1, 12, 12],
      [1, 22, 17],
    ] as const) {
      const b = new Mesh(new BoxGeometry(1.2, len, 3.4), band);
      b.position.set(x * (w / 2 + 0.25), y, 0);
      this.group.add(b);
    }

    // The camera plateau, top left seen from behind, with three lenses.
    const plateau = new Mesh(
      new ExtrudeGeometry(rounded(35, 36, 9), { depth: 0.9, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 3, curveSegments: 12 }),
      back,
    );
    plateau.position.set(w / 2 - 22.5, h / 2 - 22.5, -d / 2 - 1.2);
    this.group.add(plateau);
    const lensGlass = new MeshStandardMaterial({ color: new Color("#050507"), metalness: 0.2, roughness: 0.06 });
    for (const [x, y] of [
      [-8.4, 8.6],
      [-8.4, -8.6],
      [8.2, 0],
    ] as const) {
      const ring = new Mesh(new CylinderGeometry(6.9, 7.1, 1.8, 40).rotateX(Math.PI / 2), band);
      ring.position.set(w / 2 - 22.5 + x, h / 2 - 22.5 + y, -d / 2 - 2.2);
      const lens = new Mesh(new CylinderGeometry(5.1, 5.1, 0.6, 40).rotateX(Math.PI / 2), lensGlass);
      lens.position.set(ring.position.x, ring.position.y, -d / 2 - 3.05);
      this.group.add(ring, lens);
    }
    this.materials.push(band, back, glass, lensGlass);
    this.group.traverse((o) => {
      if (o instanceof Mesh) o.castShadow = true;
    });
  }

  // Each part sees the studio at its own strength: the band as bare metal,
  // the glass much less, so the display's light isn't washed out.
  setEnvironment(env: Texture) {
    const [band, back, glass, lens] = this.materials as MeshStandardMaterial[];
    for (const [m, k] of [
      [band, 1],
      [back, 0.7],
      [glass, 0.45],
      [lens, 0.8],
    ] as const) {
      m!.envMap = env;
      m!.envMapIntensity = k;
    }
  }

  paint(state: ScreenState) {
    return this.screen.paint(state);
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose();
    });
    this.materials.forEach((m) => m.dispose());
    this.screen.dispose();
  }
}
