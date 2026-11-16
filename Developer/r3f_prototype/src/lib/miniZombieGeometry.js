// Kenney Mini Characters 2.0(CC0) 몸체 GLB → 2차 신규 좀비 변형별 파트 지오메트리. 2026-11-15, threemini.
//
// GLB(assets/models/kenney_mini/mini_zombies_kenney.glb, scripts/bake_mini_zombies.mjs 산출)는 노드 1개·프리미티브 1개다.
// 정점마다 _PART(uint8) 번호가 있고, 노드 extras.mini.parts가 번호별 { body, part, parent, pivot(모델 좌표), skinCell }
// 또는 { prop } 표다. meshopt 양자화가 스케일·오프셋을 노드 행렬로 옮기므로(KayKit 가구와 같다) 노드 행렬을 정점에 굽는다.
// 법선은 GLB에 없다: 블록 좀비처럼 삼각형을 풀어 면 법선으로 다시 만든다(툰 단이 면마다 끊긴다, GLB 252 → 95 KB).
//
// 변형 1개 = 파트 6개(textbook은 torso·head 2개) + 따로 그리는 소품(loose). 파트 지오메트리는
//   피벗 기준 좌표 → (팔) 쉬는 자세로 내리기 → 소품 합치기 → 팔레트 칸 옮기기(리컬러) → 면 법선 → 외곽선 지오메트리.
// 같은 장면(useGLTF 캐시)에서 같은 변형은 한 번만 만든다. 레이어는 이 지오메트리를 dispose하지 않는다.
// three만 의존한다(React 없음).
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MINI_PART_KEYS, miniPaletteRectOf, miniRemapUv, miniPaletteKeyAt, miniVariantRemap } from './miniZombieRoster.js'

// Kenney 팔은 T자 수평이다. 쉬는 자세 = 어깨에서 아래·바깥으로 1.2rad(≈69°). Kenney idle 클립은 0.785를 쓰지만
// 좀비 팔 뻗기(X −1.35)가 앞쪽으로 모이려면 더 내려야 한다(블록 좀비 팔은 수직으로 늘어진 상태가 0).
export const MINI_ARM_REST_TILT = 1.2
// 외곽선 두께(Kenney 단위, 키 0.671). 블록 좀비(키 2.7에 0.04~0.06)와 같은 비율.
export const MINI_OUTLINE_THICKNESS = Object.freeze({ legL: 0.009, legR: 0.009, torso: 0.012, armL: 0.009, armR: 0.009, head: 0.013, loose: 0.01 })
// 머리 상자(전 캐릭터 공통 x ±0.16, y 0.343~0.661) 기준 고정 닻(머리 피벗 기준).
export const MINI_HEAD_ANCHORS = Object.freeze({
  headCentre: Object.freeze([0, 0.159, 0.002]), headTop: Object.freeze([0, 0.318, 0.002]),
  brow: Object.freeze([0, 0.225, 0.002]), eyes: Object.freeze([0, 0.095, 0.076]),
  // 입 앞: male-b 기준 얼굴 앞면 z 0.16, 콧수염 z ≤ 0.196, 눈 아래끝 = 머리 피벗 위 0.119 → 입(±0.045)이 눈을 가리지 않는 높이·콧수염 앞.
  mouth: Object.freeze([0, 0.06, 0.2]),
})

// ── 코드 소품(GLB에 굽지 않은 프리미티브) ──────────────────────────────────────
// 표의 codeProps가 쓴다. GLB 소품과 똑같이 파트 지오메트리에 합친다(드로콜 0 추가). 상자마다 UV를 팔레트 슬롯 칸 가운데로 찍어
// 텍스처·재질은 전 종 공용 1벌 그대로다. 굽기 스크립트(usedProps)는 props·loose만 읽으므로 이 소품은 GLB를 바꾸지 않는다.
function slotUv(slot) {
  const rect = miniPaletteRectOf(slot)
  if (!rect) throw new Error(`mini zombie: palette slot ${slot} missing`)
  return [(rect.x + rect.width / 2) / 512, (rect.y + rect.height * 0.5) / 512]
}
function codeBox(min, max, slot) {
  const g = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2])
  g.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2)
  g.deleteAttribute('normal')
  const [u, v] = slotUv(slot)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, u, v)
  return g
}
export const MINI_CODE_PROPS = Object.freeze({
  // E98 대식가의 쩍 벌린 큰 입(얼굴 가로의 절반 이상): 빨간 입술 테 · 검붉은 목구멍 · 윗니 3개 · 아랫니 2개 · 혀. 원점 = 입 닻, +z = 앞.
  gapingMouth: () => mergeGeometries([
    codeBox([-0.1, -0.045, 0], [0.1, 0.045, 0.01], 'armRed'),
    codeBox([-0.078, -0.03, 0.01], [0.078, 0.03, 0.016], 'coffeeDark'),
    codeBox([-0.07, 0.012, 0.016], [-0.03, 0.03, 0.021], 'teeth'),
    codeBox([-0.02, 0.012, 0.016], [0.02, 0.03, 0.021], 'teeth'),
    codeBox([0.03, 0.012, 0.016], [0.07, 0.03, 0.021], 'teeth'),
    codeBox([-0.055, -0.03, 0.016], [-0.02, -0.018, 0.021], 'teeth'),
    codeBox([0.02, -0.03, 0.016], [0.055, -0.018, 0.021], 'teeth'),
    codeBox([-0.03, -0.018, 0.016], [0.03, -0.004, 0.019], 'mochiRose'),
  ], false),
})
function propSource(raw, name) {
  const fromGlb = raw.props?.[name]
  if (fromGlb) return fromGlb
  const build = MINI_CODE_PROPS[name]
  return build ? build() : null
}
// 몸 바닥(발) 기준 고정 닻 — loose 소품용.
export const MINI_ROOT_ANCHORS = Object.freeze({ root: Object.freeze([0, 0, 0]), hipRight: Object.freeze([-0.2, 0, 0]) })
// 팔 축을 따라 도는 띠처럼 T자(바인드) 자세에서 붙여야 하는 소품. 나머지는 쉬는 자세(팔을 내린 뒤)에서 붙인다.
const BIND_FRAME_PROPS = new Set(['armband'])

const _v = new THREE.Vector3()
const _m = new THREE.Matrix4()

// ── 1) GLB 장면 → 파트·소품 원본(모델 좌표 float, 인덱스 있음) ───────────────────
export function findMiniZombieMesh(scene) {
  let found = null
  scene?.traverse?.((object) => { if (!found && object.isMesh && Array.isArray(object.userData?.mini?.parts)) found = object })
  return found
}

export function readMiniZombieScene(scene) {
  const mesh = findMiniZombieMesh(scene)
  if (!mesh) return null
  mesh.updateWorldMatrix(true, false)
  const matrix = mesh.matrixWorld
  const source = mesh.geometry
  const pos = source.attributes.position; const uv = source.attributes.uv; const part = source.attributes._part
  const index = source.index
  if (!pos || !uv || !part || !index) throw new Error('mini zombie GLB: position/uv/_part/index missing')
  const table = mesh.userData.mini.parts
  const buckets = table.map(() => ({ map: new Map(), position: [], uv: [], index: [] }))
  for (let t = 0; t < index.count; t += 1) {
    const i = index.getX(t)
    const id = Math.round(part.getX(i))
    const bucket = buckets[id]
    if (!bucket) throw new Error(`mini zombie GLB: vertex part ${id} not in table`)
    let local = bucket.map.get(i)
    if (local === undefined) {
      local = bucket.position.length / 3
      bucket.map.set(i, local)
      _v.fromBufferAttribute(pos, i).applyMatrix4(matrix)
      bucket.position.push(_v.x, _v.y, _v.z)
      bucket.uv.push(uv.getX(i), uv.getY(i))
    }
    bucket.index.push(local)
  }
  const bodies = {}; const props = {}
  table.forEach((entry, id) => {
    const b = buckets[id]
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(b.position, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2))
    geometry.setIndex(b.index)
    if (entry.prop) { props[entry.prop] = geometry; return }
    const body = bodies[entry.body] ?? (bodies[entry.body] = { skinCell: entry.skinCell ?? null, parts: {} })
    body.parts[entry.part] = { geometry, pivot: entry.pivot, parent: entry.parent }
  })
  let map = null
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
  if (material?.map) map = material.map
  return { bodies, props, map }
}

// ── 2) 변형 1개 빌드 ───────────────────────────────────────────────────────────
function remapUvs(geometry, remap) {
  if (!remap || Object.keys(remap).length === 0) return geometry
  const uv = geometry.attributes.uv
  for (let i = 0; i < uv.count; i += 1) {
    const to = remap[miniPaletteKeyAt(uv.getX(i), uv.getY(i))]
    if (!to) continue
    const next = miniRemapUv(uv.getX(i), uv.getY(i), to)
    if (next) uv.setXY(i, next[0], next[1])
  }
  uv.needsUpdate = true
  return geometry
}

function armSign(key) { return key === 'armL' ? 1 : -1 } // armL = +X 쪽
function armRestMatrix(key) { return new THREE.Matrix4().makeRotationZ(-armSign(key) * MINI_ARM_REST_TILT) }

// 팔 닻(바인드 자세, 피벗 기준): 팔 길이 방향(±X) 투영으로 손(바깥 30%)·윗팔(20~45%) 정점의 중심.
function armAnchors(geometry, key) {
  const pos = geometry.attributes.position; const s = armSign(key)
  let len = 0
  for (let i = 0; i < pos.count; i += 1) len = Math.max(len, s * pos.getX(i))
  const acc = { hand: [0, 0, 0, 0], upperArm: [0, 0, 0, 0] }
  for (let i = 0; i < pos.count; i += 1) {
    const f = (s * pos.getX(i)) / len
    const slot = f >= 0.7 ? acc.hand : f >= 0.2 && f <= 0.45 ? acc.upperArm : null
    if (!slot) continue
    slot[0] += pos.getX(i); slot[1] += pos.getY(i); slot[2] += pos.getZ(i); slot[3] += 1
  }
  const out = {}
  for (const [name, [x, y, z, n]] of Object.entries(acc)) out[name] = n ? [x / n, y / n, z / n] : [s * len * 0.5, 0, 0]
  return { ...out, length: len }
}

function bboxAnchor(geometry, fn) { geometry.computeBoundingBox(); return fn(geometry.boundingBox) }

// 파트 닻(파트 피벗 기준 좌표, 쉬는 자세). frame 'bind'는 팔을 내리기 전(T자) 좌표.
export function miniPartAnchor(partKey, anchor, geometry, pivotAbs, frame = 'rest') {
  if (partKey === 'head' && MINI_HEAD_ANCHORS[anchor]) return [...MINI_HEAD_ANCHORS[anchor]]
  if (partKey === 'torso' && anchor === 'chest') return bboxAnchor(geometry, (b) => [0, (b.min.y + b.max.y) / 2, b.max.z])
  if ((partKey === 'legL' || partKey === 'legR') && anchor === 'ankle') return bboxAnchor(geometry, (b) => [(b.min.x + b.max.x) / 2, 0.055 - pivotAbs[1], -0.01 - pivotAbs[2]])
  if ((partKey === 'armL' || partKey === 'armR') && (anchor === 'hand' || anchor === 'upperArm')) {
    const point = new THREE.Vector3(...armAnchors(geometry, partKey)[anchor])
    if (frame !== 'bind') point.applyMatrix4(armRestMatrix(partKey))
    return point.toArray()
  }
  throw new Error(`mini zombie: unknown anchor ${partKey}.${anchor}`)
}

function placedPropGeometry(raw, propSpec, at, remap) {
  const geometry = raw.clone()
  remapUvs(geometry, propSpec.recolor)
  remapUvs(geometry, remap)
  const rotation = propSpec.rotation ?? [0, 0, 0]
  const offset = propSpec.offset ?? [0, 0, 0]
  const scale = propSpec.scale ?? 1
  _m.compose(
    new THREE.Vector3(at[0] + offset[0], at[1] + offset[1], at[2] + offset[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2])),
    new THREE.Vector3(scale, scale, scale),
  )
  geometry.applyMatrix4(_m)
  return geometry
}

// 인덱스 지오메트리 → 풀어서 면 법선(블록 좀비와 같은 처리).
function flatShade(geometry) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry
  if (flat !== geometry) geometry.dispose()
  flat.deleteAttribute('normal')
  flat.computeVertexNormals()
  flat.computeBoundingBox()
  flat.computeBoundingSphere()
  return flat
}

/**
 * @param raw      readMiniZombieScene() 결과
 * @param variant  MINI_ZOMBIE_VISUALS[visualId].variants[k]
 * @param outline  (geometry, thickness) => outlineGeometry — 런타임은 lib/projectileZombieShotGeometry.createOutlineGeometry
 * @returns { parts: [{ key, parentIsTorso, pivot:[x,y,z] (부모 피벗 기준), geometry, outlineGeometry }],
 *            loose: [{ prop, geometry, outlineGeometry, anchor:[x,y,z] (몸 바닥 기준), spec }] }
 */
export function buildMiniVariant(raw, variant, outline) {
  const body = raw?.bodies?.[variant.body]
  if (!body) throw new Error(`mini zombie: body ${variant.body} missing from GLB`)
  const remap = miniVariantRemap(variant, body.skinCell)
  const torsoPivot = body.parts.torso?.pivot ?? [0, 0, 0]
  const parts = []
  for (const key of MINI_PART_KEYS) {
    const source = body.parts[key]
    if (!source) continue
    const pieces = []
    const geometry = source.geometry.clone()
    geometry.translate(-source.pivot[0], -source.pivot[1], -source.pivot[2])
    const isArm = key === 'armL' || key === 'armR'
    const mine = [...(variant.props ?? []), ...(variant.codeProps ?? [])].filter((p) => p.part === key)
    // 바인드 자세(팔을 내리기 전)에서 붙이는 소품
    const bindProps = mine.filter((p) => BIND_FRAME_PROPS.has(p.prop))
    const restProps = mine.filter((p) => !BIND_FRAME_PROPS.has(p.prop))
    const bindAnchors = bindProps.map((p) => miniPartAnchor(key, p.anchor, geometry, source.pivot, 'bind'))
    pieces.push(remapUvs(geometry, remap))
    bindProps.forEach((p, k) => { const g = propSource(raw, p.prop); if (!g) throw new Error(`mini zombie: prop ${p.prop} missing`); pieces.push(placedPropGeometry(g, p, bindAnchors[k], remap)) })
    if (isArm) { const rest = armRestMatrix(key); for (const g of pieces) g.applyMatrix4(rest) }
    for (const p of restProps) {
      const g = propSource(raw, p.prop); if (!g) throw new Error(`mini zombie: prop ${p.prop} missing`)
      pieces.push(placedPropGeometry(g, p, miniPartAnchor(key, p.anchor, source.geometry.clone().translate(-source.pivot[0], -source.pivot[1], -source.pivot[2]), source.pivot, 'rest'), remap))
    }
    const merged = pieces.length === 1 ? pieces[0] : mergeGeometries(pieces.map((g) => (g.index ? g.toNonIndexed() : g)), false)
    const finalGeometry = flatShade(merged)
    const parentIsTorso = source.parent === 'torso'
    const pivot = parentIsTorso ? source.pivot.map((v, a) => v - torsoPivot[a]) : [...source.pivot]
    parts.push({ key, parentIsTorso, pivot, geometry: finalGeometry, outlineGeometry: outline ? outline(finalGeometry, MINI_OUTLINE_THICKNESS[key]) : null })
  }
  const loose = (variant.loose ?? []).map((spec) => {
    const g = raw.props[spec.prop]; if (!g) throw new Error(`mini zombie: prop ${spec.prop} missing`)
    const geometry = g.clone(); remapUvs(geometry, spec.recolor); remapUvs(geometry, remap)
    if (spec.scale && !spec.worldSize) geometry.scale(spec.scale, spec.scale, spec.scale)
    const flat = flatShade(geometry)
    const size = flat.boundingBox.getSize(new THREE.Vector3())
    return {
      prop: spec.prop,
      spec,
      geometry: flat,
      outlineGeometry: outline ? outline(flat, MINI_OUTLINE_THICKNESS.loose) : null,
      anchor: [...(MINI_ROOT_ANCHORS[spec.anchor] ?? MINI_ROOT_ANCHORS.root)],
      maxDimension: Math.max(size.x, size.y, size.z),
    }
  })
  return { parts, loose }
}

// 장면별 캐시: 원본 읽기 1번, 변형 빌드는 열쇠마다 1번.
const _cache = new WeakMap()
export function getMiniZombieAssets(scene, outline) {
  if (!scene) return null
  let assets = _cache.get(scene)
  if (assets) return assets
  const raw = readMiniZombieScene(scene)
  if (!raw) return null
  const built = new Map()
  assets = {
    raw,
    map: raw.map,
    variant(visualId, index, variant) {
      const key = `${visualId}#${index}`
      if (!built.has(key)) built.set(key, buildMiniVariant(raw, variant, outline))
      return built.get(key)
    },
  }
  _cache.set(scene, assets)
  return assets
}
