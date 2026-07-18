# Planning_Methodology

> Escape! zombie school의 **기획 방법론 메타 기록**을 모은 폴더.
> 실제 게임 콘텐츠 기획은 본 폴더 밖(`Planner/B.*/`, `Planner/Essential_game_plan/`, `Planner/Tech_plan/` 등)에 있다.

생성일: 2026-05-24

---

## 무엇이 들어 있나

| 하위 폴더 | 무엇 |
|---|---|
| `Subagent_Workflow/` | 기획용 서브에이전트 운용안, 검증 파이프라인 |
| `Compound_Engineering/` | CE(컴파운드 엔지니어링) 폴더 구조와 운영 규칙 |
| `Planner_Index/` | 분야별 기획문서 색인 + 파기 로그 (기획문서 관리 메타) |
| `Brainstorm_Cases/` | 다중 에이전트 브레인스토밍 케이스 기록 |
| `Major_Review_Point/` | 중간점검·플레이테스트 실측 등 기획검수 기록 |

---

## 분리 원칙

- **방법론(meta)** = "어떻게 기획·검수·브레인스토밍할까" → 이 폴더
- **콘텐츠(content)** = "무엇을 기획했나"(밸런스·무기·스테이지·UI 안) → 이 폴더 밖

콘텐츠 안에 방법 한 줄이 섞여 있는 경우(예: 어떤 무기 기획 문서가 "이 변경은 서브에이전트 리뷰를 거쳐 결정됨"이라고 적어 두는 경우)는 콘텐츠 폴더에 그대로 둔다 — 메인 주제가 콘텐츠이기 때문이다.

---

## 어떤 파일이 어디로 이동했나 (2026-05-24)

| 이전 경로 | 새 경로 |
|---|---|
| `Planner/Subagent_Workflow/subagent_planner.md` | `Planning_Methodology/Subagent_Workflow/subagent_planner.md` |
| `Planner/Subagent_Workflow/subagent_validation_pipeline.md` | `Planning_Methodology/Subagent_Workflow/subagent_validation_pipeline.md` |
| `Planner/Index/compound_engineering_folder_structure_2026-05-16.md` | `Planning_Methodology/Compound_Engineering/compound_engineering_folder_structure_2026-05-16.md` |
| `Planner/Index/planner_documents_by_field_2026-05-14.md` | `Planning_Methodology/Planner_Index/planner_documents_by_field_2026-05-14.md` |
| `Planner/Index/planner_disposal_log_2026-05-14.md` | `Planning_Methodology/Planner_Index/planner_disposal_log_2026-05-14.md` |
| `Planner/Essential_game_plan/title_screen_multi_agent_concept_review_2026-05-23.md` | `Planning_Methodology/Brainstorm_Cases/title_screen_multi_agent_concept_review_2026-05-23.md` |
| `Planner/Major_Review_Point/5.16_게임기술스택,코드_중간점검.md` | `Planning_Methodology/Major_Review_Point/5.16_게임기술스택,코드_중간점검.md` |
| `Planner/Major_Review_Point/5.16_플레이테스트_XP경제_실측.md` | `Planning_Methodology/Major_Review_Point/5.16_플레이테스트_XP경제_실측.md` |

`git mv`로 이동했으므로 git 히스토리는 보존된다 (`git log --follow <new-path>`).

---

## 옛 경로를 참조하는 외부 문서

`SESSION_MEMORY.md`, `CEO/docs/*`, `Planner/B.*` 등의 옛 경로 참조는 **시점 기록**이므로 갱신하지 않는다. 본 폴더 안의 문서끼리의 self-reference만 갱신했다.

옛 경로를 찾는 사람을 위한 단축 매핑:
- `Planner/Index/planner_documents_by_field_*` → `Planner/Planning_Methodology/Planner_Index/planner_documents_by_field_*`
- `Planner/Subagent_Workflow/*` → `Planner/Planning_Methodology/Subagent_Workflow/*`
- `Planner/Major_Review_Point/*` → `Planner/Planning_Methodology/Major_Review_Point/*`

---

## 잔존 폴더 안내

본 정리 후 `Planner/`의 잔존 폴더:

- `Planner/Index/project_name_rename_review_2026-05-17.md` — 프로젝트 이름 변경 시점의 일괄 검토 기록(콘텐츠 작업이므로 잔존).
- `Planner/Essential_game_plan/` — commuter/passive/result/title 등 실제 feature 기획 5종.
- `Planner/B.게임기획,밸런스 구현/` — 게임 밸런스·무기·스테이지 콘텐츠.
- `Planner/Ref_Vampire_GameDesign/` — 외부 레퍼런스.
- `Planner/Tech_plan/` — VFX·기술 기획 콘텐츠.
- `Planner/current_game_rules.md` — 룰 정본.
