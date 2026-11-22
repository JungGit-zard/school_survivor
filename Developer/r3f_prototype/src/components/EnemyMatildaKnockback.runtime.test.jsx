// @vitest-environment jsdom
// 2026-11-22 Terry "마틸다는 로자리의 어떤 공격에도 물리적으로 밀려나지 않게 수정해".
// 실제 <Enemy isMatilda>를 마운트하고 프레임을 돌린다. Rapier는 오프라인이라 RigidBody 대역이 setLinvel 속도를
// 매 프레임 위치에 적분한다(물리 한 스텝). 같은 프레임 순서를 "맞지 않음 / 무기마다 넉백 타격"으로 두 번 돌려
// 마틸다의 위치가 프레임마다 완전히 같은지(밀려나지 않음), 그동안 HP는 실제로 깎였는지(피해 숫자·사망)를 본다.
// 대조군: 같은 타격을 받은 일반 B01(마틸다 아님)은 밀려난다 — 이 테스트가 넉백 경로를 실제로 지난다는 증거.
import React, { act, forwardRef, useImperativeHandle } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createRoot, extend } from '@react-three/fiber'
import { create } from 'zustand'

vi.mock('../store/useGameStore.js', () => ({ useGameStore: create(() => ({
  currentStageId: 'stage1', phase: 'playing', elapsedMs: 0, gameKey: 1,
  bossSpawnSec: 150, weapons: {}, player: { hp: 100, maxHp: 100, speed: 1, invulnerable: false },
  damagePlayer: vi.fn(), killPlayer: vi.fn(),
  recordKill: vi.fn(), recordBossKill: vi.fn(), recordBossDefeat: vi.fn(),
})) }))
// RigidBody 대역: translation()은 현재 위치의 사본, setLinvel은 속도를 기록, setTranslation은 위치를 바꾼다.
// stepBodies(dt)가 기록된 속도를 위치에 적분한다(Rapier world.step 대역).
const bodies = vi.hoisted(() => new Set())
vi.mock('@react-three/rapier', () => ({
  RigidBody: forwardRef(function Body({ children, position }, ref) {
    const body = React.useMemo(() => {
      const pos = { x: position[0], y: position[1], z: position[2] }
      const vel = { x: 0, y: 0, z: 0 }
      const b = {
        pos, vel,
        translation: () => ({ x: pos.x, y: pos.y, z: pos.z }),
        setLinvel: (v) => { vel.x = v.x; vel.y = v.y; vel.z = v.z },
        setTranslation: (p) => { pos.x = p.x; pos.y = p.y; pos.z = p.z },
      }
      bodies.add(b)
      return b
    }, [])
    useImperativeHandle(ref, () => body)
    return <group>{children}</group>
  }), CuboidCollider: () => null,
}))
vi.mock('./ZombieMesh.jsx', () => ({ default: () => <group name="offline-enemy-model-boundary" /> }))
import Enemy, { ENEMY_STATS, isEnemyKnockbackImmune } from './Enemy.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { setRuntimeElapsedMs, resetRuntimeTime } from '../lib/gameRuntimeTime.js'
import { enemyBodies, playerPos } from '../lib/refs.js'
import { applyEnemyHit } from '../lib/weaponCollision.js'
import { subscribeDamageNumber } from '../lib/damageNumbers.js'

extend(THREE)

// 로자리 쪽 타격이 실제로 넘기는 넉백 값(각 무기 컴포넌트의 impact). knockback이 없으면 공통 기본 넉백(0.85/70ms).
const ROSARI_ATTACKS = [
  ['pencilThrow (default knockback)', {}],
  ['schoolBag', { knockback: 3.8, knockbackMs: 120 }],
  ['boxCutter', { knockback: 1.8, knockbackMs: 80 }],
  ['tumbler', { knockback: 3, knockbackMs: 220 }],
  ['scienceFlask landing', { knockback: 2.8, knockbackMs: 100 }],
  ['bell shockwave', { knockback: 7.2, knockbackMs: 180 }],
  ['stunGun', { knockback: 2.2, knockbackMs: 80 }],
  ['onigiri', { knockback: 3.2, knockbackMs: 90 }],
  ['miniRosari', { knockback: 3.2, knockbackMs: 90 }],
  ['paperPlane (default knockback)', {}],
  ['chibiko (default knockback)', {}],
  ['guidedMissile', { knockback: 3.2, knockbackMs: 120 }],
  ['sharkMissile', { knockback: 3.6, knockbackMs: 150 }],
  ['starlink strike', { knockback: 1.4, knockbackMs: 80 }],
  ['compassBlade', { knockback: 3.2, knockbackMs: 130 }],
  ['umbrellaGuard burst', { knockback: 3.0, knockbackMs: 220 }],
  ['inucon bite-drag', { knockback: 2.8, knockbackMs: 180 }],
  ['bikittyCutter', { knockback: 1.8, knockbackMs: 120 }],
  ['Sltera run-over', { knockback: 12, knockbackMs: 400 }],
]

const roots = []
let damageNumbers = []
let unsubscribeDamage
async function mount(element) {
  const root = createRoot(document.createElement('canvas'))
  roots.push(root)
  const gl = { render: vi.fn(), setSize: vi.fn(), setPixelRatio: vi.fn(),
    xr: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    renderLists: { dispose: vi.fn() }, forceContextLoss: vi.fn() }
  await root.configure({ gl, frameloop: 'never', size: { width: 360, height: 640, top: 0, left: 0 }, dpr: 1 })
  let state
  const { useThree } = await import('@react-three/fiber')
  function Probe() { state = useThree(); return null }
  await act(async () => { root.render(<><Probe />{element}</>); await new Promise((r) => setTimeout(r, 0)) })
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
  return { state, root }
}

async function frame(state, elapsedMs, delta) {
  await act(async () => { setRuntimeElapsedMs(elapsedMs); useGameStore.setState({ elapsedMs }) })
  await act(async () => { for (const { ref } of [...state.internal.subscribers]) ref.current(state, delta) })
  for (const b of bodies) { b.pos.x += b.vel.x * delta; b.pos.z += b.vel.z * delta }
}

const DT = 1 / 60
const FRAMES = 150

// 같은 시작·같은 프레임 순서로 한 판을 돌린다. hitAt(frame) → 그 프레임 직전에 넣을 impact(없으면 null).
async function runEnemy({ isMatilda, hitAt }) {
  bodies.clear()
  const onDeath = vi.fn()
  const statOverride = { hp: 1e6, scale: ENEMY_STATS.B01.scale, charger: true, chargeSpeed: 1.4, xp: 0 }
  const id = isMatilda ? 'matilda-fixture' : 'plain-b01-fixture'
  const { state, root } = await mount(<Enemy id={id} type="B01" spawnPos={[0, 0, -4]} onDeath={onDeath} statOverride={statOverride} isMatilda={isMatilda} />)
  // 등장 연출(300ms)을 넘긴다.
  await frame(state, 1000, 0.31)
  await frame(state, 1001, DT)
  const body = enemyBodies.get(id)
  expect(body?._enemyHit).toBeTypeOf('function')
  const track = []
  let hits = 0
  for (let i = 0; i < FRAMES; i += 1) {
    const impact = hitAt(i)
    if (impact) {
      const landed = await act(async () => applyEnemyHit(body, null, 10, { canCrit: false, ignoreSightBlock: true, source: { x: 0, z: 2 }, ...impact }))
      expect(landed).toBe(true)
      hits += 1
    }
    await frame(state, 1002 + i * 17, DT)
    const t = body.translation()
    track.push([t.x, t.z])
  }
  return { track, hits, body, onDeath, state, root }
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  resetRuntimeTime()
  useGameStore.setState({ phase: 'playing', currentStageId: 'stage1', gameKey: 1, elapsedMs: 0 })
  vi.clearAllMocks()
  playerPos.set(0, 0, 3)
  damageNumbers = []
  unsubscribeDamage = subscribeDamageNumber((event) => damageNumbers.push(event.amount))
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({ fillRect() {} }))
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((url, onLoad) => {
    const texture = new THREE.Texture(); queueMicrotask(() => onLoad?.(texture)); return texture
  })
  vi.stubGlobal('requestAnimationFrame', (callback) => { callback(); return 1 })
})
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  unsubscribeDamage?.()
  enemyBodies.clear(); bodies.clear(); resetRuntimeTime(); vi.restoreAllMocks(); vi.unstubAllGlobals()
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

describe('Matilda is never displaced by any Rosari attack (Terry 2026-11-22)', () => {
  it('only Matilda is knockback-immune', () => {
    expect(isEnemyKnockbackImmune(true)).toBe(true)
    expect(isEnemyKnockbackImmune(false)).toBe(false)
    expect(isEnemyKnockbackImmune()).toBe(false)
  })

  it.each(ROSARI_ATTACKS)('%s: Matilda follows exactly the same path as when untouched, while her HP drops', async (_label, impact) => {
    const untouched = await runEnemy({ isMatilda: true, hitAt: () => null })
    for (const root of roots.splice(0)) await act(async () => root.unmount())
    enemyBodies.clear()
    damageNumbers = []

    // 6프레임(0.1초)마다 한 대씩 — 넉백 시간(70~400ms)이 계속 겹치게 때린다.
    const hit = await runEnemy({ isMatilda: true, hitAt: (i) => (i % 6 === 0 ? impact : null) })
    expect(hit.hits).toBe(FRAMES / 6)
    for (let i = 0; i < FRAMES; i += 1) {
      expect(hit.track[i][0], `frame ${i} x`).toBeCloseTo(untouched.track[i][0], 9)
      expect(hit.track[i][1], `frame ${i} z`).toBeCloseTo(untouched.track[i][1], 9)
    }
    // 피해는 그대로 들어갔다: 타격마다 피해 숫자 10, 그리고 남은 HP를 넘는 한 방이면 실제로 쓰러진다.
    expect(damageNumbers).toEqual(Array(FRAMES / 6).fill(10))
    await act(async () => applyEnemyHit(hit.body, null, 1e6 - 10 * (FRAMES / 6) - 1, { canCrit: false, ignoreSightBlock: true, ...impact }))
    expect(hit.onDeath).not.toHaveBeenCalled() // 1 HP 남았다 — 앞선 타격이 정확히 HP를 깎았다
    await act(async () => applyEnemyHit(hit.body, null, 1, { canCrit: false, ignoreSightBlock: true, ...impact }))
    expect(hit.onDeath).toHaveBeenCalledTimes(1)
    expect(hit.onDeath.mock.calls[0][1]).toMatchObject({ isMatilda: true })
  })

  it('control: the same hits DO push a plain (non-Matilda) B01, so the knockback path is really exercised', async () => {
    const untouched = await runEnemy({ isMatilda: false, hitAt: () => null })
    for (const root of roots.splice(0)) await act(async () => root.unmount())
    enemyBodies.clear()
    const hit = await runEnemy({ isMatilda: false, hitAt: (i) => (i % 6 === 0 ? { knockback: 3.8, knockbackMs: 120 } : null) })
    const last = FRAMES - 1
    const moved = Math.hypot(hit.track[last][0] - untouched.track[last][0], hit.track[last][1] - untouched.track[last][1])
    expect(moved).toBeGreaterThan(0.5)
  })
})
