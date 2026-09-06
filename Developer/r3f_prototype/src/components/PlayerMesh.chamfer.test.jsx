import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('PlayerMesh restored chamfered block character implementation', () => {
  it('uses one-step cached chamfered geometry for player surface and outline blocks', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')

    expect(source).toContain('PLAYER_CHARACTER_CHAMFER_STEPS = 1')
    expect(source).toContain('getCachedChamferedBoxGeo(...size, PLAYER_CHARACTER_CHAMFER_STEPS)')
    expect(source).not.toContain('new THREE.BoxGeometry(...size)')
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
