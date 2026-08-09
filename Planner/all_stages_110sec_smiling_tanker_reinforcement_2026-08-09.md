# 전 스테이지 1:50 웃는좀비·탱커 보강 (2026-08-09)

## Scope
- Kanban: `t_c146dfdf` correction for rejected `t_7b561a31` work.
- 대상: Stage 1~4 모든 플레이어블 스테이지의 버스트 스폰 타임라인.
- 목표: 모든 스테이지에서 정확히 `1:50 = 110초`에 웃는 좀비 `E07` 3마리와 탱커 `E02` 3마리를 추가로 스폰한다.
- 제외 범위: 스테이지 길이, 탈출 포탈, 보스 타이밍, 마틸다 타이밍/스탯/AI/모델/대사/오디오, 기존 웨이브/버스트, 적 스탯·AI·모델, Firebase, Graphics Studio, 타이틀, 오디오.

## Numeric policy
- Reinforcement time: `110초 = 1분 50초`.
- Added `E07` smiling zombie count: `3` per stage.
- Added `E02` tanker count: `3` per stage.
- Stage coverage: Stage 1, Stage 2, Stage 3, Stage 4.
- Distance/range units: 이번 변경은 거리·범위 수치를 새로 도입하지 않는다. 기존 거리/블록 기준은 `Bang_Rules.md`의 `1블록 = 4 units` 정책을 유지한다.

## Stage coverage
| Stage | Added time | Added E07 | Added E02 | Implementation source |
| --- | ---: | ---: | ---: | --- |
| Stage 1 | 110초 (1:50) | 3 | 3 | `ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS` spread in `BURST_EVENTS` |
| Stage 2 | 110초 (1:50) | 3 | 3 | same shared list spread in `STAGE2_BURST_EVENTS` |
| Stage 3 | 110초 (1:50) | 3 | 3 | same shared list spread in `STAGE3_BURST_EVENTS` |
| Stage 4 | 110초 (1:50) | 3 | 3 | same shared list spread in `STAGE4_BURST_EVENTS` |

## Acceptance criteria
1. `Bang_Rules.md`에 전 스테이지 `110초 = 1:50` 웃는좀비·탱커 보강 정책이 코드 변경보다 먼저 기록되어 있으며, 최종 diff는 이 정책 문단 1개만 추가한다.
2. `Developer/r3f_prototype/src/lib/burstEvents.js`는 공유 목록 `ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS`를 사용해 Stage 1~4 버스트 배열에 동일한 `{ sec: 110, type: 'E07', count: 3 }`와 `{ sec: 110, type: 'E02', count: 3 }`를 추가한다.
3. Stage 1~4 각 버스트 배열에는 `110초 E07 count 3` 이벤트가 정확히 1개, `110초 E02 count 3` 이벤트가 정확히 1개 존재한다.
4. Stage 2 기존 웃는좀비 이벤트 `E07@60 count 5`, `E07@82 count 10`은 기존 줄 그대로 보존한다.
5. `Developer/r3f_prototype/src/lib/burstEvents.test.js`는 HEAD의 기존 테스트 내용을 byte-preserving으로 보존하고, 새 110초 보강만 검증하는 작은 focused describe block 1개만 추가한다.
6. 적 스탯·모델·AI, 보스/마틸다/포탈/스테이지 시간, Firebase, Graphics Studio, 타이틀, 오디오는 변경되지 않는다.

## QA handoff for Balance_QA_Mini
- Review files:
  - `Bang_Rules.md`
  - `Planner/all_stages_110sec_smiling_tanker_reinforcement_2026-08-09.md`
  - `Developer/r3f_prototype/src/lib/burstEvents.js`
  - `Developer/r3f_prototype/src/lib/burstEvents.test.js`
  - `Developer/agent_room/levelmini_all_stages_110sec_smiling_tanker_reinforcement_2026-08-09.md`
- Required verification from `Developer/r3f_prototype`:
  - `npm test -- src/lib/burstEvents.test.js -t "전 스테이지 1:50 웃는좀비·탱커 보강"`
  - `npm run build`
  - scoped `git diff --check -- Bang_Rules.md src/lib/burstEvents.js src/lib/burstEvents.test.js` from `Developer/r3f_prototype` or equivalent repo-root paths
  - exact `git diff --numstat` for the scoped files
  - `git status --short --branch`
- Baseline note:
  - Whole `src/lib/burstEvents.test.js` may still contain unrelated stale assertions from HEAD. This correction intentionally did not update those stale tests; classify any non-focused failures separately as baseline, not as a 110초 보강 regression.
- Regression focus:
  - 전 스테이지가 동일한 `110초` 보강을 가진다.
  - 기존 이벤트를 삭제·대체하지 않는다.
  - Stage 2 기존 웃는좀비 이벤트(`60초`, `82초`)는 그대로 유지한다.
  - Firebase/Graphics Studio/title/audio 영역에는 변경이 없어야 한다.
