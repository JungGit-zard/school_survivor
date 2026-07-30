# Round 2 사운드·전투 피드백 비평 — 2026-07-30

## 역할·범위·판정 원칙

- 역할: 동일 5인 비평 체계의 `soundmini` 관점 Round 2 비평가. 코드, 음원 파일, Firebase, Graphics Studio, 브라우저 저장소를 변경하지 않았다.
- 비교 기준: `critic_round1_audio_feedback_2026-07-30.md`의 4.6/10과 같은 공통 7개 범주·가중치(시각 15%, 전투 20%, 성장 12%, UI 25%, 오디오 8%, 성능 10%, 제품 10%)를 사용했다.
- 엄격 게이트: Android 스피커와 데스크톱 헤드폰에서 `title → login → lobby → stage → boss → pause/resume → result`를 10분 이상 녹화·청취하고, 상태별 의도 트랙 1개 이하, danger/player cue 누락 0, combat voice cap 준수, clipping/masking 없음, 75 SFX와 title BGM의 loudness·peak·duration·license·source·SHA-256 1:1 검증이 모두 있어야 오디오/피드백 또는 종합 8.0 이상을 줄 수 있다. 자동 테스트는 이를 대체하지 않는다.

## 이번 차수에서 확보한 근거

1. `sfxRegistry.js`에는 combat voice cap `6`과 combat/protected 분류가 추가됐다. 무기·일반 적 계열 combat voice는 cap에 도달하면 억제하고, `bossRoar`, `matildaDash`, `playerHit`을 포함한 player/UI/event 및 지정 danger cue는 보호한다. `onend`, `onstop`, `onplayerror`, `onloaderror`에서 combat token을 정리하는 경로도 있다.
2. `TitleScreen.jsx`는 title BGM을 loop·0.5 volume으로 만들며, `signingIn=true`가 되면 즉시 pause하고 같은 mount에서 재시도를 다시 열지 않는다. `TitleScreen.bgm.test.jsx`가 이 동작을 검증한다.
3. `audio_asset_provenance_manifest_2026-07-30.json`은 75 SFX logical ID의 OGG/MP3 150개와 title BGM 1개를 SHA-256·bytes와 연결했다. 즉 현재 manifest에는 총 76 logical ID와 151 파일 경로가 있다. `verify-audio-manifest.mjs`는 registry logical ID와 각 경로의 정확한 매핑, byte, SHA-256, 미승인 licenseEvidence를 검사한다.
4. 직접 재실행한 자동 검증: `npm.cmd exec -- vitest run src/lib/sfxRegistry.test.js src/components/TitleScreen.bgm.test.jsx scripts/verify-audio-manifest.test.js`는 **3 files / 26 tests 통과**했다. 이는 cap·load error·보호 cue·title sign-in lifecycle·검증기 계약의 코드 근거다.
5. 실제 verifier `node scripts/verify-audio-manifest.mjs`는 **`audio manifest: license pending/unapproved: titleBgm (unverified)`로 exit 1**이다. 이 실패는 의도적으로 숨기지 않은 출시 차단 상태다.
6. `Quaility_Assurance/critic_round2_runtime_browser_validation_2026-07-30.md`는 브라우저 장면·콘솔 및 단위 테스트 근거를 분리해 기록했지만, 명시적으로 Android/헤드폰 청취, clipping/masking 관찰, voice cap 실제 관찰, title BGM license·측정값은 미검증이라고 한다.
7. `rg`로 런타임 오디오 생성/재생 지점을 확인했을 때 loop BGM은 `TitleScreen.jsx`의 `title_bgm.m4a`만 있다. `SfxLayer`/Howler와 dialogue oscillator 외에 stage/boss/result에서 lifecycle을 갖는 **gameplay BGM은 없다**.

## 공통 7개 범주 점수

| 범주 | Round 1 | Round 2 | 가중치 | 판정 근거 |
|---|---:|---:|---:|---|
| 1. 시각 가독성·아트 | 6.0 | 6.2 | 15% | 모바일 군중 정지 프레임의 기존 캐릭터 외곽선 식별은 전보다 낫다. 다만 SFX와 VFX·위험 경고가 함께 읽히는 동적 청취 장면은 없다. |
| 2. 전투 루프·감각 | 5.0 | 6.2 | 20% | combat cap 6, danger/player 보호, load-error token 회수는 명확한 진전이다. 그러나 고빈도 타격·보스 경고의 실제 onset, 마스킹, 피로, 회피 체감은 청취하지 않았다. |
| 3. 성장·밸런스 | 4.0 | 4.8 | 12% | 보스/포털 점수 흐름의 코드 정합성은 개선됐다. 레벨업 선택→화력→소리 보상과 장기 생존의 실제 플레이·청취 자료는 없다. |
| 4. UI·모바일·접근성 | 4.0 | 5.0 | 25% | 로그인 시작 시 title BGM이 멈추고 auth overlay SFX 정책은 있다. BGM/SFX 개별 접근성, 청각 대체 신호, 실제 모바일 전환 청취, 전 상태 접근성은 미증명이다. |
| 5. 오디오·피드백 | 4.0 | 5.4 | 8% | cap·보호 cue·정확 경로/SHA verifier·sign-in pause는 유의미한 개선이다. gameplay BGM 부재, 실청취 부재, title BGM 권리 미확인, 76개 logical asset의 duration/peak/loudness 전부 부재 때문에 8점은 불가하다. |
| 6. 성능·안정성 | 4.5 | 5.3 | 10% | lazy Howl cache·cooldown·combat cap은 난전 비용과 소리 폭주를 낮춘다. protected cue에는 총 동시 상한이 없고 거리/화면 밖 감쇠·Android 10분 오디오 soak도 없다. |
| 7. 제품성·온보딩·리텐션 | 4.0 | 4.8 | 10% | title/login 중복 재생 위험은 줄었다. 하지만 stage→boss→결과의 음악적 긴장 곡선과 결과 보상, 첫 60초 청각 안내는 없다. |

**soundmini 가중 종합: 5.4 / 10 — FAIL (8.0 미달)**

계산: `6.2×0.15 + 6.2×0.20 + 4.8×0.12 + 5.0×0.25 + 5.4×0.08 + 5.3×0.10 + 4.8×0.10 = 5.438`, 반올림 5.4.

Round 1의 **4.6 → 5.4 (+0.8)**는 코드상 위험음 보존·전투 cap·로그인 전환·SHA/path 검증의 개선을 반영한다. 그러나 이는 제품 음향 품질 합격이 아니라, 미검증 항목을 유지한 보수적 점수다.

## 8점 게이트 대조

| 필수 조건 | 상태 | 근거 / 결손 |
|---|---|---|
| Android 스피커 + 데스크톱 헤드폰, 전 상태 10분 녹화·청취 | **미충족** | 해당 녹화·청취표·장치 정보·청취자 기록이 없다. 브라우저 스크린샷과 Vitest는 대체 증거가 아니다. |
| 상태별 의도 트랙 1개 이하, pause/resume 포함 | **미충족** | title의 login pause 코드만 확인됐다. gameplay BGM이 없으므로 stage/boss/result의 트랙 lifecycle을 검증할 대상 자체가 없다. |
| danger/player cue 누락 0, combat voice cap 실제 준수 | **부분 충족 / 미검증** | unit test는 code path를 보장한다. 대량 전투의 실제 출력에서 누락·cap·마스킹을 관찰하지 않았다. |
| clipping/masking 없음 | **미충족** | loudness·peak 측정과 실청취 모두 없다. |
| 75 SFX + title BGM 1:1 provenance 및 SHA | **부분 충족** | 75 SFX/150 fallback과 title BGM 1개에 bytes/SHA/path는 있다. 하지만 titleBgm licenseEvidence가 `unverified`라 verifier가 exit 1이다. |
| 모든 logical asset의 duration·peak·loudness | **미충족** | manifest 76개 logical asset 모두에 세 측정 필드가 없다. |

## 우선순위 피드백

| 우선순위 | 문제 | 최소 개선 또는 반드시 필요한 증거 |
|---|---|---|
| P0 | title BGM 권리가 미확인이라 실제 verifier가 실패한다. | 권리자·상업 배포 허용 범위·출처를 검증 가능한 기록으로 확보한다. 확보 불가면 해당 파일을 출시 경로에서 제거하거나, 명확한 프로젝트 생성 원천을 가진 대체 자산으로 교체한 뒤 SHA manifest를 갱신한다. `unverified`를 임의로 승인값으로 바꾸면 안 된다. |
| P0 | stage/boss/result gameplay BGM lifecycle이 없다. | 최소 한 개의 명확한 권리·원천 BGM을 stage 시작/일시정지/재개/결과/이탈에서 한 트랙 이하로 관리하고, title/login BGM과 겹치지 않는 lifecycle 테스트를 만든다. 그 뒤 실기기 전 상태 녹화로 확인한다. |
| P0 | 8점 게이트의 실제 청취가 전혀 없다. | Android 소형 스피커와 데스크톱 헤드폰 각각에서 10분 이상 동일 전환을 녹화하고, 상태별 track 수, bossWarning/playerHit/Matilda cue, combat cap, clipping/masking을 시간표로 남긴다. 두 출력 장치에서 모두 실패 0이어야 한다. |
| P1 | 76개 logical asset의 duration·peak·loudness가 없다. | 신뢰 가능한 디코더/측정 도구로 한 표를 생성하고, danger/player/BGM 목표 상대 음량 및 초과 시 수정 기준을 정한다. 측정만으로 재인코딩하거나 음량을 추정해 바꾸지 않는다. |
| P1 | protected cue는 combat cap에서 제외되어 전체 동시에 재생되는 수와 mix headroom이 관찰되지 않는다. | 수동 난전 녹화에서 protected cue가 필요한 순간 들리되 과도하게 중첩되지 않는지 검증한다. 문제가 재현될 때만 기존 priority 구조 안에서 최소한의 제한/ducking을 설계한다. |
| P2 | 고빈도 다섯 ID의 타격 순간·반복 피로 자료가 없다. | `pencilHit`, `flaskTick`, `stunGunHit`, `starlinkExplosion`, `zombieDeath`를 두 출력 장치에서 발사/명중/AOE/동시무기 사례로 청취표에 남기고, 문제가 확인된 ID만 cooldown 또는 volume 하나씩 조정한다. |

## 최종 판정

**FAIL. Round 2 soundmini 점수는 5.4/10이며 8점 이상 기준을 충족하지 못했다.**

현재 자동 테스트 26건과 manifest의 SHA/path 연결은 다음 작업의 안전장치로 인정한다. 하지만 실제 manifest verifier의 titleBgm 권리 실패, gameplay BGM 부재, 측정표 부재, Android/헤드폰 10분 청취 부재가 동시에 남아 있으므로 이를 사운드 품질·출시 준비 또는 8점 통과로 해석할 수 없다.

## 라우팅 증거

- 이 문서는 `soundmini`의 Round 2 직접 검토 산출물이며, `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`의 오디오 specialist 참여 기록으로 사용한다.
- Firebase, Graphics Studio, localStorage, 음원 자산은 변경하지 않았다.
