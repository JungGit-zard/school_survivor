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
    phase: 'playing', currentStageId: 'stage6', gameKey: 1,
    escapePortalActive: true, matildaSpawned: true,
    player: { maxHp: 100 }, damagePlayer: vi.fn(), checkSurvivalMilestone: vi.fn(),
    activateEscapePortal: vi.fn(), spawnMatilda: vi.fn(), publishRuntimeElapsedMs: vi.fn(),
  }
  playerPos.x = 8; playerPos.z = 8
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  render()
})
afterEach(() => { act(() => root.unmount()); container.remove(); resetRuntimeTime(); vi.useRealTimers() })

// Stage 6 조회대 스피커 '훈화 말씀'(스펙 Part C C-7): Game.jsx가 스케줄·발신·피해·SFX의 유일한 소유자다.
// 확장 공격 런타임은 실물을 쓴다(스냅샷·안전 기하·피격 판정).
import { clearExpansionAttacks, expansionAttackSnapshots } from '../lib/expansionAttackRuntime.js'
import { getAssemblySpeechCueState } from '../lib/stage6AssemblySpeech.js'

const run = (fromMs, toMs) => { setRuntimeElapsedMs(fromMs); while (getRuntimeElapsedMs() < toMs) act(() => h.frame({}, 1 / 60)) }

describe('Game stage6 assembly speech hazard', () => {
  afterEach(() => clearExpansionAttacks())

  it('27.5초 학교 종, 29초 하울링(preCue), 30초 고리 발신 → active에서 12 피해(무적 존중) 1회 + 고리 펄스음', () => {
    playerPos.x = 0; playerPos.z = 0
    run(27_000, 29_100)
    expect(ids()).toEqual(['stage6SchoolChime', 'stage6MicFeedback'])
    expect(getAssemblySpeechCueState()).toMatchObject({ kind: 'preCue', cycle: 0, gameKey: 1 })
    run(29_100, 30_100)
    expect([...expansionAttackSnapshots.values()].filter((s) => s.hazard)).toHaveLength(1)
    run(30_100, 31_800)
    expect(h.state.damagePlayer).toHaveBeenCalledWith(9, { source: 'stage6AssemblySpeech' })
    expect(ids()).toContain('stage6SpeechRingPulse')
    // 두 번째 고리(30.8초)는 같은 원점의 동심 물결(외반경 +1.8u)이라 가만히 선 플레이어는 지나치지 않는다 — 발신은 된다.
    expect([...expansionAttackSnapshots.keys()].filter((k) => k.startsWith('H06:1:0:'))).toHaveLength(2)
    run(31_800, 34_000)
    expect(h.state.damagePlayer).toHaveBeenCalledTimes(1)
  })

  it('첫 고리 띠에서 바깥으로 1.4u 나가면 첫 고리는 피하지만 두 번째 물결 띠에 걸린다 — 정답은 안쪽', () => {
    playerPos.x = 0; playerPos.z = 0
    run(29_900, 30_900)
    playerPos.z = 1.4
    run(30_900, 34_000)
    expect(h.state.damagePlayer).toHaveBeenCalledExactlyOnceWith(9, { source: 'stage6AssemblySpeech' })
  })

  it('고리가 발신된 뒤 안쪽으로 1.5u 들어가 있으면 맞지 않는다', () => {
    playerPos.x = 0; playerPos.z = 0
    run(29_900, 30_100)
    playerPos.z = -1.5
    run(30_100, 31_800)
    expect(h.state.damagePlayer).not.toHaveBeenCalled()
  })

  it('150초 이후·다른 스테이지에서는 아무것도 하지 않는다', () => {
    run(149_000, 152_000)
    render({ currentStageId: 'stage5' })
    run(27_000, 31_000)
    expect(ids().filter((id) => id.startsWith('stage6'))).toEqual([])
    expect(h.state.damagePlayer).not.toHaveBeenCalled()
  })

  it('210초 정문 개방 직후 철문 소리(portalAppear 다음)', () => {
    render({ escapePortalActive: false })
    run(209_900, 210_100)
    expect(ids().slice(-2)).toEqual(['portalAppear', 'stage6GateOpen'])
  })
})
