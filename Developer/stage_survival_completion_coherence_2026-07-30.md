# Stage Survival Completion Coherence — 2026-07-30

## 변경 근거

`Planner/auto_deploy_stage1_loop_leveling_plan_2026-06-24.md`의 최신 Stage 1 정본을 런타임에 맞췄다. Stage 1의 클리어 조건은 보스 처치가 아니라 240초 생존 후 탈출 포탈 진입이다. B01은 최종 압박과 별도 보너스 성취다.

## 적용 규칙

- Stage 1 B01 등장: 192초, 경고 기준: 186초, 탈출 포탈 활성화: 240초.
- Matilda 경고/등장 170초/180초는 변경하지 않았다.
- 모든 스테이지에서 보스 처치는 생존 보스 수를 하나 줄인다. 마지막 보스만 현재 점수 정책으로 `bossBonus`를 기록하고 기존 `bossClearJingle`을 한 번 재생한다.
- 보스 처치만으로 `phase`를 바꾸거나 `_onRunEnd`를 호출하지 않는다. 포탈의 기존 `clearStage`/`clearStageAndStartNext` 경로가 클리어와 런 종료를 처리한다.
- 보스가 이미 0이면 보너스와 징글을 다시 처리하지 않는다.

## 검증

- 대상: burst 시간, Stage 1 설정, 단일/다중 보스 처리, 포탈 런 종료, 중복 보스 처리.
- `npm.cmd test -- src/lib/burstEvents.test.js src/lib/stageConfig.test.js src/store/useGameStore.test.js src/store/useGameStore.unlocks.test.js` — 4 파일, 65 테스트 통과.
- `npm.cmd test -- src/components/Enemies.test.jsx` — 1 파일, 74 테스트 통과.
- `npm.cmd run build` — 통과. `git diff --check` — 통과.

## 범위 경계

Firebase 데이터, Firebase 스키마, Graphics Studio 데이터·연결·적용 경로, `localStorage`를 변경하거나 접근하지 않았다.
