# levelmini routing trail — StunGun chain live position (2026-07-26)

## Routing

- 요청 범위: 무기 체인의 대상 선정과 전투 루프 일관성.
- 관련 전문 영역: `levelmini`.
- 이 기록은 프로젝트의 필수 routing 증적이다. 외부 Hermes/Kanban 작업은 실행하거나 주장하지 않았다.

## Gameplay contract

- 첫 볼트는 플레이어 기준 최근접 적을 향한다.
- 이후 체인은 직전 피격점 기준 최근접 미피격 적을 향한다.
- 위치가 바뀐 적을 이전 공간 cell에 남긴 채 대상으로 사용하지 않는다.

## Non-goals

피해량, 쿨다운, 업그레이드, 체인 수, Firebase/Studio 상태는 변경하지 않는다.
