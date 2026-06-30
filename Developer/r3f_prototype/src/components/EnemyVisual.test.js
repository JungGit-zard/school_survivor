import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CHARGE_CUE_LABEL, CHARGE_CUE_LAYOUT, ENEMY_STATS } from './Enemy.jsx'

describe('Enemy charge warning cue', () => {
  it('keeps E05 and B01 charge warning readable with a non-HTML 3D toon speech bubble', () => {
    expect(ENEMY_STATS.E05.charger).toBe(true)
    expect(ENEMY_STATS.B01.charger).toBe(true)

    expect(CHARGE_CUE_LABEL).toBe('GO!')
    expect(CHARGE_CUE_LAYOUT.y).toBeGreaterThan(1.5)
    expect(CHARGE_CUE_LAYOUT.pulseScale).toBeGreaterThan(0)
    expect(CHARGE_CUE_LAYOUT.billboard).toBe(true)
    expect(Object.keys(CHARGE_CUE_LAYOUT.parts)).toEqual(expect.arrayContaining([
      'bubble',
      'tail',
      'gVertical',
      'gTop',
      'gBottom',
      'gMiddle',
      'oLeft',
      'oRight',
      'oTop',
      'oBottom',
      'bang',
      'bangDot',
    ]))

    expect(CHARGE_CUE_LAYOUT.parts.bubble.size[0]).toBeGreaterThan(0.8)
    expect(CHARGE_CUE_LAYOUT.parts.tail.rotation[2]).toBeGreaterThan(0)
    expect(CHARGE_CUE_LAYOUT.parts.bang.size[1]).toBeGreaterThan(0.2)
  })

  it('does not reintroduce the previous Html sprite cue', () => {
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain("import { Html } from '@react-three/drei'")
    expect(source).not.toContain('<Html')
    expect(source).not.toContain('GoSpeechBubble')
  })
})
