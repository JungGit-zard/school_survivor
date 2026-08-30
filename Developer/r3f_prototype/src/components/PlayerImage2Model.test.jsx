import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const componentsDir = path.dirname(fileURLToPath(import.meta.url))
const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const runtimeImage2Glb = 'player-image2-2026-08-29.glb'

describe('Player graphics rollback with comparison-only Image2 GLB', () => {
  it('keeps PlayerVisual on the default shared PlayerMesh path without the Image2 model variant', () => {
    const player = read('./Player.jsx')

    expect(player).toContain('<PlayerMesh groupRef={meshGroup} movingRef={movingRef} hitFlashToken={hitFlashToken} previewArmAction={previewArmAction} />')
    expect(player).not.toContain('modelVariant="image2"')
  })

  it('removes Image2 GLB runtime wiring from the shared PlayerMesh component', () => {
    const playerMesh = read('./PlayerMesh.jsx')

    expect(playerMesh).not.toContain('useGLTF')
    expect(playerMesh).not.toContain(runtimeImage2Glb)
    expect(playerMesh).not.toContain('PLAYER_IMAGE2_GLB_PARTS')
    expect(playerMesh).not.toContain('PlayerImage2Mesh')
    expect(playerMesh).not.toContain('modelVariant')
    expect(playerMesh).toContain('export default function PlayerMesh({ groupRef, movingRef, hitFlashToken = 0, previewArmAction = null })')
    expect(playerMesh).toContain('<StudioTunedGroup itemId="player">')
    expect(playerMesh).toContain('new THREE.BoxGeometry(...size)')
  })

  it('leaves the title player call site on the same default PlayerMesh path', () => {
    const title = read('./TitleScene3D.jsx')
    const titlePlayer = title.match(/function TitlePlayer[\s\S]*?<\/group>\s*\)/)?.[0] ?? ''

    expect(titlePlayer).toContain('<PlayerMesh groupRef={meshGroup} movingRef={movingRef} />')
    expect(titlePlayer).not.toContain('modelVariant="image2"')
  })
})
