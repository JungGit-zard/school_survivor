# Stage 2 Corridor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use Superpowers TDD and verification before implementation completion. Steps use checkbox syntax for tracking.

**Goal:** Stage 2를 Stage 1과 분리된 300초 복도형 원거리 투사체 스테이지로 실제 플레이 가능하게 만든다.

**Architecture:** Stage 설정은 `stageConfig.js`의 스테이지 레지스트리에 모으고, store는 현재 `stageId`를 기준으로 클리어 기록과 생존 기록을 분리한다. `Enemies.jsx`는 Stage 1 웨이브를 유지하면서 Stage 2 전용 웨이브/버스트/스폰 규칙을 선택한다. E04 투사체 제한은 순수 규칙 함수로 먼저 테스트한 뒤 `Enemy.jsx`에 연결한다.

**Tech Stack:** React, React Three Fiber, three.js, @react-three/rapier, Zustand, Vitest.

---

## Confirmed MVP

- Stage 1은 기존 300초 생존, Stage 1 웨이브, Stage 1 보스 경고, Stage 1 기록을 유지한다.
- Stage 2는 선택 가능한 스테이지로 추가한다.
- Stage 2 잠금 해제 조건은 Stage 1 1회 클리어 또는 Stage 1 180초 이상 생존 3회 중 하나다.
- Stage 2 클리어는 `stage2Clears`를 올리고 `stage1Clears`를 오염시키지 않는다.
- Stage 2 최고 생존 시간은 `stage2BestSurvivalSec`에 별도 저장한다.
- E04는 Stage 2에서만 90초 이후 등장한다.
- E04는 스폰 후 첫 발사 900ms 지연, 화면 내 탄환 전역 상한 6발, 시간대별 E04 개체 상한을 가진다.
- B01은 Stage 2에서도 240초 등장, 자체 탄환 없음, 추격/돌진 압박만 담당한다.
- Stage 2 시각 MVP는 충돌형 복도 전체 리라이트가 아니라 바닥/레인/경고선으로 복도감을 먼저 만든다.

## File Map

- Modify: `Developer/r3f_prototype/src/lib/stageConfig.js`
  - Stage 1/2 설정, 잠금 조건, duration, boss warning, E04 warning timing.
- Modify: `Developer/r3f_prototype/src/lib/playerRecords.js`
  - Stage 2 기록 키와 Stage 1 180초 생존 카운트 키 추가.
- Modify: `Developer/r3f_prototype/src/store/useGameStore.js`
  - `currentStageId`, stage-aware `resetGame`, `clearStage`, `_onRunEnd`, milestone lookup.
- Modify: `Developer/r3f_prototype/src/App.jsx`
  - `TitleScreen`에서 선택한 stageId를 `resetGame(stageId)`로 전달.
- Modify: `Developer/r3f_prototype/src/components/TitleScreen.jsx`
  - Stage 1/2 선택과 Stage 2 잠금 안내 추가.
- Modify: `Developer/r3f_prototype/src/components/Game.jsx`
  - 현재 스테이지 duration 사용.
- Modify: `Developer/r3f_prototype/src/components/Enemies.jsx`
  - Stage 2 전용 wave/burst/spawn 선택.
- Modify: `Developer/r3f_prototype/src/components/Enemy.jsx`
  - E04 발사 규칙 연결, 첫 발 지연, 전역 탄환 상한.
- Modify: `Developer/r3f_prototype/src/components/HUD.jsx`
  - Stage 표시, Stage 2 E04 첫 등장 경고, stage-aware 보스 경고/결과 문구.
- Create: `Developer/r3f_prototype/src/lib/stage2ProjectileRules.js`
  - E04 발사 가능 여부를 순수 함수로 검증.

## Tasks

### Task 1: Stage Registry And Records

- [ ] RED: `stageConfig` 테스트로 Stage 1/2 duration, unlock 조건, Stage 2 reward label을 검증한다.
- [ ] RED: `playerRecords` 테스트로 `stage2Clears`, `stage2BestSurvivalSec`, `stage1Survival180Runs` 기본값을 검증한다.
- [ ] GREEN: `stageConfig.js`를 레지스트리로 확장하고 `playerRecords.js` 키를 추가한다.

### Task 2: Store Stage Flow

- [ ] RED: Stage 2 클리어가 `stage2Clears`만 올리는 테스트를 추가한다.
- [ ] RED: Stage 1 180초 이상 gameover가 `stage1Survival180Runs`를 올리는 테스트를 추가한다.
- [ ] GREEN: `currentStageId`, `resetGame(stageId)`, stage-aware `_onRunEnd`를 구현한다.

### Task 3: Stage Selection UI

- [ ] RED: `TitleScreen`에서 Stage 2 잠금/해금 표시와 선택 콜백을 검증한다.
- [ ] GREEN: 기존 설정 모달 변경을 보존하면서 Stage 선택 버튼을 추가한다.

### Task 4: Stage 2 Spawn Data

- [ ] RED: Stage 1 웨이브에 E04가 없고 Stage 2는 90초 이후 E04를 포함하는 테스트를 추가한다.
- [ ] GREEN: `Enemies.jsx`를 stage-aware로 바꾸고 Stage 2 전용 wave/burst를 연결한다.

### Task 5: E04 Projectile Gate

- [ ] RED: `stage2ProjectileRules` 테스트로 첫 발 지연, 전역 상한 6, 90초 전 금지, 근접 금지, 보스 구간 억제를 검증한다.
- [ ] GREEN: 순수 함수 구현 후 `Enemy.jsx`의 E04 발사 분기에 연결한다.

### Task 6: Stage 2 Visual And HUD

- [ ] RED: HUD 경고/결과 문구가 stage-aware인지 테스트한다.
- [ ] GREEN: Stage 2 전용 레인 바닥 신호, E04 경고, Stage 2 결과 문구를 추가한다.

### Task 7: Verification

- [ ] `npm test -- --run` 또는 `npm test`를 실행한다.
- [ ] `npm run build`를 실행한다.
- [ ] 브라우저에서 Stage 1 회귀와 Stage 2 진입/경고/스폰/클리어를 확인한다.
- [ ] QA 기록을 `Quaility_Assurance/`에 남긴다.

## Superpowers Self-Review

- Spec coverage: Stage 2 선택, 기록 분리, E04 도입/제한, B01 비탄환, Stage 1 회귀, 그래픽 가독성까지 Task에 포함했다.
- Placeholder scan: 구현을 미루는 항목 없이 MVP 기준을 확정했다. `armor` 패시브 보상은 계획서에서도 미확정이므로 1차 MVP에서 제외하고 골드/기록 중심으로 둔다.
- Scope check: 충돌형 복도 맵 전체 리라이트는 제외한다. 이번 작업은 playable Stage 2 MVP에 집중한다.
- Type consistency: Stage id는 `stage1`, `stage2` 문자열을 사용한다.
