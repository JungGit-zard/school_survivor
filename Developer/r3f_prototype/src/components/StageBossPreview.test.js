import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('StageBossPreview', () => {
  it('recreates the R3F camera when zoom changes', () => {
    const source = readFileSync(new URL('./StageBossPreview.jsx', import.meta.url), 'utf8')

    expect(source).toContain('key={frame.zoom}')
    expect(source).toContain('camera={{ position: [0, 2.2, 5.5], zoom: frame.zoom }}')
  })
})
