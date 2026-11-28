// Sltera(슬테라) — '멜론마스크'가 만든 패러디 전기차. 무작위로 스테이지에 돌진해 좀비와 플레이어를
// 들이받는 이벤트용 비주얼. 게임플레이(매 판 스케줄·좀비 치기·로자리 피해)는 2026-11-07부터
// components/SlteraEvent.jsx + lib/slteraEvent.js가 담당한다. Terry 2026-10-31(v2):
//   낮고 넓은 매끈한 쐐기 실루엣, 그릴 없는 길게 내려앉은 코, 큰 바퀴 위로 둥글게 부푼 펜더,
//   짧은 뒤 데크, 검은 칵핏의 2인승 오픈톱, 메탈릭 실버 툰 차체 + 외곽선, 꼬리 전폭 한 줄 라이트바.
// 상표·패러디 안전: 실존 브랜드 로고·워드마크·배지·번호판 없음. 화면에 보이는 이름은 꼬리의 작은
// 'SLTERA' 하나뿐이다(제작사 '멜론마스크'는 데이터 라벨).
// 저예산 폴리곤: 옆모습 프로파일을 베벨 압출한 차체 + 타원 펜더 캡을 재질별로 병합한다.
// 지오메트리는 모듈 수준에서 한 번만 만들고 모든 인스턴스가 공유한다(언마운트 시 해제하지 않음).
// 외곽선: 법선 방향으로 부풀린 인버티드 헐(병합 메시 전체를 원점 기준으로 늘리지 않는다).
// 예고(1,400ms) 훅: telegraph(0..1) 또는 telegraphRef.current로 헤드램프·꼬리 라이트바가 맥동한다.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { getToonGradient, outlineMat } from '../lib/toon.js'

export const SLTERA_LABEL = 'Sltera'
export const SLTERA_MAKER_LABEL = '멜론마스크'
export const SLTERA_TELEGRAPH_MS = 1400

export const SLTERA_COLORS = Object.freeze({
  silver: 0xb7bec8,
  cockpit: 0x111216,
  seat: 0x1c1c22,
  glass: 0x26323e,
  // 운전자(양키): 피부 · 흰 코트 · 붉은 머리띠 · 검은 리젠트 머리 · 검은 선글라스
  skin: 0xf0c29a,
  coat: 0xf6f6f0,
  band: 0xd81e28,
  hair: 0x141418,
  shades: 0x0c0c12,
  lens: 0x18202c, // 선글라스 알: 테보다 살짝 푸른 어두운 유리
  glint: 0xe6eef8, // 알 위 작은 반짝임
  tire: 0x17171a,
  rim: 0x363b42,
  headlight: 0xeaf4ff,
  tailBar: 0xff2a2a,
})

// 차량 로컬 좌표: +Z = 앞(코), +Y = 위. 길이 약 3.7, 폭 약 1.9(펜더 포함), 높이 약 1.6(1.5배 운전자 리젠트 포함).
// 좀비(키 약 1.4)와 같은 로컬 스케일.

// 차체 옆모습(z, y): 뒤 바닥 → 앞 바닥은 직선, 코끝부터 꼬리까지 윗선은 매끈한 스플라인.
// 코는 길고 낮게 내려앉고(그릴 없음), 칵핏 벨트라인을 지나 짧은 뒤 데크와 거의 수직인 꼬리로 끝난다.
export const SLTERA_BODY_PROFILE = Object.freeze({
  bottomRear: [-1.62, 0.2],
  bottomFront: [1.62, 0.2],
  topLine: Object.freeze([
    [1.8, 0.25], [1.86, 0.33], [1.8, 0.41], [1.5, 0.49], [1.05, 0.57], [0.6, 0.64], [0.3, 0.68],
    [-0.2, 0.7], [-0.75, 0.71], [-1.15, 0.75], [-1.5, 0.77], [-1.7, 0.73], [-1.75, 0.55], [-1.71, 0.33],
  ]),
  width: 1.32,
  bevel: 0.06,
})

// 큰 바퀴: [key, x, y(=반지름), z, 지름, 폭]. 뒷바퀴가 조금 더 크고 넓다.
export const SLTERA_WHEELS = Object.freeze([
  ['wheelFL', 0.66, 0.37, 1.12, 0.74, 0.28],
  ['wheelFR', -0.66, 0.37, 1.12, 0.74, 0.28],
  ['wheelRL', 0.66, 0.39, -1.08, 0.78, 0.32],
  ['wheelRR', -0.66, 0.39, -1.08, 0.78, 0.32],
])

// 바퀴 위로 부푼 둥근 펜더(타원체 윗부분 캡): [key, center, radii]. 뒤 펜더(엉덩이)가 더 넓다.
export const SLTERA_FENDERS = Object.freeze([
  ['fenderFL', [0.66, 0.37, 1.12], [0.28, 0.47, 0.6]],
  ['fenderFR', [-0.66, 0.37, 1.12], [0.28, 0.47, 0.6]],
  ['fenderRL', [0.64, 0.39, -1.08], [0.32, 0.5, 0.66]],
  ['fenderRR', [-0.64, 0.39, -1.08], [0.32, 0.5, 0.66]],
])
const FENDER_THETA = Math.PI * 0.42

// 운전자 배율(Terry 2026-11-22 "운전자 1.5배"): 아래 SLTERA_DRIVER_BASE_PARTS는 원래(1배) 크기로 적은 값이고,
// 실제 파츠는 좌석 기준점(엉덩이 높이·등받이 앞면)을 중심으로 크기·위치를 함께 1.5배 한 값이다.
// 기준점이 등받이 앞면이라 커져도 등이 등받이를 뚫지 않고, 엉덩이는 좌석 높이에 그대로 앉는다.
export const SLTERA_DRIVER_SCALE = 1.5
export const SLTERA_DRIVER_PIVOT = Object.freeze([0.22, 0.74, -0.59])
function scaledSize(shape, size, k) {
  if (shape === 'capsule') return [size[0] * k, size[1] * k, ...size.slice(2)]
  if (shape === 'ball') return [size[0] * k, ...size.slice(1)]
  if (shape === 'ellip' || shape === 'cyl') return [size[0] * k, size[1] * k, size[2] * k, ...size.slice(3)]
  return size.map((v) => v * k)
}
function slteraDriverPart([key, shape, size, position, rotation, colorKey, outlined]) {
  const k = SLTERA_DRIVER_SCALE
  const pos = position.map((v, i) => SLTERA_DRIVER_PIVOT[i] + (v - SLTERA_DRIVER_PIVOT[i]) * k)
  return Object.freeze([key, shape, scaledSize(shape, size, k), pos, rotation, colorKey, outlined])
}

// 검은 칵핏 묶음(한 메시로 병합, 정점색): [key, shape, size, position, rotation, colorKey, outlined]
// shape: rbox(둥근 상자) | box | capsule([반지름, 길이, 캡 분할=2, 둘레=8]) | ball([반지름, 세분=1]) | ellip([rx, ry, rz, 세분=1])
//        | cyl([윗반지름, 아랫반지름, 높이, 둘레 분할=10])
export const SLTERA_DARK_PARTS = Object.freeze([
  ['cockpit', 'box', [0.9, 0.08, 1.16], [0, 0.745, -0.24], [0, 0, 0], 'cockpit', false],
  ['windshield', 'box', [1.12, 0.5, 0.035], [0, 0.835, 0.3], [-1.1, 0, 0], 'glass', true],
  ['seatL', 'rbox', [0.36, 0.44, 0.13], [0.22, 0.9, -0.66], [-0.22, 0, 0], 'seat', true],
  ['seatR', 'rbox', [0.36, 0.44, 0.13], [-0.22, 0.9, -0.66], [-0.22, 0, 0], 'seat', true],
  // 핸들은 커진 운전자 손에 맞춰 운전자와 같은 배율·같은 기준점으로 옮긴다(위 slteraDriverPart).
  slteraDriverPart(['steeringWheel', 'cyl', [0.085, 0.085, 0.02, 8], [0.22, 0.9, -0.2], [-1.0, 0, 0], 'seat', false]),
  ['diffuser', 'box', [1.0, 0.1, 0.08], [0, 0.24, -1.76], [0, 0, 0], 'cockpit', false],
])

// 팔다리: 두 관절 점(from → to)을 잇는 캡슐 한 줄을 모듈 로드 때 한 번 계산한다.
function limb(key, from, to, radius, colorKey) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const dir = b.clone().sub(a)
  const length = dir.length()
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()))
  const c = a.add(b).multiplyScalar(0.5)
  // 가는 팔이라 캡 분할 1·둘레 6이면 충분하다(삼각형 절약).
  return Object.freeze([key, 'capsule', [radius, length, 1, 6], [c.x, c.y, c.z], [e.x, e.y, e.z], colorKey, true])
}

// 운전석의 양키(Terry 2026-11-15): 앞으로 길게 튀어나온 검은 리젠트 + 붉은 머리띠(뒤로 날리는 꼬리 2가닥)
// + 깃을 세운 긴 흰 코트(자락이 좌석 뒤로 날림) + 선글라스. 한 팔은 핸들, 다른 팔은 문턱에 걸친 건들 자세.
// 일반적인 양키 스타일만 쓴다(특정 인물·기존 캐릭터 복제 아님). 게임에서는 차가 약 0.56배로 작아지므로
// 리젠트·머리띠·흰 어깨는 일부러 과장했다. 형식은 SLTERA_DARK_PARTS와 같고 같은 정점색 메시에 병합된다.
export const SLTERA_DRIVER_BASE_PARTS = Object.freeze([
  // 흰 코트: 넓은 어깨 상체 + 세운 깃 + 좌석 위로 뒤로 날리는 두 갈래 자락
  ['coatBody', 'ellip', [0.17, 0.16, 0.12], [0.22, 0.9, -0.47], [-0.15, 0, 0], 'coat', true],
  ['coatCollar', 'cyl', [0.108, 0.09, 0.085, 8], [0.22, 1.035, -0.455], [-0.12, 0, 0], 'coat', true],
  // (11-22 Terry: 머리띠 뒤로 떠 보이던 흰 코트 자락 판 두 장은 삭제했다.)
  // 팔: 안쪽 팔은 핸들 10시 방향, 바깥 팔은 문턱 위로 팔꿈치를 걸치고 손을 차 밖으로 늘어뜨린다.
  limb('armWheel', [0.09, 0.99, -0.45], [0.155, 0.945, -0.185], 0.042, 'coat'),
  ['handWheel', 'ball', [0.036, 0], [0.155, 0.945, -0.18], [0, 0, 0], 'skin', true],
  limb('armSillUpper', [0.36, 0.99, -0.47], [0.53, 0.8, -0.44], 0.044, 'coat'),
  limb('armSillFore', [0.53, 0.8, -0.44], [0.6, 0.77, -0.25], 0.04, 'coat'),
  ['handSill', 'ball', [0.036, 0], [0.61, 0.765, -0.22], [0, 0, 0], 'skin', true],
  // 머리: 피부 얼굴 + 선글라스, 뒤·옆을 덮는 검은 머리, 이마 앞으로 길게 뻗어 끝이 위로 말린 리젠트, 짧은 덕테일
  ['head', 'ball', [0.1], [0.22, 1.11, -0.44], [0, 0, 0], 'skin', true],
  // 선글라스(11-22 Terry "좀 더 선글라스 형태로"): 눈높이의 둥근 에비에이터 알 두 개(바깥 아래로 살짝 처짐)
  // + 가는 브리지 + 귀로 가는 다리 두 개 + 알마다 작은 반짝임. 조각이 작아 외곽선은 생략(검은 덩어리로 뭉개짐 방지).
  ['shadeLensL', 'ellip', [0.034, 0.027, 0.01, 1], [0.258, 1.103, -0.339], [0, 0.38, -0.22], 'lens', false],
  ['shadeLensR', 'ellip', [0.034, 0.027, 0.01, 1], [0.182, 1.103, -0.339], [0, -0.38, 0.22], 'lens', false],
  ['shadeBridge', 'box', [0.03, 0.007, 0.008], [0.22, 1.113, -0.333], [0, 0, 0], 'shades', false],
  ['shadeTempleL', 'box', [0.007, 0.008, 0.1], [0.316, 1.11, -0.39], [0, -0.2, 0], 'shades', false],
  ['shadeTempleR', 'box', [0.007, 0.008, 0.1], [0.124, 1.11, -0.39], [0, 0.2, 0], 'shades', false],
  ['shadeGlintL', 'ball', [0.007, 0], [0.272, 1.113, -0.329], [0, 0, 0], 'glint', false],
  ['shadeGlintR', 'ball', [0.007, 0], [0.196, 1.113, -0.329], [0, 0, 0], 'glint', false],
  ['hairCap', 'ellip', [0.106, 0.085, 0.1], [0.22, 1.16, -0.455], [0, 0, 0], 'hair', true],
  ['regent', 'ellip', [0.088, 0.072, 0.19], [0.22, 1.22, -0.27], [-0.18, 0, 0], 'hair', true],
  ['regentCurl', 'ellip', [0.08, 0.06, 0.065], [0.22, 1.27, -0.105], [-0.5, 0, 0], 'hair', true],
  ['duckTail', 'ellip', [0.06, 0.04, 0.075, 0], [0.22, 1.09, -0.56], [0.45, 0, 0], 'hair', true],
  // 붉은 머리띠(하치마키): 이마를 두른 띠 + 뒤통수 매듭 + 뒤로 날리는 꼬리 두 가닥(고정 포즈)
  ['headband', 'cyl', [0.115, 0.115, 0.036, 10], [0.22, 1.15, -0.445], [0, 0, 0], 'band', true],
  ['headbandKnot', 'ball', [0.032, 0], [0.22, 1.15, -0.565], [0, 0, 0], 'band', true],
  ['headbandTailUp', 'box', [0.055, 0.014, 0.22], [0.245, 1.175, -0.67], [0.3, -0.3, 0], 'band', true],
  ['headbandTailDown', 'box', [0.055, 0.014, 0.2], [0.195, 1.125, -0.66], [-0.15, 0.28, 0], 'band', true],
])
// 실제로 그리는 운전자 = 기본 파츠를 좌석 기준점 중심으로 SLTERA_DRIVER_SCALE배.
export const SLTERA_DRIVER_PARTS = Object.freeze(SLTERA_DRIVER_BASE_PARTS.map(slteraDriverPart))
// 운전자 조각의 외곽선은 차체보다 살짝 얇게(작은 조각이 검은 덩어리로 뭉개지지 않게).
export const SLTERA_DRIVER_OUTLINE_THICKNESS = 0.02

// 발광 파츠(예고 훅 소유): [key, size, position, rotation, colorKey, glow]
// 앞: 펜더 앞 경사에 비스듬히 박힌 가는 램프 두 개(실제 차량 램프 형상 복제 아님).
// 시그니처: 꼬리 면 윗부분을 전폭으로 끊김 없이 가로지르는 한 줄 라이트바(양 끝이 차체 옆선에 닿는다).
export const SLTERA_GLOW_PARTS = Object.freeze([
  ['headlightL', [0.26, 0.05, 0.1], [0.5, 0.56, 1.62], [-0.45, 0.38, 0], 'headlight', 'head'],
  ['headlightR', [0.26, 0.05, 0.1], [-0.5, 0.56, 1.62], [-0.45, -0.38, 0], 'headlight', 'head'],
  ['tailBar', [1.18, 0.07, 0.1], [0, 0.665, -1.785], [0.2, 0, 0], 'tailBar', 'tail'],
])

export const SLTERA_OUTLINE_THICKNESS = 0.028
export const SLTERA_WORDMARK = Object.freeze({ size: [0.4, 0.1], position: [0, 0.5, -1.815] })

// 예고 맥동: 진행도(0..1)가 오를수록 맥동이 빨라지고(2→8Hz) 밝아진다. 평시(progress<0)는 기본 밝기.
const _glow = { head: 0, tail: 0 }
export function slteraTelegraphGlow(progress, timeSec, out = _glow) {
  if (!(progress >= 0)) { out.head = 0.7; out.tail = 0.45; return out }
  const p = Math.min(1, progress)
  const hz = 2 + 6 * p
  const pulse = 0.5 + 0.5 * Math.sin(timeSec * Math.PI * 2 * hz)
  out.head = 0.8 + p * 1.2 * pulse + p * 0.5
  out.tail = 0.55 + p * 0.9 * pulse + p * 0.45
  return out
}

// 헤드라이트 빛 효과(11-22 Terry "헤드라이트에는 빛 효과를 붙여"). 실제 광원·그림자·블룸 없이 가산 혼합 판만 쓴다
// (휴대폰 프레임 비용 ≈0: 텍스처 2장 공유, 판 4장, depthWrite 끔). 램프마다 부드러운 후광 + 바닥에 앞으로 퍼지는 옅은 빛줄기.
// 밝기는 헤드램프 발광(평시 0.7, 예고 맥동 때 더 밝게)을 따라간다.
export const SLTERA_HEADLIGHT_FX = Object.freeze({
  haloSize: 0.5, // 후광 지름(차 로컬 u)
  haloOffset: 0.06, // 램프 면 앞으로 띄우는 거리
  beamLength: 2.4, // 바닥 빛줄기 길이(코끝부터)
  beamNear: 0.34, // 램프 쪽 폭
  beamFar: 1.25, // 먼 쪽 폭
  beamY: 0.02, // 바닥(타이어 바닥 y=0) 바로 위
  color: 0xfff4d6, // 살짝 따뜻한 흰빛
  haloOpacity: 0.45, // 평시(발광 0.7) 기준 불투명도 — 발광에 비례해 오르내린다
  beamOpacity: 0.32,
})

let _haloTex = null
export function getHaloTexture() {
  if (_haloTex) return _haloTex
  const c = document.createElement('canvas'); c.width = 64; c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.75)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64)
  _haloTex = new THREE.CanvasTexture(c); _haloTex.colorSpace = THREE.SRGBColorSpace
  return _haloTex
}

let _beamTex = null
// 빛줄기: 램프 쪽(v=0)이 밝고 멀수록 사라지며, 옆 가장자리도 부드럽게 흐려진다.
function getBeamTexture() {
  if (_beamTex) return _beamTex
  const c = document.createElement('canvas'); c.width = 32; c.height = 64
  const ctx = c.getContext('2d')
  const side = ctx.createLinearGradient(0, 0, 32, 0)
  side.addColorStop(0, 'rgba(255,255,255,0)'); side.addColorStop(0.3, 'rgba(255,255,255,1)')
  side.addColorStop(0.7, 'rgba(255,255,255,1)'); side.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = side; ctx.fillRect(0, 0, 32, 64)
  ctx.globalCompositeOperation = 'destination-in'
  const len = ctx.createLinearGradient(0, 64, 0, 0) // 캔버스 아래(v=0) = 램프 쪽
  len.addColorStop(0, 'rgba(255,255,255,1)'); len.addColorStop(0.45, 'rgba(255,255,255,0.45)'); len.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = len; ctx.fillRect(0, 0, 32, 64)
  _beamTex = new THREE.CanvasTexture(c); _beamTex.colorSpace = THREE.SRGBColorSpace
  return _beamTex
}

// 후방 빛 효과(11-22 Terry "헤드라이트에 붙은 빛효과를 붉게 후방에도"): 같은 방식(가산 판, 광원 없음)으로
// 꼬리 라이트바 전폭에 가로로 긴 붉은 후광 + 차 뒤 바닥에 짧게 번지는 붉은 빛. 밝기는 꼬리 라이트바 발광(예고 맥동)을 따른다.
export const SLTERA_TAILLIGHT_FX = Object.freeze({
  haloScale: [1.75, 0.42], // 후광(가로로 긴 스프라이트) 크기 — 라이트바 폭 1.18보다 넓게
  haloOffset: 0.07, // 꼬리 면 뒤로 띄우는 거리
  spillLength: 1.3, // 바닥 붉은 빛 길이(꼬리부터 뒤로)
  spillNear: 0.62,
  spillFar: 1.0,
  color: 0xff2a2a,
  haloOpacity: 0.5, // 평시(꼬리 발광 0.45) 기준
  spillOpacity: 0.3,
})

// 바닥 빛줄기 지오메트리: 램프 쪽(z0)에서 dir(+1 앞 / -1 뒤) 방향으로 넓어지는 사다리꼴 한 장.
const _beamGeos = {}
function buildBeamGeometry(z0, dir, length, near, far, y) {
  const z1 = z0 + dir * length
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    -near, y, z0, near, y, z0, far, y, z1, -far, y, z1,
  ], 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
  g.setIndex(dir > 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3])
  return g
}
// 앞: 코끝 바로 아래에서 앞으로(두 헤드램프 빛이 합쳐진 모양).
function getBeamGeometry() {
  const { beamLength, beamNear, beamFar, beamY } = SLTERA_HEADLIGHT_FX
  return (_beamGeos.head ||= buildBeamGeometry(SLTERA_BODY_PROFILE.topLine[1][0] - 0.05, 1, beamLength, beamNear, beamFar, beamY))
}
// 뒤: 꼬리 바로 아래에서 뒤로 짧게.
function getTailSpillGeometry() {
  const { spillLength, spillNear, spillFar } = SLTERA_TAILLIGHT_FX
  return (_beamGeos.tail ||= buildBeamGeometry(SLTERA_BODY_PROFILE.bottomRear[0] - 0.12, -1, spillLength, spillNear, spillFar, SLTERA_HEADLIGHT_FX.beamY + 0.002))
}

function headlightFxMaterial(map, opacity, color = SLTERA_HEADLIGHT_FX.color) {
  return new THREE.MeshBasicMaterial({
    map, color, transparent: true, opacity, blending: THREE.AdditiveBlending,
    depthWrite: false, toneMapped: false, side: THREE.DoubleSide, fog: false,
  })
}

let _silverRamp = null
// 밝은 실버 툰 램프(차가운 하이라이트). 어두운 바닥·밝은 바닥 모두에서 외곽선과 함께 읽힌다.
export function getSilverToonRamp() {
  if (_silverRamp) return _silverRamp
  const c = document.createElement('canvas'); c.width = 4; c.height = 1
  const ctx = c.getContext('2d')
  ;['#3c424b', '#7a8390', '#b4bcc8', '#e2e8f1'].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i, 0, 1, 1) })
  _silverRamp = new THREE.CanvasTexture(c)
  _silverRamp.minFilter = _silverRamp.magFilter = THREE.NearestFilter
  _silverRamp.generateMipmaps = false
  _silverRamp.colorSpace = THREE.SRGBColorSpace
  return _silverRamp
}

// ── 지오메트리(모듈 수준 1회 생성) ──────────────────────────────────────────
const smooth01 = (t) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c) }
// 위에서 본 폭: 코로 갈수록 좁아지고 꼬리는 살짝 좁다. 옆에서 본 폭: 위로 갈수록 안쪽으로 눕는다(텀블홈).
function bodyWidthScale(y, z) {
  const plan = z > 0.8 ? 1 - 0.24 * smooth01((z - 0.8) / 1.12) : z < -1.3 ? 1 - 0.06 * smooth01((-1.3 - z) / 0.5) : 1
  const tumble = 1 - 0.16 * smooth01((y - 0.42) / 0.38)
  return plan * tumble
}

// 법선을 매끈하게 다시 계산할 수 있게 위치만 남기고 정점을 용접한다.
export function weld(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name)
  const welded = mergeVertices(g, 1e-4)
  g.dispose()
  welded.computeVertexNormals()
  return welded
}

function buildBodyGeometry() {
  const { bottomRear, bottomFront, topLine, width, bevel } = SLTERA_BODY_PROFILE
  const shape = new THREE.Shape()
  shape.moveTo(bottomRear[0], bottomRear[1])
  shape.lineTo(bottomFront[0], bottomFront[1])
  shape.splineThru(topLine.map(([z, y]) => new THREE.Vector2(z, y)))
  shape.lineTo(bottomRear[0], bottomRear[1])
  const depth = width - bevel * 2
  const extruded = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, curveSegments: 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2,
  })
  // 프로파일 평면(z, y) → 차량 좌표: 압출 축이 차폭(X)이 되도록 돌리고 가운데로 옮긴다.
  extruded.rotateY(-Math.PI / 2)
  extruded.translate(depth / 2, 0, 0)
  const p = extruded.attributes.position
  for (let i = 0; i < p.count; i += 1) p.setX(i, p.getX(i) * bodyWidthScale(p.getY(i), p.getZ(i)))
  const body = weld(extruded)
  extruded.dispose()
  return body
}

function buildFenderGeometry([cx, cy, cz], [rx, ry, rz]) {
  const g = new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, 0, FENDER_THETA)
  g.scale(rx, ry, rz)
  g.translate(cx, cy, cz)
  return g
}

export function darkPartGeometry(shape, size) {
  if (shape === 'rbox') return roundedBoxLite(size)
  if (shape === 'capsule') return new THREE.CapsuleGeometry(size[0], size[1], size[2] ?? 2, size[3] ?? 8)
  if (shape === 'ball') return new THREE.IcosahedronGeometry(size[0], size[1] ?? 1)
  if (shape === 'ellip') return new THREE.IcosahedronGeometry(1, size[3] ?? 1).scale(size[0], size[1], size[2])
  if (shape === 'cyl') return new THREE.CylinderGeometry(size[0], size[1], size[2], size[3] ?? 10)
  return new THREE.BoxGeometry(size[0], size[1], size[2])
}
// 등받이처럼 작은 판은 각만 살짝 굴린 가벼운 상자로 충분하다(RoundedBox보다 삼각형이 적다).
function roundedBoxLite(size) {
  const g = new THREE.BoxGeometry(size[0], size[1], size[2], 1, 2, 1)
  const p = g.attributes.position
  const r = Math.min(size[0], size[2]) * 0.3
  for (let i = 0; i < p.count; i += 1) {
    if (p.getY(i) > size[1] * 0.49) p.setX(i, Math.sign(p.getX(i)) * (Math.abs(p.getX(i)) - r))
  }
  g.computeVertexNormals()
  return g
}

export function placed(geometry, position, rotation) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(1, 1, 1),
  )
  geometry.applyMatrix4(m)
  return geometry
}

export function withColor(geometry, hex) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry
  if (g !== geometry) geometry.dispose()
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
  const c = new THREE.Color(hex)
  const colors = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return g
}

function insideOut(geometry) {
  const index = geometry.index.array
  for (let i = 0; i < index.length; i += 3) { const t = index[i + 1]; index[i + 1] = index[i + 2]; index[i + 2] = t }
  const n = geometry.attributes.normal
  for (let i = 0; i < n.array.length; i += 1) n.array[i] = -n.array[i]
  return geometry
}

export function positionsOnly(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone()
  for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name)
  return g
}

// 인버티드 헐: 용접한 매끈한 법선을 따라 일정 두께만큼 밀어낸다.
export function buildHull(geometry, thickness = SLTERA_OUTLINE_THICKNESS) {
  const hull = weld(geometry)
  const p = hull.attributes.position
  const n = hull.attributes.normal
  for (let i = 0; i < p.count; i += 1) {
    p.setXYZ(i, p.getX(i) + n.getX(i) * thickness, p.getY(i) + n.getY(i) * thickness, p.getZ(i) + n.getZ(i) * thickness)
  }
  hull.deleteAttribute('normal')
  return hull
}

export function mergeAndDispose(list) {
  const merged = mergeGeometries(list, false)
  for (const g of list) g.dispose()
  return merged
}

let _geometries = null
// 공유 지오메트리 묶음. 재질별로 병합해 드로우콜을 줄인다.
export function getSlteraGeometries() {
  if (_geometries) return _geometries
  // 실버 차체: 압출 차체 + 펜더 캡 4개
  const body = buildBodyGeometry()
  const fenders = SLTERA_FENDERS.map(([, center, radii]) => buildFenderGeometry(center, radii))
  const silverParts = [body, ...fenders].map((g) => positionsOnly(g))
  const silverHull = mergeAndDispose(silverParts.map((g) => buildHull(g)))
  const silver = mergeAndDispose(silverParts.map((g) => { const w = weld(g); g.dispose(); return w }))
  body.dispose(); for (const f of fenders) f.dispose()

  // 검은 묶음: 칵핏 파츠 + 타이어 + 림(정점색)
  const darkPieces = []
  const darkHullPieces = []
  const pushDark = (geometry, colorKey, outlined, thickness = SLTERA_OUTLINE_THICKNESS) => {
    if (outlined) darkHullPieces.push(buildHull(geometry, thickness))
    darkPieces.push(withColor(geometry, SLTERA_COLORS[colorKey]))
  }
  for (const [, shape, size, position, rotation, colorKey, outlined] of SLTERA_DARK_PARTS) {
    pushDark(placed(darkPartGeometry(shape, size), position, rotation), colorKey, outlined)
  }
  // 운전자도 같은 정점색 메시·같은 외곽선 헐에 병합한다(드로우콜 증가 없음). 차 그룹의 자식이라 점프 옆 1회전을 그대로 따른다.
  for (const [, shape, size, position, rotation, colorKey, outlined] of SLTERA_DRIVER_PARTS) {
    pushDark(placed(darkPartGeometry(shape, size), position, rotation), colorKey, outlined, SLTERA_DRIVER_OUTLINE_THICKNESS)
  }
  // 펜더 안쪽 휠하우스: 펜더 캡을 조금 줄여 안쪽을 보게 뒤집은 어두운 면(열린 캡 너머로 외곽선 헐이 비치지 않게).
  for (const [, center, radii] of SLTERA_FENDERS) pushDark(insideOut(buildFenderGeometry(center, radii.map((r) => r * 0.97))), 'cockpit', false)
  for (const [, x, y, z, diameter, width] of SLTERA_WHEELS) {
    const tire = placed(new THREE.CylinderGeometry(diameter / 2, diameter / 2, width, 14), [x, y, z], [0, 0, Math.PI / 2])
    pushDark(tire, 'tire', true)
    const rim = placed(new THREE.CylinderGeometry(diameter * 0.33, diameter * 0.33, width + 0.03, 10), [x, y, z], [0, 0, Math.PI / 2])
    pushDark(rim, 'rim', false)
  }
  const dark = mergeAndDispose(darkPieces)
  const darkHull = mergeAndDispose(darkHullPieces)

  const glowGeo = (list) => mergeAndDispose(list.map(([, size, position, rotation]) => positionsOnly(placed(new THREE.BoxGeometry(...size), position, rotation))))
  const head = glowGeo(SLTERA_GLOW_PARTS.filter((p) => p[5] === 'head'))
  const tail = glowGeo(SLTERA_GLOW_PARTS.filter((p) => p[5] === 'tail'))
  head.computeVertexNormals(); tail.computeVertexNormals()
  const tailHull = buildHull(tail)
  const wordmark = new THREE.PlaneGeometry(...SLTERA_WORDMARK.size)
  _geometries = Object.freeze({ silver, silverHull, dark, darkHull, head, tail, tailHull, wordmark })
  return _geometries
}

function toonPart(colorKey, { vertexColors = false } = {}) {
  const color = SLTERA_COLORS[colorKey]
  const glow = colorKey === 'headlight' || colorKey === 'tailBar'
  // 발광 파츠는 어두운 바탕색 + 발광으로 그려, 평시 대비 예고 맥동이 눈에 보이게 한다(색 포화 방지).
  const m = new THREE.MeshToonMaterial({
    color: vertexColors ? 0xffffff : colorKey === 'tailBar' ? new THREE.Color(color).multiplyScalar(0.25) : color,
    gradientMap: colorKey === 'silver' ? getSilverToonRamp() : getToonGradient(),
    emissive: glow ? color : colorKey === 'silver' ? 0x9fb8d8 : 0x08080a,
    emissiveIntensity: glow ? 0.45 : 0.06,
    vertexColors,
  })
  if (glow) m.toneMapped = false
  m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp
  return m
}

// 꼬리의 작은 'SLTERA' 글자(런타임 캔버스, 이미지 자산 없음).
function useTailWordmark() {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#1b1d22'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('SLTERA', 64, 17)
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

export default function SlteraCar({ telegraph = -1, telegraphRef = null, ...props }) {
  const geo = getSlteraGeometries()
  const materials = useMemo(() => ({
    silver: toonPart('silver'),
    dark: toonPart('cockpit', { vertexColors: true }),
    head: toonPart('headlight'),
    tail: toonPart('tailBar'),
    outline: outlineMat(0.96),
    halo: new THREE.SpriteMaterial({
      map: getHaloTexture(), color: SLTERA_HEADLIGHT_FX.color, transparent: true, opacity: SLTERA_HEADLIGHT_FX.haloOpacity,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false,
    }),
    beam: headlightFxMaterial(getBeamTexture(), SLTERA_HEADLIGHT_FX.beamOpacity),
    tailHalo: new THREE.SpriteMaterial({
      map: getHaloTexture(), color: SLTERA_TAILLIGHT_FX.color, transparent: true, opacity: SLTERA_TAILLIGHT_FX.haloOpacity,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false,
    }),
    tailSpill: headlightFxMaterial(getBeamTexture(), SLTERA_TAILLIGHT_FX.spillOpacity, SLTERA_TAILLIGHT_FX.color),
  }), [])
  const wordmark = useTailWordmark()
  // 메시 ref로 '현재' 재질을 읽는다. Graphics Studio 미리보기는 재질을 복제해 소유하므로
  // 처음 만든 재질 핸들을 들고 있으면 맥동이 화면에 반영되지 않는다.
  const headRef = useRef(null)
  const tailRef = useRef(null)
  // 재질·텍스처만 인스턴스 소유. 지오메트리는 모듈 공유라 해제하지 않는다.
  useEffect(() => () => { for (const m of Object.values(materials)) m.dispose(); wordmark.dispose() }, [materials, wordmark])
  useFrame((state) => {
    const progress = telegraphRef ? telegraphRef.current : telegraph
    const g = slteraTelegraphGlow(progress, state.clock.elapsedTime)
    const head = headRef.current?.material
    const tail = tailRef.current?.material
    if (head && !Array.isArray(head)) head.emissiveIntensity = g.head
    if (tail && !Array.isArray(tail)) tail.emissiveIntensity = g.tail
    // 빛 효과는 헤드램프 발광을 따라 밝아진다(평시 0.7 = 기본 불투명도). 재질은 이 인스턴스 소유라 직접 바꾼다.
    const k = Math.min(1.8, g.head / 0.7)
    materials.halo.opacity = SLTERA_HEADLIGHT_FX.haloOpacity * k
    materials.beam.opacity = SLTERA_HEADLIGHT_FX.beamOpacity * k
    const kt = Math.min(2.2, g.tail / 0.45) // 꼬리 발광 평시 0.45 기준(예고 맥동 때 더 붉게)
    materials.tailHalo.opacity = Math.min(1, SLTERA_TAILLIGHT_FX.haloOpacity * kt)
    materials.tailSpill.opacity = SLTERA_TAILLIGHT_FX.spillOpacity * kt
  })
  // 램프는 예고 훅이 발광을 소유한다. Studio 미리보기의 매 프레임 튜닝(발광 덮어쓰기)에서 제외한다.
  const lampData = { studioNonTunable: true, studioNonFocusable: true }
  return (
    <group name="slteraCar" userData={{ label: SLTERA_LABEL, maker: SLTERA_MAKER_LABEL }} {...props}>
      <mesh name="slteraBody" geometry={geo.silver} material={materials.silver} renderOrder={2} dispose={null} />
      <mesh name="slteraCockpitWheels" geometry={geo.dark} material={materials.dark} renderOrder={2} dispose={null} />
      <mesh ref={headRef} name="slteraHeadlights" geometry={geo.head} material={materials.head} renderOrder={2} userData={lampData} dispose={null} />
      <mesh ref={tailRef} name="slteraTailBar" geometry={geo.tail} material={materials.tail} renderOrder={2} userData={lampData} dispose={null} />
      {SLTERA_GLOW_PARTS.filter((p) => p[5] === 'head').map(([key, , [x, y, z]]) => (
        <sprite key={key} name={`${key}Halo`} material={materials.halo} position={[x, y, z + SLTERA_HEADLIGHT_FX.haloOffset]}
          scale={SLTERA_HEADLIGHT_FX.haloSize} renderOrder={5} userData={lampData} />
      ))}
      <mesh name="slteraHeadlightBeam" geometry={getBeamGeometry()} material={materials.beam} renderOrder={4} userData={lampData} dispose={null} />
      {SLTERA_GLOW_PARTS.filter((p) => p[5] === 'tail').map(([key, , [x, y, z]]) => (
        <sprite key={key} name={`${key}Halo`} material={materials.tailHalo} position={[x, y, z - SLTERA_TAILLIGHT_FX.haloOffset]}
          scale={[...SLTERA_TAILLIGHT_FX.haloScale, 1]} renderOrder={5} userData={lampData} />
      ))}
      <mesh name="slteraTailSpill" geometry={getTailSpillGeometry()} material={materials.tailSpill} renderOrder={4} userData={lampData} dispose={null} />
      <mesh geometry={geo.silverHull} material={materials.outline} renderOrder={1} userData={{ studioNonFocusable: true }} dispose={null} />
      <mesh geometry={geo.darkHull} material={materials.outline} renderOrder={1} userData={{ studioNonFocusable: true }} dispose={null} />
      <mesh geometry={geo.tailHull} material={materials.outline} renderOrder={1} userData={{ studioNonFocusable: true }} dispose={null} />
      <mesh geometry={geo.wordmark} position={SLTERA_WORDMARK.position} rotation={[0, Math.PI, 0]} renderOrder={3} dispose={null}>
        <meshBasicMaterial map={wordmark} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}
