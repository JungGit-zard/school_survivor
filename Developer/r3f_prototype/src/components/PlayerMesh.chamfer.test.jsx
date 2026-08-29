import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('PlayerMesh chamfered character blocks', () => {
  it('uses the shared cached chamfered box geometry for player surface and outline blocks', () => {
    const source = readFileSync(new URL('./PlayerMesh.jsx', import.meta.url), 'utf8')
    expect(source).toContain('getCachedChamferedBoxGeo')
    expect(source).toContain('PLAYER_CHARACTER_CHAMFER_STEPS = 1')
    expect(source).toContain('getCachedChamferedBoxGeo(...size, PLAYER_CHARACTER_CHAMFER_STEPS)')
    expect(source).not.toContain('new THREE.BoxGeometry(...size)')
  })
})
