export const QUEST_DEFINITIONS = Object.freeze([
  {
    id: 'stage1-talk-book',
    stageId: 'stage1',
    title: '말문을 책으로 배운다',
    startDialogueId: 'quest.stage1-talk-book.start',
    objective: '교실 반대편에서 말빨기술책을 찾아 학생에게 돌려주자.',
    item: {
      id: 'talk-book',
      name: '말빨기술책',
      description: '표지부터 말이 많은 붉은색 기술책.',
      visualKind: 'red-book',
    },
    // 교실에 누워 있는 반장은 둘이다. stage1-student-south-01은 비상 출석부 담당이라
    // 나머지 반장(스튜디오 배치)이 말빨기술책을 준다 — 반장 둘 다 퀘스트를 갖게 한다.
    giver: { placementId: 'user-classPresidentStudent-msl7serx-1', name: '말이 막힌 학생' },
    itemTarget: {
      placementId: 'stage1-desk-mid-02',
      type: 'classroomDesk',
      // The book sits near the desk's reachable front edge. This is in desk
      // local space so Studio placement yaw and scale keep it on the tabletop.
      surface: { localPosition: [0.54, 0.89, 0.24] },
    },
    completion: { kind: 'return', placementId: 'user-classPresidentStudent-msl7serx-1', name: '말이 막힌 학생' },
    completionDialogueId: 'quest.stage1-talk-book.completion',
    rewardGold: 2,
  },
  {
    id: 'stage1-attendance',
    stageId: 'stage1',
    title: '반장의 마지막 출석 확인',
    startDialogueId: 'quest.stage1-attendance.start',
    objective: '교실 북서쪽 책상에서 비상 출석부를 찾아 반장에게 돌려주자.',
    item: {
      id: 'emergency-attendance',
      name: '비상 출석부',
      description: '몇몇 이름에 급한 동그라미가 쳐진 출석부.',
      visualKind: 'attendance-sheet',
    },
    giver: { placementId: 'stage1-student-south-01', name: '반장' },
    itemTarget: { placementId: 'stage1-desk-nw-01', type: 'classroomDesk' },
    completion: { kind: 'return', placementId: 'stage1-student-south-01', name: '반장' },
    completionDialogueId: 'quest.stage1-attendance.completion',
    rewardGold: 2,
  },
  {
    id: 'stage2-bandage',
    stageId: 'stage2',
    title: '304번 사물함의 압박붕대',
    startDialogueId: 'quest.stage2-bandage.start',
    objective: '복도 사물함에서 압박붕대를 찾아 다친 학생에게 돌려주자.',
    item: {
      id: 'pressure-bandage',
      name: '압박붕대',
      description: "'체육대회용'이라고 적힌 하얀 붕대 롤.",
      visualKind: 'bandage',
    },
    giver: { placementId: 'stage2-student-east-north', name: '다친 학생' },
    itemTarget: { type: 'corridorLockerBank', fallbackTypes: ['corridorJanitorCart'] },
    completion: { kind: 'return', placementId: 'stage2-student-east-north', name: '다친 학생' },
    completionDialogueId: 'quest.stage2-bandage.completion',
    rewardGold: 2,
  },
  {
    id: 'stage2-broadcast-key',
    stageId: 'stage2',
    title: '분실물 게시판 뒤의 마스터키',
    startDialogueId: 'quest.stage2-broadcast-key.start',
    objective: '복도 남쪽 분실물 게시판에서 방송실 마스터키를 찾자.',
    item: {
      id: 'broadcast-master-key',
      name: '방송실 마스터키',
      description: "'방송실·절대 분실 금지'라고 적힌 은색 열쇠.",
      visualKind: 'key',
    },
    giver: { placementId: 'stage2-student-west-mid', name: '방송부 학생' },
    itemTarget: { type: 'corridorLostFoundBoard', fallbackTypes: ['corridorJanitorCart'] },
    completion: { kind: 'return', placementId: 'stage2-student-west-mid', name: '방송부 학생' },
    completionDialogueId: 'quest.stage2-broadcast-key.completion',
    rewardGold: 2,
  },
  {
    id: 'stage3-whistle',
    stageId: 'stage3',
    title: '주장의 호루라기',
    startDialogueId: 'quest.stage3-whistle.start',
    objective: '북동쪽에 흩어진 농구공 사이에서 주장의 호루라기를 찾자.',
    item: {
      id: 'captains-whistle',
      name: '주장의 호루라기',
      description: '빨간 끈이 달린 작은 호루라기.',
      visualKind: 'whistle',
    },
    giver: { placementId: 'stage3-student-captain-west', name: '농구부 주장' },
    itemTarget: { placementId: 'stage3-balls-ne-scattered', type: 'basketballCluster' },
    completion: { kind: 'return', placementId: 'stage3-student-captain-west', name: '농구부 주장' },
    completionDialogueId: 'quest.stage3-whistle.completion',
    rewardGold: 2,
  },
  {
    id: 'stage3-scoreboard-fuse',
    stageId: 'stage3',
    title: '꺼진 비상 전광판',
    startDialogueId: 'quest.stage3-scoreboard-fuse.start',
    objective: '공 보관 카트에서 예비 퓨즈를 찾아 북쪽 전광판에 설치하자.',
    item: {
      id: 'scoreboard-spare-fuse',
      name: '전광판 예비 퓨즈',
      description: "'점수판용'이라고 굵게 적힌 노란 퓨즈.",
      visualKind: 'fuse',
    },
    giver: { placementId: 'stage3-student-facilities-east', name: '체육부 시설 담당 학생' },
    itemTarget: { placementId: 'stage3-ball-cart-nw', type: 'basketballBallCart' },
    completion: { kind: 'install', placementId: 'stage3-scoreboard-north-wall', name: '북쪽 전광판' },
    completionDialogueId: 'quest.stage3-scoreboard-fuse.completion',
    rewardGold: 2,
  },
  {
    id: 'stage4-allergy-list',
    stageId: 'stage4',
    title: '급식 알레르기 확인',
    startDialogueId: 'quest.stage4-allergy-list.start',
    objective: '동쪽 조리대에서 급식 알레르기 명단을 찾아 당번 학생에게 돌려주자.',
    item: {
      id: 'allergy-list',
      name: '급식 알레르기 명단',
      description: '얼룩졌지만 이름은 읽을 수 있는 코팅 명단.',
      visualKind: 'list',
    },
    giver: { placementId: 'stage4-student-serving-south', name: '급식 당번 학생' },
    itemTarget: {
      placementId: 'stage4-preptable-east-side-counter',
      type: 'kitchenPrepTable',
      fallbackTypes: ['kitchenPrepTable'],
    },
    completion: { kind: 'return', placementId: 'stage4-student-serving-south', name: '급식 당번 학생' },
    completionDialogueId: 'quest.stage4-allergy-list.completion',
    rewardGold: 2,
  },
  {
    id: 'stage4-gas-valve',
    stageId: 'stage4',
    title: '멈추지 않는 가스 밸브',
    startDialogueId: 'quest.stage4-gas-valve.start',
    objective: '싱크대 근처에서 밸브 손잡이를 찾아 북쪽 쿡라인에 설치하자.',
    item: {
      id: 'gas-valve-handle',
      name: '가스 밸브 손잡이',
      description: '기름투성이인 십자 모양의 빨간 금속 손잡이.',
      visualKind: 'valve',
    },
    giver: { placementId: 'stage4-student-kitchen-northeast', name: '조리부 학생' },
    itemTarget: { placementId: 'stage4-sink-north-east', type: 'kitchenSinkCounter', fallbackTypes: ['kitchenClutter'] },
    completion: { kind: 'install', placementId: 'stage4-cookline-north-center', name: '북쪽 쿡라인' },
    completionDialogueId: 'quest.stage4-gas-valve.completion',
    rewardGold: 2,
  },
])

const QUESTS_BY_ID = new Map(QUEST_DEFINITIONS.map((quest) => [quest.id, quest]))

export function getQuestDefinition(questId) {
  return QUESTS_BY_ID.get(questId) ?? null
}

export function getStageQuestDefinitions(stageId) {
  return QUEST_DEFINITIONS.filter((quest) => quest.stageId === stageId)
}

export function createStageQuestProgress(stageId) {
  return Object.fromEntries(getStageQuestDefinitions(stageId).map(({ id }) => [id, {
    status: 'undiscovered',
    itemHeld: false,
  }]))
}
