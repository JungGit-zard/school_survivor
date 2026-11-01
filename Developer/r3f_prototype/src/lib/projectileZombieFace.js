// 신규 투사체 좀비 15종의 절차적 얼굴(SDF 프로시저럴 셰이더). 하나의 분기 셰이더(1 드로콜)가
// per-instance faceId로 15개 얼굴을 디스패치한다. 이미지·텍스처 자산은 없다(texture 샘플링 0).
//
// 설계: zombie_15_design_20261031.md §3, threemini 리뷰 §2(Q1/Q2/Q6)·§4.
// - UV 실거리 SDF + fwidth AA + 최소 획 클램프 max(w, 0.75·fwidth)
// - 얼굴 어휘 = 눈 쌍 1 + 입 1 + 큰 색 영역 1, 얼굴당 SDF 프리미티브 12개 이하
// - 예고 중 눈은 공통 경고색 #FF7A1A
// - 피부는 그리지 않는다(feature-only alpha). 머리 박스 앞면 위에 소프트 알파로 얹는다.
// E07(웃는얼굴)은 이 모듈에 넣지 않는다(Studio 절대법칙, 리뷰 Q4).
import * as THREE from 'three'
import { PROJECTILE_ZOMBIE_FIRST_TYPE_CODE, PROJECTILE_ZOMBIE_TYPES } from './projectileZombieVisuals.js'

export const FACE_WARN_COLOR = 0xff7a1a
// 얼굴 쿼드: 머리 박스 앞면(0.52 x 0.48, z = +0.23) 바로 앞, 머리 로컬 ε.
export const FACE_HEAD_BASE = Object.freeze([0.52, 0.48, 0.46])
export const FACE_SURFACE_EPSILON = 0.006

// faceId = 종 번호(1..15). prims = 평시 얼굴의 SDF 프리미티브 수(예고 추가 포함 최댓값).
export const FACE_CATALOG = Object.freeze(PROJECTILE_ZOMBIE_TYPES.map((type, index) => Object.freeze({
  type,
  typeCode: PROJECTILE_ZOMBIE_FIRST_TYPE_CODE + index,
  faceId: index + 1,
  prims: [9, 5, 7, 9, 5, 4, 9, 6, 6, 6, 8, 11, 8, 7, 6][index],
})))

// 머리 슬롯 행렬(box 스케일을 곱하기 직전)에서 얼굴 쿼드 행렬을 만든다.
// face = head × S(box) × T(0, 0, depth/2 + ε) × S(width, height, 1)
// 이 순서라서 Studio 머리 튜닝·상태 포즈·비균등 head.box가 전부 자동으로 따라온다.
const _box = new THREE.Matrix4(); const _t = new THREE.Matrix4(); const _s = new THREE.Matrix4()
export function composePooledFaceMatrix(out, headMatrixBeforeBox, headBox, eps = FACE_SURFACE_EPSILON) {
  _box.makeScale(headBox[0], headBox[1], headBox[2])
  _t.makeTranslation(0, 0, FACE_HEAD_BASE[2] / 2 + eps)
  _s.makeScale(FACE_HEAD_BASE[0], FACE_HEAD_BASE[1], 1)
  return out.copy(headMatrixBeforeBox).multiply(_box).multiply(_t).multiply(_s)
}

// 쿼드 종횡비(가로/세로). 셰이더가 p.x에 곱해 원이 타원으로 늘지 않게 한다.
export function getFaceAspect(headBox) {
  return (FACE_HEAD_BASE[0] * headBox[0]) / (FACE_HEAD_BASE[1] * headBox[1])
}

export const PROJECTILE_FACE_VERTEX_SHADER = /* glsl */`
attribute vec4 aFace;
attribute vec2 aFaceAux;
varying vec2 vUv;
varying vec4 vFace;
varying vec2 vAux;
void main() {
  vUv = uv;
  vFace = aFace;
  vAux = aFaceAux;
  vec4 local = vec4(position, 1.0);
#ifdef USE_INSTANCING
  local = instanceMatrix * local;
#endif
  gl_Position = projectionMatrix * modelViewMatrix * local;
}
`

export const PROJECTILE_FACE_FRAGMENT_SHADER = /* glsl */`
varying vec2 vUv;
varying vec4 vFace;   // x faceId, y time(s), z telegraph on, w telegraph progress
varying vec2 vAux;    // x aspect, y hit flash
const vec3 WARN = vec3(1.0, 0.478, 0.102);
const float TAU = 6.2831853;
float gTime; float gTele; bool gTel;

float cov(float d) { float a = max(fwidth(d), 1e-5) * 0.75; return 1.0 - smoothstep(-a, a, d); }
float strokeCov(float dc, float w) { float ww = max(w, 0.75 * fwidth(dc)); return cov(dc - ww); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float sdEll(vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return (length(q) - 1.0) * min(r.x, r.y); }
float sdBox(vec2 p, vec2 c, vec2 h, float rad) { vec2 d = abs(p - c) - h + rad; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - rad; }
float sdArc(vec2 p, vec2 c, float R, float sy, float up) {
  vec2 q = p - c; q.y = q.y * up / max(sy, 0.08);
  return q.y >= 0.0 ? abs(length(q) - R) : length(vec2(abs(q.x) - R, q.y));
}
float blink(float period) { float ph = fract(gTime / period); return smoothstep(0.0, 0.035, ph) * (1.0 - smoothstep(0.045, 0.08, ph)); }
// straight-alpha "over" composite: features only, the head mesh supplies the skin
void lay(inout vec4 acc, vec3 c, float a) {
  a = clamp(a, 0.0, 1.0);
  float na = a + acc.a * (1.0 - a);
  if (na > 1e-5) acc.rgb = (c * a + acc.rgb * acc.a * (1.0 - a)) / na;
  acc.a = na;
}

// 1 E46 eraser: asymmetric eyes, white tooth bar, pink eraser smudge
void face1(vec2 p, inout vec4 acc) {
  vec3 cream = vec3(1.0, 0.941, 0.69);
  lay(acc, vec3(0.957, 0.639, 0.71), cov(sdEll(p, vec2(0.27, -0.19), vec2(0.09, 0.07))));
  float sy = gTel ? 1.0 : mix(1.0, 0.15, blink(4.2));
  lay(acc, gTel ? WARN : cream, cov(sdEll(p, vec2(-0.15, 0.07), vec2(0.10, 0.10 * sy))));
  lay(acc, cream, cov(sdEll(p, vec2(0.16, 0.07), vec2(0.06))));
  lay(acc, vec3(0.08), cov(sdEll(p, vec2(-0.15, 0.06), vec2(0.035, 0.035 * sy))));
  lay(acc, vec3(0.08), cov(sdEll(p, vec2(0.16, 0.06), vec2(0.025))));
  float w = gTel ? 0.075 : 0.05;
  lay(acc, vec3(0.141, 0.102, 0.102), strokeCov(sdSeg(p, vec2(-0.15, -0.16), vec2(0.05, -0.16)), w + 0.022));
  lay(acc, vec3(1.0), strokeCov(sdSeg(p, vec2(-0.15, -0.16), vec2(0.05, -0.16)), w));
}
// 2 E47 paper plane: closed arch eyes, small o mouth, big pink cheeks
void face2(vec2 p, inout vec4 acc) {
  float sy = gTel ? 1.0 : mix(1.0, 0.12, blink(3.0));
  vec3 pink = vec3(1.0, 0.616, 0.69);
  lay(acc, pink, cov(sdEll(p, vec2(-0.26, -0.15), vec2(0.09))));
  lay(acc, pink, cov(sdEll(p, vec2(0.26, -0.15), vec2(0.09))));
  vec3 eye = gTel ? WARN : vec3(0.231, 0.141, 0.086);
  lay(acc, eye, strokeCov(sdArc(p, vec2(-0.15, 0.07), 0.07, sy, 1.0), 0.045));
  lay(acc, eye, strokeCov(sdArc(p, vec2(0.15, 0.07), 0.07, sy, 1.0), 0.045));
  float mr = gTel ? mix(0.06, 0.11, smoothstep(0.0, 0.5, gTele)) : 0.06;
  lay(acc, vec3(0.227, 0.102, 0.118), cov(sdEll(p, vec2(0.0, -0.17), vec2(mr * 0.85, mr))));
}
// 3 E48 ruler: mustard forehead ruler band, round eyes, tongue
void face3(vec2 p, inout vec4 acc) {
  vec3 band = vec3(0.878, 0.706, 0.227);
  if (gTel) band = mix(band, vec3(1.0, 0.92, 0.55), 0.6);
  lay(acc, band, cov(sdBox(p, vec2(0.0, 0.26), vec2(0.37, 0.06), 0.01)));
  float sy = gTel ? 1.0 : mix(1.0, 0.15, blink(3.4));
  vec3 cream = gTel ? WARN : vec3(1.0, 0.941, 0.69);
  for (int i = 0; i < 2; i++) {
    vec2 c = vec2(i == 0 ? -0.15 : 0.15, 0.04);
    lay(acc, cream, cov(sdEll(p, c, vec2(0.07, 0.07 * sy))));
    if (!gTel) lay(acc, vec3(0.08), cov(sdEll(p, c, vec2(0.03, 0.03 * sy))));
  }
  lay(acc, vec3(1.0, 0.56, 0.66), cov(sdEll(p, vec2(0.03, -0.20), vec2(0.05, 0.045))));
  lay(acc, vec3(0.165, 0.102, 0.102), strokeCov(sdSeg(p, vec2(-0.10, -0.16), vec2(0.10, -0.16)), 0.045));
}
// 4 E49 bucket janitor: sleepy half eyes, mustache bar, forehead sweat drop
void face4(vec2 p, inout vec4 acc) {
  float lid = gTel ? 0.0 : mix(0.4, 1.0, blink(5.5));
  vec3 cream = gTel ? WARN : vec3(1.0, 0.941, 0.69);
  vec3 brown = vec3(0.18, 0.125, 0.094);
  for (int i = 0; i < 2; i++) {
    float sx = i == 0 ? -1.0 : 1.0;
    vec2 c = vec2(0.15 * sx, 0.02); vec2 r = vec2(0.09, 0.08);
    float lidY = c.y + r.y - 2.0 * r.y * lid;
    float open = cov(p.y - lidY);
    lay(acc, cream, cov(sdEll(p, c, r)) * open);
    if (!gTel) lay(acc, vec3(0.08, 0.06, 0.05), cov(sdEll(p, c + vec2(0.0, -0.02), vec2(0.035))) * open);
    if (lid > 0.01) lay(acc, brown, strokeCov(sdSeg(p, vec2(c.x - 0.085, lidY), vec2(c.x + 0.085, lidY)), 0.045));
  }
  lay(acc, brown, strokeCov(sdSeg(p, vec2(-0.13, -0.15), vec2(0.13, -0.15)), 0.05));
  float slide = 0.05 * fract(gTime / 2.0);
  vec2 dc = vec2(0.25, 0.25 - slide);
  float tipR = mix(0.07, 0.012, clamp((p.y - dc.y) / 0.11, 0.0, 1.0));
  float drop = min(sdEll(p, dc, vec2(0.07)), sdSeg(p, dc, dc + vec2(0.0, 0.11)) - tipR);
  lay(acc, vec3(0.561, 0.827, 0.941), cov(drop));
}
// 5 E50 volley: sharp slanted eyes, big white square mouth
void face5(vec2 p, inout vec4 acc) {
  float sy = gTel ? 1.0 : mix(1.0, 0.2, blink(2.6));
  vec3 eye = gTel ? WARN : vec3(1.0);
  vec3 dark = vec3(0.12, 0.06, 0.06);
  lay(acc, eye, strokeCov(sdSeg(p, vec2(-0.24, 0.10 + 0.05 * sy), vec2(-0.07, 0.10 - 0.03 * sy)), 0.045));
  lay(acc, eye, strokeCov(sdSeg(p, vec2(0.24, 0.10 + 0.05 * sy), vec2(0.07, 0.10 - 0.03 * sy)), 0.045));
  float k = gTel ? mix(1.0, 1.4, smoothstep(0.0, 0.6, gTele)) : 1.0;
  float m = sdBox(p, vec2(0.0, -0.17), vec2(0.10, 0.05) * k, 0.015);
  lay(acc, dark, cov(m - 0.022));
  lay(acc, vec3(1.0), cov(m));
}
// 6 E51 choir: closed crescent eyes, tall wine O mouth
void face6(vec2 p, inout vec4 acc) {
  vec3 eye = gTel ? WARN : vec3(0.29, 0.078, 0.149);
  lay(acc, eye, strokeCov(sdArc(p, vec2(-0.17, 0.17), 0.065, 1.0, -1.0), 0.045));
  lay(acc, eye, strokeCov(sdArc(p, vec2(0.17, 0.17), 0.065, 1.0, -1.0), 0.045));
  float open = gTel ? 1.0 : 0.75 + 0.25 * sin(TAU * 0.5 * gTime);
  float m = sdEll(p, vec2(0.0, -0.14), vec2(0.075, 0.175 * open));
  lay(acc, vec3(0.165, 0.04, 0.08), cov(m));
  lay(acc, vec3(0.353, 0.094, 0.188), cov(m + 0.03));
}
// 7 E52 flask: big lime-filled round goggle lenses (no strap), bar mouth, soot smudge
void face7(vec2 p, inout vec4 acc) {
  vec3 rimC = gTel ? WARN : vec3(0.227, 0.251, 0.282);
  lay(acc, vec3(0.165), 0.5 * cov(sdEll(p, vec2(-0.27, -0.19), vec2(0.09, 0.07))));
  vec3 lime = vec3(0.608, 0.941, 0.29);
  if (gTel) lime = mix(lime, vec3(0.92, 1.0, 0.72), 0.45 + 0.45 * sin(TAU * 6.0 * gTime));
  float sy = gTel ? 1.0 : mix(1.0, 0.15, blink(3.6));
  for (int i = 0; i < 2; i++) {
    vec2 c = vec2(i == 0 ? -0.165 : 0.165, 0.08);
    float d = sdEll(p, c, vec2(0.13));
    lay(acc, lime, 0.9 * cov(d));
    lay(acc, vec3(0.106, 0.165, 0.063), cov(sdEll(p, c + vec2(0.0, -0.01), vec2(0.04, 0.05 * sy))));
    lay(acc, vec3(1.0), 0.85 * cov(sdEll(p, c + vec2(-0.055, 0.055), vec2(0.028))));
    lay(acc, rimC, strokeCov(abs(d), 0.03));
  }
  lay(acc, vec3(0.165, 0.102, 0.102), strokeCov(sdSeg(p, vec2(-0.07, -0.19), vec2(0.07, -0.19)), 0.05));
}
// 8 E53 paint: big yellow / blue filled oval eyes (no outline), crooked smile
void face8(vec2 p, inout vec4 acc) {
  vec3 yel = vec3(0.949, 0.761, 0.188), blue = vec3(0.235, 0.482, 0.878);
  vec3 cl = yel, cr = blue;
  if (gTel) {
    if (gTele < 0.65) { bool sw = fract(gTime * 6.0) < 0.5; cl = sw ? blue : yel; cr = sw ? yel : blue; }
    else { cl = WARN; cr = WARN; }
  }
  float sy = gTel ? 1.0 : mix(1.0, 0.12, blink(3.2));
  for (int i = 0; i < 2; i++) {
    vec2 c = vec2(i == 0 ? -0.16 : 0.16, 0.09);
    lay(acc, i == 0 ? cl : cr, cov(sdEll(p, c, vec2(0.085, 0.13 * sy))));
    lay(acc, vec3(1.0), 0.85 * cov(sdEll(p, c + vec2(-0.03, 0.05 * sy), vec2(0.028, 0.028 * sy))));
  }
  vec3 dark = vec3(0.141, 0.102, 0.102);
  lay(acc, dark, strokeCov(sdSeg(p, vec2(-0.13, -0.18), vec2(0.03, -0.24)), 0.045));
  lay(acc, dark, strokeCov(sdSeg(p, vec2(0.03, -0.24), vec2(0.15, -0.14)), 0.045));
}
// 9 E54 megaphone: square green LED eyes with scanline, big dark trapezoid mouth
void face9(vec2 p, inout vec4 acc) {
  float scan = 0.75 + 0.25 * smoothstep(0.06, 0.0, abs(p.y - mix(0.2, -0.05, fract(gTime / 1.5))));
  vec3 led = vec3(0.298, 0.941, 0.478) * scan;
  if (gTel) led = fract(gTime * 4.0) < 0.5 ? WARN : vec3(1.0, 0.75, 0.45);
  lay(acc, led, cov(sdBox(p, vec2(-0.15, 0.08), vec2(0.075, 0.06), 0.012)));
  lay(acc, led, cov(sdBox(p, vec2(0.15, 0.08), vec2(0.075, 0.06), 0.012)));
  float wb = gTel ? 0.17 : 0.13;
  vec2 q = p - vec2(0.0, -0.18);
  float hw = mix(0.08, wb, clamp(0.5 - q.y / 0.14, 0.0, 1.0));
  float trap = max(abs(q.y) - 0.07, abs(q.x) - hw);
  lay(acc, vec3(0.165, 0.059, 0.063), cov(trap));
  lay(acc, vec3(0.85, 0.30, 0.30), cov(sdBox(p, vec2(0.0, -0.225), vec2(0.06, 0.02), 0.01)));
}
// 10 E55 pitcher: brim shadow band with glowing eyes, pink gum balloon
void face10(vec2 p, inout vec4 acc) {
  lay(acc, vec3(0.102, 0.118, 0.18), cov(0.20 + 0.06 * p.x * p.x - p.y));
  float sy = gTel ? 1.0 : mix(1.0, 0.15, blink(4.0));
  vec3 eye = gTel ? WARN : vec3(1.0, 0.965, 0.784);
  for (int i = 0; i < 2; i++) {
    vec2 c = vec2(i == 0 ? -0.13 : 0.13, 0.30);
    float d = sdEll(p, c, vec2(0.06, 0.06 * sy));
    lay(acc, eye, 0.35 * (1.0 - smoothstep(0.0, 0.05, d)));
    lay(acc, eye, cov(d));
  }
  lay(acc, vec3(0.165, 0.102, 0.102), strokeCov(sdSeg(p, vec2(-0.10, -0.15), vec2(0.03, -0.15)), 0.045));
  float gr = gTel ? mix(0.05, 0.13, smoothstep(0.0, 0.9, gTele)) : 0.05;
  float popped = gTel ? step(0.97, gTele) : 0.0;
  vec2 gc = vec2(0.05 + gr, -0.15);
  lay(acc, vec3(1.0, 0.561, 0.753), cov(sdEll(p, gc, vec2(gr))) * (1.0 - popped));
  lay(acc, vec3(1.0, 0.86, 0.93), cov(sdEll(p, gc + vec2(-0.35, 0.35) * gr, vec2(0.022))) * (1.0 - popped));
}
// 11 E56 nurse: droopy arch eyes, white lower-face mask, green X plaster
void face11(vec2 p, inout vec4 acc) {
  float sy = gTel ? 1.0 : mix(1.0, 0.15, blink(3.8));
  vec3 eye = gTel ? WARN : vec3(0.231, 0.141, 0.086);
  lay(acc, eye, strokeCov(sdArc(p, vec2(-0.15, 0.10), 0.07, sy * 0.7, 1.0), 0.045));
  lay(acc, eye, strokeCov(sdArc(p, vec2(0.15, 0.10), 0.07, sy * 0.7, 1.0), 0.045));
  float mask = sdBox(p, vec2(0.0, -0.17), vec2(0.27, 0.12), 0.06);
  lay(acc, vec3(0.42, 0.45, 0.47), cov(mask - 0.02));
  lay(acc, vec3(0.957, 0.965, 0.965), cov(mask));
  if (gTel) {
    lay(acc, vec3(1.0, 0.55, 0.62), 0.8 * cov(sdEll(p, vec2(-0.16, -0.06), vec2(0.06, 0.04))));
    lay(acc, vec3(1.0, 0.55, 0.62), 0.8 * cov(sdEll(p, vec2(0.16, -0.06), vec2(0.06, 0.04))));
  }
  vec3 green = vec3(0.298, 0.749, 0.416);
  lay(acc, green, strokeCov(sdSeg(p, vec2(0.17, 0.20), vec2(0.29, 0.30)), 0.03));
  lay(acc, green, strokeCov(sdSeg(p, vec2(0.17, 0.30), vec2(0.29, 0.20)), 0.03));
}
// 12 E57 attendance: thick black square glasses, white dot eyes, sweeping glint, ㅅ mouth
void face12(vec2 p, inout vec4 acc) {
  vec3 black = vec3(0.07);
  float flash = gTel ? 1.0 - smoothstep(0.22, 0.32, gTele) : 0.0;
  float sy = gTel ? 1.0 : mix(1.0, 0.15, blink(5.0));
  float bandX = mix(-0.55, 0.55, fract(gTime / 2.5));
  vec2 bandN = normalize(vec2(1.0, 1.0));
  for (int i = 0; i < 2; i++) {
    float sx = i == 0 ? -1.0 : 1.0;
    vec2 c = vec2(0.17 * sx, 0.10);
    float b = sdBox(p, c, vec2(0.10, 0.11), 0.02);
    float inner = cov(b + 0.045);
    lay(acc, vec3(1.0), inner * 0.12);
    lay(acc, vec3(1.0), inner * cov(abs(dot(p - vec2(bandX, 0.10), bandN)) - 0.035));
    lay(acc, vec3(1.0), inner * flash);
    vec3 eye = (gTel && flash < 0.5) ? WARN : vec3(1.0);
    lay(acc, eye, cov(sdEll(p, c, vec2(0.045, 0.06 * sy))) * (1.0 - flash));
    lay(acc, black, strokeCov(abs(b), 0.045));
  }
  lay(acc, black, strokeCov(sdSeg(p, vec2(-0.07, 0.12), vec2(0.07, 0.12)), 0.03));
  vec3 m = vec3(0.133, 0.125, 0.118);
  lay(acc, m, strokeCov(sdSeg(p, vec2(0.0, -0.15), vec2(-0.09, -0.24)), 0.04));
  lay(acc, m, strokeCov(sdSeg(p, vec2(0.0, -0.15), vec2(0.09, -0.24)), 0.04));
}
// 13 E58 jump rope: > < chevron eyes, apricot nose plaster, D mouth with tongue
void face13(vec2 p, inout vec4 acc) {
  vec3 brown = vec3(0.231, 0.141, 0.086);
  lay(acc, vec3(0.949, 0.761, 0.604), cov(sdBox(p, vec2(0.0, -0.03), vec2(0.17, 0.045), 0.02)));
  if (gTel) {
    lay(acc, WARN, cov(sdEll(p, vec2(-0.16, 0.12), vec2(0.08))));
    lay(acc, WARN, cov(sdEll(p, vec2(0.16, 0.12), vec2(0.08))));
  } else {
    float k = 0.06 + 0.02 * sin(TAU * gTime);
    lay(acc, brown, strokeCov(min(sdSeg(p, vec2(-0.24, 0.12 + k), vec2(-0.10, 0.12)), sdSeg(p, vec2(-0.10, 0.12), vec2(-0.24, 0.12 - k))), 0.045));
    lay(acc, brown, strokeCov(min(sdSeg(p, vec2(0.24, 0.12 + k), vec2(0.10, 0.12)), sdSeg(p, vec2(0.10, 0.12), vec2(0.24, 0.12 - k))), 0.045));
  }
  float d = max(sdEll(p, vec2(0.0, -0.15), vec2(0.10, 0.09)), p.y + 0.15);
  lay(acc, vec3(0.20, 0.06, 0.08), cov(d));
  lay(acc, vec3(1.0, 0.56, 0.66), cov(sdEll(p, vec2(0.0, -0.21), vec2(0.05, 0.03))));
}
// 14 E59 milk: tall dot eyes, white milk moustache, plump apricot cheeks, small smile
void face14(vec2 p, inout vec4 acc) {
  float cr = gTel ? 0.09 : 0.07;
  vec3 cheek = vec3(0.949, 0.725, 0.627);
  lay(acc, cheek, cov(sdEll(p, vec2(-0.27, -0.08), vec2(cr))));
  lay(acc, cheek, cov(sdEll(p, vec2(0.27, -0.08), vec2(cr))));
  float sy = gTel ? 1.0 : mix(1.0, 0.15, blink(2.8));
  vec3 eye = gTel ? WARN : vec3(0.231, 0.141, 0.086);
  lay(acc, eye, cov(sdEll(p, vec2(-0.13, 0.10), vec2(0.045, 0.07 * sy))));
  lay(acc, eye, cov(sdEll(p, vec2(0.13, 0.10), vec2(0.045, 0.07 * sy))));
  lay(acc, vec3(0.98, 0.98, 0.965), cov(sdBox(p, vec2(0.0, -0.09), vec2(0.15, 0.04), 0.035)));
  lay(acc, vec3(0.165, 0.102, 0.102), strokeCov(sdArc(p, vec2(0.0, -0.18), 0.05, 1.0, -1.0), 0.035));
}
// 15 E60 drain: glowing yellow eyes, dark ring mouth, water line across the chin
void face15(vec2 p, inout vec4 acc) {
  float sy = gTel ? 1.0 : mix(1.0, 0.15, blink(6.0));
  vec3 eye = gTel ? WARN : vec3(1.0, 0.878, 0.29);
  for (int i = 0; i < 2; i++) {
    vec2 c = vec2(i == 0 ? -0.14 : 0.14, 0.10);
    float d = sdEll(p, c, vec2(0.08, 0.08 * sy));
    lay(acc, eye, 0.3 * (1.0 - smoothstep(0.0, 0.05, d)));
    lay(acc, eye, cov(d));
  }
  lay(acc, vec3(0.102, 0.063, 0.094), strokeCov(abs(sdEll(p, vec2(0.0, -0.13), vec2(0.08, 0.06))), 0.03));
  float level = gTel ? mix(-0.27, -0.6, gTele) : -0.27;
  float wave = level + 0.02 * sin(p.x * 18.0 + gTime * 3.0);
  lay(acc, vec3(0.373, 0.722, 0.847), 0.85 * cov(p.y - wave));
}

void main() {
  gTime = vFace.y; gTel = vFace.z > 0.5; gTele = clamp(vFace.w, 0.0, 1.0);
  vec2 p = vUv - 0.5;
  p.x *= vAux.x;
  vec4 acc = vec4(0.0);
  int id = int(vFace.x + 0.5);
  if (id == 1) face1(p, acc);
  else if (id == 2) face2(p, acc);
  else if (id == 3) face3(p, acc);
  else if (id == 4) face4(p, acc);
  else if (id == 5) face5(p, acc);
  else if (id == 6) face6(p, acc);
  else if (id == 7) face7(p, acc);
  else if (id == 8) face8(p, acc);
  else if (id == 9) face9(p, acc);
  else if (id == 10) face10(p, acc);
  else if (id == 11) face11(p, acc);
  else if (id == 12) face12(p, acc);
  else if (id == 13) face13(p, acc);
  else if (id == 14) face14(p, acc);
  else if (id == 15) face15(p, acc);
  if (acc.a < 0.004) discard;
  acc.rgb = mix(acc.rgb, vec3(1.0), clamp(vAux.y, 0.0, 1.0) * 0.8);
  gl_FragColor = vec4(acc.rgb, acc.a);
}
`

export const PROJECTILE_FACE_COUNT = 15

// 소프트 알파(alphaTest 아님), depthWrite 끔, polygonOffset. renderOrder 0.5는 호출자가 준다.
export function createProjectileZombieFaceMaterial() {
  const material = new THREE.ShaderMaterial({
    vertexShader: PROJECTILE_FACE_VERTEX_SHADER,
    fragmentShader: PROJECTILE_FACE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
    side: THREE.FrontSide,
  })
  material.name = 'projectileZombieFace'
  return material
}
