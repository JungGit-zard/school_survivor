# Shark Missile Homing Yaw Fix Validation

Date: 2026-06-28 18:46 KST

## Scope

상어미사일이 발사 직후 화면 바깥으로 나가는 문제를 검증했다.

## Validation

- RED: `npm test -- sharkMissileRuntime.test.js`
  - `shortestAngleDelta`가 없어서 실패하는 것을 확인했다.
- GREEN: `npm test -- sharkMissileRuntime.test.js sharkMissileTargeting.test.js`
  - 2 files, 8 tests passed.
- Build: `npm run build`
  - Passed.

## Result

상어미사일 호밍 각도 계산은 현재 방향과 목표 방향이 같을 때 `0`을 반환하고, `-pi/pi` 경계에서도 최단 회전량을 반환한다.

## Remaining Risk

브라우저에서 상어미사일을 즉시 활성화하는 공개 테스트 훅은 없어 자동 플레이 검증은 단위 테스트와 빌드 검증으로 대체했다.
