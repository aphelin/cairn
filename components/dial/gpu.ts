// Building a WebGL scene's GPU work a step at a time: its baked light, its
// textures, its shaders and the graphics driver's first use of each. On some
// GPUs (Mesa on Linux, for one) linking a shader, or drawing with it for the
// first time, holds up every frame on the page until it's done, however it's
// asked for; so each step gets frames of its own, and every scene's steps
// share one queue, so two never land in the same frame. A scene that isn't
// needed yet also waits for a moment when the page isn't being scrolled, so
// its steps fall between gestures rather than in them.

import {
  BackSide,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PMREMGenerator,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from "three";

const QUIET = 150; // ms without scrolling that counts as a still moment
const CLEAR = 120; // ms a step keeps clear of any shader link on the page
const LIMIT = 1000; // the longest a step waits for all that (ms)
const SOON = 250; // and the longest a step that's needed now waits (ms)
// A frame is late, held up by the step before, say, when it comes this much
// later than the page's usual pace (and more than two 60 Hz frames in all).
const LATE = 1.6;
const LATEST = 34;

let lastInput = -Infinity;
let lastLink = -Infinity;
let stepping = false; // a step's own work is running: its links are spaced already
let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  const mark = () => {
    lastInput = performance.now();
  };
  for (const type of ["scroll", "wheel", "touchmove", "keydown"]) window.addEventListener(type, mark, { passive: true, capture: true });
  // Shader links asked for outside these steps (by a scene with a scheduler
  // of its own): two in one frame hold it up twice as long, so a step keeps
  // clear of them. Only the time is noted.
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    const link = proto.linkProgram;
    proto.linkProgram = function (this: WebGLRenderingContext, program: WebGLProgram) {
      if (!stepping) lastLink = performance.now();
      return link.call(this, program);
    };
  }
}

const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
// The page's usual frame interval: the median of the last few watched. A
// busy phone may run at 30 frames a second while scrolling, and that's its
// pace, not a hold-up.
const gaps: number[] = [];
function late(gap: number) {
  const usual = gaps.length ? [...gaps].sort((a, b) => a - b)[gaps.length >> 1]! : 16.7;
  gaps.push(gap);
  if (gaps.length > 15) gaps.shift();
  return gap > Math.max(LATEST, usual * LATE);
}
// A task of its own: posted from a frame's callback, it runs once that frame
// has gone out, so a step never holds up the frame it follows.
const task = () =>
  new Promise<void>((resolve) => {
    const c = new MessageChannel();
    c.port1.onmessage = () => resolve();
    c.port2.postMessage(0);
  });
let queue: Promise<void> = Promise.resolve();

// Resolves when the next step may run: `frames` frames or more after the
// last step anywhere on the page (two after a step that links a shader, whose
// hold-up can show a frame late), with the last of them on time and no
// shader linked anywhere on the page just before, so the GPU has caught up.
// A scene that isn't `urgent` also waits for the page to have been still a
// moment, and for its last `frames` frames all on time. Never more than
// LIMIT later (SOON, if it's urgent), whatever the page is doing. One that's
// needed right "now" only keeps its own steps apart.
export function step(urgent: () => boolean | "now" = () => true, frames = 2): Promise<void> {
  listen();
  const turn = queue.then(async () => {
    let last = frames > 1 ? await frame() : performance.now();
    const from = last;
    let onTime = 0;
    for (;;) {
      const now = await frame();
      onTime = late(now - last) ? 0 : onTime + 1;
      last = now;
      const hurry = urgent();
      if (hurry === "now") break;
      if (now - from > (hurry ? SOON : LIMIT)) break;
      if (onTime < (hurry ? 1 : frames) || now - lastLink < CLEAR) continue;
      if (hurry || now - lastInput > QUIET) break;
    }
    await task();
    // The step's work runs as soon as this resolves, before any other task.
    stepping = true;
    setTimeout(() => (stepping = false));
  });
  queue = turn;
  return turn;
}

const programs = (r: WebGLRenderer) => r.info.programs?.length ?? 0;

// Builds shaders a job at a time (each job compiles something), taking a
// step before each job that follows one that built a new shader. Says
// whether it finished (false once cancelled).
export async function build(r: WebGLRenderer, jobs: (() => void)[], next: () => Promise<void>, cancelled: () => boolean): Promise<boolean> {
  let fresh = true; // the work before this counts as a step's
  for (const job of jobs) {
    if (fresh) {
      await next();
      if (cancelled()) return false;
    }
    const before = programs(r);
    job();
    fresh = programs(r) > before;
  }
  return true;
}

// A job for build(): the shaders of `object`'s materials, as `scene` would
// draw them with `camera`.
export const compiling = (r: WebGLRenderer, object: Object3D, camera: Camera, scene: Object3D) => () => {
  r.compile(object, camera, scene as Scene);
};

// The graphics driver's first use of every shader and texture `scene` draws
// with, in a pixel of the canvas's corner: some drivers finish a shader only
// on its first draw, and this way that happens here, not in a frame that
// shows the scene.
export function prime(r: WebGLRenderer, scene: Object3D, camera: Camera) {
  r.setScissorTest(true);
  r.setScissor(0, 0, 1, 1);
  r.render(scene, camera);
  r.setScissorTest(false);
}

// The same for each shader `meshes` draw with, one a step (or `per`): just
// one mesh drawing with each is shown for its draw. Their shaders must be
// built. Says whether it finished.
export async function primeEach(
  r: WebGLRenderer,
  scene: Object3D,
  camera: Camera,
  meshes: Mesh[],
  next: () => Promise<void>,
  cancelled: () => boolean,
  per = 1,
): Promise<boolean> {
  const all: Mesh[] = [];
  scene.traverse((o) => {
    if (o instanceof Mesh) all.push(o);
  });
  const shown = all.map((m) => m.visible);
  const program = (m: Material) => (r.properties.get(m) as { currentProgram?: { id: number } }).currentProgram?.id ?? -1;
  const seen = new Set<string>();
  const firsts = meshes.filter((mesh) => {
    const key = [mesh.material as Material | Material[]].flat().map(program).join();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  try {
    for (let i = 0; i < firsts.length; i += per) {
      await next();
      if (cancelled()) return false;
      const these = firsts.slice(i, i + per);
      for (const m of all) m.visible = these.includes(m);
      prime(r, scene, camera);
    }
    return true;
  } finally {
    all.forEach((m, i) => (m.visible = shown[i]!));
  }
}

// What bake() needs of three's PMREMGenerator beyond its public API.
type Generator = {
  _setSize(size: number): void;
  _allocateTargets(): WebGLRenderTarget;
  _blurMaterial: Material;
  _ggxMaterial: Material;
  _lodMeshes: Mesh[];
  _backgroundBox: Mesh | null;
};

// `room` baked into an environment map, exactly as
// PMREMGenerator.fromScene(room, sigma) bakes it, with each shader the bake
// uses built in a step of its own first: then the bake is just its draws.
// Null once cancelled.
export async function bake(
  r: WebGLRenderer,
  room: Scene,
  sigma: number,
  next: () => Promise<void>,
  cancelled: () => boolean,
): Promise<WebGLRenderTarget | null> {
  const pmrem = new PMREMGenerator(r);
  const g = pmrem as unknown as Generator;
  // As fromScene sets itself up: this makes the blur's and the filter's
  // materials, which the bake reuses.
  g._setSize(256);
  const target = g._allocateTargets();
  g._backgroundBox ??= new Mesh(
    new BoxGeometry(),
    new MeshBasicMaterial({ name: "PMREM.Background", side: BackSide, depthWrite: false, depthTest: false }),
  );
  const cube = new PerspectiveCamera(90, 1, 0.1, 100);
  const flat = new OrthographicCamera();
  const quad = (m: Material) => new Mesh(g._lodMeshes[0]!.geometry, m);
  const jobs: (() => void)[] = [];
  room.traverse((o) => {
    if (o instanceof Mesh) jobs.push(compiling(r, o, cube, room));
  });
  const box = g._backgroundBox;
  const blur = quad(g._blurMaterial);
  const ggx = quad(g._ggxMaterial);
  jobs.push(compiling(r, box, cube, box), compiling(r, blur, flat, blur), compiling(r, ggx, flat, ggx));
  // Built as the bake draws them: into its target, which is what sets the
  // colour space and tone mapping they're built for.
  const was = r.getRenderTarget();
  let done = false;
  try {
    r.setRenderTarget(target);
    done = await build(r, jobs, next, cancelled);
  } finally {
    r.setRenderTarget(was);
  }
  target.dispose();
  if (!done) {
    pmrem.dispose();
    return null;
  }
  await next();
  if (cancelled()) {
    pmrem.dispose();
    return null;
  }
  const env = pmrem.fromScene(room, sigma);
  pmrem.dispose();
  return env;
}

// Lets go of a scene's geometry and materials (once it's been baked, say).
export function release(scene: Object3D) {
  scene.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    o.geometry.dispose();
    for (const m of [o.material as Material | Material[]].flat()) m.dispose();
  });
}
