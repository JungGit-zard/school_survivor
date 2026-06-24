# Auto-deploy integration gate — 2026-06-24

프로젝트: Escape! zombie school
역할: Balance_QA_Mini / 밸검미니
Kanban task: t_15da5170
범위: 9개 specialist auto-deploy 산출물 통합, 다음 구현 큐/차단/병렬화/테리 결정 필요 항목 정리
결론: 현재 자동 배포/Play production/공개 테스트는 No-Go. Stage 1 모바일 플레이어블 루프 안정화와 Android/WebView 실검증이 최우선이다.

## 1. 통합 판정

### Gate decision

No-Go / 차단 유지.

자동 테스트와 웹 빌드 일부는 통과했지만, 현재 우선순위인 Stage 1 모바일 playable loop를 실제 Android/WebView에서 1판 끝까지 검증하지 못했다. 또한 작업트리가 다수의 미커밋/미추적 변경을 포함하고 있어 자동 배포나 광범위 병합을 진행하면 다른 에이전트/사용자 변경을 덮거나 검증 범위를 혼동할 위험이 크다.

### 지금 Go로 볼 수 있는 것

- Stage 1 방향성: 240초/4분 루프 기준으로 정렬됐다.
- 웹/단위테스트 일부: Balance QA 산출물 기준 `npx vitest run --maxWorkers=1 --no-file-parallelism` 57 files / 304 tests passed, `npm run build` 통과.
- 데스크톱 웹 스모크: 타이틀 → 닉네임 → Stage 1 시작 → 약 23초 진행 → Level Up 모달 도달 확인.
- 그래픽 방향: 플레이어/몬스터는 3D toon + outline 정책을 대체로 준수한다.
- BM/백엔드/마케팅/알림 범위: Stage 1 안정화 전에는 확장 금지라는 가드레일이 정리됐다.

### 검증 완료로 표시하면 안 되는 것

- 실제 Android 기기 또는 Android WebView 릴리스 빌드에서 240초 클리어/자연 게임오버까지의 1판 루프.
- 모바일 터치 조이스틱, level-up 카드 터치, pause/resume, restart/result 모달 전체.
- signed AAB 생성/업로드/내부 테스트 설치.
- Google login/cloud save/Data safety/privacy/account deletion 준비 완료.
- 공식 온라인 랭킹/서버 검증/라이브옵스/BM 구현 준비 완료.

## 2. 읽은 파일 / 산출물

필수 시작/정책:
- `project_develop_policy.md`
- `Bang_Rules.md`
- `AGENTS.md`
- `CLAUDE.md`
- `SESSION_CONTINUITY.md`
- `SESSION_MEMORY.md` 최근 구간

9개 specialist output:
- `Graphic_designer/auto_deploy_graphics_audit_2026-06-24.md`
- `Developer/auto_deploy_graphics_implementation_handoff_2026-06-24.md`
- `Planner/auto_deploy_stage1_loop_leveling_plan_2026-06-24.md`
- `Quaility_Assurance/auto_deploy_stage1_p0_p1_qa_gate_2026-06-24.md`
- `CEO/auto_deploy_bm_scope_guard_2026-06-24.md`
- `CEO/auto_deploy_google_play_readiness_gate_2026-06-24.md`
- `Developer/auto_deploy_backend_boundary_2026-06-24.md`
- `marketing/auto_deploy_english_copy_readiness_2026-06-24.md`
- `Developer/agent_room/auto_deploy_operations_ledger_2026-06-24.md`
- `Developer/agent_room/auto_deploy_notification_hygiene_2026-06-24.md`

## 3. 실행 명령 / 도구 결과

현재 통합 카드에서 직접 실행/확인한 것:

```bash
pwd && printf 'HERMES_KANBAN_WORKSPACE=%s\n' "$HERMES_KANBAN_WORKSPACE" && test -d /d/JungSil/2.Minigame_project/school_survivor-integration && echo PROJECT_OK || echo PROJECT_MISSING && git -C /d/JungSil/2.Minigame_project/school_survivor-integration status --short --branch
```

결과 요약:
- 현재 tool 기본 cwd는 `/c/Users/admin`였고 Kanban workspace는 `D:\JungSil\2.Minigame_project\school_survivor-integration`였다.
- 프로젝트 경로는 `PROJECT_OK`.
- 브랜치: `feature/stage2-corridor-floor-graphics...origin/feature/stage2-corridor-floor-graphics [ahead 6]`.
- 다수의 tracked modified 파일과 untracked 역할 산출물/스크린샷이 존재한다.

```bash
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING; test -d /c/Users/admin/.claude/skills/gstack/bin && echo GSTACK_OK_USERPROFILE || echo GSTACK_MISSING_USERPROFILE; test -s SESSION_MEMORY.md && tail -n 80 SESSION_MEMORY.md || echo SESSION_MEMORY_EMPTY_OR_MISSING
```

결과 요약:
- 현재 balanceqa profile 홈 기준 `GSTACK_OK`.
- Windows user-global path `/c/Users/admin/.claude/skills/gstack/bin`도 `GSTACK_OK_USERPROFILE`.
- `SESSION_MEMORY.md` 최근 구간을 확인했다.

추가 도구 확인:
- `kanban_show(t_15da5170)`로 9개 parent handoff를 확인했다.
- `read_file`로 필수 정책/시작 문서와 specialist 산출물을 확인했다.
- `search_files`로 QA auto-deploy 산출물 목록과 Hermes agent profile 목록을 확인했다.

이번 통합 카드에서는 코드 테스트/build/browser를 새로 실행하지 않았다. 이유: 이 카드는 구현이 아니라 parent output 통합 gate 문서 작성이며, 이미 parent QA/graphics/launch 카드가 실행한 테스트 결과를 근거로 통합 판단을 내리는 범위다.

## 4. 공통 블로커

### B0 — 실제 모바일/Android/WebView 1판 루프 미검증

- 상태: P0 blocked.
- 근거: QA gate와 Level plan 모두 실제 Android/WebView에서 자연 게임오버 또는 240초 클리어 1회 이상이 필요하다고 기록했다.
- 영향: Stage 1 안정화 목표 미달. 자동 배포/Play public track 불가.
- 다음 액션: 실제 Android 또는 설치 빌드에서 `30초 플레이 → level-up 카드 터치 → pause/resume → restart/result → 240초 클리어 또는 자연 게임오버`를 증거와 함께 기록.

### B1 — Playwright 모바일 스모크 환경 미준비

- 상태: P1/P0 경계 blocked.
- 근거: `Quaility_Assurance/auto_deploy_mobile_playable_loop_check_2026-06-24.mjs`가 존재하지만 Chromium headless shell 미설치로 실행 차단됨.
- 다음 액션: `npx playwright install chromium` 또는 브라우저 경로 고정 후 스크립트 재실행. 단, 자동 스모크는 실제 기기 검증을 완전히 대체하지 않는다.

### B2 — 작업트리 변경 소유권/리뷰 미분리

- 상태: P0 release blocker.
- 근거: Player/Floor/GraphicsStudio/VFX/Weapon 파일 다수 수정 + 여러 role artifact untracked 상태.
- 영향: 어떤 변경이 어떤 검증에 의해 보호되는지 모호하다.
- 다음 액션: 기능/역할 단위로 리뷰 가능한 diff를 분리하고, 각 구현 변경마다 QA 문서/스크린샷/테스트 결과를 연결한다. 이 통합 카드는 커밋/푸시하지 않는다.

### B3 — Android/JDK/signed AAB/Play readiness 미검증

- 상태: Play release blocker.
- 근거: Launch gate에서 JDK 없음, signed `.aab` 없음, Android build 미검증, full Vitest가 clean exit하지 않은 실행이 있었다.
- 다음 액션: JDK 구성 → clean JS test → web build → Capacitor sync/build → signed AAB 생성 → internal testing install smoke.

### B4 — Privacy/Data safety/account deletion/admin exposure

- 상태: Play public-facing blocker.
- 근거: Google login/Firebase progress 저장은 uid/displayName/email/photoURL/nickname/progress를 다룰 수 있으나 privacy policy, Data safety, account deletion, Firebase rules/App Check, admin/cheat exposure가 정리되지 않았다.
- 다음 액션: 공개 테스트/production 전 privacy/account deletion/Data safety와 admin/cheat UI 비노출을 별도 gate로 닫는다.

## 5. 관찰 사항

- Stage 1 정본 시간은 240초다. `Bang_Rules.md`의 과거 300초 값은 상단 2026-06-11 규칙에 따라 ×0.8로 읽어야 한다.
- Stage 1은 E04 투사체형 적을 쓰지 않는다. E04 및 B01 투사체 재도입은 No-Go 조건이다.
- 그래픽 산출물은 player/enemy 3D toon/outline 경로가 대체로 정책에 맞다고 보았다.
- 단, E05/B01 charge cue의 `GoSpeechBubble`은 2D HTML overlay라 엄격한 3D toon 언어에서는 P1 polish/정책 감시 항목이다.
- Vite large chunk warning은 계속 존재한다. 모바일 로딩/메모리 리스크로 추적해야 한다.
- 브라우저 스모크에서 `THREE.WebGLRenderer: Context Lost.`가 1회 관찰됐다. 실제 기기에서 반복되면 P0/P1 경계로 승격한다.
- BM/retention/liveops는 구현하지 않는다. 지금은 측정 설계와 가드레일까지만 허용된다.
- Backend/multiplayer/official leaderboard는 Stage 1 안정화 전 구현하지 않는다. 현재 Firebase progress는 개인 백업/편의 저장으로만 취급한다.
- English store copy는 4-minute cartoon survival 정도만 안전하게 말할 수 있다. global leaderboard/cloud save/multiplayer/live season은 claim 금지다.
- Notification/reminder는 신규 cron 없이 Kanban/로컬 산출물 중심으로 충분하다.

## 6. 다음 구현 큐 — 우선순위

### Queue A — 지금 병렬 가능, 코드/환경 단위로 좁게 진행

1. 3D/toon charge cue 정리
   - 권장 assignee: `threemini`
   - 범위: `Enemy.jsx`의 HTML `GoSpeechBubble`를 인월드 3D/toon warning cue로 교체하거나 `ChargeWarningLine`만으로 충분하면 제거.
   - 수락 기준: E05/B01 charge readability 유지, player/monster 2D sprite substitute 없음, focused test/browser visual check.

2. Graphics Studio parity regression guard 강화
   - 권장 assignee: `threemini`
   - 범위: `GRAPHICS_STUDIO_CATALOG`의 runtime-shared source/path guard 추가. `weapon-extra-battery` image 예외만 명시적으로 허용.
   - 수락 기준: `npm test -- src/lib/graphicsStudioConfig.test.js src/components/GraphicsStudio.test.jsx` 통과.

3. Playwright Chromium/mobile smoke environment 복구
   - 권장 assignee: `madangsue` 또는 운영/개발환경 담당
   - 범위: Playwright Chromium 설치 또는 executable path 고정, 기존 `auto_deploy_mobile_playable_loop_check_2026-06-24.mjs` 재실행 가능 상태 만들기.
   - 수락 기준: 모바일 스모크가 최소 타이틀→Stage 1→level-up/pause/restart까지 실행되고 결과가 QA 문서에 기록됨.
   - 주의: 이 자동 스모크는 실제 Android 실기기 gate를 대체하지 않는다.

4. Weapon catalog 정본 드리프트 정리
   - 권장 assignee: `levelmini`
   - 범위: 9종/14종, 4슬롯/8슬롯, onigiri Lv.6/Lv.8, starter/계정해금 범위를 현행 코드와 기획 문서 중 어느 쪽으로 잠글지 정리.
   - 수락 기준: Planner 산출물 1개 + QA가 카드 풀/성장 분포를 측정할 수 있는 체크리스트.

### Queue B — 모바일/QA 증거가 먼저 필요하거나 Terry 결정 필요

5. 실제 Android/WebView 1판 루프 QA
   - 권장 assignee: Balance_QA_Mini 성격의 QA 담당. 단, 이 통합 카드에서는 자기 자신에게 Kanban follow-up을 만들지 않는다.
   - 필요 조건: 실제 Android 기기/에뮬레이터/설치 빌드 접근 또는 Terry의 기기 검증 승인.
   - 수락 기준: 240초 클리어 또는 자연 게임오버 1회 이상, 30초/48초/144초/192초/240초 로그, 스크린샷/영상/콘솔/기기 정보.

6. signed AAB/internal testing install gate
   - 권장 assignee: `launchmini`
   - 필요 조건: JDK/keystore/signing/Play Console access 여부 확인. Terry 승인 없이는 production/global 절대 금지.
   - 수락 기준: clean JS test exit, Android build, signed AAB, internal test install smoke, admin/cheat UI 비노출 확인.

7. Privacy/Data safety/account deletion/Firebase minimization
   - 권장 assignee: `backendmini` + `launchmini` 협업
   - 필요 조건: Google login/cloud save를 이번 internal test에 넣을지 Terry 결정.
   - 수락 기준: 저장 필드 최소화(email/photoURL 재판단), Firebase rules 자기 uid, account deletion 안내/요청 경로, privacy policy/Data safety draft.

### Queue C — Stage 1 안정화 후로 대기

8. 결제/광고/출석/시즌/공식 랭킹 보상
   - 상태: 대기.
   - 이유: BM scope guard에서 Stage 1 모바일 루프 안정화 전 구현 금지.

9. 새 백엔드/공식 글로벌 랭킹/멀티플레이
   - 상태: 대기.
   - 이유: backend boundary에서 Stage 1 안정화 전 구현 금지. 현재는 최소 DTO/경계만 유지.

10. Stage 2 확장/공개 store headline
   - 상태: 대기.
   - 이유: 현재 priority는 content expansion이 아니라 Stage 1 mobile playable loop stability.

## 7. Terry 결정이 필요한 항목

1. 실제 Android 검증 경로
   - Terry가 직접 기기로 해줄지, 에뮬레이터/원격 디버깅/내부 테스트 설치로 갈지 결정 필요.

2. Google login/cloud save를 internal test에 포함할지
   - 포함하면 privacy/Data safety/account deletion/Firebase rules gate가 먼저 필요하다.
   - 제외/숨김이면 store copy와 테스트 범위를 그에 맞게 줄여야 한다.

3. Play internal test를 지금 목표로 둘지, 웹/QA 루프 안정화를 먼저 닫을지
   - Launch gate 기준 production은 불가. internal testing도 JDK/signed AAB/privacy/admin gate가 남아 있다.

4. 무기 카탈로그 launch roster
   - 9종 기준 유지인지, 현재 14종 코드 방향을 정본화할지 제품/기획 결정 필요.

5. gstack path policy 문서화 여부
   - Hermes profile `$HOME`과 Windows user-global gstack path가 달라 일부 worker가 `GSTACK_MISSING`으로 오해했다. 프로젝트 정책을 수정할지, worker별 지침으로 둘지 결정 필요.

## 8. 통합 No-Go 해제 조건

최소한 아래가 모두 충족되어야 Stage 1 internal-test 후보로 올릴 수 있다.

1. `npx vitest run --maxWorkers=1 --no-file-parallelism` 또는 합의된 Windows-safe test suite가 exit code 0.
2. `npm run build` 통과. large chunk warning은 수용/추적 결정.
3. 웹 스모크: title → nickname → Stage 1 → 30초 이상 생존 → level-up 카드 선택 → pause/resume → restart 통과.
4. Playwright 모바일 스모크 또는 390x844 browser smoke 통과.
5. 실제 Android/WebView 설치 빌드에서 자연 게임오버 또는 240초 클리어 1회 이상.
6. Stage 1 E04/B01 projectile 없음.
7. XP pending level-up 손실 없음.
8. milestone/boss/gold/localStorage 보상 손실 없음.
9. admin/cheat UI가 external/public-facing build에서 숨김/보호됨.
10. 변경 소유권/리뷰/QA 증거가 파일 단위로 연결됨.

## 9. 이번 통합 카드에서 변경한 파일

생성:
- `Quaility_Assurance/auto_deploy_integration_gate_2026-06-24.md`

코드 변경 없음. 테스트 코드 변경 없음. 커밋/푸시 없음.

## 10. Kanban follow-up 상태

이 통합 카드에서 생성한 비-self follow-up card:

- `t_2ac3d69d` / assignee `threemini`: implement 3D toon charge cue for Stage 1 enemies.
- `t_d91d87a4` / assignee `threemini`: add Graphics Studio runtime parity regression guards.
- `t_bcda3c3c` / assignee `madangsue`: restore Playwright mobile smoke environment for Stage 1 QA.
- `t_227da1d0` / assignee `levelmini`: resolve Stage 1 weapon roster and card-pool drift.
- `t_3f6d4caf` / assignee `launchmini`: verify Android signed AAB readiness for internal testing only.
- `t_3738e092` / assignee `backendmini`: plan Firebase privacy minimization and account deletion gate.

생성하지 않은 self follow-up:

- 실제 Android/WebView 1판 루프 QA는 Balance_QA_Mini 성격의 후속 작업이지만, Kanban worker 규칙상 자기 자신에게 follow-up을 만들지 않았다. 이 항목은 Terry의 실기기/빌드 접근 결정 또는 별도 운영자 배정 후 생성해야 한다.

