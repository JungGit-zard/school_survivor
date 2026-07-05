# Graphics Studio Part Focus Validation

- Date: 2026-07-05
- Area: `Developer/r3f_prototype`

## 검증 항목

- 미리보기 모델 더블클릭 시 Inspector가 `Part Focus` 상태로 바뀐다.
- 파츠포커싱 상태에서 Scale 변경값은 전체 모델 키가 아니라 파츠 키에 저장된다.
- 미리보기 계약 테스트가 더블클릭, 파츠 경로 계산, 별도 파츠 튜닝 연결을 확인한다.

## 실행한 테스트

- `npm test -- src/components/GraphicsStudio.test.jsx src/components/GraphicsStudioPreview.test.js`
