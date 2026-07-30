# Round 2 실제 브라우저 검증 기록 — 2026-07-30

## 목적·판정 경계

- 이 문서는 5명의 Round 2 비평가가 **현재 확보된 실제 브라우저 관찰**과 아직 비어 있는 근거를 구분해 채점하도록 만드는 QA 기록이다.
- 기록된 DEV E2E 실행은 `?e2e=1`의 메모리 전용 격리 경로다. Firebase, Graphics Studio, RTDB 정본, Studio Apply 값에는 읽기·쓰기·변경을 하지 않았다. 브라우저 `localStorage`도 테스트 정본이나 대체 저장소로 사용하지 않았다.
- 스크린샷은 정지 장면 증거이며, 터치 성공률·스크린리더·Android 실기기·오디오 청취·성능 계측을 대신하지 않는다. 코드 단위 테스트도 실제 브라우저 동작의 대체 증거가 아니다.
- `critic_round2_clean_stage1_boss_combat_205s_desktop_2026-07-30.png`는 실제로 레벨업 장면일 가능성이 있어 보스 전투 증거로 사용하지 않는다.

## 실행 환경과 공통 URL

확인에 사용한 격리 URL은 아래와 같다.

```text
?e2e=1&e2einvincible=1&e2ehp=9999&e2eweapon=pencilThrow,stunGun,starlink&e2ecd=500
```

- `e2e=1`: DEV에서만 활성인 E2E 격리 경로다. `cloudUser`는 `null`이며, consent 성공은 메모리에만 반영한다. 근거: `Developer/e2e_consent_memory_gate_fix_2026-07-30.md`.
- `e2einvincible=1` 및 `e2ehp=9999`: 긴 런타임 관찰용 DEV 오버라이드다. 배포 경로에는 활성화되지 않는다. 근거: `Developer/e2e_invincible_long_run_gate_2026-07-30.md`.
- 이 URL은 실제 게임 난이도·정상 사망률·실제 로그인·Firebase 저장을 평가하는 증거가 아니다.

## 확보된 실제 브라우저 관찰

| 항목 | 결과 | 근거 | 판정 범위 |
| --- | --- | --- | --- |
| 데스크톱 Stage 1 장기 런 | Stage 1을 0초부터 8분 초과까지 실행했다. 표시 HP는 9999를 유지했고, clean 실행의 콘솔 `warn`/`error`는 0건이었다. | `evidence/critic_round2_clean_stage1_49s_desktop_2026-07-30.png`, `evidence/critic_round2_clean_stage1_levelup_198s_desktop_2026-07-30.png`, `evidence/critic_round2_clean_stage1_portal_256s_desktop_2026-07-30.png` | E2E 무적 상태에서의 데스크톱 장기 실행·포털 시각 관찰만 증명한다. 일반 플레이 생존성, 성능 수치, 오디오 품질은 미증명이다. |
| Stage 1 포털 시각 | 240초 이후 포털이 나타난 것을 256초 캡처에서 확인했다. | `evidence/critic_round2_clean_stage1_portal_256s_desktop_2026-07-30.png` | 포털 생성 시각 관찰이다. 자동화 키 입력이 유지되지 않아 실제 포털 흡입·클리어는 수동 브라우저로 완료하지 못했다. |
| 보스 종료/점수 규칙 | 보스 처치가 즉시 런 종료가 아니고, 미클리어 보스 보너스를 제외하며 포털 클리어에만 보너스를 적용하는 정책은 회귀 테스트로 검증됐다. | `Developer/frame_clock_and_boss_score_coherence_2026-07-30.md` | 코드·테스트 근거다. 실제 브라우저에서 B01 처치부터 포털 클리어까지의 전 과정을 이번 기록에서 직접 완료한 증거는 아니다. |
| 390×844 모바일 혼전 | 개선 전 약 42초·96초 장면 중 96초 장면에서는 적 군중 때문에 플레이어 식별성이 부족했다. 후속 캡처는 HUD `01:43`, HP 9999, 중앙 약 20+ 군중에서 분홍 얼굴과 검은 **기존 캐릭터 자체 외곽선**이 식별됐고, 해당 탭 콘솔 `warn`/`error`는 0건이었다. | 개선 전 `evidence/critic_round2_dense_stage1_35s_mobile_390x844_2026-07-30.png`, `evidence/critic_round2_dense_stage1_90s_mobile_390x844_2026-07-30.png`; 후속 `evidence/critic_round2_dense_stage1_90s_mobile_390x844_after_player_outline_2026-07-30.png` | 한 정지 프레임의 전후 비교에서는 플레이어 식별성이 개선됐다. 별도 원·halo·locator 또는 새 위치 표식은 없으며 점수 근거로 주장하지 않는다. 움직이는 혼전에서 1초 내 지속 판독, 일반 명중·치명타·사망·reduced-effects 분리는 여전히 미증명이다. |
| 모바일 pause/resume | 390×844에서 pause 후 약 1.6초 동안 타이머가 `00:54`에 고정됐고, 재개 후 `00:55`로 진행했다. | `evidence/critic_round2_pause_mobile_390x844_2026-07-30.png` | pause 타이머 관찰만 증명한다. 터치 10회·Tab/Enter/Escape/P·스크린리더 전체 흐름은 미검증이다. |
| 320×568 타이틀 겹침 | 수정 후 Google 계정 패널 하단과 타이틀 카피 시작 사이가 약 23px로 관찰됐다. | `evidence/critic_round2_title_mobile_320x568_fixed_2026-07-30.png`; 비교용 `evidence/critic_round2_title_mobile_320x568_2026-07-30.png` | 해당 한 상태의 정적 레이아웃 근거다. signed-out/signing-in/signed-in 3상태와 412×915는 아직 직접 검증하지 않았다. |
| E2E consent 격리 | 수정 뒤 깨끗한 E2E 탭에서 Firebase 저장 시도 또는 관련 경고가 관찰되지 않았다. | `Developer/e2e_consent_memory_gate_fix_2026-07-30.md`, `evidence/critic_round2_title_consent_failure_2026-07-30.png` | DEV E2E 동의 경로의 no-write 관찰이다. 실제 Firebase 로그인/저장 성공 검증이 아니다. |
| 마틸다 진입 유예 | 4.5초 유예 로직은 테스트로 확인됐다. | `Developer/matilda_dialogue_spawn_grace_fix_2026-07-30.md` | **새 실제 브라우저 캡처 없음.** 이전 즉시 게임오버 캡처(`evidence/critic_round2_matilda_immediate_gameover_before_grace_fix_2026-07-30.png`)는 수정 전 결함 증거일 뿐이다. |

## 기존 화면 증거 목록

- 로비: `evidence/critic_round2_lobby_desktop_2026-07-30.png`, `evidence/critic_round2_lobby_mobile_390x844_2026-07-30.png`
- Stage 1 초반: `evidence/critic_round2_stage1_early_desktop_2026-07-30.png`, `evidence/critic_round2_stage1_early_mobile_390x844_2026-07-30.png`
- 포털 탐색 중 보조 장면: `evidence/critic_round2_portal_search_concurrent_w_2026-07-30.png`, `evidence/critic_round2_portal_search_up_313s_desktop_2026-07-30.png`

위 파일은 장면 참고용이다. 장면의 시간·상태가 파일명만으로 충분히 확정되지 않는 경우에는 해당 스크린샷을 점수 상향의 단독 근거로 사용하지 않는다.

## 최종 자동검증·빌드·오디오의 정직한 상태

| 검증 | 최종 결과 | 판정 |
| --- | --- | --- |
| 전체 Vitest | JSON 집계 `173 files`, `1491 tests`, `1491 passed`, `0 failed`, `0 pending`, `success: true` | 현재 단위·컴포넌트 테스트 모음은 전부 통과했다. 아래 실제 브라우저·실기기 공백을 대신하지 않는다. |
| production build | `npm.cmd run build` 성공, 285 modules | 빌드 성공이다. `vendor-three`는 2,796.16kB/gzip 965.62kB로 대형 청크 경고가 남아 있어 성능·출시 예산 통과로 보지 않는다. |
| diff 형식 | `git diff --check` exit 0 | 오류 없음. Windows CRLF 변환 경고만 있었으며 diff 오류는 아니다. |
| audio manifest 단위 테스트 | 1 file, 5 tests 통과 | verifier가 잘못된 logical ID 연결과 미승인 라이선스를 거부하는 코드 계약은 통과했다. |
| 실제 audio manifest verifier | `titleBgm (unverified)`로 의도적 exit 1 | title BGM을 포함한 provenance는 여전히 출시 승인 또는 사운드 8점 통과 근거가 아니다. |
| 독립 구현 정확성 재검토 | 초기 P1 2건(포털 raw delta, 마틸다 wall-clock)과 후속 P2 2건(frame `setState`, 270-step 부동소수점 경계)을 모두 해소했다. 최종 대상 검증은 5 files, 110 tests 통과이며 활성 P0/P1/P2는 0건이다. | 근거: `critic_round2_implementation_code_review_2026-07-30.md`. 순수·컴포넌트 테스트 범위의 결함 해소이며, 포털 hidden/visible 통합과 마틸다 실제 phase→RAF 통합까지 증명한 것은 아니다. |

- 75 SFX와 title BGM의 loudness, peak, duration을 측정한 표가 없고, Android 스피커·데스크톱 헤드폰에서 title→login→lobby→stage→boss→pause/resume→result를 10분 이상 청취한 기록도 없다.
- 이번 문서는 cold start, p95 frame time, 메모리, context loss, Android 저사양 10분 안정성을 검증하지 않았다.

## Round 2 비평가가 아직 점수 상향에 사용하면 안 되는 항목

1. 포털 실제 진입·클리어, 결과 화면 및 점수 제출의 실제 브라우저 흐름.
2. 0:00~240초 성공 3회와 실패 3회, 후반 보상·난이도·레벨업 선택의 반복 재현성.
3. 30/60/120Hz 동일 입력·seed 비교, hidden→visible 복귀, 종료 후 Rapier/instance/projectile 잔존 객체 검사. 특히 포털의 실제 trigger frame→hidden/visible→clear 1회 통합과 마틸다의 실제 phase 전환→RAF 보류→playing 복귀→spawn 1회 통합은 아직 없다.
4. 320×568·390×844·412×915·1280×720 전 상태, 44px 터치 10회, 키보드와 스크린리더의 로그인/동의/닉네임/pause/업그레이드/결과 전체 흐름.
5. 마틸다 유예 후 실제 전투 장면, 일반 명중·치명타·사망·reduced-effects의 모바일/데스크톱 판독성. 캐릭터 자체 외곽선의 모바일 정지 프레임 개선은 이 동적 판독 조건을 대신하지 않는다.
6. 오디오 청취·클리핑/마스킹·voice cap 실제 관찰 및 title BGM 라이선스·측정값.

## 추가 예정: 현재 기록 후 확보해야 할 증거

아래 항목은 이 문서를 작성한 시점에 아직 수집되지 않았으며, 확보 전에는 완료로 해석하지 않는다.

- 마틸다 4.5초 대사 유예 뒤 실제 브라우저 장면.
- 위 공통 조건을 충족할 수 있는 추가 desktop/mobile/오디오/성능 증거 또는, 충족하지 못하는 항목의 명시적 감점.

## 라우팅·자체 점검

Subagent mandatory routing

- Board: `escape-zombie-school`
- Trigger: 1차 5인 비평 후 Round 2의 실제 브라우저 검증 기록.
- 역할: QA 기록 Worker. 이 파일 하나만 생성했으며 코드·자산·Firebase·Graphics Studio·브라우저 저장소를 변경하지 않았다.
- 참조: `critic_round1_synthesis_and_round2_gate_2026-07-30.md`, `critic_round1_implementation_code_review_2026-07-30.md`, 관련 E2E/프레임/마틸다/모바일/오디오 개발 기록 및 `Quaility_Assurance/evidence/` 파일 목록.

자체 점검: 확인된 런타임 관찰, 코드 테스트로만 보완되는 주장, 실패·미증명 항목, 의도적 audio manifest 실패, 추가 예정 증거를 서로 분리해 기록했다.
