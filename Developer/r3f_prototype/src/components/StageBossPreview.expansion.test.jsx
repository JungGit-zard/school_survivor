// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import StageBossPreview, { FACE_LOCAL_Y, ENEMY_VISUAL_SCALE, resolveBossPreviewBaseY } from './StageBossPreview.jsx'
import { EXPANSION_VISUALS } from '../lib/expansionVisuals.js'
import { ENEMY_STATS, ENEMY_SIZE_MULTIPLIER } from './Enemy.jsx'

vi.mock('@react-three/fiber', () => ({ Canvas: () => <div />, useFrame: vi.fn(), useThree: s => s({ invalidate: vi.fn() }) }))
// Isolate framing from active gameplay/graphics writers, and use distinct scales to catch B01 fallback.
vi.mock('./Enemy.jsx', () => ({ EnemyVisual: () => null, ENEMY_SIZE_MULTIPLIER: 4 / 3,
  ENEMY_STATS: { B01: { scale: 2 }, B05: { scale: 2.1 }, B06: { scale: 2.2 }, B07: { scale: 2.3 }, B08: { scale: 2.4 }, B09: { scale: 2.5 } },
}))

describe('expansion boss preview framing', () => {
  it.each(['B05', 'B06', 'B07', 'B08', 'B09'])('%s uses the authored head height and its own scale', type => {
    const head = EXPANSION_VISUALS[type].rig.find(p => p.name === 'head')
    expect(head.position[1]).toBe(0.83)
    expect(FACE_LOCAL_Y[type]).toBe(head.position[1])
    const scale = ENEMY_STATS[type].scale * ENEMY_SIZE_MULTIPLIER * ENEMY_VISUAL_SCALE
    expect(resolveBossPreviewBaseY(type) + head.position[1] * scale).toBeCloseTo(0, 10)
  })

  it('preserves original B01-B04 face metadata', () => {
    expect(Object.fromEntries(['B01', 'B02', 'B03', 'B04'].map(id => [id, FACE_LOCAL_Y[id]])))
      .toEqual({ B01: 0.88, B02: 0.88, B03: 0.88, B04: 0.93 })
  })

  it('permits vertical swipes over expansion lobby previews without changing Studio drag handling', () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<StageBossPreview bossType="B05" />))
    expect(container.firstElementChild.style.touchAction).toBe('pan-y')
    act(() => root.render(<StageBossPreview bossType="B05" interactive />))
    expect(container.firstElementChild.style.touchAction).toBe('none')
    act(() => root.unmount())
  })

  it('retains the EnemyVisual scale contract used by framing (read-only source check)', () => {
    const source = readFileSync('src/components/Enemy.jsx', 'utf8')
    expect(source).toMatch(/cs\s*\*\s*0\.333/)
  })
})
