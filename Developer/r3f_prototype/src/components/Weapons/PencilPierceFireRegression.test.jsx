// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const frameCallbacks = vi.hoisted(() => [])
const animationFrames = vi.hoisted(() => [])

vi.mock('../../lib/usePlayingFrame.js', () => ({
  usePlayingFrame: (callback) => {
    frameCallbacks.push(callback)
  },
}))

vi.mock('../../lib/sfxEvents.js', () => ({
  emitSfx: vi.fn(),
}))

vi.mock('../../lib/toon.js', async (importOriginal) => ({
  ...(await importOriginal()),
  outlineMat: vi.fn(() => ({})),
  toonMat: vi.fn(() => ({})),
  inflateScale: (scale) => scale,
}))

vi.mock('../StudioTunedGroup.jsx', () => ({
  default: ({ children }) => <div data-testid="pencil-projectile-model">{children}</div>,
}))

import { PencilThrow } from './Pencil.jsx'
import { enemyBodies, enemyPool, enemySimulationRuntime, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'

async function flushNextAnimationFrame() {
  const callback = animationFrames.shift()
  expect(callback).toBeTypeOf('function')
  await act(async () => {
    callback(0)
  })
}

describe('Pencil pierce fire regression', () => {
  let container
  let root

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    Object.defineProperty(HTMLElement.prototype, 'position', {
      configurable: true,
      value: { set: vi.fn() },
    })
    Object.defineProperty(HTMLElement.prototype, 'rotation', {
      configurable: true,
      value: { y: 0 },
    })
    frameCallbacks.length = 0
    animationFrames.length = 0
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      animationFrames.push(callback)
      return animationFrames.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    useGameStore.getState().resetGame()
    enemyBodies.clear()
    enemyPool.reset()
    enemySimulationRuntime.reset()
    playerPos.set(0, 0, 0)

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(<PencilThrow />)
    })
  })

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount()
      })
    }
    container?.remove()
    vi.unstubAllGlobals()
    delete HTMLElement.prototype.position
    delete HTMLElement.prototype.rotation
    frameCallbacks.length = 0
    animationFrames.length = 0
    enemyBodies.clear()
    enemyPool.reset()
    enemySimulationRuntime.reset()
    playerPos.set(0, 0, 0)
  })

  it('keeps firing on cooldown after pencilPierce when the first nearby enemy survives the first pierced hit', async () => {
    const target = enemyPool.spawn({ type: 'E01', x: 0, y: 0, z: 1, hp: 100, maxHp: 100 })
    const targetHit = vi.fn()
    enemyPool.setHitHandler(target, targetHit)

    // Baseline: the unupgraded weapon finds the same live in-range target and creates one projectile.
    // 이 테스트가 지키는 회귀는 "관통 대상이 살아남아도 쿨다운마다 계속 발사되는가"이며
    // pierce 기본값 자체가 아니다. base가 밸런스로 바뀌어도(2026-08-01 1→2) 시나리오가
    // 흔들리지 않도록 시작 pierce를 1로 명시 고정한 뒤 업그레이드로 2를 만든다.
    await act(async () => {
      useGameStore.setState((s) => ({
        weapons: { ...s.weapons, pencilThrow: { ...s.weapons.pencilThrow, pierce: 1 } },
      }))
    })
    const baseWeapon = useGameStore.getState().weapons.pencilThrow
    expect(baseWeapon).toMatchObject({ active: true, pierce: 1 })
    await act(async () => {
      frameCallbacks.at(-1)({ clock: { elapsedTime: 1 } }, 1 / 60)
    })
    if (animationFrames.length > 0) await flushNextAnimationFrame()
    expect(container.querySelectorAll('[data-testid="pencil-projectile-model"]')).toHaveLength(1)

    // The base projectile consumes its only hit and leaves the active-projectile gate clear.
    await act(async () => {
      frameCallbacks.at(-1)({}, 0.1)
    })
    await flushNextAnimationFrame()
    expect(targetHit).toHaveBeenCalledTimes(1)
    expect(container.querySelectorAll('[data-testid="pencil-projectile-model"]')).toHaveLength(0)

    // Real store transition used by the level-up card, not a hand-built weapon object.
    await act(async () => {
      useGameStore.getState().applyUpgrade('pencilPierce')
    })
    const piercedWeapon = useGameStore.getState().weapons.pencilThrow
    expect(piercedWeapon).toMatchObject({ active: true, pierce: 2 })

    // The same target is still alive and remains inside the 3zm / 2.25-unit firing circle.
    await act(async () => {
      frameCallbacks.at(-1)({ clock: { elapsedTime: 2 } }, 1 / 60)
    })
    await flushNextAnimationFrame()
    expect(container.querySelectorAll('[data-testid="pencil-projectile-model"]')).toHaveLength(1)

    // First pierced hit does not kill this target, so the next normal cooldown must still produce a projectile.
    await act(async () => {
      frameCallbacks.at(-1)({}, 0.1)
      frameCallbacks.at(-2)({ clock: { elapsedTime: 2.6 } }, 1 / 60)
    })
    if (animationFrames.length > 0) await flushNextAnimationFrame()

    expect(targetHit).toHaveBeenCalledTimes(2)
    expect(container.querySelectorAll('[data-testid="pencil-projectile-model"]')).toHaveLength(2)
  })

  it('removes an in-flight pencil when the real level-up phase pauses projectile frames', async () => {
    const target = enemyPool.spawn({ type: 'E01', x: 0, y: 0, z: 1, hp: 100, maxHp: 100 })
    enemyPool.setHitHandler(target, vi.fn())

    await act(async () => {
      frameCallbacks.at(-1)({ clock: { elapsedTime: 1 } }, 1 / 60)
    })
    await flushNextAnimationFrame()
    expect(container.querySelectorAll('[data-testid="pencil-projectile-model"]')).toHaveLength(1)

    // gainXp is the production transition that changes phase to levelup and
    // stops usePlayingFrame callbacks. The visible projectile must not remain
    // frozen while the choice overlay is open.
    await act(async () => {
      useGameStore.getState().gainXp(useGameStore.getState().player.xpToNext)
    })
    expect(animationFrames).toHaveLength(1)
    await flushNextAnimationFrame()

    expect(useGameStore.getState().phase).toBe('levelup')
    expect(container.querySelectorAll('[data-testid="pencil-projectile-model"]')).toHaveLength(0)
  })
})
