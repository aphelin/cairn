// A product photographer's studio, built as a scene and baked into an
// environment map: a soft grey room with a big softbox overhead, a tall key
// strip to the front left, a thin rim strip behind to the right, and grey
// flags and a scrim round the camera. Metal shows its shape by what it
// reflects, and long soft strips are what make a cylinder read as machined
// in every product film. Any scene that draws the devices uses the same
// studio and the same lights, so they look the same everywhere.

import {
  BackSide,
  BoxGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from "three";
import { bake, release } from "./gpu";

// The room's grey at the floor and at the ceiling (linear light).
const ROOM = [0.11, 0.24] as const;

// `tilt` is how far the devices lean toward the camera. The studio leans with
// them, so reflections fall the way they would for a camera looking down.
export function studio(tilt: number): Scene {
  const scene = new Scene();
  const rig = new Group();
  rig.rotation.x = tilt;
  scene.add(rig);
  // The room itself is a soft grey, lighter overhead and darker toward the
  // floor, not black: bare metal has no colour of its own to show, only
  // what it reflects, so a black room turns titanium into black chrome. A
  // grey one gives it the mid-grey body that the strips then draw on.
  const box = new BoxGeometry(40, 20, 40, 1, 8, 1);
  const pos = box.attributes.position!;
  const shade: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + 10) / 20; // 0 at the floor, 1 at the ceiling
    const v = ROOM[0] + (ROOM[1] - ROOM[0]) * t * t;
    shade.push(v, v, v * 1.02);
  }
  box.setAttribute("color", new Float32BufferAttribute(shade, 3));
  const room = new Mesh(box, new MeshBasicMaterial({ vertexColors: true, side: BackSide }));
  room.position.y = 5;
  rig.add(room);

  const panel = (w: number, h: number, intensity: number, tint: [number, number, number] = [1, 1, 1]) =>
    new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({ color: new Color(tint[0] * intensity, tint[1] * intensity, tint[2] * intensity), side: 2 }),
    );

  // Overhead softbox, a little toward the camera.
  const top = panel(14, 9, 3, [1, 0.985, 0.96]);
  top.rotation.x = Math.PI / 2;
  top.position.set(-1.5, 12, 3);
  rig.add(top);

  // The sweep: a white table running toward the camera. Seen from above, a
  // cylinder's sides reflect the floor in front of it, so this is what gives
  // the body its soft falloff from light to dark.
  const sweep = panel(40, 22, 1.05, [1, 0.99, 0.97]);
  sweep.rotation.x = -Math.PI / 2;
  sweep.position.set(0, -4.9, 9);
  rig.add(sweep);

  // Key strip, tall and narrow, front left, low enough to land on the body.
  const key = panel(2.4, 16, 6, [1, 0.97, 0.93]);
  key.position.set(-10, -1, 8);
  key.lookAt(0, -1, 0);
  rig.add(key);

  // Rim strip behind, right: the thin bright edge that separates the silhouette.
  const rim = panel(1.4, 14, 7, [0.93, 0.96, 1]);
  rim.position.set(11, 1, -7);
  rim.lookAt(0, 0, 0);
  rig.add(rim);

  // A broad, soft scrim behind the camera. Turned metal smears what it
  // reflects along its profile, so the walls facing the camera show the
  // horizon behind it: this is what gives titanium its mid-grey body,
  // brightest down the middle and falling off toward the sides.
  const scrim = panel(24, 12, 0.85, [1, 0.99, 0.975]);
  scrim.position.set(0, 1.5, 18);
  scrim.lookAt(0, 1.5, 0);
  rig.add(scrim);

  // A faint fill card on the right, so the shadow side isn't a hole.
  const fill = panel(5, 10, 0.9);
  fill.position.set(12, -1, 7);
  fill.lookAt(0, -1, 0);
  rig.add(fill);

  // Two soft grey flags either side. The walls turning away from the camera
  // reflect the room off to the side; with nothing there they went black,
  // and a dark finish read as black chrome. These give those walls a
  // mid-grey to fall off into, the soft sheen titanium is known for.
  for (const side of [-1, 1]) {
    const flag = panel(6, 14, 0.35);
    flag.position.set(13 * side, 1, 2);
    flag.lookAt(0, 1, 0);
    rig.add(flag);
  }

  return scene;
}

// The studio baked for a renderer, ready for scene.environment.
export function studioEnvironment(renderer: WebGLRenderer, tilt: number): Texture {
  const pmrem = new PMREMGenerator(renderer);
  const room = studio(tilt);
  const env = pmrem.fromScene(room, 0.03).texture;
  release(room);
  pmrem.dispose();
  return env;
}

// The same, a step at a time (see bake() in gpu.ts), for a scene that builds
// while the page scrolls. Null once cancelled.
export async function bakeStudio(
  renderer: WebGLRenderer,
  tilt: number,
  next: () => Promise<void>,
  cancelled: () => boolean,
): Promise<WebGLRenderTarget | null> {
  const room = studio(tilt);
  const env = await bake(renderer, room, 0.03, next, cancelled);
  release(room);
  return env;
}

// The direct lights over the studio: a warm key from the front left, a cool
// fill from the right, a rim from behind, and a soft sky. `apply` sets them,
// and the environment's strength, for how dark the room is: by day the metal
// sees the whole studio; at night it sees less of it, and the key drops.
export class StudioLights {
  readonly group = new Group();
  private key = new DirectionalLight(0xfff4e6, 1.5);
  private fill = new DirectionalLight(0xe8eeff, 0.4);
  private rim = new DirectionalLight(0xffffff, 1.1);
  private hemi = new HemisphereLight(0xffffff, 0x2a2a2e, 0.4);

  constructor() {
    this.key.position.set(-0.7, 1.5, 1.2);
    this.fill.position.set(1.3, 0.5, 0.9);
    this.rim.position.set(0.4, 0.8, -1.4);
    this.group.add(this.key, this.fill, this.rim, this.hemi);
  }

  // `night` is 0 (day) to 1 (night). Titanium has no diffuse colour to fall
  // back on, only what it reflects, so the night keeps enough of the studio
  // and the key for the metal to hold its shape against a dark ground.
  apply(scene: Scene, night: number) {
    scene.environmentIntensity = 1.35 - 0.6 * night;
    this.key.intensity = 1.5 - 0.7 * night;
    this.fill.intensity = 0.4 - 0.28 * night;
    this.hemi.intensity = 0.4 - 0.26 * night;
  }
}
