# Lunch Item White Disc Removal Validation - 2026-05-30

## Scope

회복 아이템 아래의 하얀 원형 표시 제거를 검증한다.

## Checks

- `LunchItems.jsx`에서 흰색 `circleGeometry` 바닥 표시가 제거되었는지 확인한다.
- 회복 아이템 모델 렌더링은 유지한다.
- 테스트와 빌드로 회귀를 확인한다.

## Result

- `rg -n -F "circleGeometry args={[0.34" Developer/r3f_prototype/src/components/LunchItems.jsx`: no matches.
- `rg -n -F "opacity={0.16}" Developer/r3f_prototype/src/components/LunchItems.jsx`: no matches.
- `rg -n -F "meshBasicMaterial color={0xffffff}" Developer/r3f_prototype/src/components/LunchItems.jsx`: no matches.
- `npm.cmd test -- --run`: passed, 26 files / 161 tests.
- `npm.cmd run build`: passed. Vite large chunk warning only.

## Note

첫 확인용 `rg` 명령은 정규식 이스케이프 문제로 실패했다. 이후 고정 문자열 검색으로 다시 확인했다.
