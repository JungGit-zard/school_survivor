# 1차 비평 통합 개선 추적표와 Round 2 게이트 — 2026-07-30

## 판정 원칙·범위

- 이 문서는 5개의 독립 1차 비평을 하나의 개선·검증 순서로 통합한 QA 기록이다. 코드, Firebase 데이터, Graphics Studio 값, 브라우저 저장소를 변경하지 않았다.
- **코드가 작업 트리에 있다는 사실은 테스트·빌드·런타임 통과가 아니다.** 아래 `구현됨-Advisor 검증 전`은 diff에서 구현과 관련 테스트가 보일 뿐, Advisor가 이번 통합 후보 전체를 직접 검증하지 않았다는 뜻이다.
- 상태 정의: `미처리`(구현/직접 증거 없음), `구현 중`(현재 작업자 변경 또는 명시된 진행 작업), `구현됨-Advisor 검증 전`(diff상 구현·대상 테스트 존재), `증거 필요`(구현 여부와 무관하게 직접 런타임/측정/승인 근거가 없음)만 사용한다.
- Firebase와 Graphics Studio는 이번 개선 범위에서 **비변경**이다. Studio는 Firebase 단일 정본·fail-closed·memory-only Auth 계약을 유지하며, localStorage를 새로 사용하거나 테스트 정본으로 사용하지 않는다.

## 1차 비평가·종합 점수

| 비평가 | 역할 | 1차 종합 점수 /10 | 판단 요지 |
| --- | --- | ---: | --- |
| 그래픽 비평가 | 그래픽·전투 가독성 (`threemini` 범주) | 5.4 | 타이틀 미술은 보였지만 전투 실장면 증거가 없다. |
| 게임플레이 비평가 | 루프·밸런스 (`levelmini` 범주) | 5.2 | 4분 약속과 당시 보스 즉시 클리어의 충돌이 핵심이었다. |
| UI 비평가 | UI/UX·모바일 접근성 (`uimini` 범주) | 4.8 | 좁은 화면의 로그인·HUD·레벨업·키보드 흐름이 미증명이다. |
| 기술 비평가 | 기술 품질·출시 신뢰도 (`balanceqa` 범주) | 4.8 | 가변 timestep, 실 Canvas/Rapier soak 부재, 대형 Three 청크가 No-Go 원인이다. |
| 사운드 비평가 | 사운드·전투 피드백 (`soundmini` 범주) | 4.6 | SFX 호출은 있으나 lifecycle·voice cap·청취·provenance가 미완성이다. |
| **단순 평균** |  | **5.0** | 24.8 / 5 = 4.96. 가중 재계산 점수가 아니라 5개 독립 판정의 평균이다. |

## 7개 공통 범주 점수 매트릭스

| 비평가 | 시각 가독성·아트 | 전투 루프·감각 | 성장·밸런스 | UI·모바일·접근성 | 오디오·피드백 | 성능·안정성 | 제품성·온보딩·리텐션 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 그래픽 | 6.5 | 4.5 | 5.5 | 5.5 | 4.0 | 5.0 | 5.5 |
| 게임플레이 | 6.0 | 5.0 | 4.0 | 6.0 | 5.5 | 6.5 | 4.5 |
| UI | 6.5 | 4.5 | 4.5 | 4.0 | 4.5 | 5.0 | 5.0 |
| 기술 | 6.0 | 5.5 | 5.0 | 4.5 | 4.5 | 4.0 | 4.5 |
| 사운드 | 6.0 | 5.0 | 4.0 | 4.0 | 4.0 | 4.5 | 4.0 |
| **평균** | **6.2** | **4.9** | **4.6** | **4.8** | **4.5** | **5.0** | **4.7** |

가장 낮은 공통 범주는 오디오·피드백(4.5), 성장·밸런스(4.6), 제품성·온보딩(4.7)이다. 단, 모든 범주에서 실제 현재 빌드의 전투·모바일·청취 증거가 부족하므로 평균은 출시 승인 수치가 아니다.

## 중복 P0/P1 통합 추적표

우선순위는 구현 편의가 아니라 플레이어가 시작·생존·판독·회피·재시작할 수 있는지로 정렬했다.

| 통합 우선순위 | 플레이어 영향과 통합 감점 | 1차 출처 | 현재 상태 | 현재 변경/증거와 남은 합격 증거 |
| --- | --- | --- | --- | --- |
| P0-1 | **4분 생존 약속의 신뢰성.** 보스 처치가 중간에 결과를 열면 240초 생존·포탈·후반 보상이라는 약속이 깨져 첫 성공의 성취감과 재도전 동기가 사라진다. | 게임플레이 P0/P1, 그래픽 성장, UI 온보딩 | 구현됨-Advisor 검증 전 | diff에 Stage 1 B01=192초, 경고=186초, 포탈=240초, 보스 처치=`recordBossDefeat`(보너스만), 포탈 경로=런 종료 분리가 있다. 대상 테스트와 build 통과는 작업 기록에 있으나 이번 통합의 직접 재실행/런타임 240초 증거는 없다. |
| P0-2 | **시작과 모바일 핵심 조작.** 로그인 버튼·pause·레벨업 카드가 좁은 폰/노치에서 작거나 가려지면 플레이어는 게임에 들어가거나 위기에서 멈출 수 없다. | UI P0/P1, 그래픽 UI P1 | 구현됨-Advisor 검증 전 | diff에 Google 계정 버튼 44px, 360px 줄바꿈, HUD pause 44×44, safe-area, 카드 aria-label/축소 규칙, CTA 1줄 onboarding과 focus-visible이 있다. 320×568/390×844 실제 터치·키보드·스크린리더 증거는 없다. |
| P0-3 | **프레임·물리 공정성과 통합 안정성.** FPS/탭 복귀에 따라 이동·피격·포탈 시간이 달라지거나 Canvas/Rapier가 누수되면 같은 조작의 결과가 기기마다 달라진다. | 기술 P0/P1, 그래픽 P2 | 구현됨-Advisor 검증 전 | diff에 Rapier 1/60 fixed timestep과 `gameplayFrameTime` 1/30 delta clamp가 Game/usePlayingFrame/Player에 연결됐다. 순수/소스 wiring 테스트는 작업 기록상 통과했지만 30/60/120Hz, 실제 Canvas/Rapier, Android 10분 soak은 미실행이다. |
| P0-4 | **오디오 상태 전환과 위험음 보존.** 로그인·전투·pause·결과에 트랙이 겹치거나 자동공격 난전이 보스/피격 경고를 덮으면 회피가 늦고 피로가 누적된다. | 사운드 P0, 게임플레이/기술 오디오 | 구현 중 | 요청 범위의 audio lifecycle, voice cap, manifest가 진행 중이다. 현재 통합 시점에는 이 세 항목의 diff·테스트·실기기 청취 증거가 아직 없다. 구현을 완료로 선언하지 않는다. |
| P0-5 | **직접 플레이 증거 부재.** 정적 코드·unit test만으로는 밀집 전투에서 플레이어/위협/명중/사망, 터치 입력, 실제 음향, WebGL 안정성을 알 수 없다. | 5명 공통 | 증거 필요 | 같은 후보 빌드에서 데스크톱과 390×844의 title→Stage 1 초반/혼전/보스/포탈/결과, 콘솔, 오디오, 성능 로그가 필요하다. 캡처 1장은 타이틀 성공 증거일 뿐 전투·모바일 통과 증거가 아니다. |
| P1-1 | **전투 가독성.** 혼전에서 내 캐릭터·최근접 위험·명중/사망이 즉시 구분되지 않으면 이동과 무기 선택 모두 감으로 변한다. | 그래픽 P0/P1, 기술 전투 | 증거 필요 | 현재 전투 캡처/영상이 없다. 20+ 적 2초 연속 장면에서 일반 명중·크리티컬·사망을 데스크톱/390×844로 확인한 뒤, 실패 프레임이 있을 때만 VFX/outline/위협색 한 계층을 조정한다. |
| P1-2 | **후반 보상·문서 정합성.** 포탈·마틸다·마일스톤이 도달 가능해야 하며 4분/무기/저장 정본 문서가 코드와 같아야 다음 조정의 기준이 생긴다. | 게임플레이 P1/P2, UI 온보딩 | 구현됨-Advisor 검증 전 | `Planner/current_game_rules.md`도 변경됐으나, 이번 통합에서 문서 전체의 4분·무기 수·Firebase-only 정합성을 직접 재검증하지 않았다. 3회 성공/3회 실패의 타임라인·보상·결과 화면 증거가 필요하다. |
| P1-3 | **접근 가능한 모달·온보딩 완결.** focus-visible/aria-label만으로는 Tab 포커스 가둠, 최초 포커스, 닫기 후 복귀, 첫 게임 안내가 보장되지 않는다. | UI P1/P2 | 구현 중 | 현재 diff는 focus-visible, pause/카드 label, 제목 1줄 안내까지 보인다. 첫 게임 intro 및 모든 Title/HUD/결과 모달의 키보드 흐름은 여전히 직접 검증 또는 추가 구현이 필요하다. |
| P1-4 | **성능·출시 예산.** 966kB gzip `vendor-three` 경고, 첫 입력 지연, 열·메모리·WebGL 경고를 수치로 판단하지 않으면 저사양 사용자에게만 실패한다. | 기술 P1, 그래픽 P2 | 증거 필요 | current build의 cold start, p95 frame time, 메모리, WebGL context loss, 번들 예산/허용 사유가 없다. 코드 분할/그림자 변경은 측정 결과가 기준을 초과할 때만 검토한다. |
| P1-5 | **믹스·라이선스·자산 provenance.** 파일이 존재해도 clip/masking/권리 불명은 출시 중단과 사용자 피로로 이어진다. | 사운드 P1 | 구현 중 | voice cap과 함께 75 SFX + title BGM의 loudness/peak/duration·원천·license·SHA-256 manifest가 진행 대상이다. Android 스피커/헤드폰 2인 청취표와 1:1 manifest 검증 전까지 미통과다. |
| P1-6 | **타이틀 카피와 군상의 경쟁.** 첫 1초에 제목·4분 목표·CTA 순서가 섞이면 기대와 행동이 약해진다. | 그래픽 P1 | 증거 필요 | 중앙 3D 군상과 카피의 390×844/1280×720 직접 비교가 필요하다. Studio 값·조명·캐릭터 정본은 이 문제 해결 수단으로 변경하지 않는다. |

## 현재 변경 대응의 엄격한 해석

현재 작업 트리 diff에서 다음 대응은 확인했다.

| 대응 묶음 | diff에서 확인한 범위 | 판정 |
| --- | --- | --- |
| 240초/B01/보스 종료 분리 | Stage 1 B01 192초, warning 186초, portal 240초, 보스 처치는 보너스만 기록하고 포탈이 런 종료 | 구현 존재. 후보 전체의 tests/build/runtime를 Advisor가 재검증하기 전까지 통과 아님. |
| mobile 44px/safe-area/aria/onboarding | 계정 버튼·pause 44px, HUD safe-area, 카드 label/좁은 화면 규칙, CTA 안내/focus | 구현 존재. 320×568·390×844·키보드/스크린리더 실측 전 통과 아님. |
| fixed timestep/delta clamp | Rapier 1/60, 공통 최대 1/30 delta, Game·Player·usePlayingFrame wiring | 구현 존재. 30/60/120Hz와 실제 Canvas/Rapier/Android soak 전 통과 아님. |
| audio lifecycle/voice cap/manifest | 작업 진행 지시만 존재 | 구현 중. 현재 diff·테스트·청취 증거가 없는 한 구현됨으로 바꾸지 않는다. |

## Firebase·Graphics Studio 및 DEV E2E 계약

- Firebase Auth가 로그인 상태의 유일한 정본이며, Auth persistence는 memory-only다. Firebase/RTDB에 토큰을 복제하거나 localStorage를 읽고 쓰는 변경은 Round 2 합격 경로가 아니다.
- Graphics Studio는 Firebase canonical state만 사용하며, 이번 변경은 Studio 입력값·revision·apply 경로를 바꾸지 않는다. 해당 영역은 비변경 확인 대상이지 runtime shortcut 대상이 아니다.
- 런타임 E2E는 **DEV `?e2e=1` 프로젝트 계약**을 쓴다: cloud user는 `null`, RTDB write/read는 no-op이어야 하며 실제 Firebase 정본을 읽거나 쓰지 않는다. 이 계약은 Firebase 단일 정본 정책을 우회하는 로컬 대체 저장소가 아니다.
- 이 통합 시점에는 위 DEV E2E 계약의 실제 실행 로그·스크린샷·RTDB no-op 증명이 제공되지 않았다. 상태는 **증거 필요(pending)** 이며, 일반 Firebase 사용자나 실제 Studio 데이터를 대상으로 반복/파괴 테스트를 시작하지 않는다.

## Round 2 공통 실행 순서

같은 Git SHA와 같은 build identity로만 다음 순서를 수행한다. 한 단계의 통과를 다음 단계의 대체 증거로 쓰지 않는다.

1. **diff review**: 변경 파일·범위를 검토하고 Firebase/Graphics Studio/localStorage 비변경 및 audio 변경 범위를 확인한다.
2. **targeted/full tests/build**: 변경별 대상 테스트, 전체 테스트, production build를 실행한다. console warning/error 정책과 Vite 번들 경고의 판정을 기록한다.
3. **E2E runtime**: DEV `?e2e=1` 계약(cloud user null, RTDB no-op)을 실제 로그로 확인한 뒤, desktop 1280×720와 mobile 390×844에서 screenshot/console을 남긴다. title→Stage 1 초반·혼전·B01·포탈·결과, level-up, pause/resume, visibility 복귀, 오디오 상태 전환을 포함한다.
4. **동일 5명 Round 2 비평**: 그래픽·게임플레이·UI·기술·사운드가 위와 **같은 build/SHA**의 증거만으로 독립 채점한다.

## Round 2: 비평가별 객관적 합격 조건

각 비평가는 자기 총점이 **8.0/10 이상**이어야 한다. 아래 항목 중 하나라도 직접 증거가 없거나 실패하면 그 비평가는 불합격이다. 다른 비평가의 통과나 unit test만으로 대신할 수 없다.

| 비평가 | 8.0 이상 직접 합격 조건 |
| --- | --- |
| 그래픽 | 1280×720 및 390×844 같은 빌드에서 title과 Stage 1 초반/20+ 적 혼전/B01 또는 마틸다를 제시한다. 각 장면에서 플레이어·최근접 위협·현재 공격의 시작/명중/사망 중 하나가 1초 내 판독되고, HUD/조이스틱과 겹치지 않는다. 일반 명중·크리티컬·사망과 reduced-effects도 분리 확인한다. |
| 게임플레이 | 새 계정 또는 DEV E2E 격리 상태에서 0:00~240초 성공 3회와 실패 3회를 기록한다. B01=192, portal=240, 보스 처치는 종료하지 않음, 포탈만 결과/런 종료, 의도된 후반 보상은 각 1회이며 HUD 다음 목표가 보이는 것을 증명한다. 4분 문구·설정·결과·기획 문서가 일치해야 한다. |
| UI | 320×568, 390×844, 412×915, 1280×720에서 로그인 3상태, 첫 60초, level-up 3회, pause/resume, 결과를 캡처한다. 핵심 터치 요소는 ≥44×44, safe-area 비겹침이며 터치 10회 성공한다. Tab/Enter/Escape/P와 screen reader로 로그인·동의·닉네임·pause·업그레이드·결과를 완료하고 카드 이름/효과를 읽을 수 있어야 한다. |
| 기술 | 동일 입력/seed로 Stage 1~4를 30/60/120Hz 각각 240초 실행해 위치·HP·접촉·active enemy/body/instance/projectile이 허용 오차 내 동등함을 기록한다. desktop+390×844 Canvas/Rapier에서 console warning/error 0, context loss 0, NaN/stale reference 0, 종료 후 잔존 객체 0 및 Android 저사양 10분 안정성을 제시한다. cold-start·p95 frame·메모리·번들 판정도 기록한다. |
| 사운드 | Android 스피커와 desktop 헤드폰에서 title→login→lobby→stage→boss→pause/resume→result 10분 이상을 녹화/청취한다. 상태별 의도 트랙은 1개 이하, danger/player cue 누락 0, 정한 combat voice cap 이하, clipping/masking 없음이어야 한다. 75 SFX와 title BGM의 loudness/peak/duration·license·source·SHA-256 manifest를 1:1로 검증한다. |

## Hermes 실행 이력의 분리

- 최초 1차 Hermes 카드 5개는 `t_c0b8e048`(`threemini`), `t_ec535142`(`levelmini`), `t_d2ce8dd0`(`uimini`), `t_87543ca7`(`balanceqa`), `t_2d3d3505`(`soundmini`)다. 모두 로그상 expired OAuth HTTP 401로 실행이 막혀 자동 비평 결과를 만들지 못했고, 대체로 Terra critics의 5개 보고서가 작성됐다.
- 이는 **자동 실행기 인증 차단**이지 게임 품질 통과/불합격의 증거가 아니다.
- gameplay worker의 추가 Kanban 카드 `t_17984855`(`levelmini`), `t_7ff6b8dd`(`soundmini`), `t_af7b1065`(`balanceqa`)는 PID 반복 종료로 `blocked`라고만 기록한다. 실행기/운영 증거이므로 Round 2의 제품 품질 점수나 위 5명 합격 조건의 실패로 자동 환산하지 않는다. 단, 필요한 specialist의 직접 검토 산출물이 끝내 없으면 해당 specialist의 Round 2 합격 증거도 없다.

## 라우팅·자체 점검

Subagent mandatory routing

- Board: `escape-zombie-school`
- Trigger: 5개 역할의 1차 비평을 QA 게이트로 통합하는 다중 역할·QA 작업.
- Specialists involved: `threemini`, `levelmini`, `uimini`, `balanceqa`, `soundmini`.
- Cards/artifacts/review trail: 5개 1차 보고서(그래픽, 게임플레이, UI, 기술, 사운드) 및 본 통합 기록. Hermes 1차 실행 실패는 위 실행 이력으로 분리했다.
- Verification: 5개 보고서 전문, `project_develop_policy.md`, `AGENTS.md`, `SESSION_CONTINUITY.md`, 현 작업 트리 `git status`/diff를 읽었다. 이 문서는 코드·Firebase·Graphics Studio를 변경하지 않았다.
- Remaining blockers: 전체 tests/build, DEV E2E no-op 증명, desktop+390×844 런타임/콘솔/청취 증거, 동일 빌드 Round 2 5인 재채점.

자체 점검: 5명/점수, 5×7 매트릭스/평균, 플레이어 영향 P0/P1 통합과 엄격 상태, 현재 변경의 비통과 해석, Firebase/Studio 비변경·DEV E2E pending, Hermes 401 분리, Round 2 순서와 비평가별 8.0 직접 증거 조건을 포함했다.
