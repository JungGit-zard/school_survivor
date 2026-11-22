// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import {
  B05_CHANT_TELEGRAPH,
  B10_STAMP_DECAL,
  b05ChantTelegraphEnvelope,
  createExpansionTelegraphVisual,
  disposeExpansionTelegraphVisual,
  EXPANSION_PATTERN_SHAPES,
  EXPANSION_TELEGRAPH_FILL,
  updateExpansionTelegraphVisual,
} from './expansionTelegraphs.js'
import { syncExpansionTelegraphs } from './ExpansionHazardLayer.jsx'
import { clearExpansionAttacks, createExpansionAttackState, expansionAttackContains, stepExpansionAttack } from '../../lib/expansionAttackRuntime.js'

afterEach(() => vi.restoreAllMocks())

describe('B10 telegraph shapes (spec Part B §6-1 · §12-3)', () => {
  it('maps the approval stamp to a disk and the attendance-ledger swing to a sector', () => {
    expect(EXPANSION_PATTERN_SHAPES.b10_p1).toBe('disk')
    expect(EXPANSION_PATTERN_SHAPES.b10_p2).toBe('sector')
  })

  it('builds the b10_p2 120° sector from its snapshot without a stamp decal', () => {
    const root = createExpansionTelegraphVisual({ patternId: 'b10_p2', shape: 'sector', phase: 'windup', originXZ: [1, 2], directionXZ: [0, 1], rangeUnits: 3.2, angleDeg: 120, windupMs: 1000, elapsedMs: 0 })
    expect(root).not.toBeNull()
    expect(root.name).toBe('expansion-sector-windup')
    expect(root.getObjectByName('b10-stamp-decal')).toBeUndefined()
    disposeExpansionTelegraphVisual(root)
  })

  it('keeps the b10_p1 windup a plain disc (stamp hidden) and stamps 決 only on the hit: windup 0, active 0.9', () => {
    const fillText = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
      clearRect() {}, beginPath() {}, arc() {}, stroke() {}, fillText, set strokeStyle(_) {}, set fillStyle(_) {},
      set lineWidth(_) {}, set font(_) {}, set textAlign(_) {}, set textBaseline(_) {},
    }))
    const event = { patternId: 'b10_p1', shape: 'disk', phase: 'windup', originXZ: [0, -5], radius: 1.6, windupMs: 1300, elapsedMs: 0 }
    const root = createExpansionTelegraphVisual(event)
    const decal = root.getObjectByName('b10-stamp-decal')
    expect(decal).toBeDefined()
    expect(fillText).toHaveBeenCalledWith('決', expect.any(Number), expect.any(Number))
    expect(decal.geometry.parameters.width).toBeCloseTo(1.6 * B10_STAMP_DECAL.radiusScale * 2, 6)
    updateExpansionTelegraphVisual(root, { ...event, elapsedMs: 0 })
    expect(root.userData.stampMat.opacity).toBe(0)
    // 2026-11-14 Terry: 경고(windup)는 원형 색상만 — 도장 무늬는 windup 내내 보이지 않는다.
    expect(B10_STAMP_DECAL.windupMaxOpacity).toBe(0)
    updateExpansionTelegraphVisual(root, { ...event, elapsedMs: 650 })
    expect(root.userData.stampMat.opacity).toBe(0)
    updateExpansionTelegraphVisual(root, { ...event, elapsedMs: 1300 })
    expect(root.userData.stampMat.opacity).toBe(0)
    const dispose = vi.spyOn(root.userData.stampMat, 'dispose')
    disposeExpansionTelegraphVisual(root)
    expect(dispose).toHaveBeenCalled()

    const active = createExpansionTelegraphVisual({ ...event, phase: 'active', elapsedMs: 0 })
    updateExpansionTelegraphVisual(active, { ...event, phase: 'active' })
    expect(active.userData.stampMat.opacity).toBe(B10_STAMP_DECAL.activeOpacity)
    disposeExpansionTelegraphVisual(active)
  })

  it('never adds the stamp decal to other bosses’ disks', () => {
    const root = createExpansionTelegraphVisual({ patternId: 'b06_p1', shape: 'disk', phase: 'windup', originXZ: [0, 0], radius: 1.4, windupMs: 1000, elapsedMs: 0 })
    expect(root.getObjectByName('b10-stamp-decal')).toBeUndefined()
    expect(root.userData.stampMat).toBeUndefined()
    disposeExpansionTelegraphVisual(root)
  })
})

// Stage 6 B05 교장 「교가 제창」(b05_p2) 십자: 등장·퇴장만 부드럽게(Terry 2026-11-22). 타격 순간 표시 = 실제 피격 범위 그대로.
describe('B05 chant cross telegraph eases in and out (visual only)', () => {
  const W = 1400, A = 350

  it('envelope: 0 at windup start, 1 held well before impact, 1 through the hit window, smooth to 0 after', () => {
    const at = (phase, e) => ({ ...b05ChantTelegraphEnvelope(phase, e, W, A) })
    expect(at('windup', 0)).toMatchObject({ fade: 0, scale: B05_CHANT_TELEGRAPH.startScale })
    // 등장 램프는 단조 증가, fadeInMs에서 1에 닿고 타격 직전까지 1로 고정.
    let prev = at('windup', 0)
    for (let e = 10; e <= B05_CHANT_TELEGRAPH.fadeInMs; e += 10) {
      const cur = at('windup', e)
      expect(cur.fade).toBeGreaterThanOrEqual(prev.fade)
      expect(cur.scale).toBeGreaterThanOrEqual(prev.scale)
      prev = cur
    }
    for (const e of [B05_CHANT_TELEGRAPH.fadeInMs, 700, 1200, W - 1]) expect(at('windup', e)).toMatchObject({ fade: 1, scale: 1, flash: 0 })
    expect(B05_CHANT_TELEGRAPH.fadeInMs).toBeLessThan(W * 0.5)
    // 피해 판정 창(active): 배율·불투명도 배수 정확히 1, 타격 첫 순간 번쩍(1) → active 끝 0.
    for (const e of [W, W + 100, W + A - 1]) expect(at('active', e)).toMatchObject({ fade: 1, scale: 1 })
    expect(at('active', W).flash).toBe(1)
    expect(at('active', W + A).flash).toBe(0)
    // 퇴장: recovery 시작 1에서 fadeOutMs에 0까지 단조 감소(smoothstep — 시작·끝 기울기 0).
    expect(at('recovery', W + A).fade).toBe(1)
    let last = 1
    for (let e = W + A; e <= W + A + B05_CHANT_TELEGRAPH.fadeOutMs; e += 15) {
      const f = at('recovery', e).fade
      expect(f).toBeLessThanOrEqual(last)
      last = f
    }
    expect(at('recovery', W + A + B05_CHANT_TELEGRAPH.fadeOutMs).fade).toBe(0)
    expect(at('recovery', W + A + 5).fade).toBeGreaterThan(0.99)
    // 경과 시간이 없는 이벤트는 숨기지 않는다(곡선 없이 그대로).
    expect(at('windup', undefined)).toMatchObject({ fade: 1, scale: 1, flash: 0 })
  })

  it('keeps one root from windup through the hit into the fade-out, then removes it (no pop in, no pop out)', () => {
    clearExpansionAttacks()
    const state = createExpansionAttackState('B05', 'b05-chant'); state.patternIndex = 1
    const base = { x: 0, z: 0, playerX: 0, playerZ: 2, alive: true, playing: true, gameKey: 0, hpRatio: 1, deltaMs: 2500, stageId: 'stage6', halfX: 7.5, halfZ: 19.2, obstacles: [] }
    stepExpansionAttack(state, base)
    const snap = state.snapshot
    expect(snap?.patternId).toBe('b05_p2')
    const group = new THREE.Group(), cache = new Map()
    syncExpansionTelegraphs(group, cache, [snap])
    const root = group.children[0]
    expect(root.userData.b05Chant).toBe(true)
    expect(root.scale.x).toBeCloseTo(B05_CHANT_TELEGRAPH.startScale, 6)
    expect(root.userData.fillMat.opacity).toBe(0)
    const geometries = []; root.traverse((n) => { if (n.isMesh) geometries.push(n.geometry) })
    const step = (ms) => { stepExpansionAttack(state, { ...base, playerX: 6, playerZ: 6, deltaMs: ms }); syncExpansionTelegraphs(group, cache, [snap]) }
    step(700)
    expect(root.scale.x).toBe(1)
    step(699) // 1399ms: 타격 직전
    expect(snap.phase).toBe('windup')
    expect(root.userData.fillMat.opacity).toBeCloseTo(EXPANSION_TELEGRAPH_FILL.windupOpacity + EXPANSION_TELEGRAPH_FILL.windupOpacityGain * 1399 / 1400, 5)
    step(1) // 1400ms: 타격 순간
    expect(snap.phase).toBe('active')
    expect(group.children[0]).toBe(root)
    expect(root.scale.x).toBe(1)
    expect(root.userData.fillMat.color.getHexString()).toBe(new THREE.Color(EXPANSION_TELEGRAPH_FILL.activeColor).getHexString())
    expect(root.userData.fillMat.opacity).toBeCloseTo(EXPANSION_TELEGRAPH_FILL.activeOpacity + B05_CHANT_TELEGRAPH.impactFlashOpacity, 5)
    step(350) // recovery 시작: 예전에는 여기서 바로 사라졌다.
    expect(snap.phase).toBe('recovery')
    expect(group.children[0]).toBe(root)
    expect(root.userData.fillMat.opacity).toBeCloseTo(EXPANSION_TELEGRAPH_FILL.activeOpacity, 5)
    step(210)
    expect(root.userData.fillMat.opacity).toBeGreaterThan(0)
    expect(root.userData.fillMat.opacity).toBeLessThan(EXPANSION_TELEGRAPH_FILL.activeOpacity)
    const kept = []; root.traverse((n) => { if (n.isMesh) kept.push(n.geometry) })
    expect(kept).toEqual(geometries) // 페이즈가 바뀌어도 지오메트리를 다시 만들지 않는다
    step(220)
    expect(group.children).toHaveLength(0)
    expect(cache.size).toBe(0)
    clearExpansionAttacks()
  })

  it('other bosses keep the old behaviour (no envelope, gone in recovery)', () => {
    const event = { patternId: 'b08_p1', shape: 'cross', phase: 'windup', originXZ: [0, 0], rangeUnits: 5, widthUnits: 0.7, windupMs: 1400, activeMs: 350, elapsedMs: 0 }
    const group = new THREE.Group(), cache = new Map()
    syncExpansionTelegraphs(group, cache, [event])
    const root = group.children[0]
    expect(root.userData.b05Chant).toBeUndefined()
    expect(root.scale.x).toBe(1)
    expect(root.userData.fillMat.opacity).toBe(EXPANSION_TELEGRAPH_FILL.windupOpacity)
    event.phase = 'recovery'; event.elapsedMs = 1800
    syncExpansionTelegraphs(group, cache, [event])
    expect(group.children).toHaveLength(0)
  })

  it('at the moment of impact the drawn cross is exactly the damage area (independent triangle oracle)', () => {
    clearExpansionAttacks()
    const state = createExpansionAttackState('B05', 'b05-oracle'); state.patternIndex = 1
    const base = { x: 5.8, z: 0, playerX: 5.9, playerZ: 0.3, alive: true, playing: true, gameKey: 0, hpRatio: 1, deltaMs: 2500, stageId: 'stage6', halfX: 7.5, halfZ: 19.2, obstacles: [{ x: 4, z: 2, halfX: 2, halfZ: 0.25, rotationY: 0.3 }] }
    stepExpansionAttack(state, base)
    const snap = state.snapshot
    expect(snap?.patternId).toBe('b05_p2')
    const group = new THREE.Group(), cache = new Map()
    syncExpansionTelegraphs(group, cache, [snap])
    stepExpansionAttack(state, { ...base, playerX: -7, playerZ: -18, deltaMs: snap.windupMs }) // 정확히 타격 순간
    expect(snap.phase).toBe('active')
    syncExpansionTelegraphs(group, cache, [snap])
    const root = group.children[0]
    group.updateMatrixWorld(true)
    const tris = []
    root.traverse((mesh) => {
      if (!mesh.isMesh) return
      const p = mesh.geometry.attributes.position, idx = mesh.geometry.index
      for (let i = 0; i < (idx?.count ?? p.count); i += 3) {
        const vs = [0, 1, 2].map((j) => { const v = new THREE.Vector3().fromBufferAttribute(p, idx ? idx.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld); v.y = 0; return v })
        const t = new THREE.Triangle(...vs); if (t.getArea() > 1e-10) tris.push(t)
      }
    })
    expect(tris.length).toBeGreaterThan(0)
    const q = new THREE.Vector3()
    let checked = 0
    for (let ix = 0; ix < 23; ix++) for (let iz = 0; iz < 25; iz++) {
      const x = -7.4 + ix * 0.67, z = -8.17 + iz * 0.71, pt = new THREE.Vector3(x, 0, z)
      let d = Infinity; for (const t of tris) { t.closestPointToPoint(pt, q); d = Math.min(d, pt.distanceTo(q)) }
      if (Math.abs(d - 0.192) < 1e-5) continue
      expect(expansionAttackContains(snap, x, z, 0.192), `${x},${z}`).toBe(Math.abs(x) <= 7.5 && Math.abs(z) <= 19.2 && d <= 0.192)
      checked++
    }
    expect(checked).toBeGreaterThan(500)
    clearExpansionAttacks()
  })
})
