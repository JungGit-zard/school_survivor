# Level_Mini 금일 30분 고도화 결과 — 2026-07-04 18:30 KST

## 1. 수행 범위
- 역할: 레벨미니 / Stage 1 모바일 플레이어블 루프, 난이도 곡선, 보상 페이싱, 세션 설계.
- 목적: Google Sign-In 이슈 방지 체크리스트를 레벨/세션 설계 관점에 통합하고, Stage 1 안정화 우선순위에 맞는 운영 준비도를 강화.
- 금지 준수: 코드 변경 없음, 커밋 없음, 배포 없음, 외부 메시지 없음, 다른 프로필 수정 없음.

## 2. 읽은 핵심 자료
- `AGENTS.md`: 레벨미니 역할, Stage 1 안정화 우선, 역할별 기록 위치.
- `project_develop_policy.md`: Developer/Planner 산출물 분리, 검증 없는 완료 선언 금지.
- `Bang_Rules.md`: 1블록=4 units, Stage 1 E04 금지, 4분 전환 주의.
- `Planner/current_game_rules.md`: Stage 1 루프/무기/보상/모바일 완료 기준.
- `Planner/B. GAME_DESIGN/Stage_balance_summary.md`: 240초 Stage 1 웨이브·마일스톤 정본.
- `Planner/auto_deploy_stage1_loop_leveling_plan_2026-06-24.md`: P0-L1~L4 QA 수락 기준.
- `Planner/game_contents/weapons/stage1_weapon_roster_card_pool_drift_resolution_2026-06-24.md`: 카드풀 드리프트와 QA 계정 상태 분리 기준.
- `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`: Google 로그인 실패 예방 PHASE 0~6.

## 3. 레벨미니 도메인 통합 결론
1. **Stage 1 240초 루프는 로그인 실패와 독립적으로 playable이어야 한다.**
   - Google 로그인 팝업 지연, 무한 스피너, silent sign-in 실패가 0초 시작/조작/레벨업/결과 화면을 막으면 P0 UX 리스크다.
   - 레벨 설계 기준: 로그인은 세션 시작 전 강제 관문이 아니라 `silent sign-in → 실패 시 게스트 진행 → 결과/랭킹/클라우드 저장에서 재시도` 흐름이 안전하다.

2. **보상 페이싱은 인증 상태별로 분리 계측해야 한다.**
   - clean account / 실제 누적 계정 / unlock-all 분리 기록에 더해 `authState = guest | signedIn | signInPending | signInFailed`를 함께 기록해야 카드풀·골드·랭킹 판단이 왜곡되지 않는다.
   - Google Sign-In 실패가 `goldSession`, `runKills`, `runLevelUps`, 클리어/게임오버 결과 표시를 막으면 안 된다.

3. **무한 스피너는 난이도 문제가 아니라 세션 이탈 문제다.**
   - 체크리스트 P3-03 기준 로그인 타임아웃 권장 10~30초. Stage 1 첫 플레이에서는 10초 이상 블로킹도 과하다.
   - 권장 레벨/UX 기준: 첫 판은 즉시 플레이, 로그인 실패/지연은 비차단 토스트 또는 결과 화면 안내로 처리.

4. **QA 핸드오프에 인증 실패 시나리오를 추가해야 한다.**
   - 기존 390x844 또는 실제 Android/WebView 240초 런에 아래 관찰치를 추가:
     - 로그인 상태: guest/signedIn/pending/failed
     - 시작 후 조작 가능까지 시간
     - silent sign-in 실패 시 게임 시간 진행 여부
     - 결과 화면에서 골드/킬/클리어 표시 여부
     - 랭킹/클라우드 저장 실패가 재시작을 막는지 여부

## 4. Stage 1 수락 기준 보강안
- P0-L1 보강: Google Sign-In 실패 또는 10~30초 타임아웃 상황에서도 0초 시작, 이동, 자동 공격, XP/골드 수집, 레벨업, gameover/clear 결과 표시가 계속 가능해야 한다.
- P0-L2 보강: 모바일 pause/resume, restart 버튼은 로그인 pending 상태와 무관하게 터치 가능해야 한다.
- P0-L4 보강: 클라우드 저장 실패는 보상 표시/로컬 누적/재시작을 막지 않아야 하며, 계정 연동은 후속 복구 경로로 둔다.
- 카드풀 QA 보강: clean account / 실제 누적 계정 / unlock-all에 `authState`를 병기한다.

## 5. 발견한 리스크
- 현재 작업트리에 Google Sign-In 체크리스트와 관련 산출물이 미추적 상태로 존재한다. 내가 생성한 이 파일 외에도 다른 에이전트/사용자 변경이 많아 커밋·정리는 별도 지시 전까지 금지해야 한다.
- Stage 1 정본은 240초인데 일부 문서에 5분/300초 표현이 남아 있어, 로그인 QA 리포트도 반드시 48/144/192/240초 기준으로 써야 한다.
- 카드풀 드리프트가 남아 있으므로 로그인 계정 상태와 무기 해금 상태를 섞어 측정하면 난이도 원인 분석이 흐려진다.

## 6. Balance_QA_Mini에게 넘길 다음 실행 제안
- 실제 Android/WebView 또는 390x844 모바일 뷰포트에서 Stage 1 240초 3런 최소 스모크를 실행하되, 각 런을 `guest`, `signedIn`, `signInFailed/timeout simulated` 상태로 분리한다.
- 기록 필드: 48/144/192/240초 시점 HP, Lv, XP/xpToNext, 보유 무기 수, 최고 무기 Lv, goldSession, runKills, authState, 로그인 대기/실패 UI가 조작을 막았는지 여부.
- Go 판단 전에는 Google 로그인 성공 자체보다 “로그인 실패가 첫 판 플레이와 보상 표시를 막지 않는가”를 먼저 P0로 본다.

## 7. 변경 파일
- 생성: `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/subagent_enhancement_2026-07-04/levelmini.md`
