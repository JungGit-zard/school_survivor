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
vi.mock('./SlteraEvent.jsx', () => ({ default: () => null }))
vi.mock('./LunchItems.jsx', () => ({ default: () => null }))
vi.mock('./VFXLayer.jsx', () => ({ default: () => null }))
vi.mock('./EscapePortal.jsx', () => ({ default: () => null, EscapePortalSceneLight: () => null }))
vi.mock('./StudentDialogueTrigger.jsx', () => ({ default: () => null }))
vi.mock('./QuestWorldLayer.jsx', () => ({ default: () => null }))
vi.mock('./Weapons/index.js', () => Object.fromEntries([
  'PencilThrow', 'SchoolBagSwing', 'BoxCutterWeapon', 'TumblerOrbit', 'BellShockwave', 'ScienceFlaskSplash',
  'OnigiiriWeapon', 'MiniRosariWeapon', 'PaperPlaneWeapon', 'StunGunWeapon', 'GuidedMissile', 'StarlinkWeapon', 'CompassBladeWeapon', 'UmbrellaGuardWeapon',
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
    phase: 'playing', currentStageId: 'stage5', gameKey: 1,
    escapePortalActive: true, matildaSpawned: true,
    player: { maxHp: 100 }, damagePlayer: vi.fn(), checkSurvivalMilestone: vi.fn(),
    activateEscapePortal: vi.fn(), spawnMatilda: vi.fn(), publishRuntimeElapsedMs: vi.fn(),
  }
  playerPos.x = 8; playerPos.z = 8
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  render()
})
afterEach(() => { act(() => root.unmount()); container.remove(); resetRuntimeTime(); vi.useRealTimers() })

// Stage 5 전교 호출 방송 SFX(스펙 Part B §7-2·§7-3). Game.jsx가 유일한 소유자다.
// 호출은 스폰과 묶여 있어 스폰 시계(실시간 + 캐치업 오프셋)로 경계를 본다.
import { publishSpawnCatchUpOffsetSec } from '../lib/spawnCatchUp.js'

describe('Game stage5 call-lane audio owner', () => {
  afterEach(() => publishSpawnCatchUpOffsetSec(0))

  it('차임(70s)과 호출 시작(73s)을 회차당 1회 낸다', () => {
    step(69990); expect(ids()).toEqual(['stage5CallChime'])
    step(70020); step(72000)
    step(72990); expect(ids()).toEqual(['stage5CallChime', 'stage5CallStart'])
    step(73020); step(80000)
    step(129990); step(132990)
    expect(ids()).toEqual(['stage5CallChime', 'stage5CallStart', 'stage5CallChime', 'stage5CallStart'])
  })

  it('같은 경계를 다시 관측해도 반복하지 않고, 새 런에서는 다시 낸다', () => {
    step(69990); step(69990); step(72990); step(72990)
    expect(ids()).toEqual(['stage5CallChime', 'stage5CallStart'])
    setRuntimeElapsedMs(0); render({ gameKey: 2 })
    step(69990)
    expect(ids().at(-1)).toBe('stage5CallChime')
    expect(ids()).toHaveLength(3)
  })

  it('캐치업으로 스폰 시계가 앞서면 그만큼 일찍 울린다', () => {
    publishSpawnCatchUpOffsetSec(2)
    step(67990)
    expect(ids()).toEqual(['stage5CallChime'])
  })

  it('다른 스테이지에서는 울리지 않고, 리스너가 throw해도 진행은 계속된다', () => {
    render({ currentStageId: 'stage4' }); step(69990)
    expect(ids()).not.toContain('stage5CallChime')
    render({ currentStageId: 'stage5', gameKey: 3 })
    h.emit.mockImplementation(() => { throw new Error('listener failure') })
    expect(() => step(69990)).not.toThrow()
    expect(h.state.checkSurvivalMilestone).toHaveBeenCalled()
  })
})
