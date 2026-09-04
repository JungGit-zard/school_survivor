import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PLAYER_NENDEROID_2HEAD_GLB_PARTS,
  PLAYER_NENDEROID_2HEAD_GLB_URL,
  PLAYER_NENDEROID_2HEAD_PROPORTIONS,
} from './PlayerMesh.jsx'

const componentsDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(componentsDir, '../../..')
const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const runtimeNendoroidGlb = 'player-nendoroid-2head-2026-09-01.glb'
const glbPath = path.resolve(componentsDir, '../assets/models/player', runtimeNendoroidGlb)
const metricsPath = path.resolve(repoRoot, '../Quaility_Assurance/player_nendoroid_2head_glb_2026-09-01/player-nendoroid-2head-metrics.json')

describe('Player 2-head Nendoroid GLB identity integration', () => {
  it('ships a low-poly GLB with semantic protagonist part names and exact 2-head metrics', () => {
    const glb = statSync(glbPath)
    const metrics = JSON.parse(readFileSync(metricsPath, 'utf8'))

    expect(glb.size).toBeGreaterThan(1000)
    expect(metrics).toMatchObject({
      asset_id: 'player-nendoroid-2head',
      head_height: 1.3,
      body_height: 1.3,
      head_to_body_ratio: 1,
      visual_head_count: 2,
      armature_count: 0,
      front_axis: '+Z',
      up_axis: '+Y',
    })
    expect(metrics.mesh_count).toBe(PLAYER_NENDEROID_2HEAD_GLB_PARTS.length)
    expect(metrics.triangle_count).toBeGreaterThan(0)
    expect(metrics.triangle_count).toBeLessThan(3000)
    expect(new Set(metrics.semantic_parts)).toEqual(new Set(PLAYER_NENDEROID_2HEAD_GLB_PARTS))
  })

  it('keeps gameplay PlayerVisual on the shared PlayerMesh seam while PlayerMesh loads the new GLB once', () => {
    const player = read('./Player.jsx')
    const playerMesh = read('./PlayerMesh.jsx')

    expect(player).toContain('<PlayerMesh groupRef={meshGroup} movingRef={movingRef} hitFlashToken={hitFlashToken} previewArmAction={previewArmAction} />')
    expect(player).not.toContain('modelVariant="image2"')
    expect(PLAYER_NENDEROID_2HEAD_GLB_URL).toContain(runtimeNendoroidGlb)
    expect(PLAYER_NENDEROID_2HEAD_PROPORTIONS.visualHeadCount).toBe(2)
    expect(playerMesh).toContain("import { useGLTF } from '@react-three/drei'")
    expect(playerMesh).toContain(runtimeNendoroidGlb)
    expect(playerMesh).toContain('useGLTF(PLAYER_NENDEROID_2HEAD_GLB_URL)')
    expect(playerMesh).toContain('PlayerNendoroidGeometryContext.Provider value={nendoroidNodes}')
    expect(playerMesh).not.toContain('player-image2-2026-08-29.glb')
  })

  it('shares the same PlayerMesh source through Graphics Studio and title without proxy title models', () => {
    const studioPreview = read('./GraphicsStudioPreview.jsx')
    const title = read('./TitleScene3D.jsx')

    expect(studioPreview).toContain("import { PlayerVisual } from './Player.jsx'")
    expect(studioPreview).toContain('<PlayerVisual meshGroup={playerRef} movingRef={movingRef} hp={100} maxHp={100} previewArmAction={PLAYER_STUDIO_ARM_ACTIONS[item.animation] ?? null} />')
    expect(title).toContain("import PlayerMesh from './PlayerMesh.jsx'")
    expect(title).toContain('<PlayerMesh groupRef={meshGroup} movingRef={movingRef} />')
    expect(title).not.toContain('function TitlePlayerProxy')
    expect(title).not.toContain('modelVariant="image2"')
    expect(title).not.toContain('player-image2-2026-08-29.glb')
  })
})
