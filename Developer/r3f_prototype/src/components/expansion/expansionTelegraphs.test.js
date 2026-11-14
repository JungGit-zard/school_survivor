// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  B10_STAMP_DECAL,
  createExpansionTelegraphVisual,
  disposeExpansionTelegraphVisual,
  EXPANSION_PATTERN_SHAPES,
  updateExpansionTelegraphVisual,
} from './expansionTelegraphs.js'

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
