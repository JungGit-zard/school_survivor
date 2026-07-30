# 비평 라운드 2 구현 정확성 검토

## 범위와 방법

- 기준: `ba8b490` 대비 현재 작업 트리의 Stage 1 240초/보스/포탈, 60Hz 고정 스텝, 랭킹 점수, E2E, 마틸다, 모바일 UI, 오디오, 플레이어 군중 가독성 변경.
- 필수 정책과 이전 검토를 확인했다: `project_develop_policy.md`, `Bang_Rules.md`, `Developer/agent_room/r3f_rapier_vampire_survivor_stability_rules.md`, `Quaility_Assurance/critic_round1_implementation_code_review_2026-07-30.md`.
- 실제 Firebase 데이터와 Graphics Studio Apply는 호출하지 않았다.
- 검증 명령: `npm.cmd test -- --run src/components/PlayerMesh.test.js src/lib/sfxRegistry.test.js src/lib/gameplayFrameTime.test.js src/lib/matildaEntryGrace.test.js src/lib/rankingScorePolicy.test.js src/lib/consent.test.js src/lib/e2eAuth.test.js src/store/useGameStore.test.js src/components/Enemies.test.jsx src/components/Game.runtimeTime.test.js src/lib/usePlayingFrame.test.js` (11 files, 158 tests 통과), `git diff --check` 통과.
- P1 수정 후 후속 검증: `npm.cmd test -- --run src/lib/portalSuctionClock.test.js src/lib/matildaEntryGrace.test.js src/components/Enemies.test.jsx src/components/HUD.test.jsx` (4 files, 107 tests 통과), `git diff --check` 재통과.
- P2 수정 후 최종 검증: `npm.cmd test -- --run src/lib/portalSuctionClock.test.js src/lib/portalVisualState.test.js src/lib/matildaEntryGrace.test.js src/components/Enemies.test.jsx src/components/HUD.test.jsx` (5 files, 110 tests 통과), 직접 271-step probe 결과 completion step `[270]`, `git diff --check` 재통과.

## 해소된 Findings

### 해소됨 — P1 포탈 흡입 완료의 고정 스텝/숨김 탭 clamp 우회

- 위치: `Developer/r3f_prototype/src/components/EscapePortal.jsx:50-88`, `Developer/r3f_prototype/src/lib/portalSuctionClock.js:1-32`
- 수정 근거: 완료 상태는 `createPortalSuctionClock()`의 60Hz clock으로 이동했고 `advancePortalSuctionClock()`이 공용 `runGameplayFixedSteps()`를 사용한다. raw 1초 delta는 0.5초로 제한되어 한 번에 clear할 수 없다.
- 경계 근거: trigger frame은 clock을 reset한 뒤 return하므로 복귀 hitch의 delta를 흡입 시간으로 소비하지 않는다. 120Hz 잔여는 두 render에 한 fixed step으로 보존되며, `complete` 가드와 `completedNow` edge는 clear 자격을 정확히 한 번만 반환한다.
- 테스트 근거: `portalSuctionClock.test.js` 4개가 0.5초 clamp, 완료 edge 1회, reset/trigger-frame 계약, 120Hz 잔여를 검증해 통과했다.
- 판정: 기존 P1은 해소됐다.

### 해소됨 — P1 마틸다 유예의 pause/level-up 벽시계 소진

- 위치: `Developer/r3f_prototype/src/components/Enemies.jsx:1031-1095`, `Developer/r3f_prototype/src/components/Enemies.jsx:1186-1191`, `Developer/r3f_prototype/src/lib/matildaEntryGrace.js:1-42`
- 수정 근거: `setTimeout`은 제거됐다. 남은 유예는 `usePlayingFrame`의 gameplay fixed step에서만 감소하므로 pause/level-up 중 벽시계 시간은 소진되지 않는다.
- 프레임 안정성 근거: `usePlayingFrame`은 entry ref와 scalar typed queue만 갱신하고 `SCHEDULE_MATILDA`를 enqueue한다. `addEnemies()` 및 그 안의 `setSpecialEnemies()`는 다음 브라우저 RAF의 `processScheduled`에서만 실행되어 프레임 callback에 React state mutation을 재도입하지 않았다.
- stale/reset 근거: stage/gameKey effect가 schedule indices 및 `queue.matildaEntry`를 비우고 기존 entry를 cancel한다. 소비 시 cache/store stage와 gameKey를 다시 비교하고, `canSpawnMatildaEntry()`가 matildaSpawned 및 terminal phase를 재검증한다. pause/level-up에서는 RAF queue 자체가 소비되지 않고 playing 복귀 effect가 다시 예약한다.
- 테스트 근거: `matildaEntryGrace.test.js`와 `Enemies.test.jsx`가 gameplay-time countdown, pause 보존, stage/gameKey/terminal rejection, cancel, frame-callback/RAF 분리를 검증해 통과했다.
- 판정: 기존 P1은 해소됐다.

## 추가로 해소된 Findings

### 해소됨 — P2 마틸다 4.5초 countdown의 1 fixed-step 지연

- 위치: `Developer/r3f_prototype/src/lib/matildaEntryGrace.js:33-41`
- 수정 근거: `MATILDA_ENTRY_EPSILON_MS = 1e-6` 이하의 부동소수점 잔여를 0으로 정규화한 뒤 완료한다.
- 경계 근거: `1 / 60`을 269회 전달하면 모두 false이고, 270번째에 true, 271번째에는 다시 false다. 직접 probe도 `{ "hit":[270], "remainingMs":0, "pending":false }`를 반환했다.
- 테스트 근거: `matildaEntryGrace.test.js`에 실제 270-step 반복 회귀가 추가되어 통과했다.
- 판정: 기존 P2는 해소됐다.

### 해소됨 — P2 포탈 useFrame의 직접 React state mutation

- 위치: `Developer/r3f_prototype/src/components/EscapePortal.jsx:57-75`
- 수정 근거: `useState`/`setSucking`을 제거하고 `ringMaterialRef`, `glowMaterialRef`, `portalLightRef`에 기존 흡입 시각값을 명령형으로 적용한다. frame callback은 ref 및 Three 객체만 변경한다.
- 시각 동등성 근거: `portalVisualState.js`가 기존 흰색, ring emissive 3, glow emissive 1.5/opacity 0.7, light intensity 6을 그대로 적용한다.
- 테스트 근거: `portalVisualState.test.js`가 모든 시각값과 `EscapePortal.jsx`의 `useState`/`setSucking` 부재 및 세 ref 연결을 검증해 통과했다.
- 판정: 기존 P2는 해소됐다.

## 활성 Findings

- 없음. 현재 검토 범위의 활성 P0/P1/P2는 0건이다.

## 확인된 정상 항목

- 미클리어 랭킹은 `getRankingScore()`가 boss bonus를 무시하고, 포탈 clear에서만 `getBossClearBonus()`를 확정한다. 보스 처치 뒤 게임오버/포탈 clear 경로 테스트가 통과했다.
- DEV E2E consent는 메모리 runtime만 바꾸며 `keepCloudUserNull` 경로라 Firebase save를 요청하지 않는다. production은 `import.meta.env.DEV` 가드로 비활성이다. `e2eInvincible`도 reset 시 false로 초기화되고 중앙 `damagePlayer`에서 normal/ignore-invulnerability 피해 모두 차단한다.
- `sfxRegistry`의 onloaderror는 논리 ID의 모든 combat voice token을 해제한다. cap/protected cue 회귀 테스트가 통과했다.
- 플레이어 가독성 변경은 새 링/화살표/조준 표식이 아니라 `PlayerOuterOutline`의 기존 외곽선 5개에만 적용됐다. `depthTest: false`, `depthWrite: false`, `renderOrder: 90`이며 Studio transform/Firebase/localStorage 경로는 건드리지 않았다. 기존 바닥 그림자의 `circleGeometry`는 새 위치 표식이 아니다.
- `git diff --check` 오류는 없었다.

## 남은 테스트 공백

- 포탈 pure clock 경계는 검증됐지만 `EscapePortal` 컴포넌트에서 trigger frame delta를 소비하지 않고 clear action을 한 번만 호출하는 통합 테스트는 없다.
- 마틸다 테스트는 pause/level-up 미호출 계약과 stale 순수 함수를 검증하지만, 실제 phase 전환 → RAF 보류 → playing 복귀 → spawn 1회를 실행하는 컴포넌트 통합 테스트는 없다.
- Canvas/Rapier 실제 15/30/60/120Hz 및 hidden/visible 전환은 순수 fixed-step 테스트만 있고 통합 렌더 증거는 별도 런타임 QA가 필요하다.

## 결론

후속 수정과 최종 재검증으로 기존 P1 두 건과 추가 P2 두 건이 모두 해소됐다. **활성 P0 = 0, 활성 P1 = 0, 활성 P2 = 0**이다. 그 외 이번 범위에서 새 원형 플레이어 표식, Firebase/Graphics Studio 저장 위반, localStorage 재도입, uncleared boss score cap 우회, 명백한 audio token leak은 확인되지 않았다.
