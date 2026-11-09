// Stage 1~4 보스(B01~B04) 절차적 얼굴 — E07 "절차적 그리기"(SDF 셰이더) 표준.
//
// 왜 텍스처 평면을 버렸나(2026-11-08 Terry: "보스 얼굴 텍스쳐가 머리안면 메시 밖으로 나간 문제"):
//  - 예전 얼굴은 머리 박스 앞면 크기 그대로의 불투명 사진 평면이었고 depthTest=false였다.
//    그래서 (1) 모서리를 깎은(chamfer) 머리 실루엣보다 평면 네 귀퉁이가 튀어나왔고,
//    (2) 앞을 지나가는 물체·팔·넥커치프 위에, 옆으로 돈 머리의 옆면 위에 얼굴이 덧그려졌고,
//    (3) 조명을 받지 않는 평면 피부색이 툰 셰이딩된 머리와 달라 스티커처럼 보였다.
//  - Studio 보스 얼굴 레시피(BossFacePartsOverlay)는 그 위에 머리 크기 평면을 하나 더 띄워
//    두 번째 이목구비를 겹쳐 그렸다.
//
// 지금 규칙:
//  - 얼굴 평면은 머리 블록(ZBlock)의 자식이다. 머리 블록이 Studio에서 움직이거나 스케일돼도
//    얼굴은 같은 변환을 받는다.
//  - 평면 크기 = 머리 박스 앞면에서 chamfer 반경을 뺀 "평평한 앞면"(getBossFaceFlatFrontSize).
//    셰이더가 그 안쪽 inset 마스크 밖은 alpha 0으로 잘라, 어떤 픽셀도 머리 실루엣을 넘지 않는다.
//  - depthTest는 켜 둔다(기본값). 앞을 가리는 물체/머리 옆면에 정상적으로 가려진다.
//  - 피부는 그리지 않는다(feature-only alpha) — 머리 블록의 툰 셰이딩 피부가 그대로 보인다.
//  - Studio 보스 얼굴 레시피가 있으면 같은 표면 셰이더 안에서 눈썹·눈·코·입 4개 범주만 레시피
//    모양으로 바꾼다(정체성 소품 — 안경·머리띠·실밥·상처 — 은 유지). 레시피 모양은 예전 오버레이와
//    같은 물리 좌표(레시피 레이아웃 크기 기준)라 Studio 얼굴 그리드 미리보기와 위치가 같다.
//  - 레시피 출처 우선순위: 명시 prop(Studio 미리보기 초안) > StudioTuningSnapshotProvider(타이틀
//    동결 스냅샷) > Firebase 런타임. 스냅샷 안에서는 런타임 값을 절대 읽지 않는다.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BOSS_FACE_RECIPES_EVENT,
  getBossFacePartIndex,
  loadBossFaceRecipes,
  normalizeBossFaceRecipe,
} from '../lib/bossFaceParts.js'
import { useStudioTuningSnapshot } from './StudioTunedGroup.jsx'

const disableRaycast = () => null

// lib/toon.js getCachedChamferedBoxGeo(w,h,d,1)의 기본 radiusRatio. 반경 = min(w,h,d) * 0.14.
export const BOSS_HEAD_CHAMFER_RATIO = 0.14

// headSize: ZombieMesh 머리 블록 크기(그대로). recipeSize: 예전 레시피 오버레이 평면 크기 —
// 레시피 모양의 물리 좌표를 그대로 유지하려고만 쓴다(그 평면은 더 이상 존재하지 않는다).
export const BOSS_PROCEDURAL_FACE_SPECS = Object.freeze({
  B01: Object.freeze({ name: 'b01MathTeacherProceduralFace', headSize: Object.freeze([0.58, 0.50, 0.48]), recipeSize: Object.freeze([0.58, 0.50]) }),
  B02: Object.freeze({ name: 'b02Stage2BossProceduralFace', headSize: Object.freeze([0.58, 0.50, 0.48]), recipeSize: Object.freeze([0.58, 0.50]) }),
  B03: Object.freeze({ name: 'b03PeTeacherProceduralFace', headSize: Object.freeze([0.56, 0.48, 0.44]), recipeSize: Object.freeze([0.56, 0.48]) }),
  B04: Object.freeze({ name: 'chefProceduralFace', headSize: Object.freeze([0.66, 0.48, 0.52]), recipeSize: Object.freeze([0.66, 0.48]) }),
})

// 표면에서 띄우는 거리. 깊이 싸움은 polygonOffset이 막고, 이 값은 패럴랙스가 보이지 않게 작다.
export const BOSS_FACE_SURFACE_LIFT = 0.0015

export function getBossFaceChamferRadius(headSize) {
  const minAxis = Math.max(0.001, Math.min(...headSize))
  return Math.min(minAxis * BOSS_HEAD_CHAMFER_RATIO, minAxis * 0.45)
}

// 머리 박스 앞면 중 chamfer로 깎이지 않은 평평한 부분. 얼굴 평면은 이 크기를 넘지 않는다.
export function getBossFaceFlatFrontSize(headSize) {
  const r = getBossFaceChamferRadius(headSize)
  return [headSize[0] - 2 * r, headSize[1] - 2 * r]
}

export function getBossFaceLayout(bossType) {
  const spec = BOSS_PROCEDURAL_FACE_SPECS[bossType]
  if (!spec) return null
  return {
    name: spec.name,
    size: getBossFaceFlatFrontSize(spec.headSize),
    // 머리 블록(ZBlock) 로컬 좌표: 블록 중심 원점, 앞면 z = depth/2.
    position: [0, 0, spec.headSize[2] / 2 + BOSS_FACE_SURFACE_LIFT],
    recipeSize: spec.recipeSize,
  }
}

const FACE_VERTEX_SHADER = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// 공통: 미터 단위 SDF + fwidth 안티에일리어싱(B10 교감 얼굴과 같은 커널),
// 레시피 4범주 모양(예전 BossFacePartsOverlay 셰이더와 같은 모양·좌표, UV 중심 공간).
const FACE_COMMON_GLSL = /* glsl */`
uniform float uTime;
uniform vec2 uSize;
uniform vec2 uRecipeSize;
uniform float uRecipeOn;
uniform int uBrow;
uniform int uEye;
uniform int uNose;
uniform int uMouth;
varying vec2 vUv;

float cov(float d) { float a = max(fwidth(d), 1e-5) * 0.75; return 1.0 - smoothstep(-a, a, d); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float sdEll(vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return (length(q) - 1.0) * min(r.x, r.y); }
float sdBox(vec2 p, vec2 c, vec2 h) { vec2 d = abs(p - c) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdRBox(vec2 p, vec2 c, vec2 h, float r) { return sdBox(p, c, h - vec2(r)) - r; }
vec2 rot2(vec2 p, vec2 c, float a) { vec2 q = p - c; float s = sin(a), k = cos(a); return c + vec2(k * q.x + s * q.y, -s * q.x + k * q.y); }
float fill(float d) { return cov(d); }
float line(vec2 p, vec2 a, vec2 b, float w) { return cov(sdSeg(p, a, b) - w); }
float ring(float d, float w) { return cov(abs(d) - w); }

// 레이어 합성: 위에 올린 색이 아래를 덮고, alpha는 누적 최대.
void lay(inout vec3 col, inout float alpha, vec3 c, float m) { col = mix(col, c, m); alpha = max(alpha, m); }
// 반투명 음영(썩은 반점·눈 밑 그늘): 덮은 만큼만 alpha를 올린다.
void tint(inout vec3 col, inout float alpha, vec3 c, float m) { col = mix(col, c, m / max(alpha + m, 1e-4)); alpha = max(alpha, m); }

float rCircle(vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return 1.0 - smoothstep(0.76, 1.0, dot(q, q)); }
float rLine(vec2 p, vec2 a, vec2 b, float w) { vec2 ab = b - a; float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0); return 1.0 - smoothstep(w * 0.72, w, length(p - (a + ab * h))); }
float rArcSmile(vec2 p, vec2 c, vec2 r, float startY, float w) { float k = 1.0 - smoothstep(w, w + 0.012, abs(length((p - c) / r) - 1.0)); return k * step(p.y, startY); }

float recipeBrow(vec2 p) {
  if (uBrow == 1) return rLine(p, vec2(-0.23, 0.19), vec2(-0.06, 0.13), 0.018) + rLine(p, vec2(0.06, 0.13), vec2(0.23, 0.19), 0.018);
  if (uBrow == 2) return rLine(p, vec2(-0.23, 0.14), vec2(-0.08, 0.20), 0.018) + rLine(p, vec2(0.08, 0.20), vec2(0.23, 0.14), 0.018);
  if (uBrow == 3) return rLine(p, vec2(-0.22, 0.17), vec2(-0.06, 0.17), 0.017) + rLine(p, vec2(0.06, 0.17), vec2(0.22, 0.17), 0.017);
  if (uBrow == 4) return rLine(p, vec2(-0.23, 0.17), vec2(-0.16, 0.20), 0.015) + rLine(p, vec2(-0.16, 0.20), vec2(-0.07, 0.16), 0.015) + rLine(p, vec2(0.07, 0.16), vec2(0.16, 0.20), 0.015) + rLine(p, vec2(0.16, 0.20), vec2(0.23, 0.17), 0.015);
  return rLine(p, vec2(-0.22, 0.15), vec2(-0.07, 0.18), 0.018) + rLine(p, vec2(0.07, 0.18), vec2(0.22, 0.15), 0.018);
}
float recipeEye(vec2 p) {
  float blink = pow(max(0.0, sin(uTime * 0.62)), 24.0);
  if (uEye == 1) return rLine(p, vec2(-0.22, 0.06), vec2(-0.08, 0.08), 0.018) + rLine(p, vec2(0.08, 0.08), vec2(0.22, 0.06), 0.018);
  if (uEye == 2) return rLine(p, vec2(-0.21, 0.06), vec2(-0.08, 0.06), 0.015) + rCircle(p, vec2(-0.145, 0.06), vec2(0.075, mix(0.055, 0.010, blink))) * 0.65 + rLine(p, vec2(0.08, 0.06), vec2(0.21, 0.06), 0.015) + rCircle(p, vec2(0.145, 0.06), vec2(0.075, mix(0.055, 0.010, blink))) * 0.65;
  if (uEye == 3) return rLine(p, vec2(-0.205, 0.115), vec2(-0.085, -0.005), 0.017) + rLine(p, vec2(-0.205, -0.005), vec2(-0.085, 0.115), 0.017) + rLine(p, vec2(0.085, 0.115), vec2(0.205, -0.005), 0.017) + rLine(p, vec2(0.085, -0.005), vec2(0.205, 0.115), 0.017);
  if (uEye == 4) return rLine(p, vec2(-0.22, 0.075), vec2(-0.08, 0.04), 0.017) + rLine(p, vec2(0.08, 0.04), vec2(0.22, 0.075), 0.017);
  return rCircle(p, vec2(-0.145, 0.06), vec2(0.044, mix(0.052, 0.010, blink))) + rCircle(p, vec2(0.145, 0.06), vec2(0.044, mix(0.052, 0.010, blink)));
}
float recipeNose(vec2 p) {
  if (uNose == 1) return rCircle(p, vec2(0.0, -0.04), vec2(0.030, 0.025));
  if (uNose == 2) return rLine(p, vec2(0.0, 0.035), vec2(-0.045, -0.06), 0.014) + rLine(p, vec2(-0.045, -0.06), vec2(0.045, -0.055), 0.014);
  if (uNose == 3) return rLine(p, vec2(0.005, 0.04), vec2(0.005, -0.075), 0.014) + rLine(p, vec2(0.005, -0.075), vec2(0.055, -0.07), 0.012);
  if (uNose == 4) return rCircle(p, vec2(-0.035, -0.035), vec2(0.024, 0.020)) + rCircle(p, vec2(0.035, -0.035), vec2(0.024, 0.020));
  return rLine(p, vec2(0.02, 0.05), vec2(-0.02, -0.06), 0.014) + rLine(p, vec2(-0.02, -0.06), vec2(0.038, -0.078), 0.014);
}
float recipeMouth(vec2 p) {
  if (uMouth == 1) return rLine(p, vec2(-0.17, -0.18), vec2(-0.05, -0.205), 0.018) + rLine(p, vec2(-0.05, -0.205), vec2(0.06, -0.185), 0.018) + rLine(p, vec2(0.06, -0.185), vec2(0.18, -0.215), 0.018);
  if (uMouth == 2) return rCircle(p, vec2(0.0, -0.18), vec2(0.075, 0.095));
  if (uMouth == 3) return rLine(p, vec2(-0.18, -0.16), vec2(-0.10, -0.21), 0.017) + rLine(p, vec2(-0.10, -0.21), vec2(-0.02, -0.16), 0.017) + rLine(p, vec2(-0.02, -0.16), vec2(0.07, -0.21), 0.017) + rLine(p, vec2(0.07, -0.21), vec2(0.17, -0.16), 0.017);
  if (uMouth == 4) return rLine(p, vec2(-0.095, -0.17), vec2(0.095, -0.15), 0.017) + rLine(p, vec2(-0.095, -0.17), vec2(-0.13, -0.12), 0.014);
  return rArcSmile(p, vec2(0.0, -0.105), vec2(0.23, 0.17), -0.09, 0.020);
}
const vec3 RECIPE_INK = vec3(0.035, 0.018, 0.025);
void layRecipe(inout vec3 col, inout float alpha, vec2 p) {
  vec2 q = p / uRecipeSize;
  float ink = clamp(recipeBrow(q) + recipeEye(q) + recipeNose(q) + recipeMouth(q), 0.0, 1.0);
  lay(col, alpha, RECIPE_INK, ink);
}

float blinkAmount(float speed, float phase) { return pow(max(0.0, sin(uTime * speed + phase)), 24.0); }

void identityFace(inout vec3 col, inout float alpha, vec2 p, bool features);

void main() {
  vec2 p = (vUv - 0.5) * uSize;
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  bool recipe = uRecipeOn > 0.5;
  identityFace(col, alpha, p, !recipe);
  if (recipe) layRecipe(col, alpha, p);
  // 평평한 앞면 안쪽(inset) 밖은 그리지 않는다 — 머리 실루엣을 넘는 픽셀이 생길 수 없다.
  float inside = cov(sdBox(p, vec2(0.0), uSize * 0.5 - vec2(0.004)));
  gl_FragColor = vec4(col, alpha * inside);
}
`

// B01 수학선생: 두꺼운 검정 직사각 뿔테(옆으로 뻗는 다리), 각진 눈썹, 왼눈 반쯤 감김·오른눈 부릅,
// 적갈색 네모 입 + 앞니 하나, 썩은 반점과 금. 위쪽(y>0.16)은 3D 머리카락이 가린다.
const B01_FACE_GLSL = /* glsl */`
void identityFace(inout vec3 col, inout float alpha, vec2 p, bool features) {
  vec3 ink = vec3(0.07, 0.06, 0.05);
  tint(col, alpha, vec3(0.26, 0.36, 0.16), fill(sdEll(p, vec2(-0.165, -0.085), vec2(0.032, 0.026))) * 0.75);
  tint(col, alpha, vec3(0.26, 0.36, 0.16), fill(sdEll(p, vec2(0.175, 0.115), vec2(0.026, 0.022))) * 0.75);
  float cracks = max(max(line(p, vec2(-0.205, 0.105), vec2(-0.165, 0.125), 0.003), line(p, vec2(-0.165, 0.125), vec2(-0.135, 0.112), 0.003)),
    max(max(line(p, vec2(0.125, -0.115), vec2(0.155, -0.14), 0.003), line(p, vec2(0.155, -0.14), vec2(0.19, -0.128), 0.003)), line(p, vec2(0.155, -0.14), vec2(0.15, -0.172), 0.003)));
  lay(col, alpha, vec3(0.20, 0.24, 0.14), cracks);
  if (features) {
    lay(col, alpha, vec3(0.10, 0.08, 0.06), fill(sdRBox(p, vec2(-0.1, 0.082), vec2(0.072, 0.017), 0.004)));
    lay(col, alpha, vec3(0.10, 0.08, 0.06), fill(sdRBox(rot2(p, vec2(0.1, 0.09), 0.05), vec2(0.1, 0.09), vec2(0.07, 0.016), 0.004)));
    float blink = blinkAmount(0.55, 0.0);
    // 왼눈: 처진 눈꺼풀로 반쯤 감긴 크림색 눈
    float lEye = fill(sdBox(p, vec2(-0.1, 0.012), vec2(0.055, mix(0.02, 0.004, blink))));
    lay(col, alpha, vec3(0.86, 0.86, 0.68), lEye);
    lay(col, alpha, vec3(0.04), fill(sdBox(p, vec2(-0.096, 0.008), vec2(0.011, mix(0.011, 0.003, blink)))) * lEye);
    lay(col, alpha, vec3(0.16, 0.20, 0.12), line(p, vec2(-0.155, 0.034), vec2(-0.045, 0.03), 0.006));
    // 오른눈: 부릅뜬 흰자 + 작은 네모 동공
    float rEye = fill(sdBox(p, vec2(0.1, 0.016), vec2(0.056, mix(0.03, 0.004, blink))));
    lay(col, alpha, vec3(0.95, 0.95, 0.90), rEye);
    lay(col, alpha, vec3(0.03), fill(sdBox(p, vec2(0.1, 0.013), vec2(0.011, mix(0.011, 0.003, blink)))) * rEye);
    // 입: 적갈색 네모 + 윗앞니 하나 + 침 방울
    lay(col, alpha, vec3(0.24, 0.05, 0.05), fill(sdRBox(p, vec2(0.0, -0.105), vec2(0.052, 0.034), 0.005)));
    lay(col, alpha, vec3(0.94, 0.91, 0.78), fill(sdBox(p, vec2(0.006, -0.08), vec2(0.016, 0.01))));
    lay(col, alpha, vec3(0.42, 0.55, 0.22), line(p, vec2(-0.03, -0.138), vec2(-0.03, -0.152), 0.004));
    lay(col, alpha, vec3(0.42, 0.55, 0.22), line(p, vec2(0.025, -0.138), vec2(0.025, -0.158), 0.004));
  }
  // 두꺼운 검정 직사각 안경: 렌즈 테 + 브리지 + 옆으로 뻗는 다리(얼굴 가장자리에서 잘림)
  float frames = max(ring(sdBox(p, vec2(-0.1, 0.018), vec2(0.078, 0.042)), 0.0065), ring(sdBox(p, vec2(0.1, 0.018), vec2(0.078, 0.042)), 0.0065));
  frames = max(frames, line(p, vec2(-0.022, 0.03), vec2(0.022, 0.03), 0.006));
  frames = max(frames, max(line(p, vec2(-0.178, 0.03), vec2(-0.24, 0.03), 0.006), line(p, vec2(0.178, 0.03), vec2(0.24, 0.03), 0.006)));
  lay(col, alpha, ink, frames);
}
`

// B02 Stage 2 보스: 파란 피부(머리 블록 색), 화난 사선 눈썹, 검정 직사각 안경 + 옆 다리,
// 흰자 + 네모 동공, 적갈 사다리꼴 입 + 앞니 하나, 볼의 세로 선과 픽셀 반점.
const B02_FACE_GLSL = /* glsl */`
void identityFace(inout vec3 col, inout float alpha, vec2 p, bool features) {
  vec3 shade = vec3(0.24, 0.40, 0.62);
  tint(col, alpha, shade, fill(sdBox(p, vec2(-0.165, -0.06), vec2(0.009))) * 0.8);
  tint(col, alpha, shade, fill(sdBox(p, vec2(-0.14, -0.085), vec2(0.007))) * 0.8);
  tint(col, alpha, shade, fill(sdBox(p, vec2(0.17, -0.105), vec2(0.009))) * 0.8);
  lay(col, alpha, vec3(0.20, 0.30, 0.48), max(line(p, vec2(-0.112, -0.07), vec2(-0.112, -0.105), 0.003), line(p, vec2(0.112, -0.07), vec2(0.112, -0.105), 0.003)));
  if (features) {
    vec3 brow = vec3(0.15, 0.10, 0.08);
    lay(col, alpha, brow, line(p, vec2(-0.16, 0.112), vec2(-0.055, 0.072), 0.014));
    lay(col, alpha, brow, line(p, vec2(0.055, 0.072), vec2(0.16, 0.112), 0.014));
    float blink = blinkAmount(0.58, 1.3);
    float lEye = fill(sdBox(p, vec2(-0.096, 0.012), vec2(0.046, mix(0.024, 0.004, blink))));
    float rEye = fill(sdBox(p, vec2(0.096, 0.012), vec2(0.046, mix(0.024, 0.004, blink))));
    lay(col, alpha, vec3(0.93, 0.94, 0.95), max(lEye, rEye));
    float pupils = max(fill(sdBox(p, vec2(-0.086, 0.012), vec2(0.013, mix(0.013, 0.003, blink)))), fill(sdBox(p, vec2(0.086, 0.012), vec2(0.013, mix(0.013, 0.003, blink)))));
    lay(col, alpha, vec3(0.03), pupils * max(lEye, rEye));
    // 사다리꼴 입(아래가 넓다) + 윗앞니
    vec2 m = p - vec2(0.0, -0.1);
    float mouth = fill(sdRBox(vec2(m.x * (1.0 + (m.y + 0.03) * 4.0), m.y), vec2(0.0), vec2(0.046, 0.03), 0.006));
    lay(col, alpha, vec3(0.28, 0.04, 0.05), mouth);
    lay(col, alpha, vec3(0.96), fill(sdBox(p, vec2(0.0, -0.08), vec2(0.012, 0.01))));
  }
  float frames = max(ring(sdBox(p, vec2(-0.098, 0.016), vec2(0.072, 0.04)), 0.0075), ring(sdBox(p, vec2(0.098, 0.016), vec2(0.072, 0.04)), 0.0075));
  frames = max(frames, line(p, vec2(-0.026, 0.026), vec2(0.026, 0.026), 0.007));
  frames = max(frames, max(line(p, vec2(-0.17, 0.026), vec2(-0.24, 0.026), 0.007), line(p, vec2(0.17, 0.026), vec2(0.24, 0.026), 0.007)));
  lay(col, alpha, vec3(0.05), frames);
}
`

// B03 몸짱 체육교사: 빨강·흰 줄무늬 머리띠, 두꺼운 화난 눈썹, 검은 눈구멍 + 노란 동공,
// 깨진 노란 이빨의 으르렁 입, 볼의 핏자국, 목의 빨간 끈 + 은색 호루라기.
const B03_FACE_GLSL = /* glsl */`
void identityFace(inout vec3 col, inout float alpha, vec2 p, bool features) {
  vec3 red = vec3(0.70, 0.10, 0.10);
  // 머리띠(이마 가로 띠): 흰 바탕 + 빨간 줄 두 개
  float band = fill(sdBox(p, vec2(0.0, 0.146), vec2(0.24, 0.032)));
  lay(col, alpha, vec3(0.93, 0.91, 0.86), band);
  lay(col, alpha, red, band * max(fill(sdBox(p, vec2(0.0, 0.158), vec2(0.24, 0.006))), fill(sdBox(p, vec2(0.0, 0.134), vec2(0.24, 0.006)))));
  lay(col, alpha, vec3(0.55, 0.05, 0.06), line(p, vec2(0.15, 0.112), vec2(0.152, 0.085), 0.004));
  // 볼의 핏자국
  vec3 blood = vec3(0.55, 0.07, 0.07);
  lay(col, alpha, blood, max(line(p, vec2(-0.19, -0.02), vec2(-0.155, -0.075), 0.004), line(p, vec2(-0.18, -0.045), vec2(-0.16, -0.065), 0.003)));
  lay(col, alpha, blood, max(line(p, vec2(0.185, -0.005), vec2(0.165, -0.05), 0.004), line(p, vec2(0.165, -0.05), vec2(0.168, -0.085), 0.003)));
  if (features) {
    vec3 ink = vec3(0.04, 0.04, 0.04);
    lay(col, alpha, ink, line(p, vec2(-0.165, 0.09), vec2(-0.045, 0.058), 0.017));
    lay(col, alpha, ink, line(p, vec2(0.045, 0.058), vec2(0.165, 0.09), 0.017));
    // 눈 밑 그늘 + 검은 눈구멍 + 노랗게 빛나는 동공
    tint(col, alpha, vec3(0.25, 0.33, 0.20), max(fill(sdEll(p, vec2(-0.1, 0.008), vec2(0.072, 0.05))), fill(sdEll(p, vec2(0.1, 0.008), vec2(0.072, 0.05)))) * 0.6);
    float blink = blinkAmount(0.5, 2.1);
    float sockets = max(fill(sdEll(p, vec2(-0.1, 0.014), vec2(0.06, mix(0.038, 0.006, blink)))), fill(sdEll(p, vec2(0.1, 0.014), vec2(0.06, mix(0.038, 0.006, blink)))));
    lay(col, alpha, ink, sockets);
    float glow = max(fill(sdEll(p, vec2(-0.082, 0.02), vec2(0.012, mix(0.012, 0.003, blink)))), fill(sdEll(p, vec2(0.082, 0.02), vec2(0.012, mix(0.012, 0.003, blink)))));
    lay(col, alpha, vec3(0.98, 0.92, 0.45), glow * sockets);
    // 으르렁 입 + 깨진 노란 이빨 + 핏방울
    float mouth = fill(sdRBox(p, vec2(0.0, -0.078), vec2(0.072, 0.036), 0.012));
    lay(col, alpha, ink, mouth);
    vec3 tooth = vec3(0.93, 0.85, 0.55);
    float teeth = max(max(fill(sdBox(p, vec2(-0.048, -0.054), vec2(0.011, 0.012))), fill(sdBox(p, vec2(-0.018, -0.052), vec2(0.009, 0.01)))), fill(sdBox(p, vec2(0.028, -0.055), vec2(0.012, 0.013))));
    teeth = max(teeth, max(fill(sdBox(p, vec2(-0.03, -0.104), vec2(0.011, 0.01))), fill(sdBox(p, vec2(0.036, -0.102), vec2(0.012, 0.012)))));
    lay(col, alpha, tooth, teeth * mouth);
    lay(col, alpha, blood, line(p, vec2(0.046, -0.06), vec2(0.046, -0.098), 0.003));
  }
  // 목의 빨간 끈(턱 아래로 늘어진 호) + 은색 호루라기
  float cord = ring(sdEll(p, vec2(0.0, -0.1), vec2(0.235, 0.07)), 0.0035) * step(p.y, -0.128);
  lay(col, alpha, vec3(0.62, 0.08, 0.08), cord);
  float whistle = fill(sdRBox(p, vec2(0.128, -0.156), vec2(0.022, 0.015), 0.007));
  lay(col, alpha, vec3(0.30, 0.31, 0.33), fill(sdRBox(p, vec2(0.128, -0.156), vec2(0.025, 0.018), 0.008)));
  lay(col, alpha, vec3(0.78, 0.79, 0.80), whistle);
  lay(col, alpha, vec3(0.30, 0.31, 0.33), fill(sdEll(p, vec2(0.12, -0.155), vec2(0.006, 0.005))));
}
`

// B04 주방장: 두꺼운 검정 눈썹, 졸린 반쯤 감긴 눈 + 눈 밑 그늘, 진한 녹색 코 + 콧구멍,
// 크게 웃는 검은 입 + 듬성듬성한 크림색 이빨 + 침, 이마·볼 실밥.
const B04_FACE_GLSL = /* glsl */`
void identityFace(inout vec3 col, inout float alpha, vec2 p, bool features) {
  vec3 stitch = vec3(0.22, 0.33, 0.16);
  float st = line(p, vec2(-0.245, 0.135), vec2(-0.175, 0.165), 0.004);
  for (int i = 0; i < 4; i++) { float t = float(i) / 3.0; vec2 c = mix(vec2(-0.238, 0.138), vec2(-0.182, 0.162), t); st = max(st, line(p, c + vec2(-0.008, 0.012), c + vec2(0.008, -0.012), 0.0035)); }
  st = max(st, line(p, vec2(0.175, -0.155), vec2(0.245, -0.12), 0.004));
  for (int i = 0; i < 4; i++) { float t = float(i) / 3.0; vec2 c = mix(vec2(0.182, -0.152), vec2(0.238, -0.124), t); st = max(st, line(p, c + vec2(-0.008, 0.012), c + vec2(0.008, -0.012), 0.0035)); }
  lay(col, alpha, stitch, st);
  if (features) {
    vec3 ink = vec3(0.06, 0.06, 0.05);
    lay(col, alpha, ink, fill(sdRBox(p, vec2(-0.12, 0.112), vec2(0.088, 0.02), 0.004)));
    lay(col, alpha, ink, fill(sdRBox(rot2(p, vec2(0.12, 0.112), -0.06), vec2(0.12, 0.112), vec2(0.088, 0.02), 0.004)));
    // 눈 밑 그늘
    tint(col, alpha, vec3(0.30, 0.42, 0.20), max(fill(sdEll(p, vec2(-0.12, 0.022), vec2(0.082, 0.04))), fill(sdEll(p, vec2(0.12, 0.022), vec2(0.082, 0.04)))) * 0.55);
    // 졸린 눈: 위가 눈꺼풀 선으로 잘린 크림색 반달 + 반쯤 가려진 동공
    float blink = blinkAmount(0.45, 0.7);
    float lid = mix(0.046, 0.016, blink);
    float lS = fill(sdEll(p, vec2(-0.12, 0.034), vec2(0.072, 0.034))) * step(p.y, lid);
    float rS = fill(sdEll(p, vec2(0.12, 0.034), vec2(0.072, 0.034))) * step(p.y, lid);
    lay(col, alpha, vec3(0.93, 0.89, 0.70), max(lS, rS));
    float pupils = max(fill(sdEll(p, vec2(-0.11, 0.036), vec2(0.026, 0.026))), fill(sdEll(p, vec2(0.11, 0.036), vec2(0.026, 0.026))));
    lay(col, alpha, ink, pupils * max(lS, rS));
    lay(col, alpha, ink, max(line(p, vec2(-0.196, lid - 0.004), vec2(-0.044, lid + 0.002), 0.006), line(p, vec2(0.044, lid + 0.002), vec2(0.196, lid - 0.004), 0.006)));
    lay(col, alpha, ink, max(ring(sdEll(p, vec2(-0.12, 0.034), vec2(0.072, 0.034)), 0.003), ring(sdEll(p, vec2(0.12, 0.034), vec2(0.072, 0.034)), 0.003)) * step(p.y, lid));
    // 코: 진한 녹색 둥근 코 + 콧구멍
    tint(col, alpha, vec3(0.30, 0.44, 0.22), fill(sdEll(p, vec2(0.0, -0.022), vec2(0.034, 0.042))) * 0.85);
    lay(col, alpha, ink, max(fill(sdEll(p, vec2(-0.016, -0.05), vec2(0.009, 0.006))), fill(sdEll(p, vec2(0.016, -0.05), vec2(0.009, 0.006)))));
    // 크게 웃는 입: 위가 평평한 아래 반타원 + 입꼬리 보조선
    float grin = fill(sdEll(p, vec2(0.0, -0.075), vec2(0.18, 0.068))) * step(p.y, -0.073);
    lay(col, alpha, ink, grin);
    lay(col, alpha, ink, max(line(p, vec2(-0.18, -0.073), vec2(-0.2, -0.058), 0.006), line(p, vec2(0.18, -0.073), vec2(0.2, -0.058), 0.006)));
    vec3 tooth = vec3(0.93, 0.89, 0.70);
    float teeth = max(max(fill(sdBox(p, vec2(-0.105, -0.088), vec2(0.016, 0.013))), fill(sdBox(p, vec2(-0.062, -0.088), vec2(0.014, 0.012)))), max(fill(sdBox(p, vec2(0.05, -0.088), vec2(0.015, 0.013))), fill(sdBox(p, vec2(0.092, -0.09), vec2(0.016, 0.015)))));
    teeth = max(teeth, fill(sdBox(p, vec2(-0.02, -0.122), vec2(0.012, 0.01))));
    lay(col, alpha, tooth, teeth * grin);
    lay(col, alpha, vec3(0.86, 0.95, 0.80), max(line(p, vec2(0.068, -0.135), vec2(0.068, -0.162), 0.005), line(p, vec2(0.058, -0.138), vec2(0.056, -0.152), 0.004)));
  }
}
`

export const BOSS_FACE_FRAGMENT_SHADERS = Object.freeze({
  B01: FACE_COMMON_GLSL + B01_FACE_GLSL,
  B02: FACE_COMMON_GLSL + B02_FACE_GLSL,
  B03: FACE_COMMON_GLSL + B03_FACE_GLSL,
  B04: FACE_COMMON_GLSL + B04_FACE_GLSL,
})

function readRuntimeRecipe(bossType) {
  try {
    return loadBossFaceRecipes()[bossType] ?? null
  } catch {
    return null
  }
}

// 레시피 출처 정본: 명시 prop > 스냅샷 provider(타이틀 동결본) > Firebase 런타임.
// 스냅샷 안에서는 런타임 구독 자체를 하지 않는다 — Firebase가 비었거나 다른 값이어도
// 타이틀 얼굴은 동결본 그대로다.
export function resolveBossFaceRecipe({ bossType, recipeOverride, snapshot, runtimeRecipe }) {
  if (recipeOverride !== undefined) return recipeOverride ? normalizeBossFaceRecipe(recipeOverride) : null
  if (snapshot) {
    const pinned = snapshot.bossFaceRecipes?.[bossType]
    return pinned ? normalizeBossFaceRecipe(pinned) : null
  }
  return runtimeRecipe ? normalizeBossFaceRecipe(runtimeRecipe) : null
}

export function useBossFaceRecipe(bossType, recipeOverride = undefined) {
  const snapshot = useStudioTuningSnapshot()
  const followRuntime = !snapshot && recipeOverride === undefined
  const [runtimeRecipe, setRuntimeRecipe] = useState(() => (followRuntime ? readRuntimeRecipe(bossType) : null))

  useEffect(() => {
    if (!followRuntime) return undefined
    const update = () => setRuntimeRecipe(readRuntimeRecipe(bossType))
    update()
    if (typeof window === 'undefined') return undefined
    window.addEventListener(BOSS_FACE_RECIPES_EVENT, update)
    return () => window.removeEventListener(BOSS_FACE_RECIPES_EVENT, update)
  }, [bossType, followRuntime])

  return useMemo(
    () => resolveBossFaceRecipe({ bossType, recipeOverride, snapshot, runtimeRecipe }),
    [bossType, recipeOverride, snapshot, runtimeRecipe],
  )
}

export default function BossProceduralFace({ bossType, recipe: recipeOverride = undefined }) {
  const layout = getBossFaceLayout(bossType)
  const recipe = useBossFaceRecipe(bossType, recipeOverride)
  const materialRef = useRef(null)
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSize: { value: [0, 0] },
    uRecipeSize: { value: [1, 1] },
    uRecipeOn: { value: 0 },
    uBrow: { value: 0 },
    uEye: { value: 0 },
    uNose: { value: 0 },
    uMouth: { value: 0 },
  }), [])

  uniforms.uSize.value = layout.size
  uniforms.uRecipeSize.value = layout.recipeSize
  uniforms.uRecipeOn.value = recipe ? 1 : 0
  uniforms.uBrow.value = recipe ? getBossFacePartIndex(recipe.brow) : 0
  uniforms.uEye.value = recipe ? getBossFacePartIndex(recipe.eye) : 0
  uniforms.uNose.value = recipe ? getBossFacePartIndex(recipe.nose) : 0
  uniforms.uMouth.value = recipe ? getBossFacePartIndex(recipe.mouth) : 0

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
  })

  return (
    <mesh
      name={layout.name}
      position={layout.position}
      renderOrder={3}
      raycast={disableRaycast}
      userData={{ studioNonFocusable: true, studioNonTunable: true, bossFaceRecipe: recipe }}
    >
      <planeGeometry args={layout.size} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={FACE_VERTEX_SHADER}
        fragmentShader={BOSS_FACE_FRAGMENT_SHADERS[bossType]}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-4}
        toneMapped={false}
      />
    </mesh>
  )
}
