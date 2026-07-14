import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('ChibikoModel outline coverage', () => {
  it('gives every body Part an inverted-hull outline', () => {
    const source = readFileSync(new URL('./Chibiko.jsx', import.meta.url), 'utf8')
    const start = source.indexOf('export function ChibikoModel')
    const end = source.indexOf('export function ChibikoPencilModel', start)
    const modelSource = source.slice(start, end)
    const parts = modelSource.match(/<Part\b[^>]*\/>/g) ?? []

    expect(parts).toHaveLength(19)
    expect(parts.every((part) => part.includes('outlineMaterial={outline}'))).toBe(true)
    expect(source).toContain('<mesh renderOrder={0} geometry={geometry} material={outlineMaterial} scale={[s, s, s]} userData={{ studioRenderOutline: true }} />')

    expect(modelSource).toContain('position={[-0.09, 0.62, 0.25]} rotation={[0, 0, -0.45]} material={ribbonMat} outlineMaterial={outline} outlineScale={1.03}')
    expect(modelSource).toContain('position={[0.09, 0.62, 0.25]} rotation={[0, 0, 0.45]} material={ribbonMat} outlineMaterial={outline} outlineScale={1.03}')
    expect(modelSource).toContain('position={[0.02, -0.5, 0]} material={skinMat} outlineMaterial={outline} outlineScale={1.04}')
    expect(modelSource).toContain('position={[-0.02, -0.5, 0]} material={skinMat} outlineMaterial={outline} outlineScale={1.04}')
    expect(modelSource).toContain('position={[-0.16, -0.3, 0]} material={skinMat} outlineMaterial={outline} outlineScale={1.04}')
    expect(modelSource).toContain('position={[0.16, -0.3, 0]} material={skinMat} outlineMaterial={outline} outlineScale={1.04}')
  })
})
