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

// Stage 6 인트로 대사는 quests.txt에 있지만, useGameStore STAGE_INTRO_IDS.stage6 배선이 들어오는 순간 자동으로 여기 합류한다.
const INTRO_STAGES = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', ...(STAGE_INTRO_IDS.stage6 ? ['stage6'] : [])]

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
  it.each(INTRO_STAGES)('%s shows its own lines and the last tap starts play', (stageId) => {
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
    const firsts = [...INTRO_STAGES, 'stage6'].map((id) => getDialogueText(`intro.${id}.001`))
    expect(new Set(firsts).size).toBe(new Set([...INTRO_STAGES, 'stage6']).size)
  })

  // stage6은 인트로 대사가 생겼고 배선(STAGE_INTRO_IDS.stage6)만 남았으므로, 미배선 초안 대표는 stage7로 본다.
  it('draft stages (7-10) have no intro and startStageIntro is a no-op', () => {
    const before = useGameStore.getState().phase
    act(() => useGameStore.getState().startStageIntro('stage7'))
    expect(useGameStore.getState().introDialogue).toBeNull()
    expect(useGameStore.getState().phase).toBe(before)
  })

  // spec56 B §10-2: 교무실 개편 인트로 3줄 (옛 체육교사 재대결 문구 교체).
  it('stage5 intro reads the staff-room rewrite in ko/en/ja', () => {
    const expected = {
      ko: ['급식실을 나오니 중앙 현관이다. 현관 옆 교무실에… 선생님 좀비들이 전부 모여 있다.', '교감 선생님 좀비가 결재 도장을 들었다. 책상 사이 길을 잘 골라야 해.', '현관만 뚫으면 운동장이야. 여기서 끝낼 수는 없어!'],
      en: ['Past the cafeteria is the main entrance. And in the staff room next to it… every teacher zombie is gathered.', 'The Vice Principal Zombie raises an approval stamp. I have to pick my path between the desks.', "Break through the entrance and it's the schoolyard. I can't stop here!"],
      ja: ['給食室を出ると中央玄関だ。玄関の隣の職員室に…先生ゾンビが全員集まっている。', '教頭先生ゾンビが決裁印を構えた。机の間の道をうまく選ばないと。', '玄関さえ抜ければ運動場だ。ここで終わるわけにはいかない！'],
    }
    for (const [locale, lines] of Object.entries(expected)) {
      expect(STAGE_INTRO_IDS.stage5.map((id) => getDialogueText(id, locale)), locale).toEqual(lines)
    }
  })

  // spec56 C-10-1: Stage 6 인트로 3줄과 1부 엔딩 3줄은 세 로케일 모두 실제 번역으로 존재한다(한국어 폴백 금지).
  it('stage6 intro and part-1 ending lines exist in ko/en/ja', () => {
    const ids = ['intro.stage6.001', 'intro.stage6.002', 'intro.stage6.003', 'ending.part1.001', 'ending.part1.002', 'ending.part1.003']
    expect(getDialogueText('intro.stage6.001', 'ko')).toBe('현관문을 밀고 나오자 햇빛이 쏟아졌다. 드디어 밖… 아니, 운동장이다.')
    expect(getDialogueText('ending.part1.003', 'en')).toBe("Escape from Zombie School: Part 1 complete. But school isn't over yet!")
    for (const id of ids) {
      expect(getDialogueText(id, 'ko'), id).toMatch(/[가-힣]/)
      for (const locale of ['en', 'ja']) expect(getDialogueText(id, locale), `${locale}/${id}`).not.toMatch(/[가-힣]/)
    }
  })
})
