// The devices, in real 3D. One fixed, transparent canvas covers the viewport
// and draws every device on the page. Each device sits in an anchor element
// in the layout; the page gives every anchor a device of its own. (A device
// given a chain of anchors would glide from one to the next as the page
// scrolls between them.) The camera is orthographic in CSS pixels, so an
// anchor's box is the device's box, and the still images that stand in before
// WebGL line up exactly.
//
// Anchors direct the shot, and the device eases into it:
//   data-dial-level    "store" (the visitor's zone) or a fixed detent, 0 to 3
//   data-dial-explode  "live": pulled apart by the exploded view's scroll
//   data-dial-tilt     how far it leans toward the camera, in radians
//   data-dial-zoom     how much bigger than the box it's drawn
//   data-dial-focus    "seam", "lights" or "crown": frame a point on the front, not the middle
//   data-dial-clip     keep the drawing inside the anchor's box, corners rounded as the box's (for close-ups)

import {
  AddEquation,
  AdditiveBlending,
  Color,
  CustomBlending,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShaderMaterial,
  SrcAlphaFactor,
  SRGBColorSpace,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  ZeroFactor,
  type BufferGeometry,
  type Material,
  type WebGLRenderTarget,
} from "three";
import {
  HOME,
  bandGlow,
  battery,
  board,
  boardTexture,
  bandCore,
  ceramicButton,
  detentAngle,
  detentRing,
  floorDisc,
  homeBody,
  homeCrownRings,
  homeKnurl,
  homePad,
  lightBand,
  pointerLine,
  POCKET,
  puck,
  radialTexture,
} from "./geometry";
import { DeviceMaterials, highlightable, newHighlight, patchShader, pocketModel, type Highlight } from "./materials";
import { StudioLights, bakeStudio } from "./studio";
import { build, compiling, prime, primeEach, step } from "./gpu";
import { MODE_HEX } from "@/lib/modes";
import type { FinishId } from "@/lib/content";

export type Kind = "home" | "pocket";

// Each mode lights the dial's glass band in its own colour (lib/modes.ts).
const MODE_COLOURS = MODE_HEX.map((h) => new Color(h));
const modeColour = (level: number) => MODE_COLOURS[Math.max(1, Math.min(3, Math.round(level)))]!;

const DOT_OFF = new Color("#3a3a3e");

// A part never picked out: no lift, nothing dimmed.
const AT_REST: Highlight = newHighlight();

// The glass band unlit: frosted, a milky grey-white.
const BAND_OFF = new Color("#d4d4dc");
const HOLD = 0.28; // share of each glide at either end where the device rests on its anchor
const TILT = 0.26; // the default shot: low, about 15° above the table, so the crown and seam make the outline

// Where each part of the dial goes when it comes apart (mm above its seat).
// The battery and the board rise clear of the body's rim and of each other,
// so a callout drawn straight out from any part's edge meets nothing else.
const APART = { cap: 84, crown: 64, detent: 50, guide: 36, board: 28, battery: 18, body: 0, foot: -12 };
// Assembled seats of the parts that live inside.
const SEAT = { detent: 20.4, board: 11.5, battery: 3.4 };

type PartKey = keyof typeof APART;
// The named parts, top to bottom, in the order the page lists them (PARTS in
// lib/content.ts). The body isn't named: it's the shell the rest sit in.
const NAMED: PartKey[] = ["cap", "crown", "detent", "guide", "board", "battery", "foot"];
// Where each named part's callout meets it: the radius of its outer edge and
// the height of that edge, at its seat. The part also grows about this height
// when it's picked out.
const EDGE: Record<PartKey, [number, number]> = {
  cap: [HOME.capR, HOME.capY],
  crown: [HOME.r, 32],
  detent: [33.4, SEAT.detent + 1],
  guide: [35.93, HOME.bandY],
  board: [31, SEAT.board],
  battery: [12.25, SEAT.battery + 3.85],
  body: [HOME.r, 9],
  foot: [32.9, 1.3],
};
// A picked-out part grows by this much and comes this far forward (mm), and
// the others dim to this.
const LIFT = 0.04;
const FORWARD = 5;
const DIM = 0.58;

type Shot = { tilt: number; zoom: number; fy: number; fz: number };
// A box on screen in CSS pixels; `radii` are its corners' (top-left, top-right, bottom-right, bottom-left).
type Rect = { x: number; y: number; w: number; h: number; radii?: Vector4 };

type Device = {
  id: string;
  kind: Kind;
  anchors: HTMLElement[];
  outer: Group; // position, scale and the view tilt
  spin: Group; // the whole device's lean toward the pointer
  model: Group; // offset so the focus point sits on the anchor
  crown?: Group; // the part that turns (the dial's crown and cap)
  cap?: Group;
  parts?: Record<PartKey, Group>;
  inner?: Group[]; // parts hidden until the dial comes apart
  // The exploded view's parts, each lit on its own (the named ones, then the
  // body): how picked out each is, eased, and the uniforms that show it.
  lights?: { h: Highlight; amount: number }[];
  focus: number | null; // the named part picked out, if any
  band?: MeshPhysicalMaterial; // the frosted glass band that carries the light
  bandLit?: { value: number }; // how lit the band is, for its glass shader
  core?: MeshStandardMaterial; // the light guide behind the glass
  glows?: ShaderMaterial[];
  pointer?: MeshBasicMaterial; // the engraved line on the ceramic
  spill?: MeshBasicMaterial;
  ceramic: MeshPhysicalMaterial;
  shadow: MeshBasicMaterial;
  tint: Color; // the light's current colour, easing to the mode's
  angle: number; // the crown's current angle
  light: number; // the seam's current brightness, 0 to 1
  apart: number; // current exploded amount, 0 to 1
  night: number; // how dark the section it sits in is, 0 to 1
  shot: Shot; // the current framing, eased toward the anchors'
  clip: Rect | null; // where the drawing is kept, when an anchor asks
  visible: boolean;
  // Whether it has been drawn yet. Its first frame lands straight on the
  // anchor's shot and light; only changes after that ease.
  met: boolean;
  // The sticky stage its anchor sits in, if any, and the top it sticks at:
  // while it's stuck, it holds still as the page scrolls.
  hold: Hold | null;
};

type Hold = { el: HTMLElement; top: number };

export type StageState = {
  level: number; // the zone, 0 to 3, when no drag is in progress
  drag: number | null; // a drag in progress, in detents
  explode: number; // 0 to 1
  night: number; // how dark the hero is, 0 to 1
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const damp = (from: number, to: number, rate: number, dt: number) => to + (from - to) * Math.exp(-rate * dt);
const mixN = (a: number, b: number, t: number) => a + (b - a) * t;

// How far past the window an anchor still counts as near: far enough that a
// device starts to draw before any of it shows, however it's zoomed or tilted.
const NEAR = "150% 100%";
// A frame is only drawn when it would differ from the last one drawn by more
// than this, in any of the values that make it (see frame()). Distances go in
// at 1/200 of a CSS pixel, so that's a fiftieth of a pixel.
const STILL = 1e-4;
const PX = 1 / 200;

function glowMaterial(sigma: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    // Light adds up the same in any order, so both faces go in one pass (and
    // one shader rather than two).
    forceSinglePass: true,
    uniforms: { uColor: { value: MODE_COLOURS[1]!.clone() }, uStrength: { value: 0 }, uY: { value: HOME.bandY }, uSigma: { value: sigma } },
    vertexShader: /* glsl */ `
      varying float vY;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vY = position.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      uniform float uY;
      uniform float uSigma;
      varying float vY;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float d = (vY - uY) / uSigma;
        float band = exp(-d * d);
        float rim = 0.5 + 0.5 * pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5);
        float a = band * rim * uStrength;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
}

// Rounds a close-up's corners to its box's. Drawn over the box once the device
// is in it, this scales every pixel already there by how much of that pixel
// lies inside the rounded box: 1 inside, 0 past the corners, a smooth edge
// between. The canvas holds premultiplied colour, so scaling all four
// channels fades the corners cleanly to transparent.
function cornerMaterial() {
  return new ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: ZeroFactor,
    blendDst: SrcAlphaFactor,
    uniforms: { uRect: { value: new Vector4() }, uRadii: { value: new Vector4() } },
    vertexShader: /* glsl */ `
      void main() {
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec4 uRect;  // x, y from the bottom left, width, height, in device pixels
      uniform vec4 uRadii; // top-left, top-right, bottom-right, bottom-left
      void main() {
        vec2 half_ = uRect.zw * 0.5;
        vec2 p = gl_FragCoord.xy - uRect.xy - half_;
        float r = p.y > 0.0 ? (p.x < 0.0 ? uRadii.x : uRadii.y) : (p.x < 0.0 ? uRadii.w : uRadii.z);
        vec2 q = abs(p) - half_ + r;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
        gl_FragColor = vec4(0.0, 0.0, 0.0, clamp(0.5 - d, 0.0, 1.0));
      }`,
  });
}

// The sticky (or fixed) box an anchor sits in, if any, read as the layout
// changes. A fixed one always holds still (its top is NaN); a sticky one
// only while it's stuck at its top. (A pin that GSAP fixes in place as the
// page scrolls would need telling apart as it happens.)
function holdOf(anchors: HTMLElement[]): Hold | null {
  for (const a of anchors) {
    for (let e: HTMLElement | null = a; e && e !== document.body; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.position === "fixed") return { el: e, top: NaN };
      if (s.position === "sticky") return { el: e, top: parseFloat(s.top) || 0 };
    }
  }
  return null;
}
const stuck = (h: Hold | null) => !!h && (Number.isNaN(h.top) || Math.abs(h.el.getBoundingClientRect().top - h.top) < 1);

// The corner radii an anchor's CSS gives it, or null when it has square corners.
function radiiOf(a: HTMLElement): Vector4 | null {
  const s = getComputedStyle(a);
  const v = new Vector4(
    parseFloat(s.borderTopLeftRadius) || 0,
    parseFloat(s.borderTopRightRadius) || 0,
    parseFloat(s.borderBottomRightRadius) || 0,
    parseFloat(s.borderBottomLeftRadius) || 0,
  );
  return v.x + v.y + v.z + v.w > 0 ? v : null;
}

export class DialStage {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new OrthographicCamera(0, 1, 0, -1, -4000, 4000);
  private devices: Device[] = [];
  private raf = 0;
  private last = 0;
  private pointer = new Vector2(0, 0);
  private pointerTarget = new Vector2(0, 0);
  private kit: DeviceMaterials;
  private lights = new StudioLights();
  private environment: WebGLRenderTarget | null = null;
  private frozen: boolean;
  private cleared = false;
  private ray = new Raycaster();
  private textures = {
    shadow: radialTexture([
      [0, "rgba(0,0,0,0.6)"],
      [0.5, "rgba(0,0,0,0.22)"],
      [1, "rgba(0,0,0,0)"],
    ]),
    // White, so the spill takes the mode's colour from its material.
    spill: radialTexture([
      [0, "rgba(255,255,255,0.9)"],
      [0.35, "rgba(255,255,255,0.32)"],
      [1, "rgba(255,255,255,0)"],
    ]),
    board: boardTexture(),
  };
  private corners = new Scene();
  private cornerMat = cornerMaterial();
  private radii = new Map<HTMLElement, Vector4 | null>(); // read once per anchor, again after a resize
  // The section each anchor sits in, which says whether it's day or night there.
  private sections = new Map<HTMLElement, HTMLElement | null>();
  // Which anchors are near the window. Only those are measured each frame:
  // measuring one forces the page's layout, and most are far away. Until the
  // observer first reports on an anchor, it counts as near.
  private near = new Set<HTMLElement>();
  private reported = new Set<HTMLElement>();
  private watch = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const a = e.target as HTMLElement;
        this.reported.add(a);
        if (e.isIntersecting) this.near.add(a);
        else this.near.delete(a);
      }
    },
    { rootMargin: NEAR },
  );
  private vw = window.innerWidth;
  private vh = window.innerHeight;
  private tall = 0; // the canvas's height (CSS px): the window's and `margin` above and below
  // What the last drawn frame showed, and whether the next must be drawn
  // whatever it shows (after a resize, which clears the canvas).
  private drawn: number[] = [];
  private shape: number[] = [];
  private dirty = true;
  // The canvas reaches `margin` past the window, above and below (CSS px, a
  // whole number of device pixels; less with a mouse, whose smooth scrolling
  // moves the page in step with the frames, so each frame drawn is cheaper). While the devices on screen move with
  // the page, the canvas scrolls with the page ("scroll"): a touch scroll
  // moves it on the compositor, in step with the page, where a canvas fixed
  // to the window could only follow a frame or more late, and nothing needs
  // drawing again until it has scrolled most of the margin away, when it's
  // moved back round the window. While one sits in a sticky stage that's
  // stuck, holding still as the page scrolls, the canvas holds still too
  // ("fixed").
  private margin = 0;
  private mode: "fixed" | "scroll" | null = null;
  private top = 0; // in "scroll", the canvas's top edge, in page pixels
  private fine = window.matchMedia("(pointer: fine)").matches;
  // Geometry every device of a kind shares, made once.
  private geometry = new Map<string, unknown>();
  state: StageState = { level: 0, drag: null, explode: 0, night: 0 };
  private onFrame?: () => void;

  constructor(
    private canvas: HTMLCanvasElement,
    finishId: FinishId,
  ) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    // Reading back each program's log is a round trip that waits on the GPU,
    // which may be busy compiling another canvas's shaders. The shaders don't
    // change once built, so production skips it.
    this.renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.kit = new DeviceMaterials(finishId, { anisotropy: this.renderer.capabilities.getMaxAnisotropy() });
    const quad = new Mesh(new PlaneGeometry(2, 2), this.cornerMat);
    quad.frustumCulled = false;
    this.corners.add(quad);
    this.scene.add(this.lights.group);
    this.frozen = document.documentElement.hasAttribute("data-dial-freeze");
    // Everything that touches the GPU beyond the context itself (the
    // drawing buffer, the studio's light, textures and shaders) is made in
    // warm(), a step at a time.
  }

  add(id: string, kind: Kind, anchors: HTMLElement[]) {
    const outer = new Group();
    const spin = new Group();
    const model = new Group();
    const kit = this.kit;
    // The exploded view gives each part materials of its own, so one can be
    // picked out while the rest dim.
    const explodes = anchors.some((a) => a.dataset.dialExplode === "live");
    const shadow = new MeshBasicMaterial({ map: this.textures.shadow, transparent: true, depthWrite: false, opacity: 0.85 });
    const pointer = new MeshBasicMaterial({ color: DOT_OFF.clone(), toneMapped: false });
    const R = kind === "home" ? HOME.r : POCKET.r;
    const H = kind === "home" ? HOME.h : POCKET.h;
    // Pocket comes assembled from the shared materials module, as any other
    // scene that draws it gets it.
    const pocket = kind === "pocket" ? pocketModel(kit) : null;
    const device: Device = {
      id,
      kind,
      anchors,
      outer,
      spin,
      model,
      ceramic: pocket?.ceramic ?? kit.ceramic(),
      shadow,
      pointer,
      tint: MODE_COLOURS[1]!.clone(),
      angle: detentAngle(0),
      light: 0,
      apart: 0,
      night: 0,
      shot: { tilt: TILT, zoom: 1, fy: H / 2, fz: 0 },
      clip: null,
      visible: false,
      met: false,
      hold: holdOf(anchors),
      focus: null,
    };

    const floor = new Mesh(this.shared(`floor-${kind}`, () => floorDisc(R * 1.55)), shadow);
    floor.position.y = 0.05;
    floor.renderOrder = -2;
    model.add(floor);

    if (kind === "home") {
      const parts = Object.fromEntries(Object.keys(APART).map((k) => [k, new Group()])) as Record<PartKey, Group>;
      const body = kit.titanium();
      // The crown turns: its lip, the knurl and the rim.
      const crown = new Group();
      const rings = this.shared("rings", homeCrownRings);
      const crownMetal = explodes ? kit.titanium() : body;
      crown.add(new Mesh(this.shared("knurl", homeKnurl), kit.knurled()), new Mesh(rings.bottom, crownMetal), new Mesh(rings.top, crownMetal));
      parts.crown.add(crown);

      // The ceramic button turns with it; the pointer line is at the back at zero.
      const cap = new Group();
      cap.add(new Mesh(this.shared("cap", () => ceramicButton(HOME.capR, HOME.capY)), device.ceramic), new Mesh(this.shared("pointer", pointerLine), pointer));
      parts.cap.add(cap);

      parts.body.add(new Mesh(this.shared("body", homeBody), body));
      parts.foot.add(new Mesh(this.shared("pad", homePad), kit.pad()));

      // The glass band: frosted when off, lit from inside in the mode's colour.
      const band = new MeshPhysicalMaterial({
        color: BAND_OFF.clone(),
        roughness: 0.38,
        metalness: 0,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25,
        sheen: 0.4,
        sheenColor: new Color("#ffffff"),
        emissive: MODE_COLOURS[1]!.clone(),
        emissiveIntensity: 0,
        vertexColors: true,
        transparent: true,
      });
      // Light, not a lit surface: the band shows the mode's colour as it is,
      // saturated even in daylight, instead of the tone mapper bleaching it.
      band.toneMapped = false;
      // Unlit, it's frosted glass: you see into it where you look straight
      // at it, and it thickens toward its grazing edges. Lit, it's solid light.
      const bandLit = { value: 0 };
      patchShader(band, "band", (shader) => {
        shader.uniforms.uLit = bandLit;
        shader.fragmentShader = shader.fragmentShader.replace("void main() {", "uniform float uLit;\nvoid main() {").replace(
          "#include <opaque_fragment>",
          `#include <opaque_fragment>
          float facing = abs(dot(normalize(vNormal), normalize(vViewPosition)));
          gl_FragColor.a *= mix(mix(0.38, 0.96, pow(1.0 - facing, 1.3)), 1.0, uLit);`,
        );
      });
      const core = new MeshStandardMaterial({ color: new Color("#2a2a30"), roughness: 0.55, metalness: 0.1, emissive: MODE_COLOURS[1]!.clone(), emissiveIntensity: 0 });
      parts.guide.add(new Mesh(this.shared("core", bandCore), core), new Mesh(this.shared("band", lightBand), band));
      // A tight bloom over the band, and a faint wide one for the dark.
      const tight = glowMaterial(2.1);
      const wide = glowMaterial(6.5);
      const tightMesh = new Mesh(this.shared("glow-tight", () => bandGlow(12)), tight);
      const wideMesh = new Mesh(this.shared("glow-wide", () => bandGlow(34)), wide);
      tightMesh.renderOrder = wideMesh.renderOrder = 2;
      // Light in the air, not a surface to point at.
      tightMesh.userData.noPick = wideMesh.userData.noPick = true;
      parts.guide.add(tightMesh, wideMesh);

      // Inside parts, only drawn once the dial starts to come apart.
      const steel = () => new MeshPhysicalMaterial({ color: new Color("#cfd2d6"), metalness: 1, roughness: 0.24 });
      const detentSteel = steel();
      const detent = new Mesh(this.shared("detent", detentRing), detentSteel);
      detent.position.y = SEAT.detent;
      parts.detent.add(detent);
      const pcb = new Mesh(this.shared("board", board), [
        new MeshStandardMaterial({ color: new Color("#0e1512"), roughness: 0.6 }),
        new MeshStandardMaterial({ map: this.textures.board, roughness: 0.55, metalness: 0.2 }),
        new MeshStandardMaterial({ color: new Color("#0e1512"), roughness: 0.6 }),
      ]);
      pcb.position.y = SEAT.board;
      parts.board.add(pcb);
      const chip = new Mesh(this.shared("chip", () => puck(4.2, 1.1)), new MeshStandardMaterial({ color: new Color("#18181b"), roughness: 0.4 }));
      chip.position.set(9, SEAT.board + 0.6, -6);
      parts.board.add(chip);
      const cell = new Mesh(this.shared("battery", battery), explodes ? steel() : detentSteel);
      cell.position.y = SEAT.battery;
      parts.battery.add(cell);

      for (const g of Object.values(parts)) model.add(g);
      const spill = new MeshBasicMaterial({
        map: this.textures.spill,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        opacity: 0,
      });
      const spillMesh = new Mesh(this.shared("spill", () => floorDisc(R * 2.6)), spill);
      spillMesh.position.y = 0.1;
      spillMesh.renderOrder = -1;
      model.add(spillMesh);

      if (explodes) {
        device.lights = [...NAMED, "body" as const].map((k) => {
          const h = newHighlight();
          const seen = new Set<Material>();
          parts[k].traverse((o) => {
            if (!(o instanceof Mesh)) return;
            for (const m of [o.material as Material | Material[]].flat()) {
              if (m instanceof MeshStandardMaterial && !seen.has(m)) {
                seen.add(m);
                highlightable(m, h);
              }
            }
          });
          return { h, amount: 0 };
        });
      }

      device.parts = parts;
      device.crown = crown;
      device.cap = cap;
      device.inner = [parts.detent, parts.board, parts.battery];
      device.band = band;
      device.bandLit = bandLit;
      device.core = core;
      device.glows = [tight, wide];
      device.spill = spill;
    } else if (pocket) {
      // Pocket doesn't turn and has no light: a pad, a knurled side, and a
      // ceramic face with the tap mark engraved on it.
      model.add(pocket.group);
      device.crown = pocket.group;
      device.angle = 0;
    }

    // Every other lit part carries the same patch, held at rest, so the
    // devices all share the exploded view's shaders: fewer to build, and
    // at rest it leaves every pixel as it was.
    model.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      for (const m of [o.material as Material | Material[]].flat()) {
        if (m instanceof MeshStandardMaterial && !(m.userData.patches as string[] | undefined)?.includes("highlight")) highlightable(m, AT_REST);
      }
    });

    spin.add(model);
    outer.add(spin);
    outer.rotation.x = TILT;
    this.scene.add(outer);
    this.devices.push(device);
    for (const a of anchors) {
      this.sections.set(a, a.closest<HTMLElement>("[data-theme]"));
      this.watch.observe(a);
    }
  }

  // A shape every device of its kind uses, built the first time it's asked for.
  private shared<T extends BufferGeometry | Record<string, BufferGeometry>>(key: string, make: () => T): T {
    if (!this.geometry.has(key)) this.geometry.set(key, make());
    return this.geometry.get(key) as T;
  }

  setFinish(id: FinishId) {
    // Frozen (rendering stills), the new finish lands at once.
    this.kit.setFinish(id, this.frozen);
  }

  setPointer(x: number, y: number) {
    this.pointerTarget.set(x, y);
  }

  // Picks out one named part of an exploded device (its index in the page's
  // list of parts), or none: it grows a touch and catches a rim of light,
  // and the other parts dim.
  highlight(id: string, index: number | null) {
    const d = this.devices.find((v) => v.id === id);
    if (d) d.focus = index;
  }

  // The named part of an exploded device under a point on screen (client
  // pixels), or null. Only once it has come apart far enough to tell the
  // parts apart, and for a pick to show (see the gate in frame()).
  pick(id: string, clientX: number, clientY: number): number | null {
    const d = this.devices.find((v) => v.id === id);
    if (!d?.parts || !d.visible || d.apart < 0.45) return null;
    // The camera is orthographic in CSS pixels, looking down -z from its
    // near plane: the ray starts there, in front of everything it can hit.
    this.ray.ray.origin.set(clientX, -(clientY + this.offset()), 3999);
    this.ray.ray.direction.set(0, 0, -1);
    d.outer.updateMatrixWorld(true);
    let found: number | null = null;
    let nearest = Infinity;
    NAMED.forEach((k, i) => {
      const g = d.parts![k];
      if (!g.visible) return;
      const hit = this.ray.intersectObject(g, true).find((h) => !h.object.userData.noPick && h.object.visible);
      if (hit && hit.distance < nearest) {
        nearest = hit.distance;
        found = i;
      }
    });
    return found;
  }

  // Where an exploded device's callouts meet it, top to bottom in the page's
  // order, in client pixels: each named part's outer edge, level with that
  // edge. `rest` is the height that edge has when it isn't picked out (a
  // pick keeps it within a pixel or so), so a name set beside its part
  // stays still while the part is picked out. `right` is where the whole device ends on the right, a
  // picked-out part's growth included, so lines can run clear of it.
  callouts(id: string): { parts: { x: number; y: number; rest: number }[]; right: number } | null {
    const d = this.devices.find((v) => v.id === id);
    if (!d?.parts || !d.visible) return null;
    const v = new Vector3();
    const scale = d.outer.scale.x;
    const off = this.offset();
    const parts = NAMED.map((k) => {
      const g = d.parts![k];
      const [r, y] = EDGE[k];
      d.model.localToWorld(v.set(0, APART[k] * smooth(d.apart) + y, 0));
      const rest = -v.y - off;
      g.localToWorld(v.set(0, y, 0));
      return { x: v.x + r * scale * g.scale.x, y: -v.y - off, rest };
    });
    d.parts.body.localToWorld(v.set(0, 0, 0));
    return { parts, right: v.x + HOME.r * (1 + LIFT) * scale };
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, w < 820 ? 1.75 : 2);
    // A phone's toolbar coming and going changes only the window's height,
    // by less than the canvas reaches past it. The canvas keeps its size
    // (making it again would empty it, and cost a stall mid-scroll); only
    // the window's new height is taken.
    if (!this.fine && this.tall && w === this.vw && pr === this.renderer.getPixelRatio() && Math.abs(h - this.vh) < this.margin / 2) {
      this.vh = h;
      this.mode = null;
      this.dirty = true;
      return;
    }
    this.vw = w;
    this.vh = h;
    this.margin = Math.round(h * (this.fine ? 0.2 : 0.35) * pr) / pr;
    this.tall = h + 2 * this.margin;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, this.tall);
    this.radii.clear();
    this.camera.left = 0;
    this.camera.right = w;
    this.camera.top = 0;
    this.camera.bottom = -this.tall;
    this.camera.updateProjectionMatrix();
    for (const d of this.devices) d.hold = holdOf(d.anchors);
    // Resizing the canvas empties it, and it's put in place again.
    this.mode = null;
    this.dirty = true;
  }

  // Where the window's top edge is on the canvas, in CSS pixels.
  private offset() {
    return this.mode === "scroll" ? window.scrollY - this.top : this.margin;
  }

  // Puts the canvas for this frame (see `margin`), and says where the
  // window's top edge is on it.
  private settle(fixed: boolean): number {
    const c = this.canvas.style;
    const m = this.margin;
    if (fixed) {
      if (this.mode !== "fixed") {
        this.mode = "fixed";
        c.position = "fixed";
        c.top = `${-m}px`;
        c.transform = "";
        this.dirty = true;
      }
      return m;
    }
    const y = window.scrollY;
    let top = this.top;
    // How much canvas is kept past the window's edges before it's moved
    // round it again. A touch scroll runs ahead of the page's own frames, so
    // it needs a good stretch; smooth scrolling moves the page in step with
    // them, so a mouse needs less (keys and the scrollbar still run ahead).
    const keep = this.vh * (this.fine ? 0.08 : 0.12);
    const room = this.tall - this.vh; // canvas past the window, above and below together
    if (this.mode !== "scroll" || y - top < keep || y - top > room - keep) {
      // Round the window again, never past the foot of the page (which
      // would make the page longer), on a whole device pixel.
      const pr = this.renderer.getPixelRatio();
      const end = document.documentElement.getBoundingClientRect().height - this.tall;
      top = Math.min(Math.round((y - room / 2) * pr), Math.floor(end * pr)) / pr;
    }
    if (this.mode !== "scroll" || top !== this.top) {
      this.mode = "scroll";
      this.top = top;
      c.position = "absolute";
      c.top = "0px";
      c.transform = `translate3d(0, ${top}px, 0)`;
      this.dirty = true;
    }
    return y - top;
  }

  // Makes everything the first frame needs, a step at a time (see gpu.ts),
  // while the stills stand in: the drawing buffer, the studio's light, the
  // textures, every shader the devices can need, and the driver's first draw
  // with each. The hero's dial is the first thing on the page, so the steps
  // don't wait for the page to be still. Says whether it finished.
  async warm(cancelled: () => boolean): Promise<boolean> {
    const r = this.renderer;
    const next = () => step();
    // The studio's light, baked before the drawing buffer is sized, as it
    // always has been (baked after, it comes out a shade different on some
    // screens, and the stills were made from this one).
    const env = await bakeStudio(r, TILT, next, cancelled);
    if (!env) return false;
    this.environment = env;
    this.scene.environment = env.texture;
    // The drawing buffer at its full size: making one holds some GPUs up a moment.
    await next();
    if (cancelled()) return false;
    this.resize();
    // The textures, all small, together.
    await next();
    if (cancelled()) return false;
    for (const t of [...Object.values(this.kit.textures), ...Object.values(this.textures)]) r.initTexture(t);
    const jobs: (() => void)[] = [];
    this.scene.traverse((o) => {
      if (o instanceof Mesh) jobs.push(compiling(r, o, this.camera, this.scene));
    });
    jobs.push(compiling(r, this.corners, this.camera, this.corners));
    if (!(await build(r, jobs, next, cancelled))) return false;
    // Everything has been asked for: wait until the driver says it's all
    // built (nothing asks sooner, since asking waits on the GPU).
    await r.compileAsync(this.scene, this.camera);
    await r.compileAsync(this.corners, this.camera);
    // The first draw with each shader: one of each kind of device, parts
    // inside and all (the rest share their shaders), then the corners' pass.
    const firsts = (["home", "pocket"] as const).map((k) => this.devices.find((d) => d.kind === k)).filter((d) => !!d);
    for (const d of firsts) {
      for (const o of this.devices) o.outer.visible = o === d;
      for (const g of d.inner ?? []) g.visible = true;
      d.outer.position.set(this.vw / 2, -this.tall / 2, 0);
      const meshes: Mesh[] = [];
      d.outer.traverse((o) => {
        if (o instanceof Mesh) meshes.push(o);
      });
      const done = await primeEach(r, this.scene, this.camera, meshes, () => step(undefined, 1), cancelled);
      for (const g of d.inner ?? []) g.visible = false;
      if (!done) return false;
    }
    await next();
    if (cancelled()) return false;
    prime(r, this.corners, this.camera);
    r.setScissorTest(true);
    r.setScissor(0, 0, 1, 1);
    r.clear();
    r.setScissorTest(false);
    for (const o of this.devices) o.outer.visible = false;
    this.dirty = true;
    return true;
  }

  start(onFrame?: () => void) {
    this.onFrame = onFrame;
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      // Every change eases exponentially, so a long frame (a slow machine, a
      // tab coming back) only arrives sooner; it never overshoots.
      this.frame(Math.min(0.5, (now - this.last) / 1000));
      this.last = now;
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  renderNow() {
    this.dirty = true;
    this.frame(1);
  }

  // The shot an anchor asks for.
  private shotOf(a: HTMLElement, d: Device): Shot & { clip: boolean } {
    const H = d.kind === "home" ? HOME.h : POCKET.h;
    const R = d.kind === "home" ? HOME.r : POCKET.r;
    // Close-ups frame a point on the front: the glass band itself; the band
    // with the knurl above it; or the crown, with the ceramic's edge in the
    // top of the shot.
    const focus = d.kind === "home" ? a.dataset.dialFocus : undefined;
    return {
      tilt: a.dataset.dialTilt ? Number(a.dataset.dialTilt) : TILT,
      zoom: a.dataset.dialZoom ? Number(a.dataset.dialZoom) : 1,
      fy: focus === "seam" ? HOME.bandY : focus === "lights" ? 22.5 : focus === "crown" ? 36 : H / 2,
      fz: focus ? R : 0,
      clip: a.hasAttribute("data-dial-clip"),
    };
  }

  private place(d: Device): boolean {
    const vw = this.vw;
    const vh = this.vh;
    const centre = vh / 2;
    // Each anchor measured once.
    const live: HTMLElement[] = [];
    const rects: DOMRect[] = [];
    for (const a of d.anchors) {
      const r = a.getBoundingClientRect();
      if (r.width <= 0) continue;
      live.push(a);
      rects.push(r);
    }
    if (!rects.length) return false;
    const mid = (r: DOMRect) => r.top + r.height / 2;
    let ia = 0;
    let ib = 0;
    let t = 0;
    if (centre >= mid(rects[rects.length - 1]!)) {
      ia = ib = rects.length - 1;
    } else {
      for (let i = 0; i < rects.length - 1; i++) {
        if (centre < mid(rects[i]!)) break;
        if (centre < mid(rects[i + 1]!)) {
          ia = i;
          ib = i + 1;
          const f = clamp01((centre - mid(rects[i]!)) / (mid(rects[i + 1]!) - mid(rects[i]!)));
          // Across a long stretch of page it doesn't glide: it leaves with one
          // anchor and arrives with the next, both off-screen at the switch.
          const jump = mid(rects[i + 1]!) - mid(rects[i]!) > vh * 2.2;
          t = jump ? (f < 0.5 ? 0 : 1) : smooth(clamp01((f - HOLD) / (1 - 2 * HOLD)));
          break;
        }
      }
    }
    const a = rects[ia]!;
    const b = rects[ib]!;
    const x = a.left + a.width / 2 + (b.left + b.width / 2 - (a.left + a.width / 2)) * t;
    const y = mid(a) + (mid(b) - mid(a)) * t;
    const w = a.width + (b.width - a.width) * t;
    const h = a.height + (b.height - a.height) * t;
    const sa = this.shotOf(live[ia]!, d);
    const sb = this.shotOf(live[ib]!, d);
    const target: Shot = { tilt: mixN(sa.tilt, sb.tilt, t), zoom: mixN(sa.zoom, sb.zoom, t), fy: mixN(sa.fy, sb.fy, t), fz: mixN(sa.fz, sb.fz, t) };
    // Clipped anchors keep the drawing in their box; the rest leave it the viewport.
    const full: Rect = { x: 0, y: 0, w: vw, h: vh };
    const rounded = (el: HTMLElement) => {
      if (!this.radii.has(el)) this.radii.set(el, radiiOf(el));
      return this.radii.get(el) ?? undefined;
    };
    const ra: Rect = sa.clip ? { x: a.left, y: a.top, w: a.width, h: a.height, radii: rounded(live[ia]!) } : full;
    const rb: Rect = sb.clip ? { x: b.left, y: b.top, w: b.width, h: b.height, radii: rounded(live[ib]!) } : full;
    d.clip =
      sa.clip || sb.clip
        ? { x: mixN(ra.x, rb.x, t), y: mixN(ra.y, rb.y, t), w: mixN(ra.w, rb.w, t), h: mixN(ra.h, rb.h, t), radii: (t < 0.5 ? ra : rb).radii }
        : null;
    const reach = h * Math.max(1, target.zoom);
    // Drawn while any of it could be on the canvas.
    const pad = Math.max(60, this.margin);
    const onScreen = y + reach > -pad && y - reach < vh + pad;
    d.outer.visible = onScreen;
    if (!onScreen) return false;
    // Anchors can ask for a fixed zone or an exploded state.
    const near = live[t < 0.5 ? ia : ib]!;
    d.outer.userData.anchorLevel = near.dataset.dialLevel;
    d.outer.userData.anchorExplode = near.dataset.dialExplode;
    // The hero darkens as the dial turns; every other section is day or night.
    const section = this.sections.get(near) ?? null;
    d.outer.userData.night = section?.id === "top" ? -1 : section?.dataset.theme === "night" ? 1 : 0;
    d.outer.userData.box = { x, y, w, h, target };
    return true;
  }

  private frame(dt: number) {
    this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-dt * 4));
    const changing = this.kit.update(this.frozen ? 1 : dt);
    const k = this.frozen ? 1 : dt;
    // What this frame will show, as numbers; if they match the last frame
    // drawn, the canvas already shows it and the frame isn't drawn again.
    const shape = this.shape;
    shape.length = 0;
    for (let n = 0; n < this.devices.length; n++) {
      const d = this.devices[n]!;
      // A device whose anchors are all far off screen isn't measured at all.
      const near = d.anchors.some((a) => this.near.has(a) || !this.reported.has(a));
      d.visible = near && this.place(d);
      if (!near) d.outer.visible = false;
      if (!d.visible) continue;
      // A device's first frame lands on its shot, its light and its state.
      const first = !d.met && !this.frozen;
      d.met = true;
      const at = d.outer.userData.night as number;
      d.night = this.frozen || first ? (at < 0 ? this.state.night : at) : damp(d.night, at < 0 ? this.state.night : at, 5, dt);
      const night = d.night;
      const al = d.outer.userData.anchorLevel as string | undefined;
      const ae = d.outer.userData.anchorExplode as string | undefined;
      const level = al === undefined || al === "store" ? (this.state.drag ?? this.state.level) : Number(al);
      const explode = ae === "live" ? this.state.explode : 0;
      const box = d.outer.userData.box as { x: number; y: number; w: number; h: number; target: Shot };
      // The framing eases toward the anchors' shot, so cuts become camera moves.
      const s = d.shot;
      const ease = this.frozen || first ? 1 : 1 - Math.exp(-7 * dt);
      s.tilt += (box.target.tilt - s.tilt) * ease;
      s.zoom += (box.target.zoom - s.zoom) * ease;
      s.fy += (box.target.fy - s.fy) * ease;
      s.fz += (box.target.fz - s.fz) * ease;
      d.ceramic.emissiveIntensity = 0.2 * night;

      if (d.kind === "home") {
        d.angle = this.frozen || first ? detentAngle(level) : damp(d.angle, detentAngle(level), this.state.drag === null ? 12 : 30, k);
        const on = clamp01(level);
        const light = on * (0.55 + 0.15 * Math.min(3, level));
        d.light = first ? light : damp(d.light, light, 6, k);
        d.apart = this.frozen || first ? explode : damp(d.apart, explode, 10, k);
        // Clockwise from above is a negative turn about +y.
        d.crown!.rotation.y = -d.angle;
        d.cap!.rotation.y = -d.angle;
        const lit = d.light;
        // The light eases to the mode's colour, so a turn cross-fades it.
        const target = modeColour(level);
        if (this.frozen || first) d.tint.copy(target);
        else d.tint.lerp(target, 1 - Math.exp(-8 * k));
        // Once the light has settled, the canvas says which colour it is
        // (scripts/verify-modes.mjs reads it for the hero's dial).
        if (d.id === "hero" && level >= 1 && Math.abs(d.tint.r - target.r) + Math.abs(d.tint.g - target.g) + Math.abs(d.tint.b - target.b) < 0.01) {
          const hex = `#${target.getHexString()}`;
          if (this.canvas.dataset.tint !== hex) this.canvas.dataset.tint = hex;
        }
        // The glass band: frosted white when off; lit, it fills with the
        // mode's colour from inside, whiter at the core the brighter it is.
        const band = d.band!;
        band.emissive.copy(d.tint);
        band.emissiveIntensity = lit * (0.95 + 0.25 * night);
        band.color.copy(BAND_OFF).lerp(d.tint.clone().multiplyScalar(0.3), Math.min(1, lit * 1.4));
        d.bandLit!.value = Math.min(1, lit * 1.4);
        d.core!.emissive.copy(d.tint);
        d.core!.emissiveIntensity = lit * 0.8;
        // A picked-out part dims the rest, the band's bloom with them. It only
        // shows once the dial has come well apart: as it goes back together
        // the pick fades out, so a part never stands proud of a closed dial.
        const gate = smooth(clamp01((d.apart - 0.35) / 0.25));
        if (d.lights) {
          d.lights.forEach((l, i) => {
            const on = d.focus === i ? 1 : 0;
            const dim = d.focus !== null && d.focus !== i ? mixN(1, DIM, gate) : 1;
            l.amount = this.frozen || first ? on : damp(l.amount, on, 12, dt);
            l.h.lift.value = l.amount * gate;
            l.h.dim.value = this.frozen || first ? dim : damp(l.h.dim.value, dim, 10, dt);
            shape.push(l.h.lift.value, l.h.dim.value);
          });
        }
        const bloom = d.lights?.[NAMED.indexOf("guide")]!.h.dim.value ?? 1;
        for (const g of d.glows!) (g.uniforms.uColor!.value as Color).copy(d.tint);
        d.glows![0]!.uniforms.uStrength!.value = lit * (0.55 + 0.5 * night) * bloom;
        d.glows![1]!.uniforms.uStrength!.value = lit * (0.1 + 0.5 * night) * bloom;
        // The pointer line lights with the band.
        d.pointer!.color.copy(DOT_OFF).lerp(d.tint, Math.min(1, lit * 1.6));
        d.spill!.color.copy(d.tint);
        d.spill!.opacity = lit * night * 0.85;
        d.shadow.opacity = 0.85 - 0.45 * night;
        const p = d.parts!;
        const e = smooth(d.apart);
        // Each part rises to its place; a picked-out one also grows a touch
        // about its own edge height and comes forward, in front of its
        // neighbours. The camera is orthographic, so coming forward would
        // only slide it down the screen (the view is tilted): it rises by
        // as much, so its edge, and the callout level with it, stay put.
        const rise = Math.tan(d.outer.rotation.x);
        (Object.keys(APART) as PartKey[]).forEach((key) => {
          const i = key === "body" ? NAMED.length : NAMED.indexOf(key);
          const a = (d.lights?.[i]?.amount ?? 0) * gate;
          const grow = 1 + LIFT * a;
          const g = p[key];
          g.scale.setScalar(grow);
          g.position.set(0, APART[key] * e + EDGE[key][1] * (1 - grow) + FORWARD * a * rise, FORWARD * a);
        });
        for (const g of d.inner!) g.visible = d.apart > 0.01;
        // Apart, the shadow belongs to nothing: fade it.
        d.shadow.opacity *= 1 - e;
        shape.push(d.angle, lit, d.apart, d.tint.r, d.tint.g, d.tint.b);
      } else {
        d.shadow.opacity = 0.8 - 0.4 * night;
      }

      // Framing: scale to the box, then put the focus point on its centre.
      const R = d.kind === "home" ? HOME.r : POCKET.r;
      const H = d.kind === "home" ? HOME.h : POCKET.h;
      const e = smooth(d.apart);
      const tall = H + (APART.cap - APART.foot) * e;
      const fit = Math.min(box.w / (R * 2 * 1.12), box.h / (tall * Math.cos(s.tilt) + R * 2 * Math.sin(s.tilt) * 1.05 + R * 0.3));
      const centreY = d.kind === "home" ? (HOME.h + (APART.cap - APART.foot) * e) / 2 + APART.foot * e : H / 2;
      const fy = s.zoom > 1.01 || s.fz > 0.5 ? s.fy : mixN(s.fy, centreY, e);
      d.model.position.set(0, -fy, -s.fz);
      d.outer.position.set(box.x, -box.y, 0);
      d.outer.scale.setScalar(fit * s.zoom);
      if (this.frozen) {
        d.spin.rotation.set(0, 0, 0);
        d.outer.rotation.x = s.tilt;
      } else {
        d.spin.rotation.y = this.pointer.x * 0.2;
        d.outer.rotation.x = s.tilt + this.pointer.y * 0.05 - 0.1 * d.apart;
      }
      shape.push(n, box.x * PX, fit * s.zoom * PX, fy, s.fz, d.outer.rotation.x, d.spin.rotation.y, night);
    }

    // Everything so far is in the window's pixels; the canvas has its own.
    const shown = this.devices.filter((d) => d.visible);
    const offset = shown.length ? this.settle(shown.some((d) => stuck(d.hold))) : 0;
    for (const d of shown) {
      const box = d.outer.userData.box as { y: number };
      d.outer.position.y = -(box.y + offset);
      shape.push((box.y + offset) * PX);
      const c = d.clip;
      if (c) shape.push(c.x * PX, (c.y + offset) * PX, c.w * PX, c.h * PX);
    }
    const same =
      !this.dirty && !changing && shape.length === this.drawn.length && shape.every((v, i) => Math.abs(v - this.drawn[i]!) <= STILL);
    if (shown.length && !same) {
      const r = this.renderer;
      r.setScissorTest(false);
      r.clear();
      // Each device gets its own pass, lit for the room it sits in (less
      // daylight at night, and the seam carries it), so two dials on screen at
      // a section's edge never share the wrong light. A close-up also stays
      // inside its box.
      const tall = this.tall;
      for (const d of shown) {
        for (const o of shown) o.outer.visible = o === d;
        this.lights.apply(this.scene, d.night);
        if (d.clip) {
          r.setScissorTest(true);
          r.setScissor(d.clip.x, tall - (d.clip.y + offset) - d.clip.h, d.clip.w, d.clip.h);
        } else r.setScissorTest(false);
        r.render(this.scene, this.camera);
        if (d.clip?.radii) {
          // Still inside the scissor: round the box's corners off.
          const pr = r.getPixelRatio();
          const c = d.clip;
          this.cornerMat.uniforms.uRect!.value.set(c.x * pr, (tall - (c.y + offset) - c.h) * pr, c.w * pr, c.h * pr);
          this.cornerMat.uniforms.uRadii!.value.copy(c.radii).multiplyScalar(pr);
          r.render(this.corners, this.camera);
        }
      }
      for (const o of shown) o.outer.visible = true;
      r.setScissorTest(false);
      this.cleared = false;
      this.dirty = false;
      this.drawn = shape.slice();
    } else if (!shown.length && !this.cleared) {
      this.renderer.setScissorTest(false);
      this.renderer.clear();
      this.cleared = true;
      this.dirty = false;
      this.drawn = [];
    }
    this.onFrame?.();
  }

  dispose() {
    this.stop();
    this.watch.disconnect();
    const seen = new Set<Material>();
    for (const scene of [this.scene, this.corners]) {
      scene.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) seen.add(m);
        }
      });
    }
    seen.forEach((m) => m.dispose());
    Object.values(this.textures).forEach((t) => t.dispose());
    this.kit.dispose();
    this.environment?.dispose();
    this.renderer.dispose();
  }
}
