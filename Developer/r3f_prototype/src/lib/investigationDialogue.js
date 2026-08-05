import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'
import { propLabel, t, tList } from './i18n.js'

const SUBJECT_NAMES = new Map(STAGE_PROP_PALETTE.map(({ type, label }) => [type, label]))

const REWARD_SUBJECT_TYPES = Object.freeze({
  classroomDesk: 'desk',
  corridorLockerBank: 'locker',
  corridorJanitorCart: 'janitorCart',
  corridorLostFoundBoard: 'bulletinBoard',
})

const OBJECT_LINES = Object.freeze({
  classroomDesk: [
    '연필이 손등을 콕 찔렀어. 책상도 좀비 편인 줄 알았네.',
    '“급식 최고” 낙서라니. 나 지금 배가 먼저 놀라잖아.',
  ],
  classroomChair: [
    '의자가 삐걱대며 혼내는 것 같아. 나, 앉지도 않았는데 말이야.',
    '지우개 먼지가 털괴물 같아. 미안, 내가 먼저 눈 피했어.',
  ],
  corridorLockerBank: [
    '체육복 소매가 인사하는 줄 알았어. 나도 손 흔들 뻔했네.',
    '계획표에 체력장이라니. 나 지금도 충분히 뛰고 있어, 너무해.',
  ],
  corridorJanitorCart: [
    '대걸레가 꾸벅 인사했어. 나도 모르게 같이 꾸벅했네.',
    '양동이 속 내 얼굴이 국수처럼 길어. 오늘 머리보다 길어 보였어.',
  ],
  corridorLostFoundBoard: [
    '짝 잃은 양말 사연이 붙어 있어. 나까지 괜히 쓸쓸해졌어.',
    '종이가 펄럭하고 덤볐어. 무서운 척은 종이가 제일 잘하네.',
  ],
  basketballHoop: [
    '그물이 나한테 윙크하는 것 같아. 왜 이렇게 여유롭지?',
    '골대 아래 서니 수행평가 생각났어. 좀비보다 체육이 세네.',
  ],
  basketballBallCart: [
    '농구공들이 동그랗게 날 보는 것 같아. 심사위원단 같네.',
    '바퀴가 삐익 울었어. 내 비밀 요원 걸음은 바로 들켰어.',
  ],
  basketballCluster: [
    '공이 발끝을 톡 쳤어. 말을 건 줄 알고 나도 “응?” 했어.',
    '농구공들이 낮잠 중인 것 같아. 나 깨울까 봐 조심했어.',
  ],
  gymBench: [
    '먼지가 관중처럼 앉아 있어. 나 혼자 입장식 하는 기분이야.',
    '이름표 줍다 이마를 콩 했어. 이름표보다 내가 먼저 발견됐네.',
  ],
  gymTrainingCones: [
    '콘들이 선도부처럼 서 있어. 나 괜히 발끝을 모으게 돼.',
    '콘을 세웠더니 더 삐뚤어 보여. 내가 패션을 망친 걸까?',
  ],
  gymMats: [
    '매트가 너무 폭신해. 나 잠깐 눕고 싶어져, 위험해.',
    '말린 매트가 김밥 같아. 이런 때 배가 반응하면 안 되는데.',
  ],
  gymScoreboard: [
    '점수가 애매하게 멈췄어. 세상 끝에도 기록은 찜찜하구나.',
    '점수판이 퀴즈 내는 것 같아. 답은 모르지만 고개는 끄덕였어.',
  ],
  gymBanner: [
    '배너가 “끝까지!” 외쳐. 너무 씩씩해서 나도 “네…” 했어.',
    '글자가 춤추는 것 같아. 응원단보다 배너가 더 신났네.',
  ],
  gymExitDoor: [
    '손잡이가 얼음처럼 차가워. 나한테 먼저 장난친 것 같아.',
    '초록 표지가 당당해. 문만 열리면 내가 바로 믿어 줄게.',
  ],
  gymEquipmentSpill: [
    '줄넘기가 뱀처럼 꼬물거려. 나, 그래도 줄이라 다행이야.',
    '공 하나가 빼꼼 숨어 있어. 나, 찾았다 말할 뻔했어.',
  ],
  kitchenPrepTable: [
    '당근 조각이 너무 반듯해. 이 학교 최고 모범생은 당근이네.',
    '칼자국이 지도 같아. 아무래도 양파의 모험 루트였나 봐.',
  ],
  kitchenCookLine: [
    '냄비 뚜껑이 달그락댔어. 혼자 등장 음악을 맡았나 봐.',
    '쿡라인 앞에 서니 나 급식 당번 같아. “국 더요”가 떠올랐어.',
  ],
  kitchenSinkCounter: [
    '물방울이 똑, 박자를 맞춰. 나, 음악 수행 보는 것 같아.',
    '수세미가 납작해. 세상 피곤을 혼자 맡은 표정이야.',
  ],
  kitchenRefrigerator: [
    '냉장고가 한숨 쉬는 것 같아. 나도 같이 후우 해 버렸어.',
    '반찬통들이 줄을 딱 맞췄어. 나보다 침착해서 조금 진 것 같아.',
  ],
  kitchenTrayRack: [
    '쟁반에 내가 여러 명 비쳐. 겁먹은 나들이 회의 중이네.',
    '쟁반이 메뉴를 발표할 것 같아. 나, 공포 맛은 처음이야.',
  ],
  kitchenShelfCart: [
    '그릇들이 달그락 합창해. 나 박수치면 더 커질까 봐 참았어.',
    '카트를 도우려 했는데 더 삐걱댔어. 착한 일도 효과음이 크네.',
  ],
  kitchenTrashBins: [
    '쓰레기통이 말 많은 얼굴 같아. 미안, 나 상담은 나중에 할게.',
    '급식표를 보니 배가 꼬르륵했어. 내 배야, 회의 중이잖아.',
  ],
  kitchenCrateStack: [
    '상자가 숨만 쉬어도 무너질 것 같아. 나도 숨을 작게 쉬었어.',
    '“조심” 글자가 잔소리 같아. 나 이미 엄청 조심하고 있어.',
  ],
  kitchenClutter: [
    '국자와 냄비가 오케스트라 같아. 지휘자만 없어서 다 달그락이야.',
    '숟가락이 너무 얌전해. 오히려 수상해서 내가 먼저 눈을 피했어.',
  ],
})

const STUDENT_LINES = Object.freeze({
  stage1: [
    '공책에 “숙제 안 함”이 보여. 이런 날에도 숙제는 따라오네.',
    '리본이 삐뚤어져 있어. 가까이는 무서워서 마음으로만 고쳐 줬어.',
  ],
  stage2: [
    '시간표가 너무 빽빽해. 좀비가 돼도 이렇게 바쁘면 안 돼.',
    '운동화 끈이 풀려 있어. 끈아 미안, 나 대신 힘내 줬으면 해.',
  ],
  stage3: [
    '호루라기가 보여. 삑 불면 체육 시간이 시작될 것 같아.',
    '농구공이 옆에 붙어 있어. 친구인지 공범인지 아직 모르겠어.',
  ],
  stage4: [
    '쟁반이 너무 공손해. 밥 기다리는 자세 같아서 괜히 짠해.',
    '수저가 가지런해. 이렇게 예의 바른 공포는 처음이야.',
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
  if (type === 'unconsciousStudent' || type === 'classPresidentStudent') {
    const korean = STUDENT_LINES[stageId] ?? STUDENT_LINES.stage1
    const lines = tList(`dialogue.student.${STUDENT_LINES[stageId] ? stageId : 'stage1'}`, korean)
    return {
      subjectType: 'student',
      subjectName: t('dialogue.studentName', null, '좀비가 된 학생'),
      line: pickDeterministicLine(lines, placementId),
    }
  }

  const koreanLines = OBJECT_LINES[type]
  const koreanName = SUBJECT_NAMES.get(type)
  if (!koreanLines || !koreanName) return null

  return {
    subjectType: REWARD_SUBJECT_TYPES[type] ?? type,
    subjectName: propLabel(type, koreanName),
    line: pickDeterministicLine(tList(`dialogue.obj.${type}`, koreanLines), placementId),
  }
}
