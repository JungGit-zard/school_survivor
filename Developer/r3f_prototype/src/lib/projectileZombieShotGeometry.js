// 투사체 좀비 15종(E46~E60) 탄·바닥 표식·매복 소품의 절차적 저폴리 지오메트리와 방향/회전 규칙.
//
// 규약(chefIngredientGeometry.js와 같다)
// - 외부 에셋 없이 three 프리미티브만 조합한다. 1 외형 = 병합 BufferGeometry 1개, 파트 색은 vertex color.
//   body는 MeshToonMaterial({ vertexColors }) 하나, 외곽선은 BackSide 헐 하나 → 외형당 InstancedMesh 한 쌍.
// - 모델 앞(+Z)이 진행 방향이다. 크기는 반경 약 0.1 기준이고 렌더러가 SHOT_KIND_INFO.size를 곱한다.
// - 판정 반경과 궤적은 lib/projectileZombieShotPool.js(levelmini 소유)가 정본이다. 여기서는 모양만 정한다.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SHOT_KIND, SHOT_MOTION } from './projectileZombieShotPool.js'

const TAU = Math.PI * 2
const HALF_PI = Math.PI / 2
const _color = new THREE.Color()

function paint(geometry, hex) {
  const g = geometry
  g.deleteAttribute('uv')
  _color.setHex(hex)
  const count = g.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) { colors[i * 3] = _color.r; colors[i * 3 + 1] = _color.g; colors[i * 3 + 2] = _color.b }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return g
}

function part(geometry, hex, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  if (sx !== 1 || sy !== 1 || sz !== 1) geometry.scale(sx, sy, sz)
  if (rz !== 0) geometry.rotateZ(rz)
  if (rx !== 0) geometry.rotateX(rx)
  if (ry !== 0) geometry.rotateY(ry)
  if (x !== 0 || y !== 0 || z !== 0) geometry.translate(x, y, z)
  return paint(geometry, hex)
}

function merge(parts) {
  const merged = mergeGeometries(parts, false)
  parts.forEach((geometry) => geometry.dispose())
  if (!merged) throw new Error('projectile zombie shot geometry merge failed')
  // 법선은 파트별 원래 값(변환 시 함께 회전됨)을 그대로 쓴다 — 구가 각지지 않는다.
  merged.computeBoundingSphere()
  return merged
}

// 수평(XZ) 원호. 볼록한 가운데가 +Z(진행 방향)를 본다.
function forwardArc(radius, tube, arc, hex, y = 0) {
  const g = new THREE.TorusGeometry(radius, tube, 5, 14, arc)
  g.rotateZ(-arc / 2) // 원호 가운데를 +X로
  g.rotateX(-HALF_PI) // XY → XZ 평면
  g.rotateY(-HALF_PI) // +X → +Z
  if (y) g.translate(0, y, 0)
  return paint(g, hex)
}

// ── 탄 외형 ──────────────────────────────────────────────────────────────────
// E46 분홍 지우개 + 파란 종이 띠.
function eraser() {
  return merge([
    part(new THREE.BoxGeometry(0.17, 0.09, 0.115), 0xf4a3b5),
    part(new THREE.BoxGeometry(0.075, 0.1, 0.125), 0x3b6fd1, { x: -0.02 }),
  ])
}
// E47 종이비행기: 납작한 삼각 다트(코가 +Z) + 아래 용골.
function paperPlane() {
  return merge([
    part(new THREE.ConeGeometry(0.13, 0.32, 3), 0xffffff, { sz: 0.22, rx: HALF_PI }),
    part(new THREE.BoxGeometry(0.022, 0.05, 0.24), 0xbfd6e6, { y: -0.03, z: -0.03 }),
  ])
}
// E48 자 부메랑: 긴 크림색 자 + 눈금.
function ruler() {
  const parts = [part(new THREE.BoxGeometry(0.4, 0.024, 0.075), 0xe7e2c8)]
  for (let k = 0; k < 7; k += 1) {
    const long = k % 3 === 0
    parts.push(part(new THREE.BoxGeometry(0.01, 0.03, long ? 0.034 : 0.02), 0x3a3428, { x: -0.16 + k * 0.053, z: 0.035 - (long ? 0.017 : 0.01) }))
  }
  parts.push(part(new THREE.BoxGeometry(0.03, 0.03, 0.02), 0xd8423a, { x: 0.17, z: -0.022 }))
  return merge(parts)
}
// E49 물 덩어리: 물방울(꼬리가 뒤로) + 흰 하이라이트.
function waterBlob() {
  return merge([
    part(new THREE.SphereGeometry(0.09, 9, 7), 0x6ec4ee),
    part(new THREE.ConeGeometry(0.062, 0.12, 7), 0x6ec4ee, { rx: -HALF_PI, z: -0.1 }),
    part(new THREE.SphereGeometry(0.026, 6, 5), 0xffffff, { x: -0.035, y: 0.055, z: 0.03 }),
  ])
}
// E50 배구공: 크림 공 + 파랑·노랑 띠.
function volleyball() {
  return merge([
    part(new THREE.SphereGeometry(0.1, 10, 8), 0xf6f1de),
    part(new THREE.TorusGeometry(0.1, 0.014, 4, 18), 0x2e6fd8),
    part(new THREE.TorusGeometry(0.1, 0.014, 4, 18), 0xf2c230, { ry: HALF_PI }),
    part(new THREE.TorusGeometry(0.1, 0.014, 4, 18), 0x2e6fd8, { rx: HALF_PI }),
  ])
}
// E51 8분음표: 비스듬한 머리 + 기둥 + 깃발(위를 향해 서 있다).
function musicNote() {
  return merge([
    part(new THREE.SphereGeometry(0.06, 8, 6), 0xff6fb0, { sx: 1.35, sy: 0.9, rz: 0.45, x: -0.03, y: -0.08 }),
    part(new THREE.BoxGeometry(0.024, 0.21, 0.024), 0xff6fb0, { x: 0.042, y: 0.02 }),
    part(new THREE.BoxGeometry(0.085, 0.032, 0.024), 0xc2287a, { rz: -0.55, x: 0.075, y: 0.095 }),
  ])
}
// E52 플라스크: 연두 둥근 바닥 + 유리 목 + 코르크.
function flask() {
  return merge([
    part(new THREE.SphereGeometry(0.085, 9, 7), 0x9bf04a, { sy: 0.92, y: -0.03 }),
    part(new THREE.CylinderGeometry(0.03, 0.036, 0.075, 7), 0xe6f4ff, { y: 0.075 }),
    part(new THREE.CylinderGeometry(0.035, 0.032, 0.03, 7), 0x9a6a3a, { y: 0.122 }),
  ])
}
// E52 분열 파편: 연두 유리 조각(삼각 뿔).
function flaskShard() {
  return merge([
    part(new THREE.ConeGeometry(0.05, 0.13, 3), 0x9bf04a, { rx: HALF_PI }),
    part(new THREE.ConeGeometry(0.02, 0.05, 3), 0xe6f4ff, { rx: HALF_PI, z: 0.035, y: 0.018 }),
  ])
}
// E53 물감 방울: 앞으로 늘어진 보라 방울 + 뒤따르는 작은 방울 둘.
function paint_() {
  return merge([
    part(new THREE.SphereGeometry(0.08, 9, 7), 0xb05cff, { sz: 1.35 }),
    part(new THREE.SphereGeometry(0.035, 6, 5), 0xb05cff, { x: 0.03, z: -0.13 }),
    part(new THREE.SphereGeometry(0.024, 6, 5), 0xd59bff, { x: -0.03, z: -0.18 }),
  ])
}
// E54 음파: 진행 방향으로 볼록한 노란 원호 두 겹.
function soundWave() {
  return merge([
    forwardArc(0.15, 0.022, Math.PI * 0.75, 0xf0c23a),
    forwardArc(0.085, 0.02, Math.PI * 0.7, 0xffe38a),
  ])
}
// E55 야구공: 흰 공 + 빨간 실밥 두 줄.
function baseball() {
  return merge([
    part(new THREE.SphereGeometry(0.085, 10, 8), 0xfafaf4),
    part(new THREE.TorusGeometry(0.068, 0.009, 4, 12, Math.PI), 0xd8302a, { ry: HALF_PI, x: 0.045 }),
    part(new THREE.TorusGeometry(0.068, 0.009, 4, 12, Math.PI), 0xd8302a, { ry: -HALF_PI, rz: Math.PI, x: -0.045 }),
  ])
}
// E56 예약: 연두·흰 회복 캡슐.
function healCapsule() {
  return merge([
    part(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 8), 0x7cf07c, { rx: HALF_PI, z: 0.04 }),
    part(new THREE.SphereGeometry(0.045, 8, 6), 0x7cf07c, { z: 0.08 }),
    part(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 8), 0xffffff, { rx: HALF_PI, z: -0.04 }),
    part(new THREE.SphereGeometry(0.045, 8, 6), 0xffffff, { z: -0.08 }),
  ])
}
// E57 출석 카드: 크림 카드 + 남색 머리띠 + 빨간 도장.
function attendanceCard() {
  return merge([
    part(new THREE.BoxGeometry(0.17, 0.016, 0.23), 0xf4e8c8),
    part(new THREE.BoxGeometry(0.17, 0.022, 0.05), 0x2a3f7a, { z: 0.09 }),
    part(new THREE.CylinderGeometry(0.03, 0.03, 0.022, 8), 0xd8302a, { x: 0.035, z: -0.05 }),
  ])
}
// E58 줄넘기 끝: 앞쪽 빨간 손잡이 + 던진 사람 쪽으로 늘어진 노란 줄.
function jumpRope() {
  return merge([
    part(new THREE.CylinderGeometry(0.032, 0.026, 0.13, 7), 0xd8302a, { rx: HALF_PI, z: 0.06 }),
    part(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 7), 0xf4f4f4, { rx: HALF_PI, z: -0.012 }),
    part(new THREE.BoxGeometry(0.026, 0.026, 0.4), 0xf2d23a, { z: -0.22 }),
  ])
}
// E59 우유갑: 흰 상자 + 박공 지붕 + 파란 띠.
function milkCarton() {
  return merge([
    part(new THREE.BoxGeometry(0.12, 0.15, 0.12), 0xfafaf6, { y: -0.02 }),
    part(new THREE.ConeGeometry(0.085, 0.07, 4), 0xfafaf6, { ry: Math.PI / 4, y: 0.09 }),
    part(new THREE.BoxGeometry(0.126, 0.05, 0.126), 0x2e7fd0, { y: -0.02 }),
    part(new THREE.BoxGeometry(0.02, 0.03, 0.02), 0xfafaf6, { y: 0.135 }),
  ])
}
// E60 하수 물줄기: 앞으로 늘어진 탁한 청록 물방울 + 작은 물방울 둘.
function drainWater() {
  return merge([
    part(new THREE.SphereGeometry(0.075, 8, 6), 0x5f8f7a, { sz: 1.6 }),
    part(new THREE.SphereGeometry(0.04, 6, 5), 0x9fd0b8, { y: 0.03, z: 0.04 }),
    part(new THREE.SphereGeometry(0.03, 6, 5), 0x5f8f7a, { x: 0.04, z: -0.16 }),
    part(new THREE.SphereGeometry(0.022, 6, 5), 0x4a6f5f, { x: -0.03, z: -0.21 }),
  ])
}
function fallbackSphere() {
  return merge([part(new THREE.SphereGeometry(0.09, 8, 8), 0xffffff)])
}

// spin: point(진행 방향만) | tumble(진행 축으로 앞구르기) | spinY(수평 회전) | bank(진행+좌우 기울기) | wobble(서서 흔들림)
export const SHOT_VISUALS = Object.freeze([
  { key: 'eraser', create: eraser, spin: 'tumble', rate: 0.012 },
  { key: 'paperPlane', create: paperPlane, spin: 'bank', rate: 0.006 },
  { key: 'rulerBoomerang', create: ruler, spin: 'spinY', rate: 0.03 },
  { key: 'waterBlob', create: waterBlob, spin: 'point', rate: 0 },
  { key: 'volleyball', create: volleyball, spin: 'tumble', rate: 0.01 },
  { key: 'musicNote', create: musicNote, spin: 'wobble', rate: 0.008 },
  { key: 'flask', create: flask, spin: 'tumble', rate: 0.009 },
  { key: 'flaskShard', create: flaskShard, spin: 'spinY', rate: 0.025 },
  { key: 'paint', create: paint_, spin: 'point', rate: 0 },
  { key: 'soundWave', create: soundWave, spin: 'point', rate: 0 },
  { key: 'baseball', create: baseball, spin: 'tumble', rate: 0.04 },
  { key: 'healCapsule', create: healCapsule, spin: 'spinY', rate: 0.006 },
  { key: 'attendanceCard', create: attendanceCard, spin: 'spinY', rate: 0.02 },
  { key: 'jumpRope', create: jumpRope, spin: 'point', rate: 0 },
  { key: 'milkCarton', create: milkCarton, spin: 'tumble', rate: 0.006 },
  { key: 'drainWater', create: drainWater, spin: 'point', rate: 0 },
  { key: 'fallback', create: fallbackSphere, spin: 'point', rate: 0 },
].map(Object.freeze))

const VISUAL_INDEX = Object.fromEntries(SHOT_VISUALS.map((v, i) => [v.key, i]))
export const SHOT_VISUAL_FALLBACK = VISUAL_INDEX.fallback

const KIND_TO_VISUAL = Object.freeze({
  [SHOT_KIND.ERASER]: VISUAL_INDEX.eraser,
  [SHOT_KIND.PAPER_PLANE]: VISUAL_INDEX.paperPlane,
  [SHOT_KIND.RULER]: VISUAL_INDEX.rulerBoomerang,
  [SHOT_KIND.WATER_BLOB]: VISUAL_INDEX.waterBlob,
  [SHOT_KIND.VOLLEYBALL]: VISUAL_INDEX.volleyball,
  [SHOT_KIND.MUSIC_NOTE]: VISUAL_INDEX.musicNote,
  [SHOT_KIND.FLASK]: VISUAL_INDEX.flask,
  [SHOT_KIND.PAINT]: VISUAL_INDEX.paint,
  [SHOT_KIND.SOUND_WAVE]: VISUAL_INDEX.soundWave,
  [SHOT_KIND.BASEBALL]: VISUAL_INDEX.baseball,
  [SHOT_KIND.HEAL_CAPSULE]: VISUAL_INDEX.healCapsule,
  [SHOT_KIND.ATTENDANCE_CARD]: VISUAL_INDEX.attendanceCard,
  [SHOT_KIND.JUMP_ROPE]: VISUAL_INDEX.jumpRope,
  [SHOT_KIND.MILK_CARTON]: VISUAL_INDEX.milkCarton,
  [SHOT_KIND.DRAIN_WATER]: VISUAL_INDEX.drainWater,
})

/** 탄 kind·궤적 → SHOT_VISUALS 인덱스. 플라스크는 갈라진 뒤(STRAIGHT) 파편 모양이 된다. */
export function getShotVisualIndex(kind, motion) {
  if (kind === SHOT_KIND.FLASK && motion !== SHOT_MOTION.SPLIT) return VISUAL_INDEX.flaskShard
  const index = KIND_TO_VISUAL[kind]
  return index === undefined ? SHOT_VISUAL_FALLBACK : index
}

// ── 바닥 표식·지대 ───────────────────────────────────────────────────────────
// ring = 경고 테두리, markerFill = 옅은 경고 원, puddleFill = 울퉁불퉁한 웅덩이/물감 자국, line = 조준선.
export const DECAL_VISUALS = Object.freeze(['ring', 'markerFill', 'puddleFill', 'line'])
export const DECAL_VISUAL = Object.freeze({ RING: 0, MARKER_FILL: 1, PUDDLE_FILL: 2, LINE: 3 })

export function createDecalGeometries() {
  const ring = new THREE.RingGeometry(0.84, 1, 36)
  const markerFill = new THREE.CircleGeometry(1, 36)
  const puddleFill = new THREE.CircleGeometry(1, 28)
  // 웅덩이 가장자리: 방향의 연속 함수로 흔들어 결정론적인 물웅덩이 윤곽을 만든다.
  const pos = puddleFill.attributes.position
  for (let i = 1; i < pos.count; i += 1) {
    const x = pos.getX(i); const y = pos.getY(i)
    const a = Math.atan2(y, x)
    const r = 0.88 + 0.08 * Math.sin(a * 3 + 0.6) + 0.05 * Math.sin(a * 5 + 2.1)
    pos.setXY(i, Math.cos(a) * r, Math.sin(a) * r)
  }
  const line = new THREE.PlaneGeometry(1, 1)
  for (const g of [ring, markerFill, puddleFill, line]) g.rotateX(-HALF_PI)
  return [ring, markerFill, puddleFill, line]
}

/** 표식/지대 kind → 그릴 데칼 외형 목록(DECAL_VISUAL). 길이가 있으면 조준선이다. */
export function getDecalVisuals(kind, motion, lengthU) {
  if (motion === SHOT_MOTION.DECAL && lengthU > 0) return LINE_ONLY
  if (motion === SHOT_MOTION.ZONE || kind === SHOT_KIND.ZONE_WATER || kind === SHOT_KIND.ZONE_PAINT) return PUDDLE_ONLY
  return RING_AND_FILL
}
const LINE_ONLY = Object.freeze([DECAL_VISUAL.LINE])
const PUDDLE_ONLY = Object.freeze([DECAL_VISUAL.PUDDLE_FILL])
const RING_AND_FILL = Object.freeze([DECAL_VISUAL.RING, DECAL_VISUAL.MARKER_FILL])

// ── 매복 소품(E58 줄넘기 똬리, E60 배수구) ────────────────────────────────────
// 몸이 반쯤 가라앉은 동안 발밑에 둔다. 가운데 검은 구멍이 몸이 바닥을 뚫는 단면을 덮어
// "바닥에 박힌" 게 아니라 "구멍 속에 숨은" 것으로 읽힌다. visualScale 1 기준 반경 약 0.3.
export const AMBUSH_PROP_TYPE_CODES = Object.freeze({ E58: 61, E60: 63 })
export const AMBUSH_PROPS = Object.freeze(['ropeCoil', 'drainGrate'])

function ropeCoil() {
  return merge([
    part(new THREE.CircleGeometry(0.25, 20), 0x14110f, { rx: -HALF_PI, y: 0.006 }),
    part(new THREE.TorusGeometry(0.27, 0.03, 5, 22), 0xf2d23a, { rx: HALF_PI, y: 0.03 }),
    part(new THREE.TorusGeometry(0.31, 0.03, 5, 22), 0xe0bf2a, { rx: HALF_PI, y: 0.022 }),
    part(new THREE.CylinderGeometry(0.035, 0.03, 0.15, 7), 0xd8302a, { rz: HALF_PI, ry: 0.5, x: 0.3, y: 0.04, z: 0.2 }),
    part(new THREE.CylinderGeometry(0.035, 0.03, 0.15, 7), 0xd8302a, { rz: HALF_PI, ry: -0.9, x: -0.34, y: 0.04, z: 0.12 }),
  ])
}

function drainGrate() {
  const parts = [
    part(new THREE.CircleGeometry(0.27, 20), 0x0b0d0e, { rx: -HALF_PI, y: 0.006 }),
    part(new THREE.TorusGeometry(0.28, 0.035, 4, 20), 0x7d868c, { rx: HALF_PI, y: 0.018 }),
  ]
  // 밀려난 격자 뚜껑(옆에 비스듬히): 테두리 + 살 4개.
  const lid = { ry: 0.5, x: 0.42, y: 0.022, z: -0.1 }
  const place = (g, hex, dx, dz) => {
    g.translate(dx, 0, dz)
    return part(g, hex, lid)
  }
  parts.push(place(new THREE.BoxGeometry(0.3, 0.03, 0.03), 0x8f989e, 0, 0.135))
  parts.push(place(new THREE.BoxGeometry(0.3, 0.03, 0.03), 0x8f989e, 0, -0.135))
  for (let k = 0; k < 5; k += 1) parts.push(place(new THREE.BoxGeometry(0.03, 0.03, 0.3), 0x6c757b, -0.135 + k * 0.0675, 0))
  return merge(parts)
}

export function createAmbushPropGeometries() {
  return [ropeCoil(), drainGrate()]
}

export function getAmbushPropIndex(typeCode) {
  if (typeCode === AMBUSH_PROP_TYPE_CODES.E58) return 0
  if (typeCode === AMBUSH_PROP_TYPE_CODES.E60) return 1
  return -1
}

// ── 외곽선 헐 ────────────────────────────────────────────────────────────────
// 균등 스케일 헐은 원점에서 떨어진 파트(줄 꼬리, 뚜껑)를 밀어내 어긋난다. 대신 같은 위치의 정점을 한 묶음으로
// 보고 묶음 평균 법선 방향으로 부풀린다(묶음 전체가 같은 점으로 가 헐에 틈이 없다). 상자 모서리처럼 법선이
// 갈라지는 곳은 평균 법선이 면과 이루는 각만큼 더 밀어 면 기준 두께가 일정하게 한다.
export function createOutlineGeometry(geometry, thickness = 0.012) {
  const g = geometry.clone()
  g.deleteAttribute('color')
  const pos = g.attributes.position
  const nor = g.attributes.normal
  const groups = new Map()
  const groupOf = new Int32Array(pos.count)
  const sums = []
  for (let i = 0; i < pos.count; i += 1) {
    const key = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`
    let id = groups.get(key)
    if (id === undefined) { id = sums.length / 3; groups.set(key, id); sums.push(0, 0, 0) }
    groupOf[i] = id
    sums[id * 3] += nor.getX(i); sums[id * 3 + 1] += nor.getY(i); sums[id * 3 + 2] += nor.getZ(i)
  }
  const count = sums.length / 3
  const minDot = new Float32Array(count).fill(1)
  for (let id = 0; id < count; id += 1) {
    const len = Math.hypot(sums[id * 3], sums[id * 3 + 1], sums[id * 3 + 2]) || 1
    sums[id * 3] /= len; sums[id * 3 + 1] /= len; sums[id * 3 + 2] /= len
  }
  for (let i = 0; i < pos.count; i += 1) {
    const id = groupOf[i]
    const dot = sums[id * 3] * nor.getX(i) + sums[id * 3 + 1] * nor.getY(i) + sums[id * 3 + 2] * nor.getZ(i)
    if (dot < minDot[id]) minDot[id] = dot
  }
  for (let i = 0; i < pos.count; i += 1) {
    const id = groupOf[i]
    const push = thickness / Math.max(0.45, minDot[id])
    pos.setXYZ(i, pos.getX(i) + sums[id * 3] * push, pos.getY(i) + sums[id * 3 + 1] * push, pos.getZ(i) + sums[id * 3 + 2] * push)
  }
  pos.needsUpdate = true
  g.computeBoundingSphere()
  return g
}

export function createShotGeometries() {
  return SHOT_VISUALS.map((visual) => visual.create())
}

// ── 방향·회전 ────────────────────────────────────────────────────────────────
const _yaw = new THREE.Quaternion()
const _local = new THREE.Quaternion()
const _euler = new THREE.Euler()
const UP = new THREE.Vector3(0, 1, 0)
const SIDE = new THREE.Vector3(1, 0, 0)
const FORWARD = new THREE.Vector3(0, 0, 1)

/** 풀 슬롯 i의 진행 방향(XZ). 포물선은 착지점 쪽, 부메랑/줄은 처음 던진 쪽을 본다. */
export function getShotHeading(pool, i, out) {
  const motion = pool.motion[i]
  let x = pool.velX[i]
  let z = pool.velZ[i]
  if (motion === SHOT_MOTION.LOB) { x = pool.p0[i] - pool.baseX[i]; z = pool.p1[i] - pool.baseZ[i] }
  else if (motion === SHOT_MOTION.RETURN) { x = pool.p1[i]; z = pool.p2[i] }
  if (!(x * x + z * z > 1e-10)) { x = 0; z = 1 }
  out.x = x; out.z = z
  return out
}

/** 외형별 회전. ageMs·slot만으로 정해져 결정론적이다(슬롯별 위상 차이로 떼지어 같이 돌지 않는다). */
export function composeShotQuaternion(quaternion, visualIndex, headingX, headingZ, ageMs, slot) {
  const visual = SHOT_VISUALS[visualIndex] || SHOT_VISUALS[SHOT_VISUAL_FALLBACK]
  const age = Number.isFinite(ageMs) ? ageMs : 0
  const phase = (slot * 1.618) % TAU
  const yaw = Math.atan2(headingX, headingZ)
  switch (visual.spin) {
    case 'spinY':
      return quaternion.setFromAxisAngle(UP, yaw + age * visual.rate + phase)
    case 'tumble':
      _yaw.setFromAxisAngle(UP, yaw)
      _local.setFromAxisAngle(SIDE, age * visual.rate + phase)
      return quaternion.multiplyQuaternions(_yaw, _local)
    case 'bank':
      _yaw.setFromAxisAngle(UP, yaw)
      _local.setFromAxisAngle(FORWARD, 0.35 * Math.sin(age * visual.rate + phase))
      return quaternion.multiplyQuaternions(_yaw, _local)
    case 'wobble':
      _euler.set(0, 0.35 * Math.sin(age * visual.rate + phase), 0.25 * Math.sin(age * visual.rate * 1.7 + phase))
      return quaternion.setFromEuler(_euler)
    default:
      return quaternion.setFromAxisAngle(UP, yaw)
  }
}
