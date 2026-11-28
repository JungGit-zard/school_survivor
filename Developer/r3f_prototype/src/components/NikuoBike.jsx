// 니쿠오(양키)가 타는 저폴리 카툰 슈퍼스포츠 오토바이 — 모델 전용(게임플레이·레이서·이벤트 연결 없음).
// Terry 2026-11-28: 풀 카울, 날카로운 트윈 헤드램프 코 + 작게 솟은 스크린, 앞으로 숙인 자세, 탱크 혹,
//   높고 짧은 꼬리 + 꼬리 아래 배기 토막, 클립온 핸들, 굵은 앞 포크, 외팔 스윙암 느낌의 뒤, 큰 앞 브레이크 디스크.
//   색은 흰 바탕 + 빨강·파랑 트리컬러 레이스 도색만 쓴다.
// 상표·패러디 안전(Sltera와 같은 정책): 실존 브랜드 로고·날개 배지·차명·워드마크·번호판 없음. 글자는 하나도 그리지 않는다.
// 라이더 = Sltera 운전석의 그 니쿠오: 머리·선글라스·리젠트·머리띠·깃은 SlteraCar의 SLTERA_DRIVER_BASE_PARTS를
//   그대로 가져와 같은 1.5배로 옮겨 붙이고(같은 사람), 몸통·팔다리만 숙인 턱(tuck) 자세로 새로 잡는다.
// 관례(SlteraCar와 동일): +Z 앞 / +Y 위, 좀비(키 약 1.4)와 같은 로컬 스케일, 모듈 수준 공유 지오메트리를
//   재질별로 병합, toon.js 툰 그라디언트 + 인버티드 헐 외곽선. 메시 8개 + 헤드램프 후광 스프라이트 2장.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getToonGradient, outlineMat } from '../lib/toon.js'
import {
  SLTERA_COLORS, SLTERA_DRIVER_BASE_PARTS, SLTERA_DRIVER_SCALE, SLTERA_DRIVER_OUTLINE_THICKNESS, SLTERA_OUTLINE_THICKNESS,
  buildHull, darkPartGeometry, getHaloTexture, mergeAndDispose, placed, positionsOnly, weld, withColor,
} from './SlteraCar.jsx'

export const NIKUO_BIKE_LABEL = 'Nikuo Bike'

export const NIKUO_BIKE_COLORS = Object.freeze({
  // 트리컬러 도색
  white: 0xf2f3f6,
  red: 0xd2202e,
  blue: 0x1f3f9e,
  // 기계부
  seat: 0x1a1a1f,
  frame: 0x26282e,
  glass: 0x2a3644,
  tire: 0x17171a,
  rim: 0x1f2126,
  spoke: 0xd2202e,
  hub: 0xb9bec6,
  disc: 0xa9aeb6,
  gold: 0xd4a63a, // 굵은 도립 포크 윗관 · 캘리퍼
  forkLower: 0x202226,
  pipe: 0x9aa0a8,
  pipeTip: 0x141418,
  // 라이더(Sltera 운전자와 같은 색)
  skin: SLTERA_COLORS.skin,
  coat: SLTERA_COLORS.coat,
  band: SLTERA_COLORS.band,
  hair: SLTERA_COLORS.hair,
  shades: SLTERA_COLORS.shades,
  lens: SLTERA_COLORS.lens,
  glint: SLTERA_COLORS.glint,
  pants: 0x1b1c22,
  boot: 0x0e0e12,
  // 발광
  headlight: 0xeaf4ff,
  tailLight: 0xff2a2a,
})

// 바퀴: 앞은 좁고 뒤는 넓다. 축 = X. [z, 반지름, 폭]
export const NIKUO_BIKE_WHEELS = Object.freeze({
  front: Object.freeze({ z: 0.72, radius: 0.31, width: 0.13 }),
  rear: Object.freeze({ z: -0.7, radius: 0.32, width: 0.19 }),
})

// 카울 옆모습(z, y) 다각형: 코끝 → 스크린 밑 → 콕핏 → 탱크 혹 → 시트 → 높은 꼬리 → 꼬리 밑 → 서브프레임 → 배 → 앞 아래.
export const NIKUO_BIKE_PROFILE = Object.freeze([
  [0.88, 0.8], [0.8, 0.9], [0.64, 0.99], [0.5, 0.97], [0.4, 0.94], [0.3, 0.98], [0.16, 1.07], [-0.06, 1.03],
  [-0.22, 0.92], [-0.48, 0.88], [-0.62, 0.93], [-0.86, 1.04], [-1.02, 1.04], [-0.98, 0.96], [-0.74, 0.84],
  [-0.4, 0.72], [-0.2, 0.48], [-0.1, 0.28], [0.18, 0.22], [0.34, 0.3], [0.4, 0.52], [0.58, 0.7], [0.76, 0.72],
])
export const NIKUO_BIKE_BEVEL = 0.03

// 도색 판(같은 단면 압출을 살짝 부풀려 흰 카울 위에 얹는다): [key, colorKey, 다각형(z, y)]
export const NIKUO_BIKE_LIVERY = Object.freeze([
  // 빨강: 코 윗면 → 스크린 밑 → 탱크 윗줄
  ['redNoseTank', 'red', [[0.85, 0.85], [0.8, 0.9], [0.64, 0.99], [0.5, 0.97], [0.4, 0.94], [0.3, 0.98], [0.16, 1.07],
    [-0.06, 1.03], [-0.15, 0.96], [-0.04, 0.94], [0.16, 0.97], [0.34, 0.88], [0.62, 0.89], [0.8, 0.84]]],
  // 빨강: 높은 꼬리 윗면
  ['redTail', 'red', [[-0.62, 0.93], [-0.86, 1.04], [-1.02, 1.04], [-1.0, 0.99], [-0.86, 0.97], [-0.66, 0.89]]],
  // 파랑: 아래 카울 옆판
  ['blueLower', 'blue', [[0.36, 0.44], [0.54, 0.68], [0.74, 0.75], [0.72, 0.79], [0.4, 0.81], [0.06, 0.79], [0.0, 0.72],
    [0.02, 0.46], [0.08, 0.38], [0.22, 0.36]]],
  // 검정: 시트
  ['seat', 'seat', [[-0.22, 0.92], [-0.48, 0.88], [-0.62, 0.93], [-0.6, 0.86], [-0.46, 0.83], [-0.24, 0.87]]],
  // 검정: 시트 아래 프레임·엔진이 비치는 뒤 옆판
  ['frameRear', 'frame', [[-0.1, 0.3], [-0.2, 0.48], [-0.4, 0.72], [-0.58, 0.81], [-0.3, 0.82], [-0.1, 0.74], [-0.04, 0.36]]],
])
const LIVERY_LIFT = 0.008

// 위에서 본 반폭: 코로 좁아지고, 탱크가 가장 넓고, 꼬리 끝으로 가늘어진다. 아래 배와 위 모서리는 안쪽으로 눕는다.
const smooth01 = (t) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c) }
const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t))
export function nikuoBikeHalfWidth(y, z) {
  let w
  if (z >= 0.6) w = lerp(0.2, 0.09, (z - 0.6) / 0.31)
  else if (z >= -0.1) w = 0.21
  else if (z >= -0.6) w = lerp(0.21, 0.16, (-0.1 - z) / 0.5)
  else w = lerp(0.16, 0.075, (-0.6 - z) / 0.45)
  const belly = y < 0.42 ? 0.72 + 0.28 * smooth01((y - 0.19) / 0.23) : 1
  const tumble = 1 - 0.3 * smooth01((y - 0.88) / 0.2)
  return w * belly * tumble
}

const BASE_WIDTH = 0.44
// 옆모습 다각형을 X(차폭)로 압출하고 반폭 함수로 폭을 깎은 용접 지오메트리(위치 + 매끈한 법선).
function profileSolid(points, halfWidth, bevel = NIKUO_BIKE_BEVEL) {
  const shape = new THREE.Shape()
  shape.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1])
  shape.closePath()
  const depth = BASE_WIDTH - bevel * 2
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, curveSegments: 6, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2,
  })
  g.rotateY(-Math.PI / 2)
  g.translate(depth / 2, 0, 0)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i += 1) {
    const hw = typeof halfWidth === 'function' ? halfWidth(p.getY(i), p.getZ(i)) : halfWidth
    p.setX(i, p.getX(i) * (hw / (BASE_WIDTH / 2)))
  }
  const welded = weld(g)
  g.dispose()
  return welded
}

function inflate(geometry, d) {
  const p = geometry.attributes.position
  const n = geometry.attributes.normal
  for (let i = 0; i < p.count; i += 1) p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d)
  return geometry
}

// 두 점(from → to)을 잇는 파츠 한 줄(Sltera 파츠 형식). 형상의 +Y가 from→to 축을 따른다.
// dims: capsule [반지름] · cyl [윗반지름, 아랫반지름, 둘레] · box [두께x, 두께z] · ellip [rx, rz, 축 여유, 세분]
const UP = new THREE.Vector3(0, 1, 0)
function seg(key, shape, from, to, dims, colorKey, outlined = true) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const dir = b.clone().sub(a)
  const len = dir.length()
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()))
  const c = a.add(b).multiplyScalar(0.5)
  let size
  if (shape === 'capsule') size = [dims[0], len, 1, 6]
  else if (shape === 'cyl') size = [dims[0], dims[1] ?? dims[0], len, dims[2] ?? 8]
  else if (shape === 'box') size = [dims[0], len, dims[1]]
  else size = [dims[0], len / 2 + (dims[2] ?? 0), dims[1], dims[3] ?? 1]
  return Object.freeze([key, shape, size, [c.x, c.y, c.z], [e.x, e.y, e.z], colorKey, outlined])
}
const mirrorX = ([x, y, z]) => [-x, y, z]
// 좌우 한 쌍: 오른쪽(+X)을 적으면 왼쪽(-X)은 X만 뒤집는다.
function pair(key, shape, from, to, dims, colorKey, outlined) {
  return [seg(`${key}R`, shape, from, to, dims, colorKey, outlined), seg(`${key}L`, shape, mirrorX(from), mirrorX(to), dims, colorKey, outlined)]
}
function pairPart([key, shape, size, [x, y, z], [rx, ry, rz], colorKey, outlined]) {
  return [
    Object.freeze([`${key}R`, shape, size, [x, y, z], [rx, ry, rz], colorKey, outlined]),
    Object.freeze([`${key}L`, shape, size, [-x, y, z], [rx, -ry, -rz], colorKey, outlined]),
  ]
}

const FW = NIKUO_BIKE_WHEELS.front
const RW = NIKUO_BIKE_WHEELS.rear
const FORK_X = 0.135
const FORK_TOP = [FORK_X, 0.97, 0.47]
const forkAt = (t) => [FORK_X, lerp(0.31, FORK_TOP[1], t), lerp(FW.z, FORK_TOP[2], t)]

// 차체 기계 파츠(정점색 메시에 병합): [key, shape, size, position, rotation, colorKey, outlined]
export const NIKUO_BIKE_PARTS = Object.freeze([
  // 작게 솟은 짙은 스크린(뒤로 누움)
  ['windscreen', 'box', [0.26, 0.24, 0.018], [0, 1.065, 0.585], [-0.78, 0, 0], 'glass', true],
  // 코 가운데 램에어 흡입구(헤드램프 사이 아래)
  ['ramAir', 'box', [0.075, 0.045, 0.03], [0, 0.79, 0.905], [-0.3, 0, 0], 'frame', false],
  // 굵은 도립 포크: 아래 검은 슬라이더 + 위 금색 관, 위 브래킷
  ...pair('forkLower', 'cyl', [FORK_X, 0.31, FW.z], forkAt(0.42), [0.04, 0.04, 8], 'forkLower', true),
  ...pair('forkUpper', 'cyl', forkAt(0.36), FORK_TOP, [0.047, 0.047, 8], 'gold', true),
  ['topClamp', 'box', [0.32, 0.035, 0.09], [0, 0.975, 0.47], [-0.36, 0, 0], 'frame', false],
  // 클립온 핸들 + 그립
  ...pair('clipOn', 'cyl', [FORK_X, 0.965, 0.45], [0.3, 0.975, 0.4], [0.017, 0.017, 6], 'frame', false),
  ...pair('grip', 'cyl', [0.22, 0.975, 0.42], [0.315, 0.98, 0.395], [0.028, 0.028, 8], 'seat', true),
  // 앞 캘리퍼(디스크 뒤 위쪽을 문다)
  ...pairPart(['caliperFront', 'box', [0.04, 0.11, 0.055], [0.083, 0.46, 0.6], [0.65, 0, 0], 'gold', false]),
  // 거울(카울 옆으로 튀어나온 작은 흰 알 + 가는 다리)
  ...pairPart(['mirror', 'ellip', [0.065, 0.032, 0.04, 1], [0.25, 1.035, 0.57], [0, 0.25, 0], 'white', true]),
  ...pair('mirrorStalk', 'cyl', [0.17, 0.98, 0.58], [0.23, 1.03, 0.57], [0.012, 0.012, 5], 'frame', false),
  // 외팔 스윙암 느낌: 오른쪽(+X)에만 굵은 암, 피벗 → 뒤 축
  seg('swingarm', 'box', [0.15, 0.5, -0.16], [0.15, RW.radius, RW.z], [0.055, 0.11], 'frame', true),
  ['rearHubNut', 'cyl', [0.055, 0.055, 0.04, 8], [0.19, RW.radius, RW.z], [0, 0, Math.PI / 2], 'gold', false],
  ['caliperRear', 'box', [0.035, 0.09, 0.05], [-0.105, 0.2, -0.56], [-0.6, 0, 0], 'gold', false],
  // 꼬리 아래로 살짝 치켜 올라간 짧은 배기 토막
  seg('exhaust', 'cyl', [0, 0.76, -0.74], [0, 0.83, -0.97], [0.052, 0.048, 10], 'pipe', true),
  seg('exhaustTip', 'cyl', [0, 0.827, -0.962], [0, 0.834, -0.99], [0.036, 0.036, 10], 'pipeTip', false),
  // 리어셋 발판
  ...pair('peg', 'cyl', [0.11, 0.44, -0.13], [0.25, 0.44, -0.13], [0.016, 0.016, 6], 'frame', false),
])

// 앞 흙받이: 바퀴 위 앞쪽을 감싸는 빨간 호(속이 찬 띠).
export const NIKUO_BIKE_FENDER = Object.freeze({ radiusIn: 0.335, radiusOut: 0.365, from: 0.55, to: 1.95, halfWidth: 0.07 })

// ── 라이더: Sltera 운전자의 머리 묶음을 그대로 옮겨 온다 ──────────────────────────
// 몸통·팔 파츠(coatBody, arm*, hand*)만 빼고 머리·선글라스·리젠트·머리띠·깃은 원본 그대로.
const RIDER_POSE_ONLY_KEYS = new Set(['coatBody', 'armWheel', 'handWheel', 'armSillUpper', 'armSillFore', 'handSill'])
export const NIKUO_RIDER_HEAD_KEYS = Object.freeze(SLTERA_DRIVER_BASE_PARTS.map((p) => p[0]).filter((k) => !RIDER_POSE_ONLY_KEYS.has(k)))
export const NIKUO_RIDER_HEAD = Object.freeze({
  pivot: SLTERA_DRIVER_BASE_PARTS.find((p) => p[0] === 'head')[3], // 원본 머리 중심
  scale: SLTERA_DRIVER_SCALE, // Sltera에서 보이는 운전자와 같은 1.5배
  position: [0, 1.37, 0.2], // 탱크 위로 숙인 목 앞
  pitch: 0, // 몸은 숙여도 눈은 앞을 본다
})
export function nikuoRiderHeadMatrix() {
  const { pivot, scale, position, pitch } = NIKUO_RIDER_HEAD
  return new THREE.Matrix4().makeTranslation(...position)
    .multiply(new THREE.Matrix4().makeRotationX(pitch))
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .multiply(new THREE.Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2]))
}

// 턱 자세 관절(오른쪽 +X 기준, 왼쪽은 대칭)
export const NIKUO_RIDER_JOINTS = Object.freeze({
  hip: [0.11, 0.98, -0.34],
  knee: [0.235, 0.8, 0.03],
  ankle: [0.215, 0.53, -0.16],
  shoulder: [0.17, 1.22, 0.07],
  elbow: [0.29, 1.08, 0.22],
  hand: [0.27, 0.985, 0.41],
  neck: [0, 1.25, 0.15],
  pelvis: [0, 0.98, -0.36],
})
const J = NIKUO_RIDER_JOINTS
export const NIKUO_RIDER_BODY_PARTS = Object.freeze([
  // 흰 코트 상체: 엉덩이에서 목까지 앞으로 숙인 타원
  seg('coatTorso', 'ellip', J.pelvis, J.neck, [0.2, 0.15, 0.03, 1], 'coat', true),
  ['hips', 'ellip', [0.16, 0.1, 0.14, 1], [0, 0.97, -0.37], [0, 0, 0], 'pants', true],
  ...pair('upperArm', 'capsule', J.shoulder, J.elbow, [0.062], 'coat', true),
  ...pair('foreArm', 'capsule', J.elbow, J.hand, [0.056], 'coat', true),
  ...pairPart(['hand', 'ball', [0.054, 0], J.hand, [0, 0, 0], 'skin', true]),
  ...pair('thigh', 'capsule', J.hip, J.knee, [0.072], 'pants', true),
  ...pair('shin', 'capsule', J.knee, J.ankle, [0.062], 'pants', true),
  ...pairPart(['boot', 'box', [0.1, 0.085, 0.2], [0.215, 0.475, -0.12], [0.12, 0, 0], 'boot', true]),
])

export const NIKUO_BIKE_GLOW = Object.freeze([
  // 위 코 경사에 비스듬히 박힌 날카로운 두 눈
  ...pairPart(['headlight', 'box', [0.12, 0.024, 0.05], [0.06, 0.85, 0.845], [-0.55, 0.45, -0.34], 'headlight', 'head']),
  ['tailLight', 'box', [0.1, 0.03, 0.03], [0, 1.0, -1.04], [0, 0, 0], 'tailLight', 'tail'],
])
export const NIKUO_BIKE_HEADLIGHT_FX = Object.freeze({ haloSize: 0.34, haloOffset: 0.05, color: 0xfff4d6, haloOpacity: 0.55 })
export const NIKUO_BIKE_OUTLINE_THICKNESS = 0.022

// ── 고속 연출(11-28 Terry "슬테라처럼 고속이동 연출") ─────────────────────────────
// 꼬리등 잔상: SlteraTailTrail을 그대로 쓴다(포크 없음). 한 개짜리 꼬리등이라 띠도 그 폭만큼 좁다.
// 게임 코드는 매 프레임 sampleNikuoBikeTailTrail(...)로 잔상 리본에 꼬리등 월드 위치를 넘긴다(Sltera의 sampleTailTrail과 같은 방식).
const TAIL_LIGHT_PART = NIKUO_BIKE_GLOW.find((p) => p[0] === 'tailLight')
export const NIKUO_BIKE_TAIL_LIGHT = Object.freeze({
  position: Object.freeze([...TAIL_LIGHT_PART[3]]), // 바이크 로컬(+Z 앞, 기울기 그룹 안쪽)
  halfWidth: TAIL_LIGHT_PART[2][0] / 2, // 꼬리등 램프 자체의 반폭(0.05)
  // 잔상 리본에 넘기는 반폭: 램프 + 빛 번짐. 램프 폭 그대로(0.05)면 게임 카메라 거리에서 머리카락 한 올로 보였다.
  // Sltera 라이트바(반폭 0.59)의 1/7 남짓 — 꼬리등 한 개짜리의 좁은 붉은 줄.
  trailHalfWidth: 0.085,
})

// 코너 기울기(roll): 기울기 그룹(바닥 접지선 y=0 축)의 rotation.z 라디안. 실제 바이크처럼 tan(기울기) = 속도 × 회전각속도 / g,
// 최대 maxRad로 자른다. yawRate +는 heading이 커지는 쪽(= 로컬 +X 쪽으로 도는 코너) — 위가 +X로 눕도록 rotation.z는 음수.
export const NIKUO_BIKE_LEAN = Object.freeze({ maxRad: 0.6, gravity: 9.8 })
export function nikuoBikeLean(speed, yawRate) {
  const a = Math.atan((speed * yawRate) / NIKUO_BIKE_LEAN.gravity)
  const m = NIKUO_BIKE_LEAN.maxRad
  return -Math.max(-m, Math.min(m, a))
}

// 꼬리등의 월드 위치. 바이크 그룹 = position(x, y, z) · rotation.y = heading · 균일 scale, 그 안의 기울기 그룹 rotation.z = roll.
export function nikuoBikeTailLightWorld(x, y, z, heading, roll, scale, out) {
  const [tx, ty, tz] = NIKUO_BIKE_TAIL_LIGHT.position
  const cr = Math.cos(roll); const sr = Math.sin(roll)
  const lx = (tx * cr - ty * sr) * scale
  const ly = (tx * sr + ty * cr) * scale
  const lz = tz * scale
  const ch = Math.cos(heading); const sh = Math.sin(heading)
  out.x = x + lx * ch + lz * sh
  out.y = y + ly
  out.z = z - lx * sh + lz * ch
  return out
}

// 잔상 리본(SlteraTailTrail ref.current)에 꼬리등을 넘긴다. active=false면 새 점 없이 남은 잔상만 사라진다. 할당 없음.
const _tailScratch = { x: 0, y: 0, z: 0 }
export function sampleNikuoBikeTailTrail(trail, x, y, z, heading, roll, scale, active, nowSec) {
  if (!trail) return
  const p = nikuoBikeTailLightWorld(x, y, z, heading, roll, scale, _tailScratch)
  trail.sample(p.x, p.y, p.z, heading, NIKUO_BIKE_TAIL_LIGHT.trailHalfWidth * scale, active, nowSec)
}

// ── 지오메트리(모듈 수준 1회) ────────────────────────────────────────────────
function annulusDisc(rOut, rIn, thickness, segments = 14) {
  const t = thickness / 2
  const g = new THREE.LatheGeometry([
    new THREE.Vector2(rIn, -t), new THREE.Vector2(rOut, -t), new THREE.Vector2(rOut, t), new THREE.Vector2(rIn, t), new THREE.Vector2(rIn, -t),
  ], segments)
  g.rotateZ(Math.PI / 2) // 축 Y → X
  return g
}

// 바퀴 한 짝(축 = 원점, 축 방향 X): 둥근 타이어(토러스) + 어두운 림 면 + 빨간 5스포크 + 허브 + 디스크.
function buildWheel({ radius, width }, discXs, discOut, discIn) {
  const pieces = []
  const hullPieces = []
  const tire = new THREE.TorusGeometry(radius - width / 2, width / 2, 6, 18)
  tire.rotateY(Math.PI / 2)
  hullPieces.push(buildHull(tire, NIKUO_BIKE_OUTLINE_THICKNESS))
  pieces.push(withColor(tire, NIKUO_BIKE_COLORS.tire))
  const rimR = radius - width * 0.92
  const rimW = width * 0.7
  pieces.push(withColor(placed(new THREE.CylinderGeometry(rimR, rimR, rimW, 14), [0, 0, 0], [0, 0, Math.PI / 2]), NIKUO_BIKE_COLORS.rim))
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2
    const len = rimR * 0.95
    const spoke = new THREE.BoxGeometry(rimW + 0.02, len, 0.045)
    spoke.translate(0, len / 2, 0)
    spoke.rotateX(a)
    pieces.push(withColor(spoke, NIKUO_BIKE_COLORS.spoke))
  }
  pieces.push(withColor(placed(new THREE.CylinderGeometry(0.05, 0.05, rimW + 0.05, 8), [0, 0, 0], [0, 0, Math.PI / 2]), NIKUO_BIKE_COLORS.hub))
  for (const x of discXs) {
    const disc = annulusDisc(discOut, discIn, 0.012)
    disc.translate(x, 0, 0)
    pieces.push(withColor(disc, NIKUO_BIKE_COLORS.disc))
  }
  return { mesh: mergeAndDispose(pieces), hull: mergeAndDispose(hullPieces) }
}

function buildFender() {
  const { radiusIn, radiusOut, from, to, halfWidth } = NIKUO_BIKE_FENDER
  const pts = []
  const n = 8
  for (let i = 0; i <= n; i += 1) { const a = lerp(from, to, i / n); pts.push([FW.z + Math.cos(a) * radiusOut, FW.radius + Math.sin(a) * radiusOut]) }
  for (let i = n; i >= 0; i -= 1) { const a = lerp(from, to, i / n); pts.push([FW.z + Math.cos(a) * radiusIn, FW.radius + Math.sin(a) * radiusIn]) }
  return profileSolid(pts, halfWidth, 0.008)
}

let _geometries = null
export function getNikuoBikeGeometries() {
  if (_geometries) return _geometries
  const pieces = []
  const hullPieces = []
  const push = (geometry, colorKey, outlined, thickness = NIKUO_BIKE_OUTLINE_THICKNESS) => {
    if (outlined) hullPieces.push(buildHull(geometry, thickness))
    pieces.push(withColor(geometry, NIKUO_BIKE_COLORS[colorKey]))
  }
  // 흰 카울 + 도색 판(살짝 부풀려 겹침 깜빡임 없이 얹는다; 외곽선은 카울 헐이 감싼다)
  push(profileSolid(NIKUO_BIKE_PROFILE, nikuoBikeHalfWidth), 'white', true)
  for (const [, colorKey, poly] of NIKUO_BIKE_LIVERY) push(inflate(profileSolid(poly, nikuoBikeHalfWidth), LIVERY_LIFT), colorKey, false)
  push(buildFender(), 'red', true)
  for (const [, shape, size, position, rotation, colorKey, outlined] of NIKUO_BIKE_PARTS) {
    push(placed(darkPartGeometry(shape, size), position, rotation), colorKey, outlined)
  }
  // 라이더 머리 묶음: Sltera 원본 파츠를 원본 좌표에 만든 뒤 한 행렬로 통째로 옮긴다(모양·비율 그대로).
  const headMatrix = nikuoRiderHeadMatrix()
  for (const [key, shape, size, position, rotation, colorKey, outlined] of SLTERA_DRIVER_BASE_PARTS) {
    if (RIDER_POSE_ONLY_KEYS.has(key)) continue
    const g = placed(darkPartGeometry(shape, size), position, rotation).applyMatrix4(headMatrix)
    if (outlined) hullPieces.push(buildHull(g, SLTERA_DRIVER_OUTLINE_THICKNESS))
    pieces.push(withColor(g, SLTERA_COLORS[colorKey]))
  }
  for (const [, shape, size, position, rotation, colorKey, outlined] of NIKUO_RIDER_BODY_PARTS) {
    push(placed(darkPartGeometry(shape, size), position, rotation), colorKey, outlined, SLTERA_DRIVER_OUTLINE_THICKNESS)
  }
  const body = mergeAndDispose(pieces)
  const bodyHull = mergeAndDispose(hullPieces)

  const front = buildWheel(FW, [0.075, -0.075], 0.205, 0.155)
  const rear = buildWheel(RW, [-0.098], 0.165, 0.125)

  const glowGeo = (list) => {
    const g = mergeAndDispose(list.map(([, , size, position, rotation]) => positionsOnly(placed(new THREE.BoxGeometry(...size), position, rotation))))
    g.computeVertexNormals()
    return g
  }
  const head = glowGeo(NIKUO_BIKE_GLOW.filter((p) => p[6] === 'head'))
  const tail = glowGeo(NIKUO_BIKE_GLOW.filter((p) => p[6] === 'tail'))
  _geometries = Object.freeze({
    body, bodyHull, frontWheel: front.mesh, frontWheelHull: front.hull, rearWheel: rear.mesh, rearWheelHull: rear.hull, head, tail,
  })
  return _geometries
}

// 바퀴 회전: 앞으로(+Z) 달리면 바퀴 윗부분이 앞으로 간다 = X축 양(+) 회전. 각속도 = 속도 / 반지름.
export function nikuoWheelSpin(speed, radius, dt) {
  return (speed / radius) * dt
}

function toonVertexMaterial() {
  const m = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: getToonGradient(), emissive: 0x08080a, emissiveIntensity: 0.06, vertexColors: true })
  m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp
  return m
}
function glowMaterial(color, base) {
  const m = new THREE.MeshToonMaterial({ color: new THREE.Color(color).multiplyScalar(base), gradientMap: getToonGradient(), emissive: color, emissiveIntensity: 1 })
  m.toneMapped = false
  m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp
  return m
}

// props: speed(단위/초) 또는 speedRef.current로 바퀴가 돈다. headlight=false면 헤드램프·후광이 꺼진다.
// lean(라디안) 또는 leanRef.current로 바이크 전체(라이더 포함)가 바닥 접지선을 축으로 옆으로 눕는다(nikuoBikeLean 참고).
export default function NikuoBike({ speed = 0, speedRef = null, lean = 0, leanRef = null, headlight = true, ...props }) {
  const geo = getNikuoBikeGeometries()
  const materials = useMemo(() => ({
    body: toonVertexMaterial(),
    head: glowMaterial(NIKUO_BIKE_COLORS.headlight, 0.6),
    tail: glowMaterial(NIKUO_BIKE_COLORS.tailLight, 0.3),
    outline: outlineMat(0.96),
    halo: new THREE.SpriteMaterial({
      map: getHaloTexture(), color: NIKUO_BIKE_HEADLIGHT_FX.color, transparent: true, opacity: NIKUO_BIKE_HEADLIGHT_FX.haloOpacity,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false,
    }),
  }), [])
  const frontRef = useRef(null)
  const rearRef = useRef(null)
  const headRef = useRef(null)
  const leanGroupRef = useRef(null)
  useEffect(() => () => { for (const m of Object.values(materials)) m.dispose() }, [materials])
  useFrame((_, delta) => {
    if (leanGroupRef.current) leanGroupRef.current.rotation.z = leanRef ? leanRef.current : lean
    const v = speedRef ? speedRef.current : speed
    const dt = Math.min(delta, 0.1)
    if (v && frontRef.current) frontRef.current.rotation.x += nikuoWheelSpin(v, FW.radius, dt)
    if (v && rearRef.current) rearRef.current.rotation.x += nikuoWheelSpin(v, RW.radius, dt)
    const head = headRef.current?.material
    if (head && !Array.isArray(head)) head.emissiveIntensity = headlight ? 1 : 0.04
  })
  const lampData = { studioNonTunable: true, studioNonFocusable: true }
  const hullData = { studioNonFocusable: true }
  return (
    <group name="nikuoBike" userData={{ label: NIKUO_BIKE_LABEL }} {...props}>
      <group ref={leanGroupRef} name="nikuoBikeLean" rotation={[0, 0, leanRef ? 0 : lean]}>
        <mesh name="nikuoBikeBody" geometry={geo.body} material={materials.body} renderOrder={2} dispose={null} />
        <mesh geometry={geo.bodyHull} material={materials.outline} renderOrder={1} userData={hullData} dispose={null} />
        <mesh ref={headRef} name="nikuoBikeHeadlights" geometry={geo.head} material={materials.head} renderOrder={2} userData={lampData} dispose={null} />
        <mesh name="nikuoBikeTailLight" geometry={geo.tail} material={materials.tail} renderOrder={2} userData={lampData} dispose={null} />
        {headlight && NIKUO_BIKE_GLOW.filter((p) => p[6] === 'head').map(([key, , , [x, y, z]]) => (
          <sprite key={key} name={`${key}Halo`} material={materials.halo} position={[x, y, z + NIKUO_BIKE_HEADLIGHT_FX.haloOffset]}
            scale={NIKUO_BIKE_HEADLIGHT_FX.haloSize} renderOrder={5} userData={lampData} />
        ))}
        <group ref={frontRef} name="nikuoBikeFrontWheel" position={[0, FW.radius, FW.z]}>
          <mesh geometry={geo.frontWheel} material={materials.body} renderOrder={2} dispose={null} />
          <mesh geometry={geo.frontWheelHull} material={materials.outline} renderOrder={1} userData={hullData} dispose={null} />
        </group>
        <group ref={rearRef} name="nikuoBikeRearWheel" position={[0, RW.radius, RW.z]}>
          <mesh geometry={geo.rearWheel} material={materials.body} renderOrder={2} dispose={null} />
          <mesh geometry={geo.rearWheelHull} material={materials.outline} renderOrder={1} userData={hullData} dispose={null} />
        </group>
      </group>
    </group>
  )
}
