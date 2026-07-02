import { describe, it, expect } from 'vitest'
import { computeTextbookLanding, getLandingBlockers } from './textbookLanding.js'
import { getPlayerMovementBounds } from './playerMovementBounds.js'

// 시드 고정 유사난수 (결정적 테스트)
function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function isInsideAnyBlocker(x, z, blockers) {
  return blockers.some((b) => (x - b.x) ** 2 + (z - b.z) ** 2 < b.rSq)
}

describe('computeTextbookLanding', () => {
  const bounds = getPlayerMovementBounds('stage1')
  const blockers = getLandingBlockers('stage1')

  it('맵 중앙 사망 → 착지점은 항상 이동 경계 안 + 장애물 밖 (수집 가능 보장)', () => {
    const random = seededRandom(42)
    for (let i = 0; i < 200; i++) {
      const pos = [(random() - 0.5) * 12, 0.3, (random() - 0.5) * 40]
      const land = computeTextbookLanding(pos, 'stage1', random)
      expect(land.x).toBeGreaterThanOrEqual(bounds.minX)
      expect(land.x).toBeLessThanOrEqual(bounds.maxX)
      expect(land.z).toBeGreaterThanOrEqual(bounds.minZ)
      expect(land.z).toBeLessThanOrEqual(bounds.maxZ)
      expect(isInsideAnyBlocker(land.x, land.z, blockers)).toBe(false)
    }
  })

  it('벽 바로 앞 사망 → 착지점이 경계 밖으로 나가지 않는다', () => {
    const random = seededRandom(7)
    for (let i = 0; i < 50; i++) {
      const land = computeTextbookLanding([bounds.maxX + 1.2, 0.3, 0], 'stage1', random)
      expect(land.x).toBeLessThanOrEqual(bounds.maxX)
    }
  })

  it('책상 위치에서 사망해도 착지점은 책상 콜라이더 밖', () => {
    const desk = blockers[0]
    const random = seededRandom(99)
    for (let i = 0; i < 50; i++) {
      const land = computeTextbookLanding([desk.x, 0.3, desk.z], 'stage1', random)
      expect(isInsideAnyBlocker(land.x, land.z, blockers)).toBe(false)
    }
  })
})
