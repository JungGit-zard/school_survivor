// Kenney Mini 보스 몸(B10·B05) 파트 지오메트리 빌드. 2026-11-21, threemini. three만 의존(React 없음).
//
// mini_zombies_kenney.glb(readMiniZombieScene) → 보스 1종 = 파트 6개(+ 정지 포즈 전용 소품). 파트마다
//   모델 좌표에서 삼각형 단위 칸 옮기기(리컬러) → 피벗 기준 → (팔) 쉬는 자세로 내리기 → 보스 비율 →
//   소품 합치기(lib/miniBossProps.data.js, 이미 파트 최종 좌표) → 면 법선 → 외곽선.
// Mini 좀비 레이어(인스턴싱)와 달리 보스는 한 마리씩 그리므로 보통 메시로 쓴다. 장면(GLB)·종류마다 한 번만 빌드한다.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MINI_ARM_REST_TILT, MINI_OUTLINE_THICKNESS, readMiniZombieScene } from './miniZombieGeometry.js'
import { MINI_PART_KEYS, miniPaletteKeyAt, miniPaletteRectOf, miniRemapUv } from './miniZombieRoster.js'
import { getMiniBossVisual, miniBossCellTarget } from './miniBossRoster.js'
import MINI_BOSS_PROPS from './miniBossProps.data.js'

function slotUv(slot) {
  const rect = miniPaletteRectOf(slot)
  if (!rect) throw new Error(`mini boss: palette slot ${slot} missing`)
  return [(rect.x + rect.width / 2) / 512, (rect.y + rect.height * 0.5) / 512]
}

function armSign(key) { return key === 'armL' ? 1 : -1 } // armL = +X 쪽(Mini 좀비와 같은 규약)

/** 소품 1개(삼각형 목록) → 위치·UV만 가진 non-indexed 지오메트리. */
export function miniBossPropGeometry(prop) {
  const src = new Float32Array(prop.position)
  const out = new Float32Array(prop.index.length * 3)
  for (let i = 0; i < prop.index.length; i += 1) {
    const v = prop.index[i] * 3
    out[i * 3] = src[v]; out[i * 3 + 1] = src[v + 1]; out[i * 3 + 2] = src[v + 2]
  }
  const [u, w] = slotUv(prop.slot)
  const uv = new Float32Array(prop.index.length * 2)
  for (let i = 0; i < prop.index.length; i += 1) { uv[i * 2] = u; uv[i * 2 + 1] = w }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(out, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return g
}

function recolorTriangles(geometry, visual, part, skinCell) {
  const pos = geometry.attributes.position; const uv = geometry.attributes.uv
  const centroid = [0, 0, 0]
  for (let t = 0; t < pos.count; t += 3) {
    const cell = miniPaletteKeyAt(uv.getX(t), uv.getY(t))
    for (let a = 0; a < 3; a += 1) centroid[a] = (pos.getComponent(t, a) + pos.getComponent(t + 1, a) + pos.getComponent(t + 2, a)) / 3
    const to = miniBossCellTarget(visual, part, cell, centroid, skinCell)
    if (!to) continue
    for (let i = t; i < t + 3; i += 1) {
      const next = miniRemapUv(uv.getX(i), uv.getY(i), to)
      if (next) uv.setXY(i, next[0], next[1])
    }
  }
  uv.needsUpdate = true
}

function finish(geometry) {
  geometry.deleteAttribute('normal')
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * @param raw      readMiniZombieScene() 결과
 * @param type     'B10' | 'B05'
 * @param outline  (geometry, thickness) => outlineGeometry (런타임: lib/projectileZombieShotGeometry.createOutlineGeometry)
 * @returns { parts: [{ key, parent: 'root'|'torso', pivot:[x,y,z] (부모 기준), geometry, outlineGeometry }],
 *            stunProps: [{ part, name, geometry, outlineGeometry }], footY (모델 좌표 발바닥 높이) }
 */
export function buildMiniBoss(raw, type, outline) {
  const visual = getMiniBossVisual(type)
  if (!visual) throw new Error(`mini boss: unknown type ${type}`)
  const body = raw?.bodies?.[visual.body]
  if (!body) throw new Error(`mini boss: body ${visual.body} missing from GLB`)
  const data = MINI_BOSS_PROPS[type]
  const torsoPivot = body.parts.torso.pivot
  const torsoScale = visual.partScale.torso ?? [1, 1, 1]
  const parts = []
  let footY = Infinity
  for (const key of MINI_PART_KEYS) {
    const source = body.parts[key]
    if (!source) continue
    const geometry = source.geometry.index ? source.geometry.toNonIndexed() : source.geometry.clone()
    geometry.deleteAttribute('normal')
    recolorTriangles(geometry, visual, key, body.skinCell)
    geometry.translate(-source.pivot[0], -source.pivot[1], -source.pivot[2])
    if (key === 'armL' || key === 'armR') geometry.applyMatrix4(new THREE.Matrix4().makeRotationZ(-armSign(key) * MINI_ARM_REST_TILT))
    const s = visual.partScale[key] ?? [1, 1, 1]
    geometry.scale(s[0], s[1], s[2])
    const pieces = [geometry, ...data.props.filter((p) => p.part === key).map(miniBossPropGeometry)]
    const merged = finish(pieces.length === 1 ? geometry : mergeGeometries(pieces, false))
    const parentIsTorso = source.parent === 'torso'
    const pivot = parentIsTorso ? source.pivot.map((v, a) => (v - torsoPivot[a]) * torsoScale[a]) : [...source.pivot]
    if (!parentIsTorso) footY = Math.min(footY, source.pivot[1] + merged.boundingBox.min.y)
    parts.push({ key, parent: parentIsTorso ? 'torso' : 'root', pivot, geometry: merged, outlineGeometry: outline ? outline(merged, MINI_OUTLINE_THICKNESS[key]) : null })
  }
  const stunProps = data.stunProps.map((p) => {
    const geometry = finish(miniBossPropGeometry(p))
    return { part: p.part, name: p.name, geometry, outlineGeometry: outline ? outline(geometry, MINI_OUTLINE_THICKNESS.loose) : null }
  })
  return { parts, stunProps, footY }
}

// 장면(GLB)별 캐시: 원본 읽기 1번, 종류마다 빌드 1번. 레이어처럼 dispose하지 않는다(보스는 스테이지마다 다시 나온다).
const _cache = new WeakMap()
export function getMiniBossAssets(scene, type, outline) {
  if (!scene) return null
  let entry = _cache.get(scene)
  if (!entry) { entry = { raw: readMiniZombieScene(scene), built: new Map() }; _cache.set(scene, entry) }
  if (!entry.raw) return null
  if (!entry.built.has(type)) entry.built.set(type, buildMiniBoss(entry.raw, type, outline))
  return { map: entry.raw.map, built: entry.built.get(type) }
}
