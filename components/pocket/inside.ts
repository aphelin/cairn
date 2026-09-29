// Cairn Pocket as the parts it's made of, for its story: assembled it looks
// exactly as the shared model does (components/dial/materials.ts, pocketModel),
// and in the "No battery" beat it comes apart along its axis, the way it
// would come apart on a bench. From the face down:
//
//   the white ceramic top, with its tap mark (the field passes through it);
//   the NFC inlay: a thin black flex board with a finely etched copper
//     antenna, eleven turns with a jog and a bridge across them, and the tag
//     chip at its heart, which the phone's field powers (so no battery);
//   the ferrite sheet, which sits behind the antenna and keeps the titanium
//     (and a steel door, if that's where it's stuck) from swallowing the field;
//   the knurled titanium body, turned from solid, with a shallow pocket
//     machined into its face for the parts above;
//   and the micro-suction pad, which peels away and tips its face of
//     micro-cells (the side that sticks) toward the camera.
//
// Millimetres, base on y = 0, face up, like the shared model. The small
// electronics are drawn by one shader patch (see `electronics`), so the
// board's traces are resolved at any size without a texture to paint or
// upload, and every part of the inlay shares one compiled program.

import {
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
  type Material,
  type MeshPhysicalMaterial,
} from "three";
import { POCKET, disc, pocketKnurl, pocketPad, pocketRings } from "@/components/dial/geometry";
import { patchShader, type DeviceMaterials } from "@/components/dial/materials";

// ——— Where the parts sit, and where they go ———

// The pocket machined into the body's face, and the parts that sit in it.
const FLOOR = 9;
const FERRITE = { r: 20.5, t: 0.6 };
const BOARD = { r: 20.3, t: 0.3 };
const CHIP = { w: 3, h: 2.3, t: 0.55 };
const CERAMIC_BASE = 10.6;

// How far each part travels along the axis (mm) when Pocket is fully apart.
// The inlay gets the most room either side: it's what the beat is about.
const APART = { ceramic: 66, board: 41, ferrite: 20, shell: 0, pad: -30 };
// Each part starts a little after the one above it and lands a little after
// it too, so it comes apart in order rather than all at once.
const LAG = { ceramic: 0, board: 0.12, ferrite: 0.24, shell: 0, pad: 0.36 };
// While apart, the parts turn slowly about their own axis, each one way
// through the hold (up to this many radians either side of where it sits).
// The turn is scaled by how far apart the part is, so Pocket goes back
// together exactly as it came apart.
const TURN = { ceramic: 0.3, board: -0.42, ferrite: 0.18, shell: 0, pad: 0 };
// The pad, as it peels away, tips its sticky face toward the camera (radians)
// and slides out from under the body toward it (mm), so its cells are seen.
const PEEL = { tip: 1.25, slide: 12 };

type PartKey = keyof typeof APART;

// The middle of the stack along the axis, closed and fully apart, so a
// camera can stay centred on it as it opens.
const TOP = POCKET.capY + 0.24;
const MID = { closed: POCKET.h / 2, open: (TOP + APART.ceramic + APART.pad) / 2 };
// The board's face, closed.
const BOARD_Y = FLOOR + FERRITE.t + BOARD.t;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ——— Geometry ———

// Turned parts, as components/dial/geometry.ts makes them: UVs round and
// along the profile, a tangent for the turn, and a `polish` weight on the
// edge breaks, which the turned-titanium material reads.
type P = [number, number, number?];
function lathe(points: P[], segments = 160) {
  const g = new LatheGeometry(
    points.map(([r, y]) => new Vector2(r, y)),
    segments,
  );
  const along = [points[0]![1]];
  for (let j = 1; j < points.length; j++) {
    const [r0, y0] = points[j - 1]!;
    const [r1, y1] = points[j]!;
    along.push(along[j - 1]! + Math.hypot(r1 - r0, y1 - y0));
  }
  const uv = g.attributes.uv!;
  const tangent: number[] = [];
  const polish: number[] = [];
  for (let i = 0; i < uv.count; i++) {
    const j = i % points.length;
    const phi = uv.getX(i) * Math.PI * 2;
    uv.setY(i, along[j]! / 48);
    tangent.push(Math.cos(phi), 0, -Math.sin(phi), 1);
    polish.push(points[j]![2] ?? 0);
  }
  g.setAttribute("tangent", new Float32BufferAttribute(tangent, 4));
  g.setAttribute("polish", new Float32BufferAttribute(polish, 1));
  return g;
}

const arc = (cr: number, cy: number, rad: number, a0: number, a1: number, steps = 6): P[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return [cr + Math.cos(a) * rad, cy + Math.sin(a) * rad];
  });

// The ceramic top: the shared model's glazed face and rounded rim, on a
// real 2.5 mm body with a shoulder underneath that seats it in the titanium.
function ceramicTop() {
  const R = POCKET.capR;
  const y = POCKET.capY;
  const dome = 0.24;
  return lathe(
    [
      [0, CERAMIC_BASE],
      [20.2, CERAMIC_BASE],
      [20.42, CERAMIC_BASE + 0.08],
      [20.5, CERAMIC_BASE + 0.3],
      [20.5, 12.45],
      [20.6, 12.6],
      [R, 12.6],
      [R, y - 0.25],
      [R - 0.12, y],
      [R - 0.45, y + dome * 0.55],
      [R - 1.2, y + dome * 0.85],
      [R * 0.6, y + dome],
      [0, y + dome],
    ],
    128,
  );
}

// The pocket in the body's face: its wall drops from the ceramic's seat
// and rolls onto a flat, turned floor.
function cavity() {
  return lathe([[21, 12.6, 1], [21, FLOOR + 0.6], ...arc(20.4, FLOOR + 0.6, 0.6, 0, -Math.PI / 2), [0, FLOOR]], 160);
}

// A thin round plate, face up at y = t: its face and its edge, with UVs laid
// flat across both (the edge takes its rim's), so a flat pattern runs over.
function plate(radius: number, t: number, segments = 96): BufferGeometry[] {
  const face = new CircleGeometry(radius, segments).rotateX(-Math.PI / 2).translate(0, t, 0);
  const edge = new CylinderGeometry(radius, radius, t, segments, 1, true).translate(0, t / 2, 0);
  const pos = edge.attributes.position!;
  const uv = edge.attributes.uv!;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (2 * radius) + 0.5, -pos.getZ(i) / (2 * radius) + 0.5);
  return [face, edge];
}

function roundedRect(w: number, h: number, r: number) {
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

// The tag chip: a small moulded package with softened edges, standing on
// the board. Its top face's UVs are its own plane in millimetres.
function chipBody() {
  const bevel = 0.07;
  return new ExtrudeGeometry(roundedRect(CHIP.w - bevel * 2, CHIP.h - bevel * 2, 0.12), {
    depth: CHIP.t - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  })
    .translate(0, 0, bevel)
    .rotateX(-Math.PI / 2);
}

// The bridge: a copper strap that climbs over the antenna's turns on an
// insulating film, joining its outer end to the chip. `span` is its length.
function bridge(span: number) {
  const rise = 0.1;
  const t = 0.07;
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(0.35, rise);
  s.lineTo(span - 0.35, rise);
  s.lineTo(span, 0);
  s.lineTo(span, t);
  s.lineTo(span - 0.33, rise + t);
  s.lineTo(0.33, rise + t);
  s.lineTo(0, t);
  s.closePath();
  return new ExtrudeGeometry(s, { depth: 0.62, bevelEnabled: false }).translate(-span / 2, 0, -0.31);
}

// ——— The electronics' surfaces ———

// Which surface a part of the inlay is. One program draws them all.
const KIND = { board: 0, ferrite: 1, chip: 2, copper: 3, epoxy: 4 } as const;

// The antenna, in the board's plane (mm): eleven turns of 0.38 mm copper on
// a 0.62 mm pitch, following a rounded square; its outer end and inner end
// meet at a short jog on the left, where each turn steps in by one.
const GLSL = /* glsl */ `
  uniform float uKind;
  uniform vec3 uBenchDir;
  uniform float uBench;
  uniform float uSweep;
  varying vec2 vPart;
  varying vec3 vPartX;
  varying vec3 vPartY;
  varying float vFace;

  const float PITCH = 0.62;
  const float TURNS = 11.0;
  const float A0 = 15.6;
  const float R0 = 7.6;
  const float HALF = 0.19;
  const float JOG = 1.2;
  const float CU_H = 0.06; // copper relief, a little proud for the light to find

  const vec3 SUBSTRATE = vec3(0.012, 0.0115, 0.011);
  const vec3 COPPER = vec3(0.96, 0.62, 0.36);
  const vec3 GOLD = vec3(1.0, 0.77, 0.37);
  const vec3 FILM = vec3(0.13, 0.058, 0.014);
  const vec3 EPOXY = vec3(0.016, 0.016, 0.018);
  const vec3 MARK = vec3(0.075, 0.075, 0.08);
  const vec3 FERRITE_TONE = vec3(0.034, 0.034, 0.036);

  // Distance fields that carry their gradient: (distance, d/dx, d/dy).
  vec3 sdBoxG(vec2 p, vec2 h, float r) {
    vec2 q = abs(p) - h + r;
    vec2 s = vec2(p.x < 0.0 ? -1.0 : 1.0, p.y < 0.0 ? -1.0 : 1.0);
    if (q.x > 0.0 && q.y > 0.0) {
      float l = length(q);
      return vec3(l - r, s * q / l);
    }
    return q.x > q.y ? vec3(q.x - r, s.x, 0.0) : vec3(q.y - r, 0.0, s.y);
  }
  vec3 sdSegmentG(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    vec2 c = pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float l = length(c);
    return vec3(l - HALF, c / max(l, 1e-5));
  }
  vec3 nearer(vec3 a, vec3 b) {
    return a.x < b.x ? a : b;
  }

  // The board's copper and gold as distance fields with their gradients
  // (negative inside), and the distance to the bridge's film.
  void boardField(vec2 p, out vec3 cu, out vec3 au, out float film) {
    vec3 d = sdBoxG(p, vec2(A0), R0);
    float u = -d.x / PITCH;
    // The jog: on the left, over JOG mm, every turn steps in by one pitch.
    bool jog = p.x < 0.0 && abs(p.y) < -p.x && abs(p.y) < JOG * 0.5;
    float s = jog ? p.y / JOG + 0.5 : 0.0;
    float w = fract(u + s) - 0.5;
    // Across a turn: the distance from its middle line, less half its width.
    vec3 ring = vec3(abs(w) * PITCH - HALF, sign(w) * (-d.yz + (jog ? vec2(0.0, PITCH / JOG) : vec2(0.0))));
    // Only inside the band of turns: cut at its outer and inner ends.
    vec3 band = -u > u - TURNS ? vec3(-u * PITCH, d.yz) : vec3((u - TURNS) * PITCH, -d.yz);
    cu = ring.x > band.x ? ring : band;
    // The short runs: inner end to the chip; outer end down to the bridge;
    // the bridge's far end round to the chip's other pad.
    cu = nearer(cu, sdSegmentG(p, vec2(-8.4, 0.0), vec2(-2.1, 0.0)));
    cu = nearer(cu, sdSegmentG(p, vec2(-16.05, 0.0), vec2(-16.2, -2.6)));
    cu = nearer(cu, sdSegmentG(p, vec2(-7.2, -2.6), vec2(1.0, -2.6)));
    cu = nearer(cu, sdSegmentG(p, vec2(1.0, -2.6), vec2(2.2, -1.4)));
    cu = nearer(cu, sdSegmentG(p, vec2(2.2, -1.4), vec2(2.2, -0.5)));
    // Gold: the chip's two pads, the antenna's end pads, the bridge's lands,
    // and two fiducials for the pick-and-place camera.
    au = sdBoxG(p - vec2(-2.2, 0.0), vec2(0.5, 0.7), 0.08);
    au = nearer(au, sdBoxG(p - vec2(2.2, 0.0), vec2(0.5, 0.7), 0.08));
    au = nearer(au, sdBoxG(p - vec2(-8.35, 0.0), vec2(0.42, 0.4), 0.1));
    au = nearer(au, sdBoxG(p - vec2(-16.05, 0.0), vec2(0.42, 0.4), 0.1));
    au = nearer(au, sdBoxG(p - vec2(-16.2, -2.6), vec2(0.46), 0.46));
    au = nearer(au, sdBoxG(p - vec2(-7.2, -2.6), vec2(0.46), 0.46));
    au = nearer(au, sdBoxG(p - vec2(0.0, 17.7), vec2(0.5), 0.5));
    au = nearer(au, sdBoxG(p - vec2(0.0, -17.7), vec2(0.5), 0.5));
    film = sdBoxG(p - vec2(-11.7, -2.6), vec2(4.15, 0.78), 0.2).x;
  }

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }

  // Flexible ferrite is scored into small tiles so it can bend: the nearest
  // two tile centres (for the cracks between them) and the nearest's id.
  vec4 tiles(vec2 p) {
    vec2 g = floor(p);
    vec2 f = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    vec2 id = vec2(0.0);
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 o = vec2(float(i), float(j));
        vec2 c = o + 0.15 + 0.7 * hash2(g + o) - f;
        float d = dot(c, c);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          id = g + o;
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
    return vec4(sqrt(d1), sqrt(d2), id);
  }

  // Everything a surface of the inlay needs, from where it is on its plane:
  // its colour, roughness, metalness, and the slope of its relief (mm/mm).
  void etch(vec2 p, out vec3 albedo, out float rough, out float metal, out vec2 slope) {
    float aa = max(length(fwidth(p)), 1e-4);
    slope = vec2(0.0);
    if (uKind < 0.5) {
      vec3 cuField;
      vec3 auField;
      float filmField;
      boardField(p, cuField, auField, filmField);
      vec3 metalField = nearer(cuField, auField);
      // Coverage over the pixel; once the turns are finer than a pixel or
      // so, their average, so they never shimmer into moiré.
      float cu = 1.0 - smoothstep(-aa * 0.5, aa * 0.5, metalField.x);
      float au = 1.0 - smoothstep(-aa * 0.5, aa * 0.5, auField.x);
      float film = 1.0 - smoothstep(-aa * 0.5, aa * 0.5, filmField);
      float fine = smoothstep(PITCH * 0.3, PITCH * 0.85, aa);
      float d = sdBoxG(p, vec2(A0), R0).x;
      float inBand = step(-TURNS * PITCH, d) * step(d, 0.0);
      cu = mix(cu, max(inBand * (2.0 * HALF / PITCH), au), fine);
      albedo = mix(SUBSTRATE, mix(COPPER, GOLD, au), cu);
      metal = cu;
      rough = mix(0.46, mix(0.24, 0.2, au), cu);
      // The bridge's film, amber and glossy over the turns it crosses.
      albedo = mix(albedo, FILM + albedo * 0.2, film * 0.85);
      metal *= 1.0 - 0.75 * film;
      rough = mix(rough, 0.18, film);
      // The copper's rounded edges, where a pixel can still show them: its
      // height rises over HALF mm in from each edge, as a quarter sine.
      float relief = (1.0 - smoothstep(HALF * 0.35, HALF * 1.1, aa)) * (1.0 - 0.5 * film);
      float t = clamp(-metalField.x / HALF, 0.0, 1.0);
      float rising = t > 0.0 && t < 1.0 ? 1.0 : 0.0;
      slope = -metalField.yz * (CU_H * 1.5707963 / HALF) * cos(1.5707963 * t) * rising * relief;
    } else if (uKind < 1.5) {
      vec4 t = tiles(p / 1.15);
      vec2 r = hash2(t.zw);
      float crack = 1.0 - smoothstep(0.0, 0.025 + aa / 1.15, t.y - t.x);
      crack *= 1.0 - smoothstep(0.12, 0.4, aa);
      albedo = FERRITE_TONE * (0.95 + 0.1 * r.x) * (1.0 - 0.45 * crack);
      rough = 0.64 + 0.06 * r.y;
      metal = 0.0;
      // Each tile sits a hair off true, so they catch the light unevenly;
      // the cracks between them are in shadow.
      slope = (r - 0.5) * 0.05 * (1.0 - crack) * (1.0 - smoothstep(0.12, 0.4, aa));
      metal = 0.0;
      albedo *= 1.0 - 0.3 * crack;
    } else if (uKind < 2.5) {
      // The chip's top: black epoxy, laser-marked with a pin-one dot and two
      // short lines of type, which read lighter and matte.
      float dot1 = length(p - vec2(-1.0, 0.66)) - 0.16;
      float l1 = sdBoxG(p - vec2(0.15, 0.12), vec2(0.86, 0.09), 0.03).x;
      float l2 = sdBoxG(p - vec2(-0.1, -0.38), vec2(0.6, 0.09), 0.03).x;
      // Type too small to draw becomes an even grey line, as it would to the eye.
      float glyph = mix(step(fract((p.x + 0.71) / 0.2), 0.72), 0.72, smoothstep(0.04, 0.09, aa));
      float m = max(1.0 - smoothstep(-aa * 0.5, aa * 0.5, min(l1, l2)), 0.0) * glyph;
      float pin = 1.0 - smoothstep(-aa * 0.5, aa * 0.5, dot1);
      m = max(m, pin * 0.6);
      m *= 1.0 - smoothstep(0.12, 0.3, aa);
      albedo = mix(EPOXY, MARK, m);
      rough = mix(0.36, 0.78, m);
      metal = 0.0;
    } else if (uKind < 3.5) {
      albedo = COPPER;
      rough = 0.22;
      metal = 1.0;
    } else {
      albedo = EPOXY;
      rough = 0.4;
      metal = 0.0;
    }
  }
`;

// One of the inlay's surfaces: `kind`, and how its UVs map to its plane in
// millimetres (plane = uv * scale + offset).
// `bench`: a light of their own (see PocketLayers.bench); `rake`, the pad's.
type Bench = { dir: { value: Vector3 }; strength: { value: number }; sweep: { value: number }; rake: { value: Vector3 } };
function electronics(kind: number, scale: number, offset: number, bench: Bench): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: new Color(1, 1, 1), roughness: 1, metalness: 0, envMapIntensity: 1.35 });
  const uniforms = { uKind: { value: kind }, uPlane: { value: new Vector2(scale, offset) } };
  patchShader(m, "electronics", (shader) => {
    shader.uniforms.uKind = uniforms.uKind;
    shader.uniforms.uPlane = uniforms.uPlane;
    shader.uniforms.uBenchDir = bench.dir;
    shader.uniforms.uBench = bench.strength;
    shader.uniforms.uSweep = bench.sweep;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform vec2 uPlane;\nvarying vec2 vPart;\nvarying vec3 vPartX;\nvarying vec3 vPartY;\nvarying float vFace;")
      .replace(
        "#include <begin_vertex>",
        // The plane's x and y are the part's own x and -z (its face is up).
        `#include <begin_vertex>
        vPart = uv * uPlane.x + uPlane.y;
        vPartX = normalize((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
        vPartY = normalize((modelViewMatrix * vec4(0.0, 0.0, -1.0, 0.0)).xyz);
        vFace = step(0.7, objectNormal.y);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${GLSL}`)
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec3 etchAlbedo;
        float etchRough;
        float etchMetal;
        vec2 etchSlope;
        etch(vPart, etchAlbedo, etchRough, etchMetal, etchSlope);
        diffuseColor.rgb = etchAlbedo;`,
      )
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = etchRough;")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = etchMetal;")
      .replace(
        "#include <normal_fragment_maps>",
        // A height field over the face: n = N - dh/dx X - dh/dy Y.
        `#include <normal_fragment_maps>
        normal = normalize(normal - (etchSlope.x * vPartX + etchSlope.y * vPartY) * vFace);`,
      )
      .replace(
        "#include <lights_fragment_end>",
        // A big soft source: its lobe is broader than the surface's own, so
        // the copper fills with its colour while the black board and the
        // ferrite, which reflect a twentieth as much, only take a sheen.
        // It's a long strip, so its light lies across the board as a soft
        // band, which runs over the turns as Pocket turns (uSweep, in mm).
        `#include <lights_fragment_end>
        PhysicalMaterial benchMaterial = material;
        benchMaterial.roughness = max(material.roughness, 0.55);
        float benchNoL = saturate(dot(normal, uBenchDir));
        float benchBand = (dot(vPart, vec2(0.7071)) - uSweep) / 8.0;
        float benchLight = uKind > 2.5 && uKind < 3.5 ? 1.0 : 0.5 + 0.8 * exp(-benchBand * benchBand);
        reflectedLight.directSpecular += uBench * benchLight * benchNoL * BRDF_GGX(uBenchDir, geometryViewDir, normal, benchMaterial);`,
      );
  });
  return m;
}

// The micro-suction pad's face: thousands of tiny cells, each a shallow cup
// with a soft rim, which is what holds it to glass or paint. Laid across
// the pad's flat faces in its own plane; they fade to an even matte once a
// cell is smaller than a pixel or two. While it's apart, a light rakes
// across its face (the bench's `rake`), so the cups show in relief.
function cellular(m: MeshPhysicalMaterial, bench: Bench) {
  patchShader(m, "cells", (shader) => {
    shader.uniforms.uBench = bench.strength;
    shader.uniforms.uRake = bench.rake;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vCell;\nvarying vec3 vCellX;\nvarying vec3 vCellY;\nvarying float vCellFace;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vCell = position.xz;
        vCellX = normalize((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
        vCellY = normalize((modelViewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
        vCellFace = abs(objectNormal.y) > 0.7 ? sign(objectNormal.y) : 0.0;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vCell;
        varying vec3 vCellX;
        varying vec3 vCellY;
        varying float vCellFace;
        uniform float uBench;
        uniform vec3 uRake;
        // A hexagonal lattice of cells a millimetre apart: the offset to the
        // nearest cell's centre.
        vec2 cellOffset(vec2 p) {
          const vec2 s = vec2(1.0, 1.7320508);
          vec2 a = mod(p, s) - s * 0.5;
          vec2 b = mod(p - s * 0.5, s) - s * 0.5;
          return dot(a, a) < dot(b, b) ? a : b;
        }`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        vec2 cellP = vCell / 1.0;
        float cellAa = length(fwidth(cellP));
        float cellShow = (1.0 - smoothstep(0.18, 0.5, cellAa)) * abs(vCellFace);
        vec2 cellO = cellOffset(cellP);
        float cellR = length(cellO);
        // Each cup: darker and a touch glossier in its hollow.
        float cup = 1.0 - smoothstep(0.2, 0.42, cellR);
        diffuseColor.rgb *= 1.0 - 0.35 * cup * cellShow;
        roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.72, cup * cellShow);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        // The cup's walls slope in toward its middle: its depth rises
        // toward the rim, so the normal leans in.
        vec2 cellSlope = cellO * smoothstep(0.42, 0.22, cellR) * 1.1 * cellShow;
        normal = normalize(normal - (cellSlope.x * vCellX + cellSlope.y * vCellY));`,
      )
      .replace(
        "#include <lights_fragment_end>",
        // The raking light: soft, so the cups' lit walls and shaded hollows
        // read across the face rather than as one glint.
        `#include <lights_fragment_end>
        float rakeNoL = saturate(dot(normal, uRake));
        PhysicalMaterial rakeMaterial = material;
        rakeMaterial.roughness = max(material.roughness, 0.5);
        reflectedLight.directDiffuse += uBench * 9.0 * rakeNoL * BRDF_Lambert(material.diffuseColor);
        reflectedLight.directSpecular += uBench * 1.2 * rakeNoL * BRDF_GGX(uRake, geometryViewDir, normal, rakeMaterial);`,
      );
  });
}

// ——— Pocket, in parts ———

type Part = { key: PartKey; group: Group; seat: Group };

export class PocketLayers {
  // Base on y = 0, face up, as the shared model.
  readonly group = new Group();
  readonly ceramic: MeshPhysicalMaterial;
  private parts: Part[] = [];
  // Seen only once it's apart.
  private inner: Group[] = [];
  private pocket: Mesh;
  private pad: Group;
  private peel = 0;
  private toward = new Vector3();
  private hinge = new Vector3();
  private turned = new Quaternion();
  private open = -1;
  // A light for the electronics alone while Pocket is apart, the way a
  // product photographer lights a board: a soft source mirrored in its face,
  // so the copper reads as copper (the room's own light, set for the night
  // ground, leaves it a dull bronze). The scene aims it (in view space) and
  // sets its strength.
  readonly bench: Bench = { dir: { value: new Vector3(0, 0, 1) }, strength: { value: 0 }, sweep: { value: 0 }, rake: { value: new Vector3(0, 1, 0) } };

  constructor(kit: DeviceMaterials) {
    const part = (key: PartKey) => {
      const group = new Group();
      const seat = new Group();
      seat.add(group);
      this.group.add(seat);
      this.parts.push({ key, group, seat });
      return group;
    };

    // The ceramic top and its engraved tap mark.
    this.ceramic = kit.ceramic();
    const ceramic = part("ceramic");
    ceramic.add(new Mesh(ceramicTop(), this.ceramic));
    const mark = new Mesh(disc(7.5), kit.tapMark());
    mark.position.y = POCKET.capY + 0.26;
    ceramic.add(mark);

    // The inlay: board, chip and bridge.
    const board = part("board");
    const sheet = electronics(KIND.board, BOARD.r * 2, -BOARD.r, this.bench);
    for (const g of plate(BOARD.r, BOARD.t)) board.add(new Mesh(g, sheet));
    const chipTop = electronics(KIND.chip, 1, 0, this.bench);
    const epoxy = electronics(KIND.epoxy, 1, 0, this.bench);
    const chip = new Mesh(chipBody(), [chipTop, epoxy]);
    chip.position.y = BOARD.t;
    const copper = electronics(KIND.copper, 1, 0, this.bench);
    const strap = new Mesh(bridge(9), copper);
    // From the outer end's land (-16.2, -2.6) to the inner land (-7.2, -2.6),
    // in the board's plane (its y is the part's -z).
    strap.position.set(-11.7, BOARD.t + 0.02, 2.6);
    board.add(chip, strap);
    board.position.y = FERRITE.t + FLOOR;

    // The ferrite sheet, under the antenna.
    const ferrite = part("ferrite");
    const tiles = electronics(KIND.ferrite, FERRITE.r * 2, -FERRITE.r, this.bench);
    for (const g of plate(FERRITE.r, FERRITE.t)) ferrite.add(new Mesh(g, tiles));
    ferrite.position.y = FLOOR;

    // The body: the shared model's turned rings and knurl, and the pocket
    // machined into its face.
    const shell = part("shell");
    const body = kit.titanium();
    const rings = pocketRings();
    const pocket = new Mesh(cavity(), body);
    shell.add(new Mesh(rings.bottom, body), new Mesh(pocketKnurl(), kit.knurled()), new Mesh(rings.top, body), pocket);

    // The micro-suction pad.
    const pad = part("pad");
    const padMaterial = kit.pad();
    cellular(padMaterial, this.bench);
    pad.add(new Mesh(pocketPad(), padMaterial));

    this.inner = [board, ferrite];
    this.pocket = pocket;
    this.pad = pad;
    this.set(0, 0);
  }

  // What a camera looks at along the axis (mm up from the base) for
  // `open`: the middle of the stack (`focus` 0) or the board's face (1).
  static aim(open: number, focus: number) {
    const o = clamp01(open);
    const middle = MID.closed + (MID.open - MID.closed) * o;
    const board = BOARD_Y + APART.board * ease(clamp01((o - LAG.board) / (1 - LAG.board)));
    return middle + (board - middle) * focus;
  }

  // `open`: 0 (together) to 1 (fully apart). `turn`: 0 to 1 over the hold,
  // for the parts' slow turn about their axis.
  set(open: number, turn: number) {
    const o = clamp01(open);
    if (o === this.open && o === 0) return;
    this.open = o;
    const apart = o > 0.0005;
    for (const g of this.inner) g.visible = apart;
    this.pocket.visible = apart;
    for (const p of this.parts) {
      const t = ease(clamp01((o - LAG[p.key]) / (1 - LAG[p.key])));
      p.seat.position.y = APART[p.key] * t;
      p.seat.rotation.y = TURN[p.key] * t * (turn * 2 - 1);
      if (p.key === "pad") this.peel = t;
    }
    if (this.peel === 0) {
      this.pad.quaternion.identity();
      this.pad.position.set(0, 0, 0);
    }
  }

  // Tips the peeled pad's face toward `eye`, the camera in this group's own
  // space (base on y = 0, face up): about the level line square to it, so
  // its underside turns to the camera. Called after set(), each frame.
  face(eye: Vector3) {
    const t = this.peel;
    if (t === 0) return;
    const h = this.toward.set(eye.x, 0, eye.z);
    if (h.lengthSq() < 1e-6) h.set(0, 0, 1);
    h.normalize();
    // Turning the face's normal (down) toward h is a turn about down × h.
    this.pad.quaternion.setFromAxisAngle(this.hinge.set(-h.z, 0, h.x), PEEL.tip * t);
    this.pad.position.set(h.x * PEEL.slide * t, 0, h.z * PEEL.slide * t);
  }

  // Which way the pad's sticky face looks, in the world.
  padFace(out: Vector3) {
    this.pad.updateWorldMatrix(true, false);
    return out.set(0, -1, 0).applyQuaternion(this.pad.getWorldQuaternion(this.turned));
  }

  // The meshes whose materials a scene should compile before it draws.
  meshes(): Mesh[] {
    const out: Mesh[] = [];
    this.group.traverse((o) => {
      if (o instanceof Mesh) out.push(o);
    });
    return out;
  }

  dispose() {
    const seen = new Set<Material>();
    this.group.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      o.geometry.dispose();
      for (const m of [o.material as Material | Material[]].flat()) seen.add(m);
    });
    seen.forEach((m) => m.dispose());
  }
}
