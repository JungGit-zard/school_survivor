// @vitest-environment jsdom
// E63 마이크줄 끌림 수용 기준 — 실제 Player.jsx 프레임 경로 + 실제 useGameStore.damagePlayer + 실제 탄 풀.
// Rapier만 오프라인이다: 가짜 몸체가 setLinvel 속도를 고정 스텝(1/60초)만큼 그대로 적분한다(감쇠 없는 공칭 거리).
//   - 피해 3이 실제로 들어간 명중: 사수 쪽으로 1.4u(0.25초). 일반 피격 넉백(0.16초)이 끌림을 먹거나 상쇄하지 않는다.
//   - 무적 중 명중(피해 없음): 끌림도 없다. balanceqa가 E63 스폰을 늘리기 전에 요구한 조건이다.
import React, { act, forwardRef, useImperativeHandle } from 'react'
import { readFileSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createRoot, extend, useThree } from '@react-three/fiber'

const body = vi.hoisted(() => ({ x: 0, y: 0.32, z: 0, vx: 0, vz: 0 }))
vi.mock('@react-three/rapier', () => ({
  RigidBody: forwardRef(function Body({ children }, ref) {
    useImperativeHandle(ref, () => ({
      translation: () => ({ x: body.x, y: body.y, z: body.z }),
      setTranslation: (t) => { body.x = t.x; body.z = t.z },
      setLinvel: (v) => { body.vx = v.x; body.vz = v.z },
    }), [])
    return <group>{children}</group>
  }),
  CuboidCollider: () => null,
}))
vi.mock('./PlayerV9Model.jsx', () => ({ default: () => <group name="player-model" /> }))
vi.mock('./PlayerRosariModel.jsx', () => ({ default: () => <group name="player-model" /> }))
vi.mock('./PlayerMesh.jsx', () => ({ default: () => <group name="player-model" /> }))
vi.mock('./MiniHealthBar.jsx', () => ({ default: () => null }))

import Player from './Player.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { _seedHydratedFirebaseProgressForTests, _setFirebaseProgressClientForTests } from '../lib/firebaseProgress.js'
import { ENEMY_TYPE_CODES } from '../lib/enemyEntityPool.js'
import { ENEMY_PROJECTILE_DAMAGE_SOURCE } from '../lib/outfitCatalog.js'
import { PROJECTILE_ZOMBIE_BEHAVIORS } from '../lib/projectileZombieBehavior.js'
import { createProjectileZombieShotPool } from '../lib/projectileZombieShotPool.js'
import { playerImpulse, playerSlow } from '../lib/refs.js'

extend(THREE)
const DT = 1 / 60
const E63_SHOT = PROJECTILE_ZOMBIE_BEHAVIORS[ENEMY_TYPE_CODES.E63].shot
const PULL_U = -E63_SHOT.impulseU // 1.4
// 로자리는 원점에 가만히 서 있고, 사수는 +z 2u에서 마이크를 -z로 던진다(4.5u/s, 약 0.39초 뒤 명중).
const THROWER = { x: 0, z: 2 }
const r3 = (v) => Math.round(v * 1000) / 1000 + 0

let root
let state
let shots
let hits

// Enemies.jsx projectileHitRef와 같은 피해 경로. 피해가 실제로 들어갔는지를 탄 풀에 그대로 돌려준다.
function onHit(_index, _generation, damage) {
  hits += 1
  return useGameStore.getState().damagePlayer(damage, { source: ENEMY_PROJECTILE_DAMAGE_SOURCE })
}

function faceYaw(yaw) {
  state.scene.getObjectByName('player-model').parent.rotation.y = yaw
}

function runFrames(seconds) {
  for (let frame = 0; frame < Math.round(seconds / DT); frame += 1) {
    act(() => {
      // Game.jsx는 <Player />를 <Enemies />보다 먼저 마운트한다 → 같은 프레임에서 Player 프레임이 먼저 돈다.
      for (const { ref } of [...state.internal.subscribers]) ref.current(state, DT)
      shots.step(DT, body.x, body.z, onHit, null, playerSlow, null, playerImpulse)
    })
    body.x += body.vx * DT
    body.z += body.vz * DT
  }
}

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  _setFirebaseProgressClientForTests({ save: async () => {}, load: async () => null })
  _seedHydratedFirebaseProgressForTests()
  useGameStore.getState().resetGame('stage1')
  Object.assign(body, { x: 0, y: 0.32, z: 0, vx: 0, vz: 0 })
  shots = createProjectileZombieShotPool()
  hits = 0
  root = createRoot(document.createElement('canvas'))
  const gl = { render: vi.fn(), setSize: vi.fn(), setPixelRatio: vi.fn(),
    xr: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    renderLists: { dispose: vi.fn() }, forceContextLoss: vi.fn() }
  await root.configure({ gl, frameloop: 'never', size: { width: 360, height: 640, top: 0, left: 0 }, dpr: 1 })
  function Probe() { state = useThree(); return null }
  await act(async () => { root.render(<><Probe /><Player /></>) })
})

afterEach(async () => {
  await act(async () => root.unmount())
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

describe('E63 마이크줄 끌림(실제 Player 프레임 경로)', () => {
  it.each([
    ['사수를 보고 있어도', 0],
    ['옆을 보고 있어도', Math.PI / 2],
    ['사수를 등지고 있어도', Math.PI],
  ])('피해가 들어간 명중은 %s 사수 쪽으로 1.4u만 끌린다(일반 넉백이 끌림을 줄이거나 상쇄하지 않는다)', (_label, yaw) => {
    faceYaw(yaw)
    const hp = useGameStore.getState().player.hp
    expect(shots.spawn(THROWER.x, THROWER.z, 0, -1, E63_SHOT)).toBeGreaterThanOrEqual(0)
    runFrames(1.2)
    expect(hits).toBe(1)
    expect(useGameStore.getState().player.hp).toBe(hp - E63_SHOT.damage)
    expect({ toward: r3(body.z), sideways: r3(body.x) }).toEqual({ toward: PULL_U, sideways: 0 })
  })

  it('무적 중 명중은 피해도 끌림도 없다(제자리)', () => {
    act(() => useGameStore.setState((s) => ({ player: { ...s.player, invulnerable: true } })))
    const hp = useGameStore.getState().player.hp
    expect(shots.spawn(THROWER.x, THROWER.z, 0, -1, E63_SHOT)).toBeGreaterThanOrEqual(0)
    runFrames(1.2)
    expect(hits).toBe(1)
    expect(useGameStore.getState().player.hp).toBe(hp)
    expect({ toward: r3(body.z), sideways: r3(body.x) }).toEqual({ toward: 0, sideways: 0 })
  })

  it('실게임 탄 피해 경로(Enemies.jsx)도 위 onHit처럼 피해가 들어갔는지를 탄 풀에 돌려준다', () => {
    const source = readFileSync(new NodeURL('./Enemies.jsx', import.meta.url), 'utf8')
    const start = source.indexOf('projectileHitRef.current = ')
    const block = source.slice(start, source.indexOf('\n  }\n', start))
    expect(block).toContain('const landed = store.damagePlayer(damage, { source: ENEMY_PROJECTILE_DAMAGE_SOURCE })')
    expect(block).toContain('return landed')
  })
})
