// @vitest-environment jsdom
// balanceqa F1 (2026-11-02): 교체 카드로 오니기리·꼬마 로자리를 버렸다가 같은 판에서 다시 얻으면,
// 버리기 전에 떠서 기다리던 발사체가 처음 던진 자리에서 바운스가 꽉 찬 채 되살아났다.
// 소스 문자열 검사가 아니라 실제 컴포넌트를 마운트하고 프레임을 돌려 "다시 얻으면 새 투척만 보인다"를 고정한다.
import React, { act } from 'react'
import * as THREE from 'three'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const frameCallbacks = vi.hoisted(() => new Set())
vi.mock('@react-three/fiber', async () => {
  const ReactModule = await import('react')
  return {
    // 마운트 동안 1번만 등록하고 언마운트 때 해제한다. 매 렌더 최신 콜백을 부른다.
    useFrame: (cb) => {
      const ref = ReactModule.useRef(cb)
      ref.current = cb
      ReactModule.useEffect(() => {
        const run = (state, delta) => ref.current(state, delta)
        frameCallbacks.add(run)
        return () => { frameCallbacks.delete(run) }
      }, [])
    },
  }
})
vi.mock('../StudioTunedGroup.jsx', () => ({ default: () => null }))
vi.mock('../../lib/sfxEvents.js', () => ({ emitSfx: vi.fn(), subscribeSfx: vi.fn(() => () => {}) }))
vi.mock('../../lib/toon.js', async (importOriginal) => ({
  ...(await importOriginal()),
  toonMat: () => ({ transparent: false, opacity: 1 }),
  outlineMat: () => ({}),
  inflateScale: (v) => v,
}))
vi.mock('../PlayerMesh.jsx', () => ({ default: () => null }))
vi.mock('../PlayerV9Model.jsx', () => ({ default: () => null }))
vi.mock('../PlayerRosariModel.jsx', () => ({ default: () => null }))
vi.mock('../Player.jsx', () => ({
  loadSavedPlayerAppearance: () => 'rosari',
  resolvePlayerAppearance: (v) => v,
}))

import { OnigiiriWeapon } from './Onigiri.jsx'
import { MiniRosariWeapon } from './MiniRosari.jsx'
import { WEAPON_CATALOG } from '../../lib/weaponCatalog.js'
import { enemyPool, playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'

const STEP = 1 / 60
let root = null
let container = null
let elapsed = 0
let savedState = null

// react-dom은 <group>을 알 수 없는 HTML 요소로 만든다. 발사체가 쓰는 Object3D 표면을 붙여 준다.
function patchGroups() {
  container.querySelectorAll('group').forEach((el) => {
    if (el.position instanceof THREE.Vector3) return
    el.position = new THREE.Vector3()
    el.rotation = new THREE.Euler()
    el.scale = new THREE.Vector3(1, 1, 1)
    el.userData = {}
  })
}

function runSeconds(seconds) {
  const frames = Math.round(seconds / STEP)
  for (let i = 0; i < frames; i += 1) {
    elapsed += STEP
    const state = { clock: { elapsedTime: elapsed } }
    patchGroups()
    act(() => { [...frameCallbacks].forEach((cb) => cb(state, STEP)) })
  }
  patchGroups()
}

function setWeapon(id, active) {
  act(() => {
    useGameStore.setState((s) => ({
      weapons: { ...s.weapons, [id]: { ...WEAPON_CATALOG[id].base, active } },
    }))
  })
  patchGroups()
}

function spawnEnemy(x, z) {
  const handle = enemyPool.spawn({ type: 'E01', x, y: 0, z, hp: 1e9, maxHp: 1e9 })
  enemyPool.setHitHandler(handle, () => true) // 맞아도 죽지 않는 표적 — 맞힌 뒤 대기 상태를 만든다
  return handle
}

beforeEach(() => {
  savedState = useGameStore.getState()
  frameCallbacks.clear()
  enemyPool.reset()
  elapsed = 0
  playerPos.set(0, 0.32, 0)
  container = document.createElement('div')
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  root = null
  container = null
  enemyPool.reset()
  useGameStore.setState(savedState, true)
})

describe.each([
  ['onigiri', OnigiiriWeapon, (c) => c.querySelectorAll(':scope > group').length],
  // 꼬마 로자리는 발사체마다 분신 슬롯 그룹 1개를 그린다(발사체 자신은 DOM이 없다).
  ['miniRosari', MiniRosariWeapon, (c) => c.querySelectorAll(':scope > group').length],
])('%s drop -> re-acquire in the same stage (balanceqa F1)', (id, Weapon, countProjectiles) => {
  it('shows only new throws after re-acquiring; projectiles hovering before the drop are gone', () => {
    const weapon = WEAPON_CATALOG[id].base
    useGameStore.setState({ phase: 'playing' })
    setWeapon(id, true)
    act(() => { root.render(<Weapon />) })
    patchGroups()

    // 맞아도 안 죽는 적 1명. 쿨다운마다 1발씩 나가 맞히고, 다음 적이 없어 그 자리에 떠서 기다린다.
    spawnEnemy(1, 0)
    runSeconds((weapon.cooldown * 2) / 1000 + 0.5)
    const beforeDrop = countProjectiles(container)
    expect(beforeDrop).toBeGreaterThanOrEqual(2) // 떠서 기다리는 발사체가 여러 개(상한 없음)

    // 교체 카드로 무기를 버린다 → 화면에서 사라진다.
    setWeapon(id, false)
    expect(countProjectiles(container)).toBe(0)
    runSeconds(1)

    // 같은 판에서 다시 얻는다. 쿨다운이 차기 전에는 아무것도 없어야 한다(옛 발사체 부활 금지).
    playerPos.set(-2, 0.32, 0.5)
    setWeapon(id, true)
    expect(countProjectiles(container)).toBe(0)
    runSeconds(0.1)
    // 이번 프레임까지 새 투척이 없었다면 아직 0개, 있었다면 새 투척 1개뿐이다.
    expect(countProjectiles(container)).toBeLessThanOrEqual(1)

    // 다음 쿨다운 뒤에는 새 투척만 보인다.
    runSeconds(weapon.cooldown / 1000 + 0.2)
    expect(countProjectiles(container)).toBeLessThanOrEqual(2)
    expect(countProjectiles(container)).toBeGreaterThanOrEqual(1)
    expect(countProjectiles(container)).toBeLessThan(beforeDrop + 1)
  })
})
