// @vitest-environment jsdom
// Terry 2026-11-08: "내가 보면서 지시할수 있도록 슬테라 즉시 출현버튼을 만들어".
// 타이틀 치트 메뉴(↑↓↑↓ASD, 개발 빌드 전용)의 켜기/끄기 항목 + 런 중 작은 '슬테라' 버튼.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SlteraInstantSpawnButton, { SlteraInstantSpawnToggle, SlteraMasterTitleToggle, canUseSlteraInstantSpawn } from './SlteraInstantSpawn.jsx'
import { useAuthStore } from '../store/useAuthStore.js'
import {
  hasSlteraInstantSpawnTarget, isSlteraInstantSpawnEnabled, registerSlteraInstantSpawnTarget, requestSlteraInstantPass,
  setSlteraInstantSpawnEnabled,
} from '../lib/slteraInstantSpawn.js'
import { SLTERA_PHASE, beginSlteraPass, consumeSlteraPassStart, createSlteraRunState, requestSlteraInstantPassOn } from '../lib/slteraEvent.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root
let unregister = null

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  unregister?.()
  unregister = null
  setSlteraInstantSpawnEnabled(false)
  useAuthStore.setState({ user: null })
  vi.unstubAllEnvs()
})

const spawnButton = () => container.querySelector('[data-testid="sltera-instant-spawn"]')
const bounds = { minX: -4.2, maxX: 4.2, minZ: -12.4, maxZ: 7.2 }

describe('Sltera instant spawn — owner cheat', () => {
  it('title cheat item switches the mode on and off', () => {
    act(() => root.render(<SlteraInstantSpawnToggle style={{}} />))
    const toggle = container.querySelector('[data-testid="sltera-instant-toggle"]')
    expect(toggle.textContent).toBe('슬테라 즉시 출현: 꺼짐')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    act(() => toggle.click())
    expect(isSlteraInstantSpawnEnabled()).toBe(true)
    expect(toggle.textContent).toBe('슬테라 즉시 출현: 켜짐')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    act(() => toggle.click())
    expect(isSlteraInstantSpawnEnabled()).toBe(false)
  })

  it('in-run button shows only with the mode on, a Sltera run mounted, and the run playing', () => {
    act(() => root.render(<SlteraInstantSpawnButton phase="playing" />))
    expect(spawnButton()).toBeNull() // 모드 꺼짐(일반 플레이어 기본값)
    act(() => setSlteraInstantSpawnEnabled(true))
    expect(spawnButton()).toBeNull() // S1~S5 런(SlteraEvent)이 없음
    act(() => { unregister = registerSlteraInstantSpawnTarget(() => true) })
    expect(spawnButton()).not.toBeNull()
    expect(spawnButton().textContent).toBe('슬테라')
    act(() => root.render(<SlteraInstantSpawnButton phase="paused" />))
    expect(spawnButton()).toBeNull() // 일시정지·레벨업·결과 화면에서는 숨김
    act(() => root.render(<SlteraInstantSpawnButton phase="playing" />))
    act(() => { unregister(); unregister = null })
    expect(hasSlteraInstantSpawnTarget()).toBe(false)
    expect(spawnButton()).toBeNull() // 판이 끝나 SlteraEvent가 내려가면 사라진다
  })

  it('a tap starts a pass on the next frame; taps during a pass are ignored', () => {
    // SlteraEvent와 같은 배선: 수신기 = requestSlteraInstantPassOn(run), 프레임 = consumeSlteraPassStart → begin.
    const run = createSlteraRunState()
    unregister = registerSlteraInstantSpawnTarget(() => requestSlteraInstantPassOn(run))
    setSlteraInstantSpawnEnabled(true)
    act(() => root.render(<SlteraInstantSpawnButton phase="playing" />))
    act(() => spawnButton().click())
    expect(run.instantRequested).toBe(true)
    expect(consumeSlteraPassStart(run, 'stage1', 1, 3_000)).toBe(true) // 자연 첫 질주(15~25초) 훨씬 전
    beginSlteraPass(run.pass, { bounds, playerX: 0, playerZ: 0 })
    expect(run.pass.phase).toBe(SLTERA_PHASE.DRIVE)
    act(() => spawnButton().click())
    expect(run.instantRequested).toBe(false) // 질주 중 탭은 무시
    expect(requestSlteraInstantPass()).toBe(false)
  })

  it('sits in the top-left HUD column under the score, clear of the joystick thumb zone', () => {
    // 2026-11-08 모바일 검수: top 42%는 가로 화면(220px 세로 프레임)에서 조이스틱 링과 겹쳤다.
    setSlteraInstantSpawnEnabled(true)
    unregister = registerSlteraInstantSpawnTarget(() => true)
    act(() => root.render(<SlteraInstantSpawnButton phase="playing" />))
    const style = spawnButton().style
    expect(style.top).toMatch(/96px/) // 점수 칸(안전 위 +50~+85px) 바로 아래
    expect(style.top).not.toContain('%')
    expect(style.bottom).toBe('')
    expect(Number(style.zIndex)).toBeLessThan(10) // HUD 루트(10)·조이스틱(100) 아래 — 경고·팝업이 위에 그려진다
    expect(Number.parseInt(style.minWidth, 10)).toBeGreaterThanOrEqual(44)
    expect(Number.parseInt(style.height, 10)).toBeGreaterThanOrEqual(44) // 터치 타깃 44px 유지
  })

  it('normal players never see it: the only switch sits inside the DEV-only title cheat menu', () => {
    const title = readFileSync(new NodeURL('./TitleScreen.jsx', import.meta.url), 'utf8')
    expect(title).toContain('const DEV_CHEATS_ENABLED = import.meta.env.DEV')
    expect(title).toContain('const cheatMenuButtonVisible = DEV_CHEATS_ENABLED && devCheatsVisible && adminOperations.cheatMenuButtonVisible')
    const modalStart = title.indexOf('{cheatOpen && cheatMenuButtonVisible && (')
    const toggleAt = title.indexOf('<SlteraInstantSpawnToggle style={styles.cheatButton} />')
    expect(modalStart).toBeGreaterThan(0)
    expect(toggleAt).toBeGreaterThan(modalStart)
    expect(toggleAt).toBeLessThan(title.indexOf('{consentOpen && consentUser && ('))
    expect(title.match(/<SlteraInstantSpawnToggle/g)).toHaveLength(1)
    const gameplay = readFileSync(new NodeURL('./GameplayScreen.jsx', import.meta.url), 'utf8')
    expect(gameplay).toContain('{isActive && <SlteraInstantSpawnButton phase={phase} />}')
    // 모드 스위치는 이 토글 하나뿐이다(HUD·로비 등 다른 곳에서 켜지 않는다).
    const ui = readFileSync(new NodeURL('./SlteraInstantSpawn.jsx', import.meta.url), 'utf8')
    expect(ui.match(/setSlteraInstantSpawnEnabled\(/g)).toHaveLength(1)
    const hud = readFileSync(new NodeURL('./HUD.jsx', import.meta.url), 'utf8')
    expect(hud).not.toMatch(/Sltera|sltera/)
  })
})

// 라이브(배포 빌드) 범위: 프로젝트 마스터만 토글·버튼을 본다. 게스트·일반 계정·사칭 계정은 못 본다.
const MASTER = { uid: 'm', email: 'zard5388@gmail.com', emailVerified: true, providerIds: ['google.com'] }
const NORMAL = { uid: 'n', email: 'player@example.com', emailVerified: true, providerIds: ['google.com'] }
const GUEST = { uid: 'g', isAnonymous: true, email: null, providerIds: [] }
const UNVERIFIED_MASTER = { ...MASTER, emailVerified: false }

describe('Sltera instant spawn on the live site — project master only', () => {
  it('gate: master yes, guest/normal/unverified no on production; anyone in DEV', () => {
    expect(canUseSlteraInstantSpawn(MASTER, false)).toBe(true)
    expect(canUseSlteraInstantSpawn(null, false)).toBe(false)
    expect(canUseSlteraInstantSpawn(GUEST, false)).toBe(false)
    expect(canUseSlteraInstantSpawn(NORMAL, false)).toBe(false)
    expect(canUseSlteraInstantSpawn(UNVERIFIED_MASTER, false)).toBe(false)
    expect(canUseSlteraInstantSpawn(null, true)).toBe(true)
  })

  it('title toggle (no cheat code) shows only to the master', () => {
    for (const [user, visible] of [[MASTER, true], [null, false], [GUEST, false], [NORMAL, false], [UNVERIFIED_MASTER, false]]) {
      act(() => useAuthStore.setState({ user }))
      act(() => root.render(<SlteraMasterTitleToggle />))
      expect(!!container.querySelector('[data-testid="sltera-master-toggle"]')).toBe(visible)
      expect(!!container.querySelector('[data-testid="sltera-instant-toggle"]')).toBe(visible)
    }
    act(() => useAuthStore.setState({ user: MASTER }))
    act(() => root.render(<SlteraMasterTitleToggle />))
    act(() => container.querySelector('[data-testid="sltera-instant-toggle"]').click())
    expect(isSlteraInstantSpawnEnabled()).toBe(true)
  })

  it('in-run button on a production build: master yes, guest no, normal user no (even with the mode on)', () => {
    vi.stubEnv('DEV', false)
    setSlteraInstantSpawnEnabled(true)
    unregister = registerSlteraInstantSpawnTarget(() => true)
    for (const [user, visible] of [[MASTER, true], [null, false], [GUEST, false], [NORMAL, false]]) {
      act(() => useAuthStore.setState({ user }))
      act(() => root.render(<SlteraInstantSpawnButton phase="playing" />))
      expect(!!spawnButton()).toBe(visible)
    }
  })

  it('TitleScreen: master toggle is one line, other cheats stay DEV-only', () => {
    const title = readFileSync(new NodeURL('./TitleScreen.jsx', import.meta.url), 'utf8')
    expect(title).toContain('const DEV_CHEATS_ENABLED = import.meta.env.DEV')
    expect(title.split('<SlteraMasterTitleToggle />').length - 1).toBe(1)
  })
})
