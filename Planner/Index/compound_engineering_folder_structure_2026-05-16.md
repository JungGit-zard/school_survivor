# Compound Engineering Folder Structure - 2026-05-16

## 1. 목적

이 문서는 Escape! zombie school 프로젝트에 컴파운드 엔지니어링 방식을 적용하기 위한 폴더 구조와 운영 규칙을 정리한다.

컴파운드 엔지니어링은 작업을 한 번 하고 끝내는 방식이 아니다. 구현, 검증, 실패, 판단 기준을 다음 작업자가 재사용할 수 있는 문서, 테스트, 체크리스트, 정책으로 남겨 프로젝트가 점점 더 똑똑해지게 만드는 방식이다.

## 2. 기본 원칙

- 기존 부서 폴더 구조를 유지한다.
- 역할별 기록은 반드시 해당 역할 폴더에 둔다.
- 긴 회고 문서보다 다음 에이전트가 바로 읽을 수 있는 짧은 현재 기준 파일을 우선한다.
- 의미 있는 작업 뒤에는 테스트, 기록, 체크리스트, 정책, 재현 절차 중 하나를 남긴다.
- 검증하지 않은 기능은 완료로 기록하지 않는다.

## 3. 전체 구조

```text
school_survivor/
├── project_develop_policy.md          # 프로젝트 최상위 정책
├── AGENTS.md                          # Codex 작업 규칙
├── CLAUDE.md                          # Claude/gstack 작업 규칙
├── SESSION_CONTINUITY.md              # 세션 연속성 규칙 정본
├── SESSION_MEMORY.md                  # 세션 요약 누적 저장소
│
├── Planner/
│   ├── current_game_rules.md                # 루트 유지 (룰 정본)
│   ├── Index/                               # 색인·파기 로그·폴더 구조 정책
│   │   ├── planner_documents_by_field_2026-05-14.md
│   │   ├── planner_disposal_log_2026-05-14.md
│   │   └── compound_engineering_folder_structure_2026-05-16.md
│   ├── Stage1_Balance/                      # 1스테이지 재기획/역기획
│   │   ├── stage1_replan_2026-05-06.md
│   │   └── stage1_reverse_design_current_2026-05-09.md
│   ├── Rewards_Drops/                       # XP/골드 이원화
│   │   └── dual_drop_system_2026-05-08.md
│   ├── Subagent_Workflow/                   # 서브에이전트 운용
│   │   ├── subagent_planner.md
│   │   └── subagent_validation_pipeline.md
│   ├── Essential_game_plan/                 # 타깃/UX/타이틀
│   ├── Major_Review_Point/                  # 중간 점검
│   ├── Ref_Vampire_GameDesign/              # 외부 레퍼런스
│   ├── Tech_plan/                           # VFX/기술 기획
│   └── Weapons/                             # 무기 기획
│
├── Developer/
│   ├── current_code_architecture.md
│   ├── engineering_compounding_checklist.md
│   ├── tech_stack.md
│   └── r3f_prototype/
│
├── Graphic_designer/
│   ├── current_visual_rules.md
│   ├── Bang_survivor_Graphic_concept.md
│   └── stage5_graphic_hud_qa_2026-05-16.md
│
├── Quaility_Assurance/
│   ├── current_risk_register.md
│   ├── browser_validation_checklist.md
│   ├── qa_stage3_full_plan_report_2026-05-16.md
│   └── stage6_gstack_browser_validation_2026-05-16.md
│
└── CEO/
    ├── current_product_priorities.md
    └── Game_service_purpose_target.md
```

## 4. 폴더별 역할

### Planner

게임 규칙, 스테이지 구조, 난이도, 콘텐츠 진행 방식, 서브에이전트 검증 순서를 관리한다.

핵심 현재 파일:
- `Planner/current_game_rules.md` (룰 정본 — 루트 유지)
- `Planner/Subagent_Workflow/subagent_validation_pipeline.md`
- `Planner/Index/planner_documents_by_field_2026-05-14.md` (분야별 색인)

> 2026-05-17 정리: 루트에 흩어져 있던 9개 문서를 분야별 하위 폴더(`Index/`, `Stage1_Balance/`, `Rewards_Drops/`, `Subagent_Workflow/`, 그리고 `Essential_game_plan/`)로 이동했다. 자세한 매핑은 §3 트리 참조.

### Developer

기술 구조, 코드 아키텍처, 구현 체크리스트, 테스트 전환 후보를 관리한다.

핵심 현재 파일:
- `Developer/current_code_architecture.md`
- `Developer/engineering_compounding_checklist.md`
- `Developer/tech_stack.md`

### Graphic Designer

3D 카툰 렌더링, 외곽선, HUD 가독성, VFX 판독성, 모바일 시각 기준을 관리한다.

핵심 현재 파일:
- `Graphic_designer/Concept_Rules/current_visual_rules.md`
- `Graphic_designer/Bang_survivor_Graphic_concept.md`

### Quality Assurance

위험 목록, 테스트 계획, 브라우저 검증 절차, 검증 결과를 관리한다.

핵심 현재 파일:
- `Quaility_Assurance/current_risk_register.md`
- `Quaility_Assurance/browser_validation_checklist.md`

### CEO

제품 방향, 우선순위, 사업/서비스 판단을 관리한다. 실행 세부 구현은 CEO 문서만으로 확정하지 않는다.

핵심 현재 파일:
- `CEO/current_product_priorities.md`

## 5. 작업 종료 시 Compounding Step

의미 있는 작업을 끝낼 때는 아래 질문에 답한다.

```text
이번 작업에서 다음 작업을 더 쉽게 만들기 위해 남길 것은 무엇인가?
```

남길 수 있는 산출물:
- 실패를 막는 단위 테스트
- QA 체크리스트
- 위험 목록 갱신
- 재현 절차
- 현재 기준 문서 갱신
- 서브에이전트 파이프라인 갱신
- 브라우저 검증 스크린샷/기록

## 6. 현재 최우선 컴파운드 대상

1. XP 연속 레벨업 문제를 테스트와 수정으로 전환한다.
2. B01 보너스 교과서 XP 0 문제를 테스트와 수정으로 전환한다.
3. 모바일 조이스틱 연결을 gstack 검증 항목으로 고정한다.
4. 모바일 pause/resume 버튼과 모달 폭 문제를 UI/HUD 체크리스트로 고정한다.
5. `refs.js` 전역 상태 리셋을 회귀 테스트 후보로 등록한다.
