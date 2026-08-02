import { describe, expect, it } from 'vitest'
import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'
import { getInvestigationDialogue } from './investigationDialogue.js'

describe('getInvestigationDialogue', () => {
  it('모든 배치 팔레트 타입에 이름과 17세 여학생 주인공의 순수하고 가녀린 1인칭 조사문을 제공한다', () => {
    for (const { type } of STAGE_PROP_PALETTE) {
      const dialogue = getInvestigationDialogue('stage2', type, `test-${type}`)

      expect(dialogue?.subjectName.length).toBeGreaterThan(0)
      expect(dialogue?.line.length).toBeGreaterThan(20)
      expect(dialogue?.line).toMatch(/나|내|나는|내가/)
      expect(dialogue?.line).toMatch(/조심|살짝|작게|마음|무서|떨|빌|고마|미안|괜찮|숨|천천히/)
    }
  })

  it('같은 배치에는 다시 조사해도 같은 문장을 선택한다', () => {
    expect(getInvestigationDialogue('stage3', 'basketballHoop', 'stage3-hoop-north-normal'))
      .toEqual(getInvestigationDialogue('stage3', 'basketballHoop', 'stage3-hoop-north-normal'))
  })

  it('기존 조사 보상 규칙용 대상 타입을 보존한다', () => {
    expect(getInvestigationDialogue('stage2', 'corridorLockerBank', 'locker')?.subjectType).toBe('locker')
    expect(getInvestigationDialogue('stage2', 'corridorJanitorCart', 'cart')?.subjectType).toBe('janitorCart')
    expect(getInvestigationDialogue('stage2', 'corridorLostFoundBoard', 'board')?.subjectType).toBe('bulletinBoard')
    expect(getInvestigationDialogue('stage1', 'classroomDesk', 'desk')?.subjectType).toBe('desk')
    expect(getInvestigationDialogue('stage3', 'basketballHoop', 'hoop')?.subjectType).toBe('basketballHoop')
  })

  it('쓰러진 학생 조사문도 스테이지별 1인칭 독백으로 제공한다', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const dialogue = getInvestigationDialogue(stageId, 'unconsciousStudent', `${stageId}-student`)

      expect(dialogue).toMatchObject({ subjectType: 'student', subjectName: '좀비가 된 학생' })
      expect(dialogue.line).toMatch(/나|내/)
    }
  })
})
