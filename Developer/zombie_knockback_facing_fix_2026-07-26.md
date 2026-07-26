# 좀비 넉백 중 방향 반전 수정

## 원인

풀링 적 런타임이 넉백 속도를 사용한 프레임에 그 속도로 yaw를 갱신했다. 마지막 넉백 프레임은 타이머 감산 뒤 시야 차단 우회가 다시 속도를 덮어쓸 수 있었고, 보류 detour도 넉백 속도를 회전시킬 수 있었다.

## 수정

넉백 브랜치 진입 사실을 `preserveFacing` 로컬 값으로 보존한다. 이 값이 참인 프레임에는 yaw 갱신, 시야 차단 우회, detour 속도 재계산을 모두 건너뛴다. 입력 넉백 이동과 neighbor separation은 유지한다. 다음 프레임에는 이 값이 다시 false여서 일반 추격 yaw 갱신이 재개된다.

## 검증

RED: `npx vitest run src/lib/enemySimulation.test.js -t "knockback"`에서 180도 yaw 반전을 확인했다.

GREEN: 집중 테스트 2 passed, `npx vitest run src/lib/enemySimulation.test.js` 29 passed.

Firebase, Graphics Studio, localStorage 변경 없음.
