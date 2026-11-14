// @vitest-environment jsdom
// 2026-11-13 Terry "대기 시간+안전 상한" + 하드닝 엣지 케이스 — 실제 무기 컴포넌트를 마운트하고 프레임을 돌려
// 풀 크기·대기 수·슬롯 주인을 직접 센다(소스 문자열 검사가 아님). XP 교과서 인스턴스 층도 함께 돈다.
import React, { act, useState } from 'react'
import * as THREE from 'three'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const frameCallbacks = vi.hoisted(() => new Set())
vi.mock('@react-three/fiber', async () => {
  const ReactModule = await import('react')
  return {
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
vi.mock('../../lib/playtestLogger.js', () => ({ logPickup: vi.fn() }))
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

import { OnigiiriWeapon, getOnigiriWeaponStats } from './Onigiri.jsx'
import { MiniRosariWeapon, getMiniRosariWeaponStats } from './MiniRosari.jsx'
import { XpTextbookLayer, getXpTextbookLayerStats } from '../XpTextbook.jsx'
import { WEAPON_CATALOG } from '../../lib/weaponCatalog.js'
import { enemyBodies, enemyPool, playerPos } from '../../lib/refs.js'
import { MINI_ROSARI_HOVER_CAP, MINI_ROSARI_HOVER_TIMEOUT_MS, ONIGIRI_HOVER_CAP, ONIGIRI_HOVER_TIMEOUT_MS } from '../../lib/onigiri.js'
import { useGameStore } from '../../store/useGameStore.js'
import { setMagnetMultiplier } from '../../lib/pickup.js'

let root = null
let container = null
let elapsed = 0
let savedState = null

// react-dom은 <group>을 알 수 없는 HTML 요소로 만든다. 무기 루프가 쓰는 Object3D 표면을 붙여 준다.
function patchGroups() {
  container.querySelectorAll('group').forEach((el) => {
    if (el.position instanceof THREE.Vector3) return
    el.position = new THREE.Vector3()
    el.rotation = new THREE.Euler()
    el.scale = new THREE.Vector3(1, 1, 1)
    el.userData = {}
  })
}

function frame(delta, each) {
  elapsed += delta
  const state = { clock: { elapsedTime: elapsed } }
  patchGroups()
  act(() => { [...frameCallbacks].forEach((cb) => cb(state, delta)) })
  patchGroups()
  if (each) each()
}

function run(seconds, { delta = 1 / 15, each } = {}) {
  const frames = Math.round(seconds / delta)
  for (let i = 0; i < frames; i += 1) frame(delta, each)
}

function runUntil(predicate, maxSeconds, delta = 1 / 60) {
  const frames = Math.round(maxSeconds / delta)
  for (let i = 0; i < frames; i += 1) {
    frame(delta)
    if (predicate()) return true
  }
  return false
}

function setWeapon(id, weapon) {
  act(() => {
    useGameStore.setState((s) => ({ weapons: { ...s.weapons, [id]: weapon } }))
  })
  patchGroups()
}

function spawnUnkillable(x, z, type = 'E01') {
  const handle = enemyPool.spawn({ type, x, y: 0, z, hp: 1e9, maxHp: 1e9 })
  enemyPool.setHitHandler(handle, () => true)
  return handle
}

const WEAPONS = {
  onigiri: {
    Component: OnigiiriWeapon,
    stats: getOnigiriWeaponStats,
    timeoutMs: ONIGIRI_HOVER_TIMEOUT_MS,
    cap: ONIGIRI_HOVER_CAP,
    // 슬롯 주인 불변식: 살아 있는 주먹밥 수 = 인스턴스 슬롯 주인 수, 그리는 수 ≤ 용량.
    consistent: (s) => s.bodyLiveSlots === s.projectiles && s.bodyInstances <= s.bodyCapacity,
    empty: (s) => s.projectiles === 0 && s.hovering === 0 && s.bodyLiveSlots === 0 && s.bodyInstances === 0
      && s.bursts === 0 && s.grainInstances === 0,
    idle: (s) => s.projectiles === 0 && s.hovering === 0 && s.bodyLiveSlots === 0 && s.bodyInstances === 0,
    pool: (s) => s.bodyCapacity,
    maxLevel: (base) => ({ ...base, active: true, level: 5, bounces: 12, damage: base.damage + 22.25 * 2, critChance: 0.24 }),
  },
  miniRosari: {
    Component: MiniRosariWeapon,
    stats: getMiniRosariWeaponStats,
    timeoutMs: MINI_ROSARI_HOVER_TIMEOUT_MS,
    cap: MINI_ROSARI_HOVER_CAP,
    // 슬롯 주인 불변식: 주인 있는 분신 슬롯 = 살아 있는 분신 + 펑 중인 분신.
    consistent: (s) => s.ownedSlots === s.projectiles + s.poofs,
    empty: (s) => s.projectiles === 0 && s.hovering === 0 && s.poofs === 0 && s.slots === 0 && s.ownedSlots === 0,
    // 끝난 뒤에는 주인 없는 따뜻한 슬롯 1개만 남는다(다음 투척 때 모델을 다시 복제하지 않게).
    idle: (s) => s.projectiles === 0 && s.hovering === 0 && s.poofs === 0 && s.ownedSlots === 0 && s.slots <= 1,
    pool: (s) => s.slots,
    maxLevel: (base) => ({ ...base, active: true, level: 5, bounces: 9, damage: base.damage + 16.7 * 2, critChance: 0.28 }),
  },
}

beforeEach(() => {
  savedState = useGameStore.getState()
  frameCallbacks.clear()
  enemyPool.reset()
  enemyBodies.clear()
  elapsed = 0
  playerPos.set(0, 0.32, 0)
  useGameStore.setState({ phase: 'playing', gainXp: vi.fn(), recordMissionEvent: vi.fn() })
  container = document.createElement('div')
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  root = null
  container = null
  enemyPool.reset()
  enemyBodies.clear()
  useGameStore.setState(savedState, true)
})

function mount(id) {
  const { Component } = WEAPONS[id]
  act(() => { root.render(<Component />) })
  patchGroups()
}

describe.each(['onigiri', 'miniRosari'])('%s hover timeout + cap, mounted', (id) => {
  const spec = WEAPONS[id]
  const base = { ...WEAPON_CATALOG[id].base, active: true }

  it('removes a hovering projectile after the timeout (game time) and never before', () => {
    elapsed = 2000 // 첫 투척은 바로, 다음 투척은 1000초 뒤 → 이 테스트 동안 1발만
    setWeapon(id, { ...base, cooldown: 1e6 })
    mount(id)
    spawnUnkillable(1, 0)
    expect(runUntil(() => spec.stats().hovering === 1, 5)).toBe(true)
    run(spec.timeoutMs / 1000 - 0.5)
    expect(spec.stats().projectiles).toBe(1)
    run(1.0)
    expect(spec.stats().projectiles).toBe(0)
    run(0.5)
    expect(spec.idle(spec.stats())).toBe(true)
  })

  it('edge (1): pause, level-up, dialogue/cutscene pauses and a hidden tab do not advance the hover timer', () => {
    elapsed = 2000
    setWeapon(id, { ...base, cooldown: 1e6 })
    mount(id)
    spawnUnkillable(1, 0)
    expect(runUntil(() => spec.stats().hovering === 1, 5)).toBe(true)
    run(2)
    const before = spec.stats().maxHoverMs
    for (const phase of ['paused', 'levelup']) {
      act(() => { useGameStore.setState({ phase }) })
      run(60) // 벽시계로 60초
      expect(spec.stats().maxHoverMs).toBe(before)
      expect(spec.stats().projectiles).toBe(1)
    }
    // 대화·컷신·자판기·퀘스트 일시정지도 phase 'paused'(pauseSource만 다르다).
    act(() => { useGameStore.setState({ phase: 'paused', pauseSource: 'intro' }) })
    run(30)
    expect(spec.stats().maxHoverMs).toBe(before)
    act(() => { useGameStore.setState({ phase: 'playing', pauseSource: null }) })
    // 탭 숨김: rAF가 멈췄다가 돌아오는 첫 프레임의 거대한 delta는 0.5초로 잘린다(물리·쿨다운과 같은 규칙).
    frame(600)
    const after = spec.stats().maxHoverMs
    expect(after - before).toBeGreaterThan(0)
    expect(after - before).toBeLessThanOrEqual(500 + 1e-6)
    expect(spec.stats().projectiles).toBe(1)
  })

  it('edge (2): losing/replacing the weapon, a stage reset (gameKey) and unmount clear every projectile, slot and timer', () => {
    setWeapon(id, { ...base, cooldown: 400 })
    mount(id)
    spawnUnkillable(1, 0)
    run(3)
    expect(spec.stats().hovering).toBeGreaterThanOrEqual(2)
    // 끝나는 연출(쌀알 터짐 / 펑) 한가운데서 끊는다.
    const midRetire = () => {
      const s = spec.stats()
      return id === 'onigiri' ? s.bursts > 0 : s.poofs > 0
    }
    expect(runUntil(midRetire, spec.timeoutMs / 1000 + 2)).toBe(true)

    setWeapon(id, { ...base, active: false })
    expect(spec.empty(spec.stats())).toBe(true)

    setWeapon(id, { ...base, cooldown: 400 })
    run(3)
    expect(spec.stats().projectiles).toBeGreaterThan(0)
    expect(runUntil(midRetire, spec.timeoutMs / 1000 + 2)).toBe(true)
    // 판 리셋·사망 후 재시작·스테이지 이동은 gameKey를 올린다.
    act(() => { useGameStore.setState((s) => ({ gameKey: s.gameKey + 1 })) })
    patchGroups()
    expect(spec.empty(spec.stats())).toBe(true)
    run(0.2)
    expect(spec.consistent(spec.stats())).toBe(true)

    // 트리째 내려가면(Physics key 리마운트) 무기 핸들도 사라진다.
    act(() => { root.render(null) })
    expect(spec.stats()).toBeNull()
  })

  it('edge (5): B05 alone, already hit by every throw, 60s at max level with the cooldown passive — hovering <= cap, pools stop growing', () => {
    for (const [label, weapon] of [
      ['max level + 20% cooldown passive', { ...spec.maxLevel(base), cooldown: base.cooldown * 0.8 }],
      ['stress: 150ms cooldown', { ...spec.maxLevel(base), cooldown: 150 }],
    ]) {
      act(() => { root.render(null) })
      enemyPool.reset()
      setWeapon(id, weapon)
      mount(id)
      spawnUnkillable(1.5, 0, 'B05')
      let maxHovering = 0
      let pool30 = 0
      let maxProjectiles = 0
      run(30, { each: () => {
        const s = spec.stats()
        expect(s.hovering, label).toBeLessThanOrEqual(spec.cap)
        expect(spec.consistent(s), label).toBe(true)
        maxHovering = Math.max(maxHovering, s.hovering)
        maxProjectiles = Math.max(maxProjectiles, s.projectiles)
      } })
      pool30 = spec.pool(spec.stats())
      run(30, { each: () => {
        const s = spec.stats()
        expect(s.hovering, label).toBeLessThanOrEqual(spec.cap)
        expect(spec.consistent(s), label).toBe(true)
        maxProjectiles = Math.max(maxProjectiles, s.projectiles)
      } })
      expect(spec.pool(spec.stats()), label).toBeLessThanOrEqual(Math.max(pool30, 1))
      // 날아가는 중인 것(≤ 비행 시간/쿨다운 + 여유)을 빼면 전부 대기 상한 안이다.
      expect(maxProjectiles, label).toBeLessThanOrEqual(spec.cap + 12)
      if (label.startsWith('stress')) expect(maxHovering, label).toBe(spec.cap) // 상한이 실제로 걸렸다
    }
  })
})

function TextbookHost({ apiRef }) {
  const [books, setBooks] = useState([])
  apiRef.current = {
    add: (book) => act(() => { setBooks((prev) => [...prev, book]) }),
    count: () => books.length,
  }
  return <XpTextbookLayer textbooks={books} onCollect={(bookId) => setBooks((prev) => prev.filter((b) => b.id !== bookId))} />
}

// 리뷰 F1: 예전 교과서는 권마다 자기 프레임에서 phase를 확인했다. 같은 프레임에 3권을 줍다가 1권째 XP로
// 레벨업하면, 나머지 2권은 레벨업 중에 주워지면 안 된다(효과음·미션 이벤트가 더 나가지 않게).
describe('XP textbook layer stops at a mid-frame level-up (review F1)', () => {
  it('three co-located books: the first triggers a level-up, the other two stay on the field until play resumes', () => {
    setMagnetMultiplier(5)
    const phases = []
    const gainXp = vi.fn(() => {
      phases.push(useGameStore.getState().phase)
      if (gainXp.mock.calls.length === 1) useGameStore.setState({ phase: 'levelup' })
    })
    useGameStore.setState({ gainXp })
    const api = { current: null }
    act(() => { root.render(<TextbookHost apiRef={api} />) })
    for (let id = 1; id <= 3; id += 1) api.current.add({ id, pos: [0.05, 0, 0.05], value: 4 })
    // 0.25초 프레임: 세 권이 같은 프레임에 착지하고, 같은 프레임에 끌려와, 같은 프레임에 주워질 차례가 된다.
    expect(runUntil(() => gainXp.mock.calls.length > 0, 3, 0.25)).toBe(true)
    expect(gainXp).toHaveBeenCalledTimes(1)
    expect(useGameStore.getState().phase).toBe('levelup')
    expect(getXpTextbookLayerStats().items).toBe(2)
    run(2) // 레벨업 카드 화면 동안
    expect(gainXp).toHaveBeenCalledTimes(1)
    expect(getXpTextbookLayerStats().items).toBe(2)
    act(() => { useGameStore.setState({ phase: 'playing' }) })
    run(0.5)
    expect(gainXp).toHaveBeenCalledTimes(3)
    expect(phases).toEqual(['playing', 'playing', 'playing'])
    expect(getXpTextbookLayerStats().items).toBe(0)
    setMagnetMultiplier(1)
  })
})

describe('edge (6)+(7): 10 simulated minutes of fast spawn/kill churn with both weapons and XP textbooks', () => {
  it('never leaks instance slots, swarm entries, clone slots or textbook instances', () => {
    const rand = (() => { let s = 1234567; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 } })()
    const api = { current: null }
    // 자석 패시브를 크게 — 떨어진 교과서는 모두 결국 주워진다(누수와 "바닥에 남은 책"을 구분하기 위해).
    setMagnetMultiplier(20)
    setWeapon('onigiri', { ...WEAPONS.onigiri.maxLevel({ ...WEAPON_CATALOG.onigiri.base }), cooldown: 300 })
    setWeapon('miniRosari', { ...WEAPONS.miniRosari.maxLevel({ ...WEAPON_CATALOG.miniRosari.base }), cooldown: 300 })
    act(() => {
      root.render(<><OnigiiriWeapon /><MiniRosariWeapon /><TextbookHost apiRef={api} /></>)
    })
    patchGroups()

    const alive = []
    let bookId = 0
    const max = { oni: 0, oniCap: 0, mini: 0, miniSlots: 0, books: 0, bookCap: 0 }
    let angle = 0
    run(600, {
      delta: 0.25,
      each: () => {
        // 로자리는 작은 원을 천천히 돈다(이 테스트의 0.25초 프레임에서 자석 수집이 따라잡을 만큼).
        angle += 0.01
        playerPos.set(Math.cos(angle) * 2, 0.32, Math.sin(angle) * 2)
        // 빠른 스폰·처치 교체: 일부를 죽이고(교과서 드롭) 주변 0.8~5u에 새로 채운다.
        for (let i = alive.length - 1; i >= 0; i -= 1) {
          if (rand() < 0.35) {
            const handle = alive[i]
            const proxy = enemyPool.get(handle)
            if (proxy) {
              const t = proxy.translation()
              if (rand() < 0.5) api.current.add({ id: ++bookId, pos: [t.x * 0.2 + playerPos.x * 0.8, 0, t.z * 0.2 + playerPos.z * 0.8], value: 1 })
              enemyPool.despawn(handle)
            }
            alive.splice(i, 1)
          }
        }
        while (alive.length < 30) {
          const a = rand() * Math.PI * 2
          const r = 0.8 + rand() * 4.2
          const handle = enemyPool.spawn({ type: 'E01', x: playerPos.x + Math.cos(a) * r, y: 0, z: playerPos.z + Math.sin(a) * r, hp: 1e9, maxHp: 1e9 })
          if (!handle) break
          enemyPool.setHitHandler(handle, () => true)
          alive.push(handle)
        }
        const oni = getOnigiriWeaponStats()
        const mini = getMiniRosariWeaponStats()
        const books = getXpTextbookLayerStats()
        expect(WEAPONS.onigiri.consistent(oni)).toBe(true)
        expect(WEAPONS.miniRosari.consistent(mini)).toBe(true)
        expect(oni.hovering).toBeLessThanOrEqual(ONIGIRI_HOVER_CAP)
        expect(mini.hovering).toBeLessThanOrEqual(MINI_ROSARI_HOVER_CAP)
        expect(books.liveSlots).toBe(books.items)
        max.oni = Math.max(max.oni, oni.projectiles)
        max.oniCap = Math.max(max.oniCap, oni.bodyCapacity)
        max.mini = Math.max(max.mini, mini.projectiles)
        max.miniSlots = Math.max(max.miniSlots, mini.slots)
        max.books = Math.max(max.books, books.items)
        max.bookCap = Math.max(max.bookCap, books.capacity)
      },
    })
    expect(bookId).toBeGreaterThan(1000) // 실제로 많이 떨어지고 주워졌다
    expect(max.oni).toBeLessThanOrEqual(ONIGIRI_HOVER_CAP + 12)
    expect(max.oniCap).toBeLessThanOrEqual(64)
    expect(max.mini).toBeLessThanOrEqual(MINI_ROSARI_HOVER_CAP + 12)
    expect(max.miniSlots).toBeLessThanOrEqual(MINI_ROSARI_HOVER_CAP + 12 + 1)
    expect(max.books).toBeLessThan(200)
    expect(max.bookCap).toBeLessThanOrEqual(256)
    // 교과서는 주운 만큼 목록·슬롯에서 빠진다.
    const books = getXpTextbookLayerStats()
    expect(books.items).toBe(api.current.count())

    // 리셋: 무기 해제 + 교과서 층 언마운트 → 아무것도 남지 않는다.
    setWeapon('onigiri', { ...WEAPON_CATALOG.onigiri.base, active: false })
    setWeapon('miniRosari', { ...WEAPON_CATALOG.miniRosari.base, active: false })
    expect(WEAPONS.onigiri.empty(getOnigiriWeaponStats())).toBe(true)
    expect(WEAPONS.miniRosari.empty(getMiniRosariWeaponStats())).toBe(true)
    act(() => { root.render(null) })
    expect(getXpTextbookLayerStats()).toBeNull()
    setMagnetMultiplier(1)
  }, 180_000)
})
