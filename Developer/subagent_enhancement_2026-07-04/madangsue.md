# madangsue 30분 고도화 기록 — 2026-07-04

- 프로필: `madangsue` / Madang_sue / 마당쇠
- 실행 모드: 금일 나머지 서브에이전트 30분 self-improvement / operations capability-hardening 1회차
- 실행 시각: 2026-07-04 18:53 KST 기준 확인
- 작업 범위: Google Sign-In 이슈 방지 체크리스트를 커뮤니티·지원·운영 장부 readiness로 흡수하고, Kanban/agent-room 운영 시 누락되기 쉬운 증거·보고·알림 기준을 정리
- 금지 범위 준수: 코드 수정 없음, cron 생성/변경 없음, 외부 메시지 발송 없음, 배포 없음, commit/push 없음, 다른 Hermes 프로필/TOML 수정 없음

## 1. 기준으로 읽은 문서/파일

- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/registry.toml`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Madang_sue.toml`
- `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`
- `Developer/agent_room/game_development_kanban_process.md`
- `Developer/agent_room/antigravity_ide_subagent_handoff.md`
- `Developer/auto_deploy_backend_boundary_2026-06-24.md`
- `Developer/firebase_google_login_realtime_database_integration_2026-06-20.md`
- `Developer/subagent_enhancement_2026-07-04/RUN_MANIFEST.md`
- `Developer/subagent_enhancement_2026-07-04/backendmini.md`
- `Developer/subagent_enhancement_2026-07-04/launchmini.md`

## 2. 마당쇠 운영 규칙 강화

앞으로 마당쇠는 Google 로그인·Firebase Auth·Play internal test 관련 운영/지원/장부 요청에서 아래 순서를 기본으로 적용한다.

### Ops Gate A — 장애 접수 문구를 그대로 보존하되, 구조화 필드를 붙인다

유저/테스터가 말한 원문은 변형하지 않고 보존한다. 단, 장부에는 아래 필드를 함께 붙여 개발/QA/출시 에이전트가 재현 가능한 사건으로 넘길 수 있게 한다.

```text
reported_at:
channel:
reporter_type: tester | user | Terry | agent
build_track: local_web | local_android_debug | Play_internal | Play_closed | production | unknown
app_version / versionCode:
device_model:
android_version:
google_play_services_version:
network_context:
symptom_keyword: popup_closes | infinite_spinner | developer_error_10 | canceled_12501 | in_progress_12502 | network_7 | unknown
raw_error_code:
raw_error_message:
screenshot_or_log_path:
user_original_text:
triage_phase_hint: P0 | P1 | P2 | P3 | P4 | P5 | P6
assigned_profile: backendmini | launchmini | balanceqa | uimini | englishgradmini | madangsue
next_action:
```

### Ops Gate B — Google 로그인 이슈는 “지원 응대”와 “출시 차단”을 분리한다

- 지원/커뮤니티 응대: 유저에게 계정·기기·Play Services·네트워크 확인 안내가 필요하다.
- 개발/QA 차단: timeout 없음, raw error code 부족, 게스트 fallback 없음, Play internal 설치 경로 미검증은 릴리스 readiness blocker로 장부화한다.
- 출시/콘솔 차단: OAuth consent, support email, tester 목록, Play App Signing SHA는 Launch_Mini/Backend_Mini에 넘기되, 콘솔 값을 채팅/장부에 노출하지 않는다.

### Ops Gate C — “무한 스피너/로그인 안됨” 접수 시 즉시 라우팅

| 접수 증상 | 우선 라우팅 | 마당쇠 장부 메모 |
|---|---|---|
| 팝업이 떴다가 닫힘 / `DEVELOPER_ERROR(10)` | `backendmini` + `launchmini` | SHA/OAuth/Web Client ID/패키지명 의심. 실제 콘솔 값은 비공개 유지 |
| Play 설치 빌드만 실패 | `launchmini` | Play App Signing 재서명 SHA와 internal test track 증거 필요 |
| 특정 계정만 루프 | `backendmini` + `balanceqa` | tester 목록/OAuth test user/다중 계정/계정 캐시 안내 후보 |
| 특정 OS·기기만 무한 스피너 | `balanceqa` + `backendmini` | OS/WebView/Play Services 버전과 플러그인·SDK 회귀 의심 |
| 전 유저 동시 실패 | `backendmini` + `launchmini` | Google/Firebase status, 콘솔 설정 변경, 인증서/도메인 변경 기록 확인 |
| 영어 리뷰/해외 커뮤니티에 “sign in stuck” 증가 | `englishgradmini` + `madangsue` | 원문 보존, 임시 공지/응대문 초안은 발송 전 Terry 승인 필요 |

### Ops Gate D — 외부 메시지/공지 안전 원칙

- 이 작업에서는 외부 메시지를 보내지 않았다.
- 향후 커뮤니티 공지는 Terry가 명시적으로 승인하기 전까지 초안만 작성한다.
- 공지문에는 원인 확정 전 “확인 중”, “재현 환경 수집 중”으로 표현하고, SHA/OAuth/콘솔 내부 설정값은 공개하지 않는다.
- 유저 셀프 해결 안내는 Google Play Services/Play Games 업데이트, 기기 재부팅, 날짜·시간 자동 설정, 계정 재추가, 네트워크 변경 정도로 제한한다.
- 계정 삭제/복구/이메일 등 개인정보 요청은 공식 지원 채널로만 유도하고 채팅 장부에 원문 개인정보를 복사하지 않는다.

## 3. 오늘 확인한 현재 운영 리스크

| 위험 | 심각도 | 근거 | 운영 대응 |
|---|---:|---|---|
| 로그인 실패/취소가 플레이 시작을 막을 수 있음 | HIGH | Backend/Launch 고도화 기록에서 `TitleScreen.handleStartClick()` return 리스크 확인 | 개발 카드 생성 시 “게스트 fallback + timeout”을 최우선 AC로 넣기 |
| timeout/raw error code 부족으로 CS 재현 정보가 빈약해질 수 있음 | HIGH | `useAuthStore.signInWithGoogle()` 관련 Backend/Launch 기록 | 접수 템플릿에 raw code/message/stage/platform 필드를 강제 |
| Play internal 설치 경로의 실기기 증거 없음 | HIGH | Launch_Mini 기록상 `adb`/실기기 검증 불가 | internal test smoke 완료 전 “로그인 출시 검증 완료” 표현 금지 |
| Google 콘솔/SHA 값은 민감 운영정보가 될 수 있음 | MEDIUM | 체크리스트 PHASE 1~2가 콘솔 설정을 요구 | 장부에는 확인 여부/담당자/일시만 기록, 값 자체는 저장하지 않기 |
| 현재 git tree에 미완료/미추적 파일 다수 존재 | MEDIUM | `git status --short --branch` 확인 | 마당쇠 산출물 외 파일을 건드리지 않고, 후속 카드에 “기존 변경 보존” 명시 |

## 4. Kanban/agent-room 카드에 넣을 운영 AC 문구

Google 로그인·지원 readiness가 포함된 후속 카드에는 아래 문구를 붙인다.

```text
Operations/support readiness acceptance criteria:
- Preserve tester/user original wording verbatim in the artifact.
- Record build track, versionCode/versionName, device, Android version, Play Services/WebView version, raw auth error code/message, and screenshot/log path when available.
- Do not paste OAuth client secrets, tokens, keystore material, Firebase private keys, or full console credential values into chat/artifacts.
- If Google login fails, verify that gameplay can continue through guest/local fallback or explicitly mark it as a release blocker.
- Do not claim Play/internal/prod login readiness until a Play-installed Android smoke result exists.
- External community/support messages are drafts only unless Terry explicitly approves sending.
```

## 5. 역할별 연결 메모

- `backendmini`: Auth timeout, structured error, fallback, Firebase Rules/privacy boundary 담당.
- `launchmini`: Play internal test, AAB/version, Play App Signing/OAuth consent/support email/tester gate 담당.
- `balanceqa`: Android 실기기 smoke, OS/WebView/Play Services matrix, release blocker 판정 담당.
- `uimini`: 실패/timeout/재시도/게스트 fallback UX 문구와 버튼 상태 담당.
- `englishgradmini`: 해외 리뷰·스토어/커뮤니티 영어 응대 초안 담당. 단, 기능 과장 금지.
- `madangsue`: 위 증거가 흩어지지 않도록 장부/카드/보고서의 필드 완결성과 외부 발송 금지선 관리.

## 6. 다음 권장 작업

1. **개발 카드 우선**: `TitleScreen`/`useAuthStore`에 Google 로그인 timeout(10~30초), raw error code 기록, 실패·취소 시 게스트/로컬 fallback을 추가한다.
2. **QA 카드 우선**: Play internal test link 설치 기준 Android 실기기 Google 로그인 smoke 증거를 남긴다.
3. **운영 장부 우선**: Google 로그인 이슈 접수 템플릿을 `Developer/agent_room/` 아래 별도 runbook으로 승격해, 향후 CS/커뮤니티 보고가 같은 필드를 쓰게 한다.
4. **공지/커뮤니티**: 유저 공지는 원인 확정 전 초안만 만들고 Terry 승인 없이 발송하지 않는다.

## 7. 검증 로그

```text
2026-07-04 18:53 KST: date 및 git status 확인.
브랜치: feature/stage2-corridor-floor-graphics...origin/feature/stage2-corridor-floor-graphics [ahead 2]
기존 변경/미추적 파일 다수 존재. 이번 작업은 이 산출물 1개만 생성/갱신.
코드 변경 없음. cron 생성/변경 없음. 외부 메시지 없음. 다른 프로필 수정 없음.
```

## 8. 변경/생성 파일

- 생성/갱신: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/subagent_enhancement_2026-07-04/madangsue.md`
- 코드 변경: 없음
- Hermes 프로필/TOML 변경: 없음
- commit/push: 없음
