import { beforeEach, describe, expect, it } from 'vitest'
import {
  BOSS_FACE_BOSS_OPTIONS,
  BOSS_FACE_PART_CATEGORIES,
  DEFAULT_BOSS_FACE_RECIPE,
  loadBossFaceRecipes,
  normalizeBossFaceRecipe,
  normalizeBossFaceRecipeMap,
  saveBossFaceRecipes,
} from './bossFaceParts.js'
import { commitFirebaseStudioRuntime } from './studioRuntimeState.js'

describe('bossFaceParts', () => {
  beforeEach(() => {
    commitFirebaseStudioRuntime({
      tunings: {},
      sfxTunings: {},
      stageBossPreview: {},
      decals: {},
      propPlacements: {},
      bossFaceRecipes: {},
    }, { revision: 1 })
  })

  it('provides four boss targets and five parts for each face category', () => {
    expect(BOSS_FACE_BOSS_OPTIONS.map((boss) => boss.type)).toEqual(['B01', 'B02', 'B03', 'B04'])
    expect(BOSS_FACE_PART_CATEGORIES.map((category) => [category.key, category.parts.length])).toEqual([
      ['brow', 5],
      ['eye', 5],
      ['nose', 5],
      ['mouth', 5],
    ])
  })

  it('normalizes invalid recipes back to the default simple zombie face', () => {
    expect(normalizeBossFaceRecipe({ brow: 'bad', eye: 'eye-x-dizzy', extra: true })).toEqual({
      ...DEFAULT_BOSS_FACE_RECIPE,
      eye: 'eye-x-dizzy',
    })
  })

  it('filters unknown boss keys and persists recipe maps in the Firebase runtime dataset', () => {
    const normalized = normalizeBossFaceRecipeMap({
      B01: { brow: 'brow-angry-slash', eye: 'eye-empty-oval', nose: 'nose-dot', mouth: 'mouth-zigzag' },
      BAD: { brow: 'brow-flat-deadpan' },
    })
    expect(normalized).toEqual({
      B01: { brow: 'brow-angry-slash', eye: 'eye-empty-oval', nose: 'nose-dot', mouth: 'mouth-zigzag' },
    })

    saveBossFaceRecipes(normalized)
    expect(loadBossFaceRecipes()).toEqual(normalized)
  })
})
