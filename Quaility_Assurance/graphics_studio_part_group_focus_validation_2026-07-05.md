# Graphics Studio Part Group Focus Validation

- Date: 2026-07-05
- Area: `Developer/r3f_prototype`

## 검증 항목

- 더블클릭으로 단일 파츠를 포커싱한다.
- `Shift + 더블클릭`으로 두 번째 파츠를 그룹에 추가한다.
- 그룹 상태에서 Scale 조정값은 group 튜닝 키에 저장된다.
- 그룹 파츠를 다시 더블클릭하면 단일 파츠포커싱으로 돌아간다.
- 프리뷰 소스에 그룹 외곽선 동기화가 연결되어 있다.

## 실행한 테스트

- `npm test -- src/components/GraphicsStudio.test.jsx`
- `npm test -- src/components/GraphicsStudioPreview.test.js`
