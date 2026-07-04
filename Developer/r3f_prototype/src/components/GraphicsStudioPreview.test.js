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
})
