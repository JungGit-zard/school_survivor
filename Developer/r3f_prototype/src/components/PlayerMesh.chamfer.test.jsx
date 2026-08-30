import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('PlayerMesh restored block character implementation', () => {
  it('uses plain shared box geometry for player surface and outline blocks', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')

    expect(source).toContain('new THREE.BoxGeometry(...size)')
    expect(source).not.toContain('getCachedChamferedBoxGeo')
    expect(source).not.toContain('chamfer')
  })

  it('does not load or branch to the Image2 GLB runtime mesh', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain('@react-three/drei')
    expect(source).not.toContain('useGLTF')
    expect(source).not.toContain('player-image2-2026-08-29.glb')
    expect(source).not.toContain('PlayerImage2Mesh')
    expect(source).not.toContain('modelVariant')
  })
})
