# Biz_Mini 30m Enhancement — Google Sign-In release-risk framing

- 일시: 2026-07-04 18:45:47 KST
- 프로필/에이전트: `bizmini` / `Biz_Mini` / 비즈미니
- 요청: 나머지 서브에이전트 금일 모두 고도화 작업 각 30분씩 시작
- 이번 slice: Google Sign-In 이슈 방지 체크리스트를 비즈니스·릴리스 리스크 관점으로 내재화
- 코드 변경: 없음
- 커밋/배포/외부 메시지: 없음

## 1. 읽은 기준 문서

프로젝트 정책/우선순위:
- `AGENTS.md`
- `project_develop_policy.md`
- `CEO/current_product_priorities.md`
- `CEO/auto_deploy_bm_scope_guard_2026-06-24.md`
- `Developer/auto_deploy_backend_boundary_2026-06-24.md`

대상 체크리스트:
- `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`

비즈미니 durable context:
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/registry.toml`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Biz_Mini.toml`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_business_model_specialist/knowledge/knowledge_base.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_business_model_specialist/knowledge/source_index.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_business_model_specialist/knowledge/learning_transfer_manifest.md`
- `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_business_model_specialist/ledger.md`

## 2. 내재화한 사업/릴리스 판단

`Google Sign-In`은 현재 Stage 1의 성장·보상·모바일 조작 안정화보다 앞서 확장할 기능이 아니다. 다만 이미 프로젝트에는 Firebase Auth / Google 로그인 / 개인 진행도 백업 경로가 존재하므로, 비즈미니 관점에서는 다음처럼 다룬다.

1. **계정은 수익화 전제 조건이 아니라 신뢰 리스크다.**
   - 로그인 실패가 게임 시작, 결과 화면, 코인샵, 패시브 구매, 재시작을 막으면 Stage 1 핵심 KPI가 오염된다.
   - BM 분석에서 로그인 전환율을 매출 퍼널처럼 보지 않고, 우선 `guest_run_success_rate`와 `login_blocked_run_count`를 제품 안정성 지표로 본다.

2. **게스트 플레이가 정본이어야 한다.**
   - `Developer/auto_deploy_backend_boundary_2026-06-24.md`의 원칙처럼 Google 계정/클라우드 저장이 붙어 있어도 제품 핵심 의존성으로 만들면 안 된다.
   - Google Sign-In 이슈가 있어도 무료 5분 루프, 로컬 보상, 로컬 성장, 결과/재시작은 정상 동작해야 한다.

3. **로그인 문제는 출시/운영 리스크로 승격한다.**
   - SHA-1/SHA-256 불일치, OAuth 동의 화면 테스트 모드, Web Client ID 오용, SDK 회귀, 무한 스피너는 단순 개발 버그가 아니라 리뷰 악화·초기 이탈·지원 부담·신뢰 하락으로 이어진다.
   - 특히 “로컬 빌드는 OK, 스토어 다운로드 빌드만 실패”는 Play App Signing 재서명 SHA 누락 가능성이 높으므로 내부 테스트/AAB 릴리스 게이트에 포함해야 한다.

4. **무한 스피너는 BM 금지 신호다.**
   - 로그인에 10~30초 타임아웃, 실패 사유 표시, 게스트 계속하기, 재시도 UI가 없으면 광고/IAP/계정 기반 리텐션은 논의하지 않는다.
   - “로그인해야 보상/진행 가능” 구조는 Stage 1 전에는 금지한다.

## 3. 비즈미니 운영 체크리스트에 추가할 release-risk gate

Stage 1 안정화 후에도 계정/클라우드/스토어 출시를 검토할 때 비즈미니는 아래를 먼저 요구한다.

### A. 제품 퍼널 보호
- [ ] 로그인 실패/취소/타임아웃 후에도 `게스트로 계속하기`가 보인다.
- [ ] 로그인 실패가 `run_start`, `run_end`, `gold_grant`, `passive_purchase`, `restart`를 막지 않는다.
- [ ] 로그인 화면은 첫 실행 강제 관문이 아니라 선택적 백업/연동 기능으로 노출한다.
- [ ] 로그인 지연 p95가 10초를 넘으면 계정 기능 확대·계정 기반 이벤트·계정 기반 보상은 보류한다.

### B. 릴리스 전 QA/Launch gate
- [ ] 실제 배포 아티팩트의 Play App Signing SHA-1/SHA-256이 Google Cloud OAuth, Firebase, Play Games Services 구성과 일치한다.
- [ ] Internal/Closed/Production 트랙별로 신규 계정·기존 계정·다중 계정 기기 로그인 매트릭스를 통과한다.
- [ ] OAuth 동의 화면, 지원 이메일, 테스터 목록, PGS 게시 상태가 배포 대상과 맞는다.
- [ ] `DEVELOPER_ERROR(10)`, `SIGN_IN_FAILED(12500)`, `CANCELED(12501)`, `IN_PROGRESS(12502)`, `NETWORK_ERROR(7)`가 원문 코드로 기록된다.

### C. BM/라이브옵스 금지선
- [ ] 로그인 성공을 광고 보상, 출석, 시즌, 랭킹 보상, 유료 재화 지급의 전제조건으로 삼지 않는다.
- [ ] 계정 기반 메타 진행도는 Stage 1 안정화 전 “편의 백업” 이상으로 홍보하지 않는다.
- [ ] 로그인 실패 유저에게 손실 공포, 한정 보상, 복구 불가 압박 문구를 사용하지 않는다.
- [ ] 계정/서버 기반 경쟁 보상은 서버 검증·복구·지원·오류 모니터링 전까지 금지한다.

## 4. 비즈니스 리스크 분류

| 리스크 | 비즈니스 영향 | 비즈미니 판단 |
|---|---|---|
| Play App Signing SHA 불일치 | 스토어 빌드에서만 로그인 실패 → 출시 직후 리뷰/이탈 악화 | Launch/Backend QA의 CRITICAL gate로 승격 |
| OAuth 테스트 모드/테스터 누락 | 개발자는 되는데 일반 유저는 실패 | Production 출시 전 차단 항목 |
| 무한 로그인 스피너 | 첫 세션 중단, D0 second-run 하락 | BM 실험 전 반드시 제거 |
| 로그인 실패가 보상/저장을 막음 | 성장 신뢰 붕괴, CS 부담 | 게스트/로컬 저장 fallback 필수 |
| 계정 기반 리텐션 조기 도입 | Stage 1 안정화 우선순위 위반 | 현 단계 구현 금지, 문서/계측만 허용 |

## 5. Planner/QA/Launch에 전달 가능한 제품 제약

- Stage 1 QA는 “로그인이 잘 되는가”보다 먼저 “로그인이 실패해도 한 판이 정상 완료되는가”를 확인해야 한다.
- Google Sign-In 체크리스트의 PHASE 1~3은 Launch/Backend의 기술 gate지만, 비즈미니는 이를 **출시 신뢰 gate**로 해석한다.
- 계정 기능을 켜는 순간 모니터링 지표는 `login_attempt`, `login_success`, `login_timeout`, `login_error_code`, `guest_continue_after_login_fail`, `run_start_after_login_fail`, `cloud_save_fail_but_local_success`가 필요하다.
- 광고/IAP/랭킹/출석/시즌 같은 BM 기능은 위 계정 fallback과 오류 계측이 검증된 뒤에만 재검토한다.

## 6. 오늘 발견한 위험

- 현재 우선순위 문서상 계정 시스템은 “당장 하지 않을 것”이지만, 실제 코드/문서에는 Firebase Auth와 Google 로그인 경로가 이미 존재한다. 따라서 구현이 남아 있다면 “제품 핵심 의존성”으로 커지는 것을 막는 경계 문서/QA gate가 필요하다.
- Google 로그인 체크리스트는 기술적으로 잘 정리되어 있으나, 제품·사업 관점의 차단 기준은 별도 문서화가 필요하다. 특히 “로그인 실패 시 게스트 루프 보장”은 BM/릴리스 gate로 명시해야 한다.

## 7. 다음 권장 작업

`CEO` 또는 `Quaility_Assurance`에 `Google Sign-In release trust gate` 문서를 짧게 승격해, Launch_Mini/Backend_Mini/Balance_QA가 같은 기준으로 내부 테스트를 막을 수 있게 한다. 단, Stage 1 모바일 루프 안정화 전에는 계정 기능 확대가 아니라 “실패해도 무료 루프가 깨지지 않는지”만 검증한다.
