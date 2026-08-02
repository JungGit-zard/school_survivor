export const QUEST_DEFINITIONS = Object.freeze([
  {
    id: 'stage1-talk-book',
    stageId: 'stage1',
    title: '말문을 책으로 배운다',
    startLine: "난 말을 잘 못하거든… '말빨기술책'이 있다면!!!",
    objective: '교실 반대편에서 말빨기술책을 찾아 학생에게 돌려주자.',
    item: {
      id: 'talk-book',
      name: '말빨기술책',
      description: '표지부터 말이 많은 붉은색 기술책.',
      visualKind: 'red-book',
    },
    giver: { placementId: 'stage1-student-west-01', name: '말이 막힌 학생' },
    itemTarget: {
      placementId: 'stage1-desk-mid-02',
      type: 'classroomDesk',
      // The book sits near the desk's reachable front edge. This is in desk
      // local space so Studio placement yaw and scale keep it on the tabletop.
      surface: { localPosition: [0.54, 0.89, 0.24] },
    },
    completion: { kind: 'return', placementId: 'stage1-student-west-01', name: '말이 막힌 학생' },
    completionLine: '좋아… 이제 말할 수 있어. 다들 내 말 듣고 침착하게 나가자!',
    rewardGold: 2,
  },
  {
    id: 'stage1-attendance',
    stageId: 'stage1',
    title: '반장의 마지막 출석 확인',
    startLine: '누가 교실을 빠져나갔는지 알아야 해… 비상 출석부가 앞쪽 책상에 있을 거야.',
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
    completionLine: '확인했어. 복도로 나간 애들이 있어. 우리도 뒤따라가자.',
    rewardGold: 2,
  },
  {
    id: 'stage2-bandage',
    stageId: 'stage2',
    title: '304번 사물함의 압박붕대',
    startLine: '304번 사물함에 압박붕대가 있어. 비밀번호는 0304… 보안은 원래부터 포기했어.',
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
    completionLine: '됐다. 이제 혼자서도 움직일 수 있어. 고마워.',
    rewardGold: 2,
  },
  {
    id: 'stage2-broadcast-key',
    stageId: 'stage2',
    title: '분실물 게시판 뒤의 마스터키',
    startLine: '비상 방송을 해야 해. 방송실 마스터키를 분실물 게시판 뒤에 붙여 뒀어.',
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
    completionLine: '좋아. 복도 끝까지 대피 방송을 내보낼게. 넌 계속 가!',
    rewardGold: 2,
  },
  {
    id: 'stage3-whistle',
    stageId: 'stage3',
    title: '주장의 호루라기',
    startLine: '애들이 패닉이야… 내 호루라기만 있으면 한쪽으로 모이게 할 수 있어.',
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
    completionLine: '좋아, 내가 애들을 정리할게. 체육관 출구는 네가 열어 줘!',
    rewardGold: 2,
  },
  {
    id: 'stage3-scoreboard-fuse',
    stageId: 'stage3',
    title: '꺼진 비상 전광판',
    startLine: '북쪽 전광판을 켜면 비상구 방향을 띄울 수 있어. 예비 퓨즈가 공 보관 카트에 있어.',
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
    completionLine: '전광판이 켜지고 비상구 방향 화살표가 나타났다.',
    rewardGold: 2,
  },
  {
    id: 'stage4-allergy-list',
    stageId: 'stage4',
    title: '급식 알레르기 확인',
    startLine: '남은 음식을 나눠 주고 싶은데, 알레르기 있는 애들 명단이 없어. 동쪽 조리대에 있을 거야.',
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
    completionLine: '이제 안전하게 나눠 줄 수 있어. 한 명도 더 아프게 하지 않을게.',
    rewardGold: 2,
  },
  {
    id: 'stage4-gas-valve',
    stageId: 'stage4',
    title: '멈추지 않는 가스 밸브',
    startLine: '쿡라인 가스가 새! 빨간 밸브 손잡이가 싱크대 쪽으로 굴러갔어.',
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
    completionLine: '밸브를 잠갔다. 쿡라인의 불꽃과 가스 소리가 잦아든다.',
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
