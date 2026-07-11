import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore, STAGE1_INTRO_LINES } from './useGameStore.js'

describe('스테이지1 스토리 인트로 상태 (useGameStore)', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
  })

  it('startStage1Intro는 게임을 멈추고 첫 대사를 띄운다', () => {
    useGameStore.getState().startStage1Intro()
    const s = useGameStore.getState()
    expect(s.phase).toBe('paused')
    expect(s.pauseSource).toBe('intro')
    expect(s.introDialogue).toEqual({ index: 0 })
  })

  it('advanceIntro는 3줄을 순서대로 진행하고 마지막 탭에 플레이를 시작한다', () => {
    useGameStore.getState().startStage1Intro()
    expect(STAGE1_INTRO_LINES).toHaveLength(3)

    // 1번째 → 2번째
    useGameStore.getState().advanceIntro()
    expect(useGameStore.getState().introDialogue).toEqual({ index: 1 })

    // 2번째 → 3번째
    useGameStore.getState().advanceIntro()
    expect(useGameStore.getState().introDialogue).toEqual({ index: 2 })

    // 3번째에서 탭 → 대화창 닫히고 게임 시작
    useGameStore.getState().advanceIntro()
    const s = useGameStore.getState()
    expect(s.introDialogue).toBeNull()
    expect(s.phase).toBe('playing')
    expect(s.pauseSource).toBeNull()
  })

  it('advanceIntro는 introDialogue가 없으면 아무 것도 바꾸지 않는다', () => {
    // 인트로가 시작되지 않은 기본(playing) 상태
    useGameStore.getState().advanceIntro()
    const s = useGameStore.getState()
    expect(s.introDialogue).toBeNull()
    expect(s.phase).toBe('playing')
  })

  it('resetGame은 introDialogue를 초기화한다', () => {
    useGameStore.getState().startStage1Intro()
    useGameStore.getState().resetGame()
    const s = useGameStore.getState()
    expect(s.introDialogue).toBeNull()
    expect(s.phase).toBe('playing')
    expect(s.pauseSource).toBeNull()
  })
})
