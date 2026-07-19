import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./Tumbler.jsx', import.meta.url), 'utf8')

function indexOfOrThrow(needle) {
  const idx = source.indexOf(needle)
  if (idx < 0) throw new Error(`Missing Tumbler source snippet: ${needle}`)
  return idx
}

describe('TumblerModel visual spec', () => {
  it('keeps the original body outline/body/cap children at the front before adding decorative parts', () => {
    const outline = indexOfOrThrow('<mesh material={outMat} scale={inflateScale([1.12, 1.12, 1.08])}>')
    const body = indexOfOrThrow('<mesh material={bodyMat}>')
    const cap = indexOfOrThrow('<mesh material={capMat} position={[0, 0.34, 0]}>')
    const handleOutline = indexOfOrThrow('<mesh material={outMat} position={[0.29, 0, 0]}')
    const handleBody = indexOfOrThrow('<mesh material={handleMat} position={[0.29, 0, 0]}')
    const strawOutline = indexOfOrThrow('<mesh material={outMat} position={[-0.05, 0.56, 0]}')
    const strawBody = indexOfOrThrow('<mesh material={strawMat} position={[-0.05, 0.56, 0]}')

    expect([outline, body, cap, handleOutline, handleBody, strawOutline, strawBody]).toEqual(
      [...[outline, body, cap, handleOutline, handleBody, strawOutline, strawBody]].sort((a, b) => a - b),
    )
  })

  it('matches the tumbler scale and legacy body/cap geometry numbers exactly', () => {
    expect(source).toContain('<group rotation={[0, 0, Math.PI / 2]} scale={[0.6375, 0.6375, 0.6375]}>')
    expect(source).toContain('<cylinderGeometry args={[0.15, 0.20, 0.58, 10]} />')
    expect(source).toContain('<cylinderGeometry args={[0.16, 0.16, 0.10, 10]} />')
  })

  it('adds a matched outline/body C-handle and straw with the requested geometry proportions', () => {
    expect(source).toContain('const handleMat = useMemo(() => toonMat(0xe85d2a, 0.16), [])')
    expect(source).toContain('const strawMat = useMemo(() => toonMat(0x3dc2c8, 0.12), [])')
    expect(source).toContain('position={[0.29, 0, 0]} rotation={[0, 0, -Math.PI * 0.7]}')
    expect(source).toContain('<torusGeometry args={[0.20, 0.035, 8, 24, Math.PI * 1.4]} />')
    expect(source).toContain('position={[-0.05, 0.56, 0]} rotation={[0, 0, Math.PI * 0.12]}')
    expect(source).toContain('<cylinderGeometry args={[0.028, 0.028, 0.42, 8]} />')
    expect(source).toContain('scale={inflateScale([1.13, 1.13, 1.13])}')
    expect(source).toContain('scale={inflateScale([1.16, 1.16, 1.16])}')
  })
})
