# 연필 화면 잔류 검증 — 2026-07-26

## RED

`PencilPierceFireRegression.test.jsx`의 실제 `gainXp()` 레벨업 전이에서 비행 연필이 1개인 상태로 `phase='levelup'`이 되면, 기존 구현은 제거 예약 RAF가 0개여서 연필이 렌더 목록에 남았다.

## GREEN 기준

- 같은 실제 상태 전이 뒤 기존 deferred projectile 경로가 빈 목록을 예약한다.
- 다음 animation frame commit 후 연필 렌더 모델 수는 0이다.
- 관통 연속 발사와 기존 사거리·쿨다운·수명 계약은 회귀하지 않는다.

## 결과

- 범위 테스트: 8 files / 99 tests PASS.
- Production build와 Legacy B02 source/artifact gate PASS.
- `Pencil.jsx`와 회귀 테스트에 debug console 출력 없음.
