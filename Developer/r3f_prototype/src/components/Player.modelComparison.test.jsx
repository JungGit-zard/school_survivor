// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

const game = vi.hoisted(() => ({
  phase: 'playing', currentStageId: 'stage1', deathCause: null,
  player: { speed: 3, hp: 87, maxHp: 100, hitFlashToken: 0, healFlashToken: 0 },
  endInvulnerable: () => {}, damagePlayer: () => {},
}))
vi.mock('../store/useGameStore.js', () => ({ useGameStore: (selector) => selector(game) }))
vi.mock('@react-three/fiber', () => ({ useFrame: () => {} }))
vi.mock('@react-three/drei', () => ({ Html: ({ children }) => <div data-testid="comparison-label">{children}</div> }))
vi.mock('@react-three/rapier', async () => {
  const { forwardRef } = await import('react')
  return { RigidBody: forwardRef(({ children }, ref) => <div ref={ref} data-testid="rigid-body">{children}</div>), CuboidCollider: () => null }
})
vi.mock('./PlayerV9Model.jsx', () => ({ default: () => <div data-testid="v9-model" /> }))
vi.mock('./PlayerRosariModel.jsx', () => ({ default: () => <div data-testid="rosari-model" /> }))
vi.mock('./PlayerMesh.jsx', () => ({ default: () => <div data-testid="legacy-model" /> }))
vi.mock('./MiniHealthBar.jsx', () => ({ default: ({ current }) => <div data-testid="hp">{current}</div> }))

import Player, { PLAYER_APPEARANCE_CYCLE, PLAYER_APPEARANCE_LABELS, PlayerVisual, nextPlayerAppearance, resolvePlayerAppearance } from './Player.jsx'
import { PLAYER_APPEARANCE_VALUES } from '../lib/playerAppearance.js'
import { playerFacing, playerPos } from '../lib/refs.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests, buildCloudProgressSnapshot } from '../lib/firebaseProgress.js'
import { saveTitleSettings } from '../lib/titleSettings.js'

let container, root, originalFacing, originalPosition
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.stubEnv('DEV', true)
  _resetFirebaseProgressForTests()
  originalFacing = playerFacing.clone()
  originalPosition = playerPos.clone()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  playerFacing.copy(originalFacing)
  playerPos.copy(originalPosition)
  vi.unstubAllEnvs()
})

describe('local F8 model comparison', () => {
  // 'rosari'는 아직 여기에 넣을 수 없다 — loadTitleSettings의 화이트리스트가 2값이라
  // saveTitleSettings가 키를 떨어뜨린다. backendmini가 그 목록을 PLAYER_APPEARANCE_VALUES로
  // 바꾸면 이 배열을 PLAYER_APPEARANCE_VALUES로 교체한다.
  it.each(['v9', 'legacy'])('uses saved %s appearance in production without enabling F8', (appearance) => {
    _seedHydratedFirebaseProgressForTests()
    saveTitleSettings({ playerAppearance: appearance })
    vi.stubEnv('DEV', false)
    act(() => root.render(<Player />))
    expect(container.querySelector(`[data-testid="${appearance}-model"]`)).not.toBeNull()
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F8' })))
    expect(container.querySelector(`[data-testid="${appearance}-model"]`)).not.toBeNull()
  })

  it('renders the current model for guests before Firebase hydration', () => {
    vi.stubEnv('DEV', false)
    act(() => root.render(<Player />))
    expect(container.querySelector('[data-testid="v9-model"]')).not.toBeNull()
  })

  it('starts the temporary F8 comparison from a saved legacy selection without changing settings', () => {
    _seedHydratedFirebaseProgressForTests()
    saveTitleSettings({ playerAppearance: 'legacy' })
    const before = buildCloudProgressSnapshot()
    act(() => root.render(<Player />))
    const body = container.querySelector('[data-testid="rigid-body"]')
    const group = container.querySelector('[data-testid="legacy-model"]').parentElement
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F8' })))
    expect(container.querySelector('[data-testid="v9-model"]').parentElement).toBe(group)
    expect(container.querySelector('[data-testid="rigid-body"]')).toBe(body)
    expect(buildCloudProgressSnapshot().progress).toEqual(before.progress)
  })
  it('swaps back and forth without remounting the facing group, physics body or game state', () => {
    act(() => root.render(<Player />))
    const facingGroup = container.querySelector('[data-testid="v9-model"]').parentElement
    const body = container.querySelector('[data-testid="rigid-body"]')
    // React host reconciliation is the same boundary R3F uses: the group and
    // its ref survive, while only its model child changes. Keep real Three
    // transforms on that host to catch replacement/reset during the toggle.
    const rotation = new THREE.Euler(0, 1.23, 0)
    const position = new THREE.Vector3(4, 0.32, -7)
    facingGroup.rotation = rotation
    facingGroup.position = position
    playerFacing.set(Math.sin(1.23), 0, Math.cos(1.23))
    playerPos.copy(position)
    const before = JSON.stringify(game)
    const facing = playerFacing.clone()
    for (const expected of ['rosari', 'legacy', 'v9', 'rosari']) {
      act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F8', cancelable: true })))
      expect(container.querySelector(`[data-testid="${expected}-model"]`).parentElement).toBe(facingGroup)
      expect(container.querySelector('[data-testid="rigid-body"]')).toBe(body)
      expect(facingGroup.rotation).toBe(rotation)
      expect(facingGroup.rotation.y).toBe(1.23)
      expect(facingGroup.position).toBe(position)
      expect(playerPos.toArray()).toEqual([4, 0.32, -7])
      expect(playerFacing.toArray()).toEqual(facing.toArray())
      expect(container.querySelector('[data-testid="hp"]').textContent).toBe('87')
      expect(container.querySelector('[data-testid="comparison-label"]').textContent)
        .toContain({ legacy: '이전 모델', v9: '이번 V9', rosari: '로자리' }[expected])
    }
    expect(JSON.stringify(game)).toBe(before)
  })

  it('ignores repeats and text editing, and does not install the shortcut in production', () => {
    act(() => root.render(<Player />))
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F8', repeat: true })))
    const input = document.createElement('input')
    container.appendChild(input)
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { code: 'F8', bubbles: true })))
    expect(container.querySelector('[data-testid="v9-model"]')).not.toBeNull()
    act(() => root.unmount())
    root = createRoot(container)
    vi.stubEnv('DEV', false)
    act(() => root.render(<Player />))
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F8' })))
    expect(container.querySelector('[data-testid="v9-model"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="comparison-label"]')).toBeNull()
  })
})

describe('three player appearances', () => {
  // 저장 가능한 값(lib/playerAppearance.js), 렌더 분기, F8 순환, 라벨이 같은 집합을 덮는지.
  // 하나라도 빠지면 그 외형은 "저장은 되는데 V9가 렌더되는" 조용한 실패가 된다.
  it('covers every savable appearance in the render branch, the F8 cycle and the labels', () => {
    expect(new Set(PLAYER_APPEARANCE_CYCLE)).toEqual(new Set(PLAYER_APPEARANCE_VALUES))
    expect(Object.keys(PLAYER_APPEARANCE_LABELS).sort()).toEqual([...PLAYER_APPEARANCE_VALUES].sort())
    for (const value of PLAYER_APPEARANCE_VALUES) expect(resolvePlayerAppearance(value)).toBe(value)
  })

  it.each(PLAYER_APPEARANCE_VALUES)('renders only the %s model', (appearance) => {
    act(() => root.render(<PlayerVisual movingRef={{ current: false }} hp={100} maxHp={100} comparisonModel={appearance} />))
    expect(container.querySelector(`[data-testid="${appearance}-model"]`)).not.toBeNull()
    for (const other of PLAYER_APPEARANCE_VALUES.filter((value) => value !== appearance)) {
      expect(container.querySelector(`[data-testid="${other}-model"]`)).toBeNull()
    }
  })

  // 모르는 값이 조용히 V9로 떨어지면 "Studio에서 조정했는데 게임이 안 바뀐다"가 된다.
  it('warns in DEV instead of silently falling back for an unknown appearance', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    act(() => root.render(<PlayerVisual movingRef={{ current: false }} hp={100} maxHp={100} comparisonModel="made-up" />))
    expect(container.querySelector('[data-testid="v9-model"]')).not.toBeNull()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('made-up'))
    warn.mockRestore()
    expect(resolvePlayerAppearance(undefined)).toBe('v9')
  })

  it('cycles F8 through every appearance exactly once before repeating', () => {
    const seen = []
    let current = 'v9'
    for (let i = 0; i < PLAYER_APPEARANCE_CYCLE.length; i += 1) {
      current = nextPlayerAppearance(current)
      seen.push(current)
    }
    expect(new Set(seen)).toEqual(new Set(PLAYER_APPEARANCE_VALUES))
    expect(nextPlayerAppearance(current)).toBe(seen[0])
  })
})
