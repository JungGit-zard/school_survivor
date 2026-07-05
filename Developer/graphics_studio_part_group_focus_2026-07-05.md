# Graphics Studio Part Group Focus

- Date: 2026-07-05
- Area: `Developer/r3f_prototype`

## 변경 내용

- 파츠포커싱 상태에서 `Shift + 더블클릭`으로 다른 파츠를 같은 그룹에 추가한다.
- 그룹 상태의 튜닝은 `{itemId}::group::{partKey}+{partKey}` 키로 별도 저장한다.
- 그룹 튜닝 하나가 그룹에 포함된 모든 파츠에 동시에 적용된다.
- 그룹 파츠를 다시 더블클릭하면 그룹을 해제하고 해당 파츠 단일 포커스로 돌아간다.

## 구현 메모

- 그룹 선택은 편집 세션 상태로만 유지한다.
- 기존 단일 파츠포커싱 저장 키는 유지했다.
