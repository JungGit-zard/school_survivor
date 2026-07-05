import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('GraphicsStudioPreview render contracts', () => {
  it('renders standard zombie catalog items with a direct mesh preview', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain('forceMesh')
    expect(source).toContain("previewKind === 'zombie'")
  })

  it('lets the Matilda studio preview show the movement pose from Motion', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain("previewKind === 'matilda'")
    expect(source).toContain("movementPose={item.animation === 'charge'}")
  })

  it('can preview separated Starlink crash phases and fixed zombie death styles', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain("previewKind === 'starlinkCrash'")
    expect(source).toContain("item.crashPhase === 'impact'")
    expect(source).toContain('item.deathStyle ?? ENEMY_DEATH_COLLAPSE_STYLES[index]')
  })

  it('maps the named player flashlight animation to the runtime arm action', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain('PLAYER_STUDIO_ARM_ACTIONS')
    expect(source).toContain("lanternFlashlight: 'lanternFlashlight'")
  })

  it('uses the shared studio transform for per-axis scale and default rotation preview', () => {
    const source = readFileSync(new URL('./GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain('getStudioTransformProps(tuning)')
    expect(source).toContain('scale={transform.scale}')
    expect(source).toContain('rotation={transform.rotation}')
    expect(source).toContain('StudioTuningPreviewProvider')
  })

  it('keeps catalog-only studio items wired to runtime tuning groups', () => {
    const sourceByFile = {
      './Floor.jsx': readFileSync(new URL('./Floor.jsx', import.meta.url), 'utf8'),
      './MiniHealthBar.jsx': readFileSync(new URL('./MiniHealthBar.jsx', import.meta.url), 'utf8'),
      './EnemyProjectileVisual.jsx': readFileSync(new URL('./EnemyProjectileVisual.jsx', import.meta.url), 'utf8'),
      './VFXLayer.jsx': readFileSync(new URL('./VFXLayer.jsx', import.meta.url), 'utf8'),
      './EnemyDeathCollapse.jsx': readFileSync(new URL('./EnemyDeathCollapse.jsx', import.meta.url), 'utf8'),
      './TitleScene3D.jsx': readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8'),
    }

    expect(sourceByFile['./Floor.jsx']).toContain('stage-floor-${stageId}')
    expect(sourceByFile['./Floor.jsx']).toContain('materialTuning={false}')
    expect(sourceByFile['./MiniHealthBar.jsx']).toContain('ui-mini-health-bar')
    expect(sourceByFile['./EnemyProjectileVisual.jsx']).toContain('enemy-projectile-e04')
    expect(sourceByFile['./VFXLayer.jsx']).toContain('vfx-hit-spark')
    expect(sourceByFile['./VFXLayer.jsx']).toContain('vfx-charge-warning')
    expect(sourceByFile['./VFXLayer.jsx']).toContain('vfx-pickup-pop')
    expect(sourceByFile['./EnemyDeathCollapse.jsx']).toContain('enemy-death-collapse')
    expect(sourceByFile['./EnemyDeathCollapse.jsx']).toContain("enemy-death-${String(index + 1).padStart(2, '0')}")
    expect(sourceByFile['./TitleScene3D.jsx']).toContain('title-scene')
  })
})
