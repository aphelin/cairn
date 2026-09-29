import {
  BackSide,
  BoxGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  Vector2,
  Vector4,
  type Texture,
} from "three";
import { AO_RECT, FAR, FIELD_RECT } from "./field";
import { COOL, PLINTH, STUDY, WALLS, WALL_H, WARM } from "./plan";

// The house's materials all share one addition to three's standard shader:
// the baked shade and lamplight, and the zone. The zone is light that floods
// out from the dial across the floor, walking round walls: a surface lights
// when its spot on the plan is within reach, and an upright face reads the
// spot a step into the room it faces, so each side of a wall belongs to its
// own room. Where the light meets a wall it washes up the inner face and the
// wall's cut top glows as a crisp line in the mode's colour. Past the walls
// there is nothing: the outside, the plinth and the ground never light.

export type ZoneUniforms = ReturnType<typeof zoneUniforms>;

// The study's doorway, where Room's light stops: [x0, x1, z].
const door = (() => {
  const w = WALLS.find((w) => w.axis === "x" && w.at === STUDY.z1)!;
  const [from, to] = w.openings!.find(([a, b, sill]) => sill === 0 && a >= STUDY.x0 && b <= STUDY.x1)!;
  return [from, to, w.at] as const;
})();

export function zoneUniforms(field: Texture, ao: Texture) {
  return {
    uField: { value: field },
    uFieldRect: { value: new Vector4(FIELD_RECT.x, FIELD_RECT.z, FIELD_RECT.w, FIELD_RECT.d) },
    uAO: { value: ao },
    uAORect: { value: new Vector4(AO_RECT.x, AO_RECT.z, AO_RECT.w, AO_RECT.d) },
    // The zone: its colour, the colour it's replacing (washed out by a front
    // that runs from the dial), how far it reaches in the study and past it,
    // a ripple running out along it, and the line across the doorway.
    uZCol: { value: new Color() },
    uZPrev: { value: new Color() },
    uZFront: { value: FAR },
    // Past the study's doorway the front can be held back: turning down to
    // Desk or Room, the new colour never leaves the study.
    uZFrontOut: { value: FAR },
    // How far the light reached (in the study, and past it) when the colour
    // changed: only there does the old colour linger.
    uZWas: { value: new Vector2() },
    uZReach: { value: 0 },
    uZOut: { value: 0 },
    uZRip: { value: 0 },
    uZRipK: { value: 0 },
    uZGain: { value: 1.5 },
    uZSill: { value: new Vector4(door[0], door[1], door[2], 0) },
    // Baked lamplight and window light, and how strong each is now.
    uWarm: { value: new Color(WARM) },
    uCool: { value: new Color(COOL) },
    uWarmK: { value: 0.6 },
    uCoolK: { value: 0.3 },
  };
}

const VERTEX_PARS = /* glsl */ `
attribute vec2 aRM;
varying vec2 vRM;
varying vec3 vZW;
varying vec3 vZN;
`;

const VERTEX = /* glsl */ `
{
  vec4 zp = vec4(transformed, 1.0);
  vec3 zn = objectNormal;
  #ifdef USE_INSTANCING
    zp = instanceMatrix * zp;
    zn = mat3(instanceMatrix) * zn;
  #endif
  vZW = (modelMatrix * zp).xyz;
  vZN = normalize(mat3(modelMatrix) * zn);
  vRM = aRM;
}
`;

const FRAGMENT_PARS = /* glsl */ `
uniform sampler2D uField;
uniform vec4 uFieldRect;
uniform sampler2D uAO;
uniform vec4 uAORect;
uniform vec3 uZCol;
uniform vec3 uZPrev;
uniform float uZFront;
uniform float uZFrontOut;
uniform vec2 uZWas;
uniform float uZReach;
uniform float uZOut;
uniform float uZRip;
uniform float uZRipK;
uniform float uZGain;
uniform vec4 uZSill;
uniform vec3 uWarm;
uniform vec3 uCool;
uniform float uWarmK;
uniform float uCoolK;
varying vec2 vRM;
varying vec3 vZW;
varying vec3 vZN;
`;

const FRAGMENT = /* glsl */ `
vec3 zLight = vec3(0.0);
{
  vec3 zn = normalize(vZN);
  #ifdef DOUBLE_SIDED
    zn = gl_FrontFacing ? zn : -zn;
  #endif
  float up = smoothstep(0.55, 0.9, zn.y);
  float side = 1.0 - smoothstep(0.35, 0.75, abs(zn.y));

  // Baked contact shade: the floor round walls and furniture, the ground
  // round the plinth, and a darker foot on every upright face.
  vec2 aoT = texture2D(uAO, (vZW.xz - uAORect.xy) / uAORect.zw).rg;
  float onFloor = up * step(-0.03, vZW.y) * step(vZW.y, 0.03);
  float onGround = up * step(vZW.y, -0.2);
  float ao = (1.0 - aoT.r * onFloor * 0.62) * (1.0 - aoT.g * onGround * 0.55);
  float base = vZW.y < -0.03 ? -${PLINTH.h.toFixed(3)} : 0.0;
  ao *= mix(1.0, mix(0.7, 1.0, smoothstep(0.0, 0.42, vZW.y - base)), side);
  diffuseColor.rgb *= ao;
  vec3 alb = diffuseColor.rgb;

  // The field, read a step into the room an upright face looks at.
  vec2 fp = vZW.xz + zn.xz * (0.1 * side);
  vec2 fuv = (fp - uFieldRect.xy) / uFieldRect.zw;
  vec4 F = vec4(${FAR.toFixed(1)}, ${FAR.toFixed(1)}, 0.0, 0.0);
  if (fuv.x > 0.0 && fuv.x < 1.0 && fuv.y > 0.0 && fuv.y < 1.0) F = texture2D(uField, fuv);

  float cap = up * step(${(WALL_H - 0.008).toFixed(3)}, vZW.y);
  float hf = mix(1.0, 1.0 - 0.5 * smoothstep(0.1, 1.7, vZW.y), side);

  // The zone. In the study it reaches uZReach; past the study's doorway it
  // reaches no further than uZOut, which holds it at the threshold until
  // Home lets it through.
  float R = uZReach;
  float Ro = min(uZReach, uZOut);
  float oIn = 1.0 - smoothstep(20.0, 60.0, F.g);
  float litIn = 1.0 - smoothstep(R - 0.3, R, F.g);
  float litOut = 1.0 - smoothstep(Ro - 0.3, Ro, F.r);
  float lit = max(litIn, litOut) * step(0.02, R);

  // Lamplight pooled on the floor and washing the walls near each lamp, and
  // the evening through the windows; the cut stays dark. The lamps' warmth
  // is held close to white, and where the zone reaches its light takes over
  // from theirs: fully in a small zone, where the contrast is the point,
  // and only partly across the whole flat, so Home keeps its lamplit pools
  // and reads as light filling rooms rather than a tint laid over them.
  float wide = smoothstep(4.0, 9.0, R);
  vec3 warm = mix(vec3(dot(uWarm, vec3(0.299, 0.587, 0.114))), uWarm, 0.55);
  zLight += alb * (warm * (F.b * uWarmK) * (1.0 - mix(0.75, 0.4, wide) * lit) + uCool * (F.a * uCoolK)) * hf * (1.0 - cap);
  // A soft, bright leading edge, and ripples running out through the doors:
  // a thin bright band that washes up each wall and flares along its cut
  // top as it arrives.
  float edge = max(litIn * oIn * exp(-max(R - F.g, 0.0) * 3.0), litOut * (1.0 - oIn) * exp(-max(Ro - F.r, 0.0) * 3.0));
  float q = (F.r - uZRip) * 7.0;
  float rip = exp(-q * q) * lit * uZRipK;
  float was = max(1.0 - smoothstep(uZWas.x - 0.3, uZWas.x, F.g), 1.0 - smoothstep(uZWas.y - 0.3, uZWas.y, F.r));
  float fr = mix(uZFrontOut, uZFront, oIn);
  vec3 zc = mix(uZCol, uZPrev, was * smoothstep(fr - 0.45, fr, F.r));
  float wash = mix(1.0, 1.0 - 0.35 * smoothstep(0.0, ${WALL_H.toFixed(2)}, vZW.y), side);
  // Coloured light shows the surface's lightness more than its hue, so
  // violet stays violet on warm oak; across the whole flat a little more of
  // each material's own colour comes through, so oak, rugs and fabric stay
  // themselves under Home. A small zone gets a stronger rim, so Desk's
  // metre reads as clearly as Home's twelve.
  vec3 albZ = mix(vec3(dot(alb, vec3(0.299, 0.587, 0.114))), alb, mix(0.2, 0.42, wide)) * 1.12;
  float small = 1.0 - smoothstep(1.5, 4.0, R);
  zLight += zc * albZ * (lit * wash + edge * (0.8 + 0.9 * small) + rip * 1.1) * uZGain;
  zLight += zc * (edge * (0.045 + 0.05 * small) + rip * 0.1);
  // Where the light stops, a crisp line: the walls' cut tops, the study's
  // threshold while Room holds the light there, and the rim of a small zone
  // on the floor, so Desk's edge reads as sharply as a wall.
  float onLow = up * step(vZW.y, 0.03);
  float sill = uZSill.w * onLow
    * step(uZSill.x, vZW.x) * step(vZW.x, uZSill.y)
    * (1.0 - smoothstep(0.008, 0.016, abs(vZW.z - uZSill.z)));
  float ring = (1.0 - smoothstep(0.012, 0.025, abs(F.g - R))) * small * onLow * step(0.02, R);
  float line = max(max(cap * lit, sill), ring);
  diffuseColor.rgb *= 1.0 - 0.2 * lit;
  diffuseColor.rgb = mix(diffuseColor.rgb, zc * 0.3, line);
  zLight += zc * line * 1.3;
  // Each ripple lights the wall it reaches: the cut top flares as it passes.
  zLight += zc * cap * rip * 2.0;
}
`;

// Adds the zone and the baked light to a standard material, and takes
// roughness and metalness per vertex.
function withZone<T extends MeshStandardMaterial>(material: T, uniforms: ZoneUniforms): T {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = VERTEX_PARS + shader.vertexShader.replace("#include <worldpos_vertex>", `#include <worldpos_vertex>\n${VERTEX}`);
    shader.fragmentShader = FRAGMENT_PARS + shader.fragmentShader
      .replace("#include <color_fragment>", `#include <color_fragment>\n${FRAGMENT}`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor *= vRM.x;")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor *= vRM.y;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += zLight;");
  };
  return material;
}

export type Maps = {
  planks: { map: Texture; rough: Texture };
  tiles: { map: Texture; rough: Texture };
  splash: Texture;
  grain: Texture;
  weave: Texture;
  prints: Texture;
};

export function houseMaterials(u: ZoneUniforms, maps: Maps) {
  const base = { vertexColors: true, roughness: 1, metalness: 1 };
  return {
    plain: withZone(new MeshStandardMaterial({ ...base }), u),
    wood: withZone(new MeshStandardMaterial({ ...base, map: maps.grain }), u),
    fabric: withZone(
      new MeshPhysicalMaterial({ ...base, map: maps.weave, sheen: 1, sheenRoughness: 0.72, sheenColor: new Color(0.32, 0.29, 0.25) }),
      u,
    ),
    planks: withZone(new MeshStandardMaterial({ ...base, map: maps.planks.map, roughnessMap: maps.planks.rough }), u),
    tiles: withZone(new MeshStandardMaterial({ ...base, map: maps.tiles.map, roughnessMap: maps.tiles.rough }), u),
    splash: withZone(new MeshStandardMaterial({ ...base, map: maps.splash }), u),
    print: withZone(new MeshStandardMaterial({ ...base, map: maps.prints }), u),
    leaf: withZone(new MeshStandardMaterial({ ...base, side: DoubleSide }), u),
  };
}

// Lamp shades: lit from inside, so drawn unlit, in their own warm white.
export function glowMaterial() {
  return new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
}

// Window glass: a faint cool sheet, catching more of the night toward its
// top (the colour runs up each pane), with the room's reflection in it.
export function glassMaterial() {
  return new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.04,
    metalness: 0.1,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    envMapIntensity: 1.6,
  });
}

// An evening room to reflect: a deep blue dark, one broad warm-white light
// above (the lamps, taken together) and a cool glow from the windows' side. Baked
// once and prefiltered (the scene bakes it a step at a time, with SIGMA), so
// wood, fabric and glass all get a soft sheen.
export const EVENING_SIGMA = 0.035;
export function eveningRoom(): Scene {
  const env = new Scene();
  env.add(new Mesh(new BoxGeometry(20, 10, 20), new MeshBasicMaterial({ color: 0x141a27, side: BackSide })));
  const panel = (w: number, h: number, pos: [number, number, number], hex: string, k: number) => {
    const mesh = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(hex).multiplyScalar(k), side: DoubleSide }));
    mesh.position.set(...pos);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  panel(9, 9, [0, 4.9, 0], "#fff0e2", 2.0);
  panel(5, 2.5, [-9.8, 2.2, 2], "#ffe9d6", 1.2);
  panel(4, 2, [4, 1.5, -9.8], "#ffebd8", 0.8);
  panel(12, 3, [2, 1.2, 9.8], "#6d84b6", 0.8);
  return env;
}
