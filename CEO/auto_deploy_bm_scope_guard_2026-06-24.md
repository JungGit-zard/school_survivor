# Auto Deploy BM Scope Guard - Stabilization Phase

작성일: 2026-06-24 23:38 KST
역할: Biz_Mini / 비즈미니
프로젝트: Escape! zombie school
상태: Stage 1 안정화 우선 가드레일

## 1. 결론

현재 제품/사업 판단의 최우선 기준은 신규 수익화, 리텐션 장치, 라이브옵스 확장이 아니라 Stage 1 플레이어블 루프 안정화다.

현재 단계에서 허용되는 BM/리텐션 작업은 "나중에 수익화와 운영을 안전하게 붙일 수 있도록 제품 제약과 측정 항목을 정리하는 일"까지다. 실제 결제, 광고, 서버 랭킹, 계정 기반 경쟁, 시즌 운영, 푸시/출석/이벤트 보상은 Stage 1 모바일 플레이 루프가 안정화된 뒤 다시 판단한다.

## 2. 지금 지켜야 할 제품 우선순위

`CEO/current_product_priorities.md` 기준 현재 P0/P1은 다음 문제를 막는 것이다.

1. 한 판 생존 루프가 안정적으로 끝난다.
2. 모바일에서 실제로 조작 가능하다.
3. 성장과 보상이 플레이어에게 손해 없이 적용된다.
4. 3D 카툰 렌더링 정책을 유지한다.
5. QA와 테스트가 다음 작업을 막아주는 구조가 된다.

따라서 BM 아이디어는 아래 질문을 통과해야만 이후 백로그에 남길 수 있다.

- Stage 1 플레이 가능성을 직접 해치지 않는가?
- 모바일 조작, XP, 골드, 레벨업, 보스/클리어 안정화보다 앞서지 않는가?
- 초보 플레이어에게 불리한 압박, 결제 유도, 손실 공포를 만들지 않는가?
- 지금 구현하지 않아도 나중에 데이터와 QA로 검증 가능한 형태인가?

## 3. 현재 단계에서 금지할 것

### 3-1. 수익화 금지 범위

아래 항목은 Stage 1 안정화 전에는 구현하지 않는다.

- 인앱결제 상품
- 광고 보상, 전면 광고, 강제 광고
- 유료 부활, 유료 재화 구매
- 기간 한정 패키지, 초보자 패키지, 스타터팩
- 확률형 상품, 랜덤 박스, 뽑기
- 플레이 실패 직후 결제를 유도하는 팝업
- 플레이어 성장 속도를 고의로 막고 결제로 해소시키는 구조

특히 이 게임은 짧은 모바일 생존 게임이므로, 초반 경험에서 "못해서 졌다"와 "돈을 안 써서 졌다"가 섞이면 제품 신뢰가 크게 무너진다.

### 3-2. 리텐션/라이브옵스 금지 범위

아래 항목은 지금 구현하지 않는다.

- 출석 보상
- 일일/주간 미션
- 시즌 패스
- 한정 이벤트 스테이지
- 서버 랭킹 시즌
- 계정 기반 경쟁 보상
- 푸시 알림
- 길드/친구/멀티플레이 기반 장치

이유: 현재 우선순위 문서가 백엔드, 리더보드, 계정 시스템, 멀티플레이, Stage 2 확장을 당장 하지 않을 것으로 명시하고 있다. 라이브옵스는 이 기반을 전제로 하기 때문에 지금 만들면 Stage 1 안정화를 방해한다.

### 3-3. 경제 밸런스 금지 범위

아래 경제 변경은 지금 확정하지 않는다.

- 골드 획득량을 수익화 목표에 맞춰 낮추기
- 패시브 가격을 결제 전환율 관점으로 올리기
- 실패 보상을 지나치게 낮춰 반복 플레이를 강제하기
- `greed`, `cooldown`, `armor` 같은 2차 패시브를 Stage 1 안정화 전에 조기 출시하기
- Lv.4~Lv.5 영구 패시브를 코인 수급 QA 없이 열기

`CEO/ceo_review_passive_upgrade_catalog_2026-05-17.md` 기준 1차 MVP는 5종 패시브 Lv.3까지가 적합하다. 2차 패시브와 Lv.4~Lv.5는 코인 수급과 난이도 QA 이후 판단한다.

## 4. 나중에 허용 가능한 아이디어

아래 아이디어는 지금 구현 대상이 아니라, Stage 1 루프가 안정화된 뒤 검토 가능한 후보로만 보관한다.

### 4-1. 공정한 수익화 후보

1. 광고 보상형 선택지
   - 예: 플레이 후 선택형 보너스 골드.
   - 조건: 강제 광고 금지, 실패 회복을 광고에 종속시키지 않기, 광고를 보지 않아도 핵심 성장 가능.

2. 코스메틱 상품
   - 예: 캐릭터 외형, 학교 테마 장식, UI 배지.
   - 조건: 전투력/생존력 직접 판매 금지, 3D 카툰 렌더링 정책 준수.

3. 후원/광고 제거형 상품
   - 예: 광고 제거, 개발 후원 패키지.
   - 조건: 구매하지 않아도 게임 루프와 보상 수급이 정상 작동.

4. 확장 콘텐츠 구매
   - 예: Stage 2 이후 별도 확장팩.
   - 조건: Stage 1 기본 루프가 무료/기본 경험으로 충분히 완결되어야 함.

### 4-2. 공정한 리텐션 후보

1. 누적 플레이 해금
   - 예: `guidedMissile`, `starlink`처럼 누적 플레이 또는 누적 처치로 열리는 무기.
   - 조건: 실력 조건과 누적 조건의 OR 원칙 유지. 실력이 부족해도 반복으로 접근 가능해야 함.

2. 개인 기록 중심 목표
   - 예: 최고 생존 시간, 최고 클리어 기록, 스테이지별 개인 기록.
   - 조건: 서버 검증 전에는 공식 공개 경쟁처럼 표현하지 않기.

3. 작은 장기 목표
   - 예: 5종 MVP 패시브 Lv.3 완성, 무기 도감 확인.
   - 조건: 한두 판 후에도 "다음 판이 조금 쉬워진다"는 체감 유지.

4. 시즌형 운영
   - Stage 1 안정화, 서버 검증, 랭킹 정책, 보상 회수 정책이 갖춰진 뒤 검토.
   - 현재는 운영 콘솔/시즌 설정이 있더라도 실제 지급이 아니라 보상 안내 수준으로 제한한다.

## 5. 플레이 가능 이후 수집할 핵심 지표

아래 지표는 플레이어를 압박하기 위한 수익화 지표가 아니라, Stage 1이 재미있고 공정한지 확인하기 위한 제품 건강 지표다.

### 5-1. 플레이어블 루프 지표

- run_start_count: 판 시작 수
- run_end_count: 판 종료 수
- run_complete_rate: 클리어 비율
- crash_or_abandon_rate: 비정상 이탈/중도 이탈 비율
- average_survival_seconds: 평균 생존 시간
- median_survival_seconds: 중앙 생존 시간
- first_30s_death_rate: 시작 적응 구간 사망률
- boss_reach_rate: 보스 도달률
- boss_clear_rate: 보스/스테이지 클리어율

### 5-2. 모바일 조작/접근성 지표

- mobile_run_start_count
- joystick_use_rate
- pause_resume_use_count
- pause_to_resume_success_rate
- modal_close_or_choice_success_rate
- narrow_screen_ui_error_count

모바일에서 조작이 불편하면 어떤 BM도 붙이면 안 된다. 조작 안정화가 우선이다.

### 5-3. 성장/보상 지표

- xp_collected_per_run
- level_reached_per_run
- levelup_choice_count
- upgrade_choice_distribution
- gold_earned_per_run
- milestone_gold_earned_count
- elite_boss_gold_earned_count
- passive_purchase_count
- passive_level_distribution
- insufficient_gold_shop_attempt_count

목표는 보상 손실을 막고, 한두 판 안에 영구 성장 체감이 생기는지 확인하는 것이다.

### 5-4. 리텐션 지표

- D0 second_run_rate: 첫 방문 당일 2판 이상 플레이 비율
- D1 return_rate: 다음 날 복귀율
- D3 return_rate
- average_runs_per_user_day0
- time_to_second_run
- first_purchase_or_first_passive_time: 첫 영구 패시브 구매까지 걸린 시간

초기 판단은 결제 전환율보다 "다음 판을 하고 싶은가"가 우선이다.

### 5-5. 랭킹/경쟁 준비 지표

`CEO/ranking_score_policy_decision_2026-06-21.md` 기준 랭킹은 파밍량이 아니라 생존 진척 중심이어야 한다.

수집 후보:

- stage_id
- survival_seconds
- cleared
- ranking_score
- submitted_at
- client_version
- run_seed_or_session_id

단, 서버 검증 전에는 공식 공개 랭킹으로 쓰지 않는다. 현재 클라이언트 로컬 기록과 개인 진행도는 공식 경쟁 증거로 취급하지 않는다.

## 6. 이후 제품 제약으로 Planner/QA에 넘길 문장

Planner/QA가 이후 기획과 검증에 바로 사용할 수 있도록 아래 제약을 제안한다.

1. Stage 1 안정화 전 BM 작업은 구현이 아니라 측정 설계와 가드레일 문서화까지만 허용한다.
2. 결제/광고/시즌/랭킹 보상은 Stage 1 모바일 플레이 루프가 안정화된 뒤 별도 CEO 승인으로 연다.
3. 영구 성장은 첫 서비스에서 5종 패시브 Lv.3 기준을 유지하고, 2차 패시브와 Lv.4~Lv.5는 코인 수급 QA 뒤 연다.
4. 공개 경쟁 랭킹은 서버 검증 전까지 공식 보상 지급과 연결하지 않는다.
5. 광고 보상은 나중에 도입하더라도 강제 광고가 아니라 선택형 보너스로 제한한다.
6. 유료 상품은 전투력 직접 판매보다 코스메틱/광고 제거/후원형부터 검토한다.
7. 모든 경제 변경은 `gold_earned_per_run`, `passive_purchase_count`, `run_complete_rate`, `D0 second_run_rate`를 함께 보고 판단한다.

## 7. 작업 기록

### 읽은 파일

- `project_develop_policy.md`
- `Bang_Rules.md`
- `AGENTS.md`
- `CLAUDE.md`
- `SESSION_CONTINUITY.md`
- `SESSION_MEMORY.md` 최근 엔트리
- `CEO/current_product_priorities.md`
- `CEO/Game_service_purpose_target.md`
- `CEO/admin_operations_control_scope_2026-06-21.md`
- `CEO/ranking_score_policy_decision_2026-06-21.md`
- `CEO/ceo_review_passive_upgrade_catalog_2026-05-17.md`
- `CEO/docs/solutions/architecture-patterns/phase-gated-persistent-meta-progression-2026-05-17.md`
- `Planner/current_game_rules.md`

### 변경한 파일

- `CEO/auto_deploy_bm_scope_guard_2026-06-24.md`

### 실행한 명령 / 검증

- `pwd && git status --short --branch && test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING`
  - 최초 결과: `GSTACK_MISSING`
- `mkdir -p "$HOME/.claude/skills" && git clone --depth 1 https://github.com/garrytan/gstack.git "$HOME/.claude/skills/gstack" && cd "$HOME/.claude/skills/gstack" && ./setup --team`
  - 결과: gstack 설치 및 setup 완료
- `test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING`
  - 결과: `GSTACK_OK`
- `git status --short --branch`
  - 결과: 기존 미커밋 변경 다수 확인. 본 작업은 CEO 문서 1개 추가만 목표로 제한.

### 블로커 / 주의사항

- 최초 실행 시 gstack 전역 설치가 없어 작업이 막혔으나, 현재 Hermes bizmini 프로필 홈 기준 `~/.claude/skills/gstack`에 설치해 `GSTACK_OK`를 확인했다.
- 작업트리에 다른 에이전트/사용자 변경이 매우 많다. 본 문서는 기존 코드와 다른 역할 폴더 파일을 건드리지 않았다.
- 이 문서는 수익화 구현 제안서가 아니라 Stage 1 안정화 기간의 범위 가드레일이다.

### 핸드오프

Planner는 이 문서의 6장을 Stage 1 이후 BM/리텐션 기획의 제약 조건으로 참조하면 된다.
QA는 5장의 지표를 실제 플레이 가능 이후 계측/검증 체크리스트 후보로 전환하면 된다.
Developer는 현재 단계에서 결제/광고/서버 랭킹 구현을 시작하지 말고, 필요 시 지표 수집용 이벤트 이름만 별도 설계하면 된다.
