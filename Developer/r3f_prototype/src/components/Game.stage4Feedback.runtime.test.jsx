// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { PerspectiveCamera } from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ state: null, frame: null, camera: null, emit: vi.fn() }))
vi.mock('@react-three/fiber', () => ({ useThree: () => ({ camera: h.camera }), useFrame: (cb) => { h.frame = cb } }))
vi.mock('../store/useGameStore.js', () => {
  const useGameStore = (selector) => selector(h.state)
  useGameStore.getState = () => h.state
  return { useGameStore }
})
vi.mock('../lib/sfxEvents.js', () => ({ emitSfx: h.emit }))
vi.mock('../lib/refs.js', () => ({ playerPos: { x: 8, y: 0, z: 8 }, screenBounds: {} }))
vi.mock('../lib/expansionAttackRuntime.js', () => ({ clearExpansionAttacks: () => {} }))
vi.mock('../lib/criticalScreenShake.js', () => ({ createCriticalScreenShakeFrame: () => ({}), sampleCriticalScreenShake: () => ({ active: false }) }))
vi.mock('./Player.jsx', () => ({ default: () => null }))
vi.mock('./Floor.jsx', () => ({ default: () => null }))
vi.mock('./Enemies.jsx', () => ({ default: () => null }))
vi.mock('./LunchItems.jsx', () => ({ default: () => null }))
vi.mock('./VFXLayer.jsx', () => ({ default: () => null }))
vi.mock('./EscapePortal.jsx', () => ({ default: () => null }))
vi.mock('./StudentDialogueTrigger.jsx', () => ({ default: () => null }))
vi.mock('./QuestWorldLayer.jsx', () => ({ default: () => null }))
vi.mock('./Weapons/index.js', () => Object.fromEntries([
  'PencilThrow', 'SchoolBagSwing', 'BoxCutterWeapon', 'TumblerOrbit', 'BellShockwave', 'ScienceFlaskSplash',
  'OnigiiriWeapon', 'MiniRosariWeapon', 'StunGunWeapon', 'GuidedMissile', 'StarlinkWeapon', 'CompassBladeWeapon', 'UmbrellaGuardWeapon',
  'EraserBombWeapon', 'ChibikoWeapon', 'HanakoWeapon', 'InuconWeapon', 'SharkMissileWeapon', 'StudentLanternWeapon',
  'BikittyCutterWeapon', 'LineDrawWeapon',
].map((name) => [name, () => null])))

import Game from './Game.jsx'
import { playerPos } from '../lib/refs.js'
import { getRuntimeElapsedMs, resetRuntimeTime, setRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
// Run Game's real hooks/frame callback without mounting its independently-owned 3D children.
function Harness() { Game(); return null }
let root, container
const render = (patch = {}) => {
  Object.assign(h.state, patch)
  act(() => root.render(<Harness />))
}
const step = (ms) => { setRuntimeElapsedMs(ms); act(() => h.frame({}, 1 / 60)) }
const ids = () => h.emit.mock.calls.map(([event]) => event.id)

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers(); h.emit.mockReset(); resetRuntimeTime()
  h.camera = new PerspectiveCamera(45, 1, 0.1, 100)
  h.camera.position.set(0, 20, 20)
  h.state = {
    phase: 'playing', currentStageId: 'stage4', gameKey: 1,
    escapePortalActive: true, matildaSpawned: true,
    player: { maxHp: 100 }, damagePlayer: vi.fn(), checkSurvivalMilestone: vi.fn(),
    activateEscapePortal: vi.fn(), spawnMatilda: vi.fn(), publishRuntimeElapsedMs: vi.fn(),
  }
  playerPos.x = 8; playerPos.z = 8
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  render()
})
afterEach(() => { act(() => root.unmount()); container.remove(); resetRuntimeTime(); vi.useRealTimers() })

describe('Game sole cauldron audio owner lifecycle', () => {
  it('emits once per fixed-step edge even when player is outside the blast radius', () => {
    step(11990); expect(ids()).toEqual(['zombieGiantThud'])
    step(12020); step(14000)
    step(14990); step(15020)
    expect(ids()).toEqual(['zombieGiantThud', 'flaskHit'])
    expect(h.state.damagePlayer).not.toHaveBeenCalled()
  })
  it('dedupes repeated edge observations by gameKey/stage/cycle and resets on restart', () => {
    step(11990); step(11990); step(14990); step(14990)
    expect(ids()).toEqual(['zombieGiantThud', 'flaskHit'])
    setRuntimeElapsedMs(0); render({ gameKey: 2 })
    step(11990); step(14990)
    expect(ids()).toEqual(['zombieGiantThud', 'flaskHit', 'zombieGiantThud', 'flaskHit'])
    render({ currentStageId: 'stage1' }); step(11990)
    render({ currentStageId: 'stage4' }); step(11990)
    expect(ids().at(-1)).toBe('zombieGiantThud')
    expect(ids()).toHaveLength(5)
  })
  it.each(['paused', 'levelup', 'gameover', 'cleared'])('does not advance or emit during %s and resumes without repeated warning', (phase) => {
    step(11990)
    const before = getRuntimeElapsedMs()
    render({ phase }); act(() => h.frame({}, 0.5))
    expect(getRuntimeElapsedMs()).toBe(before)
    expect(ids()).toEqual(['zombieGiantThud'])
    render({ phase: 'playing' }); act(() => h.frame({}, 1 / 60))
    expect(ids()).toEqual(['zombieGiantThud'])
  })
  it('does not replay an older consumed cycle if a clock observation moves backwards', () => {
    step(11990); step(14990); step(26990); step(29990)
    step(11990); step(14990)
    expect(ids()).toEqual(['zombieGiantThud', 'flaskHit', 'zombieGiantThud', 'flaskHit'])
  })
  it('never emits cauldron cues in another stage', () => {
    render({ currentStageId: 'stage1' }); step(11990); step(14990)
    expect(ids()).toEqual([])
  })
  it('preserves 20% damage ignoring contact invulnerability and progress even if the audio listener throws', () => {
    playerPos.x = 0; playerPos.z = 0
    h.emit.mockImplementation(() => { throw new Error('listener failure') })
    expect(() => step(11990)).not.toThrow()
    expect(() => step(14990)).not.toThrow()
    expect(h.state.damagePlayer).toHaveBeenCalledExactlyOnceWith(20, {
      ignoreInvulnerability: true, source: 'stage4PressureCauldron',
    })
    expect(h.state.checkSurvivalMilestone).toHaveBeenCalledTimes(2)
    step(15020)
    expect(h.emit).toHaveBeenCalledTimes(2)
  })
  it('handles multiple fixed substeps without duplicating one edge', () => {
    setRuntimeElapsedMs(11990); act(() => h.frame({}, 0.5))
    setRuntimeElapsedMs(14990); act(() => h.frame({}, 0.5))
    expect(ids()).toEqual(['zombieGiantThud', 'flaskHit'])
  })
})
