// @vitest-environment jsdom
// 소스 문자열 매칭이 아니라 실제 프레임을 돌려서 하나코의 힐이 스토어 HP를 올리는지 검증한다.
// Hanako.test.jsx는 전부 readFileSync + toContain이라 "배선됨"만 보장하고 "작동함"은 보장하지 않는다.
import React, { act } from 'react'
import * as THREE from 'three'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const frameCallbacks = []
vi.mock('@react-three/fiber', () => ({
  useFrame: (cb) => { frameCallbacks.push(cb) },
}))
vi.mock('../StudioTunedGroup.jsx', () => ({
  default: () => null,
  composeStudioPartPosition: (_el, _axis, base, extra = 0) => base + extra,
  composeStudioPartRotation: (_el, _axis, base, extra = 0) => base + extra,
}))
vi.mock('../../lib/sfxEvents.js', () => ({ emitSfx: vi.fn(), subscribeSfx: vi.fn(() => () => {}) }))
// jsdom에는 canvas 2d 컨텍스트가 없어 toon 그라디언트 생성이 터진다. 힐 검증과 무관한 순수 비주얼이다.
vi.mock('../../lib/toon.js', () => ({
  toonMat: () => ({}),
  outlineMat: () => ({}),
  inflateScale: (v) => v,
}))

import { HanakoWeapon } from './Hanako.jsx'
import { HANAKO_HEAL_INTERVAL_MS, HANAKO_HEAL_RATIO } from '../../lib/hanako.js'
import { useGameStore } from '../../store/useGameStore.js'
import { emitSfx } from '../../lib/sfxEvents.js'

let root = null
let container = null

function mountHanako() {
  container = document.createElement('div')
  root = createRoot(container)
  act(() => { root.render(<HanakoWeapon />) })
  // react-dom은 <group>을 커스텀 엘리먼트로 만들므로 Object3D 표면을 붙여준다.
  const groupEl = container.querySelector('group')
  if (groupEl && !groupEl.position) {
    groupEl.position = new THREE.Vector3()
    groupEl.rotation = new THREE.Euler()
  }
  return groupEl
}

// elapsedTime(초)을 직접 굴려서 프레임을 돌린다. usePlayingFrame이 고정 스텝을 소비하도록
// delta는 1/60로 고정한다.
function runFrames(count, { startSeconds = 0, stepSeconds = 1 / 60 } = {}) {
  let elapsed = startSeconds
  for (let i = 0; i < count; i += 1) {
    elapsed += stepSeconds
    const state = { clock: { elapsedTime: elapsed } }
    act(() => { frameCallbacks.forEach((cb) => cb(state, stepSeconds)) })
  }
  return elapsed
}

beforeEach(() => {
  frameCallbacks.length = 0
  vi.mocked(emitSfx).mockClear()
  useGameStore.getState().resetGame('stage1')
  useGameStore.setState((s) => ({
    phase: 'playing',
    weapons: {
      ...s.weapons,
      hanako: { ...(s.weapons.hanako ?? {}), active: true },
      chibiko: { ...(s.weapons.chibiko ?? {}), active: true },
    },
  }))
})

afterEach(() => {
  if (root) act(() => { root.unmount() })
  root = null
  container = null
  useGameStore.getState().resetGame('stage1')
})

describe('Hanako heal runtime', () => {
  it('20초 분량의 실제 프레임을 돌리면 최대 HP의 5%가 회복된다', () => {
    const maxHp = useGameStore.getState().player.maxHp
    const startHp = Math.round(maxHp * 0.4)
    useGameStore.setState((s) => ({ player: { ...s.player, hp: startHp } }))

    mountHanako()

    // 힐 주기 직전까지: 아직 회복이 없어야 한다.
    const framesJustUnder = Math.floor((HANAKO_HEAL_INTERVAL_MS / 1000) * 60) - 5
    runFrames(framesJustUnder)
    expect(useGameStore.getState().player.hp).toBe(startHp)

    // 주기를 넘기면 정확히 maxHp * 0.05 만큼 회복된다.
    runFrames(20, { startSeconds: framesJustUnder / 60 })
    const afterHp = useGameStore.getState().player.hp
    expect(afterHp).toBeCloseTo(startHp + maxHp * HANAKO_HEAL_RATIO, 5)
    expect(vi.mocked(emitSfx).mock.calls.filter(([e]) => e?.id === 'playerHeal')).toHaveLength(1)
    expect(JSON.stringify(useGameStore.getState().missionProgress)).toContain('companion.hanako.healCount')
  })

  it('치비코가 없으면 하나코는 힐하지 않는다', () => {
    useGameStore.setState((s) => ({
      player: { ...s.player, hp: 10 },
      weapons: { ...s.weapons, chibiko: { ...(s.weapons.chibiko ?? {}), active: false } },
    }))
    mountHanako()
    runFrames(1400)
    expect(useGameStore.getState().player.hp).toBe(10)
  })

  it('일시정지 동안 흐른 시간이 힐 주기에 그대로 적립된다(현재 동작 기록)', () => {
    const maxHp = useGameStore.getState().player.maxHp
    useGameStore.setState((s) => ({ player: { ...s.player, hp: 10 } }))
    mountHanako()

    // 1초만 플레이하고 일시정지한다.
    runFrames(60)
    expect(useGameStore.getState().player.hp).toBe(10)

    // 일시정지: usePlayingFrame이 콜백을 막지만 R3F clock.elapsedTime은 계속 흐른다.
    useGameStore.setState({ phase: 'paused' })
    runFrames(60, { startSeconds: 1 })
    expect(useGameStore.getState().player.hp).toBe(10)

    // 재개 직후 첫 프레임에서, 실제로는 1초밖에 안 싸웠는데 힐이 터진다.
    useGameStore.setState({ phase: 'playing' })
    runFrames(1, { startSeconds: 25 })
    expect(useGameStore.getState().player.hp).toBeCloseTo(10 + maxHp * HANAKO_HEAL_RATIO, 5)
  })

  it('최대 HP에서는 회복이 낭비되지 않고 쿨다운만 소모된다(현재 동작 기록)', () => {
    const maxHp = useGameStore.getState().player.maxHp
    useGameStore.setState((s) => ({ player: { ...s.player, hp: maxHp } }))
    mountHanako()

    // 첫 힐 시점: 만피라 HP 변화 없음.
    let elapsed = runFrames(1220)
    expect(useGameStore.getState().player.hp).toBe(maxHp)
    expect(vi.mocked(emitSfx).mock.calls.filter(([e]) => e?.id === 'playerHeal')).toHaveLength(0)

    // 힐 직후 피해를 입으면, 다음 힐까지 다시 20초를 기다려야 하는지 확인한다.
    useGameStore.setState((s) => ({ player: { ...s.player, hp: maxHp - 50 } }))
    runFrames(60, { startSeconds: elapsed })
    expect(useGameStore.getState().player.hp).toBe(maxHp - 50)
  })
})
