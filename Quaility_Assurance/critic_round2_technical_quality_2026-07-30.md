# Round 2 기술 품질·출시 신뢰도 비평 — 2026-07-30

## 판정 범위와 증거 원칙

- 역할: 동일 5인 비평 체계의 기술 품질·출시 신뢰도 비평가(`balanceqa` 관점)다. 이 문서는 코드·Firebase·Graphics Studio·브라우저 저장소를 변경하지 않은 독립 판정 기록이다.
- 비교 기준: 1차 기술 점수 **4.8 / 10**. 이번에는 `ba8b490` 대비 현재 작업 트리, Round 2 런타임 기록, 구현 정확성 재검토, R3F/Rapier 안정성 규칙을 함께 대조했다.
- 점수 상향은 현재 실행으로 확인한 사실에만 사용했다. 단위 테스트, 정적 코드 탐색, 정지 스크린샷은 유용하지만 실제 Canvas/Rapier/Android 성능 측정을 대체하지 않는다.
- 전체 검증 기록: Vitest **173 files / 1,491 tests passed**, production build 성공, `git diff --check` 성공. build에는 `vendor-three` **2,796.16 kB / gzip 965.62 kB** 대형 청크 경고가 남아 있다.

## 1차 이후 확인된 개선

1. `GameCanvas.jsx`의 Rapier가 `timeStep={1 / 60}`으로 고정됐고, `gameplayFrameTime.js`의 1/60초 accumulator·0.5초 raw-delta 상한을 `Game`, `Player`, `usePlayingFrame`, 포털 흡입 clock에 적용했다. 15/30/60/120Hz 순수 clock 회귀와 관련 컴포넌트 테스트가 있다.
2. 미클리어 B01 보너스가 랭킹 상한을 우회하지 않도록 바뀌었고, 실제 clear 때만 보너스를 확정한다. 192초 미클리어/240초 clear 정책은 회귀 테스트로 검증됐다.
3. 마틸다 대사는 4.5초 gameplay-time 유예 뒤 RAF scheduler에서 한 번만 스폰하도록 바뀌었다. 이전 포털 raw-delta 및 마틸다 wall-clock P1, frame-state mutation·270-step 경계 P2는 구현 정확성 재검토에서 해소됐다.
4. 실제 DEV E2E 브라우저에서 Stage 1을 8분 초과 실행했으며 clean 탭의 `warn`/`error` 0건, 390×844 pause 타이머 정지/재개, 320×568 타이틀 겹침 완화를 관찰했다. 이는 E2E 무적·메모리 격리 상태의 제한된 관찰이다.

## 7개 공통 범주 점수

| 범주 | 점수 /10 | 기술 가중치 | 근거와 엄격한 감점 |
|---|---:|---:|---|
| 시각 가독성·아트 품질 | 6.5 | 6% | 390×844 군중 장면에서 기존 플레이어 외곽선의 정지 프레임 판독성은 개선됐다. 하지만 명중·치명타·사망·reduced-effects 및 움직이는 혼전의 지속 판독은 미측정이다. |
| 전투 루프·게임 감각 | 6.2 | 16% | 60Hz clock 일치, B01/포털 점수 분리, Stage 1 8분 런은 강점이다. 실제 B01 처치→포털 진입→clear와 Stage 2~4 전투의 Canvas/Rapier 통합 관찰이 없다. |
| 성장·밸런스 | 5.3 | 10% | 점수 정책과 특정 시계/보상 회귀는 검증됐다. 동일 seed로 0:00~240초 반복 성공·실패, 업그레이드 선택 분포, 후반 보상과 난이도 측정은 없다. |
| UI·모바일·접근성 | 5.8 | 12% | 320×568 정적 겹침, 390×844 pause는 확인됐다. 44px 터치 10회, 412×915, signed-out/in 전 상태, 키보드·스크린리더 전체 흐름은 미검증이다. |
| 오디오·피드백 | 4.5 | 7% | SFX token cap/error-release 회귀는 통과했으나 실청취, clipping/masking, pause/background lifecycle, loudness 표가 없다. `titleBgm (unverified)` manifest verifier exit 1도 남아 있다. |
| 성능·안정성 | 5.7 | 34% | 적 pool/spatial grid/instance, 60Hz 물리 정합, Stage 1 데스크톱 장기 무오류 관찰은 긍정적이다. 그러나 30/60/120Hz 동일 입력·seed의 Stage 1~4 240초 비교, active entity/body/instance/projectile 오차, Canvas context-loss/NaN/stale/잔존 0, p95·memory·저사양 Android 10분이 모두 직접 미측정이다. 대형 Three 청크도 그대로다. |
| 제품성·온보딩·출시 신뢰도 | 5.0 | 15% | E2E consent가 no-write로 격리되고 build가 성공했다. 현 HEAD AAB, Android/WebView 로그인·게임·resume·clear, cold-start 및 release performance budget 근거가 없다. |

가중 합계: `6.5×0.06 + 6.2×0.16 + 5.3×0.10 + 5.8×0.12 + 4.5×0.07 + 5.7×0.34 + 5.0×0.15 = 5.611`.

## 최종 점수와 판정

**종합 5.6 / 10 — FAIL (8점 미달, 출시 No-Go).**

1차의 4.8점에서 **+0.8점**이다. 고정 스텝 정합과 확인 가능한 회귀 결함 제거는 실질적인 향상이다. 그러나 아래의 하드 게이트는 아직 어떤 것도 직접 통과하지 않았으므로 8.0점 이상을 줄 수 없다.

## 활성 이슈

| 우선순위 | 이슈 | 왜 현재 증거로는 통과할 수 없는가 |
|---|---|---|
| P0 | **Stage 1~4 동일 input/seed 30/60/120Hz 각 240초 동등성 부재** | position, HP, contact, active entities/bodies/instances/projectiles의 허용오차 결과가 없다. 순수 clock 테스트와 Stage 1 한 번의 DEV E2E는 이를 대체하지 않는다. |
| P0 | **Android 저사양 10분 및 현 HEAD AAB 출시 검증 부재** | Android/WebView에서 cold start, pause/resume, background/foreground, boss/portal/result, console/context/NaN/stale/잔존 0 및 실제 성능 수치가 없다. |
| P1 | **실제 Canvas/Rapier 통합 soak 공백** | Stage 1~4의 desktop+390×844에서 Canvas 1개, Rapier body, 렌더 instance, projectile, WebGL context loss, console warning/error를 전 구간 기록한 240초 런이 없다. 포털 trigger→hidden/visible→clear 1회와 마틸다 phase→유예→RAF→spawn 1회도 컴포넌트 통합으로 증명되지 않았다. |
| P1 | **성능 측정·예산 부재** | cold-start/first-interaction, p95 frame time, 메모리 및 GPU/renderer 정보가 없다. `vendor-three` gzip 965.62kB 경고를 감수할 근거도 없다. |
| P1 | **오디오 출시 승인 미완료** | 실제 verifier가 title BGM provenance 미승인으로 실패한다. 75 SFX/title BGM loudness·peak·duration과 10분 실제 청취도 없다. |
| P2 | **경고를 실패로 만드는 통합 게이트 부재** | unit suite 성공은 확인됐지만, production Canvas/Rapier console warning/error, multiple Three/context-loss, localStorage 금지 경로를 한 번에 감시하는 release gate가 없다. |

## 8점 도달을 위한 최소 작업과 측정 기준

1. 고정 seed와 동일 입력 로그로 Stage 1~4를 각각 30/60/120Hz에서 240초씩 실행한다. 매 run의 position·HP·contact·enemy/body/instance/projectile를 수집하고, 사전에 문서화한 허용오차 이내인지 자동 비교한다. 종료 후 active body/instance/projectile은 0, NaN/stale reference/context loss/console warn·error는 0이어야 한다.
2. 위 실험을 실제 `<Canvas><Physics>`로 desktop 및 390×844에서 수행한다. hidden→visible, pause/resume, portal trigger→흡입→clear, Matilda phase→4.5초 gameplay-time→RAF spawn을 포함한 통합 케이스를 추가한다.
3. 현 Git SHA의 AAB를 만들고 저사양 Android 또는 동등 AVD WebView에서 10분 실플레이를 측정한다. cold start부터 첫 입력 가능까지, median/p95 frame time, memory, context/console, pause/background 복귀 결과를 기록하고 사전 예산을 충족해야 한다.
4. `vendor-three` 경고는 분할 또는 모바일 실측으로 정당화한다. 크기 자체가 아니라 cold-start와 10분 p95/memory의 합격 기록이 필요하다.
5. title BGM의 실제 provenance를 승인하거나 교체하고 manifest verifier exit 0, loudness/peak/duration 표, desktop 헤드폰·Android 스피커 lifecycle 청취 기록을 확보한다.

위 P0와 P1 측정이 모두 통과하기 전에는 현재 코드의 순수 회귀 통과 수가 더 늘어나더라도 기술 품질 점수 **8.0 이상은 불가**하다.

## 참조한 현재 증거

- `Quaility_Assurance/critic_round1_technical_quality_2026-07-30.md`
- `Quaility_Assurance/critic_round1_synthesis_and_round2_gate_2026-07-30.md`
- `Quaility_Assurance/critic_round2_runtime_browser_validation_2026-07-30.md`
- `Quaility_Assurance/critic_round2_implementation_code_review_2026-07-30.md`
- `Developer/agent_room/r3f_rapier_vampire_survivor_stability_rules.md`
- `Developer/frame_clock_and_boss_score_coherence_2026-07-30.md`
- `Developer/portal_suction_frame_clock_fix_2026-07-30.md`
- `Developer/matilda_dialogue_spawn_grace_fix_2026-07-30.md`
- `Developer/e2e_invincible_long_run_gate_2026-07-30.md`
