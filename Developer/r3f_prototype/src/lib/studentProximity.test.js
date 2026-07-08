import { describe, expect, it } from 'vitest'
import {
  STUDENT_DIALOGUE_RADIUS,
  getUnconsciousStudents,
  findStudentInRange,
} from './studentProximity.js'

const students = [
  { id: 'a', position: [0, 0, 0] },
  { id: 'b', position: [5, 0, 5] },
  { id: 'c', position: [0, 0, 2] },
]

describe('findStudentInRange', () => {
  it('반경 안의 학생 id를 반환한다', () => {
    expect(findStudentInRange(0.5, 0.5, students, new Set())).toBe('a')
  })

  it('반경 밖이면 null을 반환한다', () => {
    expect(findStudentInRange(3, 0, students, new Set())).toBeNull()
  })

  it('z축 거리는 position[2]를 사용한다', () => {
    // player (0,0,2): a=[0,0,0] 거리 2 (밖), c=[0,0,2] 거리 0 (안) → c
    expect(findStudentInRange(0, 2, students, new Set())).toBe('c')
  })

  it('반경 안에 여러 명이면 배열 순서상 첫 학생을 반환한다', () => {
    // player (0,0,1): a 거리 1, c 거리 1 — 둘 다 반경 안, 배열 앞선 a 반환
    expect(findStudentInRange(0, 1, students, new Set())).toBe('a')
  })

  it('이미 말 건 학생(talkedIds)은 건너뛴다 — 런당 1회', () => {
    const talked = new Set(['a'])
    // a는 제외되고, 반경 안에 다른 학생 없으면 null
    expect(findStudentInRange(0.3, 0.3, students, talked)).toBeNull()
  })

  it('반경 경계값 처리: 정확히 반경이면 포함(<=)', () => {
    const one = [{ id: 'x', position: [STUDENT_DIALOGUE_RADIUS, 0, 0] }]
    expect(findStudentInRange(0, 0, one, new Set())).toBe('x')
    const justOut = [{ id: 'y', position: [STUDENT_DIALOGUE_RADIUS + 0.001, 0, 0] }]
    expect(findStudentInRange(0, 0, justOut, new Set())).toBeNull()
  })
})

describe('getUnconsciousStudents', () => {
  it('스테이지 배치에서 쓰러진 학생만 { id, position }로 뽑는다', () => {
    const result = getUnconsciousStudents('stage1')
    expect(result.length).toBeGreaterThan(0)
    for (const s of result) {
      expect(typeof s.id).toBe('string')
      expect(Array.isArray(s.position)).toBe(true)
      expect(s.position).toHaveLength(3)
    }
  })

  it('없는 스테이지는 빈 배열', () => {
    expect(getUnconsciousStudents('nope')).toEqual([])
  })
})
