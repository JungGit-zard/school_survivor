# balanceqa 회귀 수용 — 좀비 넉백 방향 고정

- 라우팅: `balanceqa` 검토 대상. 피격 피드백과 이동 상태 전환 회귀를 수용 기준으로 확인한다.
- 수용 기준 1: 시야 차단이 켜져 있고 `knockbackMs=1`이어도 마지막 넉백 프레임은 입력 넉백 속도·위치 이동과 피격 전 yaw를 유지한다.
- 수용 기준 2: `detourMs`가 남아 있어도 넉백 프레임의 속도·위치·yaw는 넉백 계약을 따른다.
- 수용 기준 3: 바로 다음 프레임에는 일반 추격 속도와 yaw 갱신이 재개된다. 이웃 separation은 기존 충돌 회피로 유지한다.
- RED: `npx vitest run src/lib/enemySimulation.test.js -t "knockback"`에서 yaw 180도 반전을 확인했다.
- GREEN: 같은 집중 명령 2 passed, 전체 `enemySimulation` 29 passed.
- Firebase, Graphics Studio, localStorage와 피해량·넉백 수치·플래시 시간은 변경하지 않았다.
