// 쓰러진 학생에게 접촉했을 때 나오는 우스운 대사 풀.
// 순수 모듈: 대사 배열 + 선택 함수. 렌더/스토어 의존 없음(테스트 대상).
export const STUDENT_DIALOGUE_LINES = Object.freeze([
  '…좀비 때문이 아니야… 공부가 하기 싫어서 누워있는 거야…',
  '5분만… 딱 5분만 더 잘게요…',
  '일어나면 시험이야. 나 안 일어날래.',
  '좀비보다 무서운 건 수행평가야…',
  '내신 다 망했는데 좀비가 대수냐…',
  '여기 바닥… 생각보다 시원하네…',
  '엄마… 나 오늘 학원 가기 싫어…',
  '이대로 방학까지 잘래…',
  '야자 째고 누웠더니 세상이 망했네…',
  '5교시 끝나고 눈 감았는데 아직도 안 떠져…',
])

// 대사 풀에서 무작위 한 줄 선택. random을 주입 가능하게 해 테스트에서 결정적으로 만든다.
export function pickStudentLine(random = Math.random) {
  const index = Math.floor(random() * STUDENT_DIALOGUE_LINES.length)
  return STUDENT_DIALOGUE_LINES[index]
}
