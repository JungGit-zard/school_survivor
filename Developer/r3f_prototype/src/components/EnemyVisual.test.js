import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CHARGE_CUE_LAYOUT, ENEMY_STATS } from './Enemy.jsx'

describe('Enemy charge warning cue', () => {
  it('keeps E05 and B01 charge warning readable with a non-HTML 3D toon cue', () => {
    expect(ENEMY_STATS.E05.charger).toBe(true)
    expect(ENEMY_STATS.B01.charger).toBe(true)

    expect(CHARGE_CUE_LAYOUT.y).toBeGreaterThan(1.5)
    expect(CHARGE_CUE_LAYOUT.pulseScale).toBeGreaterThan(0)
    expect(Object.keys(CHARGE_CUE_LAYOUT.parts)).toEqual([
      'mark',
      'dot',
      'leftChevron',
      'rightChevron',
    ])

    expect(CHARGE_CUE_LAYOUT.parts.mark.size[1]).toBeGreaterThan(0.4)
    expect(CHARGE_CUE_LAYOUT.parts.dot.radius).toBeGreaterThan(0.08)
    expect(CHARGE_CUE_LAYOUT.parts.leftChevron.position[0]).toBeLessThan(0)
    expect(CHARGE_CUE_LAYOUT.parts.rightChevron.position[0]).toBeGreaterThan(0)
  })

  it('does not reintroduce the previous Html sprite speech bubble cue', () => {
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain("import { Html } from '@react-three/drei'")
    expect(source).not.toContain('<Html')
    expect(source).not.toContain('GoSpeechBubble')
    expect(source).not.toContain('go!')
  })
})
