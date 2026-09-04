import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const runtimeNendoroidGlb = 'player-nendoroid-2head-2026-09-01.glb'

describe('PlayerMesh 2-head Nendoroid GLB character implementation', () => {
  it('throws for missing named GLB semantic part geometry instead of silently falling back', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')

    expect(source).toContain('PLAYER_CHARACTER_CHAMFER_STEPS = 1')
    expect(source).toContain('if (partName)')
    expect(source).toContain('nodes?.[partName]?.geometry')
    expect(source).toContain('throw new Error(`Player Nendoroid GLB missing required semantic part geometry: ${partName}`)')
    expect(source).not.toContain('return partName && nodes?.[partName]?.geometry')
  })

  it('keeps procedural chamfered boxes only for utility/effect blocks with null partName', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')

    expect(source).toContain('return getCachedChamferedBoxGeo(...size, PLAYER_CHARACTER_CHAMFER_STEPS)')
    expect(source).toContain('function Block({ size, position, rotation, color, emissive = 0.14, partName = null })')
    expect(source).toContain('function OutlineBlock({ size, position, rotation, scale = 1.08, crowdVisible = false, partName = null })')
    expect(source).toContain('const s = inflateScale(scale)')
  })

  it('loads the new Nendoroid GLB as the shared geometry source, not the deleted Image2 asset', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')

    expect(source).toContain('@react-three/drei')
    expect(source).toContain('useGLTF')
    expect(source).toContain(runtimeNendoroidGlb)
    expect(source).toContain('PLAYER_NENDEROID_2HEAD_GLB_PARTS')
    expect(source).toContain('PLAYER_NENDEROID_2HEAD_PROPORTIONS')
    expect(source).not.toContain('player-image2-2026-08-29.glb')
    expect(source).not.toContain('modelVariant')
  })
})
