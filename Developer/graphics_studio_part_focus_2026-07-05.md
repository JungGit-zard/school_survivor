# Graphics Studio Part Focus

- Date: 2026-07-05
- Area: `Developer/r3f_prototype`

## 변경 내용

- 그래픽 스타지오 미리보기 모델을 더블클릭하면 클릭된 Three.js 객체를 파츠로 포커싱하도록 추가했다.
- 파츠 튜닝은 기존 전체 모델 튜닝과 섞이지 않도록 `{itemId}::part::{partPath}` 키로 별도 저장한다.
- 포커싱된 파츠에는 기존 Inspector의 각도, 스케일, 색상 계열 조정값이 적용된다.
- Inspector에서 `Exit Part`로 전체 모델 튜닝 모드로 돌아갈 수 있다.

## 구현 메모

- 이름이 없는 mesh도 다룰 수 있도록 루트 모델 기준 자식 인덱스 경로를 파츠 키로 사용했다.
- 전체 모델 튜닝을 먼저 적용한 뒤, 선택된 파츠 튜닝을 덮어 적용한다.
