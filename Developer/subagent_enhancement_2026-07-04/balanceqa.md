# Balance_QA_Mini 금일 30분 고도화 결과 — 2026-07-04 18:39 KST

## 1. 수행 범위
- 대상 프로필: `balanceqa` / durable agent `Balance_QA_Mini`(밸검미니).
- 작업 유형: 금일 서브에이전트 30분 self-improvement / capability-hardening 1회차.
- 공통 초점: `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`를 QA/login-matrix 운영 준비도에 통합.
- 금지 준수: 코드 변경 없음, 커밋 없음, 배포 없음, 외부 메시지 없음, 다른 프로필 수정 없음.

## 2. 읽은 핵심 자료
- `AGENTS.md`: QA 기록은 `Quaility_Assurance/`, 검증 없는 완료 선언 금지, git status 확인 규칙.
- `project_develop_policy.md`: QA 부서 정책상 테스트 계획/검증 결과/버그 위험/리뷰 기록은 `Quaility_Assurance/`에 기록, 미검증 기능을 검증 완료로 기록 금지.
- `Bang_Rules.md`: Stage 1 모바일 플레이 루프의 기준 수치·스테이지 규칙, Google 로그인 이슈가 첫 세션 진입을 막으면 Stage 1 QA 자체가 지연될 수 있음.
- `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`: P0~P6 Google 로그인 예방 체크리스트.
- `Quaility_Assurance/title_start_google_login_gate_validation_2026-07-04.md`: 미로그인 상태에서 `Game Start`가 Google 로그인 페이지를 여는 브라우저 체크 기록.
- `Quaility_Assurance/google_login_account_bound_progress_validation_2026-07-04.md`: 계정 진행 저장 관련 자동 테스트/빌드 통과 기록 및 Firebase Console Rules 미검증 메모.
- `Quaility_Assurance/cumulative_shared_google_ranking_validation_2026-07-04.md`: 랭킹 경로 자동 테스트/빌드 통과, 실제 콘솔 규칙/계정 제출 수동 확인 필요 기록.
- `src/lib/firebaseAuth.js`, `src/store/useAuthStore.js`, `src/components/TitleScreen.jsx`, `src/components/GoogleAccountPanel.jsx`, 관련 테스트 파일.

## 3. 현재 코드/QA 기준으로 통합한 로그인 QA 매트릭스

### A. 스택 식별(P0)
- 현재 확인된 코드 경로는 `Firebase Auth` + Web `GoogleAuthProvider` + `signInWithPopup` 중심이다.
- `package.json`에는 `@capacitor/android`가 있으나, 이번 스캔 범위에서 Play Games Services/Android native Google Sign-In 플러그인 구현은 확인하지 못했다.
- 따라서 PGS/SHA/Play App Signing 항목은 **출시/AAB 검증 단계에서 별도 확인 필요**로 둔다. 이번 결과만으로 Android 스토어 다운로드 로그인 정상은 검증 완료 처리하지 않는다.

### B. 최소 QA 로그인 매트릭스(P5-01 반영)
| 축 | 필수 케이스 | 밸검미니 판정 방식 |
|---|---|---|
| 배포 경로 | 로컬 dev, production build/preview, Android local release, Internal Testing, Production | 각 경로별 `signedOut → start → signIn/success/fail → stage entry` 증거 분리 |
| 계정 상태 | 신규 Google 계정, 기존 계정, 다중 계정 기기 | 닉네임 최초 입력/기존 닉네임 즉시 시작/계정 선택기 루프 확인 |
| 실패 원인 | 취소, 팝업 차단/복귀 실패, 네트워크 지연, Firebase 미설정, 콘솔 Rules 미반영 | 사용자 복구 문구 + 원문 오류/코드 보존 확인 |
| 진행 데이터 | cloud load 전/후, local fallback, ranking write/read | `users/$uid`, `rankings/{seasonId}/entries/{uid}` 실제 콘솔 확인 전까지 미검증 |
| 모바일 UX | 320x568, 390x844, Android WebView/Chrome | 10~30초 지연 시 무한 스피너·첫 세션 차단 여부 확인 |

### C. QA 이벤트/텔레메트리 보강(P3/P6)
- 로그인 시도: `auth_signin_start` with `{surface:title|panel, route:web_popup|native, build_channel}`.
- 성공/실패: `auth_signin_result` with `{status, error_code_raw, elapsed_ms, retry_count}`.
- 첫 플레이 영향: `stage_start_blocked_by_auth`, `guest_continue_after_auth_fail`, `cloud_progress_sync_result`.
- 운영 임계값: 체크리스트 P6-01 기준 `로그인 성공률 95% 미만` 또는 `p95 지연 10초 초과`는 QA/릴리스 경고로 올린다.

## 4. 확인한 테스트 실행
```bash
cd D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype
npm test -- src/components/TitleScreen.settings.test.jsx src/lib/firebaseAuth.test.js src/store/useAuthStore.cloudProgress.test.js src/lib/firebaseProgress.test.js
```

결과:
- Test Files: 4 passed / 4
- Tests: 26 passed / 26
- 관찰: `ReactDOMTestUtils.act` deprecated 및 `testing environment is not configured to support act(...)` 경고가 기존처럼 stderr에 출력됨. 이번 고도화에서 새 코드 변경은 하지 않았으므로 신규 회귀로 판정하지 않음.

## 5. 발견한 리스크
- **HIGH — 로그인 timeout/재시도/fallback 미보강:** `useAuthStore.signInWithGoogle()`는 `client.signInWithGoogle()`를 그대로 await한다. 체크리스트 P3-03의 10~30초 timeout, 지수 백오프, 게스트 진행/수동 재시도 UI가 아직 QA 완료 기준으로 고정되어 있지 않다.
- **HIGH — 첫 세션 진입이 Google 성공에 종속:** `TitleScreen.handleStartClick()`은 미로그인 상태에서 로그인 실패 시 `onStart`를 호출하지 않는다. 인증 장애가 Stage 1 모바일 플레이 루프 진입 차단으로 전이될 수 있다.
- **MEDIUM — 내부 중복 호출 가드 부족:** `TitleScreen`과 `GoogleAccountPanel`은 `signingIn`을 이용해 버튼/클릭을 막지만, store 함수 자체에는 `if (get().signingIn) return null` 같은 내부 방어가 보이지 않는다. 다른 호출 표면이 생기면 P3-06 중복 호출 위험이 남는다.
- **MEDIUM — 오류 원문/사용자 문구 분리 부족:** `getErrorMessage()`는 에러 메시지를 그대로 UI state에 싣고, `GoogleAccountPanel` detail은 한 줄 ellipsis다. P3-05의 원문 코드 보존과 초보자용 복구 문구가 분리되어야 한다.
- **MEDIUM — 실제 Firebase Console/Play Console 미검증:** 기존 QA 기록도 Firebase Rules와 실제 계정 제출 확인을 수동 TODO로 남겼다. 자동 테스트 통과를 실제 클라우드/스토어 로그인 검증 완료로 확장하면 안 된다.
- **LOW — Web popup 모바일 표면:** `signInWithPopup` 경로는 모바일 브라우저/웹뷰에서 팝업 차단·복귀 실패 UX가 생길 수 있으므로 Android/Capacitor 표면은 별도 실기기/내부테스트 증거가 필요하다.

## 6. 밸검미니 운영 체크리스트 보강
- Google/Auth 관련 QA에서는 항상 체크리스트 P0→P6 순서로 상태를 나누고, 사용하지 않는 스택만 `SKIP` 사유를 적는다.
- 자동 테스트 통과, 브라우저 수동 확인, Firebase Console Rules 확인, Play Console/AAB SHA 확인, 실기기 Internal Testing 확인을 서로 다른 검증 등급으로 기록한다.
- Stage 1 모바일 QA에서 로그인 실패는 “로그인 버그”뿐 아니라 “첫 플레이 루프 진입 차단”으로도 분류한다.
- QA 기록에는 `{배포 경로, 계정 상태, 기기/브라우저, 네트워크, 오류 원문, elapsed_ms, cloud sync 결과, ranking 결과}`를 재현 조건으로 남긴다.
- 미검증 항목은 반드시 `Blockers` 또는 `Manual checks remaining`으로 분리한다.

## 7. 다음 권장 작업
1. `backendmini`+`uimini` 구현 카드: `signInWithGoogle` 10~30초 timeout, store-level 중복 호출 가드, 재시도/게스트 계속 CTA, 오류 코드 보존/사용자 문구 분리.
2. `balanceqa` 검증 카드: 위 구현 후 production preview + Android/Internal Testing 로그인 매트릭스 QA 문서 작성.
3. `launchmini`/`backendmini` 콘솔 카드: Play App Signing SHA-1/SHA-256, OAuth/Firebase SHA, Firebase Rules, Internal Testing 계정 매트릭스 실제 증거 수집.

## 8. 변경 파일
- 생성: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/subagent_enhancement_2026-07-04/balanceqa.md`
- 생성: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/game_difficulty_leveling_qa_specialist/knowledge/iterations/iteration_20260704_183944_KST_Balance_QA_Mini_google_signin_login_matrix.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/game_difficulty_leveling_qa_specialist/ledger.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/game_difficulty_leveling_qa_specialist/knowledge/source_index.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/game_difficulty_leveling_qa_specialist/knowledge/difficulty_qa_knowledge_base.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/game_difficulty_leveling_qa_specialist/knowledge/learning_transfer_manifest.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Balance_QA_Mini.toml`
