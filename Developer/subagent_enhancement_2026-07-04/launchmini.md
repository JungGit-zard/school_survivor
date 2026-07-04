# launchmini 30분 고도화 기록 — 2026-07-04

- 프로필: `launchmini` / Launch_Mini / 런치미니
- 실행 모드: 금일 나머지 서브에이전트 30분 self-improvement 1회차
- 작업 범위: Google Sign-In 이슈 방지 체크리스트를 Google Play 출시 readiness, Play Console, pre-release gating에 통합
- 금지 범위 준수: 코드 수정 없음, Play Console 제출 없음, production/global rollout 없음, commit/push 없음, 외부 메시지 없음, 다른 프로필 수정 없음
- 기준 문서:
  - `AGENTS.md`
  - `project_develop_policy.md`
  - `CEO/current_product_priorities.md`
  - `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`
  - `Developer/google_sign_in_checklist_review_2026-07-04.md`
  - `Developer/play_console_google_login_aab_check_2026-07-04.md`
  - `Quaility_Assurance/android_release_aab_validation_2026-06-29.md`
  - `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Launch_Mini.toml`
  - `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/google_play_minigame_launch_specialist/knowledge/source_index.md`
  - `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/google_play_minigame_launch_specialist/knowledge/play_store_launch_knowledge_base.md`

## 1. 이번 고도화 결론

런치미니의 출시 판정 규칙을 다음처럼 강화한다.

> Google 로그인/계정 연동 기능이 스토어 빌드에 포함되어 있으면, AAB 존재·테스트 통과만으로 Play internal/closed testing 준비 완료로 보지 않는다.  
> `Google Sign-In Checklist PHASE 0~6` 중 출시·콘솔·배포 트랙에 걸리는 항목을 Play release gate에 편입하고, 실패/차단 항목은 내부 테스트 릴리스 노트와 QA blocker로 남긴다.

현재 `Escape! zombie school`의 Google Play 관점 판정은 다음이다.

- **internal testing 업로드 자체**: 조건부 가능 후보. AAB는 존재하고 `versionCode 5`, `versionName 1.0.4`, `targetSdk 36`으로 확인된 기록이 있다.
- **internal testing에서 로그인 OK 선언**: 아직 No-Go. Android 실기기/Play 설치 경로의 Google 로그인 완료 증거가 없다.
- **closed/open/production 확대**: No-Go. Terry의 명시 승인 없이 production/global rollout 금지.

## 2. 확인한 현황과 증거

### AAB / 런타임 도구 확인

실행 확인:

```text
AAB_STAT=Developer/r3f_prototype/android/app/build/outputs/bundle/release/app-release.aab|9474046|2026-07-04 15:43:47.276070700 +0900
JAVA=/usr/bin/bash: line 4: java: command not found
ADB=/usr/bin/bash: line 5: adb: command not found
```

의미:

- AAB 파일은 존재한다.
- 현재 셸에서는 `java`가 없어 이 자리에서 Gradle/AAB 재빌드 검증을 못 했다.
- 현재 셸에서는 `adb`가 없어 실기기 설치/로그인 재현을 못 했다.

### Android/Play 식별값

`Developer/play_console_google_login_aab_check_2026-07-04.md`와 Android build 파일 기준:

| 항목 | 값 | 출시 게이트 의미 |
|---|---:|---|
| package/applicationId | `com.jungyoon.zombieschool` | Play package 기준 |
| versionCode | `5` | Play Console 최신 업로드보다 커야 함 |
| versionName | `1.0.4` | 내부 테스트 릴리스명 후보 |
| targetSdk | `36` | 현재 목표 SDK 관점 양호 |
| AAB size | `9,474,046` bytes | 파일 존재 확인 |
| AAB mtime | `2026-07-04 15:43 KST` | 최신성은 별도 검증 필요 |

### Google 로그인 구현 리스크

코드 읽기 기준:

- `src/lib/firebaseAuth.js`는 Firebase Web SDK `GoogleAuthProvider` + `signInWithPopup(auth, provider)`를 사용한다.
- `src/store/useAuthStore.js`의 `signInWithGoogle()`에는 10~30초 timeout wrapper가 없다.
- `src/components/TitleScreen.jsx`의 `handleStartClick()`은 로그인 실패/취소 시 `return`하여 게임 시작을 막는다.
- `google-services.json`은 Android native Firebase/Google Sign-In 경로로 쓰이지 않는 현재 구조에서는 필수가 아니지만, native 전환 시 최신 파일과 SHA 등록이 필수다.

## 3. Launch_Mini 운영 규칙 강화

앞으로 런치미니는 Play 출시 readiness를 볼 때 아래를 기본 게이트로 적용한다.

### Gate A — AAB/버전/서명 기본 게이트

- [ ] AAB 파일 존재와 크기/mtime 확인
- [ ] `versionCode`가 Play Console 최신 artifact보다 큼
- [ ] `versionName`이 릴리스 노트와 일치
- [ ] `applicationId`/namespace/Capacitor `appId`가 `com.jungyoon.zombieschool`로 일치
- [ ] Play App Signing 사용 시 **upload key SHA**와 **Play app-signing SHA**를 구분
- [ ] Play App Signing이 재서명한 실제 유저 배포 SHA-1/SHA-256을 Play Console에서 확인

### Gate B — Google Sign-In 콘솔 게이트

체크리스트 PHASE 1~2를 Play Console 준비물로 승격한다.

- [ ] Firebase Auth Google provider 활성화 확인
- [ ] Firebase authorized domains에 Android WebView/Capacitor 사용 origin이 맞는지 확인
- [ ] OAuth consent screen 상태가 테스트/프로덕션 중 무엇인지 확인
- [ ] OAuth support email 누락 여부 확인
- [ ] internal/closed tester가 Play 테스트 트랙과 OAuth 테스트 사용자 양쪽에 필요한 만큼 등록되어 있는지 확인
- [ ] native Google Sign-In/PGS로 전환할 경우 Android OAuth client의 package+SHA가 Play App Signing SHA와 일치하는지 확인

### Gate C — 클라이언트 UX/장애 방지 게이트

체크리스트 PHASE 3 중 출시 차단으로 볼 항목:

- [ ] `signInWithPopup`이 Capacitor Android WebView에서 실기기 Play 설치로 성공하는지 확인
- [ ] 로그인 시도에 10~30초 timeout 적용
- [ ] 실패/취소/timeout 시 무한 스피너 금지
- [ ] 실패/취소/timeout 시 게스트/닉네임/수동 재시도 경로 제공
- [ ] raw error code/message/platform/appVersion/authStage 기록
- [ ] 중복 호출 방지 유지

### Gate D — internal testing 실증 게이트

internal testing을 단순 업로드로 끝내지 않고 아래 증거를 요구한다.

- [ ] Play internal test link로 실제 Android 기기에 설치
- [ ] `Google 로그인` 버튼 탭 후 성공/실패 결과 캡처
- [ ] 성공 시 앱으로 돌아와 signed-in UI/닉네임/클라우드 진행 저장까지 확인
- [ ] 실패 시 error text, screenshot, 가능하면 logcat 확보
- [ ] pre-launch report의 crash/ANR/accessibility/performance 경고 확인

## 4. 오늘 발견한 리스크

| 위험 | 심각도 | 근거 | 런치미니 판정 |
|---|---:|---|---|
| Android installed Google login 미검증 | HIGH | `adb` 없음, 실기기 내부 테스트 완료 증거 없음 | internal test 업로드 후 실기기 smoke 전까지 No-Go |
| `signInWithPopup` + Capacitor WebView | HIGH | 로컬 웹은 가능해도 Play 설치 WebView 동작은 다를 수 있음 | 실패 시 redirect/native credential flow 전환 필요 |
| 로그인 실패 시 게임 시작 차단 | HIGH | `TitleScreen.handleStartClick()`에서 user 없으면 return | 출시 전 UX blocker 후보 |
| 로그인 timeout/raw code 부족 | HIGH | `useAuthStore.signInWithGoogle()`에 timeout/structured code 없음 | 진단 불가/무한 대기 리스크 |
| Play app-signing SHA 미확인 | CRITICAL for native/PGS | Play Console 접근 필요 | native 로그인/PGS 전환 시 반드시 확인 |
| `java`, `adb` 부재 | MEDIUM | 현 셸 확인 결과 command not found | 현재 에이전트 환경에서 재빌드/실기기 검증 제한 |

## 5. 다음 권장 작업

1. **개발 수정 우선순위**: `게임 시작`이 Google 로그인 실패/취소/timeout에 막히지 않도록 게스트/닉네임 fallback과 10~30초 timeout을 추가한다.
2. **출시 QA 우선순위**: AAB를 internal testing에만 올리고, Play internal test link로 실기기 설치 후 Google 로그인 smoke를 증거화한다.
3. **콘솔 확인 우선순위**: Play App Signing SHA, OAuth consent/support email, Firebase Auth Google provider, tester 목록을 Play/Firebase/Cloud Console에서 수동 확인한다.
4. **확대 금지**: 위 증거 전에는 closed/open/production rollout으로 확대하지 않는다.

## 6. 변경/생성 파일

- 생성/갱신: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/subagent_enhancement_2026-07-04/launchmini.md`
- 코드 변경: 없음
- 전역 Launch_Mini TOML/다른 프로필 변경: 없음
- commit/push: 없음
