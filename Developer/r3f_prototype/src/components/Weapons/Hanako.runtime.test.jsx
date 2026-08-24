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

  // 사용자 사양(2026-08-25): "하나코는 무조건 정해진 시간마다 힐을 넣는다."
  // 한 번 터지고 마는 게 아니라, 런이 이어지는 동안 주기마다 계속 들어와야 한다.
  it('중단 없이 플레이하면 주기마다 빠짐없이 힐이 들어온다', () => {
    const maxHp = useGameStore.getState().player.maxHp
    useGameStore.setState((s) => ({ player: { ...s.player, hp: 1 } }))
    mountHanako()

    const framesPerInterval = Math.round((HANAKO_HEAL_INTERVAL_MS / 1000) * 60)
    // 주기의 기준점은 0초가 아니라 하나코가 처음 프레임을 받은 시각이다(startedAtRef 초기화).
    // 그래서 워밍업 1프레임을 먼저 돌려 기준점을 잡고, 이후 주기를 센다.
    let elapsed = runFrames(1)
    // 5주기를 연속으로 돌린다. 주기가 끝날 때마다 회복 횟수가 정확히 하나씩 늘어야 한다.
    // 주기당 1프레임씩 여유를 두는 것은 부동소수 누적 오차 때문이며, 2회분(20초)에는 한참 못 미친다.
    for (let interval = 1; interval <= 5; interval += 1) {
      elapsed = runFrames(framesPerInterval + 1, { startSeconds: elapsed })
      const heals = vi.mocked(emitSfx).mock.calls.filter(([e]) => e?.id === 'playerHeal')
      expect(heals).toHaveLength(interval)
      expect(useGameStore.getState().player.hp).toBeCloseTo(1 + maxHp * HANAKO_HEAL_RATIO * interval, 5)
    }
  })

  // 힐이 "무조건" 들어오려면 주기 사이에 무슨 일이 있었든 상관없어야 한다.
  // 피해를 계속 맞는 중이어도 주기가 되면 회복이 들어온다.
  it('맞는 중에도 주기가 되면 힐이 들어온다', () => {
    const maxHp = useGameStore.getState().player.maxHp
    // maxHp 위로 올려두면 healPlayer의 클램프에 걸려 회복이 통째로 사라진다 — 반드시 그 아래에서 시작한다.
    useGameStore.setState((s) => ({ player: { ...s.player, hp: Math.max(1, s.player.maxHp - 40) } }))
    mountHanako()

    const intervalSec = HANAKO_HEAL_INTERVAL_MS / 1000
    // 주기의 절반이 조금 넘는 동안 매 초 1씩 깎는다. 힐 타이머는 피해와 무관해야 한다.
    const damageSeconds = Math.floor(intervalSec) - 5
    let elapsed = runFrames(1)
    for (let second = 0; second < damageSeconds; second += 1) {
      elapsed = runFrames(60, { startSeconds: elapsed })
      useGameStore.setState((s) => ({ player: { ...s.player, hp: s.player.hp - 1 } }))
    }
    const beforeHp = useGameStore.getState().player.hp
    expect(vi.mocked(emitSfx).mock.calls.filter(([e]) => e?.id === 'playerHeal')).toHaveLength(0)

    // 남은 5초를 채우면(+여유 2프레임) 맞는 중이었든 아니든 회복이 들어온다.
    runFrames(5 * 60 + 2, { startSeconds: elapsed })
    expect(useGameStore.getState().player.hp).toBeCloseTo(beforeHp + maxHp * HANAKO_HEAL_RATIO, 5)
  })
})
