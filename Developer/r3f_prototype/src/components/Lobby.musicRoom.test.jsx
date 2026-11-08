// @vitest-environment jsdom
// 2026-11-08 Terry: "메뉴 버튼안에 '음악실'을 만들고 누르면 좀비학교에 사용된 노래들을 가지런히 정렬해 들을 수 있게 하라"
// + ≡ 메뉴 항목 순서 음악실 → 홈페이지 → 문의하기(링크는 타이틀과 같은 /landing, 같은 탭).
// 재생 자체(MusicRoomBgm)와 곡 목록(musicRoom.js)은 soundmini 소관이라 계약대로 목으로 대신한다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Lobby from './Lobby.jsx'
import MusicRoomModal from './MusicRoomModal.jsx'
import { setLocale } from '../lib/i18n.js'

vi.mock('../lib/musicRoom.js', () => ({
  MUSIC_ROOM_TRACKS: Object.freeze([
    Object.freeze({ id: 'opening', url: 'opening.m4a' }),
    Object.freeze({ id: 'lobby', url: 'lobby.mp3' }),
    Object.freeze({ id: 'stageOdd', url: 'stage-odd.mp3' }),
    Object.freeze({ id: 'stageEven', url: 'stage-even.mp3' }),
  ]),
  getTrackStageNumbers: (trackId, stageIds) => {
    const numbers = stageIds.map((id) => Number(id.replace('stage', '')))
    if (trackId === 'stageOdd') return numbers.filter((n) => n % 2 === 1)
    if (trackId === 'stageEven') return numbers.filter((n) => n % 2 === 0)
    return []
  },
}))
// 계약: trackId가 있으면 그 곡 반복 재생, null/언마운트면 로비 음악. 화면에서 현재 값을 읽을 수 있게 표식만 남긴다.
vi.mock('./MusicRoomBgm.jsx', () => ({
  default: ({ trackId }) => <span data-testid="music-room-bgm" data-track-id={trackId ?? 'none'} hidden />,
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
vi.mock('../lib/guestRankingIdentity.js', () => ({ getGuestRankingNickname: () => 'Guest', getRankingUser: vi.fn(async () => ({ uid: 'guest' })) }))
vi.mock('../lib/firebaseRanking.js', () => ({ getActiveSeason: () => ({ active: false }), fetchMyStageBests: async () => ({}) }))
vi.mock('../store/useAuthStore.js', () => ({ useAuthStore: (selector) => selector({ user: null, progressStatus: 'idle' }) }))
vi.mock('../store/useGameStore.js', () => ({ useGameStore: (selector) => selector({ goldTotal: 0, newlyUnlockedWeaponIds: [], acknowledgeNewWeaponUnlocks: () => {} }) }))

const STAGES_1_TO_4 = ['stage1', 'stage2', 'stage3', 'stage4']

let root
let host
const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT

async function render(element) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(element))
}

afterEach(() => {
  if (root) act(() => root.unmount())
  host?.remove()
  root = null
  setLocale('ko')
  vi.useRealTimers()
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct
})

const $ = (selector) => host.querySelector(selector)
const menuButton = () => $('[data-testid="lobby-menu-button"]')
const menuPanel = () => $('[data-testid="lobby-menu-panel"]')
const dialog = () => $('[data-testid="music-room-modal"]')
const trackRows = () => [...host.querySelectorAll('[data-testid^="music-room-track-"]')]
const trackRow = (id) => $(`[data-testid="music-room-track-${id}"]`)
const bgmTrack = () => $('[data-testid="music-room-bgm"]')?.getAttribute('data-track-id') ?? null
const click = async (element) => { await act(async () => element.click()) }
const pressKey = async (key) => { await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))) }

describe('Lobby ≡ menu', () => {
  it('lists 음악실, 홈페이지, 문의하기 in that order with the title-screen landing links', async () => {
    await render(<Lobby />)
    await click(menuButton())

    const items = [...menuPanel().querySelectorAll('[role="menuitem"]')]
    expect(items.map((item) => item.textContent.trim())).toEqual(['음악실', '홈페이지', '문의하기'])
    expect(items.map((item) => item.tagName)).toEqual(['BUTTON', 'A', 'A'])
    expect(items[1].getAttribute('href')).toBe('/landing?lang=ko')
    expect(items[2].getAttribute('href')).toBe('/landing?lang=ko#inquiry')
    // 같은 탭 이동(타이틀과 동일). 새 창으로 열지 않는다.
    expect(items.some((item) => item.hasAttribute('target'))).toBe(false)
    for (const item of items) expect(Number.parseFloat(item.style.minHeight)).toBeGreaterThanOrEqual(44)
    expect(menuPanel().textContent).not.toContain('준비 중')
  })

  it('labels the items and the landing links in the game language', async () => {
    for (const [locale, labels] of [
      ['en', ['Music Room', 'Homepage', 'Contact us']],
      ['ja', ['音楽室', 'ホームページ', 'お問い合わせ']],
    ]) {
      setLocale(locale)
      await render(<Lobby />)
      await click(menuButton())
      const items = [...menuPanel().querySelectorAll('[role="menuitem"]')]
      expect(items.map((item) => item.textContent.trim())).toEqual(labels)
      expect(items[1].getAttribute('href')).toBe(`/landing?lang=${locale}`)
      expect(items[2].getAttribute('href')).toBe(`/landing?lang=${locale}#inquiry`)
      act(() => root.unmount())
      host.remove()
      root = null
    }
  })

  it('opens the music room from 음악실, closes the menu, and closing returns to the lobby music', async () => {
    await render(<Lobby />)
    await click(menuButton())
    await click($('[data-testid="lobby-menu-music-room"]'))

    expect(menuPanel()).toBeNull()
    expect(menuButton().getAttribute('aria-expanded')).toBe('false')
    expect(dialog()).not.toBeNull()
    expect(dialog().getAttribute('role')).toBe('dialog')
    expect($('#music-room-heading').textContent).toBe('음악실')
    expect(bgmTrack()).toBe('none')

    await click(trackRow('stageEven'))
    expect(bgmTrack()).toBe('stageEven')

    await click($('[data-testid="music-room-close"]'))
    expect(dialog()).toBeNull()
    // MusicRoomBgm이 언마운트되면 로비 음악으로 돌아간다(계약).
    expect(bgmTrack()).toBeNull()
    expect(document.activeElement).toBe(menuButton())
  })

  it('keeps the menu Escape close and does not open the room during a stage showtime', async () => {
    vi.useFakeTimers()
    const onStartStage = vi.fn()
    await render(<Lobby onStartStage={onStartStage} />)
    await click(menuButton())
    await pressKey('Escape')
    expect(menuPanel()).toBeNull()

    await click(menuButton())
    const enter = [...host.querySelectorAll('button')].find((button) => button.textContent === '입장하기' && !button.disabled)
    await click(enter) // 스테이지 1 쇼타임 시작(타이머를 진행하지 않으므로 런은 시작되지 않는다)
    await click($('[data-testid="lobby-menu-music-room"]'))
    expect(menuPanel()).toBeNull()
    expect(dialog()).toBeNull()

    await click(menuButton())
    expect(menuPanel()).toBeNull()
    expect(onStartStage).not.toHaveBeenCalled()
  })
})

describe('Music room modal', () => {
  it('shows the 4 songs in game order, numbered 01–04, with where each one plays', async () => {
    await render(<MusicRoomModal stageIds={STAGES_1_TO_4} onClose={() => {}} />)

    expect($('#music-room-heading').textContent).toBe('음악실')
    expect(trackRows().map((row) => row.getAttribute('data-testid'))).toEqual([
      'music-room-track-opening',
      'music-room-track-lobby',
      'music-room-track-stageOdd',
      'music-room-track-stageEven',
    ])
    const rowText = (row) => [...row.querySelectorAll('span')].filter((span) => span.children.length === 0).map((span) => span.textContent)
    expect(rowText(trackRow('opening'))).toEqual(expect.arrayContaining(['01', '오프닝 테마', '타이틀 화면']))
    expect(rowText(trackRow('lobby'))).toEqual(expect.arrayContaining(['02', '로비 테마', '로비']))
    expect(rowText(trackRow('stageOdd'))).toEqual(expect.arrayContaining(['03', '스테이지 테마 1', '스테이지 1 · 3']))
    expect(rowText(trackRow('stageEven'))).toEqual(expect.arrayContaining(['04', '스테이지 테마 2', '스테이지 2 · 4']))
    for (const row of trackRows()) expect(Number.parseFloat(row.style.minHeight)).toBeGreaterThanOrEqual(44)
    expect(Number.parseFloat($('[data-testid="music-room-close"]').style.height)).toBeGreaterThanOrEqual(44)
  })

  it('builds the stage labels from the lobby stage list, in every language', async () => {
    await render(<MusicRoomModal stageIds={[...STAGES_1_TO_4, 'stage5', 'stage6']} onClose={() => {}} />)
    expect(trackRow('stageOdd').textContent).toContain('스테이지 1 · 3 · 5')
    expect(trackRow('stageEven').textContent).toContain('스테이지 2 · 4 · 6')

    await act(async () => setLocale('en'))
    expect(trackRow('opening').textContent).toContain('Opening Theme')
    expect(trackRow('opening').textContent).toContain('Title screen')
    expect(trackRow('stageOdd').textContent).toContain('Stages 1 · 3 · 5')

    await act(async () => setLocale('ja'))
    expect(trackRow('lobby').textContent).toContain('ロビーテーマ')
    expect(trackRow('stageEven').textContent).toContain('ステージ 2 · 4 · 6')
  })

  it('marks the audible lobby song as playing until a row is tapped, then plays and marks the tapped row', async () => {
    await render(<MusicRoomModal stageIds={STAGES_1_TO_4} onClose={() => {}} />)
    const pressed = () => trackRows().filter((row) => row.getAttribute('aria-pressed') === 'true').map((row) => row.getAttribute('data-testid'))
    const nowPlayingRow = () => $('[data-testid="music-room-now-playing"]')?.closest('button')?.getAttribute('data-testid')

    expect(pressed()).toEqual(['music-room-track-lobby'])
    expect(nowPlayingRow()).toBe('music-room-track-lobby')
    expect(bgmTrack()).toBe('none') // 아무것도 고르기 전에는 로비 음악 그대로

    await click(trackRow('stageOdd'))
    expect(bgmTrack()).toBe('stageOdd')
    expect(pressed()).toEqual(['music-room-track-stageOdd'])
    // 색만이 아니라 아이콘 + 글자로 표시한다.
    const marker = $('[data-testid="music-room-now-playing"]')
    expect(nowPlayingRow()).toBe('music-room-track-stageOdd')
    expect(marker.textContent).toBe('재생 중')
    expect(marker.querySelector('svg')).not.toBeNull()
    expect(host.querySelectorAll('[data-testid="music-room-now-playing"]')).toHaveLength(1)

    await click(trackRow('opening'))
    expect(bgmTrack()).toBe('opening')
    expect(pressed()).toEqual(['music-room-track-opening'])
  })

  it('has no pause or stop control', async () => {
    await render(<MusicRoomModal stageIds={STAGES_1_TO_4} onClose={() => {}} />)
    const labels = [...dialog().querySelectorAll('button')].map((button) => `${button.textContent} ${button.getAttribute('aria-label') ?? ''}`)
    expect(labels.filter((label) => /정지|멈춤|일시|pause|stop/i.test(label))).toEqual([])
  })

  it('closes on the close button, Escape, and a backdrop tap', async () => {
    const onClose = vi.fn()
    await render(<MusicRoomModal stageIds={STAGES_1_TO_4} onClose={onClose} />)
    // 열리면 포커스가 모달 안(닫기 버튼)으로 들어온다.
    expect(document.activeElement).toBe($('[data-testid="music-room-close"]'))

    await click($('[data-testid="music-room-close"]'))
    expect(onClose).toHaveBeenCalledTimes(1)
    await pressKey('Escape')
    expect(onClose).toHaveBeenCalledTimes(2)
    await click($('[data-testid="music-room-backdrop"]'))
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})
