import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GRAPHICS_STUDIO_CATALOG } from '../../lib/graphicsStudioConfig.js'
import { STAGE_PROP_TYPES } from '../../lib/stagePropPlacements.js'

describe('pressure cauldron landmark', () => {
  it('uses only depth-writing opaque toon surfaces and non-depth-writing outlines', () => {
    const source = fs.readFileSync(new URL('./PressureCauldron.jsx', import.meta.url), 'utf8')
    const renderingSource = fs.readFileSync(new URL('./propRendering.js', import.meta.url), 'utf8')
    expect(source).not.toContain('getStagePropToonMaterial')
    expect(source).toContain('getStagePropDepthWritingToonMaterial')
    expect(renderingSource).toContain('getCachedToonMat(color, emissiveIntensity, STAGE_PROP_SURFACE_SIDE, true)')
    expect(renderingSource).toContain('material.depthWrite = false')
  })

  it('contains every user-defined landmark part in the canonical shared model source', () => {
    const source = fs.readFileSync(new URL('./PressureCauldron.jsx', import.meta.url), 'utf8')
    ;[
      'faceted-white-vessel',
      'yellow-top-handle',
      'gauge-and-red-indicator',
      'red-side-handwheel',
      'dark-industrial-base',
      'front-step-and-pipe',
      'side-control-housings',
    ].forEach((part) => expect(source).toContain(part))
  })

  it('keeps game and Studio on the same canonical cauldron component and item id', () => {
    const modelSource = fs.readFileSync(new URL('./PressureCauldron.jsx', import.meta.url), 'utf8')
    const previewSource = fs.readFileSync(new URL('../GraphicsStudioPreview.jsx', import.meta.url), 'utf8')
    const layerSource = fs.readFileSync(new URL('./StageObjectLayer.jsx', import.meta.url), 'utf8')
    const catalogItem = GRAPHICS_STUDIO_CATALOG.find(({ id }) => id === 'stage-object-pressure-cauldron')

    expect(catalogItem).toMatchObject({
      category: 'stageObject',
      objectType: 'pressureCauldron',
      source: 'components/StageObjects/PressureCauldron.jsx',
    })
    expect(previewSource).toContain("objectType === 'pressureCauldron') return <PressureCauldron />")
    expect(modelSource).toContain('StudioTunedGroup itemId="stage-object-pressure-cauldron"')
    expect(layerSource).toContain('pressureCauldron: PressureCauldron')
    expect(STAGE_PROP_TYPES).toContain('pressureCauldron')
  })
})
