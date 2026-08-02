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
    '책상 서랍을 열어 봤다. 숙제 대신 “선생님 좀비도 숙제 검사는 안 하겠지?”라는 메모가 들어 있다. 나도 그랬으면 좋겠다.',
    '책상 위 연필이 단정히 줄을 섰다. 모두 출석 체크를 기다리는 것 같아서 내가 대신 토닥여 줬다.',
  ],
  classroomChair: [
    '의자를 바로 세웠다. 좀비가 된 선생님도 바른 자세는 칭찬해 주실까? 왠지 고개를 끄덕이실 것 같다.',
    '의자 밑에서 지우개를 찾았다. 실수도 지워지면 좋겠는데, 오늘은 발자국만 잘 지워지는 모양이다.',
  ],
  corridorLockerBank: [
    '사물함을 열어 봤다. 체육복이 “나도 집에 가고 싶어” 하는 표정이다. 내가 대신 문을 살짝 닫아 줬다.',
    '사물함 안 계획표의 오늘 칸에는 “평범하게 살기”라고 적혀 있다. 참 귀여운 목표였는데.',
  ],
  corridorJanitorCart: [
    '청소 카트 바퀴가 삐걱거렸다. 선생님 좀비가 지나가도 이 소리만큼은 출석 부르듯 또렷할 것 같다.',
    '대걸레가 카트에 기대어 있다. 나보다 먼저 지친 것 같아서 “조금만 같이 힘내자”라고 속삭였다.',
  ],
  corridorLostFoundBoard: [
    '분실물판을 읽어 봤다. “양심을 찾습니다” 쪽지가 붙어 있다. 좀비가 된 선생님도 찾으러 오실까?',
    '게시판에 급식 만족도 조사가 남아 있다. 이런 날에도 별점은 주고 싶다. 오늘 별점은 무사히 탈출한 만큼.',
  ],
  basketballHoop: [
    '농구 골대를 올려다봤다. 공 하나가 림에 걸려 있다. 좀비 선생님도 슛은 다시 주워 주실까?',
    '골대 그물이 바람에 흔들린다. 내가 넣은 적 없는 슛까지 응원해 주는 것 같아서 조금 든든하다.',
  ],
  basketballBallCart: [
    '공 카트를 살폈다. 농구공들이 서로 꼭 붙어 있다. 무서우면 공도 친구 옆에 있고 싶은 모양이다.',
    '카트 바퀴를 살짝 굴려 봤다. 체육 시간보다 조용한데, 왠지 “준비!”라고 외치는 소리가 들리는 것 같다.',
  ],
  basketballCluster: [
    '흩어진 농구공을 세었다. 한 개가 또르르 굴러가서 내가 “멈춰!” 했더니 정말 멈췄다. 착한 공이다.',
    '농구공들이 바닥에 동그랗게 모여 있다. 혹시 작은 비밀 회의를 하다 선생님 좀비에게 들킨 걸까?',
  ],
  gymBench: [
    '체육관 벤치에 손을 얹었다. 땀 냄새 대신 먼지가 앉아 있다. 오늘은 나도 잠깐 앉아도 혼나지 않겠지?',
    '벤치 아래에 체육복 이름표가 떨어져 있다. 주인에게 돌려주고 싶은데, 지금은 이름표도 숨바꼭질 중이다.',
  ],
  gymTrainingCones: [
    '콘들이 줄지어 서 있다. 장애물 달리기 코스가 진짜 탈출 연습이 될 줄은 몰랐다. 그래도 나는 넘어지지 않을 거다.',
    '주황색 콘 하나가 삐뚤어져 있다. 내가 바로 세우니 “수고했어” 하는 것 같아서 괜히 기분이 좋아졌다.',
  ],
  gymMats: [
    '매트를 눌러 봤다. 폭신해서 조금 안심된다. 혹시 넘어져도 나를 받아 줄 친구가 하나 더 생긴 느낌이다.',
    '매트 모서리에 발자국이 남아 있다. 체육 선생님 좀비도 스트레칭은 하고 다니시면 좋겠다.',
  ],
  gymScoreboard: [
    '전광판은 0 대 0이다. 오늘은 누가 이기는 경기보다 모두 무사한 경기가 더 중요하니까, 이 점수도 괜찮다.',
    '점수판 불빛이 깜빡였다. 마치 “힘내!”를 모스 부호로 보내는 것 같아서 나도 작게 고개를 끄덕였다.',
  ],
  gymBanner: [
    '배너에는 “끝까지 달리자!”라고 적혀 있다. 이렇게 진지하게 응원해 줄 줄 알았으면 평소에도 잘 읽을걸.',
    '응원 배너가 펄럭인다. 좀비가 된 선생님도 체육대회 때처럼 박수쳐 주시면 조금 무서울 것 같다.',
  ],
  gymExitDoor: [
    '비상구 문을 살폈다. “침착하게 이동”이라는 글자가 반짝인다. 응, 나도 최대한 침착하게 발을 옮기자.',
    '비상구 손잡이가 차갑다. 문도 긴장한 것 같아서 내가 먼저 “같이 나가자”라고 말했다.',
  ],
  gymEquipmentSpill: [
    '흩어진 장비 사이에서 호루라이를 찾았다. 지금 불면 좀비 선생님도 체육 시간처럼 모일까 봐 그냥 내려놨다.',
    '줄넘기 줄이 꼬여 있다. 나도 머릿속이 꼬였지만, 줄은 천천히 풀어 주면 되니까 나도 그럴 수 있겠지.',
  ],
  kitchenPrepTable: [
    '조리대 위에 양파가 굴러다닌다. 눈물이 날 만큼 매운 건 아니지만, 오늘은 괜히 코끝이 찡하다.',
    '조리대 칼자국을 보니 급식 선생님 좀비도 예전엔 정말 바쁘셨겠지. 내가 마음속으로 “감사했어요”라고 했다.',
  ],
  kitchenCookLine: [
    '쿡라인 불빛을 확인했다. 오늘의 메뉴판에는 없지만, 따뜻한 국 한 그릇이 제일 생각난다.',
    '냄비 뚜껑이 달각거렸다. 혹시 국이 아직 끓고 있나 했는데, 그냥 바람이 장난친 거였다. 바람도 심심한가 보다.',
  ],
  kitchenSinkCounter: [
    '싱크대에 물방울이 맺혀 있다. 접시도 나처럼 집에 가고 싶을까? 깨지지 않게 조심히 지나가야지.',
    '싱크대 옆 수세미가 납작해졌다. 하루 종일 일한 모양이라 내가 속으로 “수고했어”라고 인사했다.',
  ],
  kitchenRefrigerator: [
    '냉장고 문을 살짝 열어 봤다. 반찬통들이 얌전히 줄 서 있다. 급식 줄보다 훨씬 조용해서 조금 웃겼다.',
    '냉장고 안 우유가 나를 보고 있는 것 같다. 유통기한보다 먼저 학교가 이렇게 될 줄은 아무도 몰랐겠지.',
  ],
  kitchenTrayRack: [
    '배식 랙의 쟁반들이 차례를 지키고 있다. 좀비가 된 선생님도 새치기는 안 하실 거라고 믿어 보고 싶다.',
    '쟁반 하나가 반짝인다. 내가 얼굴을 비춰 보니 겁먹은 표정이라서, 살짝 웃어 보였다.',
  ],
  kitchenShelfCart: [
    '선반 카트에 그릇이 꼭 붙어 있다. 나도 친구 손을 잡고 싶지만, 지금은 두 손으로 무기를 잘 잡아야 한다.',
    '카트가 조금 기울어져 있다. 넘어지지 않게 밀어 주니, 장난감 기차를 도와준 것처럼 뿌듯하다.',
  ],
  kitchenTrashBins: [
    '쓰레기통 뚜껑을 살폈다. 버려진 건 음식뿐이다. 내일은 꼭 남기지 않고 먹겠다고 마음속으로 약속했다.',
    '쓰레기통 옆에 급식표가 떨어져 있다. “닭강정” 글자를 보니 배가 꼬르륵했다. 이럴 때도 배는 성실하다.',
  ],
  kitchenCrateStack: [
    '상자 더미를 톡톡 두드렸다. 안에서 아무 소리도 안 난다. 다행이다, 상자도 지금은 조용히 숨은 모양이다.',
    '상자에 “조심”이라고 적혀 있다. 나한테 하는 말 같아서 발끝까지 조심조심 걸었다.',
  ],
  kitchenClutter: [
    '국자와 냄비가 엉켜 있다. 내가 살짝 정리하니 주방도 숨을 고르는 것처럼 보인다.',
    '주방 잡동사니 사이에 작은 숟가락이 있다. 좀비가 된 선생님도 밥은 꼭 챙겨 드시면 좋겠다고 생각했다.',
  ],
})

const STUDENT_LINES = Object.freeze({
  stage1: [
    '좀비가 된 학생도 나와 같은 교복이다. “괜찮아?” 하고 물었더니, 교실 바닥이 너무 시원한가 보다.',
    '좀비가 된 학생의 공책에 선생님 좀비 얼굴 낙서가 있다. 내가 보기엔 동그라미 얼굴이면 덜 무서울 것 같다.',
  ],
  stage2: [
    '복도에 누운 좀비 학생 옆으로 시간표가 떨어져 있다. 다음 교시는 생존인데, 나는 아직 교과서를 못 받았다.',
    '좀비가 된 학생의 운동화 끈이 풀려 있다. 내가 묶어 주고 싶지만, 발로 춤출까 봐 지금은 살짝 물러났다.',
  ],
  stage3: [
    '체육관 바닥의 좀비 학생은 체육 시간이 끝난 줄 알았을까? 나도 조용히 응원해 주고 싶다.',
    '좀비가 된 학생 손에 작은 호루라이가 있다. 선생님 좀비를 부르지 않게 내가 꼭 쥐고만 있어야겠다.',
  ],
  stage4: [
    '급식실의 좀비 학생은 점심을 기다렸을까? 내가 나중에 꼭 따뜻한 밥을 같이 먹자고 마음속으로 말했다.',
    '좀비가 된 학생 옆에 쟁반이 있다. 오늘은 반납하지 않아도 아무도 혼내지 않겠지만, 나는 그래도 잘 챙겨 두고 싶다.',
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
