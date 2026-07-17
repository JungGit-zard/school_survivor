# Stage 2 보스 크기 복구 검증 - 2026-07-17

## 검증 대상

- Stage 2 스테이지 선택 카드의 보스 프리뷰 크기.
- 타이틀 화면의 Stage 2 보스 크기.
- Stage 1 보스와 비슷한 체감 크기로 보이는지.
- 전투용 보스 스케일이 변경되지 않았는지.

## 정적 확인

- 원인은 `zombie-b02-teacher` Graphics Studio 루트 스케일이 `ZombieMesh` 사용처 전체에 적용되는 구조로 추적했다.
- `graphicsStudioB02Source.js`의 B02 source revision을 `3`으로 올렸다.
- `graphicsStudioConfig.js`에서 `storedRevision < sourceRevision(3)`일 때 B02 루트 크기 축을 기본값으로 복구한다.
- `StageBossPreview.jsx`의 B02 로비 카드 모델 scale factor는 `0.82`다.
- `StageBossPreview.jsx`의 B02 프리뷰 zoom factor는 크라운 여백 보정 기준 `0.95`다.
- `Enemy.jsx`의 `ENEMY_STATS.B02.scale`은 변경하지 않았다.
- `StageBossPreview.test.jsx`와 `graphicsStudioConfig.test.js`에 로비 카드 축소 및 revision 2 stale browser 재복구 회귀 검사를 반영했다.

## 자동 테스트

- 현재 작업 환경의 Node 실행이 WSL 1 제한으로 막힐 수 있어, 실제 테스트 실행 결과는 별도 터미널/WSL 2/Windows Node 환경에서 재확인해야 한다.

## 수동 QA 체크

1. 로비에서 Stage 1/Stage 2 카드가 함께 보이도록 연다.
2. Stage 2 보스가 카드 안에서 과도하게 확대되어 잘리지 않는지 확인한다.
3. Stage 1 보스와 Stage 2 보스의 체감 크기가 비슷한지 확인한다.
4. 타이틀 화면에서 B02가 B01보다 두 배 가까이 크게 보이지 않는지 확인한다.
5. Stage 2에 입장해 전투 보스 체감 크기가 Stage 1 보스급으로 복구됐는지 확인한다.
6. 보스 체력, 충돌, 공격 패턴이 기존처럼 유지되는지 확인한다.
