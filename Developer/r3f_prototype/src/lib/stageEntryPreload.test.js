import { describe, expect, it } from 'vitest'
import { getStageEntryTextureUrls, STAGE_ENTRY_TEXTURE_URLS } from './stageEntryPreload.js'

describe('stage entry preload mapping', () => {
  it('preloads only the selected stage floor assets', () => {
    expect(getStageEntryTextureUrls('stage1').join(' ')).toMatch(/tile_stage01/)
    expect(getStageEntryTextureUrls('stage2').join(' ')).toMatch(/tile_stage02_corridor/)
    expect(getStageEntryTextureUrls('stage3').join(' ')).not.toMatch(/tile_stage0[12]/)
    expect(getStageEntryTextureUrls('stage4').join(' ')).toMatch(/tile_stage04_cafeteria/)
  })

  it('keeps the Stage 2 end-wall exclusive to Stage 2', () => {
    for (const stageId of Object.keys(STAGE_ENTRY_TEXTURE_URLS)) {
      const includesEndWall = getStageEntryTextureUrls(stageId).join(' ').includes('stage02_corridor_end_wall')
      expect(includesEndWall).toBe(stageId === 'stage2')
    }
  })

  it('includes spawn smoke and the matching boss face for every playable stage', () => {
    expect(getStageEntryTextureUrls('stage1').join(' ')).toMatch(/spawn_smoke_puff.*b01_math_teacher_face/)
    expect(getStageEntryTextureUrls('stage2').join(' ')).toMatch(/spawn_smoke_puff.*b02_stage2_boss_face/)
    expect(getStageEntryTextureUrls('stage3').join(' ')).toMatch(/spawn_smoke_puff.*b03_pe_teacher_face/)
    expect(getStageEntryTextureUrls('stage4').join(' ')).toMatch(/spawn_smoke_puff.*b04_chef_boss_face/)
  })
})
