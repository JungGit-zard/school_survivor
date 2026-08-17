# Stage 3 스폰 시간표 재배열 구현 기록

- Kanban: `t_68ed326e` (`levelmini`)
- 변경: `STAGE3_BURST_EVENTS` 비보스 이벤트 초만 공통 13개 앵커로 단조 재배열.
- 연동: `STAGE3_SPAWN_TELEGRAPHS`를 formation 이벤트와 1:1 동기화. E04 스폰만 40초로 이동하고 기존 발사 게이트 72초·Stage 3 HUD 제외는 보존.
- 불변값: 비보스 76마리, 적용 HP 5,541, B03 135초, payload·순서·랜덤 구성 유지.
- 범위 제외: Stage 1/2/4, 체력 스탯, Firebase, Graphics Studio, 5173.
