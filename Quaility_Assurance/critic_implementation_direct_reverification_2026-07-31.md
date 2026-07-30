# 비평 후 구현 직접 재검증 보고서

- 검증일: 2026-07-31
- 검증 기준 브랜치: `zombie_only`
- 검증 기준 HEAD: `6ef2262 fix: align legal consent and settings UI`
- 검증자 역할: Sol Advisor 직접 검증
- 범위: 2026-07-30~31 비평 후 구현으로 보고된 9개 항목

## 1. 최종 판정

| 항목 | 판정 | 이번 재검증 근거 |
|---|---|---|
| Stage 1 완료 규칙 단일화 | 확인 | 소스 대조, 관련 store/stage/enemy 테스트 통과 |
| 포털 방향·거리 HUD | 확인 | 소스 대조, `portalObjective`·HUD·EscapePortal 테스트 통과 |
| 1/60 고정 시간축 | 확인 | 소스 대조, frame clock 관련 테스트 통과 |
| 마틸다 4.5초 스폰 유예 | 확인 | 소스 대조, grace·Enemies·HUD 테스트 통과 |
| 모바일 UI·접근성 | 코드/테스트 확인 | 44px, ARIA, focus-visible 소스와 테스트 통과. 실기기 미검증 |
| 혼전 플레이어 외곽선 | 코드/테스트 확인 | `depthTest=false`와 상위 render order 확인. 새 밀집 전투 육안 검증은 미실행 |
| 사운드 보이스 cap·위험 cue 보호 | 코드/테스트 확인 | 관련 테스트 및 audio manifest 통과. 실제 청취·loudness 측정은 미실행 |
| Stage 1~4 멀티-Hz parity | 확인 | 순수 시뮬레이션 30/60/120Hz 테스트 재통과. Canvas/Rapier 실통합은 범위 밖 |
| 500,000프레임 soak | 확인 | 8 seed, 정확히 500,000프레임 직접 재실행 통과 |

**구현 주장 9개는 현재 소스에 존재하고 해당 집중 검증을 통과했다.**

그러나 전체 테스트 스위트는 Firebase 격리 결함 때문에 clean PASS가 아니다. 따라서 현재 상태를 전체 릴리스 승인으로 판정하지 않는다.

## 2. 실행한 검증

### 2.1 집중 테스트

비평 개선 관련 테스트를 현재 작업 트리에서 한 번에 재실행했다.

```powershell
npm.cmd exec -- vitest run `
  src/lib/burstEvents.test.js `
  src/lib/stageConfig.test.js `
  src/store/useGameStore.test.js `
  src/store/useGameStore.unlocks.test.js `
  src/components/Enemies.test.jsx `
  src/lib/portalObjective.test.js `
  src/components/EscapePortal.target.test.jsx `
  src/components/HUD.test.jsx `
  src/lib/gameplayFrameTime.test.js `
  src/lib/usePlayingFrame.test.js `
  src/components/GameCanvas.test.js `
  src/components/Game.runtimeTime.test.js `
  src/components/Player.test.js `
  src/lib/matildaEntryGrace.test.js `
  src/components/GoogleAccountPanel.test.jsx `
  src/components/TitleScreen.settings.test.jsx `
  src/components/Lobby.test.jsx `
  src/components/PlayerMesh.test.js `
  src/lib/sfxRegistry.test.js `
  src/components/TitleScreen.bgm.test.jsx `
  src/components/GameplayBgm.test.jsx `
  src/lib/stageMultiHzParity.test.js
```

결과:

- Test files: **22 passed / 22**
- Tests: **281 passed / 281**
- 실패: **0**

### 2.2 사운드 manifest

```powershell
node scripts/verify-audio-manifest.mjs
```

결과:

- SFX ID: 75개
- fallback 파일: 150개
- canonical title BGM 확인
- project-generated gameplay BGM loop 1개 확인

### 2.3 멀티-Hz 결정론 검증

`stageMultiHzParity.test.js`는 집중 테스트에 포함해 재실행했다.

- Stage 1~4
- 동일 seed/input
- 30/60/120Hz
- 공통 1/60 fixed step
- 240초 checkpoint/final exact 비교
- 2 tests 통과

정직한 한계:

- 순수 시뮬레이션 검증이다.
- 실제 Canvas, Rapier body, WebGL, Android/WebView, 보스 본체는 포함하지 않는다.

### 2.4 500,000프레임 soak

다음 두 실행을 새로 수행했다.

```powershell
$env:SOAK_FRAMES='60000'
$env:SOAK_SEEDS='1,2,3,4'
npm.cmd exec -- vitest run src/lib/gameplaySoak.test.js --reporter=verbose
```

- 60,000프레임 × 4 seed = 240,000프레임
- 5 tests 통과
- 실행 시간 72.04초

```powershell
$env:SOAK_FRAMES='65000'
$env:SOAK_SEEDS='11,12,13,14'
npm.cmd exec -- vitest run src/lib/gameplaySoak.test.js --reporter=verbose
```

- 65,000프레임 × 4 seed = 260,000프레임
- 5 tests 통과
- 실행 시간 77.52초

합계:

- 총 프레임: **500,000**
- 총 spawn: **81,926**
- 총 kill: **76,971**
- 총 contact: **6,994**
- 총 player damage/release: **2,174 / 2,174**
- stale-handle probe: **7,988,252**
- stale-handle violation: **0**
- error event: **0**
- contact cooldown violation: **0**
- 최대 활성 적: **200**
- 최대 투사체: **6**
- 최대 overlap: **1프레임**
- 최대 stuck: **1183.33ms**
- seed별 heap growth 최대: **21MB** (`< 96MB` 기준 통과)
- 4개 stage 순회: 모든 seed에서 확인

풀 포화 중 spawn failure 1,287건은 테스트가 의도적으로 상한까지 채웠을 때 발생했으며, drop/crash가 아니라 카운터로 흡수됐다.

### 2.5 프로덕션 빌드

```powershell
npm.cmd run build
```

결과:

- branch guard 통과
- title surface canonical gate 통과
- title BGM source/artifact gate 통과
- legacy B02 source/artifact gate 통과
- Vite production build 통과
- transformed modules: 292
- 빌드 시간: 1.23초

경고:

- `vendor-three` chunk가 minified 2,796.16kB로 Vite 500kB 경고 기준을 초과한다.

### 2.6 브라우저 최소 회귀

격리 URL `http://localhost:5173/?e2e=1`에서 다음 경로를 직접 실행했다.

```text
타이틀
→ 게임 시작
→ 필수 약관 2개 체크
→ 확인 버튼 활성화
→ 로비
→ Stage 1 입장
→ 스토리 인트로 종료
→ Stage 1 HUD
```

결과:

- 타이틀 표시 정상
- 필수 약관 체크 후 확인 버튼 활성
- 약관 확인 후 로비 전환
- Stage 1 입장
- HUD의 Stage 1, 시간, HP, 일시정지 버튼 표시
- fatal localStorage overlay 없음
- 브라우저 error 레벨 로그 없음
- 장면 전환 중 `THREE.WebGLRenderer: Context Lost.` log 1건 관측

격리 E2E이므로 실제 Firebase 저장 성공의 증거로 사용하지 않는다.

## 3. 구현별 소스 대조

### 3.1 Stage 1 완료 규칙

- `Enemy.jsx`는 보스 사망 시 `recordBossDefeat()`를 호출한다.
- `useGameStore.js`의 `recordBossDefeat()`는 보스 처치 사실만 기록한다.
- 실제 stage 종료는 `clearStage()`와 포털 경로가 담당한다.
- 보스 보너스는 portal clear 결과를 계산할 때 확정한다.

판정: **구현 확인**

### 3.2 포털 방향·거리 HUD

- `HUD.jsx`가 `getPortalObjective()`를 사용한다.
- 활성 시 `탈출구 {arrow} {distanceZm}zm`을 표시한다.
- 스크린리더용 `탈출구로 이동` status도 존재한다.

판정: **구현 확인**

단, 이번 세션에서 실제 240초 플레이 후 포털이 생성되는 장면까지 새로 기다리지는 않았다.

### 3.3 1/60 고정 시간축

- `GAMEPLAY_FIXED_STEP = 1 / 60`
- accumulator에서 whole step을 계산한다.
- 모든 fixed callback에 같은 step을 전달한다.
- Game, GameCanvas, Player 관련 집중 테스트 통과

판정: **구현 확인**

### 3.4 마틸다 유예

- `MATILDA_DIALOGUE_MS = 4500`
- Enemies scheduler에 `SCHEDULE_MATILDA`가 존재한다.
- run/stage가 유지된 경우에만 유예 후 스폰한다.
- reset/stage/unmount 시 stale spawn을 취소한다.

판정: **구현 확인**

### 3.5 모바일 UI·접근성

- 계정/로비/일시정지 주요 버튼 44px 이상
- 레벨업 선택지 ARIA label
- pause 및 level-up focus-visible
- portal status와 Matilda alert/live region

판정: **코드/테스트 확인**

실제 320×568 기기, 터치, 스크린리더는 이번 재검증에서 실행하지 않았다.

### 3.6 플레이어 외곽선

- `PlayerMesh.jsx`의 crowd outline material은 `depthTest=false`
- crowd-visible 상태에서 상위 render order 사용
- PlayerMesh 관련 테스트 통과

판정: **코드/테스트 확인**

실제 90초 이상 밀집 전투 육안 검증은 이번 재검증에서 실행하지 않았다.

### 3.7 사운드 보이스 제어

- `COMBAT_VOICE_CAP = 6`
- 위험/플레이어/UI 신호 보호
- 일반 combat voice만 cap 적용
- end/stop/playerror/loaderror에서 점유 해제

판정: **코드/테스트 확인**

Android·헤드폰 청취 및 loudness/masking 측정은 미실행이다.

## 4. 전체 테스트 스위트 결과

```powershell
npm.cmd test -- --run
```

결과:

- Test files: **182 passed / 3 failed / 185 total**
- Tests: **1,542 passed / 4 failed / 1,546 total**
- Unhandled errors: **96**

최초 실패:

1. `E2ERuntimePerformanceDiagnostics.test.jsx` 1건
2. `GraphicsStudio.test.jsx` 2건
3. `resultCoinShopFlow.test.jsx` 1건
4. `StageLock.test.jsx` worker spawn/termination 오류

96개 unhandled error는 `HUD.test.jsx` 실행 중 실제 Firebase Database 연결이 발생해 `PERMISSION_DENIED`로 거부된 것이다.

이후 네 파일을 단일 worker로 격리 재실행했다.

```powershell
npm.cmd exec -- vitest run `
  src/components/E2ERuntimePerformanceDiagnostics.test.jsx `
  src/components/GraphicsStudio.test.jsx `
  src/components/resultCoinShopFlow.test.jsx `
  src/components/StageLock.test.jsx `
  --maxWorkers=1 `
  --reporter=verbose
```

결과:

- Test files: **4 passed / 4**
- Tests: **39 passed / 39**

판정:

- 최초 4건은 단독 재현되지 않아 병렬 실행·worker 자원·테스트 격리 영향으로 분류한다.
- 그러나 전체 suite가 실제 Firebase에 접근한 사실은 별도의 치명적 테스트 격리 결함이다.
- 서버가 모든 관측 요청을 `PERMISSION_DENIED`로 거부했지만, 테스트 전 Firebase snapshot이 없었으므로 프로젝트의 “테스트 전후 Firebase 완전 동일성”을 증명할 수 없다.
- 따라서 이번 전체 suite 실행은 Firebase 검증 증거로 무효이며 전체 회귀 PASS로 보고하지 않는다.

## 5. Git 품질 상태

`git diff --check`는 실패했다.

직접 확인된 원인:

- `src/components/TitleScreen.bgm.test.jsx`의 다수 CRLF 추가 줄이 trailing whitespace로 판정됨
- 여러 파일에 “LF가 다음 Git 작업에서 CRLF로 치환됨” 경고

이 검증에서는 기존 사용자·다른 에이전트 변경을 보존하기 위해 줄끝을 일괄 수정하지 않았다.

비평 산출물과 후속 구현의 상당수는 아직 미추적 또는 미커밋 상태다.

## 6. 릴리스 판정

### 확인된 통과

- 비평 개선 9개 소스 존재
- 관련 집중 테스트 281/281
- audio manifest
- 멀티-Hz 순수 parity
- 500,000프레임 soak
- production build
- 타이틀→약관→로비→Stage 1 HUD 최소 브라우저 경로

### 릴리스 전 필수 잔여

1. 전체 테스트에서 실제 Firebase 연결을 완전히 차단하거나 emulator/mock으로 격리
2. 전체 테스트 clean PASS
3. Firebase 테스트 전후 snapshot/hash 동일성 증명
4. 실제 240초 성공·실패 반복 플레이
5. 실제 포털 생성·진입·결과 화면 확인
6. 저사양 Android/AAB 10분 p95 FPS·메모리 측정
7. 실기기 터치·스크린리더·OAuth 흐름
8. 혼전 플레이어·타격·치명타·사망 효과 동적 가독성
9. Android·헤드폰 사운드 청취와 loudness/masking 측정
10. `git diff --check` 정리 및 비평 구현의 커밋 단위 확정

최종 결론: **비평 후 구현 9개는 현재 코드와 집중 검증에서 확인됐지만, 전체 회귀·실기기·실제 4분 플레이·Firebase 테스트 격리가 남아 있어 릴리스 최종 승인은 보류한다.**
