import { describe, expect, it } from 'vitest'
import { getStageEntryTextureUrls, STAGE_ENTRY_TEXTURE_URLS } from './stageEntryPreload.js'

describe('stage entry preload mapping', () => {
  it('preloads only the selected stage floor assets', () => {
    expect(getStageEntryTextureUrls('stage1').join(' ')).toMatch(/tile_stage01/)
    expect(getStageEntryTextureUrls('stage2').join(' ')).toMatch(/tile_stage02_corridor/)
    expect(getStageEntryTextureUrls('stage3').join(' ')).not.toMatch(/tile_stage0[12]/)
    expect(getStageEntryTextureUrls('stage4').join(' ')).toMatch(/tile_stage04_white_ceramic/)
  })

  it('keeps the Stage 2 end-wall exclusive to Stage 2', () => {
    for (const stageId of Object.keys(STAGE_ENTRY_TEXTURE_URLS)) {
      const includesEndWall = getStageEntryTextureUrls(stageId).join(' ').includes('stage02_corridor_end_wall')
      expect(includesEndWall).toBe(stageId === 'stage2')
    }
  })

  it('includes spawn smoke for every playable stage and no boss face image (faces are procedural)', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      expect(getStageEntryTextureUrls(stageId).join(' ')).toMatch(/spawn_smoke_puff/)
      expect(getStageEntryTextureUrls(stageId).join(' ')).not.toMatch(/_face/)
    }
  })
})
