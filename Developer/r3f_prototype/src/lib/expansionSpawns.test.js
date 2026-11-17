// Stage 6 신규 포메이션·보스 앵커(스펙 Part C C-5-3·C-3-6). 단위 u, 1블록 = 4u.
import { describe, expect, it } from 'vitest'
import {
  ASSEMBLY_ROW_SPACING,
  isInsideExpandedScreenRect,
  TRACK_LANE_POINTS,
  expansionRowPositions,
  expansionSpawnPosition,
  expansionTrackLanePositions,
} from './expansionSpawns.js'
import { getStageBounds } from './stageConfig.js'
import { getStageObjectSightObstacles } from '../components/StageObjects/stageObjectColliders.js'

const bounds = getStageBounds('stage6')
const obstacles = getStageObjectSightObstacles('stage6')
const screen = (player) => ({ minX: player.x - 5, maxX: player.x + 5, minZ: player.z - 12.44, maxZ: player.z + 7.18 })
const E19_RADIUS = 0.28 * 1 * 4 / 3
// 2026-11-18 Terry 운동장 30% 축소: 24 × 40u → 17 × 28u(반폭 8.5 · 반길이 14).

describe('assembly_row', () => {
  it('12마리 가로줄: 간격 1.1u, 같은 z, 전부 맵 안, 플레이어 3u 밖, 위쪽(top)은 화면 위 끝 1u 밖', () => {
    expect(bounds).toEqual({ halfX: 8.5, halfZ: 14 })
    const player = { x: 0, z: 4 }
    const row = expansionRowPositions('E19', 'stage6', player, bounds, screen(player), 12, 'top', obstacles)
    expect(row).toHaveLength(12)
    const z = row[0][2]
    expect(row.every((p) => p[2] === z)).toBe(true)
    expect(z).toBeCloseTo(4 - 12.44 - 1, 9)
    for (let i = 1; i < row.length; i += 1) expect(row[i][0] - row[i - 1][0]).toBeCloseTo(ASSEMBLY_ROW_SPACING, 9)
    for (const [x, , pz] of row) {
      expect(Math.abs(x)).toBeLessThanOrEqual(8.5 - E19_RADIUS)
      expect(Math.abs(pz)).toBeLessThanOrEqual(14 - E19_RADIUS)
      expect(Math.hypot(x - player.x, pz - player.z)).toBeGreaterThanOrEqual(3)
    }
    // 줄 중심은 플레이어 x를 따르되 맵 안으로 클램프된다(12마리 폭 12.1u).
    const edge = expansionRowPositions('E19', 'stage6', { x: 6.5, z: 4 }, bounds, screen({ x: 6.5, z: 4 }), 12, 'top', obstacles)
    expect(edge).toHaveLength(12)
    expect(Math.max(...edge.map((p) => p[0]))).toBeLessThanOrEqual(8.5 - E19_RADIUS + 1e-9)
    // 가장 긴 줄(216초 13마리, 폭 13.2u)도 17u 폭 안에 다 선다.
    expect(expansionRowPositions('E19', 'stage6', { x: 0, z: -5 }, bounds, screen({ x: 0, z: -5 }), 13, 'gate', obstacles)).toHaveLength(13)
  })

  it('gate/bottom은 화면 아래 끝 밖(+Z, 정문 쪽), 경계를 넘으면 클램프', () => {
    const player = { x: 2, z: 0 }
    const gate = expansionRowPositions('E19', 'stage6', player, bounds, screen(player), 12, 'gate', obstacles)
    expect(gate[0][2]).toBeCloseTo(7.18 + 1, 9)
    const deep = { x: 0, z: 12 }
    const clamped = expansionRowPositions('E19', 'stage6', deep, bounds, screen(deep), 12, 'bottom', obstacles)
    // 아래는 경계(14 − r)로 클램프돼 플레이어와 6u 미만 → 반대쪽(위)으로 1회 바꾼다.
    expect(clamped[0][2]).toBeLessThan(deep.z - 6)
  })

  it('auto는 경계까지 여유가 큰 쪽을 고른다', () => {
    const nearTop = { x: 0, z: -9 }
    const auto = expansionRowPositions('E19', 'stage6', nearTop, bounds, screen(nearTop), 12, 'auto', obstacles)
    expect(auto[0][2]).toBeGreaterThan(nearTop.z)
  })

  it('장애물(골대)과 겹치는 슬롯만 건너뛴다', () => {
    // 북쪽 골대 (0, −7.7) 반크기 1.6×0.45. 줄 z를 골대 위로 오게 화면을 맞춘다.
    const player = { x: 0, z: -1 }
    const rect = { minZ: -6.7, maxZ: 5 }
    const row = expansionRowPositions('E19', 'stage6', player, bounds, rect, 12, 'top', obstacles)
    expect(row.length).toBeLessThan(12)
    expect(row.every(([x]) => Math.abs(x) > 1.6)).toBe(true)
  })
})

describe('track_lanes', () => {
  it('트랙 직선 6지점(±5.5 × z −4.2/0/+4.2, stage6 layout 정본), 플레이어 4u 이내 지점은 건너뛴다', () => {
    expect(TRACK_LANE_POINTS).toHaveLength(6)
    const all = expansionTrackLanePositions('E21', 'stage6', { x: 0, z: 13 }, bounds, 6, obstacles)
    expect(all.map(([x, , z]) => [x, z])).toEqual([[-5.5, -4.2], [5.5, -4.2], [-5.5, 0], [5.5, 0], [-5.5, 4.2], [5.5, 4.2]])
    const near = expansionTrackLanePositions('E21', 'stage6', { x: -5.5, z: 0 }, bounds, 6, obstacles)
    expect(near).toHaveLength(5)
    expect(near.some(([x, , z]) => x === -5.5 && z === 0)).toBe(false)
  })

  it('6마리 넘으면 z +2.1u로 한 바퀴 더(최대 12)', () => {
    const twelve = expansionTrackLanePositions('E21', 'stage6', { x: 0, z: 13 }, bounds, 20, obstacles)
    expect(twelve).toHaveLength(12)
    expect(twelve.slice(6).map(([x, , z]) => [x, Math.round(z * 10) / 10])).toEqual([[-5.5, -2.1], [5.5, -2.1], [-5.5, 2.1], [5.5, 2.1], [-5.5, 6.3], [5.5, 6.3]])
  })
})

describe('boss anchor', () => {
  it('B05는 조회대 앞 (0, −11)에 선다. 플레이어가 앵커 4u 안이면 기존 링 규칙(6u)', () => {
    const anchored = expansionSpawnPosition('B05', 'stage6', { x: 0, z: 0 }, bounds, [], obstacles, () => 0.5)
    expect([anchored[0], anchored[2]]).toEqual([0, -11])
    // 플레이어 이동 위 끝(z −10)은 앵커에서 1u — 링 6u로 간다(각도 0.25 → +x 방향, 맵 안).
    const near = expansionSpawnPosition('B05', 'stage6', { x: 0, z: -10 }, bounds, [], obstacles, () => 0.25)
    expect(near).not.toBeNull()
    expect(Math.hypot(near[0], near[2] + 10)).toBeCloseTo(6, 6)
  })

  it('앵커가 없는 확장 보스(stage7 B06)는 기존 링 규칙 그대로', () => {
    const b06 = expansionSpawnPosition('B06', 'stage7', { x: 0, z: 0 }, getStageBounds('stage7'), [], [], () => 0.25)
    expect(Math.hypot(b06[0], b06[2])).toBeCloseTo(6, 6)
  })
})

// 2026-11-18 축소: 일반 링 스폰은 화면 사각형 밖 후보를 먼저 고른다(spawnPolicy.offscreenMarginUnits 1u + 몸 반경).
describe('off-screen ring preference (stage6)', () => {
  const portraitRect = (player) => ({ minX: player.x - 4.21, maxX: player.x + 4.21, minZ: Math.max(-14, Math.min(player.z, 6.82) - 12.44), maxZ: Math.max(-1.56, Math.min(player.z, 6.82)) + 7.18 })
  const lcg = (seed) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }

  it('세로 폰 사각형: 맵 안에서 늘 자리를 받고, 화면 안(여백 포함)으로 떨어지는 건 24번 다 실패한 드문 폴백뿐(≤ 2%)', () => {
    const random = lcg(7)
    let onScreen = 0, total = 0
    for (const player of [{ x: 0, z: 0 }, { x: 6.5, z: -10 }, { x: -6.5, z: 13.2 }, { x: 0, z: -5 }, { x: 3, z: 8 }]) {
      const rect = portraitRect(player)
      for (let i = 0; i < 400; i += 1) {
        const pos = expansionSpawnPosition('E01', 'stage6', player, bounds, [], obstacles, random, 1, rect)
        expect(pos).not.toBeNull()
        expect(Math.abs(pos[0])).toBeLessThanOrEqual(8.5)
        expect(Math.abs(pos[2])).toBeLessThanOrEqual(14)
        total += 1
        if (isInsideExpandedScreenRect(pos[0], pos[2], rect, 1 + 0.28 * 4 / 3)) onScreen += 1
      }
    }
    // 같은 자리·같은 난수로 규칙 없이(screenRect 없음) 뽑으면 화면 안이 훨씬 많다 — 규칙이 실제로 일한다.
    const plain = lcg(7)
    let plainOn = 0
    for (const player of [{ x: 0, z: 0 }, { x: 6.5, z: -10 }, { x: -6.5, z: 13.2 }, { x: 0, z: -5 }, { x: 3, z: 8 }]) {
      const rect = portraitRect(player)
      for (let i = 0; i < 400; i += 1) {
        const pos = expansionSpawnPosition('E01', 'stage6', player, bounds, [], obstacles, plain, 1)
        if (isInsideExpandedScreenRect(pos[0], pos[2], rect, 1 + 0.28 * 4 / 3)) plainOn += 1
      }
    }
    expect(onScreen / total).toBeLessThanOrEqual(0.02)
    expect(plainOn / total).toBeGreaterThan(0.2)
  })

  it('화면이 경기장을 다 덮으면(후보가 전부 화면 안) 맵 안 첫 후보로 돌아가 마릿수를 버리지 않는다', () => {
    const whole = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }
    const pos = expansionSpawnPosition('E01', 'stage6', { x: 0, z: 0 }, bounds, [], obstacles, lcg(3), 1, whole)
    expect(pos).not.toBeNull()
  })

  it('screenRect가 없거나 stage7(정책 없음)이면 예전 결과 그대로', () => {
    const a = expansionSpawnPosition('E01', 'stage6', { x: 0, z: 0 }, bounds, [], obstacles, lcg(11), 1)
    const b = expansionSpawnPosition('E01', 'stage6', { x: 0, z: 0 }, bounds, [], obstacles, lcg(11), 1, null)
    expect(a).toEqual(b)
    const s7 = getStageBounds('stage7')
    const c = expansionSpawnPosition('E22', 'stage7', { x: 0, z: 0 }, s7, [], [], lcg(5), undefined, { minX: -20, maxX: 20, minZ: -20, maxZ: 20 })
    const d = expansionSpawnPosition('E22', 'stage7', { x: 0, z: 0 }, s7, [], [], lcg(5))
    expect(c).toEqual(d)
  })
})
