// Cairn Pocket's story, in real 3D, in a canvas of its own. The section's
// scroll drives one progress value, 0 to 1, and everything on stage is a
// function of it: the disc arrives and turns to show its face; a phone comes
// down, buzzing; it taps the disc, a ripple spreads and the phone goes quiet;
// Pocket comes apart along its axis to show what's inside (an antenna and a
// chip, and no battery); and it rises onto a hallway wall beside the front
// door. Moments (a notification landing, the tap) also start short timed
// effects, so a buzz or a ripple plays at its own pace however fast you
// scroll.
//
// It's built well before it's needed, a slice at a time (see build()), so
// no frame is held up while the section scrolls in; after that it draws only
// while on screen, and only when something has changed.

import {
  AdditiveBlending,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Light,
  Mesh,
  NeutralToneMapping,
  type Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SpotLight,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderer,
  type Material,
  type MeshPhysicalMaterial,
} from "three";
import { DeviceMaterials } from "@/components/dial/materials";
import { POCKET } from "@/components/dial/geometry";
import { StudioLights, studioEnvironment } from "@/components/dial/studio";
import { MODE_HEX } from "@/lib/modes";
import { POCKET_APPS, type FinishId } from "@/lib/content";
import { sound } from "@/lib/sound";
import { Handset, NFC } from "./phone";
import { Hallway } from "./hallway";
import { PocketLayers } from "./inside";

export type PocketEvents = { lost: () => void };
// Resolves when it's a good moment for the next slice of the build (the page
// is idle and its frames are on time, or the story is about to be seen).
export type Pace = () => Promise<void>;
// Resolves when the build may start on the GPU: its context and programs.
export type Gate = () => Promise<void>;
// `still`: one composed frame at the end of the story (reduced motion), framed
// to fill the canvas rather than to leave room for the story's words.
// `narrow`: the stacked composition, on the same test as the section's CSS.
// `small`: a small screen, which gets fewer pixels to draw.
// `room`: how far down the stage (px) the scene may use, stacked over the words.
type Size = { width: number; height: number; narrow: boolean; small: boolean; room: number };
type Options = Size & { still: boolean; finish: FinishId; level: number };

// ——— The timeline, in progress through the section ———

// Keyframes: [progress, values]. The values follow a monotone cubic through
// the keys: a move that runs on through a key keeps its speed there instead
// of stopping dead and setting off again, a move into or out of a hold starts
// and settles like a camera move, and no value overshoots its keys (so the
// phone still meets the disc's face exactly).
type Keys = [number, number[]][];
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const rise = (p: number, a: number, b: number) => easeInOut(clamp01((p - a) / (b - a)));
// A key's slope for one value: at rest at either end, at a hold and where the
// value turns back; elsewhere the weighted harmonic mean of the slopes either
// side of it (Fritsch–Butland), which keeps each stretch monotone.
function slope(keys: Keys, i: number, k: number): number {
  if (i === 0 || i === keys.length - 1) return 0;
  const [pa, a] = keys[i - 1]!;
  const [pb, b] = keys[i]!;
  const [pc, c] = keys[i + 1]!;
  const d0 = (b[k]! - a[k]!) / (pb - pa);
  const d1 = (c[k]! - b[k]!) / (pc - pb);
  if (d0 === 0 || d1 === 0 || Math.sign(d0) !== Math.sign(d1)) return 0;
  const w0 = 2 * (pc - pb) + (pb - pa);
  const w1 = pc - pb + 2 * (pb - pa);
  return (w0 + w1) / (w0 / d0 + w1 / d1);
}
function track(keys: Keys, p: number): number[] {
  if (p <= keys[0]![0]) return keys[0]![1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [p0, a] = keys[i]!;
    const [p1, b] = keys[i + 1]!;
    if (p <= p1) {
      const h = p1 - p0;
      const t = (p - p0) / h;
      const t2 = t * t;
      const t3 = t2 * t;
      return a.map((v, k) => (2 * t3 - 3 * t2 + 1) * v + (t3 - 2 * t2 + t) * h * slope(keys, i, k) + (3 * t2 - 2 * t3) * b[k]! + (t3 - t2) * h * slope(keys, i + 1, k));
    }
  }
  return keys[keys.length - 1]![1];
}

// The four notifications land one after another; the tap, with the phone
// going quiet as it lands; Pocket apart and back together; the wall coming up.
// The quiet also plays in time from the tap (CALM_S), with the ripple, so
// stopping just past it never leaves the phone buzzing.
const NOTES = { from: 0.19, step: 0.03, each: 0.018 };
const TAP = 0.42;
const CALM: [number, number] = [0.421, 0.446];
const CALM_S = 0.5; // seconds
// After the tap the phone stays on the disc a moment, in time too, then eases
// back to where the scroll has it: a flick straight past the tap still shows
// the touch, with the ripple spreading round it. [wait, ease] in seconds.
const HOLD: [number, number] = [0.45, 0.35];
// Apart from the first value to the second, held while "No battery" reads,
// and back together from the third to the fourth.
const OPEN: [number, number, number, number] = [0.675, 0.72, 0.795, 0.84];
const WALL: [number, number] = [0.8, 0.9];
const TAU = Math.PI * 2;
// A progress step bigger than this (a flick, or a frame held up) plays no
// notification chimes: a burst of them at once would only be noise.
const LEAP = 0.06;

// `held`: the phone's pose on the disc, pressed to its face.
type Timeline = { disc: Keys; phone: Keys; camera: Keys; held: number[] };

// The story's moves. Wide screens set the disc and the phone side by side,
// right of the words; narrow ones stack them, the disc above the phone, over
// the words, so each stays large on a phone held upright.
function timeline(narrow: boolean): Timeline {
  // The disc: position (mm), then yaw (turning over), pitch (tilt toward the
  // camera) and its spin about its own face. The ripple spreads in the plane
  // of its face, so the phone beside it always stands in front of that plane
  // (the rings pass behind it, never through its screen): on narrow screens,
  // where the phone sits below the disc, the face leans a touch away below.
  const aside = narrow ? [-18, 84, 60, 0.16, 0.06, 0] : [-44, 6, 60, 0.3, -0.1, 0];
  // Apart, its axis leans toward the camera and away from the words, so each
  // part's face shows beside the next: up and to the left, across a wide
  // screen; nearly straight up, on a narrow one. It turns a little further
  // while it holds, so it never sits frozen.
  const apart = narrow ? [0, 0, 60, -0.3, -1.02, 0] : [0, 0, 60, -0.94, -0.36, 0];
  const turned = narrow ? [0, 0, 60, -0.14, -0.98, 0] : [0, 0, 60, -0.76, -0.33, 0];
  const disc: Keys = [
    [0, [0, -10, 60, -0.6, -1.08, -1.4]],
    [0.14, [0, 0, 60, -0.3, -0.2, 0]],
    [0.26, aside],
    [0.6, aside],
    [0.665, [0, 0, 60, 0.1, 0.04, 0]],
    [0.71, apart],
    [0.8, turned],
    [0.84, turned],
    [0.885, [0, 3, 42, 0, 0, 0]],
    [0.93, [0, 0, 7, 0, 0, 0]],
    [0.938, [0, 0, 6.4, 0, 0, 0]],
    [0.95, [0, 0, 7, 0, 0, 0]],
  ];

  // The phone: position (mm), then its turn about x, y and z. Its tap poses
  // are worked out from the disc's, so its antenna meets the disc's face.
  const beside = narrow ? [16, -30, 78, 0.02, -0.18, -0.04] : [46, -4, 72, 0.02, -0.24, -0.05];
  const arrive = narrow ? [40, -330, 90, -0.3, -0.4, 0.3] : [74, 240, 80, 0.3, -0.45, 0.32];
  const leave = narrow ? [60, -340, 110, -0.4, -0.55, -0.28] : [84, -290, 110, -0.4, -0.55, -0.28];
  const [x, y, z, yaw, pitch] = aside;
  const holder = new Group();
  holder.rotation.set(pitch!, yaw!, 0, "YXZ");
  // The middle of the disc's face, where the tap lands.
  const contact = new Vector3(0, 0, 7).applyEuler(holder.rotation).add(new Vector3(x, y, z));
  // With the phone turned as the disc is, its antenna sits `gap` off the
  // disc's face: the disc's rim is 7 mm in front of its middle.
  const at = (gap: number) => {
    const v = new Vector3(0, -NFC.y, 7 + gap - NFC.z).applyEuler(holder.rotation);
    return [x! + v.x, y! + v.y, z! + v.z, pitch!, yaw!, 0];
  };
  const onDisc = at(0.25);
  const phone: Keys = [
    [0.12, arrive],
    [0.25, beside],
    [0.34, beside],
    [0.39, at(34)],
    [TAP, onDisc],
    [0.455, onDisc],
    [0.51, beside],
    [0.6, beside],
    [0.665, leave],
  ];

  // The camera: what it looks at (mm), the size of the box it keeps in frame
  // (mm), then its orbit (yaw) and elevation (pitch), and, while Pocket is
  // apart, where along its axis it looks (see pose()). For the tap it swings
  // round to three-quarters, close on the contact, so the phone's back is
  // seen closing on the ceramic face and the ripple spreads round them both;
  // it looks a little below the contact, so the whole handset stays in frame.
  // Stacked, the words sit right under these shots, so each keeps the whole
  // handset inside its box, down to its bottom edge (which hangs lowest).
  const pair = narrow ? [0, 20, 62, 124, 250, 0.04, 0.03] : [1, 0, 62, 214, 196, 0.06, 0.03];
  const tap = narrow
    ? [contact.x, contact.y - 34, contact.z, 128, 196, 0.86, 0.14]
    : [contact.x, contact.y - 44, contact.z, 176, 200, 1.0, 0.13];
  // Pocket apart: the whole stack, centred on its middle as it opens; then,
  // while the words hold, a slow push in on the antenna and its chip.
  const inside = narrow ? [0, 0, 60, 98, 140, 0.02, 0.1, 0] : [0, 0, 60, 170, 138, 0.06, 0.06, 0];
  const board = narrow ? [0, 0, 60, 76, 100, 0.05, 0.12, 0.9] : [0, 0, 60, 112, 96, 0.1, 0.08, 0.85];
  // On wide screens the door and its pool of light sit right of the words.
  const door = narrow ? [84, -40, 0, 270, 330, 0.26, 0.04] : [58, -34, 0, 360, 262, 0.28, 0.04];
  // The opening, the disc alone: stacked, a closer box, so it holds the room
  // above the words as the later shots do rather than floating small in it.
  const first = narrow ? OPENING_NARROW : 150;
  const camera: Keys = [
    [0, [0, 0, 60, first, first, -0.08, 0.04]],
    [0.14, [0, 0, 60, first * (narrow ? 0.84 : 1), first, 0.02, 0.02]],
    [0.26, pair],
    [0.34, pair],
    [0.4, tap],
    [0.46, [tap[0]!, tap[1]!, tap[2]!, tap[3]! * 1.04, tap[4]! * 1.04, tap[5]! - 0.08, tap[6]! - 0.02]],
    [0.52, pair],
    [0.6, pair],
    [0.665, [0, 0, 60, 130, 130, -0.14, 0.05]],
    [0.71, inside],
    [0.73, inside],
    [0.765, board],
    [0.79, board],
    [0.825, inside],
    [0.92, [door[0]!, door[1]! + 2, 8, door[3]!, door[4]!, door[5]! - 0.04, door[6]! + 0.01]],
    [1, door],
  ];
  // Every shot looks at the stack's middle unless it says otherwise.
  for (const key of camera) if (key[1].length < 8) key[1] = [...key[1], 0];
  return { disc, phone, camera, held: onDisc };
}

// The told-once frame (reduced motion): the disc on the wall, the door and
// its lever beside it, filling the canvas (public/stills/pocket-door.webp).
const STILL_SHOT = [96, -34, 0, 360, 262, 0.28, 0.04, 0];

// The opening shot's box (mm), stacked; wide, it's 150. The still of the
// first frame is rendered at 150, so stacked, PocketStory.module.css scales
// it up by 150 / this.
const OPENING_NARROW = 115;

const FOV = 26;
// Side by side, the composition keeps to a box at most this many times as
// wide as the stage is tall, centred, so an ultrawide screen sets the pair
// beside the words as a 16:9 one does rather than out toward its far edge.
const WIDEST = 2;
// Stacked, the top of the part of the stage the shots fill, in its height.
const HEADROOM = 0.02;
// The light raking across the pad's cells while it's apart: from the upper
// left (in view space), this far off square to its face (radians).
const RAKE = new Vector3(-0.55, 0.75, 0.35).normalize();
const RAKE_ANGLE = 1.1;
// A slice of the build goes on to its next step while it has taken less than
// this (ms) and hasn't yet waited on the GPU.
const SLICE = 6;
const RIPPLE = { life: 1.5, speed: 175, gap: 0.2 }; // seconds, mm a second, seconds between rings
const BUZZ = 0.42; // seconds

// ——— The ripple: the tap's field, spreading in the disc's plane ———

function rippleMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    // Additive light has no back or front to sort: one pass, one program.
    forceSinglePass: true,
    uniforms: { uAge: { value: new Vector3(-1, -1, -1) }, uColor: { value: new Color() }, uSize: { value: 460 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uAge;
      uniform vec3 uColor;
      uniform float uSize;
      varying vec2 vUv;
      // One ring at radius r: its soft glow (x) and a thin bright core (y).
      vec2 ring(float r, float age) {
        if (age < 0.0 || age > ${RIPPLE.life.toFixed(2)}) return vec2(0.0);
        float k = age / ${RIPPLE.life.toFixed(2)};
        float d = r - (27.0 + age * ${RIPPLE.speed.toFixed(1)});
        float glow = d / (2.4 + 10.0 * k);
        float core = d / (0.8 + 1.2 * k);
        return vec2(exp(-glow * glow), exp(-core * core)) * pow(1.0 - k, 1.4);
      }
      void main() {
        float r = length(vUv - 0.5) * uSize;
        // Faded before the plane's edge, so a late ring never shows a square cut.
        vec2 a = (ring(r, uAge.x) + ring(r, uAge.y) * 0.7 + ring(r, uAge.z) * 0.45) * smoothstep(uSize * 0.5, uSize * 0.36, r);
        // A soft bloom over the face as the tap lands.
        float flash = uAge.x >= 0.0 ? exp(-uAge.x * 5.0) * smoothstep(40.0, 0.0, r) * 0.55 : 0.0;
        float core = min(1.0, a.y);
        // The core runs whiter, so the ring reads in every mode's colour.
        gl_FragColor = vec4(mix(uColor, vec3(1.0), core * 0.5), 1.0);
        #include <colorspace_fragment>
        // Additive, weighted once by alpha (the blend does it).
        gl_FragColor.a = min(1.0, a.x * 0.95 + core * 0.8 + flash);
      }`,
  });
}

// ——— The scene ———

export async function createPocketScene(canvas: HTMLCanvasElement, events: PocketEvents, options: Options, cancelled: () => boolean, pace: Pace, gpu: Gate) {
  // The phone's screen is set in the page's own font.
  await document.fonts.ready;
  if (cancelled()) return null;
  const scene = new PocketScene(canvas, events, options);
  let built = false;
  try {
    built = await scene.build(pace, gpu, cancelled);
  } finally {
    if (!built) scene.dispose();
  }
  return built ? scene : null;
}

export class PocketScene {
  // Made by build(), once it may use the GPU.
  private renderer!: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(FOV, 1, 10, 6000);
  // Made a step at a time by build(), each in its own quiet moment.
  private kit!: DeviceMaterials;
  private env!: Texture;
  private layers!: PocketLayers;
  private ceramic!: MeshPhysicalMaterial;
  private phone!: Handset;
  private hall!: Hallway;
  private disc = new Group();
  private phoneRoot = new Group();
  private timelines = { wide: timeline(false), narrow: timeline(true) };
  private ripple = new Mesh(new PlaneGeometry(460, 460), rippleMaterial());
  // The page's studio lights, as every device on it is lit, set for the
  // night ground; each light's strength there, to fade it by.
  private studio = new StudioLights();
  private studioLights: [Light, number][] = [];
  private studioEnv = 1;
  // By the wall: a faint cool rim behind, and the hallway's downlight.
  private rim = new DirectionalLight(0xe9f0ff, 0);
  private spot = new SpotLight(0xffe9d6, 0, 0, 0.26, 1, 0);
  private width = 1;
  private height = 1;
  private room = 1;
  private progress = 0;
  private active = false;
  private raf = 0;
  private last = 0;
  private dirty = true;
  private still: boolean;
  private narrow: boolean;
  private small: boolean;
  private level: number;
  private finish: FinishId;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private rippleAt = -Infinity; // when the last tap landed (seconds)
  private buzzAt = -Infinity;
  // The quiet coming on (or going off) in time from the tap.
  private calmTween = { from: 0, to: 0, at: -Infinity };
  // The downlight's shadows are drawn again only when something that casts
  // them has moved, not on every redraw (a pointer's lean moves the camera).
  private shadowsDirty = true;
  private disposed = false;
  private lift = new Vector3();
  private benchN = new Vector3();
  private benchV = new Vector3();
  private benchUp = new Vector3();
  private eye = new Vector3();

  constructor(
    private canvas: HTMLCanvasElement,
    private events: PocketEvents,
    options: Options,
  ) {
    this.still = options.still;
    this.narrow = options.narrow;
    this.small = options.small;
    this.level = options.level;
    this.finish = options.finish;
    this.width = Math.max(1, options.width);
    this.height = Math.max(1, options.height);
    this.room = options.room;
  }

  // The drawing's context.
  private open() {
    const canvas = this.canvas;
    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance", stencil: false });
    // Three reads each program's logs back on its first use, which waits on
    // the GPU for every one; worth it only while building the page.
    renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    canvas.addEventListener("webglcontextlost", this.onLost);
    this.renderer = renderer;
  }

  // Builds the scene a slice at a time, each after `pace` says it's a good
  // moment. First what needs no GPU: the phone and the hallway. Then, once
  // `gate` says so, the context, the studio (its baked light), Pocket, the
  // textures, the downlight's shadows, and each material's program,
  // compiled and drawn once, one to a slice (on some GPUs a compile, and a
  // program's first draw, hold up every frame on screen). A slice runs its
  // steps on while they're quick and none has waited on the GPU. The scene
  // is shown with show(). Returns false if cancelled on the way.
  async build(pace: Pace, gate: Gate, cancelled: () => boolean): Promise<boolean> {
    let from = -Infinity;
    let gpu = true;
    const turn = async () => {
      if (gpu || performance.now() - from > SLICE) {
        await pace();
        from = performance.now();
        gpu = false;
      }
      return !cancelled() && !this.disposed;
    };

    for (const step of [() => this.makePhone(), () => this.makeHall()]) {
      if (!(await turn())) return false;
      step();
    }
    await gate();
    gpu = true;
    if (!(await turn())) return false;
    this.open();
    gpu = true;
    if (!(await turn())) return false;
    this.makeStudio();
    gpu = true;
    if (!(await turn())) return false;
    this.makeDisc();
    this.size(this.width, this.height);
    this.pose();

    // One mesh for each material.
    const seen = new Set<Material>();
    const jobs: Mesh[] = [];
    this.scene.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const fresh = [o.material as Material | Material[]].flat().filter((m) => !seen.has(m));
      fresh.forEach((m) => seen.add(m));
      if (fresh.length) jobs.push(o);
    });

    // The textures, uploaded a few at a time rather than all in the first
    // frame; a big one gets a slice of its own.
    const textures = new Set<Texture>();
    for (const m of seen) {
      for (const v of Object.values(m)) if (v instanceof Texture && v !== this.env) textures.add(v);
    }
    for (const t of textures) {
      if (!(await turn())) return false;
      this.renderer.initTexture(t);
      const image = t.image as { width?: number; height?: number } | null;
      if ((image?.width ?? 0) * (image?.height ?? 0) > 512 * 512) gpu = true;
    }

    // The downlight's shadows come first: some GPUs build a program's
    // first draw for the shadow map it's given, so each is drawn once only
    // when the real one exists.
    if (!(await turn())) return false;
    this.drawShadows();
    gpu = true;

    // Each program, compiled and then drawn once. A material that shares a
    // program already made costs nothing and doesn't end the slice.
    const programs = () => this.renderer.info.programs?.length ?? 0;
    for (const mesh of jobs) {
      if (!(await turn())) return false;
      const before = programs();
      try {
        await this.renderer.compileAsync(mesh, this.camera, this.scene);
      } catch {
        // compileAsync isn't everywhere; the draw compiles instead
      }
      if (cancelled() || this.disposed) return false;
      if (programs() === before) continue;
      this.drawOnly(mesh);
      gpu = true;
    }
    return true;
  }

  // Unseen frames (the canvas isn't shown until show()), with some of the
  // scene shown: `on` says which. Returns what it changed, to put back.
  private showOnly(on: (o: Object3D) => boolean) {
    const saved: [Object3D, boolean][] = [];
    this.scene.traverse((o) => {
      const v = on(o);
      if (o.visible !== v) {
        saved.push([o, o.visible]);
        o.visible = v;
      }
    });
    return () => saved.forEach(([o, v]) => (o.visible = v));
  }

  // The downlight's shadow map, with every part that casts one shown: this
  // compiles what it's drawn with and puts that to its first use. The
  // camera looks away, so the frame itself draws nothing.
  private drawShadows() {
    const restore = this.showOnly(() => true);
    this.camera.position.set(0, 0, 1e5);
    this.camera.lookAt(0, 0, 2e5);
    this.camera.updateMatrixWorld();
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    restore();
    this.pose();
    this.shadowsDirty = false;
    this.dirty = true;
  }

  // One mesh drawn on its own, so its program is put to its first use in a
  // slice of its own.
  private drawOnly(mesh: Mesh) {
    const restore = this.showOnly((o) => !(o instanceof Mesh) || o === mesh);
    const culled = mesh.frustumCulled;
    mesh.frustumCulled = false;
    this.renderer.render(this.scene, this.camera);
    mesh.frustumCulled = culled;
    restore();
    this.dirty = true;
  }

  // Resolves once the GPU has done everything asked of it so far (the
  // build's last programs and draws), or after `limit` ms: checked a frame
  // at a time, without waiting on it.
  async caughtUp(limit: number) {
    const gl = this.renderer?.getContext();
    if (!(gl instanceof WebGL2RenderingContext)) return;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) return;
    gl.flush();
    const until = performance.now() + limit;
    while (!this.disposed && performance.now() < until && gl.getSyncParameter(sync, gl.SYNC_STATUS) !== gl.SIGNALED) {
      await new Promise((r) => requestAnimationFrame(r));
    }
    gl.deleteSync(sync);
  }

  // The first frame the visitor sees: the story at `p`, drawn at once,
  // without playing the moments on the way there (their chimes and ripple).
  show(p: number) {
    if (this.disposed) return;
    this.progress = clamp01(p);
    // The build drew every part's shadow (the phone's among them); they're
    // drawn again for what's there once the downlight is on, as it always
    // is in the told-once frame.
    this.shadowsDirty = this.still || this.progress > WALL[0];
    this.dirty = true;
    this.draw();
  }

  // The same studio every device on the page is lit by, leaning a little
  // toward this camera, which looks at the disc's face.
  private makeStudio() {
    this.env = studioEnvironment(this.renderer, 0.9);
    this.scene.environment = this.env;
    // The lights: the shared studio's at night (#pocket is a night ground),
    // so Pocket and its finish look here as they do everywhere else on the
    // page; then, as the wall comes up, a faint rim and the hallway's
    // downlight, which casts the only shadows.
    this.studio.apply(this.scene, 1);
    this.studioEnv = this.scene.environmentIntensity;
    this.studio.group.traverse((o) => {
      if (o instanceof Light) this.studioLights.push([o, o.intensity]);
    });
    this.rim.position.set(0.9, 0.6, -1.2);
    // High and close to the wall, so its light grazes down it and falls away.
    // (Its aim is set with the shot: see pose().)
    this.spot.position.set(30, 800, 500);
    this.spot.castShadow = true;
    this.spot.shadow.mapSize.set(this.small ? 1024 : 2048, this.small ? 1024 : 2048);
    this.spot.shadow.camera.near = 300;
    this.spot.shadow.camera.far = 1600;
    this.spot.shadow.bias = -0.0004;
    this.spot.shadow.normalBias = 0.6;
    this.spot.shadow.radius = 4;
    this.scene.add(this.studio.group, this.rim, this.spot, this.spot.target);
    this.phone.setEnvironment(this.env);
    this.hall.setEnvironment(this.env, 0.09);
  }

  // Pocket, in its parts, turned to face the camera and centred on its
  // middle, so it turns about itself.
  private makeDisc() {
    this.kit = new DeviceMaterials(this.finish, { anisotropy: this.renderer.capabilities.getMaxAnisotropy() });
    this.layers = new PocketLayers(this.kit);
    this.ceramic = this.layers.ceramic;
    const group = this.layers.group;
    group.rotation.x = Math.PI / 2;
    group.position.z = -POCKET.h / 2;
    group.traverse((o) => {
      if (o instanceof Mesh) o.castShadow = true;
    });
    this.disc.add(group);
    this.disc.rotation.order = "YXZ";
    // The ripple lies in the plane of the disc's face.
    this.ripple.position.z = POCKET.h / 2 + 0.3;
    this.ripple.renderOrder = 3;
    this.ripple.visible = false;
    this.disc.add(this.ripple);
    this.scene.add(this.disc);
  }

  private makePhone() {
    // Fewer texels for the phone's screen on a small screen, where it's drawn smaller.
    this.phone = new Handset(POCKET_APPS, this.small ? 1.5 : 2);
    this.phoneRoot.rotation.order = "YXZ";
    this.phoneRoot.add(this.phone.group);
    this.scene.add(this.phoneRoot);
  }

  private makeHall() {
    this.hall = new Hallway();
    this.scene.add(this.hall.group);
  }

  setProgress(p: number) {
    const next = clamp01(p);
    if (next === this.progress) return;
    const was = this.progress;
    this.progress = next;
    this.dirty = true;
    // Pocket and the phone cast the downlight's shadows only once the wall is up.
    if (Math.max(was, next) > WALL[0]) this.shadowsDirty = true;
    if (this.still) return;
    // Moments crossed going forward play their effects: the last
    // notification crossed buzzes and chimes, unless the step was a leap.
    const now = performance.now() / 1000;
    let crossed = -1;
    for (let i = 0; i < POCKET_APPS.length; i++) {
      const at = NOTES.from + i * NOTES.step + NOTES.each * 0.5;
      if (was < at && next >= at) crossed = i;
    }
    if (crossed >= 0) {
      this.buzzAt = now;
      if (next - was < LEAP) sound.notify(crossed + 1);
    }
    if (was < TAP && next >= TAP) {
      this.rippleAt = now;
      this.calmTo(1, now);
      sound.tap(true);
    } else if (was >= TAP && next < TAP) this.calmTo(0, now);
  }

  setFinish(id: FinishId) {
    this.finish = id;
    this.kit.setFinish(id, this.still);
    this.dirty = true;
    if (this.still || !this.active) {
      this.kit.update(1);
      this.draw();
    }
  }

  setLevel(level: number) {
    this.level = level;
    this.dirty = true;
  }

  setPointer(x: number, y: number) {
    if (this.still) return;
    this.pointer.tx = Math.max(-1, Math.min(1, x));
    this.pointer.ty = Math.max(-1, Math.min(1, y));
  }

  // A new size clears the canvas, so it's drawn again at once, before the
  // browser paints the cleared one.
  resize({ width, height, narrow, small, room }: Size) {
    if (Math.max(1, width) === this.width && Math.max(1, height) === this.height && narrow === this.narrow && small === this.small && room === this.room)
      return;
    this.narrow = narrow;
    this.small = small;
    this.room = room;
    this.size(width, height);
    this.dirty = true;
    this.draw();
  }

  setActive(on: boolean) {
    if (this.disposed) return;
    if (this.still) {
      if (on) this.draw();
      return;
    }
    if (on === this.active) return;
    this.active = on;
    if (on) {
      this.last = performance.now();
      this.dirty = true;
      this.raf = requestAnimationFrame(this.tick);
    } else cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.disposed = true;
    this.active = false;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.layers?.dispose();
    (this.ripple.material as Material).dispose();
    this.ripple.geometry.dispose();
    this.phone?.dispose();
    this.hall?.dispose();
    this.kit?.dispose();
    this.env?.dispose();
    this.spot.shadow.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }

  // ——— Internals ———

  private size(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    // One resize of the drawing buffer, not two.
    const ratio = Math.min(window.devicePixelRatio || 1, this.small ? 1.5 : 2);
    if (this.renderer.getPixelRatio() !== ratio) this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
  }

  private onLost = (e: Event) => {
    e.preventDefault();
    this.setActive(false);
    this.events.lost();
  };

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const p = this.pointer;
    const px = p.x;
    const py = p.y;
    p.x += (p.tx - p.x) * (1 - Math.exp(-3.5 * dt));
    p.y += (p.ty - p.y) * (1 - Math.exp(-3.5 * dt));
    if (Math.abs(p.x - px) + Math.abs(p.y - py) > 1e-4) this.dirty = true;
    if (this.kit.update(dt)) this.dirty = true;
    const t = now / 1000;
    const effects = t - this.rippleAt < RIPPLE.life + RIPPLE.gap * 2 || t - this.buzzAt < BUZZ || t - this.calmTween.at < CALM_S;
    if (effects) this.dirty = true;
    if (this.dirty) this.draw();
  };

  // Sets everything on stage for the current progress.
  private pose() {
    const p = this.still ? 1 : this.progress;
    const t = performance.now() / 1000;
    const wide = this.still || !this.narrow;
    const moves = wide ? this.timelines.wide : this.timelines.narrow;

    // The disc, and its parts: apart while "No battery" reads, then back
    // together, turning slowly about its axis the while.
    const [dx, dy, dz, yaw, pitch, spin] = track(moves.disc, p);
    this.disc.position.set(dx!, dy!, dz!);
    this.disc.rotation.set(pitch!, yaw!, spin!, "YXZ");
    const open = this.still ? 0 : rise(p, OPEN[0], OPEN[1]) * (1 - rise(p, OPEN[2], OPEN[3]));
    this.layers.set(open, clamp01((p - OPEN[0]) / (OPEN[3] - OPEN[0])));

    // The phone, and its buzz when a notification lands.
    const inPlay = !this.still && p > 0.12 && p < 0.665;
    this.phoneRoot.visible = inPlay;
    if (inPlay) {
      let pose = track(moves.phone, p);
      // Held on the disc a moment after the tap, however fast it was passed.
      const since = t - this.rippleAt;
      if (p >= TAP && p <= 0.6 && since >= 0) {
        const hold = 1 - easeInOut(clamp01((since - HOLD[0]) / HOLD[1]));
        if (hold > 0) pose = pose.map((v, k) => v + (moves.held[k]! - v) * hold);
      }
      const [x, y, z, rx, ry, rz] = pose;
      const b = clamp01(1 - (t - this.buzzAt) / BUZZ);
      const shake = b > 0 ? Math.sin((t - this.buzzAt) * TAU * 26) * b * b : 0;
      this.phoneRoot.position.set(x! + shake * 0.7, y!, z!);
      this.phoneRoot.rotation.set(rx!, ry!, rz! + shake * 0.02, "YXZ");
      let notes = 0;
      for (let i = 0; i < POCKET_APPS.length; i++) notes += clamp01((p - NOTES.from - i * NOTES.step) / NOTES.each);
      const calm = Math.max(rise(p, CALM[0], CALM[1]), this.calmAt(t));
      this.phone.paint({ notes, calm, colour: this.modeHex() });
    }

    // The ripple, for a moment after the tap.
    const age = t - this.rippleAt;
    const rippling = !this.still && age >= 0 && age < RIPPLE.life + RIPPLE.gap * 2;
    this.ripple.visible = rippling;
    if (rippling) {
      const m = this.ripple.material as ShaderMaterial;
      (m.uniforms.uAge!.value as Vector3).set(age, age - RIPPLE.gap, age - RIPPLE.gap * 2);
      (m.uniforms.uColor!.value as Color).set(this.modeHex());
    }

    // The hallway comes up as the disc heads for the wall, lit by its
    // downlight; the studio's own lights step back.
    const wall = rise(p, WALL[0], WALL[1]);
    this.hall.setShown(wall);
    // The pool of light falls round the disc and the door; on wide screens
    // a little further right, clear of the words.
    this.spot.target.position.set(wide && !this.still ? 58 : 50, -30, 0);
    this.spot.intensity = 5 * wall;
    this.rim.intensity = 0.3 * wall;
    for (const [light, full] of this.studioLights) light.intensity = full * (1 - wall);
    this.scene.environmentIntensity = this.studioEnv + (0.85 - this.studioEnv) * wall;
    // At night the page lifts the ceramic a little, as the shared stage does,
    // so it stays white on a dark ground; by the wall the downlight does.
    this.ceramic.emissiveIntensity = 0.2 * (1 - wall);

    // The camera: fit the shot's box into the part of the stage the story
    // keeps for it (the right of the words on wide screens, above them on
    // narrow ones), then orbit. While Pocket is apart, it keeps the middle
    // of the stack in the middle of the shot.
    const [tx, ty, tz, bw, bh, cy, cp, focus] = this.still ? STILL_SHOT : track(moves.camera, p);
    const area = this.area(wide);
    const tan = Math.tan(((FOV / 2) * Math.PI) / 180);
    const distance = (this.height / (2 * tan)) * Math.max(bh! / area.h, bw! / area.w);
    const oy = cy! + this.pointer.x * 0.05;
    const op = cp! - this.pointer.y * 0.035;
    const target = new Vector3(tx!, ty!, tz!);
    const aim = PocketLayers.aim(open, focus!) - POCKET.h / 2;
    if (aim !== 0) target.add(this.lift.set(0, 0, aim).applyQuaternion(this.disc.quaternion));
    this.camera.position.set(
      target.x + distance * Math.sin(oy) * Math.cos(op),
      target.y + distance * Math.sin(op),
      target.z + distance * Math.cos(oy) * Math.cos(op),
    );
    this.camera.lookAt(target);
    // The peeled pad turns its face to the camera.
    if (open > 0) {
      this.disc.updateMatrixWorld();
      this.layers.face(this.layers.group.worldToLocal(this.eye.copy(this.camera.position)));
    }
    this.camera.setViewOffset(this.width, this.height, this.width / 2 - area.x, this.height / 2 - area.y, this.width, this.height);
    this.camera.updateProjectionMatrix();

    // The board's own light, while it's apart: mirrored in its face from
    // the camera, so the copper shows its colour, and swung slowly across
    // as the parts turn, so the light runs over the turns.
    const bench = this.layers.bench;
    const hold = clamp01((p - OPEN[0]) / (OPEN[3] - OPEN[0]));
    bench.strength.value = 1.1 * open;
    bench.sweep.value = -24 + 48 * hold;
    if (open > 0) {
      this.camera.updateMatrixWorld();
      const n = this.benchN.set(0, 0, 1).applyQuaternion(this.disc.quaternion);
      const v = this.benchV.copy(this.camera.position).sub(target).normalize();
      const l = bench.dir.value.copy(n).multiplyScalar(2 * n.dot(v)).sub(v);
      l.applyAxisAngle(this.benchUp.set(0, 1, 0), 0.22 * (hold * 2 - 1));
      l.transformDirection(this.camera.matrixWorldInverse);
      // And the pad's: from the upper left, raking across its face.
      const face = this.layers.padFace(this.benchN).transformDirection(this.camera.matrixWorldInverse);
      const r = bench.rake.value.copy(RAKE).addScaledVector(face, -face.dot(RAKE)).normalize();
      r.multiplyScalar(Math.sin(RAKE_ANGLE)).addScaledVector(face, Math.cos(RAKE_ANGLE));
    }
  }

  // The part of the stage a shot fills, in pixels: its middle and its size.
  // (PocketStory.module.css places the still of the first frame by the same.)
  private area(wide: boolean) {
    const w = this.width;
    const h = this.height;
    if (this.still) return { x: w / 2, y: h / 2, w: 0.94 * w, h: 0.92 * h };
    if (wide) {
      const box = Math.min(w, WIDEST * h);
      return { x: (w - box) / 2 + 0.63 * box, y: h / 2, w: 0.6 * box, h: 0.84 * h };
    }
    const top = HEADROOM * h;
    const bottom = Math.max(top + 1, Math.min(h, this.room));
    return { x: w / 2, y: (top + bottom) / 2, w: 0.9 * w, h: bottom - top };
  }

  private draw() {
    if (this.disposed || !this.layers) return;
    this.pose();
    if (this.shadowsDirty) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowsDirty = false;
    }
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
  }

  // The timed quiet: eased from where it was toward on (1) or off (0).
  private calmAt(t: number) {
    const c = this.calmTween;
    return c.from + (c.to - c.from) * easeInOut(clamp01((t - c.at) / CALM_S));
  }

  private calmTo(to: number, t: number) {
    this.calmTween = { from: this.calmAt(t), to, at: t };
  }

  // The lock's colour: the mode that's on, or Desk's while the dial is off.
  private modeHex() {
    return MODE_HEX[this.level > 0 ? Math.min(3, this.level) : 1]!;
  }
}
