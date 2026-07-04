# jabdareminder — 2026-07-04 30분 고도화 결과

## 실행 요약
- 실행 프로필: `jabdareminder` / 잡다알림관리자
- 실행 시각: 2026-07-04 18:55:38 KST
- 공통 포커스: Google Sign-In 이슈 방지 체크리스트를 reminder/watchdog/recurring QA readiness로 전환
- 범위: 로컬 지식/장부/TOML 포인터 업데이트만 수행. 게임 코드 변경, commit, deploy, 외부 메시지 전송 없음.

## 통합한 핵심 운영규칙
1. Google Sign-In 관련 알림·QA 요청은 체크리스트의 PHASE 순서(P0→P6)를 보존한다.
2. 릴리스 전 gate reminder 후보:
   - P1 SHA/OAuth/Web Client ID 정합성
   - P2 OAuth consent/PGS publish/tester 상태
   - P5 배포 경로별 로그인 테스트 매트릭스
3. 릴리스 후 watchdog 후보:
   - 24/48/72시간 로그인 성공률, p95 지연, statusCode 10/12500/12502/7 급증
   - “로그인 안됨”, “무한 로딩”, “sign in” 리뷰 키워드
   - Google Cloud/Firebase 상태 이상
4. 주간 recurring QA 후보:
   - Unity PGS/Firebase/FlutterFire/RN Firebase 이슈에서 `sign-in`, `stuck`, `loop`, `DEVELOPER_ERROR` 키워드 확인
5. 안전 원칙:
   - 외부 콘솔/리뷰/상태 페이지 권한·토큰은 장부에 저장하지 않는다.
   - Google Sign-In 사고 예방성 알림은 사용자 명시 없이 pause/delete/modify하지 않는다.
   - 중복 후보는 `release_id`, `track`, `window`, `owner_profile`, `delivery_target`을 대조한 뒤 blocker로 남긴다.

## 변경/생성 파일
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/jabda_reminder_manager/knowledge/iterations/iteration_20260704_185538_KST_Jabda_Reminder_Manager_google_signin_reminder_watchdog_readiness.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/jabda_reminder_manager/knowledge/knowledge_base.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/jabda_reminder_manager/knowledge/source_index.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/jabda_reminder_manager/knowledge/learning_transfer_manifest.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/jabda_reminder_manager/ledger.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Jabda_Reminder_Manager.toml`
- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/subagent_enhancement_2026-07-04/jabdareminder.md`

## 발견 리스크
- 체크리스트의 P6 운영 모니터링은 실제 대시보드/리뷰/상태 페이지 권한이 필요할 수 있다. 잡다알림관리자는 비밀정보를 저장하지 않고, 알림·담당자·확인 링크·원문 문구 중심으로 관리해야 한다.
- 이번 요청은 “고도화”라서 새 cron 알림을 생성하지 않았다. 실제 릴리스 일정/트랙이 주어지면 그때 반복 QA 알림으로 전환한다.

## 다음 추천 단계
- 다음 Google Sign-In 릴리스/QA 카드가 생기면 `release_id`, `track`, `owner_profile`, `P0-P6 gate`, `post-release 24/48/72h watchdog`, `weekly vendor scan` 필드를 가진 잡다알림 템플릿으로 등록한다.
