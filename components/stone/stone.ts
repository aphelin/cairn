// The stone, in real 3D. One fixed, transparent canvas covers the viewport and
// draws every stone on the page. Each stone follows a chain of anchor elements
// in the layout: it sits exactly in an anchor while that anchor is centred on
// screen, and glides to the next anchor as the page scrolls between them.
// The surface is procedural: cast-stone mottling, speckle and the engraved
// cairn mark are computed in object space, so nothing stretches at the poles.

import {
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  type BufferGeometry,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type Model = "pocket" | "home";

// Half-extents of each pebble before the base is flattened.
const SHAPE: Record<Model, [number, number, number]> = {
  pocket: [1.28, 0.56, 1.0],
  home: [1.12, 0.76, 1.04],
};
const BASE = 0.6; // the underside is squashed to this fraction, so it sits

type Stone = {
  id: string;
  model: Model;
  anchors: HTMLElement[];
  outer: Group; // position, scale and the view tilt
  inner: Group; // spin and squash
  material: MeshPhysicalMaterial;
  spin: number;
  squash: number; // 0 at rest; a contact sets it and it springs back
  squashV: number;
  visible: boolean;
};

function pebble(model: Model): BufferGeometry {
  const g = new SphereGeometry(1, 160, 112);
  const pos = g.attributes.position!;
  const [sx, sy, sz] = SHAPE[model];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // A gentle, asymmetric wobble so it reads as found, not machined.
    const r = 1 + 0.034 * Math.sin(3.1 * x + 1.3 * z + 0.4) + 0.022 * Math.sin(5.3 * z - 2.1 * x + 0.7) + 0.015 * Math.sin(4.1 * y + 2.2 * x);
    const egg = 1 + 0.06 * x;
    const Y = y * sy * r;
    pos.setXYZ(i, x * sx * r * egg, Y < 0 ? Y * BASE : Y, z * sz * r);
  }
  g.computeVertexNormals();
  return g;
}

// The cairn mark: three stacked stones, drawn once for the engraving.
function markTexture(): CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  const s = size / 24;
  for (const [cx, cy, rx, ry] of [
    [12, 18, 8, 3.4],
    [12.4, 11.7, 5.7, 2.8],
    [11.7, 6.4, 3.5, 2.2],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(cx * s, cy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function shadowTexture(): CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.55, "rgba(0,0,0,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}

function stoneMaterial(hex: string, mark: CanvasTexture): MeshPhysicalMaterial {
  const m = new MeshPhysicalMaterial({
    color: new Color(hex),
    roughness: 0.74,
    metalness: 0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.55,
    sheen: 0.25,
    sheenRoughness: 0.8,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uMark = { value: mark };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObj;\nvarying vec3 vObjN;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;\nvObjN = normal;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vObj;
varying vec3 vObjN;
uniform sampler2D uMark;
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float markAt(vec2 uv) { return texture2D(uMark, uv).r; }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float mottle = vn(vObj * 2.3) * 0.6 + vn(vObj * 7.0) * 0.4;
float dark = smoothstep(0.8, 0.86, vn(vObj * 92.0));
float light = smoothstep(0.83, 0.88, vn(vObj * 71.0 + 13.0));
diffuseColor.rgb *= 0.9 + 0.16 * mottle;
diffuseColor.rgb *= 1.0 - 0.3 * dark;
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.91, 0.86), 0.28 * light);
// The engraved mark sits on the crown; the offset sample fakes its cut edge.
float top = smoothstep(0.55, 0.85, normalize(vObjN).y);
vec2 muv = vec2(vObj.x, -vObj.z) * 1.55 + 0.5;
float inside = step(0.0, muv.x) * step(muv.x, 1.0) * step(0.0, muv.y) * step(muv.y, 1.0);
float cut = markAt(muv) * inside * top;
float edge = (markAt(muv + vec2(0.012, 0.012)) * inside * top) - cut;
diffuseColor.rgb *= 1.0 - 0.3 * cut;
diffuseColor.rgb *= 1.0 + 0.35 * clamp(edge, 0.0, 1.0) - 0.25 * clamp(-edge, 0.0, 1.0);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + 0.12 * dark - 0.08 * mottle + 0.1 * cut, 0.0, 1.0);`,
      );
  };
  return m;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export class StoneStage {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new OrthographicCamera(0, 1, 0, -1, -4000, 4000);
  private stones: Stone[] = [];
  private mark = markTexture();
  private shadow = shadowTexture();
  private raf = 0;
  private last = 0;
  private pointer = new Vector2(0, 0);
  private pointerTarget = new Vector2(0, 0);
  private colourFrom = new Color();
  private colourTo = new Color();
  private colourT = 1;
  private frozen: boolean;
  private onFrame?: () => void;

  constructor(private canvas: HTMLCanvasElement, colour: string) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.42;
    pmrem.dispose();

    const key = new DirectionalLight(0xfff6e8, 1.7);
    key.position.set(-0.6, 1.4, 1.1);
    const rim = new DirectionalLight(0xdfe8ff, 0.7);
    rim.position.set(1.2, 0.4, -0.8);
    this.scene.add(key, rim, new HemisphereLight(0xffffff, 0x3a3326, 0.35));

    this.colourTo.set(colour);
    this.colourFrom.copy(this.colourTo);
    this.frozen = document.documentElement.hasAttribute("data-stone-freeze");
    this.resize();
  }

  add(id: string, model: Model, anchors: HTMLElement[]) {
    const outer = new Group();
    const inner = new Group();
    const material = stoneMaterial(`#${this.colourTo.getHexString()}`, this.mark);
    const mesh = new Mesh(pebble(model), material);
    inner.add(mesh);

    const [sx, , sz] = SHAPE[model];
    const shadow = new Mesh(
      new PlaneGeometry(sx * 2.25, sz * 2.05),
      new MeshBasicMaterial({ map: this.shadow, transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -SHAPE[model][1] * BASE - 0.02;
    shadow.renderOrder = -1;
    outer.add(shadow, inner);
    outer.rotation.x = 0.46; // seen from a little above, the way it sits on a table
    this.scene.add(outer);
    this.stones.push({ id, model, anchors, outer, inner, material, spin: 0, squash: 0, squashV: 0, visible: false });
  }

  setColour(hex: string) {
    this.colourFrom.copy(this.stones[0]?.material.color ?? this.colourTo);
    this.colourTo.set(hex);
    this.colourT = 0;
  }

  // The phone touched the stone: a short squash that springs back.
  bump(id: string) {
    const stone = this.stones.find((s) => s.id === id);
    if (stone) stone.squashV = -2.6;
  }

  setPointer(x: number, y: number) {
    this.pointerTarget.set(x, y);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.camera.left = 0;
    this.camera.right = w;
    this.camera.top = 0;
    this.camera.bottom = -h;
    this.camera.updateProjectionMatrix();
  }

  start(onFrame?: () => void) {
    this.onFrame = onFrame;
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      this.frame(Math.min(0.05, (now - this.last) / 1000));
      this.last = now;
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  // Renders once, synchronously; used to hand over from the still images.
  renderNow() {
    this.frame(0);
  }

  private place(stone: Stone): boolean {
    const vh = window.innerHeight;
    const centre = vh / 2;
    const rects = stone.anchors.map((a) => a.getBoundingClientRect()).filter((r) => r.width > 0);
    if (!rects.length) return false;
    // Find the pair of anchors the viewport centre sits between.
    let a = rects[0]!;
    let b = rects[0]!;
    let t = 0;
    const mid = (r: DOMRect) => r.top + r.height / 2;
    if (centre >= mid(rects[rects.length - 1]!)) {
      a = b = rects[rects.length - 1]!;
    } else {
      for (let i = 0; i < rects.length - 1; i++) {
        const ra = rects[i]!;
        const rb = rects[i + 1]!;
        if (centre < mid(ra)) break;
        if (centre < mid(rb)) {
          a = ra;
          b = rb;
          t = smooth(clamp01((centre - mid(ra)) / (mid(rb) - mid(ra))));
          break;
        }
      }
    }
    const x = a.left + a.width / 2 + (b.left + b.width / 2 - (a.left + a.width / 2)) * t;
    const y = mid(a) + (mid(b) - mid(a)) * t;
    const w = a.width + (b.width - a.width) * t;
    const onScreen = y + w > -40 && y - w < vh + 40;
    stone.outer.visible = onScreen;
    if (!onScreen) return false;
    const [sx] = SHAPE[stone.model];
    const scale = w / (sx * 2 * 1.16);
    stone.outer.position.set(x, -y, 0);
    stone.outer.scale.setScalar(scale);
    return true;
  }

  private frame(dt: number) {
    this.pointer.lerp(this.pointerTarget, 1 - Math.exp(-dt * 4));
    if (this.colourT < 1) {
      this.colourT = Math.min(1, this.colourT + dt / 0.6);
      const c = this.colourFrom.clone().lerp(this.colourTo, smooth(this.colourT));
      for (const s of this.stones) s.material.color.copy(c);
    }
    let any = false;
    for (const s of this.stones) {
      s.visible = this.place(s);
      if (!s.visible) continue;
      any = true;
      if (!this.frozen) s.spin += dt * 0.12;
      // Spring the squash back to rest.
      s.squashV += (-s.squash * 90 - s.squashV * 9) * dt;
      s.squash += s.squashV * dt;
      const sq = Math.max(-0.2, Math.min(0.2, s.squash * 0.25));
      s.inner.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
      s.inner.rotation.y = s.spin + this.pointer.x * 0.35;
      s.outer.rotation.x = 0.46 + this.pointer.y * 0.12;
    }
    if (any || this.colourT < 1) this.renderer.render(this.scene, this.camera);
    else this.renderer.clear();
    this.onFrame?.();
  }

  dispose() {
    this.stop();
    for (const s of this.stones) {
      s.material.dispose();
      s.outer.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          if (o.material !== s.material) (o.material as MeshBasicMaterial).dispose();
        }
      });
    }
    this.mark.dispose();
    this.shadow.dispose();
    this.renderer.dispose();
  }
}
