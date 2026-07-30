# Round 3 기술 품질·성능 재비평 — 2026-07-30

## 판정

**종합 6.8 / 10 — FAIL (8.0점 미달, 출시 No-Go).**

Round 2의 **5.6 / 10**에서 **+1.2점**이다. 이번 상승은 고정 timestep을 실제
`<Physics timeStep={1 / 60}>`에 적용한 점, 풀 기반 순수 런타임의 장시간 소크, 그리고
Stage 1~4의 동일 입력·seed를 30/60/120Hz에서 정확 비교한 새 회귀 근거를 반영한 결과다.
반면 새 parity는 의도적으로 브라우저 없는 순수 하네스이며, 보스 본체는 React/Rapier actor라
2마리 escort proxy로만 다룬다. 따라서 Canvas/Rapier/WebGL/Android 통과로 바꾸어 계산하지
않았다.

8점은 "코드와 순수 테스트가 많음"이 아니라 실제 렌더·물리·저사양 기기에서 같은 결과와
성능 예산이 재현됨을 뜻한다. 이 하드 게이트는 아직 통과하지 않았다.

## 범위·증거 원칙

- 이 기록은 코드·Firebase/RTDB·Graphics Studio·Apply·브라우저 저장소를 변경하거나 읽지
  않은 기술 QA 재평가다. Firebase 단일 정본 및 Auth memory-only 계약은 이 범위에서
  변경하지 않았다.
- 2026-07-30에 이 검토자가 재실행한 명령은
  `npm.cmd test -- --run src/lib/stageMultiHzParity.test.js`이며 **1 file / 2 tests 통과**,
  `git diff --check`은 exit 0이었다. 후자의 CRLF 메시지는 형식 오류가 아닌 Git 작업트리
  경고다.
- 요청에서 제공된 최신 최종 직접 검증도 반영했다: **176 files / 1,498 tests passed**,
  production build **287 modules passed**, browser `warn/error` **0**. 다만 `vendor-three`
  **2,796.16kB, gzip 965.62kB** Vite 경고는 여전히 남아 있다.
- Round 3 Stage 1 스크린샷(1280×720의 04:14 진행, 390×844의 03:22 혼전/보스 구간)은
  실제 한 장면과 브라우저 콘솔 무오류 관찰의 보조 근거다. 정지 이미지에는 frame-time,
  WebGL context-loss, Rapier body·instance 수, cleanup 또는 다음 프레임의 상태가 없으므로
  성능/물리 통과의 단독 근거로 쓰지 않았다.

## 동일 10점 기준의 기술 축 재채점

| 평가 축 | 가중치 | 점수 /10 | Round 2 대비 | 확인한 근거와 엄격한 한계 |
| --- | ---: | ---: | ---: | --- |
| 프레임 루프·상태 | 20% | 7.8 | +1.8 | Physics 1/60, `gameplayFrameTime` 0.5초 cap/residual, Player의 공용 fixed-step, hidden/pagehide/blur auto-pause가 있다. 실제 visibility 복귀·포털 trigger→흡입→clear·마틸다 phase→4.5초→RAF spawn을 Canvas/Rapier로 반복한 증거는 없다. |
| pool·cleanup | 18% | 8.6 | +1.6 | 200 적/32 적 투사체 풀, generation, spatial grid, InstancedMesh의 `frustumCulled=false` 및 `instanceMatrix.needsUpdate`가 확인된다. 순수 Stage 1~4 parity는 cleanup 뒤 enemy/live proxy/projectile 0, invariant·NaN·event drop 0을 확인했고, 50만+ frame Node soak도 강한 보조 근거다. GPU/Rapier body dispose와 실제 renderer 메모리 누수는 미측정이다. |
| 다중-Hz 결정론 | 20% | 8.2 | +2.5 | 새 하네스가 같은 seed `0x5a17e`·입력 로그로 Stage 1~4 각각 240초(14,400 fixed step)를 30/60/120Hz에서 실행했다. 30/60/120/180/240초 checkpoint와 final은 mismatch 0이며, 3초 hitch는 0.5초/30 step으로 cap되고 120Hz residual도 보존된다. 단, boss proxy·순수 pool/runtime 범위라 실제 Rapier body와 R3F mount 순서를 검증하지 않는다. |
| 통합·브라우저 안정성 | 16% | 5.6 | +0.4 | 요청의 최신 browser warn/error 0과 Round 3 정적 장면은 긍정적이다. 그러나 동일 입력의 4 stage Canvas/Rapier 30/60/120Hz, hidden/visible, portal clear, Matilda spawn, context-loss/NaN/stale body/종료 뒤 잔존 0은 직접 기록되지 않았다. Round 3 UI 브라우저 수집 문서도 Worker 환경에 사용할 탭이 없어 실제 신규 수집 0건이라고 명시한다. |
| 빌드·테스트·회귀 방어 | 10% | 8.0 | +0.6 | 최종 1,498개 테스트, 287-module build, focused parity 2개와 diff 형식 검사는 통과했다. 다만 통과 자체는 node/DOM 중심 회귀 근거이며 production Canvas/Rapier 오류를 실패로 만드는 통합 release gate는 아직 아니다. 소스 테스트에 `localStorage.clear/removeItem` 참조도 남아 있어, 전면 금지 계약의 자동 감시가 완결됐다고 주장할 수 없다. |
| 번들·저사양·메모리·Android 증거 | 2.6 | 16% | +0.1 | Stage-entry 진단 코드가 renderer 정보와 compile 상태를 내보낼 준비는 되어 있고 Node soak의 heap 카나리아도 있다. 그러나 cold start/first input, median/p95 frame time, JS/GPU memory, temperature, Android WebView/AAB 10분 결과는 없다. 현 HEAD와 결속된 AAB 실기기 증거도 없고 대형 Three 청크 경고도 해소·정당화되지 않았다. |

가중 합계: `7.8×0.20 + 8.6×0.18 + 8.2×0.20 + 5.6×0.16 + 8.0×0.10 + 2.6×0.16 = 6.812` →
반올림 **6.8 / 10**.

## Round 2에서 실제로 바뀐 점

| Round 2의 공백 | Round 3에서 확보한 것 | 판정 |
| --- | --- | --- |
| Stage 1~4 30/60/120Hz, 240초 동일 입력 parity 없음 | `stageMultiHzParity.js/.test.js`가 12 runs의 checkpoint/final exact 비교, event drop·NaN·pool invariant·cleanup을 자동 검사 | **순수 시뮬레이션 gate 통과**. 실제 Canvas/Rapier gate는 여전히 미통과. |
| 60Hz 상태 정합이 코드·단위 테스트 위주 | Physics 1/60, Player/gameplay clock, portal clock의 공통 계약과 0.5초 cap/residual probe | **구현 신뢰도 상승**. 실제 탭 복귀와 전환 통합은 미증명. |
| 풀 포화·stale handle 장기 증거 약함 | 50만+ frame Node soak 문서는 invariant, stale-handle probe, pool 상한, projectile 상한, heap 카나리아를 기록 | **논리 풀 안정성 상승**. Three/Rapier 리소스 dispose·GC hitch는 미측정. |
| 브라우저 무오류 관찰이 제한적 | Round 3 Stage 1 장면과 최종 browser warn/error 0 결과 | **한 환경/관찰 구간의 긍정 신호**. multi-stage·multi-Hz·mobile Canvas soak으로 일반화 불가. |
| 빌드/테스트 수 | 1,491 → 1,498 tests, 285 → 287 modules | **회귀 범위 소폭 상승**. performance budget 증거는 아니다. |

## 8점 미달의 최소 상위 3개와 필요한 증거

1. **실제 `<Canvas><Physics>` 결정론·cleanup 통합 게이트**
   - 현 HEAD/동일 build에서 Stage 1~4를 같은 seed·입력 로그로 30/60/120Hz, 각 240초 실행한다.
   - desktop와 390×844에서 position/HP/contact/active enemy/**Rapier body**/rendered instance/projectile을 checkpoint마다 수집·비교한다. 허용오차는 실행 전에 문서화한다.
   - 모든 run에서 console warn/error, context loss, NaN, stale reference가 0이고 종료 후 active body/instance/projectile이 0이어야 한다. portal trigger→hidden/visible→clear 1회와 Matilda phase→4.5초 gameplay time→RAF spawn 1회도 같은 통합 run에 넣는다.

2. **현 Git SHA AAB의 저사양 Android/WebView 10분 실측**
   - versionCode·AAB SHA·source SHA가 이어지는 build provenance를 남기고, 실제 저사양 Android 또는 동등 AVD WebView에서 cold start부터 first input까지와 10분 플레이를 기록한다.
   - Stage 진입/보스/포털/결과, pause와 background/foreground 복귀, console/context/NaN/stale/잔존 0을 캡처한다. median/p95 frame time, JS/GPU/renderer memory와 기기·OS·WebView 버전을 함께 표로 남긴다.

3. **대형 Three 청크와 release 경고의 수치 게이트화**
   - 먼저 위 Android 실측으로 `vendor-three` 965.62kB gzip을 감수할 cold-start·p95·memory 예산을 정하고 충족 여부를 자동 판정한다. 수치 미달일 때만 분할·shadow/asset 경량화를 검토한다.
   - production Canvas/Rapier의 console warn/error/context-loss를 실패로 만들고, 테스트의 남은 `localStorage` 참조는 금지 검증용으로만 좁히거나 Firebase-memory fake로 교체했다는 별도 검증을 남긴다. 이는 저장소를 읽지 않았다는 주장이 아니라 전면 금지 정책을 CI에서도 감시하기 위한 조건이다.

## 반드시 지켜야 할 사항

- 순수 parity와 Node soak의 높은 통과율을 실제 Canvas/Rapier/WebGL/Android 성능 통과로 표기하지 않는다.
- 모든 반복/파괴 테스트는 Firebase 정본을 건드리지 않는 격리된 E2E 또는 로컬 순수 런타임에서만 수행하고, 실제 Firebase 대상 테스트가 필요하면 사전 전체 스냅샷·변경 범위 제한·완전 복원·해시 비교 규칙을 지킨다.
- Android 결과에는 대상 AAB, source SHA, 기기/OS/WebView, 측정 방법과 원시 수치를 함께 남긴다.

## 앞으로 하면 안 되는 사항

- 스크린샷 한 장, browser warn/error 0, 또는 1,498개 unit test 통과만으로 Android 성능·WebGL 안정성·출시 Go를 선언하지 않는다.
- 보스 proxy의 순수 parity를 B01~B04 실제 Rapier actor 동등성으로 바꾸어 기록하지 않는다.
- Firebase/Graphics Studio 값을 테스트 편의상 localStorage, seed, 임시 JSON으로 대체하거나 현재 작업 범위에서 변경하지 않는다.

## 참조

- `project_develop_policy.md`
- `Developer/agent_room/r3f_rapier_vampire_survivor_stability_rules.md`
- `Quaility_Assurance/critic_round1_technical_quality_2026-07-30.md`
- `Quaility_Assurance/critic_round2_technical_quality_2026-07-30.md`
- `Quaility_Assurance/critic_round1_synthesis_and_round2_gate_2026-07-30.md`
- `Quaility_Assurance/critic_round2_implementation_code_review_2026-07-30.md`
- `Quaility_Assurance/critic_round2_runtime_browser_validation_2026-07-30.md`
- `Quaility_Assurance/stage1_4_multihz_deterministic_parity_2026-07-30.md`
- `Quaility_Assurance/ingame_playloop_soak_500k_frames_validation_2026-07-30.md`
- `Developer/r3f_prototype/src/lib/stageMultiHzParity.js`
- `Developer/r3f_prototype/src/lib/stageMultiHzParity.test.js`
