// Where Pocket lives: a patch of hallway wall beside a front door, in
// millimetres, with the wall's face on z = 0. The door is on the right: a
// painted architrave standing proud of the wall, the door recessed behind
// it, and a matte black lever. Plaster and paint are warm off-whites, lit
// in the scene by one warm downlight, so the wall falls away into the
// night ground at the edges.

import {
  CanvasTexture,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  PlaneGeometry,
  RepeatWrapping,
  Shape,
  type Texture,
} from "three";

// Where the door's architrave starts, right of Pocket, and how far the door
// sits back from the wall's face.
export const DOOR = { x: 96, casing: 68, proud: 17, recess: 30, handle: { x: 206, y: -92 } };

// Plaster: fine, soft noise as a bump map, so the wall reads as a surface
// in the downlight's falloff rather than a flat card.
function plasterTexture(): CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const base = Array.from({ length: size * size }, rand);
  // A little blur, so it's a soft trowelled grain and not static.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ] as const)
        v += base[((y + dy + size) % size) * size + ((x + dx + size) % size)]!;
      const b = Math.round((v / 5) * 255);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(9, 9);
  t.colorSpace = NoColorSpace;
  return t;
}

export class Hallway {
  readonly group = new Group();
  // Every material fades in together as the wall comes up.
  private fading: MeshStandardMaterial[] = [];
  private textures: Texture[] = [];

  constructor() {
    const plaster = plasterTexture();
    this.textures.push(plaster);
    // Off-whites from the page's own mist, a shade down for plaster and a
    // little less for the painted woodwork; the downlight makes them warm.
    const mist = new Color("#e6e6e3");
    const wall = new MeshStandardMaterial({ color: mist.clone().multiplyScalar(0.7), roughness: 0.94, bumpMap: plaster, bumpScale: 0.35 });
    const paint = new MeshStandardMaterial({ color: mist.clone().multiplyScalar(0.87), roughness: 0.52 });
    const door = new MeshStandardMaterial({ color: new Color("#cfccc6"), roughness: 0.48 });
    const lever = new MeshStandardMaterial({ color: new Color("#1a1a1c"), roughness: 0.42, metalness: 0.35 });
    this.fading.push(wall, paint, door, lever);
    for (const m of this.fading) {
      m.transparent = true;
      m.opacity = 0;
      // The downlight's long, dark falloff would band in eight bits.
      m.dithering = true;
    }

    // The wall stops at the door's opening, under the architrave.
    const { x, casing, proud, recess } = DOOR;
    const opening = x + casing - 10;
    const plane = new Mesh(new PlaneGeometry(1800 + opening, 2400), wall);
    plane.position.x = (opening - 1800) / 2;
    plane.receiveShadow = true;
    this.group.add(plane);

    // The architrave: a flat painted board with a small chamfer on its
    // outer edge, standing proud of the wall, 2.2 m tall.
    const profile = new Shape();
    profile.moveTo(0, 0);
    profile.lineTo(casing, 0);
    profile.lineTo(casing, proud - 1.5);
    profile.lineTo(casing - 1.5, proud);
    profile.lineTo(3.5, proud);
    profile.lineTo(0, proud - 3.5);
    profile.closePath();
    // Turned upright, the profile's height becomes how far it stands out (+z)
    // and the extrusion runs down the wall.
    const architrave = new Mesh(new ExtrudeGeometry(profile, { depth: 2200, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 1100, 0), paint);
    architrave.position.x = x;
    architrave.castShadow = architrave.receiveShadow = true;
    this.group.add(architrave);

    // The lining, the reveal between the architrave and the door, and the
    // door itself, set back in its frame.
    const lining = new Mesh(new PlaneGeometry(recess, 2200), paint);
    lining.rotation.y = Math.PI / 2;
    lining.position.set(opening, 0, -recess / 2);
    lining.receiveShadow = true;
    const leaf = new Mesh(new PlaneGeometry(900, 2200), door);
    leaf.position.set(opening + 450, 0, -recess);
    leaf.receiveShadow = true;
    this.group.add(lining, leaf);

    // A matte black lever on a round rose, pointing away from the door's edge.
    const hx = DOOR.handle.x;
    const hy = DOOR.handle.y;
    const rose = new Mesh(new CylinderGeometry(22, 22, 7, 48).rotateX(Math.PI / 2), lever);
    rose.position.set(hx, hy, -recess + 3.5);
    const neck = new Mesh(new CylinderGeometry(6.5, 6.5, 44, 32).rotateX(Math.PI / 2), lever);
    neck.position.set(hx, hy, -recess + 28);
    const bar = new Mesh(new CylinderGeometry(6.5, 6.5, 110, 32).rotateZ(Math.PI / 2), lever);
    bar.position.set(hx + 49, hy, -recess + 46);
    for (const o of [rose, neck, bar]) o.castShadow = o.receiveShadow = true;
    this.group.add(rose, neck, bar);
  }

  // The hallway sees only a little of the devices' studio: its light is
  // the downlight's.
  setEnvironment(env: Texture, strength: number) {
    for (const m of this.fading) {
      m.envMap = env;
      m.envMapIntensity = strength;
    }
  }

  // 0 (not there) to 1 (the wall is up).
  setShown(t: number) {
    this.group.visible = t > 0.001;
    for (const m of this.fading) m.opacity = t;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose();
    });
    this.fading.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}
