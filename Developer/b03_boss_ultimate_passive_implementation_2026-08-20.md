# B03 왕복 오래달리기·체육관 호루라기 구현 기록

상태: Stage 3 B03 범위 구현 및 집중 검증 완료. B02/B04, BIG_SPAWN_SMOKE, 타이틀, Studio, 실제 Firebase 데이터, 5173은 변경하지 않았다.

- HP 65%/30% 하향 통과마다 chase 중 1회씩만 시전하며 `elapsed >= 200_000`에서는 새 시전을 시작하지 않는다.
- 1.25초 고정 레인 예고 뒤 B03가 X축으로 왕복 두 pass를 수행한다. 각 pass는 X 근접(0.7)과 레인 Z 안에 동시에 있어야 16 피해를 한 번만 주며, 시전 총량은 최대 32다.
- 시전 중 일반 추적·돌진·접촉 경로는 early return으로 차단되고, 종료 뒤 1.2초 경직 후 chase로 복귀한다. 레인 밖 Z 영역은 안전하며 투사체·소환은 추가하지 않았다.
- B03 처치 보상 `b03GymWhistle`은 최종 이동속도 ×1.05를 현재/다음 런에 한 번만 적용하며 기존 `baseSpeed × 1.8` cap을 유지한다. 퀘스트 가방의 기존 8칸 데이터 카탈로그 세 번째 슬롯으로 표시된다.

RED: `npm.cmd exec -- vitest run src/lib/b03ShuttleRun.test.js --maxWorkers=1 --no-file-parallelism` (module 없음).

GREEN: `npm.cmd exec -- vitest run src/lib/b03ShuttleRun.test.js src/store/useGameStore.bossPassiveItems.test.js src/lib/bossPassiveItems.test.js src/lib/firebaseProgress.test.js src/components/Enemies.test.jsx --maxWorkers=1 --no-file-parallelism` — 5 files, 125 tests passed.
