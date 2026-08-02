import { describe, expect, it } from 'vitest'
import {
  QUEST_DEFINITIONS,
  createStageQuestProgress,
  getQuestDefinition,
  getStageQuestDefinitions,
} from './quests.js'

describe('stage quest definitions', () => {
  it('exposes the eight planned quests as two independent quests per stage', () => {
    expect(QUEST_DEFINITIONS.map(({ id }) => id)).toEqual([
      'stage1-talk-book',
      'stage1-attendance',
      'stage2-bandage',
      'stage2-broadcast-key',
      'stage3-whistle',
      'stage3-scoreboard-fuse',
      'stage4-allergy-list',
      'stage4-gas-valve',
    ])
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      expect(getStageQuestDefinitions(stageId)).toHaveLength(2)
    }
    expect(getQuestDefinition('missing-quest')).toBeNull()
    expect(createStageQuestProgress('stage2')).toEqual({
      'stage2-bandage': { status: 'undiscovered', itemHeld: false },
      'stage2-broadcast-key': { status: 'undiscovered', itemHeld: false },
    })
  })

  it('keeps the planned start and completion dialogue with item and target metadata', () => {
    const expectedLines = {
      'stage1-talk-book': [
        "난 말을 잘 못하거든… '말빨기술책'이 있다면!!!",
        '좋아… 이제 말할 수 있어. 다들 내 말 듣고 침착하게 나가자!',
      ],
      'stage1-attendance': [
        '누가 교실을 빠져나갔는지 알아야 해… 비상 출석부가 앞쪽 책상에 있을 거야.',
        '확인했어. 복도로 나간 애들이 있어. 우리도 뒤따라가자.',
      ],
      'stage2-bandage': [
        '304번 사물함에 압박붕대가 있어. 비밀번호는 0304… 보안은 원래부터 포기했어.',
        '됐다. 이제 혼자서도 움직일 수 있어. 고마워.',
      ],
      'stage2-broadcast-key': [
        '비상 방송을 해야 해. 방송실 마스터키를 분실물 게시판 뒤에 붙여 뒀어.',
        '좋아. 복도 끝까지 대피 방송을 내보낼게. 넌 계속 가!',
      ],
      'stage3-whistle': [
        '애들이 패닉이야… 내 호루라기만 있으면 한쪽으로 모이게 할 수 있어.',
        '좋아, 내가 애들을 정리할게. 체육관 출구는 네가 열어 줘!',
      ],
      'stage3-scoreboard-fuse': [
        '북쪽 전광판을 켜면 비상구 방향을 띄울 수 있어. 예비 퓨즈가 공 보관 카트에 있어.',
        '전광판이 켜지고 비상구 방향 화살표가 나타났다.',
      ],
      'stage4-allergy-list': [
        '남은 음식을 나눠 주고 싶은데, 알레르기 있는 애들 명단이 없어. 동쪽 조리대에 있을 거야.',
        '이제 안전하게 나눠 줄 수 있어. 한 명도 더 아프게 하지 않을게.',
      ],
      'stage4-gas-valve': [
        '쿡라인 가스가 새! 빨간 밸브 손잡이가 싱크대 쪽으로 굴러갔어.',
        '밸브를 잠갔다. 쿡라인의 불꽃과 가스 소리가 잦아든다.',
      ],
    }

    for (const quest of QUEST_DEFINITIONS) {
      expect([quest.startLine, quest.completionLine]).toEqual(expectedLines[quest.id])
      expect(quest.item).toMatchObject({ id: expect.any(String), name: expect.any(String), description: expect.any(String), visualKind: expect.any(String) })
      expect(quest.giver.placementId).toBeTruthy()
      expect(quest.itemTarget.type).toBeTruthy()
      expect(['return', 'install']).toContain(quest.completion.kind)
      expect(quest.rewardGold).toBe(2)
    }
  })

  it('places the Stage 1 speech book on the designated middle desk as a red book', () => {
    const talkBook = getQuestDefinition('stage1-talk-book')

    expect(talkBook.item.visualKind).toBe('red-book')
    expect(talkBook.itemTarget).toMatchObject({
      placementId: 'stage1-desk-mid-02',
      surface: { localPosition: [0.54, 0.89, 0.24] },
    })
  })
})
