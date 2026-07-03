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
})
