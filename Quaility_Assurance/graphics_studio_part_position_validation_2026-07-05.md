# Graphics Studio Part Position Validation

- Date: 2026-07-05
- Area: `Developer/r3f_prototype`

## 검증 항목

- Position X/Y/Z 입력이 Inspector에 노출된다.
- 파츠포커싱 상태에서 Position X 입력은 전체 모델이 아니라 파츠 튜닝 키에 저장된다.
- `getStudioTransformProps()`가 position 배열을 반환한다.
- preview group과 runtime group이 transform position을 사용한다.

## 실행한 테스트

- `npm test -- src/components/StudioTunedGroup.test.jsx`
- `npm test -- src/components/GraphicsStudio.test.jsx src/components/GraphicsStudioPreview.test.js`
