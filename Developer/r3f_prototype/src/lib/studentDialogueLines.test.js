import { describe, expect, it } from 'vitest'
import { STUDENT_DIALOGUE_LINES, pickStudentLine } from './studentDialogueLines.js'

describe('studentDialogueLines', () => {
  it('대사 풀은 비어있지 않고 모두 문자열이다', () => {
    expect(STUDENT_DIALOGUE_LINES.length).toBeGreaterThan(0)
    for (const line of STUDENT_DIALOGUE_LINES) {
      expect(typeof line).toBe('string')
      expect(line.length).toBeGreaterThan(0)
    }
  })

  it('seed된 random으로 결정적으로 선택한다', () => {
    expect(pickStudentLine(() => 0)).toBe(STUDENT_DIALOGUE_LINES[0])
    expect(pickStudentLine(() => 0.999999)).toBe(STUDENT_DIALOGUE_LINES[STUDENT_DIALOGUE_LINES.length - 1])
    const mid = Math.floor(0.5 * STUDENT_DIALOGUE_LINES.length)
    expect(pickStudentLine(() => 0.5)).toBe(STUDENT_DIALOGUE_LINES[mid])
  })

  it('기본 random(Math.random)으로도 항상 풀 내의 값을 반환한다', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(STUDENT_DIALOGUE_LINES).toContain(pickStudentLine())
    }
  })
})
