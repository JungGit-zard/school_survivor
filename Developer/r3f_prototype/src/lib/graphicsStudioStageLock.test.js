import { describe, expect, it } from 'vitest'
import {
  GRAPHICS_STUDIO_CATALOG,
  STAGE_LOCK_STUDIO_ITEM_ID,
  getStudioItemById,
} from './graphicsStudioConfig.js'

describe('Graphics Studio stage lock catalog entry', () => {
  it('registers the stage lock once under the UI category', () => {
    const matches = GRAPHICS_STUDIO_CATALOG.filter((item) => item.id === STAGE_LOCK_STUDIO_ITEM_ID)

    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({
      id: STAGE_LOCK_STUDIO_ITEM_ID,
      category: 'ui',
      label: 'Stage Lock',
      source: 'components/StageLock.jsx',
      previewKind: 'stageLock',
      runtimePreviewComponent: 'StageLockModel',
    })
  })

  it('uses the same item id for runtime and Graphics Studio preview lookup', () => {
    const catalogItem = getStudioItemById(STAGE_LOCK_STUDIO_ITEM_ID)

    expect(catalogItem.id).toBe(STAGE_LOCK_STUDIO_ITEM_ID)
    expect(catalogItem.applyTargets).toEqual(expect.arrayContaining([
      'components/StageLock.jsx',
      'components/GraphicsStudioPreview.jsx',
      'lib/toon.js',
    ]))
  })
})
