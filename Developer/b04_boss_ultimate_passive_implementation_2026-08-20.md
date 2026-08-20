# B04 국물 대폭발·급식 국자 구현 기록

상태: 구현 진행 중. Stage 4 B04만 대상으로 한다.

- `b04SoupBlast` 순수 상태는 HP 50%, 200초 이전에만 1.2초 예고 후 원형 폭발 최대 16 피해 한 번을 처리하고, 200초부터는 기존 P2 전환을 유지한다.
- 원 후보는 stage4 bounds 안에 배치하고 stage object obstacle footprint를 제외하며, 원 간 비중첩과 중심 안전 공간을 검증한다.
- `b04ServingLadle`은 최대 HP ×1.05와 현재 HP 비율 보존을 marker로 한 번만 적용한다. Firebase 정규화와 HUD 카탈로그 네 번째 데이터도 연결했다.

RED: `src/lib/b04SoupBlast.js` 누락. GREEN: `npm.cmd exec -- vitest run src/lib/b04SoupBlast.test.js src/store/useGameStore.bossPassiveItems.test.js src/components/Enemies.test.jsx --maxWorkers=1 --no-file-parallelism` — 3 files, 104 tests passed.
