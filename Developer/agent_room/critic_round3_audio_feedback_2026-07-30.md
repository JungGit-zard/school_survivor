# Sound_Mini Round 3 오디오 비평 — 2026-07-30

## 역할·범위·판정 원칙

- 역할: `soundmini` / Sound_Mini 독립 비평가. 이 문서는 오디오 specialist 참여 trail이며, Round 2의 **5.4 / 10**과 같은 7개 공통 범주·가중치(15/20/12/25/8/10/10)를 사용해 재채점한다.
- 범위: `project_develop_policy.md`, Round 1·2 audio feedback, Round 1 synthesis gate, Round 3 BGM 기록, provenance manifest, 생성·검증 스크립트와 대상 테스트, `GameplayBgm`, `TitleScreen`, `ReadyGameApp`, `sfxRegistry`를 읽고 검증했다.
- 비범위: 구현, 자산 조정, Firebase/Graphics Studio 데이터·코드, 브라우저 `localStorage` 접근 또는 변경은 하지 않았다. 기존의 더러운 작업 트리 파일도 되돌리거나 수정하지 않았다. 이 보고서만 추가한다.
- 엄격한 원칙: 코드·unit test·PCM 수치가 통과해도 실제 Android/헤드폰 청취, LUFS, clipping, masking을 대신하지 않는다. 그런 결과는 추정하지 않는다.

## 직접 대조한 Round 3 증거

| 항목 | 확인 결과 | 한계 |
| --- | --- | --- |
| 권리·출처 | 기존 `title_bgm.m4a`의 `unverified` 출처를 승인으로 바꾸지 않고, 프로젝트 결정론 PCM 생성물 두 개로 대체했다. manifest는 `project-generated-procedural-no-external-samples`, 생성 스크립트, exact path/bytes/SHA-256을 기록한다. | 외부 샘플이 없다는 것은 코드·manifest 검증 근거다. 배포 기기에서의 재생 품질 근거는 아니다. |
| BGM 형식·무결성 | `titleBgm` 및 `gameplayBgm`은 각각 352,844 bytes, 8초, 22,050 Hz, mono, PCM16이다. SHA-256은 각각 `e9fa…cc756`, `1bde…6d8d8`; PCM peak/RMS는 각각 0.312204/0.124328, 0.311319/0.125392이다. | PCM peak/RMS는 LUFS 또는 실제 체감 음량이 아니다. |
| 매니페스트 | `npm.cmd run verify:audio-manifest`를 직접 실행해 `75 SFX IDs, 150 fallback files, 2 project-generated BGM loops`를 확인했다. verifier는 path, byte, SHA, logical ID, 생성 BGM 형식·PCM 필드, 미승인 license evidence를 거부한다. | 75 SFX 전체의 duration/true peak/LUFS 측정 필드는 아직 없다. |
| 재생 생명주기 | `TitleScreen`은 첫 pointer/touch/key 제스처 뒤에만 title BGM을 시도하고, `signingIn`·unmount에서 pause/source 해제를 한다. `GameplayBgm`은 `ReadyGameApp`의 `screen === 'game'`에서만 마운트되어 `playing` 재생, `paused`/`levelup` pause, terminal/unmount 해제를 한다. | 브라우저/Android 실제 상태 전환에서 트랙 수와 소리를 아직 관찰하지 않았다. |
| 중복·보이스 상한 | `sfxRegistry`는 반복 combat voice에 cap 6, cooldown, `onend`/`onstop`/`onplayerror` 토큰 해제를 둔다. danger/player/UI 계열은 보호한다. | 보호 cue에는 전역 상한·ducking이 없으므로 혼전 headroom과 masking은 미증명이다. |
| 직접 재실행 | 대상 Vitest: **4 files / 13 tests passed**. 전체 `npm.cmd test -- --silent --reporter=dot`은 branch/legacy gate 포함 exit 0. `npm.cmd run build`도 exit 0, Legacy B02 artifact gate 통과. | 전체 테스트의 숫자 `176 files / 1498 tests`는 작업 요청에 제공된 결과이며, 이번 dot reporter 출력에는 집계 줄이 표시되지 않았다. 빌드에는 기존 `vendor-three` gzip 965.62 kB 경고가 남는다. |

## 오디오 평가 축

| 축 | 코드·정적 근거 평가 | 아직 없는 직접 근거 |
| --- | ---: | --- |
| 권리/출처 | **9.0 / 10** | 생성물 실제 배포물과 같은 SHA라는 release provenance는 아직 별도 AAB 증명이 없다. 다만 Round 2의 `titleBgm (unverified)` 차단은 해소됐다. |
| 재생 생명주기/중복 | **8.0 / 10** | title-login 및 game phase의 단위 테스트는 있으나 실제 기기에서 상태별 의도 트랙 1개 이하를 녹화하지 않았다. |
| 믹싱/voice cap | **6.0 / 10** | combat cap 6과 보호 cue는 테스트됐지만, 보호 cue 합산·BGM과의 headroom·ducking·clipping은 측정/청취되지 않았다. |
| 피드백 계층 | **6.0 / 10** | 75 SFX 논리 ID, weapon/enemy/player/event 분류 및 cooldown은 있다. boss/player 위험음의 onset·식별성·무기 난전 마스킹은 청취되지 않았다. |
| 기기 실청취 | **점수 부여 불가 (직접 증거 0)** | Android 소형 스피커와 desktop 헤드폰에서의 10분 이상 녹화·청취, 실제 volume, clipping/masking, 위험 cue 누락 기록이 전혀 없다. |
| 성능/용량 | **6.0 / 10** | 두 WAV 합계는 705,688 bytes(약 689 KiB)이며 build 산출물도 각 352.84 kB다. 문서의 “700KB 미만”은 KiB 기준인지 명시해야 한다. Android 메모리·decode·배터리·프레임 영향은 미측정이다. |

## 동일 10점 기준 재채점

| 공통 범주 | Round 2 | Round 3 | 변화 근거 |
| --- | ---: | ---: | --- |
| 시각 가독성·아트 | 6.2 | 6.2 | 오디오 변경만으로 전투 시각 증거는 늘지 않았다. |
| 전투 루프·감각 | 6.2 | 6.7 | gameplay BGM lifecycle과 combat cap의 코드·테스트 근거가 추가됐다. 실제 난전 감각은 미청취다. |
| 성장·밸런스 | 4.8 | 4.8 | 이번 오디오 근거로 변화 없음. |
| UI·모바일·접근성 | 5.0 | 5.5 | title sign-in pause 및 user gesture 정책은 좋아졌으나 BGM/SFX 설정·청각 대체 신호·실기기 흐름은 미증명이다. |
| 오디오·피드백 | 5.4 | 6.9 | unverified title 권리 차단 해소, 게임플레이 BGM 추가, 2 BGM metadata/SHA와 manifest verifier 통과를 반영했다. LUFS·실청취 부재 때문에 8점 이상은 아니다. |
| 성능·안정성 | 5.3 | 5.8 | 한 game-screen BGM voice, pause/release, 소형 정적 BGM 파일은 긍정적이다. Android decode/soak은 없다. |
| 제품성·온보딩·리텐션 | 4.8 | 5.6 | title→로그인→game 전환의 무음/중복 위험은 줄었다. stage/boss/result의 실제 긴장 곡선과 청취는 미증명이다. |

**Sound_Mini 가중 종합: 6.0 / 10 — FAIL (8.0 미달)**

계산: `6.2×0.15 + 6.7×0.20 + 4.8×0.12 + 5.5×0.25 + 6.9×0.08 + 5.8×0.10 + 5.6×0.10 = 5.991`, 반올림 6.0.

- Round 1 **4.6 → 6.0 (+1.4)**: provenance와 BGM lifecycle의 실제 코드·검증 진전.
- Round 2 **5.4 → 6.0 (+0.6)**: Round 2의 P0인 unverified title BGM과 gameplay BGM 부재는 해결됐지만, 8점 게이트의 실청취·믹싱 증거가 여전히 없다.

## 8점 게이트 판정

| 필수 조건 | 판정 | 이유 |
| --- | --- | --- |
| 75 SFX + BGM provenance/path/bytes/SHA 1:1 | **통과** | verifier가 75 SFX/150 fallback/생성 BGM 2개를 통과했다. |
| title/login/lobby/stage/boss/pause/resume/result에서 의도 트랙 1개 이하 | **부분 통과** | 코드·단위 테스트상 lifecycle은 존재한다. 실제 실행 녹화가 없다. |
| danger/player cue 누락 0, combat voice cap 이하 | **부분 통과** | unit test는 cap·보호 cue·release를 검증한다. 실제 난전 출력/청취 증거가 없다. |
| clipping/masking 없음 | **미통과** | LUFS/true peak 측정과 실제 스피커·헤드폰 청취가 없다. |
| Android 스피커 + desktop 헤드폰 10분 녹화/청취 | **미통과** | 증거 없음. |

따라서 **8점 통과가 아니다.** 이 결론은 생성 BGM의 품질이 나쁘다는 추정이 아니라, 출시/품질 게이트에 필요한 직접 증거가 아직 없다는 뜻이다.

## 미달을 해소하는 가장 작은 상위 3개 조치/증거

1. **실기기 청취 녹화 2종을 먼저 확보한다.** 같은 build/SHA에서 Android 소형 스피커와 desktop 헤드폰 각각 `title → login → lobby → stage → boss → pause/resume → result`를 10분 이상 녹화한다. 상태별 동시 BGM 수, bossWarning/playerHit/Matilda cue, 체감 clipping/masking, 오류를 시간표로 남긴다. 코드 변경 없이도 가장 큰 P0 불확실성을 닫는다.
2. **배포 자산 77 logical ID의 측정표를 만든다.** 각 SFX와 두 BGM에 duration, integrated LUFS, true peak(또는 도구·측정 한계 명시), SHA-256을 추가하고 danger/player/BGM의 목표 범위와 초과 시 조치 기준을 기록한다. 현재 PCM peak/RMS를 LUFS로 오인하지 않는다.
3. **최대 난전의 믹스 검증을 수행한다.** 16개 무기·적 다수·보스 경고·playerHit가 겹치는 60초 재현에서 combat voice 수, 보호 cue 재생, BGM, clipping/masking을 로그와 청취로 확인한다. 실패가 관찰된 경우에만 기존 cap 분류 안에서 최소한의 priority/ducking 조정을 검토한다.

## 최종 Sound_Mini trail

- 이 문서는 `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`의 오디오 specialist 참여 증거로 남긴다.
- 검증 중 Firebase, Graphics Studio, localStorage에는 접근·저장·변경하지 않았다.
- release/audio 8점 승인은 위 실기기 청취·측정·난전 증거가 같은 build/SHA로 갖춰진 뒤에만 재평가한다.
