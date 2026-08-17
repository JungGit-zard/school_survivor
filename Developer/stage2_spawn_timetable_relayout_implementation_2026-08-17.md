# 스테이지 2 스폰 시간표 재배열 구현 기록

- 대상: `src/lib/burstEvents.js`의 `STAGE2_BURST_EVENTS`와 `STAGE2_MIXED_REINFORCEMENT_EVENTS`
- 변경: 스테이지 2의 모든 비보스 좀비 이벤트 시각만 스테이지 1의 13개 시간 앵커로 이동
- 유지: B02 120초, 모든 event payload, 랜덤 mixedTypes, formation, 경비추격 휘슬, HP 스탯, 마틸다·도지·오버타임
- 회귀 방어: `src/lib/burstEvents.test.js`가 앵커 배열, B02 시각, payload 무sec 스냅샷, 총 스폰 수 224, 선언 HP 예산 9,202를 확인한다.
- 검증: `npm test -- src/lib/burstEvents.test.js --maxWorkers=1 --no-file-parallelism`
