// @vitest-environment jsdom
// Owner rule (2026-10-27): "음악은 npc와 대화중에도 절대 끊기면 안돼".
// Drives the real store, the real GameplayScreen -> Stage1Bgm mount and the real
// streamingBgm player. Fails if NPC dialogue, the story intro, the pause menu,
// quest inventory, level-up, results or a screen transition silences BGM.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./gameCanvasLoader.js', () => ({ loadGameCanvas: async () => ({ default: () => null }) }))
vi.mock('./HUD.jsx', () => ({ default: () => null }))
vi.mock('./VirtualJoystick.jsx', () => ({ default: () => null }))
vi.mock('../lib/criticalScreenShake.js', () => ({ subscribeWholeScreenCriticalShake: () => () => {} }))

import GameplayScreen from './GameplayScreen.jsx'
import LobbyBgm, { LOBBY_BGM_URL } from './LobbyBgm.jsx'
import { STAGE1_BGM_URL, STAGE2_BGM_URL } from './Stage1Bgm.jsx'
import { useGameStore } from '../store/useGameStore.js'
import { BRIDGE_MAX_MS, _streamingBgmPlayersForTests } from '../lib/streamingBgm.js'
import { installFakeAudio } from '../lib/fakeStreamingAudio.testUtil.js'

let fake, root, container, originalState

function show(screen) {
  act(() => root.render(screen === 'lobby' ? <LobbyBgm /> : <GameplayScreen isActive />))
}
const audioFor = (url) => fake.instances.find((a) => a.src === url)
const playingEvent = (audio) => act(() => { audio.dispatchEvent(new Event('playing')) })
const storeAct = (fn) => act(() => { fn(useGameStore.getState()) })

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  fake = installFakeAudio()
  originalState = useGameStore.getState()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  act(() => { vi.runAllTimers() })
  useGameStore.setState(originalState, true)
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('BGM never goes silent mid-session', () => {
  it('lobby music bridges into the stage track, which plays through the story intro', async () => {
    show('lobby')
    const lobby = audioFor(LOBBY_BGM_URL)
    expect(lobby.paused).toBe(false)

    fake.setDeferPlaying(true) // the stage stream is still buffering from the CDN
    storeAct((s) => { s.resetGame('stage1'); s.startStage1Intro() })
    expect(useGameStore.getState()).toMatchObject({ phase: 'paused', pauseSource: 'intro' })
    show('game')
    await act(async () => { vi.advanceTimersByTime(BRIDGE_MAX_MS - 1) })

    const stage = audioFor(STAGE1_BGM_URL)
    expect(stage.play).toHaveBeenCalled() // starts at entry, not on the first gameplay frame
    expect(lobby.pause).not.toHaveBeenCalled() // no silent gap while the stage stream loads

    playingEvent(stage)
    expect(lobby.paused).toBe(true) // handed off the moment the stage track sounds
    expect(_streamingBgmPlayersForTests().has(LOBBY_BGM_URL)).toBe(false)

    for (let i = 0; i < 20 && useGameStore.getState().introDialogue; i += 1) storeAct((s) => s.advanceIntro())
    expect(useGameStore.getState().phase).toBe('playing')
    expect(stage.pause).not.toHaveBeenCalled()
  })

  it('stage music keeps playing through NPC dialogue, quest inventory, pause menu, level-up and results', () => {
    storeAct((s) => s.resetGame('stage1'))
    act(() => { useGameStore.setState({ phase: 'playing', pauseSource: null }) })
    show('game')
    const stage = audioFor(STAGE1_BGM_URL)
    expect(stage.paused).toBe(false)

    storeAct((s) => s.openStudentDialogue('dialogue.test', null, { subjectName: 'npc' }))
    expect(useGameStore.getState()).toMatchObject({ phase: 'paused', pauseSource: 'dialogue' })
    act(() => { vi.advanceTimersByTime(5000) })
    storeAct((s) => s.closeStudentDialogue())

    storeAct((s) => s.toggleQuestInventory())
    expect(useGameStore.getState().pauseSource).toBe('quest')
    storeAct((s) => s.closeQuestInventory())

    storeAct((s) => s.togglePause())
    expect(useGameStore.getState()).toMatchObject({ phase: 'paused', pauseSource: 'manual' })
    storeAct((s) => s.togglePause())

    act(() => { useGameStore.setState({ phase: 'levelup' }) })
    act(() => { useGameStore.setState({ phase: 'gameover', pauseSource: null }) })
    act(() => { vi.advanceTimersByTime(BRIDGE_MAX_MS * 2) })

    expect(stage.pause).not.toHaveBeenCalled()
    expect(stage.paused).toBe(false)
    expect(fake.instances.filter((a) => a.src === STAGE1_BGM_URL)).toHaveLength(1)
  })

  it('stages 3+ get a stage track, so the lobby bridge never runs into its cap', () => {
    show('lobby')
    const lobby = audioFor(LOBBY_BGM_URL)
    storeAct((s) => s.resetGame('stage1'))
    act(() => { useGameStore.setState({ currentStageId: 'stage4', phase: 'playing' }) }) // unlock-independent
    expect(useGameStore.getState().currentStageId).toBe('stage4')
    show('game')
    act(() => { vi.advanceTimersByTime(BRIDGE_MAX_MS * 2) })
    const stage = fake.instances.at(-1)
    expect(stage.src).toBe(STAGE2_BGM_URL) // stage4 (even) -> zombie_2nd
    expect(stage.paused).toBe(false)
    expect(lobby.paused).toBe(true)
  })

  it('results -> lobby hands the stage track to the lobby track without a gap', () => {
    storeAct((s) => s.resetGame('stage1'))
    act(() => { useGameStore.setState({ phase: 'gameover', pauseSource: null }) })
    show('game')
    const stage = audioFor(STAGE1_BGM_URL)

    fake.setDeferPlaying(true)
    show('lobby')
    act(() => { vi.advanceTimersByTime(3000) })
    expect(stage.pause).not.toHaveBeenCalled()

    const lobby = audioFor(LOBBY_BGM_URL)
    playingEvent(lobby)
    expect(stage.paused).toBe(true)
    expect(lobby.paused).toBe(false)
  })
})
