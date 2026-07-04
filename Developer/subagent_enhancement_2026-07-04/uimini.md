# UI_Mini 금일 30분 고도화 결과 — 2026-07-04 18:35 KST

## 1. 수행 범위
- 대상 프로필: `uimini` / durable agent `UI_Mini`.
- 작업 유형: 금일 서브에이전트 30분 self-improvement / capability-hardening 1회차.
- 공통 초점: `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`를 UI/HUD/모바일 운영 준비도에 통합.
- 금지 준수: 코드 변경 없음, 커밋 없음, 배포 없음, 외부 메시지 없음, 다른 프로필 수정 없음.

## 2. 읽은 핵심 자료
- `project_develop_policy.md`: Developer 산출물 위치와 검증 없는 완료 선언 금지.
- `Bang_Rules.md`: Stage 1/플레이 규칙과 UI 라벨·타이밍 근거.
- `Developer/agent_room/subagent_system_wiring_2026-07-03.md`: UI/HUD/모바일은 `uimini`, 최종 검증은 `balanceqa` 라우팅.
- `Developer/agent_room/antigravity_ide_subagent_handoff.md`: Kanban/IDE 라우팅 기준.
- `Developer/agent_room/uimini_mobile_optimization_resident_2026-07-03.md`: 320px, 44px 터치 타깃, Google login/cloud/ranking 실패 상태의 모바일 가독성 기준.
- `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`: Google Sign-In 예방 PHASE 0~6.
- `Developer/r3f_prototype/src/lib/firebaseAuth.js`: Firebase Web Auth + `signInWithPopup` 경로 확인.
- `Developer/r3f_prototype/src/store/useAuthStore.js`: `checking/signedOut/signedIn/error/unconfigured`, `signingIn`, catch 처리 확인.
- `Developer/r3f_prototype/src/components/GoogleAccountPanel.jsx`: 계정 패널 상태 표시와 34px 버튼 높이 확인.
- `Developer/r3f_prototype/src/components/TitleScreen.jsx`: 시작 버튼이 미로그인 시 `signInWithGoogle()` 성공을 요구하는 흐름 확인.

## 3. UI_Mini 도메인 통합 결론
1. **Google 로그인은 UI에서 비차단·복구 가능해야 한다.**
   - 체크리스트 P3-03 기준 무한 스피너 금지, 10~30초 타임아웃·재시도·게스트 진행 또는 수동 재시도 UI가 필요하다.
   - UI_Mini 기준으로는 `checking`, `signingIn`, `error`, `signedOut`, `signedIn`, `unconfigured` 상태를 모두 별도 시각 상태로 보존한다.

2. **모바일 첫 판 시작은 인증 실패에 막히면 안 된다.**
   - 현재 `TitleScreen.jsx`는 `handleStartClick`에서 미로그인 상태면 `signInWithGoogle()`를 기다리고, `user?.uid`가 없으면 시작하지 않는다.
   - UI 리스크: 팝업 차단, OAuth 지연, 네트워크 실패, 설정 불일치가 곧 첫 플레이 차단으로 이어질 수 있다.
   - 권장 UX: `silent/checking`은 작게 표시하고, 사용자가 시작을 누르면 `Google로 시작`과 `게스트로 바로 시작` 또는 실패 후 `게스트 계속/다시 시도`를 제공한다.

3. **오류 원문과 사용자 문구를 분리해야 한다.**
   - 체크리스트 P3-05는 에러 코드 원문 로깅을 요구한다.
   - 현재 `GoogleAccountPanel` detail은 한 줄 ellipsis라 긴 오류가 사용자/QA에게 잘릴 수 있다. 사용자에게는 짧은 복구 문구, QA/개발 모드에는 원문 코드 확인 경로가 필요하다.

4. **버튼 연타 가드와 터치 타깃은 함께 유지해야 한다.**
   - 현재 `signingIn` disabled 가드는 있다.
   - 다만 Google 패널 primary/secondary 버튼 `minHeight: 34`는 uimini resident 44px 기준보다 작다. 로그인 오류 복구 버튼도 44px 이상이어야 한다.

5. **웹/Firebase와 Android/Play Games 체크를 구분해 보고해야 한다.**
   - 현재 코드 확인 범위는 Firebase Web Auth(`signInWithPopup`) 중심이다.
   - 체크리스트의 SHA/Play App Signing/PGS 항목은 `backendmini`/`launchmini`/`balanceqa`와 협업해야 하며, UI_Mini는 해당 실패가 화면에서 막힘 없이 안내되는지 검증한다.

## 4. 발견한 리스크
- **HIGH**: `useAuthStore.signInWithGoogle()`에 명시적 timeout/재시도/게스트 fallback UI 연결이 보이지 않는다.
- **HIGH**: `TitleScreen.handleStartClick()`이 미로그인 사용자의 게임 시작을 Google 로그인 성공에 종속시킨다. 인증 장애가 곧 첫 세션 차단이 될 수 있다.
- **MEDIUM**: `GoogleAccountPanel` 오류 detail이 한 줄 ellipsis라 긴 Firebase/Auth 오류 코드 확인성이 낮다.
- **MEDIUM**: Google 계정 패널 버튼 높이 34px는 모바일 resident 기준 44px 미만이다.
- **LOW**: `signInWithPopup`은 모바일 브라우저/WebView에서 팝업 차단·복귀 실패 UX가 생길 수 있으므로, 배포 표면별 상태 문구와 fallback 확인이 필요하다.

## 5. UI_Mini 운영 체크리스트 보강
- Google/Auth 관련 UI를 만질 때는 `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`의 P3-03, P3-05, P3-06, P4-05, P6-01을 먼저 확인한다.
- 계정 패널 스냅샷/테스트 상태는 최소 `unconfigured`, `checking`, `signedOut`, `signingIn`, `error`, `signedIn` 6개로 둔다.
- 로그인 실패/지연 중에도 제목 화면, 설정, 시작, 게스트 진행, 랭킹/클라우드 저장 안내가 손가락 44px 기준과 320px 가독성을 유지해야 한다.
- 인증 실패 메시지는 “사용자 복구 문구”와 “QA/운영 원문 코드”를 분리해 설계한다.
- 로그인/클라우드 저장 실패는 전투 HUD·결과 화면·로컬 보상 표시를 막지 않아야 한다.

## 6. 다음 권장 작업
1. `uimini` + `backendmini` 공동 카드: `signInWithGoogle` timeout(10~30초), 재시도/게스트 계속 CTA, 오류 코드 보존·사용자 문구 분리 설계.
2. `uimini` 구현 카드: `GoogleAccountPanel` 버튼 44px화, 긴 오류/복구 문구 모바일 레이아웃, 6상태 테스트 보강.
3. `balanceqa` 검증 카드: 320x568/390x844에서 `signedOut → signingIn timeout/error → guest continue → result/cloud retry` 흐름 스모크.

## 7. 변경 파일
- 생성: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/subagent_enhancement_2026-07-04/uimini.md`
- 생성: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_ui_development_specialist/knowledge/iterations/iteration_20260704_1835_KST_google_signin_ui_readiness.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_ui_development_specialist/ledger.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_ui_development_specialist/knowledge/source_index.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_ui_development_specialist/knowledge/ui_knowledge_base.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_ui_development_specialist/knowledge/learning_transfer_manifest.md`
- 갱신: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/UI_Mini.toml`
