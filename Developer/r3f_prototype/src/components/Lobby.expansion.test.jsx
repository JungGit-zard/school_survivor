// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Lobby from './Lobby.jsx'
import { STAGE_CONFIGS } from '../lib/stageConfig.js'
import { setLocale, t } from '../lib/i18n.js'
import ko from '../lib/locales/ko.js'
import en from '../lib/locales/en.js'
import ja from '../lib/locales/ja.js'
import { _resetFirebaseProgressForTests, _seedHydratedFirebaseProgressForTests, updateFirebasePlayerProgress } from '../lib/firebaseProgress.js'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { useGameStore } from '../store/useGameStore.js'

vi.mock('./LobbyBgm.jsx', () => ({ default: () => null }))
vi.mock('./WeaponModal.jsx', () => ({ default: () => null }))
vi.mock('./LobbySettingsModal.jsx', () => ({ default: () => null }))
vi.mock('../lib/sfxRegistry.js', () => ({ playSfx: vi.fn() }))
vi.mock('./gameCanvasLoader.js', () => ({ preloadGameCanvasChunk: vi.fn(() => Promise.resolve()) }))
vi.mock('../lib/stageEntryPreload.js', () => ({ preloadStageEntryAssets: vi.fn() }))
vi.mock('../lib/firebaseRanking.js', () => ({ getActiveSeason: () => ({ active: false }) }))
vi.mock('./StageLock.jsx', () => ({ StageLockPreview: ({ style }) => <div data-testid="locked-preview" style={style} /> }))
vi.mock('./StageBossPreview.jsx', () => ({ default: ({ bossType, style }) => <div data-testid="boss-preview" data-boss-type={bossType} style={style} /> }))

const ids = ['stage6', 'stage7', 'stage8', 'stage9', 'stage10']
const bosses = ['B05', 'B06', 'B07', 'B08', 'B09']
let container, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  setLocale('ko')
  _seedHydratedFirebaseProgressForTests({ uid: 'expansion-ui-test' })
  commitFirebaseStudioRuntime({ tunings: {}, sfxTunings: {}, stageBossPreview: {}, decals: {}, propPlacements: {} }, { revision: 0 })
  useAuthStore.setState({ user: { uid: 'expansion-ui-test', displayName: 'UI Test' }, progressStatus: 'ready' })
  useGameStore.setState({ goldTotal: 0 })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  setLocale('ko')
})
function render(props = {}) { act(() => root.render(<Lobby {...props} />)) }
function card(id) { return [...container.querySelectorAll('section')].find(el => el.getAttribute('aria-label')?.startsWith(STAGE_CONFIGS[id].label + ' ')) }
function entry(el) { return [...el.querySelectorAll('button')].find(b => b.textContent !== t('lobby.scoreRecord')) }
function click(el) { act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true }))) }

describe('expansion lobby UI', () => {
  it.each([['ko', ko], ['en', en], ['ja', ja]])('has complete new-stage copy in %s without Korean fallback', (locale, dict) => {
    for (const id of ids) {
      for (const field of ['title', 'description', 'boss']) expect(dict[`stage.${id}.${field}`]).toEqual(expect.any(String))
      expect(dict[`lobby.unlock.${id}`]).toEqual(expect.any(String))
    }
    setLocale(locale)
    render()
    for (const id of ids) {
      expect(card(id).textContent).toContain(dict[`stage.${id}.title`])
      const desc = card(id).querySelector(`#${id}-description`)
      expect(desc?.textContent).toBe(dict[`stage.${id}.description`])
      expect(card(id).getAttribute('aria-describedby')).toBe(`${id}-description`)
      expect(entry(card(id)).textContent).toBe(dict[`lobby.unlock.${id}`])
    }
  })

  it('keeps all ten cards in a bounded keyboard-accessible scroll region without card compression', () => {
    render()
    const list = container.querySelector('[aria-label="스테이지 선택"]') ?? card('stage10').parentElement
    expect(list.querySelectorAll('section')).toHaveLength(10)
    expect(list.style.overflowY).toBe('auto')
    expect(parseFloat(list.style.minHeight)).toBe(0)
    expect(list.tabIndex).toBe(0)
    for (const el of list.querySelectorAll('section')) expect(el.style.flexShrink).toBe('0')
    expect(list.lastElementChild).toBe(card('stage10'))
    for (let n = 1; n <= 5; n++) expect(card(`stage${n}`).querySelector('[id$="-description"]')).toBeNull()
  })

  it.each(ids.map((id, i) => [id, i]))('%s stays locked until the previous stage is cleared; opens only its own stage after showtime', (id, i) => {
    vi.useFakeTimers()
    const onStartStage = vi.fn()
    render({ onStartStage })
    expect(entry(card(id)).disabled).toBe(true)
    expect(card(id).querySelector('[data-testid="locked-preview"]').style.pointerEvents).toBe('none')
    click(card(id))
    act(() => vi.advanceTimersByTime(1000))
    expect(onStartStage).not.toHaveBeenCalled()
    act(() => updateFirebasePlayerProgress(p => ({ ...p, records: { ...p.records, [`stage${i + 5}BossDefeats`]: 1 } })))
    // Existing Lobby refreshes records on progress readiness changes; preserve that contract.
    act(() => useAuthStore.setState({ progressStatus: 'loading' }))
    act(() => useAuthStore.setState({ progressStatus: 'ready' }))
    expect(entry(card(id)).disabled).toBe(false)
    expect(card(id).querySelector('[data-testid="boss-preview"]').style.pointerEvents).toBe('none')
    expect(card(id).querySelector('[data-boss-type]').dataset.bossType).toBe(bosses[i])
    click(entry(card(id)))
    expect(onStartStage).not.toHaveBeenCalled()
    expect(card(id).querySelector('[data-testid="stage-card-showtime"]').textContent).toBe(t(`stage.${id}.boss`))
    act(() => vi.advanceTimersByTime(1000))
    expect(onStartStage).toHaveBeenCalledExactlyOnceWith(id)
  })

  it('preserves progress readiness gating for new cards', () => {
    _resetFirebaseProgressForTests()
    useAuthStore.setState({ progressStatus: 'loading' })
    render()
    expect(container.querySelectorAll('section')).toHaveLength(10)
    expect(container.querySelector('[data-testid="lobby-records-pending"]')).not.toBeNull()
    for (const id of ids) {
      expect(card(id).querySelector('[data-testid="boss-preview"]')).toBeNull()
      expect(entry(card(id)).disabled).toBe(true)
    }
  })
})


it.each([2,3,4,5,6,7,8,9,10])('normal UI stage %i ignores clear-only history and dev unlock prop, then accepts only its previous boss', n => {
  act(() => updateFirebasePlayerProgress(p => {
    for(let i=1;i<=10;i++) {p.records[`stage${i}Clears`]=999;p.records[`stage${i}BossDefeats`]=0}
  }))
  render({devAllStagesUnlocked:true})
  for(let i=2;i<=10;i++) expect(entry(card(`stage${i}`)).disabled).toBe(true)
  expect(entry(card('stage1')).disabled).toBe(false)
  act(() => updateFirebasePlayerProgress(p => {p.records[`stage${n-1}BossDefeats`]=1}))
  act(() => useAuthStore.setState({progressStatus:'loading'}))
  act(() => useAuthStore.setState({progressStatus:'ready'}))
  for(let i=2;i<=10;i++) expect(entry(card(`stage${i}`)).disabled).toBe(i!==n)
})
