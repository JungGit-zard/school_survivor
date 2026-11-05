// @vitest-environment jsdom
// Stage 1~5 스토리 인트로: 스테이지마다 자기 첫 대사를 띄우고, 마지막 탭에 플레이를 시작한다.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('./Enemy.jsx', () => ({ ENEMY_SIZE_MULTIPLIER: 1, ENEMY_STATS: {} }))
vi.mock('../lib/sfxEvents.js', () => ({ emitSfx: vi.fn() }))
vi.mock('../lib/dialogueVoice.js', () => ({ playDialogueVoice: () => () => {}, stopDialogueVoice: () => {} }))
vi.mock('./Weapons/Starlink.jsx', () => ({ dispatchStarlinkCheatCrash: () => {} }))
import HUD from './HUD.jsx'
import { useGameStore, STAGE_INTRO_IDS } from '../store/useGameStore.js'
import { getDialogueText } from '../dialogues/dialogueStore.js'

let root, container, initial
const line = () => container.querySelector('[role="dialog"] [aria-live="polite"]')?.textContent
const tap = () => act(() => { container.querySelector('[data-testid="stage-intro-catcher"]').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })) })

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  initial = useGameStore.getState()
  useGameStore.setState({ studentDialogue: null, questToast: null, introDialogue: null })
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  act(() => root.render(<HUD devCheatsVisible={false} />))
})
afterEach(() => {
  act(() => root.unmount()); container.remove()
  useGameStore.setState(initial, true)
})

describe('stage intro for Stages 1-5', () => {
  it.each(['stage1', 'stage2', 'stage3', 'stage4', 'stage5'])('%s shows its own lines and the last tap starts play', (stageId) => {
    const ids = STAGE_INTRO_IDS[stageId]
    expect(ids).toHaveLength(3)
    act(() => useGameStore.getState().startStageIntro(stageId))
    expect(line()).toBe(getDialogueText(`intro.${stageId}.001`))
    expect(container.querySelector('[data-testid="stage-intro-portrait"]')).not.toBeNull()
    tap(); expect(line()).toBe(getDialogueText(ids[1]))
    tap(); expect(line()).toBe(getDialogueText(ids[2]))
    tap()
    const s = useGameStore.getState()
    expect({ phase: s.phase, pauseSource: s.pauseSource, introDialogue: s.introDialogue })
      .toEqual({ phase: 'playing', pauseSource: null, introDialogue: null })
    expect(container.querySelector('[data-testid="stage-intro-catcher"]')).toBeNull()
  })

  it('stage lines are distinct per stage', () => {
    const firsts = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5'].map((id) => getDialogueText(`intro.${id}.001`))
    expect(new Set(firsts).size).toBe(5)
  })

  it('draft stages (6-10) have no intro and startStageIntro is a no-op', () => {
    const before = useGameStore.getState().phase
    act(() => useGameStore.getState().startStageIntro('stage6'))
    expect(useGameStore.getState().introDialogue).toBeNull()
    expect(useGameStore.getState().phase).toBe(before)
  })
})
