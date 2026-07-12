import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './useGameStore.js'

describe('쓰러진 학생 대화 상태 (useGameStore)', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame()
  })

  it('openStudentDialogue는 playing일 때 대화용으로 일시정지한다', () => {
    useGameStore.getState().openStudentDialogue('테스트 대사')
    const s = useGameStore.getState()
    expect(s.phase).toBe('paused')
    expect(s.pauseSource).toBe('dialogue')
    expect(s.studentDialogue).toEqual({ line: '테스트 대사', reward: null })
  })

  it('closeStudentDialogue는 대화 일시정지를 풀고 재개한다', () => {
    useGameStore.getState().openStudentDialogue('대사')
    useGameStore.getState().closeStudentDialogue()
    const s = useGameStore.getState()
    expect(s.phase).toBe('playing')
    expect(s.pauseSource).toBeNull()
    expect(s.studentDialogue).toBeNull()
  })

  it('playing이 아니면 대화를 열지 않는다 (일반 일시정지 중 트리거 방어)', () => {
    useGameStore.getState().pauseGame('manual')
    useGameStore.getState().openStudentDialogue('대사')
    const s = useGameStore.getState()
    // 일반 일시정지 상태가 그대로 유지되고 대화창은 안 뜬다
    expect(s.pauseSource).toBe('manual')
    expect(s.studentDialogue).toBeNull()
  })

  it('closeStudentDialogue는 일반 일시정지(manual)를 풀지 않는다', () => {
    useGameStore.getState().pauseGame('manual')
    useGameStore.getState().closeStudentDialogue()
    const s = useGameStore.getState()
    expect(s.phase).toBe('paused')
    expect(s.pauseSource).toBe('manual')
  })

  it('resetGame은 studentDialogue를 초기화한다', () => {
    useGameStore.getState().openStudentDialogue('대사')
    useGameStore.getState().resetGame()
    const s = useGameStore.getState()
    expect(s.studentDialogue).toBeNull()
    expect(s.phase).toBe('playing')
    expect(s.pauseSource).toBeNull()
  })

  it('awards a student-search gold reward exactly once when the dialogue closes', () => {
    const before = useGameStore.getState().goldTotal
    useGameStore.getState().openStudentDialogue('thanks', { type: 'gold', amount: 10 })
    useGameStore.getState().closeStudentDialogue()

    const s = useGameStore.getState()
    expect(s.goldTotal).toBe(before + 10)
    expect(s.goldSession).toBe(10)
    expect(s.phase).toBe('playing')
    useGameStore.getState().closeStudentDialogue()
    expect(useGameStore.getState().goldTotal).toBe(before + 10)
  })

  it('opens one upgrade choice after claiming a student-search upgrade reward', () => {
    const before = useGameStore.getState().pendingLevelUps
    useGameStore.getState().openStudentDialogue('try this', { type: 'upgrade' })
    useGameStore.getState().closeStudentDialogue()

    const s = useGameStore.getState()
    expect(s.phase).toBe('levelup')
    expect(s.pauseSource).toBeNull()
    expect(s.pendingLevelUps).toBe(before + 1)
  })
})
