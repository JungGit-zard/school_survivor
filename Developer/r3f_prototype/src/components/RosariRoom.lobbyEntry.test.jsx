// @vitest-environment jsdom
// 2026-10-29 Terry 지시: 「로자리의 방」 진입점을 타이틀에서 로비(스테이지 선택) 상태바로 옮겼다. 2026-10-31 Terry 지시로 좌상단 → 우상단(메뉴 버튼 왼쪽).
// 이 파일은 그 진입점 계약을 못박는다 — 구 RosariRoom.titleEntry.test.jsx의 후속이다.
// (a) 로그인 상태 로비에 버튼 노출 / (b) 게스트 비노출 / (c) 클릭 시 onOpenRosariRoom 호출
// (d) 방에서 나가면 로비로 복귀(타이틀 아님) / (e) 타이틀에는 진입점이 남아 있지 않다
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Lobby from './Lobby.jsx'
import { fetchMyStageBests } from '../lib/firebaseRanking.js'

// Lobby.jsx는 import가 무겁다. 목 세트는 Lobby.myBest.test.jsx의 정본을 그대로 쓴다.
const state = vi.hoisted(() => ({
  auth: { user: null, progressStatus: 'idle' },
  game: { goldTotal: 0, newlyUnlockedWeaponIds: [], acknowledgeNewWeaponUnlocks: () => {}, rankingSubmission: null },
  records: {},
}))
vi.mock('./LobbyBgm.jsx', () => ({ default: () => null }))
vi.mock('./WeaponModal.jsx', () => ({ default: () => null }))
vi.mock('./LobbySettingsModal.jsx', () => ({ default: () => null }))
vi.mock('./StageBossPreview.jsx', () => ({ default: () => <div /> }))
vi.mock('./StageLock.jsx', () => ({ StageLockPreview: () => <div /> }))
vi.mock('./gameCanvasLoader.js', () => ({ preloadGameCanvasChunk: vi.fn(async () => {}) }))
vi.mock('../lib/stageEntryPreload.js', () => ({ preloadStageEntryAssets: vi.fn() }))
vi.mock('../lib/sfxRegistry.js', () => ({ playSfx: vi.fn() }))
vi.mock('../lib/graphicsStudioConfig.js', () => ({ loadStageBossPreview: () => ({}), STAGE_BOSS_PREVIEW_EVENT: 'preview-test' }))
vi.mock('../lib/guestRankingIdentity.js', () => ({
  getGuestRankingNickname: () => 'Guest',
  getRankingUser: vi.fn(async () => ({ uid: 'anon-guest', isAnonymous: true })),
}))
vi.mock('../lib/firebaseRanking.js', () => ({
  getActiveSeason: () => ({ active: false }),
  fetchMyStageBests: vi.fn(async () => ({})),
}))
vi.mock('../lib/firebaseProgress.js', async () => ({
  ...(await vi.importActual('../lib/firebaseProgress.js')),
  isFirebaseProgressHydrated: () => state.auth.progressStatus === 'ready',
}))
vi.mock('../lib/playerRecords.js', () => ({ load: () => ({ ...state.records }) }))
vi.mock('../store/useAuthStore.js', () => {
  const useAuthStore = (selector) => selector(state.auth)
  useAuthStore.getState = () => state.auth
  return { useAuthStore }
})
vi.mock('../store/useGameStore.js', async () => {
  const { useSyncExternalStore } = await vi.importActual('react')
  const listeners = new Set()
  const useGameStore = (selector) => useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    () => selector(state.game),
  )
  useGameStore.setState = (patch) => { state.game = { ...state.game, ...patch }; listeners.forEach((listener) => listener()) }
  return { useGameStore }
})

let root
let host
const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT

async function renderLobby(props = {}) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(<Lobby {...props} />))
  await act(async () => {})
}

const rosariButton = () => host.querySelector('[data-testid="lobby-rosari-room"]')

const readSource = (file) => readFileSync(resolve(process.cwd(), 'src/components', file), 'utf8')
// 주석에 남은 이력(「로자리의 방」은 로비로 옮겼다)은 진입점이 아니다. 실제 코드만 본다.
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

beforeEach(() => {
  state.auth = { user: null, progressStatus: 'idle' }
  state.game = { goldTotal: 0, newlyUnlockedWeaponIds: [], acknowledgeNewWeaponUnlocks: () => {}, rankingSubmission: null }
  state.records = {}
  vi.mocked(fetchMyStageBests).mockReset().mockResolvedValue({})
})

afterEach(() => {
  if (root) act(() => root.unmount())
  host?.remove()
  root = null
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct
})

describe('Rosari room lobby entry wiring', () => {
  it('shows the lobby entry button once signed in', async () => {
    state.auth = { user: { uid: 'google-user' }, progressStatus: 'ready' }
    await renderLobby({ onOpenRosariRoom: () => {} })
    const button = rosariButton()

    expect(button).not.toBeNull()
    expect(button.textContent).toBe('로자리의 방')
    expect(button.getAttribute('aria-label')).toBe('로자리의 방')
    // 우상단 묶음: 로자리 버튼 바로 다음이 메뉴 버튼(그 다음이 톱니)이다.
    expect(button.nextElementSibling.getAttribute('data-testid')).toBe('lobby-menu-button')
    // 모바일 터치 타깃 최소 44px(uimini 상주 규정).
    expect(Number.parseFloat(button.style.minHeight)).toBeGreaterThanOrEqual(44)
    expect(host.querySelector('[data-testid="lobby-rosari-room-hint"]')).toBeNull()
  })

  it('hides the lobby entry button from guests', async () => {
    await renderLobby({ onOpenRosariRoom: () => {} })

    expect(rosariButton()).toBeNull()
    const hint = host.querySelector('[data-testid="lobby-rosari-room-hint"]')
    expect(hint).not.toBeNull()
    expect(hint.tagName).toBe('SPAN')
    expect(hint.textContent).toContain('로그인')
    expect(hint.textContent).toContain('로자리의 방')
  })

  it('calls onOpenRosariRoom when the lobby entry button is pressed', async () => {
    const onOpenRosariRoom = vi.fn()
    state.auth = { user: { uid: 'google-user' }, progressStatus: 'ready' }
    await renderLobby({ onOpenRosariRoom })

    await act(async () => {
      rosariButton().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onOpenRosariRoom).toHaveBeenCalledTimes(1)
  })

  it('returns from the room to the lobby, never back to the title', () => {
    const readySource = readSource('ReadyGameApp.jsx')
    const start = readySource.indexOf("{screen === 'rosariRoom' && (")
    const end = readySource.indexOf("{screen === 'lobby' && (")

    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const roomBlock = readySource.slice(start, end)

    // 방 본체와 ErrorBoundary fallback 둘 다 로비로 되돌린다.
    expect(roomBlock).toContain("<RosariRoom onBack={() => setScreen('lobby')} />")
    expect(roomBlock).toContain("onBack={() => setScreen('lobby')}")
    expect(roomBlock.match(/setScreen\('lobby'\)/g)).toHaveLength(2)
    // 타이틀로 보내면 스테이지 선택으로 되돌아갈 길이 없어진다.
    expect(roomBlock).not.toContain("setScreen('title')")
    // 진입점은 로비가 소유한다.
    expect(readySource).toContain("onOpenRosariRoom={() => setScreen('rosariRoom')}")
    expect(readySource).toContain("const RosariRoom = lazy(() => import('./RosariRoom.jsx'))")
  })

  it('leaves no Rosari room entry point on the title screen', () => {
    const titleCode = stripComments(readSource('TitleScreen.jsx'))

    expect(titleCode).not.toContain('로자리의 방')
    expect(titleCode).not.toContain('onOpenRosariRoom')
    expect(titleCode).not.toContain('rosariRoomButton')
  })
})

describe('Lobby menu button', () => {
  it('sits right before the gear button and toggles an empty dropdown', async () => {
    await renderLobby()
    const button = host.querySelector('[data-testid="lobby-menu-button"]')
    const panel = () => host.querySelector('[data-testid="lobby-menu-panel"]')

    expect(button).not.toBeNull()
    expect(button.getAttribute('aria-label')).toBe('메뉴')
    expect(button.nextElementSibling.textContent.trim()).toBe('⚙')
    expect(Number.parseFloat(button.style.height)).toBeGreaterThanOrEqual(44)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(panel()).toBeNull()

    await act(async () => button.click())
    expect(panel()).not.toBeNull()
    expect(panel().getAttribute('role')).toBe('menu')
    expect(button.getAttribute('aria-expanded')).toBe('true')

    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(panel()).toBeNull()
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })
})
