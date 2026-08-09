# 전 스테이지 마틸다 3:50 등장 (2026-08-09)

## Scope
- Kanban: `t_ccd39855`
- 대상: Stage 1~4 모든 플레이어블 스테이지의 마틸다 등장 타이밍.
- 목표: 마틸다 물리 액터/AI가 전 스테이지에서 정확히 `3:50 = 230초`에 등장한다.
- 제외 범위: 스테이지 길이 `240초`, 탈출 포탈 `210초`, 보스 타이밍, 웨이브, 마틸다 스탯/AI/모델/대사/오디오, Firebase, Graphics Studio, 타이틀, 기타 gameplay 값.

## Numeric policy
- Stage duration: `240초` 유지.
- Escape portal: `210초 = 3:30` 유지.
- Matilda warning/state transition: `225초 = 3:45`.
- Matilda physical actor / AI spawn: `230초 = 3:50`.
- Warning grace: `5초` 유지 (`230 - 225 = 5`).

## Stage coverage
| Stage | Warning | Physical/AI spawn | Shared constant reference |
| --- | ---: | ---: | --- |
| Stage 1 | 225초 (3:45) | 230초 (3:50) | `MATILDA_WARNING_SEC`, `MATILDA_SPAWN_SEC` |
| Stage 2 | 225초 (3:45) | 230초 (3:50) | `MATILDA_WARNING_SEC`, `MATILDA_SPAWN_SEC` |
| Stage 3 | 225초 (3:45) | 230초 (3:50) | `MATILDA_WARNING_SEC`, `MATILDA_SPAWN_SEC` |
| Stage 4 | 225초 (3:45) | 230초 (3:50) | `MATILDA_WARNING_SEC`, `MATILDA_SPAWN_SEC` |

## Acceptance criteria
1. `Bang_Rules.md`에 전 스테이지 마틸다 `230초` 정책이 코드 변경보다 먼저 기록되어 있다.
2. `Developer/r3f_prototype/src/lib/stageConfig.js`의 `MATILDA_SPAWN_SEC`는 `230`이고, `MATILDA_WARNING_SEC`는 `MATILDA_SPAWN_SEC - 5`로 유지된다.
3. `STAGE_CONFIGS.stage1`~`stage4`는 개별 숫자 하드코딩 없이 공유 상수 `MATILDA_WARNING_SEC`, `MATILDA_SPAWN_SEC`를 계속 참조한다.
4. `Developer/r3f_prototype/src/lib/stageConfig.test.js`는 전 스테이지 `matildaWarningSec: 225`, `matildaSec: 230`을 기대하고 테스트 제목에 `3:50`을 명시한다.
5. `Stage 3` 및 `Stage 4` 개별 config mirror 기대값도 `225/230`이다.
6. `Developer/r3f_prototype/src/components/Enemies.jsx`는 stale comment의 `300초`만 `230초`로 교정하며 런타임 로직은 변경하지 않는다.

## QA handoff for Balance_QA_Mini
- Review files:
  - `Bang_Rules.md`
  - `Planner/matilda_all_stages_230sec_2026-08-09.md`
  - `Developer/r3f_prototype/src/lib/stageConfig.js`
  - `Developer/r3f_prototype/src/lib/stageConfig.test.js`
  - `Developer/r3f_prototype/src/components/Enemies.jsx`
  - `Developer/agent_room/levelmini_matilda_all_stages_230sec_2026-08-09.md`
- Required verification from `Developer/r3f_prototype`:
  - `npm test -- src/lib/stageConfig.test.js -t 3:50`
  - `npx vitest run src/components/Game.runtimeTime.test.js src/components/Enemies.test.jsx src/components/HUD.test.jsx src/lib/matildaEntryGrace.test.js`
  - `npm run build`
  - one practical-timeout attempt of `npx vitest run`
  - scoped `git diff --check`
  - `git status --short --branch`
- Regression focus:
  - 마틸다 warning/state transition은 `225초`, physical/AI spawn은 `230초`여야 한다.
  - `240초` 스테이지 길이, `210초` 포탈, 보스 타이밍/웨이브/마틸다 스탯·AI·모델·대사·오디오는 변경되지 않아야 한다.
  - 전 스테이지가 공유 상수 참조를 유지해야 한다.
