// @vitest-environment jsdom
// 2026-11-08 로비 화면부하: 카드 프리뷰가 세로 스와이프를 막지 않고, 입장 버튼 무한 펄스는 추천 카드 하나만 돈다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Lobby from './Lobby.jsx'
import { STAGE_CONFIGS } from '../lib/stageConfig.js'
import { setLocale, t } from '../lib/i18n.js'
import { _seedHydratedFirebaseProgressForTests, updateFirebasePlayerProgress } from '../lib/firebaseProgress.js'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'

vi.mock('./LobbyBgm.jsx', () => ({ default: () => null }))
vi.mock('./WeaponModal.jsx', () => ({ default: () => null }))
vi.mock('./LobbySettingsModal.jsx', () => ({ default: () => null }))
vi.mock('../lib/sfxRegistry.js', () => ({ playSfx: vi.fn() }))
vi.mock('./gameCanvasLoader.js', () => ({ preloadGameCanvasChunk: vi.fn(() => Promise.resolve()) }))
vi.mock('../lib/stageEntryPreload.js', () => ({ preloadStageEntryAssets: vi.fn() }))
vi.mock('../lib/firebaseRanking.js', () => ({ getActiveSeason: () => ({ active: false }), fetchMyStageBests: async () => ({}) }))
vi.mock('./StageLock.jsx', () => ({ StageLockPreview: ({ style }) => <div data-testid="locked-preview" style={style} /> }))
vi.mock('./StageBossPreview.jsx', () => ({ default: ({ bossType, style }) => <div data-testid="boss-preview" data-boss-type={bossType} style={style} /> }))

let container, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  setLocale('ko')
  _seedHydratedFirebaseProgressForTests({ uid: 'lobby-perf-test' })
  commitFirebaseStudioRuntime({ tunings: {}, sfxTunings: {}, stageBossPreview: {}, decals: {}, propPlacements: {} }, { revision: 0 })
  useAuthStore.setState({ user: { uid: 'lobby-perf-test', displayName: 'Perf Test' }, progressStatus: 'ready' })
  useGameStore.setState({ goldTotal: 0 })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const render = () => act(() => root.render(<Lobby />))
const card = (id) => [...container.querySelectorAll('section')].find((el) => el.getAttribute('aria-label')?.startsWith(STAGE_CONFIGS[id].label + ' '))
const entry = (el) => [...el.querySelectorAll('button')].find((b) => b.textContent !== t('lobby.scoreRecord'))
const pulsing = () => [...container.querySelectorAll('section')].filter((el) => entry(el)?.style.animation.includes('lobbyCtaPulse'))
function unlockThrough(n) {
  const records = {}
  for (let i = 1; i < n; i++) records[`stage${i}BossDefeats`] = 1
  act(() => updateFirebasePlayerProgress((p) => ({ ...p, records: { ...p.records, ...records } })))
  act(() => useAuthStore.setState({ progressStatus: 'loading' }))
  act(() => useAuthStore.setState({ progressStatus: 'ready' }))
}

describe('lobby scroll/load', () => {
  it('lets vertical swipes over every card preview (boss and lock) reach the stage list', () => {
    render()
    unlockThrough(3)
    const previews = container.querySelectorAll('[data-testid="boss-preview"], [data-testid="locked-preview"]')
    expect(previews.length).toBe(container.querySelectorAll('section').length)
    expect(card('stage1').querySelector('[data-testid="boss-preview"]').dataset.bossType).toBe('B01')
    for (const el of previews) {
      expect(el.style.pointerEvents).toBe('none')
      expect(el.style.touchAction).toBe('pan-y')
    }
  })

  it('pulses only the recommended (furthest unlocked) entry button', () => {
    render()
    expect(pulsing().map((el) => el.getAttribute('aria-label'))).toEqual([card('stage1').getAttribute('aria-label')])
    unlockThrough(3)
    expect(entry(card('stage1')).disabled).toBe(false)
    expect(entry(card('stage2')).disabled).toBe(false)
    expect(pulsing()).toEqual([card('stage3')])
  })
})
