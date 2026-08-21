# 나침반 칼날 스택 폭발 QA 기록

## 검증 항목

- 회전 타격 1회마다 스택이 1 증가해야 한다.
- 10스택 도달 시 스택은 0으로 초기화되어야 한다.
- 폭발 피해는 회전 타격 피해량의 5배여야 한다.
- 폭발 반경은 1타일, 현재 코드 기준 `0.5` 월드 유닛이어야 한다.
- 죽은 적이나 유효하지 않은 적은 폭발 피해 대상에서 제외되어야 한다.

## 자동 검증

- `CompassBlade.test.jsx`에 스택 누적과 10스택 폭발 테스트를 추가했다.
- `npm.cmd test -- CompassBlade.test.jsx --run`
  - 결과: 통과, 1개 테스트 파일 / 4개 테스트.
- `npm.cmd test -- CompassBlade.test.jsx weaponCatalog.test.js upgrades.test.js HUD.test.jsx onigiri.test.js --run`
  - 결과: 통과, 6개 테스트 파일 / 56개 테스트.
- `npm.cmd run build`
  - 결과: 통과.
  - 참고: Vite의 기존 청크 크기 경고가 표시되었으나 빌드 실패는 아니다.
