import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  FLOOR_TILE,
  STAGE1_FLOOR_DEPTH,
  STAGE1_FLOOR_WIDTH,
  STAGE_FLOOR_TILES,
  STAGE2_CORRIDOR_END,
  STAGE2_CORRIDOR_LANES,
  STAGE3_ARENA,
  STAGE4_TILE_AREA_SCALE,
  STAGE4_TILE_LINEAR_SCALE,
  STAGE4_TILE_REPEAT_X,
  STAGE4_TILE_REPEAT_Z,
  STAGE4_TILE_WORLD_SIZE,
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

  it('uses one single-tile white ceramic source across the exact Stage 4 combat bounds', () => {
    const { halfX, halfZ } = getStageBounds('stage4')

    expect(STAGE_FLOOR_TILES.stage4.src).toMatch(/tile_stage04_white_ceramic\.webp/)
    expect(STAGE_FLOOR_TILES.stage4.src).not.toMatch(/tile_stage04_cafeteria/)
    expect(STAGE_FLOOR_TILES.stage4.floorWidth).toBe(halfX * 2)
    expect(STAGE_FLOOR_TILES.stage4.floorDepth).toBe(halfZ * 2)
    expect(STAGE_FLOOR_TILES.stage4.floorWidth).toBe(18.72)
    expect(STAGE_FLOOR_TILES.stage4.floorDepth).toBe(32)
    expect(STAGE4_TILE_LINEAR_SCALE).toBeCloseTo(1 / 3)
    expect(STAGE4_TILE_AREA_SCALE).toBeCloseTo(1 / 9)
    expect(STAGE4_TILE_WORLD_SIZE).toBeCloseTo(0.8)
    expect(STAGE4_TILE_REPEAT_X).toBeCloseTo(23.4)
    expect(STAGE4_TILE_REPEAT_Z).toBeCloseTo(40)
    expect(STAGE_FLOOR_TILES.stage4.repeatX).toBe(STAGE4_TILE_REPEAT_X)
    expect(STAGE_FLOOR_TILES.stage4.repeatZ).toBeCloseTo(STAGE4_TILE_REPEAT_Z)
    expect(STAGE_FLOOR_TILES.stage4.floorWidth / STAGE_FLOOR_TILES.stage4.repeatX)
      .toBeCloseTo(STAGE4_TILE_WORLD_SIZE)
    expect(STAGE_FLOOR_TILES.stage4.floorDepth / STAGE_FLOOR_TILES.stage4.repeatZ)
      .toBeCloseTo(STAGE4_TILE_WORLD_SIZE)
    expect(STAGE_FLOOR_TILES.stage4.floorWidth / STAGE_FLOOR_TILES.stage4.repeatX)
      .toBeCloseTo(STAGE_FLOOR_TILES.stage4.floorDepth / STAGE_FLOOR_TILES.stage4.repeatZ)
    expect(STAGE4_TILE_WORLD_SIZE ** 2)
      .toBeCloseTo((2.4 ** 2) * STAGE4_TILE_AREA_SCALE)
    expect(STAGE_FLOOR_TILES.stage4.repeat).toBeUndefined()
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

  it('keeps the existing 200 by 200 floor contract for Stage 2 only', () => {
    expect(STAGE_FLOOR_TILES.stage2.floorSize).toBe(200)
    expect(STAGE_FLOOR_TILES.stage4.floorSize).toBeUndefined()
  })

  it('does not draw blue Stage 2 lane divider lines', () => {
    expect(STAGE2_CORRIDOR_LANES.centerLineColor).toBeUndefined()
  })

  it('uses one cached tile source on one floor mesh and changes only UV repeat, not draw or memory cost', () => {
    const source = readFileSync(new URL('./ClassroomFloor.jsx', import.meta.url), 'utf8')
    expect(source).toContain('useLoader(THREE.TextureLoader, floorTile.src)')
    expect(source).toContain("import stage4TileUrl from '../assets/background_floor/tile_stage04_white_ceramic.webp'")
    expect(source).toContain('tex.repeat.set(tile.userData.floorRepeatX, tile.userData.floorRepeatZ)')
    expect(source).toContain('tex.anisotropy = 8')
    expect(source).toContain('tex.generateMipmaps = true')
    expect(source).toContain('tex.minFilter = THREE.LinearMipmapLinearFilter')
    expect(source).toContain('tex.magFilter = THREE.LinearFilter')
    expect(source).toContain('useMemo(() => buildRepeatingTexture(texture), [texture])')
    // 색 구역 lightMap은 텍스처 슬롯 하나만 더 쓰고 런타임 광원은 늘리지 않는다.
    expect(source).toContain('new THREE.MeshLambertMaterial({ map: floorTex, ...stageFloorLightMapProps(lightBake) })')
    expect(source).toContain('useEffect(() => () => floorMat.dispose(), [floorMat])')
    expect(source).toContain('<FloorPlane\n      material={floorMat}')
    expect(source).toContain('useLoader(THREE.TextureLoader, STAGE2_CORRIDOR_END.src)')
    expect(source).not.toContain('new THREE.TextureLoader()')
    expect(source).not.toContain('Array.from({ length: floorTile.repeat')
  })

  it('keeps the optimized Stage 4 ceramic source as WebP only in the project asset tree', () => {
    const webp = join(process.cwd(), 'src/assets/background_floor/tile_stage04_white_ceramic.webp')
    const png = join(process.cwd(), 'src/assets/background_floor/tile_stage04_white_ceramic.png')

    expect(existsSync(webp)).toBe(true)
    expect(existsSync(png)).toBe(false)
    expect(STAGE_FLOOR_TILES.stage4.src).toMatch(/tile_stage04_white_ceramic\.webp/)
  })
})
