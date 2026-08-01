import { beforeEach, describe, expect, it } from 'vitest'
import {
  STUDENT_DIALOGUE_RADIUS,
  OBJECT_CONTACT_MARGIN,
  getUnconsciousStudents,
  getInvestigationTargets,
  findInvestigationTargetInRange,
  findStudentInRange,
} from './studentProximity.js'
import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'
import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'
import { saveStagePropPlacements } from './stagePropPlacements.js'
import { commitFirebaseStudioRuntime } from './studioRuntimeState.js'

const students = [
  { id: 'a', position: [0, 0, 0] },
  { id: 'b', position: [5, 0, 5] },
  { id: 'c', position: [0, 0, 2] },
]

beforeEach(() => {
  commitFirebaseStudioRuntime({ propPlacements: {} }, { revision: 0 })
})

describe('findStudentInRange', () => {
  it('반경 안의 학생 id를 반환한다', () => {
    // (0.2,0.2)→a=[0,0,0] 거리 ~0.28 < 0.5 (학생 몸 위)
    expect(findStudentInRange(0.2, 0.2, students, new Set())).toBe('a')
  })

  it('반경 밖이면 null을 반환한다', () => {
    expect(findStudentInRange(3, 0, students, new Set())).toBeNull()
  })

  it('z축 거리는 position[2]를 사용한다', () => {
    // player (0,0,2): a=[0,0,0] 거리 2 (밖), c=[0,0,2] 거리 0 (안) → c
    expect(findStudentInRange(0, 2, students, new Set())).toBe('c')
  })

  it('반경 안에 여러 명이면 배열 순서상 첫 학생을 반환한다', () => {
    // 두 학생을 반경 안에 배치: player (0,0,0.2) 기준 a=0.2, d=0.1 모두 <0.5 → 앞선 a
    const near = [
      { id: 'a', position: [0, 0, 0] },
      { id: 'd', position: [0, 0, 0.3] },
    ]
    expect(findStudentInRange(0, 0.2, near, new Set())).toBe('a')
  })

  it('이미 말 건 학생(talkedIds)은 건너뛴다 — 런당 1회', () => {
    const talked = new Set(['a'])
    // a는 제외되고, 반경 안에 다른 학생 없으면 null
    expect(findStudentInRange(0.2, 0.2, students, talked)).toBeNull()
  })

  it('반경 경계값 처리: 정확히 반경이면 포함(<=)', () => {
    const one = [{ id: 'x', position: [STUDENT_DIALOGUE_RADIUS, 0, 0] }]
    expect(findStudentInRange(0, 0, one, new Set())).toBe('x')
    const justOut = [{ id: 'y', position: [STUDENT_DIALOGUE_RADIUS + 0.001, 0, 0] }]
    expect(findStudentInRange(0, 0, justOut, new Set())).toBeNull()
  })
})

describe('스테이지 2 공용 조사 대상', () => {
  it('학생과 스테이지 2의 모든 소품을 조사 대상으로 포함한다', () => {
    const targets = getInvestigationTargets('stage2')
    const propPlacements = getStageObjectPlacements('stage2')
      .filter(({ type }) => type !== 'unconsciousStudent')

    expect(targets.some(({ subjectType }) => subjectType === 'student')).toBe(true)
    expect(targets.some(({ subjectType }) => subjectType === 'locker')).toBe(true)
    expect(targets.some(({ subjectType }) => subjectType === 'bulletinBoard')).toBe(true)
    expect(targets.some(({ subjectType }) => subjectType === 'janitorCart')).toBe(true)
    expect(targets.some(({ subjectType }) => subjectType === 'desk')).toBe(true)
    expect(propPlacements.every(({ id }) => targets.some((target) => target.id === id))).toBe(true)
  })

  it('모든 스테이지 2 소품에 이름·재치 있는 조사문·접촉 판정 크기를 제공한다', () => {
    const propTargets = getInvestigationTargets('stage2')
      .filter(({ subjectType }) => subjectType !== 'student')

    for (const target of propTargets) {
      expect(target.subjectName.length).toBeGreaterThan(0)
      expect(target.line.length).toBeGreaterThan(15)
      expect(target.halfX).toBeGreaterThan(0)
      expect(target.halfZ).toBeGreaterThan(0)
    }
    expect(new Set(propTargets.map(({ line }) => line)).size).toBeGreaterThanOrEqual(8)
  })

  it('다른 스테이지에서는 사물함·불레틴보드를 추가하지 않는다', () => {
    expect(getInvestigationTargets('stage1').every(({ subjectType }) => subjectType === 'student')).toBe(true)
  })

  it('물체는 콜라이더 표면에 닿아야(접촉 margin 이내) 조사되고, 멀리서는 발동하지 않는다', () => {
    // 사물함 footprint half (0.67, 0.27). 표면까지 거리 ≤ OBJECT_CONTACT_MARGIN(0.25)에서만 발동.
    const target = { id: 'locker', position: [0, 0, 0], subjectType: 'locker', halfX: 0.67, halfZ: 0.27 }
    // 표면(x=0.67) 밖 0.93만큼 떨어짐 → 닿지 않음 → 발동 안 함 (이전 원형 1.65에선 잘못 발동하던 지점)
    expect(findInvestigationTargetInRange(1.6, 0, [target], new Set())).toBeNull()
    // 표면에서 0.18(< margin) → 접촉 판정 → 발동
    expect(findInvestigationTargetInRange(0.67 + OBJECT_CONTACT_MARGIN - 0.07, 0, [target], new Set())).toBe(target)
    // 이미 조사한 대상은 제외
    expect(findInvestigationTargetInRange(0.85, 0, [target], new Set(['locker']))).toBeNull()
  })

  it('stage2 물체 대상은 회전을 반영한 AABB half(halfX/halfZ)를 갖는다', () => {
    const locker = getInvestigationTargets('stage2').find(({ subjectType }) => subjectType === 'locker')
    expect(locker.halfX).toBeGreaterThan(0)
    expect(locker.halfZ).toBeGreaterThan(0)
    expect(locker.radius).toBeUndefined() // 더 이상 원형 반경 아님
  })
  it('makes every valid non-student Firebase override investigable only on Stage 2', () => {
    const props = STAGE_PROP_PALETTE
      .filter(({ type }) => type !== 'unconsciousStudent')
      .map(({ type }, index) => ({
        id: `override-${type}`,
        type,
        position: [index, 0, index],
        rotation: [0, index * 0.1, 0],
        scale: 1,
      }))
    saveStagePropPlacements({ stage1: props, stage2: props })

    const targets = getInvestigationTargets('stage2')
    expect(targets).toHaveLength(props.length)
    expect(targets.map(({ id }) => id)).toEqual(props.map(({ id }) => id))
    for (const target of targets) {
      expect(target.subjectName.length).toBeGreaterThan(0)
      expect(target.line.length).toBeGreaterThan(15)
      expect(target.halfX).toBeGreaterThan(0)
      expect(target.halfZ).toBeGreaterThan(0)
    }

    expect(targets.some(({ id }) => id === 'override-classroomChair')).toBe(true)
    expect(targets.some(({ id }) => id === 'override-basketballHoop')).toBe(true)
    expect(targets.some(({ id }) => id === 'override-kitchenPrepTable')).toBe(true)
    expect(targets.some(({ id }) => id === 'override-kitchenClutter')).toBe(true)
    expect(getInvestigationTargets('stage1')).toEqual([])
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
