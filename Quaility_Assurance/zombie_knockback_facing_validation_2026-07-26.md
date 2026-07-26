# 좀비 넉백 방향 고정 검증

## 재현과 수용

수정 전 E01은 피격 직전 yaw와 넉백 프레임 yaw가 180도 달라졌다. 회귀 테스트는 다음을 확인한다.

1. `sightBlocked`가 켜지고 `knockbackMs=1`인 마지막 넉백 프레임에도 +X 입력 넉백 속도·위치와 피격 전 yaw가 유지된다.
2. `detourMs`가 남은 경우에도 넉백 속도·위치·yaw가 유지된다.
3. 즉시 다음 프레임에는 일반 추격 속도와 yaw 갱신이 재개된다.

## 결과

- `npx vitest run src/lib/enemySimulation.test.js -t "knockback"`: 2 passed, 27 skipped.
- `npx vitest run src/lib/enemySimulation.test.js`: 29 passed.
- `git diff --check` 소유 파일: 오류 없음.

Firebase 데이터/설정, Graphics Studio 입력값, localStorage 변경 없음.
