# backendmini 30분 고도화 기록 — 2026-07-04

- 프로필: `backendmini` / Backend_Mini / 백엔드미니
- 실행 모드: 금일 나머지 서브에이전트 30분 self-improvement / capability-hardening 1회차
- 작업 범위: `GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`를 Firebase/Auth/backend 운영 readiness 관점으로 흡수하고, 현재 프로젝트 코드·문서의 최소 위험 경계를 재정리
- 금지 범위 준수: 코드 수정 없음, Firebase/Play Console 접근 없음, 배포 없음, commit/push 없음, 외부 메시지 없음, 다른 프로필 수정 없음
- 제품 우선순위 준수: `CEO/current_product_priorities.md` 기준 백엔드·리더보드·계정 시스템·멀티플레이는 Stage 1 모바일 루프 안정 전까지 deferred. 따라서 이번 산출물은 구현이 아니라 운영 준비/리스크 경계 문서다.

## 1. 기준으로 읽은 문서/파일

- `project_develop_policy.md`
- `CEO/current_product_priorities.md`
- `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`
- `Developer/auto_deploy_backend_boundary_2026-06-24.md`
- `Developer/firebase_realtime_database_rules_todo_2026-07-04.md`
- `Developer/구현기록/공통기술기록/google_login_title_auth_implementation_2026-06-15.md`
- `Developer/r3f_prototype/src/lib/firebaseAuth.js`
- `Developer/r3f_prototype/src/store/useAuthStore.js`
- `Developer/r3f_prototype/src/lib/firebaseProgress.js`
- `Developer/r3f_prototype/src/lib/firebaseRanking.js`
- `Developer/r3f_prototype/src/components/GoogleAccountPanel.jsx`
- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
- `Developer/r3f_prototype/.env.example`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Backend_Mini.toml`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_backend_realtime_identity_specialist/knowledge/backend_knowledge_base.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_backend_realtime_identity_specialist/knowledge/source_index.md`

## 2. 현재 Backend/Firebase/Auth 상태 요약

| 영역 | 확인 결과 | Backend_Mini 판정 |
|---|---|---|
| Firebase Auth 초기화 | `.env` 필수 키 4종: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | 설정 없으면 `unconfigured`로 안전하게 비활성화됨 |
| Google 로그인 방식 | Web SDK `GoogleAuthProvider` + `signInWithPopup(auth, provider)` | 웹 기준 단순하나 Android/Capacitor Play 설치 경로에서는 별도 실기기 검증 필요 |
| 로그인 중복 호출 | UI button disabled와 `signingIn` 상태 있음 | 기본 가드는 있으나 store 함수 자체의 재진입 guard는 약함 |
| 로그인 timeout | `signInWithGoogle()`에 10~30초 timeout wrapper 없음 | 체크리스트 P3-03 기준 HIGH 리스크 |
| 오류 로깅 | `getErrorMessage(error)`로 message 중심 저장 | 체크리스트 P3-05 기준 raw code/platform/authStage 진단 부족 |
| 게스트 지속 플레이 | `TitleScreen.handleStartClick()`에서 로그인 실패/취소 시 `return` | Stage 1 우선순위와 충돌 가능. 로그인 실패가 플레이 시작을 막을 수 있음 |
| 클라우드 진행 저장 | `users/{uid}`에 profile + progress 저장 | 개인 편의 백업으로만 유지해야 함. 공식 경쟁/경제 근거로 사용 금지 |
| 개인정보 최소화 | `profile.email`, `profile.photoURL` 저장 | 진행 저장에는 필수 아님. 다음 정리 후보 |
| Firebase RTDB Rules | repo 내 실제 `.rules` 파일 없음. Todo 문서만 있음 | 콘솔 상태 검증 전까지 production-safe라고 주장 금지 |
| 랭킹 제출 | `firebaseRanking.js`가 client-side RTDB set으로 `rankings/{seasonId}/entries/{uid}` 저장 | 공식 랭킹/보상으로 승격 금지. 서버 검증 없는 개인/테스트 성격으로 제한 |

## 3. Google Sign-In 체크리스트를 Backend 운영 readiness로 변환한 규칙

### Backend Gate A — 스택·환경 식별(PHASE 0)

- [ ] 현재 빌드가 Web Firebase Auth만 쓰는지, Android native Google Sign-In/Play Games Services를 쓰는지 구분한다.
- [ ] `package.json`의 Firebase SDK 버전과 Capacitor/Android 버전을 릴리스 기록에 남긴다.
- [ ] 로컬 웹, Capacitor Android debug, Play internal testing 설치 경로를 분리해 실패 위치를 기록한다.
- [ ] `.env` 실제 값은 저장하지 않고, 키 존재 여부와 Firebase project/app id 일치 여부만 검증한다.

### Backend Gate B — 자격 증명·콘솔 정합성(PHASE 1~2)

현재 구조가 Web Firebase Auth라 해도, Android 앱으로 배포하면 콘솔 정합성 확인은 필수다.

- [ ] Firebase Auth에서 Google provider 활성화 확인.
- [ ] Firebase authorized domain / OAuth consent support email / OAuth publishing status 확인.
- [ ] Play internal/closed tester와 OAuth test user가 필요한 경우 양쪽 목록을 맞춘다.
- [ ] Android native/PGS로 전환하거나 Play Games Services를 추가할 때는 Play App Signing SHA-1/SHA-256과 OAuth Android client package/SHA 일치를 별도 게이트로 둔다.
- [ ] `google-services.json`이 필요한 native 경로를 도입할 때만 최신성·SHA 재다운로드를 검증한다. 현재 Web SDK 경로에서는 `.env` Firebase Web App 설정이 핵심이다.

### Backend Gate C — 클라이언트 Auth UX·장애 방지(PHASE 3)

- [ ] 로그인 호출에는 10~30초 timeout을 둔다.
- [ ] timeout/취소/팝업 차단/네트워크 실패 시 게임 시작이 완전히 막히지 않도록 게스트/로컬 닉네임 fallback을 둔다.
- [ ] `signingIn` 상태는 UI뿐 아니라 store/action 레벨에서도 재진입을 막는다.
- [ ] Firebase Auth error의 `code`, `message`, `customData`, `authStage`, `platform`, `appVersion`을 진단용으로 구조화한다. 단, 토큰·credential·secret은 기록하지 않는다.
- [ ] Capacitor Android WebView에서 `signInWithPopup`이 불안정하면 `signInWithRedirect` 또는 native/Credential Manager 경로를 별도 카드로 검토한다.

### Backend Gate D — 데이터·Rules·anti-cheat 경계(PHASE 5~6)

- [ ] `users/{uid}`는 개인 진행도 백업으로만 사용한다.
- [ ] `rankings/{seasonId}/entries/{uid}`는 서버 검증 전까지 공식 경쟁 랭킹·보상 지급 근거로 쓰지 않는다.
- [ ] Firebase RTDB Rules는 콘솔에만 두지 말고, 추후 `database.rules.json` 같은 repo 추적 파일과 emulator 테스트로 관리한다.
- [ ] Rules 최소값: 전역 `.read/.write=false`, `users/$uid` owner read/write, ranking write는 `auth.uid === $uid` + score/schema validation.
- [ ] 경제·골드·무기 해금·패시브 업그레이드는 클라이언트 직접 저장을 공식 truth로 삼지 않는다.
- [ ] App Check는 먼저 monitoring으로 붙이고, 오탐 없는지 확인 후 enforcement를 고려한다.

## 4. 오늘 발견한 주요 리스크

| 위험 | 심각도 | 근거 | 권장 대응 |
|---|---:|---|---|
| 로그인 실패가 Stage 1 플레이 시작을 막음 | HIGH | `TitleScreen.handleStartClick()`에서 미로그인 → `signInWithGoogle()` → user 없으면 `return` | 다음 개발 카드에서 게스트/로컬 닉네임 fallback 추가 |
| 로그인 timeout 부재 | HIGH | `useAuthStore.signInWithGoogle()`가 popup promise를 직접 await | 10~30초 timeout + 실패 메시지 + 재시도 UI 추가 |
| Firebase Auth raw error code 부족 | HIGH | 오류를 message string으로 축약 | `error.code`/stage/platform/appVersion 구조화. token/secret 제외 |
| Android/Capacitor WebView `signInWithPopup` 실증 없음 | HIGH | 현재 구현은 Web SDK popup 중심 | Play internal 설치 경로에서 실기기 smoke 필요. 실패 시 redirect/native 전환 검토 |
| 개인정보 과다 저장 후보 | MEDIUM | `firebaseProgress.js`가 email/photoURL 저장 | 진행 저장에는 `uid`, displayName/nickname 중심으로 축소 검토 |
| 실제 RTDB Rules 검증 불가 | HIGH | repo에는 `.rules` 파일이 없고 todo 문서만 존재 | Firebase Console 현재 rules 백업 후 repo 추적 rules + emulator 테스트 준비 |
| client-side ranking write | HIGH | `firebaseRanking.js`가 client에서 score를 직접 set | 공식 랭킹/보상 금지. Stage 1 뒤 Cloud Functions/custom API로 서버 재계산 |

## 5. Backend_Mini 운영 규칙 강화

앞으로 백엔드미니는 Escape! zombie school의 Auth/Firebase 관련 요청에서 아래 순서를 기본으로 적용한다.

1. 먼저 `CEO/current_product_priorities.md`를 확인해 계정/백엔드/랭킹이 deferred인지 판단한다.
2. Stage 1 안정 전에는 새 백엔드 기능을 구현하지 않고, 로그인 실패가 플레이 루프를 막지 않는 UX/장애 경계만 우선한다.
3. Google 로그인 이슈는 항상 `콘솔/SHA/동의화면` 문제와 `클라이언트 timeout/fallback/로그` 문제를 분리해 진단한다.
4. Firebase Auth ID token, Google ID token, Play Games Services identity를 혼동하지 않는다.
5. 개인 진행도 저장과 공식 랭킹/경제 truth를 분리한다.
6. Firebase Rules/App Check/Cloud Functions는 “API 키 숨기기”보다 중요한 실제 권한 경계로 설명한다.
7. 실기기/Play 설치 경로를 검증하지 않은 로그인은 “동작 가능 코드”이지 “출시 검증 완료”로 표현하지 않는다.

## 6. 다음 권장 작업

1. **가장 먼저 할 개발 카드**: `TitleScreen` / `useAuthStore`에 Google 로그인 실패·취소·timeout 시 게스트 플레이 fallback과 10~30초 timeout을 추가한다. Stage 1 모바일 루프 안정성과 직접 연결된다.
2. **다음 QA 카드**: Play internal test link 설치 기준으로 Google 로그인 smoke를 기록한다. 성공/실패 캡처, error code, OS/WebView/Play Services 버전을 남긴다.
3. **다음 Backend 문서 카드**: Firebase Console의 실제 Realtime Database Rules를 백업하고, repo 추적용 rules 파일 + emulator test TODO로 전환한다.
4. **Stage 1 이후 카드**: 공식 랭킹이 필요해질 때 `firebaseRanking.js` client write를 Cloud Functions/custom API `finishRun` 서버 재계산 구조로 교체한다.

## 7. 검증 로그

```text
2026-07-04 18:49:57 local date command executed.
Backend_Mini TOML parse: TOML_OK C:\Users\admin\AppData\Local\hermes\sub-agent-room\agents\Backend_Mini.toml
Git status check: branch feature/stage2-corridor-floor-graphics ahead 2; 기존 수정/미추적 파일 다수 존재. 이번 작업은 이 문서 1개만 추가.
```

## 8. 변경/생성 파일

- 생성: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/subagent_enhancement_2026-07-04/backendmini.md`
- 코드 변경: 없음
- Firebase/Play Console 변경: 없음
- 다른 Hermes 프로필/TOML 변경: 없음
- commit/push: 없음
