# Graphics Studio Ctrl+Z Undo

- Date: 2026-07-05
- Area: `Developer/r3f_prototype`

## 변경 내용

- Graphics Studio Inspector 조정값 변경 전 상태를 undo 스택에 저장한다.
- `Ctrl+Z` 또는 `Cmd+Z`로 직전 튜닝 상태를 복원한다.
- undo 스택은 최근 10개 상태까지만 유지한다.

## 제외

- redo 기능은 추가하지 않았다.
