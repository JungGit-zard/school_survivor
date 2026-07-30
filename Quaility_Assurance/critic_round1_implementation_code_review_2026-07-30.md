# 1차 비평 후 구현 코드 검토 — 2026-07-30

## 범위와 방법

- 범위는 현 작업 트리의 1차 비평 대응 diff다. 코드·Firebase·Graphics Studio·브라우저 저장소에는 쓰기나 데이터 접근을 하지 않았다.
- 필독 근거: `project_develop_policy.md`, `AGENTS.md`, `SESSION_CONTINUITY.md`, 5개 1차 비평(그래픽·게임플레이·UI·기술·사운드), QA synthesis 및 현재 diff.
- 특히 Stage 1 B01/포탈/점수, Rapier fixed step과 frame delta, Google/HUD/Title, title BGM 로그인 전환, SFX voice cap, audio manifest verifier를 실행 경로로 추적했다.
- `src/lib/gameplaySoak.js/.test.js` 및 `.claude/SESSION_MEMORY` 계열은 다른 작업자 소유의 범위 밖 항목으로 취급했다. 결함 여부 판단이나 수정은 하지 않았다.
- 검증 명령: `node Developer/r3f_prototype/scripts/verify-audio-manifest.mjs`는 종료 코드 0과 `audio manifest verified: 75 SFX IDs, 150 fallback files, 1 title BGM`을 출력했다. 이 통과는 아래 매니페스트 결함 때문에 출시 승인 증거가 아니다.

## 확인된 결함

### P1 — B01 처치 후 포탈 전에 사망하면 랭킹 제출 점수가 RTDB 규칙 상한을 넘어 조용히 거부된다

- 위치: `Developer/r3f_prototype/src/store/useGameStore.js:604-623, 317-326`; 비교 기준 `Developer/r3f_prototype/database.rules.json:109,132`.
- 재현: Stage 1에서 192초 B01을 마지막으로 처치한 뒤 240초 포탈에 들어가기 전에 사망한다. `recordBossDefeat()`는 클리어 여부와 관계없이 `survivalSec + stageBonus + clearBonus`의 20%를 `bossBonus`로 저장한다. 192초 Stage 1이면 `floor((192 + 0 + 30) * .2) = 44`다. 이후 `_onRunEnd('gameover')`는 `cleared: false`인데도 이 44를 점수에 더해 236을 제출한다.
- 영향: RTDB 규칙은 `cleared === false`일 때 점수 상한을 생존 초(192)로 제한한다. 236은 검증에서 거부되고 `submitRun(...).catch(() => {})`가 실패를 숨기므로, 보스를 잡았지만 탈출에 실패한 로그인 사용자의 랭킹 기록이 빠진다.
- 최소 수정: 마지막 보스 처치는 `bossDefeated` 같은 사실만 기록하고, `bossBonus`는 `_onRunEnd`에서 `cleared`일 때만 최종 점수 정책으로 계산한다. 또는 보스 처치 실패 런에도 보상을 주기로 확정한다면 `rankingScorePolicy`와 두 RTDB 규칙의 상한을 같은 식으로 바꾼다. 현재 규칙·`databaseRules.test.js`의 honest run 정의는 전자(클리어 시만 보스 보너스)를 전제한다.
- 필요한 회귀: “192초 B01 처치 → gameover”와 “B01 처치 → portal clear”를 각각 실제 `submitRun` payload/규칙 평가까지 검증한다.

### P1 — 30Hz 미만에서 fixed Rapier 물리와 새 1/30 gameplay clamp가 서로 다른 시간을 진행한다

- 위치: `Developer/r3f_prototype/src/components/GameCanvas.jsx:21`, `Developer/r3f_prototype/src/components/Game.jsx:91-101`, `Developer/r3f_prototype/src/lib/usePlayingFrame.js:15-18`, `Developer/r3f_prototype/src/components/Player.jsx:70-130`, `Developer/r3f_prototype/src/lib/gameplayFrameTime.js:1-5`.
- 재현: 15Hz에서 한 렌더 프레임의 실제 `delta`는 약 66.7ms다. 설치된 `@react-three/rapier` 1.5.0의 fixed `timeStep={1/60}`은 accumulator로 이 delta를 네 개의 1/60 물리 step으로 소진한다. 반면 Game의 elapsed time, `usePlayingFrame` 기반 적/무기 로직, Player의 넉백·무적 timer는 33.3ms만 진행한다. 240초의 실시간 저 FPS 플레이에서 물리 이동/충돌은 약 240초, 포탈·보스·수동 적 simulation·무적 타이머는 약 120초가 된다.
- 영향: 1차 비평의 FPS 공정성 목표와 반대로, 저성능 기기에서 포탈/보스/보상 타이밍이 늦고 물리 충돌과 수동 simulation이 갈라진다. 탭 복귀처럼 큰 delta에서도 Rapier는 내부적으로 최대 0.5초까지 따라가지만 gameplay은 1/30초만 따라가므로 같은 불일치가 재현된다.
- 최소 수정: fixed-step accumulator를 게임의 모든 simulation clock에 단일 소스로 적용한다. 즉 Rapier가 실제로 소진한 fixed steps와 같은 횟수로 적·무기·elapsed·무적/넉백을 진행하고, visibility 복귀의 폐기/상한 정책도 그 단일 clock에서 처리한다. `Math.min(delta, 1/30)`만 공통 적용하는 방식은 물리 accumulator와 동기화되지 않는다.
- 필요한 회귀: 동일 입력/seed로 15/30/60/120Hz에서 240초를 수행해 elapsed, 위치, HP, contact, portal/B01 시각, invulnerability와 active enemy/projectile을 비교한다. hidden→visible 1초도 별도 포함한다.

### P1 — 360px 이하에서 Google 패널의 새 2행 레이아웃이 타이틀 카피를 덮는다

- 위치: `Developer/r3f_prototype/src/components/GoogleAccountPanel.jsx:71-88`, `Developer/r3f_prototype/src/components/TitleScreen.jsx:598-610`.
- 재현: 320×568에서 media query는 패널 폭을 거의 전체(292px)로 늘리고 action을 다음 grid 행(최소 44px)으로 보낸다. identity 행과 gap/padding까지 합치면 패널은 top 14px부터 약 90px 이상을 차지한다. 그러나 타이틀 content는 같은 화면에서 `top: max(8%, safe-area + 64px)`이므로 y=64px부터 시작하며, 패널의 z-index 3이 content의 z-index 2보다 높다.
- 영향: 이번 대응이 목표로 삼은 가장 좁은 화면에서 계정 패널이 게임명/부제의 상단을 가린다. 로그인 정보는 읽히지만 시작 화면의 제목·4분 약속이 동시에 읽히지 않는다.
- 최소 수정: 좁은 media query에서 Title content의 시작 y를 2행 패널 하단보다 아래로 옮기거나, panel/content를 공유하는 safe-area layout variable로 만든다. 320×568 signed-out, signing-in, signed-in의 세 상태를 모두 확인한다.
- 필요한 회귀: 실제 layout 측정 또는 browser screenshot으로 320×568/390×844에서 Google 패널, 게임명, 부제, CTA의 bounding box가 겹치지 않음을 검사한다.

### P1 — Howler load error가 combat voice token을 해제하지 않아 voice cap이 영구적으로 막힐 수 있다

- 위치: `Developer/r3f_prototype/src/lib/sfxRegistry.js:113, 148-149, 245, 257-267`.
- 재현: 네트워크/codec 오류 상태에서 서로 다른 combat SFX 여섯 개를 처음 재생한다. `play()`가 반환한 각 soundId는 `_activeCombatVoices`에 추가된다. 이후 `onloaderror`는 `_failed`와 cache만 바꾸며 token을 지우지 않는다. Howler의 load error는 queued play에 대해 `onend`/`onstop`을 보장하지 않으므로 여섯 token이 남고, 이후 모든 비보호 combat SFX는 cap check에서 즉시 반환된다.
- 영향: 일부 오디오 파일만 로드 실패해도 현재 세션의 무기/적 combat feedback이 전부 무음이 될 수 있다. protected danger cue만 cap을 우회하므로, 문제 원인이 더 알아차리기 어렵다.
- 최소 수정: `onloaderror`에서 해당 logical ID의 활성 token 전체를 제거한다(단일 error callback에는 soundId가 null일 수도 있으므로 `id:` prefix 전체 제거가 안전). `onloaderror` 뒤 다른 정상 combat SFX가 다시 재생되는 mock 회귀를 추가한다.

### P1 — audio manifest 검증기가 라이선스 미확인 title BGM을 성공으로 선언한다

- 위치: `Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json:1515-1518`, `Developer/r3f_prototype/scripts/verify-audio-manifest.mjs:47-78, 87`.
- 재현: 현 manifest의 `titleBgm`은 `licenseEvidence: "unverified"`, source도 원천/라이선스 기록이 없다고 명시한다. verifier는 빈 문자열만 실패시키므로 이 값을 정상 증거로 취급하고 성공 메시지를 출력한다.
- 영향: `npm run verify:audio-manifest`가 성공해도 타이틀 BGM의 배포 권리가 확인되지 않았다. 사운드 1차 비평의 ‘title BGM 포함 1:1 provenance’ 합격 조건을 잘못 녹색으로 보이게 해 출시 판단을 오도한다.
- 최소 수정: `unverified`/`unknown` 같은 비승인 상태를 실패로 만들고, 실제 상업 배포 가능 원천·라이선스/귀속 증거가 입력된 뒤에만 통과시키거나, 현재처럼 미확인 자산이 있으면 검증 명령과 출력 모두를 `pending`으로 명확히 분리한다.

### P2 — verifier는 logical ID와 파일 경로의 1:1 연결을 확인하지 않는다

- 위치: `Developer/r3f_prototype/scripts/verify-audio-manifest.mjs:34-40, 45-78`.
- 재현: 두 manifest asset의 `paths` 배열을 서로 바꾸되, 모든 경로·byte·SHA-256·logical ID 집합을 유지한다. verifier는 전역 `manifestPaths`/`manifestLogicalIds` Set만 대조하므로 성공한다.
- 영향: 개별 SFX의 provenance/hash가 다른 logical ID에 붙어도 검증이 통과한다. 파일 전체가 존재한다는 것만 증명하고 `pencilFire`가 실제 `pencilFire.ogg/.mp3` 대장인지 증명하지 못한다.
- 최소 수정: registry에서 `logicalId -> [ogg, mp3]` 기대 맵을 만들고 manifest의 같은 logicalId `paths`와 정확히 비교한다. title BGM도 별도 exact path로 비교한다.

## 확인했으나 이번 diff에서 결함으로 확정하지 않은 항목

- Stage 1 시간축은 B01 warning 186초, B01 burst 192초, portal 240초로 정렬돼 있고, 보스 처치는 `recordBossDefeat()`만 호출해 즉시 clear/run end하지 않는다. `bossAliveCount <= 0` 가드로 중복 defeat는 false가 되며, 다중 보스의 중간 처치는 count만 감소한다. 위 P1은 이 흐름의 **점수/규칙 불일치**이지 즉시 클리어 회귀가 아니다.
- Title BGM은 `signingIn` 변화에 `useLayoutEffect`로 `suspendForSignIn()`을 호출하며, timer/retry listener를 해제하고 pause한다(`TitleScreen.jsx:203-234`). 해당 mount 안에서는 로그인 취소 뒤 자동 재시작하지 않는 명시 정책도 가드와 일치한다. 소스만으로 추가 lifecycle 결함은 확정하지 않았다.
- HUD pause 44×44, focus-visible, level-up card aria label/좁은 폭 텍스트 축소는 diff상 존재한다. 단, 실제 touch/screen-reader/노치 기기 검증은 아직 없다.
- 검토한 변경 파일에서 새 `localStorage`/`sessionStorage` 접근은 발견하지 못했다. Firebase Auth/Graphics Studio input/Apply/revision 경로도 이 diff의 변경 범위가 아니다. Firebase 데이터는 읽거나 변경하지 않았다.

## 잔여 증거 공백 (결함 판정과 별개)

- 실제 Canvas/Rapier에서 15/30/60/120Hz와 hidden→visible을 비교한 증거가 없다.
- 320×568/390×844 실제 Google 로그인 세 상태, HUD/level-up/pause 키보드·screen-reader 및 4분 전투 증거가 없다.
- Android 스피커와 desktop 헤드폰의 title/login/stage/boss/pause/result 청취 및 load-error 행동 증거가 없다.
- 75 SFX + title BGM의 loudness/peak/duration과 title BGM의 실제 라이선스 증거가 없다.

## 라우팅 및 상태

Subagent mandatory routing

- Board: `escape-zombie-school`
- Trigger: 1차 비평 대응 구현의 QA/코드 검토.
- Specialist evidence: 5개 critic 보고서와 synthesis를 검토 근거로 사용했다. 오디오 파일은 진행 중인 sound worker가 별도 소유하므로 수정하지 않았다.
- Changed by this reviewer: 이 QA 기록 파일 하나뿐이다. 코드·설정·자산·Firebase·Graphics Studio 변경 없음.
