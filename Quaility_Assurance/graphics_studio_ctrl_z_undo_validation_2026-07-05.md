# Graphics Studio Ctrl+Z Undo Validation

- Date: 2026-07-05
- Area: `Developer/r3f_prototype`

## 검증 항목

- Inspector 값을 변경하면 이전 상태가 undo 스택에 저장된다.
- `Ctrl+Z`로 이전 튜닝 상태가 복원된다.
- 11번 변경 후 10번 undo하면 10단계까지만 복원된다.

## 실행한 테스트

- `npm test -- src/components/GraphicsStudio.test.jsx`
