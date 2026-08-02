import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'

const SUBJECT_NAMES = new Map(STAGE_PROP_PALETTE.map(({ type, label }) => [type, label]))

const REWARD_SUBJECT_TYPES = Object.freeze({
  classroomDesk: 'desk',
  corridorLockerBank: 'locker',
  corridorJanitorCart: 'janitorCart',
  corridorLostFoundBoard: 'bulletinBoard',
})

const OBJECT_LINES = Object.freeze({
  classroomDesk: [
    '연필이 내 손등에 콕. 아니, 책상까지 장난이야? 나는 당황했다.',
    '“급식 최고” 낙서라니. 이런 공포에 급식 자랑? 나는 말문이 막혔다.',
  ],
  classroomChair: [
    '의자가 삐걱 항의했다. 내가 혼난 것 같아 당황해서 “미안…” 했다.',
    '지우개 먼지가 털괴물처럼 보였다. 나는 깜짝 놀라 한 발 물러섰다.',
  ],
  corridorLockerBank: [
    '체육복 소매가 손 흔드는 것 같았다. 나는 인사할 뻔해서 부끄러웠다.',
    '계획표에 체력장이라니. 지금도 체력장 같아서 나는 억울했다.',
  ],
  corridorJanitorCart: [
    '대걸레가 꾸벅 인사하는 것 같았다. 나는 당황해서 같이 꾸벅했다.',
    '양동이 속 내 얼굴이 국수처럼 길었다. 나는 너무 당황했다.',
  ],
  corridorLostFoundBoard: [
    '짝 잃은 양말 사연이라니. 공포 속 양말까지 외로워 나는 말문이 막혔다.',
    '종이가 나에게 돌진하는 것 같았다. 나는 깜짝 놀랐지만, 종이는 종이였다.',
  ],
  basketballHoop: [
    '그물이 나에게 윙크하는 것 같았다. 나는 골대가 왜 능글맞나 당황했다.',
    '골대 아래서 수행평가가 떠올랐다. 나는 좀비보다 체육이 무서웠다.',
  ],
  basketballBallCart: [
    '농구공들이 나를 감시하는 것 같았다. 나는 괜히 허리를 폈다.',
    '바퀴가 삐익 울었다. 비밀 요원처럼 들켜 나는 당황했다.',
  ],
  basketballCluster: [
    '공이 내 발에 톡. 말을 건 것 같아 나는 “응?” 하고 놀랐다.',
    '농구공들이 낮잠 자는 것 같았다. 나는 깨울까 봐 너무 당황했다.',
  ],
  gymBench: [
    '먼지가 관중처럼 줄 서 있었다. 나는 평가받는 것 같아 괜히 긴장했다.',
    '이름표 줍다 이마를 콩. 먼저 발견된 것 같아 나는 부끄러웠다.',
  ],
  gymTrainingCones: [
    '콘들이 선도부처럼 서 있었다. 나는 혼날 일도 없는데 당황했다.',
    '콘을 세우니 더 삐뚤어 보였다. 나는 패션을 망친 것 같아 당황했다.',
  ],
  gymMats: [
    '매트가 너무 폭신했다. 내가 눕고 싶어져 당황해 얼른 손을 뗐다.',
    '말린 매트가 김밥처럼 보였다. 나는 배가 반응해 조용히 당황했다.',
  ],
  gymScoreboard: [
    '점수가 애매하게 멈췄다. 나는 세상 끝에도 기록이 찜찜해 당황했다.',
    '점수판이 퀴즈 내는 것 같았다. 나는 답을 몰라 작게 당황했다.',
  ],
  gymBanner: [
    '배너가 “끝까지!” 외쳤다. 너무 씩씩해서 나는 “네…” 하고 당황했다.',
    '배너 글자가 춤추는 것 같았다. 나는 웃을까 봐 조용히 입을 가렸다.',
  ],
  gymExitDoor: [
    '손잡이가 얼음장난처럼 차가웠다. 나는 깜짝 놀라 눈을 동그랗게 떴다.',
    '초록 표지가 너무 당당했다. 문이 안 열릴까 봐 나는 벌써 머쓱했다.',
  ],
  gymEquipmentSpill: [
    '줄넘기가 뱀처럼 꼬물댔다. 나는 깜짝 놀랐지만, 그냥 줄이었다.',
    '공 하나가 빼꼼 숨었다. 찾았다 말할 뻔해 나는 너무 당황했다.',
  ],
  kitchenPrepTable: [
    '당근 조각이 너무 반듯했다. 나는 당근 모범생 같아 괜히 자세를 폈다.',
    '칼자국이 지도처럼 보였다. 양파 이동 경로 같아 나는 당황했다.',
  ],
  kitchenCookLine: [
    '냄비 뚜껑이 등장 효과음처럼 달그락댔다. 나는 조금 억울했다.',
    '쿡라인 앞에서 급식 당번 같아. 나는 “국 더요”에 깜짝 놀랐다.',
  ],
  kitchenSinkCounter: [
    '물방울이 메트로놈처럼 똑. 나는 음악 시간 같아 당황했다.',
    '납작한 수세미가 지친 것 같았다. 나는 괜히 “힘내…” 했다.',
  ],
  kitchenRefrigerator: [
    '냉장고가 한숨 쉬는 것 같았다. 나도 따라 쉬고 당황했다.',
    '반찬통들이 너무 질서정연했다. 나는 반찬통에게 진 것 같아 당황했다.',
  ],
  kitchenTrayRack: [
    '쟁반 속 내가 여러 명이었다. 겁먹은 내가 회의하는 것 같아 당황했다.',
    '쟁반이 “오늘 메뉴는 공포”라 할 것 같았다. 나는 당황해 손을 모았다.',
  ],
  kitchenShelfCart: [
    '그릇들이 합창처럼 달그락댔다. 나는 박수 못 치고 조용히 당황했다.',
    '카트를 돕자 더 삐걱댔다. 착한 일인데 무대 효과 같아 당황했다.',
  ],
  kitchenTrashBins: [
    '쓰레기통이 말 많은 얼굴 같았다. 나는 듣기도 전에 너무 당황했다.',
    '급식표 메뉴에 배가 꼬르륵. 나는 내 배에게 조용히 회의 중이라 했다.',
  ],
  kitchenCrateStack: [
    '상자가 숨만 쉬어도 무너질 것 같았다. 나는 숨 쉬는 법도 까먹을 뻔했다.',
    '“조심” 글자가 잔소리 같았다. 나는 이미 조심 중이라 억울했다.',
  ],
  kitchenClutter: [
    '국자와 냄비가 오케스트라 같았다. 나는 지휘자 없어 당황했다.',
    '숟가락이 너무 얌전해 수상했다. 나는 당황해 눈싸움에서 졌다.',
  ],
})

const STUDENT_LINES = Object.freeze({
  stage1: [
    '공책에 “숙제 안 함”. 이런 공포에도 숙제라니, 나는 당황했다.',
    '리본이 삐뚤었다. 바로잡고 싶지만 무서워서 나는 멀리서 정렬했다.',
  ],
  stage2: [
    '좀비 옆 시간표가 빽빽했다. 좀비도 바쁘면 안 돼서 나는 억울했다.',
    '운동화 끈이 풀렸다. 묶기 무서워 나는 당황해 끈에게 힘내라 했다.',
  ],
  stage3: [
    '호루라기가 보였다. 삑 불면 체육 시작 같아 나는 당황했다.',
    '농구공이 좀비 옆에 붙었다. 친구인지 공범인지 몰라 나는 조심했다.',
  ],
  stage4: [
    '쟁반이 너무 공손했다. 밥 기다리는 것 같아 나는 말할 뻔했다.',
    '수저가 가지런했다. 예의 바른 공포라니, 나는 당황해 발끝을 들었다.',
  ],
})

function pickDeterministicLine(lines, placementId) {
  let hash = 0
  for (let index = 0; index < placementId.length; index += 1) {
    hash = (hash + placementId.charCodeAt(index) * (index + 1)) >>> 0
  }
  return lines[hash % lines.length]
}

export function getInvestigationDialogue(stageId, type, placementId) {
  if (type === 'unconsciousStudent') {
    const lines = STUDENT_LINES[stageId] ?? STUDENT_LINES.stage1
    return {
      subjectType: 'student',
      subjectName: '좀비가 된 학생',
      line: pickDeterministicLine(lines, placementId),
    }
  }

  const lines = OBJECT_LINES[type]
  const subjectName = SUBJECT_NAMES.get(type)
  if (!lines || !subjectName) return null

  return {
    subjectType: REWARD_SUBJECT_TYPES[type] ?? type,
    subjectName,
    line: pickDeterministicLine(lines, placementId),
  }
}
