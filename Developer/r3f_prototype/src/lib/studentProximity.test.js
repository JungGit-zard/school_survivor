import { beforeEach, describe, expect, it } from 'vitest'
import {
  STUDENT_DIALOGUE_RADIUS,
  OBJECT_CONTACT_MARGIN,
  PLAYER_INVESTIGATION_HALF_EXTENT,
  getUnconsciousStudents,
  getInvestigationTargets,
  findInvestigationTargetInRange,
  findStudentInRange,
} from './studentProximity.js'
import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'
import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'
import { saveStagePropPlacements } from './stagePropPlacements.js'
import { commitFirebaseStudioRuntime } from './studioRuntimeState.js'
import { getPlayerMovementBounds } from './playerMovementBounds.js'
import { getDialogueText, getPoolIds } from '../dialogues/dialogueStore.js'

const students = [
  { id: 'a', position: [0, 0, 0] },
  { id: 'b', position: [5, 0, 5] },
  { id: 'c', position: [0, 0, 2] },
]

function targetLine(target) {
  return getDialogueText(target.dialogueId, 'ko')
}

// target.dialogueId는 pickDialogueId가 풀에서 매번 무작위로 뽑은 한 줄이다. 그 한 줄만 재면
// 같은 코드가 실행마다 합격/불합격이 갈린다(실제로 이 파일이 그렇게 깜빡였다).
// 대사 품질은 뽑힌 한 줄이 아니라 풀 전체가 만족해야 하는 성질이므로 풀 단위로 검사한다.
function poolIdOf(target) {
  return target.dialogueId.replace(/\.\d+$/, '')
}

function poolLines(target) {
  return getPoolIds(poolIdOf(target), 'ko').map((id) => getDialogueText(id, 'ko'))
}

function stagePoolLines(stageId) {
  const pools = new Set(getInvestigationTargets(stageId).map(poolIdOf))
  return [...pools].flatMap((poolId) => getPoolIds(poolId, 'ko').map((id) => getDialogueText(id, 'ko')))
}

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

describe('전 스테이지 공용 조사 대상', () => {
  it('네 스테이지의 실제 배치를 빠짐없이 조사 대상으로 포함한다', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const placements = getStageObjectPlacements(stageId)
      const targets = getInvestigationTargets(stageId)

      expect(targets.map(({ id }) => id)).toEqual(placements.map(({ id }) => id))
    }
  })

  it('모든 조사 대상에 이름·충분한 1인칭 조사문·대상별 접촉 정보를 제공한다', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      for (const target of getInvestigationTargets(stageId)) {
        expect(target.subjectName.length).toBeGreaterThan(0)
        expect(target.dialogueId.length).toBeGreaterThan(0)
        expect(targetLine(target).length).toBeGreaterThan(0)
        // i18n 이관 후 한 줄짜리 짧은 대사가 대량 들어왔다(최단 12자). 무작위 한 줄에 20자를
        // 요구하면 깜빡이므로, 풀 전체가 넘는 하한으로 낮추는 대신 전 줄을 검사한다.
        const lines = poolLines(target)
        expect(lines.length).toBeGreaterThan(0)
        for (const line of lines) {
          expect(line.length, `${poolIdOf(target)} 짧은 대사`).toBeGreaterThan(10)
        }
        if (target.subjectType === 'student') {
          expect(target.radius).toBe(STUDENT_DIALOGUE_RADIUS)
        } else {
          expect(target.halfX).toBeGreaterThan(0)
          expect(target.halfZ).toBeGreaterThan(0)
        }
      }
    }
  })

  it('스테이지별 조사문은 교실·복도·체육관·급식실의 분위기를 담는다', () => {
    // 뽑힌 한 줄이 아니라 그 스테이지가 쓰는 대사 풀 전체를 본다. 무작위 픽 기준으로 재면
    // 분위기 단어가 안 뽑힌 실행에서만 터지는 깜빡임 테스트가 된다.
    expect(stagePoolLines('stage1').join(' ')).toMatch(/책상|의자|교복|선생님/)
    expect(stagePoolLines('stage2').join(' ')).toMatch(/사물함|복도|청소|시간표/)
    expect(stagePoolLines('stage3').join(' ')).toMatch(/농구|체육|골대|체육관/)
    expect(stagePoolLines('stage4').join(' ')).toMatch(/급식|조리|주방|쟁반/)
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

  it('게시판 조사는 회전된 게시판에 플레이어 콜라이더가 실제로 닿을 때만 가능하다', () => {
    saveStagePropPlacements({
      stage2: [{
        id: 'stage2-lost-found-board-left-south',
        type: 'corridorLostFoundBoard',
        position: [-6.92, 0, 13.4],
        rotation: [0, Math.PI / 4, 0],
      }],
    })
    const board = getInvestigationTargets('stage2')[0]
    // Player.jsx의 CuboidCollider args는 [0.136, 0.32, 0.136]이다.
    // 축정렬 플레이어가 45° 게시판에 닿을 때 법선 방향 투영 반폭은 0.136 * √2다.
    const physicalContactMargin = PLAYER_INVESTIGATION_HALF_EXTENT * Math.SQRT2
    expect(board.contactMargin).toBeCloseTo(physicalContactMargin)
    expect(board.rotationY).toBeCloseTo(Math.PI / 4)
    expect(board.halfX).toBeCloseTo(0.67)
    expect(board.halfZ).toBeCloseTo(0.09)

    const toWorld = (localX, localZ) => {
      const cos = Math.cos(board.rotationY)
      const sin = Math.sin(board.rotationY)
      return [
        board.position[0] + localX * cos + localZ * sin,
        board.position[2] - localX * sin + localZ * cos,
      ]
    }
    const touchingFront = toWorld(0, board.halfZ + board.contactMargin)
    const beforeTouchingFront = toWorld(0, board.halfZ + board.contactMargin + 0.001)
    const emptyAabbCorner = toWorld(board.halfX + board.contactMargin + 0.01, 0)
    const reachableBoardCorner = toWorld(board.halfX, board.halfZ)
    const stage2MovementBounds = getPlayerMovementBounds('stage2')

    expect(findInvestigationTargetInRange(touchingFront[0], touchingFront[1], [board], new Set())).toBe(board)
    expect(findInvestigationTargetInRange(beforeTouchingFront[0], beforeTouchingFront[1], [board], new Set())).toBeNull()
    expect(findInvestigationTargetInRange(emptyAabbCorner[0], emptyAabbCorner[1], [board], new Set())).toBeNull()
    expect(findInvestigationTargetInRange(
      stage2MovementBounds.minX,
      reachableBoardCorner[1],
      [board],
      new Set(),
    )).toBe(board)
  })

  it('makes every valid non-student Firebase override investigable on every stage', () => {
    const props = STAGE_PROP_PALETTE
      .filter(({ type }) => !['unconsciousStudent', 'classPresidentStudent'].includes(type))
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
      expect(target.dialogueId.length).toBeGreaterThan(0)
      expect(targetLine(target).length).toBeGreaterThan(15)
      expect(target.halfX).toBeGreaterThan(0)
      expect(target.halfZ).toBeGreaterThan(0)
    }

    expect(targets.some(({ id }) => id === 'override-classroomChair')).toBe(true)
    expect(targets.some(({ id }) => id === 'override-basketballHoop')).toBe(true)
    expect(targets.some(({ id }) => id === 'override-kitchenPrepTable')).toBe(true)
    expect(targets.some(({ id }) => id === 'override-kitchenClutter')).toBe(true)
    expect(getInvestigationTargets('stage1').map(({ id }) => id)).toEqual(
      getStageObjectPlacements('stage1').map(({ id }) => id),
    )
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

  it('includes the dedicated class-president model as a fallen student', () => {
    const classPresident = getUnconsciousStudents('stage1').find(({ id }) => id === 'stage1-student-south-01')

    // 좌표는 스튜디오 저장이 정본이라 리터럴로 박아두면 배치를 옮길 때마다 썩는다
    // (커밋 875ebfe 스튜디오 저장에서 [-3.7,0,17.2] → [-5.796,0,-0.031]로 이동했다).
    // 검증 의도는 "반장 전용 모델도 쓰러진 학생 목록에 들어간다"이므로 배치에서 좌표를 가져온다.
    const placement = getStageObjectPlacements('stage1').find(({ id }) => id === 'stage1-student-south-01')
    expect(placement.type).toBe('classPresidentStudent')
    expect(classPresident).toEqual({ id: 'stage1-student-south-01', position: placement.position })
  })
})
