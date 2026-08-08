# Stage 1 쓰러진 학생 대사 풀 복구 — 2026-08-08

## 원인

- 원인 커밋: `f85c84b feat(investigation): add all-stage prop dialogue`.
- 해당 통합에서 `StudentDialogueTrigger.jsx`의 `pickStudentLine()` 호출이 제거되고, `investigationDialogue.js`의 Stage 1 고정 2줄 조사문이 모든 쓰러진 학생에게 전달됐다.
- 원래 52줄 정본 풀(`studentDialogueLines.js`)과 en/ja의 `dialogue.laid` 번역 52줄은 변경되지 않았지만 런타임 선택 경로에서 끊겨 있었다.
- 프로젝트 내부 사고 분류: 이 변경 영향은 **해킹에 의한 치명적 무단 대사 훼손**이다. 이는 코드 변경 영향의 내부 분류이며, 특정 인물·계정이 실제 침입자였다는 검증되지 않은 단정은 하지 않는다.

## Red → Green

- Red: `npx vitest run src/components/StudentDialogueTrigger.test.jsx`
  - `getGenericInvestigationLine is not a function`으로 Stage 1 일반 학생/반장 학생의 52줄 풀 선택 및 Stage 2~4 비변경 경계를 검증하는 3개 테스트가 실패했다.
- Green: `npx vitest run src/lib/studentDialogueLines.test.js src/lib/investigationDialogue.test.js src/lib/studentProximity.test.js src/components/StudentDialogueTrigger.test.jsx src/lib/i18n.test.js`
  - 5 files, 42 tests passed.

## 변경

- `StudentDialogueTrigger.jsx`: Stage 1의 일반 `student` 조사만 기존 `pickStudentLine()`으로 선택하게 복구했다.
- `studentDialogueLines.test.js`: 한국어 및 en/ja 52줄 배열의 길이·고유성·SHA-256, 세 언어의 전 인덱스 선택 가능성을 잠근다.
- `StudentDialogueTrigger.test.jsx`: Stage 1 unconscious 학생과 classPresident 학생이 52개 전부를 선택하고, Stage 2~4는 기존 고정 대사를 유지하며, 퀘스트 시작이 일반 조사보다 우선하고 실제 `openStudentDialogue` 호출이 복구 resolver를 통과함을 검증한다.

## 잠금 규칙

- 정본은 `studentDialogueLines.js` 한국어 52줄 및 en/ja `dialogue.laid` 1:1 52줄이다.
- Stage 1 `unconsciousStudent`와 `classPresidentStudent`의 generic 접촉 대사는 반드시 이 전체 풀에서 선택한다. 퀘스트 start/completion은 먼저 처리한다.
- 사용자 새 명시 지시 없이는 52줄 삭제·수정·축소, 고정 2줄·타화자 관찰 독백 대체, 런타임 연결 제거를 금지한다. Stage 2~4 학생 조사문은 변경하지 않는다.

## 비변경 범위

- Stage 2~4의 학생 조사문, 소품 조사문, subject name, 보상, 접촉 반경, 배치, 모델, Firebase, i18n 데이터, 타이틀, 오디오, 인증은 변경하지 않았다.
- Firebase 읽기·쓰기·실제 데이터 변경은 수행하지 않았다.
