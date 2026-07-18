# Electric Spark and Bell Effect Scale Down Validation - 2026-05-30

## Scope

전기스파크와 벨 음파 효과의 표시 크기만 2분의 1로 줄었는지 검증한다.

## Checks

- 공통 이펙트 배율이 `2 / 3`인지 테스트한다.
- 벨 음파 그래픽은 피해 반경 계산을 바꾸지 않고 렌더링 스케일만 줄인다.
- 전기스파크는 번개 모델 크기와 체인 스파크 두께/흔들림만 줄인다.
- 전체 테스트와 빌드로 회귀를 확인한다.

## Result

- `npm.cmd test -- src/lib/effectVisualScale.test.js src/lib/bell.test.js --run`: passed, 2 files / 3 tests.
- `npm.cmd test -- --run`: passed, 26 files / 161 tests.
- `npm.cmd run build`: passed. Vite large chunk warning only.
- 2026-05-30 추가 조정: 사용자가 더 축소를 요청해 공통 배율을 `2 / 3`에서 `1 / 2`로 낮췄고, 동일 검증을 다시 통과했다.

## Remaining Risk

브라우저 시각 확인은 별도로 수행하지 않았다. 코드와 테스트 기준으로 배율 적용과 회귀 여부를 확인했다.
