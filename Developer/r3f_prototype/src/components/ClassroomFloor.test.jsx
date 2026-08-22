import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  FLOOR_TILE,
  STAGE1_FLOOR_DEPTH,
  STAGE1_FLOOR_WIDTH,
  STAGE_FLOOR_TILES,
  STAGE2_CORRIDOR_END,
  STAGE2_CORRIDOR_LANES,
  STAGE3_ARENA,
  STAGE4_TILE_AREA_SCALE,
  STAGE4_TILE_FREQUENCY_MULTIPLIER,
  STAGE4_TILE_LINEAR_SCALE,
} from './ClassroomFloor.jsx'
import { getStageBounds } from '../lib/stageConfig.js'

describe('ClassroomFloor tiling', () => {
  it('uses the stage01 tile asset as the repeating floor pattern', () => {
    expect(typeof FLOOR_TILE.src).toBe('string')
    expect(FLOOR_TILE.src.length).toBeGreaterThan(0)
    expect(FLOOR_TILE.src).toMatch(/tile_stage01/)
  })

  it('uses a dedicated corridor tile and end-wall asset for Stage 2', () => {
    expect(STAGE_FLOOR_TILES.stage1.src).toMatch(/tile_stage01/)
    expect(STAGE_FLOOR_TILES.stage2.src).toMatch(/tile_stage02_corridor/)
    expect(STAGE_FLOOR_TILES.stage2.repeat).toBe(70)
    expect(STAGE2_CORRIDOR_END.src).toMatch(/stage02_corridor_end_wall/)
    expect(STAGE2_CORRIDOR_END.displayWidth).toBeCloseTo(STAGE2_CORRIDOR_END.width * 2 / 5)
    expect(STAGE2_CORRIDOR_END.displayHeight).toBeCloseTo(STAGE2_CORRIDOR_END.height * 2 / 5)
    expect(STAGE2_CORRIDOR_END.repeatX).toBe(5)
    expect(STAGE2_CORRIDOR_END.positionZ + STAGE2_CORRIDOR_END.displayHeight / 2)
      .toBeCloseTo(STAGE2_CORRIDOR_END.bottomZ)
    expect(STAGE2_CORRIDOR_END.bottomZ).toBeLessThan(-getStageBounds('stage2').halfZ)
  })

  it('maps Stage 4 to its dedicated cafeteria tile at exactly one-quarter of the previous visible tile area', () => {
    expect(STAGE_FLOOR_TILES.stage4.src).toMatch(/tile_stage04_cafeteria/)
    // 체커 8칸/장 × 2.06 유닛 = 한 장 16.5 유닛 (원화 st4_concept.png 기준).
    // stage1 값(6.9 → repeat 29)을 쓰면 타일이 잘아 욕실 모자이크로 읽힌다.
    expect(STAGE4_TILE_LINEAR_SCALE).toBe(0.5)
    expect(STAGE4_TILE_AREA_SCALE).toBe(0.25)
    expect(STAGE4_TILE_FREQUENCY_MULTIPLIER).toBe(2)
    expect(STAGE_FLOOR_TILES.stage4.repeat).toBe(24)

    const previousRepeat = 12
    const previousTileArea = (STAGE_FLOOR_TILES.stage4.floorSize / previousRepeat) ** 2
    const currentTileArea = (STAGE_FLOOR_TILES.stage4.floorSize / STAGE_FLOOR_TILES.stage4.repeat) ** 2
    expect(currentTileArea / previousTileArea).toBeCloseTo(0.25)
  })

  it('keeps Stages 1 to 3 floor dimensions and tile frequencies unchanged', () => {
    expect(FLOOR_TILE.floorWidth).toBe(20)
    expect(FLOOR_TILE.floorDepth).toBe(28.8)
    expect(STAGE_FLOOR_TILES.stage2.repeat).toBe(70)
    expect(STAGE3_ARENA.woodRepeat).toBe(25)
  })

  it('limits Stage 1 visual floor to its exact combat bounds with the existing tile density', () => {
    const { halfX, halfZ } = getStageBounds('stage1')

    expect(STAGE1_FLOOR_WIDTH).toBe(halfX * 2)
    expect(STAGE1_FLOOR_DEPTH).toBe(halfZ * 2)
    expect(FLOOR_TILE.floorWidth).toBe(20)
    expect(FLOOR_TILE.floorDepth).toBe(28.8)
    expect(FLOOR_TILE.floorWidth).not.toBe(200)
    expect(FLOOR_TILE.floorDepth).not.toBe(200)
    expect(FLOOR_TILE.floorWidth / FLOOR_TILE.repeatX).toBeCloseTo(6.9)
    expect(FLOOR_TILE.floorDepth / FLOOR_TILE.repeatZ).toBeCloseTo(6.9)
  })

  it('keeps the existing 200 by 200 floor contract for other textured stages', () => {
    expect(STAGE_FLOOR_TILES.stage2.floorSize).toBe(200)
    expect(STAGE_FLOOR_TILES.stage4.floorSize).toBe(200)
  })

  it('does not draw blue Stage 2 lane divider lines', () => {
    expect(STAGE2_CORRIDOR_LANES.centerLineColor).toBeUndefined()
  })

  it('uses one cached tile source on one floor mesh and changes only UV repeat, not draw or memory cost', () => {
    const source = readFileSync(new URL('./ClassroomFloor.jsx', import.meta.url), 'utf8')
    expect(source).toContain('useLoader(THREE.TextureLoader, floorTile.src)')
    expect(source).toContain('tex.repeat.set(tile.userData.floorRepeatX, tile.userData.floorRepeatZ)')
    expect(source).toContain('useMemo(() => buildRepeatingTexture(texture), [texture])')
    expect(source).toContain('<FloorPlane\n      material={floorMat}')
    expect(source).toContain('useLoader(THREE.TextureLoader, STAGE2_CORRIDOR_END.src)')
    expect(source).not.toContain('new THREE.TextureLoader()')
    expect(source).not.toContain('Array.from({ length: floorTile.repeat')
  })
})
