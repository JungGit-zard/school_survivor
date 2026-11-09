// @vitest-environment jsdom
import React, { act } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createRoot, extend, useThree } from '@react-three/fiber'
import B10StampDeathMarkLayer, {
  B10_STAMP_DEATH_MARK,
  drainB10StampDeathMarks,
  getB10StampDeathMarkOpacity,
  queueB10StampDeathMark,
} from './B10StampDeathMark.jsx'
import Stage5Environment from './Stage5Environment.jsx'
import { useGameStore } from '../store/useGameStore.js'

extend(THREE)
const roots = []
let initialStore

async function mount(element) {
  const root = createRoot(document.createElement('canvas'))
  roots.push(root)
  const gl = { render: vi.fn(), setSize: vi.fn(), setPixelRatio: vi.fn(),
    xr: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    renderLists: { dispose: vi.fn() }, forceContextLoss: vi.fn() }
  await root.configure({ gl, frameloop: 'never', size: { width: 360, height: 640, top: 0, left: 0 }, dpr: 1 })
  let state
  function Probe() { state = useThree(); return null }
  await act(async () => { root.render(<><Probe />{element}</>); await new Promise((r) => setTimeout(r, 0)) })
  return state
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ fillRect() {} }))
  initialStore = useGameStore.getState()
  useGameStore.setState({ phase: 'playing', gameKey: 3 })
  drainB10StampDeathMarks()
})
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  useGameStore.setState({ phase: initialStore.phase, gameKey: initialStore.gameKey })
  drainB10StampDeathMarks()
  vi.restoreAllMocks()
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

describe('B10 death 決 stamp mark (spec Part B §6-6 · §12-3)', () => {
  it('holds then fades to nothing over 1.5s', () => {
    expect(B10_STAMP_DEATH_MARK.durationMs).toBe(1500)
    expect(getB10StampDeathMarkOpacity(0)).toBe(B10_STAMP_DEATH_MARK.opacity)
    expect(getB10StampDeathMarkOpacity(B10_STAMP_DEATH_MARK.holdMs)).toBe(B10_STAMP_DEATH_MARK.opacity)
    expect(getB10StampDeathMarkOpacity(1050)).toBeCloseTo(B10_STAMP_DEATH_MARK.opacity / 2, 6)
    expect(getB10StampDeathMarkOpacity(1500)).toBe(0)
    expect(getB10StampDeathMarkOpacity(Infinity)).toBe(0)
  })

  it('draws a floor mark where B10 died for the current run only, and clears it after 1.5s', async () => {
    const state = await mount(<B10StampDeathMarkLayer />)
    const marks = () => state.scene.getObjectByName('b10-stamp-death-marks').children
    queueB10StampDeathMark(2, -4, 2) // stale run: ignored
    queueB10StampDeathMark(1.5, -6, 3)
    await act(async () => state.advance(0.1))
    const visible = marks().filter((mesh) => mesh.visible)
    expect(visible).toHaveLength(1)
    expect(visible[0].position.x).toBeCloseTo(1.5, 6)
    expect(visible[0].position.z).toBeCloseTo(-6, 6)
    expect(visible[0].material.opacity).toBeCloseTo(B10_STAMP_DEATH_MARK.opacity, 6)
    await act(async () => state.advance(1.0))
    expect(visible[0].material.opacity).toBeLessThan(B10_STAMP_DEATH_MARK.opacity)
    await act(async () => state.advance(1.7))
    expect(marks().some((mesh) => mesh.visible)).toBe(false)
  })

  it('is mounted by the Stage 5 environment and queued from the B10 death branch in Enemy.jsx', () => {
    const children = Stage5Environment().props.children.flat()
    expect(children.some((child) => child?.type === B10StampDeathMarkLayer)).toBe(true)
    const enemy = readFileSync(resolve(process.cwd(), 'src/components/Enemy.jsx'), 'utf8')
    expect(enemy).toContain("if (type === 'B10' && t) queueB10StampDeathMark(t.x, t.z, store.gameKey)")
    // Pose split: stamp wind-up 'warn', ledger wind-up 'charge', summon stop 'stun'; summon warning is published.
    expect(enemy).toContain("state.snapshot.patternId==='b10_p2'?'charge':'warn'")
    expect(enemy).toContain("publishBossSummonWarning(store.gameKey, 'B10')")
  })
})
