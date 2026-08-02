import { describe, expect, it } from 'vitest'
import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'
import { getInvestigationDialogue } from './investigationDialogue.js'

describe('getInvestigationDialogue', () => {
  it('모든 배치 팔레트 타입에 짧고 코믹한 소녀체 1인칭 조사문을 제공한다', () => {
    let literalFlusterCount = 0

    for (const { type } of STAGE_PROP_PALETTE) {
      const dialogue = getInvestigationDialogue('stage2', type, `test-${type}`)

      expect(dialogue?.subjectName.length).toBeGreaterThan(0)
      expect(dialogue?.line.length).toBeGreaterThan(10)
      expect([...dialogue.line].length).toBeLessThanOrEqual(50)
      expect(dialogue?.line).toMatch(/나|내|내가|나도|나보다/)
      expect(dialogue?.line).toMatch(/했어|같아|같네|이야|이네|였어|됐어|됐네|돼|줄게|봤어|겠어|뻔했어|잖아|구나|봐|있어|해|해줘|할게|었어|졌어|켰어/)
      expect(dialogue?.line).not.toMatch(/했다|하였다|했다\.|했다,|했다 /)
      expect(dialogue?.line).toMatch(/같아|처럼|같네|너무|괜히|공포|무서|조심|살짝|작게|왜|아니|미안|줄|먼저|혼자|최고|회의|수행|장난|윙크|합창|오케스트라|메뉴|국|급식|김밥|양말|요원/)

      if (dialogue.line.includes('당황')) literalFlusterCount += 1
    }

    expect(literalFlusterCount).toBeLessThanOrEqual(2)
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

  it('쓰러진 학생 조사문도 짧은 소녀체 코믹 독백으로 제공한다', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const dialogue = getInvestigationDialogue(stageId, 'unconsciousStudent', `${stageId}-student`)

      expect(dialogue).toMatchObject({ subjectType: 'student', subjectName: '좀비가 된 학생' })
      expect([...dialogue.line].length).toBeLessThanOrEqual(50)
      expect(dialogue.line).toMatch(/나|내|나도|좀비|공포|무서|마음|친구|공범|수저|쟁반|숙제|시간표|호루라기/)
      expect(dialogue.line).toMatch(/했어|같아|이야|이네|돼|겠어|줬어|따라오네|처음이야|모르겠어/)
      expect(dialogue.line).not.toMatch(/했다|하였다/)
    }
  })
})
