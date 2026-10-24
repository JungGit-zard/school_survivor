// @vitest-environment jsdom
// Real R3F host objects and frame callbacks; GPU/image and Rapier boundaries are offline.
import React, { act, forwardRef, useImperativeHandle } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createRoot, extend, useThree } from '@react-three/fiber'
import { create } from 'zustand'

vi.mock('../store/useGameStore.js', () => ({ useGameStore: create(() => ({
  currentStageId: 'stage4', phase: 'playing', elapsedMs: 0, gameKey: 1,
  bossSpawnSec: 150, weapons: {}, damagePlayer: vi.fn(), killPlayer: vi.fn(),
  recordKill: vi.fn(), recordBossKill: vi.fn(), recordBossDefeat: vi.fn(),
})) }))
vi.mock('@react-three/rapier', () => ({
  RigidBody: forwardRef(function Body({ children, position }, ref) {
    const body = React.useMemo(() => ({ translation: () => ({ x: position[0], y: position[1], z: position[2] }),
      setLinvel: vi.fn(), setTranslation: vi.fn() }), [])
    useImperativeHandle(ref, () => body)
    return <group>{children}</group>
  }), CuboidCollider: () => null,
}))
vi.mock('./ZombieMesh.jsx', () => ({ default: () => <group name="offline-enemy-model-boundary" /> }))
import PressureCauldron from './StageObjects/PressureCauldron.jsx'
import Enemy, { B04SoupBlastVisual } from './Enemy.jsx'
import { StudioTuningSnapshotProvider } from './StudioTunedGroup.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { setRuntimeElapsedMs, resetRuntimeTime } from '../lib/gameRuntimeTime.js'
import { enemyBodies, playerPos } from '../lib/refs.js'
import { subscribeSfx } from '../lib/sfxEvents.js'

extend(THREE)
const roots = []
const audioTrace = []
let unsubscribeAudio
async function mount(element) {
  const root = createRoot(document.createElement('canvas'))
  roots.push(root)
  const gl = { render: vi.fn(), setSize: vi.fn(), setPixelRatio: vi.fn(),
    xr: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    renderLists: { dispose: vi.fn() }, forceContextLoss: vi.fn() }
  await root.configure({ gl, frameloop: 'never', size: { width: 360, height: 640, top: 0, left: 0 }, dpr: 1 })
  let state
  function Probe() { state = useThree(); return null }
  const render = async (node) => { await act(async () => { root.render(<><Probe />{node}</>); await new Promise(r => setTimeout(r, 0)) }) }
  await render(element)
  await act(async () => { await new Promise(r => setTimeout(r, 0)) })
  return { state, render }
}
async function setGame(patch) { await act(async () => useGameStore.setState(patch)) }
async function frame(state, elapsedMs, delta = 1 / 60) {
  await act(async () => { setRuntimeElapsedMs(elapsedMs); useGameStore.setState({ elapsedMs }) })
  await act(async () => { for (const { ref } of [...state.internal.subscribers]) ref.current(state, delta) })
  state.scene.updateMatrixWorld(true)
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  resetRuntimeTime()
  audioTrace.length = 0
  unsubscribeAudio = subscribeSfx((event) => audioTrace.push(event.id))
  useGameStore.setState({ phase: 'playing', currentStageId: 'stage4', gameKey: 1, elapsedMs: 0 })
  vi.clearAllMocks()
  playerPos.set(0, 0, 7)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ fillRect() {} }))
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url, onLoad) => {
    const texture = new THREE.Texture(); queueMicrotask(() => onLoad?.(texture)); return texture
  })
  vi.stubGlobal('requestAnimationFrame', (callback) => { callback(); return 1 })
})
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  await new Promise(r => setTimeout(r, 550))
  unsubscribeAudio?.()
  enemyBodies.clear(); resetRuntimeTime(); vi.restoreAllMocks(); vi.unstubAllGlobals()
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

describe('Stage4 actual hazard frame paths (not GPU visual acceptance)', () => {
  it('holds a world-centered 3.2 boundary for the entire 3s, independent of model scale, yaw and Studio tuning', async () => {
    const { state } = await mount(<StudioTuningSnapshotProvider datasets={{ tunings: {
      'stage-object-pressure-cauldron': { scale: 1.8, scaleX: 0.7, scaleZ: 1.6, rotationY: 53, positionX: 2 },
    }, decals: {} }}><PressureCauldron position={[4, 0, -2]} rotation={[0, 1.2, 0]} scale={[2, 1, 0.5]} /></StudioTuningSnapshotProvider>)
    for (const ms of [12000, 12001, 12750, 13500, 14999]) {
      await frame(state, ms)
      const warning = state.scene.getObjectByName('pressure-cauldron-world-warning')
      expect(warning, 'real mounted warning').toBeTruthy()
      expect(warning.visible).toBe(true)
      const edge = state.scene.getObjectByName('pressure-cauldron-world-boundary')
      expect(edge.geometry.parameters.outerRadius).toBe(3.2)
      expect(edge.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([0, 0.035, 0])
      expect(edge.getWorldScale(new THREE.Vector3()).toArray()).toEqual([1, 1, 1])
      expect(warning.userData.progress).toBeCloseTo((ms - 12000) / 3000)
    }
    await frame(state, 15000)
    expect(state.scene.getObjectByName('pressure-cauldron-world-warning').userData.hazardState).toBe('fire')
    await frame(state, 15249)
    expect(state.scene.getObjectByName('pressure-cauldron-world-warning').visible).toBe(true)
    await frame(state, 15250)
    expect(state.scene.getObjectByName('pressure-cauldron-world-warning').visible).toBe(false)
  })

  it('does not run on wall time; pause freezes progress, terminal phase/stage/run changes clear and unmount removes world portal', async () => {
    const { state, render } = await mount(<PressureCauldron />)
    await frame(state, 13500)
    const warning = state.scene.getObjectByName('pressure-cauldron-world-warning')
    expect(warning).toBeTruthy()
    await setGame({ phase: 'paused' }); await frame(state, 13500, 99)
    expect(warning.userData.progress).toBe(0.5)
    await setGame({ phase: 'playing' }); await frame(state, 13501)
    expect(warning.userData.progress).toBeGreaterThan(0.5)
    for (const phase of ['gameover', 'cleared']) {
      await setGame({ phase }); await frame(state, 13501)
      expect(warning.visible).toBe(false)
    }
    await setGame({ phase: 'playing', currentStageId: 'stage2' }); await frame(state, 13501)
    expect(warning.visible).toBe(false)
    await setGame({ currentStageId: 'stage4', gameKey: 2 }); await frame(state, 0)
    expect(warning.visible).toBe(false)
    await render(null)
    expect(state.scene.getObjectByName('pressure-cauldron-world-warning')).toBeUndefined()
  })

  it('renders soup as separated bowl-rim arcs with unchanged exact centers and radius, not a second cauldron circle', async () => {
    const circles = [{ x: -3.2, z: 7, radius: 1.1 }, { x: 3.2, z: 7, radius: 1.1 }]
    const { state, render } = await mount(<B04SoupBlastVisual phase="telegraph" circles={circles} />)
    const arcs = []
    state.scene.traverse(o => { if (o.name === 'b04-soup-segment') arcs.push(o) })
    expect(arcs).toHaveLength(16)
    for (const arc of arcs) {
      expect(arc.geometry.parameters.outerRadius).toBe(1.1)
      expect(arc.geometry.parameters.thetaLength).toBeLessThan(Math.PI / 4)
      expect(arc.getWorldPosition(new THREE.Vector3()).x).toBeOneOf([-3.2, 3.2])
    }
    await render(<B04SoupBlastVisual phase="done" circles={circles} />)
    expect(state.scene.children.some(o => o.name.includes('B04'))).toBe(false)
  })

  it('exercises real Enemy HP50 -> soup1200ms -> fire250ms -> P2 and existing single-hit consumer, freezing on pause and clearing on death', async () => {
    const { state } = await mount(<Enemy id="stage4-b04-fixture" type="B04" spawnPos={[0, 0, -7]} />)
    await frame(state, 150000, 0.31)
    await frame(state, 150001)
    const body = enemyBodies.get('stage4-b04-fixture')
    expect(body?._enemyHit).toBeTypeOf('function')
    await act(async () => body._enemyHit(750, { ignoreSightBlock: true, canCrit: false, knockback: 0 }))
    await frame(state, 150002)
    const soup = () => state.scene.getObjectByName('B04 국물 대폭발 원형 표식')
    expect(soup()?.userData.soupBlastState).toBe('telegraph')
    await frame(state, 151201, 1.199)
    expect(soup()?.userData.soupBlastState).toBe('telegraph')
    await setGame({ phase: 'paused' }); await frame(state, 151201, 30)
    expect(soup()?.userData.soupBlastState).toBe('telegraph')
    await setGame({ phase: 'playing' }); await frame(state, 151202, 0.001)
    expect(soup()?.userData.soupBlastState).toBe('explode')
    const circle = soup().children[0]
    playerPos.set(circle.position.x, 0, circle.position.z)
    const damage = useGameStore.getState().damagePlayer
    damage.mockClear()
    await frame(state, 151203, 0.001)
    await frame(state, 151204, 0.001)
    expect(damage).toHaveBeenCalledExactlyOnceWith(16)
    await frame(state, 151452, 0.248)
    expect(Boolean(soup())).toBe(false)
    await frame(state, 151453)
    expect(audioTrace.filter(id => ['zombieChargeRoar', 'flaskHit', 'bossRoar'].includes(id))).toEqual(['zombieChargeRoar', 'flaskHit', 'bossRoar'])
    await act(async () => body._enemyHit(750, { ignoreSightBlock: true, canCrit: false, knockback: 0 }))
    await frame(state, 151454)
    expect(Boolean(soup())).toBe(false)
    expect(useGameStore.getState().recordBossDefeat).toHaveBeenCalledWith('B04')
  })

  it.each(['death', 'unmount', 'listener-failure'])('cancels pending soup on %s and audio failure never blocks the existing state consumer', async (mode) => {
    const { state, render } = await mount(<Enemy id="cancel-b04" type="B04" spawnPos={[0, 0, -7]} />)
    await frame(state, 150000, 0.31)
    await frame(state, 150001)
    const body = enemyBodies.get('cancel-b04')
    const stopThrowing = mode === 'listener-failure' ? subscribeSfx((event) => {
      if (['zombieChargeRoar', 'flaskHit', 'bossRoar'].includes(event.id)) throw new Error('offline audio failure')
    }) : () => {}
    try {
      await act(async () => body._enemyHit(750, { ignoreSightBlock: true, canCrit: false, knockback: 0 }))
      await frame(state, 150002)
      expect(audioTrace.filter(id => id === 'zombieChargeRoar')).toHaveLength(1)
      expect(useGameStore.getState().recordBossDefeat).not.toHaveBeenCalled()
      const soup = () => state.scene.getObjectByName('B04 국물 대폭발 원형 표식')
      if (mode === 'death') await act(async () => body._enemyHit(750, { ignoreSightBlock: true, canCrit: false, knockback: 0 }))
      if (mode === 'unmount') await render(null)
      await frame(state, 151202, 1.2)
      if (mode === 'listener-failure') {
        expect(soup()?.userData.soupBlastState).toBe('explode')
        await frame(state, 151452, 0.25)
        await frame(state, 151453)
        expect(audioTrace.filter(id => id === 'bossRoar')).toHaveLength(1)
      } else {
        expect(audioTrace.filter(id => ['flaskHit', 'bossRoar'].includes(id))).toHaveLength(0)
      }
      expect(Boolean(soup())).toBe(false)
    } finally { stopThrowing() }
  })
})
