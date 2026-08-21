# Planner 문서 파기 로그

작성일: 2026-05-14  
작성 위치: `Planner/`  
목적: 중복되었거나 최신 시간순에서 밀려난 기획 문서를 파기한 이유를 기록한다.

---

## 1. 파기 기준

다음 기준 중 하나 이상에 해당하는 문서를 파기했다.

- 최신 1스테이지 기준 문서로 대체된 과거 초안.
- 같은 내용을 더 최신 문서가 포함하는 중복 색인 또는 중복 기술기획.
- 1스테이지 탄환 몬스터 금지 규칙과 충돌하는 과거 변형안.
- 현재 구현/기획 판단에 혼동을 주는 오래된 구현 현황 문서.
- 신규 무기/보상/타깃 기획으로 흡수된 과거 아이디어 문서.

최신 기준으로 유지한 핵심 문서 (2026-05-17 폴더 재정리 반영):

- `Stage1_Balance/stage1_replan_2026-05-06.md`
- `Stage1_Balance/stage1_reverse_design_current_2026-05-09.md`
- `Rewards_Drops/dual_drop_system_2026-05-08.md`
- `Weapons/weapon_expansion_unlock_plan_2026-05-10.md`
- `Essential_game_plan/commuter_target_planning_2026-05-14.md`
- `Essential_game_plan/title_landing_screen_plan_2026-05-10.md`
- `Tech_plan/effect_implementation_technical_plan_2026-05-10.md`
- `Tech_plan/effect_sloution.md`
- `Subagent_Workflow/subagent_planner.md`
- `Subagent_Workflow/subagent_validation_pipeline.md`
- `Index/planner_documents_by_field_2026-05-14.md`

---

## 2. 파기 문서 목록

| 파기 문서 | 파기 이유 | 대체/참조 기준 |
|---|---|---|
| `escape_zombie_school_main_contents_plan.md` | 초기 5분 밸런스 초안. 원거리 몬스터와 초기 수치가 최신 기준과 충돌 | `Stage1_Balance/stage1_replan_2026-05-06.md`, `Stage1_Balance/stage1_reverse_design_current_2026-05-09.md` |
| `escape_zombie_school_main_contents_plan_ai_ready.readable.md` | 초기 엑셀 기반 데이터 표. 최신 수치와 다름 | `Stage1_Balance/stage1_replan_2026-05-06.md` |
| `monster_spawn_scenario_5min_boss_4min.md` | E04 원거리 몬스터와 B01 탄환 패턴 포함 | `Stage1_Balance/stage1_replan_2026-05-06.md` 2026-05-09 부록 |
| `current_weapon_and_boss_rules_2026-05-03.md` | 2026-05-03 구현값 기준. 2026-05-06 이후 재기획에 밀림 | `Stage1_Balance/stage1_replan_2026-05-06.md`, `Stage1_Balance/stage1_reverse_design_current_2026-05-09.md` |
| `combat_item_flask_update_plan_2026-04-26.md` | 플라스크 초기 기획. 최신 무기/밸런스 문서에 흡수됨 | `Stage1_Balance/stage1_replan_2026-05-06.md` |
| `cluster_weapon_reference_research_2026-05-03.md` | 군집 대응 무기 조사. 신규 무기 확장 문서에 방향이 흡수됨 | `Weapons/weapon_expansion_unlock_plan_2026-05-10.md` |
| `cluster_weapon_concepts_2026-05-03.md` | 과거 후보 무기 2종. 신규 무기 10종 기획에 우선순위가 밀림 | `Weapons/weapon_expansion_unlock_plan_2026-05-10.md` |
| `survivor_like_monster_wave_research.md` | 외부 웨이브 조사. 최신 스테이지 재기획에 반영 완료 | `Stage1_Balance/stage1_replan_2026-05-06.md` |
| `planner_content_index_2026-05-10.md` | 오래된 색인. 2026-05-14 최신 분야별 색인으로 대체 | `Index/planner_documents_by_field_2026-05-14.md` |
| `planner_all_documents_summary_2026-05-14.md` | 상세 전체 요약이지만 파기 전 문서까지 포함해 최신 색인과 중복/혼동 가능 | `Index/planner_documents_by_field_2026-05-14.md` |
| `effect_implementation_technical_plan_2026-05-10.md` | `Tech_plan/` 안의 같은 기술기획과 중복 | `Tech_plan/effect_implementation_technical_plan_2026-05-10.md` |
| `Ref_Vampire_GameDesign/School_firearms_505.md` | 2026-05-05 구현 현황 참고 문서. E04/B01 탄환 등 최신 기준과 충돌 | `Stage1_Balance/stage1_reverse_design_current_2026-05-09.md` |

---

## 3. 유지한 레퍼런스

다음 문서는 직접 기획 기준이 아니라 참고자료로 유지한다.

- `Ref_Vampire_GameDesign/Top Checkup List.txt`
- `Ref_Vampire_GameDesign/1스테이지 토탈기획 시나리오.txt`
- `Ref_Vampire_GameDesign/vampire_5minite_monster.md`
- `Weapons/Vampire_5minute_Firearms.md`
- `Ref_Vampire_GameDesign/Vampire_5minute_levelup.md`
- `Ref_Vampire_GameDesign/vampire_survivors_formula_reference.md`
- `Ref_Vampire_GameDesign/게임데미지공식기획기준.txt`
- `Weapons/뱀파이어 서바이버 무기해금 조건 자료.txt`

유지 이유:

- 최신 기획을 직접 대체하지 않는다.
- 외부 레퍼런스 또는 설계 철학 자료로만 사용한다.
- 현재 문서와 충돌하더라도 구현 기준이 아니라 참고 기준임이 명확하다.

---

## 4. 이후 운영 규칙

- 새 기획 문서를 만들 때는 기존 최신 문서와 중복되지 않는지 먼저 확인한다.
- 과거 문서를 변형해 새 문서를 만들 경우, 기존 문서를 유지할지 파기할지 함께 판단한다.
- 최신 기준에서 밀려난 문서는 그대로 방치하지 말고 이 로그에 추가한 뒤 파기한다.
- 외부 레퍼런스는 기획 기준 문서와 분리해서 유지한다.
