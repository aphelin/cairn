// The devices' materials, in one place, so every scene that draws Cairn Home
// or Cairn Pocket (the page's device canvas, or a section with a canvas of its
// own) shows the same metal.
//
// Both are turned from titanium. A lathe leaves fine concentric lines, which
// scatter light along the profile and not round it: highlights stretch into
// long, soft streaks down the walls and radially across the flat faces, the
// way they do on a machined watch case. That's anisotropy, with the turn as
// the direction, and a very fine line map that shows as brushed sheen up
// close and averages away at a distance. The edge breaks are polished, so
// they carry a thin bright line. Nothing is lacquered: the finish is the
// metal (or, for Sage and Chalk, a thin coat on it), not a coat of gloss.
//
// Geometry from ./geometry carries what these materials read: a tangent for
// the turn, UVs along the profile, and a `polish` weight on the edge breaks.

import {
  CanvasTexture,
  Color,
  DataTexture,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderChunk,
  Vector2,
  type Material,
  type MeshStandardMaterial,
  type WebGLProgramParametersWithUniforms,
} from "three";
import type { FinishId } from "@/lib/content";
import { POCKET, ceramicButton, disc, pocketKnurl, pocketPad, pocketRings } from "./geometry";

// ——— Finishes ———

// Each finish as the renderer sees it. `tint` is the metal's own colour (its
// reflectance), `roughness` is across the turning lines, and `anisotropy` is
// how far the turning stretches a highlight along the profile. Graphite and
// Natural are bare metal; Sage and Chalk are a thin coloured coat over the
// same turned titanium (`coat`), so they keep some colour of their own (lower
// metalness) and the turned sheen still shows through. On a coated finish
// the polished edge breaks are cut after coating, through to the bare metal,
// so they show as thin lines of natural titanium, the way a diamond-cut
// chamfer does on a coloured phone.
export type Finish = { tint: string; metalness: number; roughness: number; anisotropy: number; coat: boolean };
export const FINISH: Record<FinishId, Finish> = {
  night: { tint: "#74757b", metalness: 1, roughness: 0.36, anisotropy: 0.6, coat: false },
  silver: { tint: "#bcbab5", metalness: 1, roughness: 0.28, anisotropy: 0.72, coat: false },
  sage: { tint: "#8c9689", metalness: 0.72, roughness: 0.34, anisotropy: 0.6, coat: true },
  chalk: { tint: "#dcd8cf", metalness: 0.5, roughness: 0.38, anisotropy: 0.55, coat: true },
};
const finishOf = (id: string) => FINISH[id as FinishId] ?? FINISH.night;

// A polished edge break: smooth enough to hold a crisp reflection.
const EDGE_ROUGHNESS = 0.1;
// How deep the turning lines read in the normal map.
const TURNED_RELIEF = 0.32;
// The knurl's cut flanks are a little less fine than the turned faces, so
// each ridge carries a soft line of light rather than a hard white one.
const KNURL_ROUGHER = 0.06;

// ——— Shader patches ———

// Materials here are extended with small shader patches. Each patch is named,
// and the program cache key is the list of names, so two materials share a
// compiled program only when they carry the same patches (three's default
// key is the text of onBeforeCompile, which a wrapper would make identical
// for every patched material).
type Patch = (shader: WebGLProgramParametersWithUniforms) => void;
export function patchShader(m: Material, name: string, patch: Patch) {
  const previous = m.onBeforeCompile;
  const names = [...((m.userData.patches as string[] | undefined) ?? []), name];
  m.userData.patches = names;
  m.onBeforeCompile = (shader, renderer) => {
    previous.call(m, shader, renderer);
    patch(shader);
  };
  const key = names.join("+");
  m.customProgramCacheKey = () => key;
}

// A part picked out in an exploded view: `lift` (0 to 1) brightens it and
// adds a thin neutral rim of light round its silhouette; `dim` (1 is none)
// turns the rest down. Brightening multiplies, so the metal keeps its
// contrast and faces seen edge-on don't wash out.
export type Highlight = { lift: { value: number }; dim: { value: number } };
export const newHighlight = (): Highlight => ({ lift: { value: 0 }, dim: { value: 1 } });

export function highlightable(m: MeshStandardMaterial, h: Highlight) {
  patchShader(m, "highlight", (shader) => {
    shader.uniforms.uLift = h.lift;
    shader.uniforms.uDim = h.dim;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uLift;\nuniform float uDim;")
      .replace(
        "#include <opaque_fragment>",
        `float hlRim = pow(1.0 - saturate(dot(normal, geometryViewDir)), 5.0);
        outgoingLight = outgoingLight * uDim * (1.0 + 0.55 * uLift) + uLift * (0.02 + 0.8 * hlRim) * vec3(0.93, 0.95, 1.0);
        #include <opaque_fragment>`,
      );
  });
}

// ——— Textures ———

// The turning lines, as a normal map that varies along the profile only.
// A tile spans 48 mm of profile in 2048 texels, so one texel is 0.023 mm.
// Several octaves of smooth noise, from hairlines 0.07 mm wide to slow swells
// a millimetre across, so up close it reads as brushed sheen with no repeat
// or rhythm to catch the eye, and from further away the mipmaps average it
// into an even satin.
function turnedTexture(): DataTexture {
  const n = 2048;
  const h = new Float32Array(n);
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [step, amp] of [
    [3, 0.45],
    [7, 0.8],
    [17, 0.55],
    [47, 0.3],
  ] as const) {
    const knots = Math.round(n / step);
    const k = Array.from({ length: knots }, rand);
    for (let i = 0; i < n; i++) {
      const f = (i / n) * knots;
      const a = Math.floor(f);
      const t = f - a;
      const s = t * t * (3 - 2 * t);
      h[i] = h[i]! + amp * (k[a % knots]! + (k[(a + 1) % knots]! - k[a % knots]!) * s);
    }
  }
  const slope = Array.from({ length: n }, (_, i) => (h[(i + 1) % n]! - h[(i - 1 + n) % n]!) / 2);
  const rms = Math.sqrt(slope.reduce((a, s) => a + s * s, 0) / n) || 1;
  const width = 4;
  const data = new Uint8Array(width * n * 4);
  const byte = (x: number) => Math.round((x * 0.5 + 0.5) * 255);
  for (let y = 0; y < n; y++) {
    const s = (slope[y]! / rms) * 0.5;
    const len = Math.hypot(s, 1);
    for (let x = 0; x < width; x++) data.set([128, byte(-s / len), byte(1 / len), 255], (y * width + x) * 4);
  }
  const t = new DataTexture(data, width, n, RGBAFormat);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = NoColorSpace;
  t.needsUpdate = true;
  return t;
}

// The knurl's ridges live in these maps, one ridge to each unit of u, not in
// the mesh: cut into the mesh, each flat flank caught one light or none, so
// the ridges lit in clumps, and where they crowd together toward the sides
// they aliased. Mapped, every ridge has a rounded profile that finds some
// light, and the mipmaps average the ridges away as they get too fine to draw.
// One ridge is 32 texels across: the groove at the edges, the crest in the
// middle.
const RIDGE = 32;
function ridgeMap(texel: (u: number) => [number, number, number]) {
  const data = new Uint8Array(RIDGE * 4 * 4);
  for (let x = 0; x < RIDGE; x++) {
    const [r, g, b] = texel((x + 0.5) / RIDGE);
    for (let y = 0; y < 4; y++) data.set([r, g, b, 255], (y * RIDGE + x) * 4);
  }
  const t = new DataTexture(data, RIDGE, 4, RGBAFormat);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = NoColorSpace;
  t.needsUpdate = true;
  return t;
}

// The flanks lean up to 38°, rounded over at crest and groove, so the normals
// sweep through every angle between and each ridge carries a line of light.
function knurlNormal() {
  const lean = Math.tan((38 * Math.PI) / 180);
  return ridgeMap((u) => {
    const s = Math.sin(u * Math.PI * 2);
    const slope = lean * Math.sign(s) * Math.pow(Math.abs(s), 0.6); // rising to the crest, then falling
    const len = Math.hypot(slope, 1);
    const byte = (n: number) => Math.round((n * 0.5 + 0.5) * 255);
    return [byte(-slope / len), 128, byte(1 / len)];
  });
}

// The groove floor dark and the crest bright, a little wider than the relief
// alone would make them, so the ribbing reads evenly by colour alone when the
// relief has faded at small sizes.
function knurlCavity() {
  return ridgeMap((u) => {
    const d = Math.min(u, 1 - u) / 0.17;
    const v = Math.round((1 - 0.68 * Math.exp(-d * d)) * 255);
    return [v, v, v];
  });
}

// The tap mark engraved on Pocket's face: a dot and three arcs, drawn once.
function tapMarkTexture(): CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.strokeStyle = "rgba(60,60,64,0.9)";
  ctx.fillStyle = "rgba(60,60,64,0.9)";
  ctx.lineCap = "round";
  ctx.lineWidth = 11;
  const cx = size * 0.34;
  const cy = size / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 11, 0, Math.PI * 2);
  ctx.fill();
  for (const r of [42, 72, 102]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 4, Math.PI / 4);
    ctx.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// ——— The kit ———

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// `cut` is 1 where the polished edges show bare metal through a coat.
type Surface = { colour: Color; metalness: number; roughness: number; anisotropy: number; cut: number };
const surfaceOf = (f: Finish): Surface => ({
  colour: new Color(f.tint),
  metalness: f.metalness,
  roughness: f.roughness,
  anisotropy: f.anisotropy,
  cut: f.coat ? 1 : 0,
});
// The bare metal under a coat: natural titanium.
const BARE = new Color(FINISH.silver.tint);

// Makes the devices' materials and keeps every metal one in the current
// finish, easing all of them together when it changes. One kit per renderer:
// its textures are uploaded to that renderer's context.
export class DeviceMaterials {
  readonly textures = {
    turned: turnedTexture(),
    knurl: knurlNormal(),
    cavity: knurlCavity(),
    tap: tapMarkTexture(),
  };
  private turned: MeshPhysicalMaterial[] = [];
  private knurls: MeshPhysicalMaterial[] = [];
  // Shared by every turned material, eased with the finish.
  private cut = { value: 0 };
  private from: Surface;
  private to: Surface;
  private now: Surface;
  private t = 1;
  private id: FinishId;

  // `anisotropy` is the renderer's texture filtering limit
  // (renderer.capabilities.getMaxAnisotropy()); it keeps the lines and the
  // ridges clean where they crowd together at grazing angles.
  constructor(finish: FinishId, { anisotropy = 8 }: { anisotropy?: number } = {}) {
    this.id = finish;
    this.to = surfaceOf(finishOf(finish));
    this.from = surfaceOf(finishOf(finish));
    this.now = surfaceOf(finishOf(finish));
    this.cut.value = this.now.cut;
    const filter = Math.min(8, anisotropy);
    this.textures.turned.anisotropy = this.textures.knurl.anisotropy = this.textures.cavity.anisotropy = filter;
  }

  get finish(): FinishId {
    return this.id;
  }

  // Turned titanium, for every turned part of the body and crown. Where the
  // geometry marks an edge break (`polish` = 1), it's polished instead: no
  // lines, no stretch, and a much smoother surface; on a coated finish, it's
  // bare titanium too.
  titanium(): MeshPhysicalMaterial {
    const s = this.now;
    const m = new MeshPhysicalMaterial({
      color: s.colour.clone(),
      metalness: s.metalness,
      roughness: s.roughness,
      normalMap: this.textures.turned,
      normalScale: new Vector2(TURNED_RELIEF, TURNED_RELIEF),
      anisotropy: s.anisotropy,
      // Along the profile, across the lines, is where they scatter light.
      anisotropyRotation: Math.PI / 2,
    });
    const polish = { value: 0 };
    const edge = { value: EDGE_ROUGHNESS };
    patchShader(m, "turned", (shader) => {
      shader.uniforms.uPolish = polish;
      shader.uniforms.uEdgeRoughness = edge;
      shader.uniforms.uCut = this.cut;
      shader.uniforms.uBare = { value: BARE };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float polish;\nvarying float vPolish;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPolish = polish;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vPolish;\nuniform float uPolish;\nuniform float uEdgeRoughness;\nuniform float uCut;\nuniform vec3 uBare;")
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
          float polish = max(vPolish, uPolish);
          roughnessFactor = mix(roughnessFactor, uEdgeRoughness, polish);
          float bare = polish * uCut;
          diffuseColor.rgb = mix(diffuseColor.rgb, uBare, bare);`,
        )
        .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 1.0, bare);")
        // The includes aren't expanded yet: expand these two, then edit them.
        .replace("#include <normal_fragment_maps>", ShaderChunk.normal_fragment_maps.replace("mapN.xy *= normalScale;", "mapN.xy *= normalScale * (1.0 - polish);"))
        .replace(
          "#include <lights_physical_fragment>",
          ShaderChunk.lights_physical_fragment.replace("material.anisotropy = length( anisotropyV );", "material.anisotropy = length( anisotropyV ) * (1.0 - polish);"),
        );
    });
    m.userData.polish = polish;
    this.turned.push(m);
    return m;
  }

  // Polished titanium all over, for a part that is nothing but an edge.
  polished(): MeshPhysicalMaterial {
    const m = this.titanium();
    (m.userData.polish as { value: number }).value = 1;
    return m;
  }

  // The knurl: the same metal, its ridges in the normal map and its grooves
  // darkened by the cavity map. Knurling cuts through the turning, so it has
  // no lines of its own.
  knurled(): MeshPhysicalMaterial {
    const s = this.now;
    const m = new MeshPhysicalMaterial({
      color: s.colour.clone(),
      metalness: s.metalness,
      roughness: s.roughness + KNURL_ROUGHER,
      map: this.textures.cavity,
      normalMap: this.textures.knurl,
    });
    // Ridges only a few pixels wide can't carry their own highlights: the
    // light flicks between flanks inside a pixel and breaks into uneven bars.
    // So the relief fades out as a ridge (one unit of u) narrows from about
    // 12 pixels to 5, and the groove shading, which is plain colour and
    // filters cleanly, carries the ribbing at hero size. It only gives way to
    // even satin once a ridge is under about 2 pixels.
    patchShader(m, "knurl", (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <map_fragment>",
          `float ridgeRate = fwidth(vMapUv.x);
          float knurlFade = 1.0 - smoothstep(0.08, 0.2, ridgeRate);
          float grooveFade = 1.0 - smoothstep(0.45, 0.7, ridgeRate);
          #ifdef USE_MAP
            vec4 sampledDiffuseColor = mix(vec4(vec3(0.84), 1.0), texture2D(map, vMapUv), grooveFade);
            diffuseColor *= sampledDiffuseColor;
          #endif`,
        )
        .replace("#include <normal_fragment_maps>", ShaderChunk.normal_fragment_maps.replace("mapN.xy *= normalScale;", "mapN.xy *= normalScale * knurlFade;"));
    });
    this.knurls.push(m);
    return m;
  }

  // The white ceramic top: a neutral glaze, satin rather than gloss. Its
  // emissive (white, off by default) lets a scene lift it at night.
  ceramic(): MeshPhysicalMaterial {
    return new MeshPhysicalMaterial({
      color: new Color("#e9ebee"),
      roughness: 0.58,
      metalness: 0,
      clearcoat: 0.2,
      clearcoatRoughness: 0.5,
      emissive: new Color("#ffffff"),
      emissiveIntensity: 0,
    });
  }

  // The micro-suction pad: matte and a little soft-looking, a step darker
  // than the body so it reads as its own part.
  pad(): MeshPhysicalMaterial {
    return new MeshPhysicalMaterial({ color: new Color("#1d1d20"), roughness: 0.9, metalness: 0, sheen: 0.5, sheenColor: new Color("#5a5a60") });
  }

  // Pocket's engraved tap mark, a decal just over its ceramic face.
  tapMark(): MeshBasicMaterial {
    return new MeshBasicMaterial({ map: this.textures.tap, transparent: true, depthWrite: false });
  }

  // Changes the finish. Every metal material eases to it over 0.7 s as
  // update() is called, or lands at once with `instant`.
  setFinish(id: FinishId, instant = false) {
    this.from = { ...this.now, colour: this.now.colour.clone() };
    this.to = surfaceOf(finishOf(id));
    this.id = id;
    this.t = instant ? 0.999 : 0;
  }

  // Advances a finish change by `dt` seconds. Returns true while one is in
  // progress, so a scene knows to keep drawing.
  update(dt: number): boolean {
    if (this.t >= 1) return false;
    this.t = Math.min(1, this.t + dt / 0.7);
    const e = smooth(this.t);
    const s = this.now;
    s.colour.copy(this.from.colour).lerp(this.to.colour, e);
    s.metalness = mix(this.from.metalness, this.to.metalness, e);
    s.roughness = mix(this.from.roughness, this.to.roughness, e);
    s.anisotropy = mix(this.from.anisotropy, this.to.anisotropy, e);
    s.cut = mix(this.from.cut, this.to.cut, e);
    this.cut.value = s.cut;
    for (const m of this.turned) {
      m.color.copy(s.colour);
      m.metalness = s.metalness;
      m.roughness = s.roughness;
      m.anisotropy = s.anisotropy;
    }
    for (const m of this.knurls) {
      m.color.copy(s.colour);
      m.metalness = s.metalness;
      m.roughness = s.roughness + KNURL_ROUGHER;
    }
    return true;
  }

  // The textures. Materials are disposed with the scene that holds them.
  dispose() {
    Object.values(this.textures).forEach((t) => t.dispose());
  }
}

// ——— Cairn Pocket, assembled ———

// Pocket as one group, base on y = 0, ceramic face up, 56 across and 14 tall
// in millimetres: its pad, its turned rings, the knurl, the ceramic and the
// tap mark. The ceramic's material is returned too, for scenes that lift it
// at night.
export function pocketModel(kit: DeviceMaterials): { group: Group; ceramic: MeshPhysicalMaterial } {
  const group = new Group();
  const body = kit.titanium();
  const ceramic = kit.ceramic();
  const rings = pocketRings();
  group.add(
    new Mesh(pocketPad(), kit.pad()),
    new Mesh(rings.bottom, body),
    new Mesh(pocketKnurl(), kit.knurled()),
    new Mesh(rings.top, body),
    new Mesh(ceramicButton(POCKET.capR, POCKET.capY, 0.24), ceramic),
  );
  const mark = new Mesh(disc(7.5), kit.tapMark());
  mark.position.y = POCKET.capY + 0.26;
  group.add(mark);
  return { group, ceramic };
}
