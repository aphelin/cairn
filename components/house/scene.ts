import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  DoubleSide,
  FrontSide,
  Group,
  HemisphereLight,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  ShaderLib,
  ShaderMaterial,
  SRGBColorSpace,
  UniformsUtils,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
  type BufferGeometry,
  type Material,
  Texture,
} from "three";
import { MODE_HEX } from "@/lib/modes";
import { buildBook, buildCrown, buildFigure, buildLeaf, buildPath, buildScreen, buildSeam } from "./build";
import { aoTexture, FAR, fieldFrom, type Field } from "./field";
import { unpack } from "./kit";
import type { Built } from "./make";
import { EVENING_SIGMA, eveningRoom, glassMaterial, glowMaterial, houseMaterials, zoneUniforms, type Maps, type ZoneUniforms } from "./materials";
import { bake, build, compiling, prime, primeEach, release, step } from "@/components/dial/gpu";
import { DIAL, LAMPS, MARKS, PHONES, PHONE_SIZE, PLINTH, POCKET, REACH, WALK, WALL_H, WARM } from "./plan";
import { asTextures, backdrop, glowTexture, PAINTERS, softShadow, type Painted } from "./textures";

export type Level = 0 | 1 | 2 | 3;
export type WalkState = "idle" | "walking" | "arrived" | "done";

export type HouseEvents = {
  // After every drawn frame: each marker's point in CSS pixels, x then y, in
  // the order of MARKS.
  frame: (points: Float32Array) => void;
  // Which phones the zone holds, and whose colour each lock is lit in (the
  // level; it keeps the last one after the phone is let go, so its lock
  // fades out in the colour it had).
  locks: (locked: boolean[], levels: Level[]) => void;
  // During the walk the scene turns the dial itself, and says so.
  level: (level: Level) => void;
  walk: (state: WalkState) => void;
  ready: () => void;
  lost: () => void;
};

// `width` and `height` are the canvas's size to start with, in CSS pixels.
type Options = { still: boolean; small: boolean; fine: boolean; width: number; height: number };

const pause = () => new Promise<void>((r) => setTimeout(r, 0));

type FromWorker = { built: Built; painted: Painted<ImageBitmap> | null };

// The model and its baked light are made in a worker, so the page keeps
// scrolling while the house is built, and its surfaces are painted there too
// where the browser allows. Where a worker can't start, they're made here, in
// steps.
function buildOffThread() {
  return new Promise<FromWorker>((resolve, reject) => {
    const worker = new Worker(new URL("./house.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<FromWorker>) => {
      worker.terminate();
      resolve(e.data);
    };
    const fail = (e: Event) => {
      e.preventDefault();
      worker.terminate();
      reject(new Error("house worker failed"));
    };
    worker.onerror = fail;
    worker.onmessageerror = fail;
    worker.postMessage(null);
  });
}

// Surfaces the worker didn't paint are painted here, one at a time, yielding
// between them. Then, once `gpu` resolves (the page may want the house built
// before it makes a WebGL context), everything the GPU needs is made a step
// at a time (see warm()). `urgent` says the house is close enough to be
// needed soon, so its steps stop waiting for the page to be still.
export async function createHouse(
  canvas: HTMLCanvasElement,
  events: HouseEvents,
  options: Options,
  cancelled: () => boolean,
  urgent: () => boolean | "now" = () => true,
  gpu: () => Promise<void> = () => Promise.resolve(),
) {
  let built: Built;
  let painted: Painted<ImageBitmap> | Painted | null = null;
  try {
    ({ built, painted } = await buildOffThread());
  } catch {
    const { make } = await import("./make");
    built = (await make(pause)).built;
  }
  if (cancelled()) return null;
  const field = fieldFrom(built.field);
  const ao = aoTexture(built.ao);
  if (!painted) {
    const here = {} as Record<string, unknown>;
    for (const [name, paint] of Object.entries(PAINTERS)) {
      await pause();
      if (cancelled()) return null;
      here[name] = paint();
    }
    painted = here as Painted;
  }
  const maps: Maps = asTextures(painted, 8);
  await gpu();
  if (cancelled()) return null;
  await step(urgent, 1);
  if (cancelled()) return null;
  const scene = new HouseScene(canvas, events, options, { built, field, ao, maps });
  if (!(await scene.warm(cancelled, urgent, options.width, options.height))) {
    scene.dispose();
    return null;
  }
  return scene;
}

// The evening: a deep blue night outside, lamplight inside. The fill from
// above is kept low, so the rooms are lit mostly by their lamps' pools, and
// every light is a warm white rather than amber. The house dims a little as
// the zone grows, so its colour reads as the light in the room.
const DUSK = [0, 0.1, 0.2, 0.32];
const SKY = { sky: 0x51618a, ground: 0x3b3530, intensity: 0.7 };
const KEY = { colour: 0xfff1e4, intensity: 1.3 };
const WARM_K = 0.5;
// Camera shots: how far the frame leans toward the dial, and how far it
// pushes in (on wide frames, then on narrow ones).
const SHOTS = [
  { lean: 0, push: [1, 1] },
  { lean: 0.36, push: [1.2, 1.25] },
  { lean: 0.2, push: [1.08, 1.04] },
  { lean: 0.04, push: [1.0, 1.0] },
];
const DETENT = (-52 * Math.PI) / 180;
const WALK_SPEED = 1.2; // metres a second
const STRIDE = 0.62; // metres a step
const ELEVATION = (54 * Math.PI) / 180;
const AZIMUTH = (33 * Math.PI) / 180;
// How fast the light runs: seconds per metre it has to cover, on top of a
// short base, so Home's flood through the flat takes a beat longer than
// Desk's pool on the desk.
const FLOOD = { base: 0.45, perMetre: 0.2 };
const RIPPLE_SPEED = 2.6; // metres a second
const RIPPLE_EVERY = 1.5; // seconds, at the least

const PATH_VERTEX = /* glsl */ `
attribute float aS;
attribute float aSide;
varying float vS;
varying float vSide;
void main() {
  vS = aS;
  vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const PATH_FRAGMENT = /* glsl */ `
uniform float uT;
uniform float uOp;
uniform float uWalked;
uniform float uLen;
uniform vec3 uCol;
varying float vS;
varying float vSide;
void main() {
  float k = fract((vS - uT * 0.45) / 0.22);
  float dash = smoothstep(0.0, 0.06, k) * (1.0 - smoothstep(0.46, 0.52, k));
  float edge = 1.0 - smoothstep(0.5, 1.0, abs(vSide));
  float ahead = smoothstep(uWalked - 0.15, uWalked + 0.05, vS);
  float ends = smoothstep(0.0, 0.25, vS) * (1.0 - smoothstep(uLen - 0.2, uLen, vS));
  gl_FragColor = vec4(uCol, uOp * dash * edge * ends * mix(0.28, 0.92, ahead));
  #include <colorspace_fragment>
}
`;

type Spring = { x: number; v: number };
const approach = (x: number, target: number, rate: number, dt: number) => x + (target - x) * (1 - Math.exp(-rate * dt));
function spring(s: Spring, target: number, k: number, c: number, dt: number) {
  s.v += ((target - s.x) * k - s.v * c) * dt;
  s.x += s.v * dt;
}
const smooth = (t: number) => t * t * (3 - 2 * t);
const LEVEL_COLOURS = MODE_HEX.map((h) => new Color(h));

// A value that runs to its target over a time set by the distance, fast at
// first and settling, like water finding its level.
type Glide = { from: number; to: number; t: number; dur: number; value: number };
const glide = (v: number): Glide => ({ from: v, to: v, t: 0, dur: 0, value: v });
function aim(g: Glide, to: number, pace = 1) {
  if (to === g.to) return;
  g.from = g.value;
  g.to = to;
  g.t = 0;
  g.dur = (FLOOD.base + Math.abs(to - g.value) * FLOOD.perMetre) * pace;
}
function run(g: Glide, dt: number) {
  if (g.t >= g.dur) {
    const moved = g.value !== g.to;
    g.value = g.to;
    return moved;
  }
  g.t = Math.min(g.dur, g.t + dt);
  const u = g.t / g.dur;
  g.value = g.from + (g.to - g.from) * (1 - Math.pow(1 - u, 1.7));
  return true;
}
const land = (g: Glide) => {
  g.value = g.from = g.to;
  g.t = g.dur = 0;
};

type Assets = { built: Built; field: Field; ao: Texture; maps: Maps };

export class HouseScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(26, 1, 0.5, 220);
  private hemi = new HemisphereLight(SKY.sky, SKY.ground, SKY.intensity);
  private key = new DirectionalLight(KEY.colour, KEY.intensity);
  private lamps: { light: PointLight; power: number; at: { all: number; study: number } }[] = [];
  private halos: Mesh<BufferGeometry, MeshBasicMaterial>[] = [];
  private path: Mesh<BufferGeometry, ShaderMaterial>;
  private crown: Mesh;
  private seam: Mesh<BufferGeometry, MeshBasicMaterial>;
  private figure = new Group();
  private limbs: { legs: Mesh[]; arms: Mesh[] };
  private screens: { mesh: Mesh<BufferGeometry, MeshBasicMaterial>; canvas: HTMLCanvasElement; tex: CanvasTexture; key: string }[] = [];
  private curve: CatmullRomCurve3;
  private pathLength: number;
  private field: Field;
  private zone: ZoneUniforms;
  private disposables: { dispose(): void }[] = [];
  // Every part that casts a shadow, with the depth materials it's drawn
  // with in the shadow pass (stand-ins for three's own, sharing their shaders).
  private casters = new Map<Mesh, Material[]>();

  // State
  private still: boolean;
  private target: Level = 0; // what the section asks for
  private shown: Level = 0; // what the dial is set to right now
  private reaches: number[];
  private reach = glide(0); // how far the light has run, in the study
  private out: Glide; // and past its doorway
  private outHeld = false; // held at the doorway while the study turns
  private front = glide(FAR); // where the new colour has reached
  private frontOut = false; // whether it reaches past the study's doorway
  private colour = new Color(MODE_HEX[1]);
  private colourTo = new Color(MODE_HEX[1]);
  private previous = new Color(MODE_HEX[1]);
  private toLevel: Level = 1;
  private prevLevel: Level = 1;
  private on = 0;
  private dusk = 0;
  private crownAngle: Spring = { x: 0, v: 0 };
  private ripple = 0;
  private clock = 0;
  private locked = PHONES.map(() => false);
  private lockLevel: Level[] = PHONES.map(() => 1 as Level);
  private phoneDistances: { all: number; study: number }[];
  private lookAt = new Vector3();
  private distance = 30;
  private distances = [30, 30, 30, 30];
  private narrow = false;
  private fitted = false;
  private pointer = new Vector2();
  private tilt = new Vector2();
  private fine: boolean;
  private walkOn = false;
  private walkT = 0;
  private walkState: WalkState = "idle";
  private figureScale = 0;
  private reachOut = 0;
  private pathOpacity = 0;
  private raf = 0;
  private last = 0;
  private active = false;
  private dirty = true;
  private swaying = false; // only the touch screens' slow idle sway is moving
  private sways = 0;
  private shadowDirty = true;
  private readyFired = false;
  private width = 1;
  private height = 1;
  private points = new Float32Array(MARKS.length * 2);
  private events: HouseEvents;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, events: HouseEvents, options: Options, assets: Assets) {
    this.canvas = canvas;
    this.events = events;
    this.still = options.still;
    this.fine = options.fine;
    this.field = assets.field;
    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance", stencil: false });
    this.renderer = renderer;
    // Reading back each program's log waits on the GPU, which may be busy
    // with another canvas's shaders; production skips it.
    renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    canvas.addEventListener("webglcontextlost", this.onLost);

    // How far each mode's light runs: Home's is the far corner of the flat.
    this.reaches = [...REACH, this.field.furthest + 1.0];
    this.out = glide(this.field.threshold - 0.02);
    this.phoneDistances = PHONES.map((p) => this.field.sample(p.at[0], p.at[2]));

    // The night outside, and the evening's reflections (baked in warm()).
    const sky = backdrop();
    this.scene.background = sky;
    this.scene.environmentIntensity = 0.45;
    this.disposables.push(sky);

    // Light: a cool sky, one warm light from high above standing in for the
    // ceiling lights (it gives the soft shadows), and a few small live lights
    // at the lamps for the sheen on what's near them.
    this.scene.add(this.hemi);
    this.key.position.set(-3.6, 16, 5.2);
    this.key.castShadow = true;
    const size = options.small ? 1024 : 2048;
    this.key.shadow.mapSize.set(size, size);
    const sc = this.key.shadow.camera;
    sc.left = -7.5;
    sc.right = 7.5;
    sc.top = 6.5;
    sc.bottom = -6.5;
    sc.near = 6;
    sc.far = 26;
    this.key.shadow.bias = -0.0003;
    this.key.shadow.normalBias = 0.015;
    this.key.shadow.radius = options.small ? 3 : 4;
    this.scene.add(this.key, this.key.target);
    // Phones make do with the baked pools; the live lights are for sheen.
    for (const l of options.small ? [] : LAMPS) {
      if (!l.real) continue;
      const light = new PointLight(WARM, l.real, 2.3, 2);
      light.position.set(...l.at);
      this.scene.add(light);
      this.lamps.push({ light, power: l.real, at: this.field.sample(l.at[0], l.at[2]) });
    }

    // The model floats in the night, over its own soft shadow.
    const shade = softShadow();
    const under = new Mesh(new PlaneGeometry(17, 14), new MeshBasicMaterial({ map: shade, transparent: true, depthWrite: false, toneMapped: false }));
    under.rotation.x = -Math.PI / 2;
    under.position.set(0.5, -PLINTH.h - 0.02, 0.2);
    under.renderOrder = -1;
    this.scene.add(under);
    this.disposables.push(shade, under.geometry, under.material);

    // The house: one mesh per material, with the zone worked into each.
    this.zone = zoneUniforms(assets.field.texture, assets.ao);
    this.disposables.push(assets.field.texture, assets.ao);
    for (const t of [assets.maps.planks.map, assets.maps.planks.rough, assets.maps.tiles.map, assets.maps.tiles.rough, assets.maps.splash, assets.maps.grain, assets.maps.weave, assets.maps.prints]) this.disposables.push(t);
    const mats = houseMaterials(this.zone, assets.maps);
    this.disposables.push(...Object.values(mats));
    const { meshes, glow: glowPacked, glass: glassPacked } = assets.built;
    const glow = glowPacked && unpack(glowPacked);
    const glass = glassPacked && unpack(glassPacked);
    for (const [mat, packed] of meshes) {
      const geometry = unpack(packed);
      geometry.computeBoundingSphere();
      const mesh = new Mesh(geometry, mats[mat]);
      mesh.castShadow = mat !== "planks" && mat !== "tiles";
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      this.disposables.push(geometry);
    }
    if (glow) {
      const m = glowMaterial();
      this.scene.add(new Mesh(glow, m));
      this.disposables.push(glow, m);
    }
    if (glass) {
      const m = glassMaterial();
      const panes = new Mesh(glass, m);
      panes.renderOrder = 2;
      this.scene.add(panes);
      this.disposables.push(glass, m);
    }
    // Foliage and books, instanced.
    for (const [list, geometry, material] of [
      [assets.built.leaves, buildLeaf(), mats.leaf],
      [assets.built.books, buildBook(), mats.plain],
    ] as const) {
      const count = list.colours.length / 3;
      if (!count) continue;
      const mesh = new InstancedMesh(geometry, material, count);
      mesh.instanceMatrix.array.set(list.matrices);
      mesh.instanceColor = new InstancedBufferAttribute(list.colours, 3);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.computeBoundingSphere();
      this.scene.add(mesh);
      this.disposables.push(geometry);
    }

    // Cairn Home's crown and its lit seam.
    this.crown = new Mesh(buildCrown(), mats.plain);
    this.crown.position.set(DIAL.x, DIAL.y, DIAL.z);
    this.crown.castShadow = true;
    this.crown.receiveShadow = true;
    this.seam = new Mesh(buildSeam(), new MeshBasicMaterial({ color: 0x3a3a3e, toneMapped: false }));
    this.seam.position.copy(this.crown.position);
    this.scene.add(this.crown, this.seam);
    this.disposables.push(this.crown.geometry, this.seam.geometry, this.seam.material);

    // The light each phone's screen throws on what it lies on.
    const halo = glowTexture();
    const haloShape = new PlaneGeometry(0.62, 0.62);
    haloShape.rotateX(-Math.PI / 2);
    for (const p of PHONES) {
      const m = new Mesh(
        haloShape,
        new MeshBasicMaterial({ map: halo, color: 0xaebcf0, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      m.position.set(p.at[0], p.at[1] + 0.004, p.at[2]);
      m.renderOrder = 1;
      this.halos.push(m);
      this.scene.add(m);
      this.disposables.push(m.material);
    }
    this.disposables.push(halo, haloShape);

    // Phone screens: lit with notifications, or dark with a lock.
    const screen = buildScreen();
    for (const p of PHONES) {
      const c = document.createElement("canvas");
      c.width = 96;
      c.height = 192;
      const tex = new CanvasTexture(c);
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 4;
      const mesh = new Mesh(screen, new MeshBasicMaterial({ map: tex, toneMapped: false }));
      mesh.position.set(p.at[0], p.at[1] + PHONE_SIZE.t + 0.002, p.at[2]);
      mesh.rotation.y = p.turn;
      this.scene.add(mesh);
      this.screens.push({ mesh, canvas: c, tex, key: "" });
      this.disposables.push(tex, mesh.material);
    }
    this.disposables.push(screen);

    // The walk: a dashed line on the floor, and the person who takes it.
    this.curve = new CatmullRomCurve3(
      WALK.map(([x, z]) => new Vector3(x, 0, z)),
      false,
      "centripetal",
    );
    const samples = this.curve.getSpacedPoints(160).map((v) => ({ x: v.x, z: v.z }));
    const built = buildPath(samples);
    this.pathLength = built.length;
    this.path = new Mesh(
      built.geometry,
      new ShaderMaterial({
        vertexShader: PATH_VERTEX,
        fragmentShader: PATH_FRAGMENT,
        uniforms: {
          uT: { value: 0 },
          uOp: { value: 0 },
          uWalked: { value: 0 },
          uLen: { value: built.length },
          uCol: { value: new Color(0xf2efe8) },
        },
        transparent: true,
        depthWrite: false,
      }),
    );
    this.path.renderOrder = 1;
    this.path.visible = false;
    this.scene.add(this.path);
    this.disposables.push(this.path.geometry, this.path.material);

    const person = buildFigure();
    const part = (g: BufferGeometry, x: number, y: number) => {
      const m = new Mesh(g, mats.plain);
      m.position.set(x, y, 0);
      m.castShadow = true;
      this.figure.add(m);
      this.disposables.push(g);
      return m;
    };
    part(person.body, 0, 0);
    this.limbs = {
      legs: [part(person.leg, -person.hip.x, person.hip.y), part(person.leg.clone(), person.hip.x, person.hip.y)],
      arms: [part(person.arm, -person.shoulder.x, person.shoulder.y), part(person.arm.clone(), person.shoulder.x, person.shoulder.y)],
    };
    this.limbs.arms.forEach((a, i) => (a.rotation.z = (i ? 1 : -1) * 0.08));
    this.figure.visible = false;
    const start = this.curve.getPointAt(0);
    this.figure.position.set(start.x, 0, start.z);
    this.scene.add(this.figure);

    this.lookAt.copy(this.home());
    this.drawScreens();
  }

  // Makes everything the first frame needs, a step at a time (see
  // components/dial/gpu.ts): the drawing buffer, the evening's light, every
  // shader (the shadow pass's and the night backdrop's among them), the
  // textures, and the driver's first draw with each. While the house isn't
  // needed yet, each step waits for the page to be still. Says whether it
  // finished.
  async warm(cancelled: () => boolean, urgent: () => boolean | "now", width: number, height: number): Promise<boolean> {
    const r = this.renderer;
    const next = () => step(urgent);
    try {
      // The evening's light, baked before the drawing buffer is sized, as it
      // always has been (see DialStage.warm).
      const room = eveningRoom();
      const env = await bake(r, room, EVENING_SIGMA, next, cancelled);
      release(room);
      if (!env) return false;
      this.scene.environment = env.texture;
      this.disposables.push(env);
      await next();
      if (cancelled()) return false;
      this.size(width, height);
      this.place();
      const meshes: Mesh[] = [];
      this.scene.traverse((o) => {
        if (o instanceof Mesh) meshes.push(o);
      });
      const jobs = [...meshes.map((m) => compiling(r, m, this.camera, this.scene)), ...this.firstFrameJobs()];
      if (!(await build(r, jobs, next, cancelled))) return false;
      // Everything has been asked for: wait until the driver says it's all
      // built (nothing asks sooner, since asking waits on the GPU).
      await r.compileAsync(this.scene, this.camera);
      // The textures: each big one a step of its own, the small ones together.
      const textures = this.disposables.filter((t): t is Texture => t instanceof Texture);
      const big = (t: Texture) => {
        const i = t.image as { width?: number; height?: number } | null;
        return (i?.width ?? 0) * (i?.height ?? 0) >= 512 * 512;
      };
      for (const t of [...textures.filter(big), null]) {
        await next();
        if (cancelled()) return false;
        if (t) r.initTexture(t);
        else for (const u of textures.filter((u) => !big(u))) r.initTexture(u);
      }
      // The first draws: the shadow pass (see primeShadows), then the
      // scene's shaders one at a time, sampling the shadow as they will.
      if (!(await this.primeShadows(next, cancelled))) return false;
      if (!(await primeEach(r, this.scene, this.camera, meshes, () => step(urgent, 1), cancelled))) return false;
    } catch {
      // Building on first draw instead is fine.
    }
    return !cancelled();
  }

  // The shadow pass's first draws. The shadow map is made in a step of its
  // own (a pass with nothing casting); then each depth shader's first draw,
  // in a pass with only the parts that cast with it casting. Meanwhile the
  // camera looks away, so the scene itself draws nothing. The first real
  // frame draws the whole shadow again.
  private async primeShadows(next: () => Promise<void>, cancelled: () => boolean): Promise<boolean> {
    const r = this.renderer;
    const program = (m: Material) => (r.properties.get(m) as { currentProgram?: { id: number } }).currentProgram?.id ?? -1;
    const groups = new Map<string, Mesh[]>();
    for (const [o, depths] of this.casters) {
      const key = depths.map(program).join();
      const group = groups.get(key);
      if (group) group.push(o);
      else groups.set(key, [o]);
    }
    const casters = [...this.casters.keys()];
    try {
      for (const group of [[], ...groups.values()]) {
        await next();
        if (cancelled()) return false;
        for (const c of casters) c.castShadow = group.includes(c);
        r.shadowMap.needsUpdate = true;
        this.camera.position.set(0, -500, 0);
        this.camera.lookAt(0, -1000, 0);
        this.camera.updateMatrixWorld();
        prime(r, this.scene, this.camera);
      }
    } finally {
      for (const c of casters) c.castShadow = true;
      this.shadowDirty = true;
      this.place();
    }
    return true;
  }

  // The shaders the first frame would otherwise build as it draws, and use
  // at once, so wait on: the shadow pass's depth shaders, one for each way
  // a caster faces, and the night backdrop's; as jobs for build(). Made
  // here as three.js would make them there, so the frame finds them built.
  // The stand-in materials are kept, since letting go of one would let go of
  // its shader.
  private firstFrameJobs(): (() => void)[] {
    const r = this.renderer;
    const jobs: (() => void)[] = [];
    const target = new WebGLRenderTarget(1, 1);
    this.disposables.push(target);
    const flip = { [FrontSide]: BackSide, [BackSide]: FrontSide, [DoubleSide]: DoubleSide };
    const casters: Mesh[] = [];
    this.scene.traverseVisible((o) => {
      if (o instanceof Mesh && o.castShadow) casters.push(o);
    });
    for (const o of casters) {
      const own = o.material as Material | Material[];
      const depths: Material[] = [];
      this.casters.set(o, depths);
      for (const m of [own].flat()) {
        const d = new MeshDepthMaterial();
        d.side = flip[m.side];
        d.map = (m as MeshBasicMaterial).map ?? null;
        depths.push(d);
        this.disposables.push(d);
        jobs.push(() => {
          r.setRenderTarget(target);
          o.material = d;
          try {
            r.compile(o, this.camera, this.scene);
          } finally {
            o.material = own;
            r.setRenderTarget(null);
          }
        });
      }
    }
    const sky = this.scene.background;
    if (sky instanceof Texture) {
      const geometry = new PlaneGeometry(2, 2);
      geometry.deleteAttribute("normal");
      const material = new ShaderMaterial({
        name: "BackgroundMaterial",
        uniforms: UniformsUtils.clone(ShaderLib.background.uniforms),
        vertexShader: ShaderLib.background.vertexShader,
        fragmentShader: ShaderLib.background.fragmentShader,
        side: FrontSide,
        depthTest: false,
        depthWrite: false,
        fog: false,
      });
      material.uniforms.t2D!.value = sky;
      Object.defineProperty(material, "map", { get: () => sky });
      material.toneMapped = sky.colorSpace !== SRGBColorSpace;
      this.disposables.push(geometry, material);
      jobs.push(compiling(r, new Mesh(geometry, material), this.camera, this.scene));
    }
    return jobs;
  }

  // ——— Controls ———

  setLevel(level: Level) {
    this.target = level;
    if (this.walkOn) return;
    this.turnTo(level);
  }

  setWalk(on: boolean) {
    if (this.still || on === this.walkOn) return;
    this.walkOn = on;
    this.walkT = 0;
    this.setWalkState(on ? "walking" : "idle");
    if (on) {
      this.turnTo(3);
      this.events.level(3);
    } else {
      this.turnTo(this.target);
    }
    this.wake();
  }

  replay() {
    if (!this.walkOn) return;
    this.walkT = 0;
    this.figureScale = 0;
    this.setWalkState("walking");
    this.turnTo(3);
    this.events.level(3);
    this.wake();
  }

  setPointer(x: number, y: number) {
    this.pointer.set(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
    this.wake();
  }

  resize(width: number, height: number) {
    this.size(width, height);
    if (this.still || !this.active) this.draw();
  }

  // The canvas and the camera for the frame's size. A new drawing buffer is
  // made only when the size has changed, since making one holds some GPUs
  // up a moment.
  private size(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const cap = window.matchMedia("(max-width: 820px)").matches ? 1.5 : 2;
    const pr = Math.min(window.devicePixelRatio || 1, cap);
    const now = this.renderer.getSize(new Vector2());
    if (pr !== this.renderer.getPixelRatio() || now.x !== this.width || now.y !== this.height) {
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(this.width, this.height, false);
    }
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    const first = !this.fitted;
    this.fit();
    this.fitted = true;
    // The first frame starts a little further out and settles in.
    if (first) {
      this.distance = this.distances[this.shown]! * 1.12;
      this.lookAt.copy(this.shotTarget(this.shown));
    }
    if (this.still) this.snap();
    this.dirty = true;
    this.shadowDirty = true;
  }

  setActive(on: boolean) {
    if (this.still) {
      if (on) this.draw();
      return;
    }
    if (on === this.active) return;
    this.active = on;
    if (on) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    } else cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.setActive(false);
    this.active = false;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  // ——— Internals ———

  private onLost = (e: Event) => {
    e.preventDefault();
    this.setActive(false);
    this.events.lost();
  };

  // Set the dial. The light runs out to the new reach (or drains back toward
  // the dial). Turning up, the new colour washes out from the dial a little
  // ahead of the flood, over everything the old one lit. Turning down, it
  // fills only its own reach, and the light draining back keeps its colour.
  private turnTo(level: Level) {
    this.shown = level;
    const to = this.reaches[level]!;
    const down = to < this.reach.value;
    const lit = this.reach.value > 0.05;
    aim(this.reach, to);
    // Turning up to Home from a lit study, the light waits at the doorway
    // until the new colour has filled the study, so it pours out already
    // in Home's colour rather than ahead of it.
    const past = this.field.threshold;
    this.outHeld = !this.still && level === 3 && lit && this.out.value < past + 0.1;
    if (!this.outHeld) aim(this.out, level === 3 ? this.reaches[3]! : past - 0.02);
    if (level > 0) {
      this.prevLevel = lit ? this.toLevel : level;
      this.previous.copy(lit ? this.colourTo : new Color(MODE_HEX[level]));
      this.toLevel = level;
      this.colourTo.set(MODE_HEX[level]);
      if (!lit) this.colour.copy(this.colourTo);
      // The old colour lingers only where the light already was.
      this.zone.uZWas.value.set(lit ? this.reach.value : 0, lit ? Math.min(this.reach.value, this.out.value) : 0);
      this.front = glide(lit ? 0 : FAR);
      if (lit) aim(this.front, down ? to + 0.3 : this.reaches[3]! + 0.6, 0.4);
      this.frontOut = !lit || !down;
    }
    if (this.still) this.snap();
    this.wake();
  }

  private setWalkState(state: WalkState) {
    if (state === this.walkState) return;
    this.walkState = state;
    this.events.walk(state);
  }

  private wake() {
    this.dirty = true;
    if (this.still) this.draw();
  }

  // Reduced motion: every value lands where it's going, for one still frame.
  private snap() {
    land(this.reach);
    land(this.out);
    this.front = glide(FAR);
    this.frontOut = true;
    this.prevLevel = this.toLevel;
    this.zone.uZWas.value.set(0, 0);
    this.on = this.shown > 0 ? 1 : 0;
    this.colour.copy(this.colourTo);
    this.previous.copy(this.colourTo);
    this.dusk = DUSK[this.shown]!;
    this.crownAngle = { x: this.shown * DETENT, v: 0 };
    this.shadowDirty = true;
    this.distance = this.distances[this.shown]!;
    this.lookAt.copy(this.shotTarget(this.shown));
    this.ripple = 0;
  }

  private home() {
    return new Vector3(0, 0.35, 0.3);
  }

  // On a phone, Room leans less, so the whole study stays in frame; Desk
  // leans all the way, so its small pool reads at that size.
  private shotTarget(level: Level) {
    const h = this.home();
    const lean = SHOTS[level]!.lean * (this.narrow && level === 2 ? 0.45 : 1);
    return h.lerp(new Vector3(DIAL.x, 0.5, DIAL.z + 1.1), lean);
  }

  // Place the camera for the current look-at, zoom and pointer tilt.
  private place() {
    const az = AZIMUTH - this.tilt.x * 0.075;
    const el = ELEVATION + this.tilt.y * 0.045;
    const d = this.distance;
    this.camera.position.set(
      this.lookAt.x + d * Math.cos(el) * Math.sin(az),
      this.lookAt.y + d * Math.sin(el),
      this.lookAt.z + d * Math.cos(el) * Math.cos(az),
    );
    this.camera.lookAt(this.lookAt);
    this.camera.updateMatrixWorld();
  }

  // Each shot's camera distance: the plinth fills the frame with a margin,
  // and each mode pushes in from there by its shot.
  private fit() {
    this.narrow = this.width < 520;
    const plinth: Vector3[] = [];
    for (const x of [PLINTH.x0, PLINTH.x1]) for (const z of [PLINTH.z0, PLINTH.z1]) for (const y of [-PLINTH.h, WALL_H]) plinth.push(new Vector3(x, y, z));
    const k = this.narrow ? 1 : 0;
    const base = this.fitTo(plinth, this.home(), this.narrow ? 0.98 : 0.95);
    this.distances = SHOTS.map((s) => base / s.push[k]!);
  }

  private fitTo(pts: Vector3[], look: Vector3, margin: number) {
    const saved = { look: this.lookAt.clone(), distance: this.distance, tilt: this.tilt.clone() };
    this.lookAt.copy(look);
    this.tilt.set(0, 0);
    let d = 30;
    const v = new Vector3();
    for (let i = 0; i < 6; i++) {
      this.distance = d;
      this.place();
      let m = 0;
      for (const p of pts) {
        v.copy(p).project(this.camera);
        m = Math.max(m, Math.abs(v.x), Math.abs(v.y));
      }
      d *= m / margin;
    }
    this.lookAt.copy(saved.look);
    this.distance = saved.distance;
    this.tilt.copy(saved.tilt);
    return d;
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    if (this.update(dt) || this.dirty) this.draw();
    // On touch screens the camera sways slowly on its own, a tenth of a
    // pixel a frame: drawing every other frame of that is indistinguishable
    // and halves what the house costs a phone at rest.
    else if (this.swaying && ++this.sways % 2 === 0) this.draw();
  };

  // Advance everything; say whether anything visible moved.
  private update(dt: number) {
    let moving = false;
    this.clock += dt;

    if (this.walkOn) moving = this.stepWalk(dt) || moving;
    else if (this.figureScale > 0) {
      this.figureScale = Math.max(0, this.figureScale - dt * 4);
      moving = true;
    }

    if (run(this.reach, dt)) moving = true;
    if (run(this.front, dt)) moving = true;
    // Let the held light through the doorway once the study has turned
    // (the front's soft edge, 0.45 m, is past the threshold).
    if (this.outHeld && this.front.value > this.field.threshold + 0.45) {
      this.outHeld = false;
      aim(this.out, this.reaches[3]!);
    }
    if (run(this.out, dt)) moving = true;

    const on = this.shown > 0 || this.reach.value > 0.05 ? 1 : 0;
    const o0 = this.on;
    this.on = approach(this.on, on, 5, dt);
    if (Math.abs(this.on - on) < 0.002) this.on = on;
    if (this.on !== o0) moving = true;

    const c0 = this.colour.getHex();
    this.colour.lerp(this.colourTo, 1 - Math.exp(-5 * dt));
    if (this.colour.getHex() !== c0) moving = true;

    const d0 = this.dusk;
    this.dusk = approach(this.dusk, DUSK[this.shown]!, 2.2, dt);
    if (Math.abs(this.dusk - d0) > 1e-4) moving = true;

    const a0 = this.crownAngle.x;
    spring(this.crownAngle, this.shown * DETENT, 160, 15, dt);
    if (Math.abs(this.crownAngle.x - a0) > 1e-5) {
      moving = true;
      this.shadowDirty = true;
    }

    // Ripples run out through the lit rooms, one after another, with a
    // short breath between them (never quicker than one every RIPPLE_EVERY
    // seconds, so Desk's small pool doesn't flicker).
    if (this.reach.value > 0.02) {
      this.ripple += dt * RIPPLE_SPEED;
      if (this.ripple > Math.max(this.rippleEnd() + 0.6, RIPPLE_SPEED * RIPPLE_EVERY)) this.ripple = 0;
      moving = true;
    }

    // The camera eases toward this state's shot, and leans with the pointer.
    const want = this.shotTarget(this.shown);
    const l0 = this.lookAt.clone();
    this.lookAt.lerp(want, 1 - Math.exp(-2 * dt));
    const z0 = this.distance;
    this.distance = approach(this.distance, this.distances[this.shown]!, 1.8, dt);
    const idle = this.fine ? 0 : Math.sin(this.clock * 0.5) * 0.35;
    const t0 = this.tilt.clone();
    this.tilt.x = approach(this.tilt.x, this.fine ? this.pointer.x : idle, 3, dt);
    this.tilt.y = approach(this.tilt.y, this.fine ? this.pointer.y : 0, 3, dt);
    const tilted = t0.distanceToSquared(this.tilt) > 1e-8;
    if (l0.distanceToSquared(this.lookAt) > 1e-8 || Math.abs(this.distance - z0) > 1e-4 || (tilted && this.fine)) moving = true;
    this.swaying = tilted && !this.fine;

    return moving;
  }

  // How far the light can be seen to run: to the reach, but never past the
  // furthest wall of what it fills.
  private rippleEnd() {
    const within = this.shown === 3 ? this.field.furthest : this.shown === 2 ? this.field.studyFurthest : this.reach.value;
    return Math.min(this.reach.value, within);
  }

  // The walk: appear by the bed, cross the house, stop at the desk, and turn
  // the dial down. Then the scene holds there until asked to walk again.
  private stepWalk(dt: number) {
    const intro = 0.9;
    const travel = this.pathLength / WALK_SPEED;
    const t = (this.walkT += dt);
    this.figureScale = Math.min(1, this.figureScale + dt * 3.2);
    this.pathOpacity = Math.min(1, t / 0.6);
    const u = Math.max(0, Math.min(1, (t - intro) / travel));
    // Ease in and out of the walk, so the figure starts and stops like a person.
    const s = u < 0.1 ? (u * u) / 0.2 : u > 0.9 ? 1 - ((1 - u) * (1 - u)) / 0.2 : u - 0.05;
    const along = Math.max(0, Math.min(1, s / 0.9));
    const p = this.curve.getPointAt(along);
    const ahead = this.curve.getPointAt(Math.min(1, along + 0.01));
    const walked = along * this.pathLength;
    const walking = u > 0 && u < 1;
    // Legs and arms swing with the distance covered; the body bobs twice a stride.
    const phase = (walked / STRIDE) * Math.PI;
    const swing = walking ? Math.sin(phase) * 0.42 * Math.min(1, u * 8, (1 - u) * 8) : 0;
    this.limbs.legs[0]!.rotation.x = swing;
    this.limbs.legs[1]!.rotation.x = -swing;
    this.limbs.arms[0]!.rotation.x = -swing * 0.8;
    this.figure.position.set(p.x, walking ? Math.abs(Math.cos(phase)) * 0.022 : 0, p.z);
    if (walking) this.figure.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
    else if (u >= 1) this.figure.rotation.y = approach(this.figure.rotation.y, Math.atan2(DIAL.x - p.x, DIAL.z - p.z), 6, dt);
    this.shadowDirty = true;
    (this.path.material.uniforms.uWalked as { value: number }).value = walked;

    const arrive = intro + travel;
    // At the desk, the right hand reaches for the dial and turns it down.
    const reachFor = t < arrive ? 0 : t < arrive + 0.35 ? (t - arrive) / 0.35 : t < arrive + 1.3 ? 1 : Math.max(0, 1 - (t - arrive - 1.3) / 0.45);
    this.reachOut = approach(this.reachOut, reachFor, 14, dt);
    this.limbs.arms[1]!.rotation.x = walking ? swing * 0.8 : -1.15 * smooth(this.reachOut);
    if (t >= arrive && this.walkState === "walking") this.setWalkState("arrived");
    if (t >= arrive + 0.45 && this.shown !== 0) {
      this.turnTo(0);
      this.events.level(0);
    }
    if (t >= arrive + 1.9 && this.walkState === "arrived") this.setWalkState("done");
    return true;
  }

  private draw() {
    const z = this.zone;
    z.uZReach.value = this.reach.value;
    z.uZOut.value = this.out.value;
    z.uZCol.value.copy(this.colourTo);
    z.uZPrev.value.copy(this.previous);
    z.uZFront.value = this.front.value;
    z.uZFrontOut.value = this.frontOut ? this.front.value : 0;
    const end = this.rippleEnd();
    z.uZRip.value = this.ripple;
    // Each ripple fades as it runs, but never so far that the far walls
    // can't be seen to flare as it reaches them.
    z.uZRipK.value = this.still || end < 0.1 ? 0 : 0.35 + 0.55 * Math.pow(Math.max(0, 1 - this.ripple / (end + 0.4)), 0.8);
    // Room holds the light at the study's threshold: draw the line there.
    const past = this.field.threshold;
    const held = smooth(Math.min(1, Math.max(0, (this.reach.value - past + 0.2) / 0.6))) * (1 - smooth(Math.min(1, Math.max(0, (this.out.value - past + 0.05) / 0.4))));
    z.uZSill.value.w = held;
    // A wide zone lays a thinner wash, so the house under Home keeps its depth.
    z.uZGain.value = Math.max(1.0, 1.55 - 0.045 * this.reach.value);

    const dusk = this.dusk;
    this.hemi.intensity = SKY.intensity * (1 - dusk);
    this.key.intensity = KEY.intensity * (1 - dusk);
    z.uWarmK.value = WARM_K * (1 - dusk * 1.2);
    // Where the zone reaches a lamp, its light takes over from the lamp's.
    for (const l of this.lamps) l.light.intensity = l.power * (1 - dusk) * (1 - 0.6 * this.cover(l.at));

    // Screens light what they lie on: cool when buzzing, the colour of the
    // light that holds them (and dimmer) once locked.
    this.halos.forEach((h, i) => {
      const m = h.material;
      if (this.locked[i]) {
        m.color.copy(LEVEL_COLOURS[this.lockLevel[i]!]!);
        m.opacity = 0.5;
      } else {
        m.color.set(0xaebcf0);
        m.opacity = 0.75;
      }
    });

    this.crown.rotation.y = this.crownAngle.x;
    const seam = this.seam.material.color;
    if (this.on > 0.01) seam.copy(this.colour).multiplyScalar(0.6 + 0.9 * this.on);
    else seam.set(0x3a3a3e);

    const shown = this.figureScale > 0.001;
    this.figure.visible = shown;
    const fs = smooth(this.figureScale);
    this.figure.scale.set(fs, fs, fs);
    this.path.visible = this.walkOn || this.pathOpacity > 0.01;
    if (!this.walkOn) this.pathOpacity = Math.max(0, this.pathOpacity - 0.08);
    const pu = this.path.material.uniforms;
    (pu.uOp as { value: number }).value = this.pathOpacity;
    (pu.uT as { value: number }).value = this.clock;

    this.updateLocks();
    this.place();
    // The shadows only change when something that casts them moves (the
    // crown, the walker) or the canvas is resized; the camera and the pointer
    // don't touch them.
    if (this.shadowDirty) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowDirty = false;
    }
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
    this.project();
    if (!this.readyFired) {
      this.readyFired = true;
      this.events.ready();
    }
  }

  // How far the zone's light covers a spot on the plan, 0 to 1.
  private cover(d: { all: number; study: number }) {
    const r = this.reach.value;
    const ro = Math.min(r, this.out.value);
    const lit = (reach: number, at: number) => Math.min(1, Math.max(0, (reach - at) / 0.3));
    return r < 0.02 ? 0 : Math.max(lit(r, d.study), lit(ro, d.all));
  }

  // A phone is locked once the light has reached it, and its lock is lit in
  // the colour of the light that reached it: the old mode's, while that is
  // still draining back past it.
  private updateLocks() {
    let changed = false;
    const r = this.reach.value;
    const ro = Math.min(r, this.out.value);
    const was = this.zone.uZWas.value;
    PHONES.forEach((_, i) => {
      const d = this.phoneDistances[i]!;
      const inStudy = d.study < FAR / 2;
      const inside = inStudy ? d.study < r - 0.2 : d.all < ro - 0.2;
      const lock = this.on > 0.5 && inside;
      let level = this.lockLevel[i]!;
      if (lock) {
        const at = inStudy ? d.study : d.all;
        const front = inStudy || this.frontOut ? this.front.value : 0;
        const old = at < (inStudy ? was.x : was.y) && at > front - 0.2;
        level = old ? this.prevLevel : this.toLevel;
      }
      if (lock !== this.locked[i] || level !== this.lockLevel[i]) {
        this.locked[i] = lock;
        this.lockLevel[i] = level;
        changed = true;
      }
    });
    if (changed) this.events.locks([...this.locked], [...this.lockLevel]);
    this.drawScreens();
  }

  private project() {
    const v = new Vector3();
    const put = (i: number, x: number, y: number, z: number) => {
      v.set(x, y, z).project(this.camera);
      this.points[i * 2] = (v.x * 0.5 + 0.5) * this.width;
      this.points[i * 2 + 1] = (-v.y * 0.5 + 0.5) * this.height;
    };
    PHONES.forEach((p, i) => put(i, p.at[0], p.at[1] + 0.04, p.at[2]));
    put(4, DIAL.x, DIAL.y, DIAL.z + 0.1);
    put(5, POCKET.x + 0.05, POCKET.y + 0.14, POCKET.z);
    const f = this.figure.position;
    put(6, f.x, 1.72 * this.figure.scale.y, f.z);
    this.events.frame(this.points);
  }

  // A phone's screen: a lock in the mode's colour when the zone holds it,
  // lit notifications with a red badge when it doesn't.
  private drawScreens() {
    PHONES.forEach((p, i) => {
      const s = this.screens[i]!;
      const lockedHex = MODE_HEX[this.lockLevel[i]!];
      const key = this.locked[i] ? `l${lockedHex}` : `u${p.app}`;
      if (key === s.key) return;
      s.key = key;
      const ctx = s.canvas.getContext("2d")!;
      const W = s.canvas.width;
      const H = s.canvas.height;
      ctx.clearRect(0, 0, W, H);
      if (this.locked[i]) {
        ctx.fillStyle = "#0b0b0d";
        ctx.fillRect(0, 0, W, H);
        const cx = W / 2;
        const cy = H * 0.46;
        ctx.strokeStyle = lockedHex;
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = lockedHex;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy - 6, 10, Math.PI, 0);
        ctx.stroke();
        roundRect(ctx, cx - 15, cy - 6, 30, 22, 4);
        ctx.fill();
      } else {
        // A night-blue wallpaper under the stacked notifications.
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, "#2b3a55");
        g.addColorStop(0.6, "#44587a");
        g.addColorStop(1, "#8a9ab4");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // The lock screen's clock, then two notifications: at the size a
        // phone is drawn, two read as cards where three read as a list.
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        roundRect(ctx, W / 2 - 20, 22, 40, 13, 4);
        ctx.fill();
        const tiles = ["#e1306c", "#ff0033", "#25f4ee", "#111111"];
        for (let k = 0; k < 2; k++) {
          const y = 56 + k * 58;
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          roundRect(ctx, 7, y, W - 14, 48, 11);
          ctx.fill();
          ctx.fillStyle = tiles[(i + k) % tiles.length]!;
          roundRect(ctx, 14, y + 10, 28, 28, 7);
          ctx.fill();
          ctx.fillStyle = "rgba(20,20,24,0.55)";
          ctx.fillRect(48, y + 14, W - 62, 7);
          ctx.fillStyle = "rgba(20,20,24,0.3)";
          ctx.fillRect(48, y + 28, W - 74, 6);
        }
        ctx.fillStyle = "#e5352b";
        ctx.beginPath();
        ctx.arc(W - 16, 16, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      s.tex.needsUpdate = true;
    });
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

