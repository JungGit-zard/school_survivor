// Stage 6 신규 포메이션·보스 앵커(스펙 Part C C-5-3·C-3-6). 단위 u, 1블록 = 4u.
import { describe, expect, it } from 'vitest'
import {
  ASSEMBLY_ROW_SPACING,
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

describe('assembly_row', () => {
  it('12마리 가로줄: 간격 1.1u, 같은 z, 전부 맵 안, 플레이어 3u 밖, 위쪽(top)은 화면 위 끝 1u 밖', () => {
    expect(bounds).toEqual({ halfX: 12, halfZ: 20 })
    const player = { x: 0, z: 4 }
    const row = expansionRowPositions('E19', 'stage6', player, bounds, screen(player), 12, 'top', obstacles)
    expect(row).toHaveLength(12)
    const z = row[0][2]
    expect(row.every((p) => p[2] === z)).toBe(true)
    expect(z).toBeCloseTo(4 - 12.44 - 1, 9)
    for (let i = 1; i < row.length; i += 1) expect(row[i][0] - row[i - 1][0]).toBeCloseTo(ASSEMBLY_ROW_SPACING, 9)
    for (const [x, , pz] of row) {
      expect(Math.abs(x)).toBeLessThanOrEqual(12 - E19_RADIUS)
      expect(Math.abs(pz)).toBeLessThanOrEqual(20 - E19_RADIUS)
      expect(Math.hypot(x - player.x, pz - player.z)).toBeGreaterThanOrEqual(3)
    }
    // 줄 중심은 플레이어 x를 따르되 맵 안으로 클램프된다(12마리 폭 12.1u).
    const edge = expansionRowPositions('E19', 'stage6', { x: 11, z: 4 }, bounds, screen({ x: 11, z: 4 }), 12, 'top', obstacles)
    expect(Math.max(...edge.map((p) => p[0]))).toBeLessThanOrEqual(12 - E19_RADIUS + 1e-9)
  })

  it('gate/bottom은 화면 아래 끝 밖(+Z, 정문 쪽), 경계를 넘으면 클램프', () => {
    const player = { x: 2, z: 0 }
    const gate = expansionRowPositions('E19', 'stage6', player, bounds, screen(player), 12, 'gate', obstacles)
    expect(gate[0][2]).toBeCloseTo(7.18 + 1, 9)
    const deep = { x: 0, z: 15 }
    const clamped = expansionRowPositions('E19', 'stage6', deep, bounds, screen(deep), 12, 'bottom', obstacles)
    // 아래는 경계(20 − r)로 클램프돼 플레이어와 6u 미만 → 반대쪽(위)으로 1회 바꾼다.
    expect(clamped[0][2]).toBeLessThan(deep.z - 6)
  })

  it('auto는 경계까지 여유가 큰 쪽을 고른다', () => {
    const nearTop = { x: 0, z: -10 }
    const auto = expansionRowPositions('E19', 'stage6', nearTop, bounds, screen(nearTop), 12, 'auto', obstacles)
    expect(auto[0][2]).toBeGreaterThan(nearTop.z)
  })

  it('장애물(골대)과 겹치는 슬롯만 건너뛴다', () => {
    // 북쪽 골대 (0, −11) 반크기 1.6×0.45. 줄 z를 골대 위로 오게 화면을 맞춘다.
    const player = { x: 0, z: -3 }
    const rect = { minZ: -10, maxZ: 5 }
    const row = expansionRowPositions('E19', 'stage6', player, bounds, rect, 12, 'top', obstacles)
    expect(row.length).toBeLessThan(12)
    expect(row.every(([x]) => Math.abs(x) > 1.6)).toBe(true)
  })
})

describe('track_lanes', () => {
  it('트랙 직선 6지점(−9/+9 × z −6/0/+6), 플레이어 4u 이내 지점은 건너뛴다', () => {
    expect(TRACK_LANE_POINTS).toHaveLength(6)
    const all = expansionTrackLanePositions('E21', 'stage6', { x: 0, z: 18 }, bounds, 6, obstacles)
    expect(all.map(([x, , z]) => [x, z])).toEqual([[-9, -6], [9, -6], [-9, 0], [9, 0], [-9, 6], [9, 6]])
    const near = expansionTrackLanePositions('E21', 'stage6', { x: -9, z: 0 }, bounds, 6, obstacles)
    expect(near).toHaveLength(5)
    expect(near.some(([x, , z]) => x === -9 && z === 0)).toBe(false)
  })

  it('6마리 넘으면 z +3u로 한 바퀴 더(최대 12)', () => {
    const twelve = expansionTrackLanePositions('E21', 'stage6', { x: 0, z: 18 }, bounds, 20, obstacles)
    expect(twelve).toHaveLength(12)
    expect(twelve.slice(6).map(([x, , z]) => [x, z])).toEqual([[-9, -3], [9, -3], [-9, 3], [9, 3], [-9, 9], [9, 9]])
  })
})

describe('boss anchor', () => {
  it('B05는 조회대 앞 (0, −17)에 선다. 플레이어가 앵커 4u 안이면 기존 링 규칙(6u)', () => {
    const anchored = expansionSpawnPosition('B05', 'stage6', { x: 0, z: 0 }, bounds, [], obstacles, () => 0.5)
    expect([anchored[0], anchored[2]]).toEqual([0, -17])
    const near = expansionSpawnPosition('B05', 'stage6', { x: 0, z: -15 }, bounds, [], obstacles, () => 0.25)
    expect(near).not.toBeNull()
    expect(Math.hypot(near[0], near[2] + 15)).toBeCloseTo(6, 6)
  })

  it('앵커가 없는 확장 보스(stage7 B06)는 기존 링 규칙 그대로', () => {
    const b06 = expansionSpawnPosition('B06', 'stage7', { x: 0, z: 0 }, getStageBounds('stage7'), [], [], () => 0.25)
    expect(Math.hypot(b06[0], b06[2])).toBeCloseTo(6, 6)
  })
})
