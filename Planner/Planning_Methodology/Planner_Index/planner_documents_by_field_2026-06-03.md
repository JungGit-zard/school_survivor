# Planner 문서 분야별 통합 정리

- 작성일: 2026-06-03
- 기준 폴더: `Planner/`
- 확인 문서 수: 60개
- 정리 방식: 1차 색인 작성 후, 2026-06-03에 루트 개별 기획 문서를 같은 맥락별 폴더로 이동했다.

이 문서는 `Planner/` 안의 기획 문서를 분야별로 모은 최신 색인이다. "색인"은 책의 목차처럼 어디에 어떤 문서가 있는지 찾기 쉽게 만든 목록을 뜻한다.

## 0. 판단 우선순위

기획 문서끼리 내용이 다르면 아래 순서로 판단한다.

1. `project_develop_policy.md`
   - 프로젝트 최상위 정책이다.
   - 기획 기록은 반드시 `Planner/`에 둔다.

2. `Planner/current_game_rules.md`
   - 현재 게임 규칙의 빠른 기준 문서다.

3. 최신 코드 기준 역기획 또는 최신 날짜 기획
   - 예: Stage 1은 `stage1_reverse_design_current_2026-05-09.md`와 현재 코드 대조가 중요하다.
   - Stage 2는 `stage2_corridor_projectile_plan_2026-06-03.md`가 최신 신규 스테이지 기획이다.

4. 기존 분야별 상세 문서
   - 무기, 보상, 성장, UX, VFX, 기술기획 등.

5. 레퍼런스 문서
   - 직접 구현 기준이 아니라 참고자료로 사용한다.

## 1. 최상위 규칙과 폴더 안내

| 문서 | 분야 | 사용법 |
|---|---|---|
| `Planner/current_game_rules.md` | 현재 게임 규칙 | 구현/기획 판단 전 빠르게 현재 규칙을 확인한다 |
| `Planner/B.게임기획,밸런스 구현/README.md` | 게임기획 폴더 안내 | 성장, 무기, 스테이지 기획 폴더 구조를 확인한다 |
| `Planner/B.게임기획,밸런스 구현/B-1 캐릭터 성장,능력치 업그레이드 구조 구현/README.md` | 성장 폴더 안내 | 캐릭터 성장/패시브/보상 문서 위치를 확인한다 |
| `Planner/game_contents/weapons/README.md` | 무기 폴더 안내 | 무기 업그레이드/해금 문서 위치를 확인한다 |
| `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/README.md` | 스테이지 폴더 안내 | 스테이지와 몬스터 등장 문서 위치를 확인한다 |

## 2. 서비스 방향, 타깃, UX, 첫 화면

게임을 누구에게 어떤 상황에서 플레이하게 할지 정하는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `Planner/Essential_game_plan/commuter_target_planning_2026-05-14.md` | 타깃 기획 | 높음 | 출근길 직장인, 5분 생존, 중단되어도 아깝지 않은 플레이 |
| `Planner/Essential_game_plan/commuter_friendly_implementation_request_2026-05-17.md` | 출근길 친화 구현 요청 | 높음 | 출근길 UX를 실제 구현 항목으로 바꾼 요청서 |
| `Planner/Essential_game_plan/title_landing_screen_plan_2026-05-10.md` | 타이틀/랜딩 기획 | 높음 | `Escape! zombie school` 첫 화면 구성 |
| `Planner/Essential_game_plan/result_coin_shop_flow_requirements_2026-05-17.md` | 결과창/코인상점 UX | 높음 | 결과창에서 코인상점으로 이어지는 흐름 |
| `Planner/Index/project_name_rename_review_2026-05-17.md` | 프로젝트명 검토 | 중간 | 프로젝트명/브랜드 이름 검토 |
| `Planner/Planning_Methodology/Brainstorm_Cases/title_screen_multi_agent_concept_review_2026-05-23.md` | 타이틀 다중 에이전트 검토 | 중간 | 첫 화면 콘셉트 검토 기록 |

현재 큰 방향은 "콘텐츠 양보다 5분 안에 성장과 보상을 체감하는 학교 좀비 생존 게임"이다.

## 3. 스테이지, 몬스터, 웨이브

스테이지 구조, 적 종류, 시간대별 등장, 보스 구간을 다루는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Stage1_Balance/stage1_replan_2026-05-06.md` | Stage 1 재기획 | 매우 높음 | 5분 생존, Stage 1 웨이브, E04 제외, B01 4분 등장 |
| `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Stage1_Balance/stage1_reverse_design_current_2026-05-09.md` | Stage 1 현재 구현 역기획 | 매우 높음 | 현재 코드 기준 Stage 1 구조와 실제 동작 |
| `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Stage2_Corridor_Projectile/stage2_corridor_projectile_plan_2026-06-03.md` | Stage 2 신규 기획 | 매우 높음 | 복도형 원거리 투사체 스테이지, 300초 생존 |
| `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Monster_Wave/e06_late_wave_spawn_pressure_2_percent_2026-05-30.md` | E06 후반 스폰 압박 | 높음 | E06 후반 등장 압박을 2% 기준으로 조정 |

Stage 1은 탄환보다 추격, 돌진, 밀도 압박이 중심이다. Stage 2는 E04 원거리 투사체를 Stage 2 전용으로 되살리는 방향이다.

## 4. 무기, 업그레이드, 해금

무기 종류, 무기 레벨, 무기 슬롯, 해금 조건을 다루는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `Planner/game_contents/weapons/weapon_list.md` | 현재 무기 목록 | 매우 높음 | 현재 구현된 무기 목록 확인 |
| `Planner/game_contents/weapons/weapon_upgrade_flow_and_unlock_plan_2026-05-14.md` | 무기 업그레이드/해금 흐름 | 매우 높음 | 레벨업 카드, 무기 해금, 5분 흐름 |
| `Planner/game_contents/weapons/weapon_expansion_unlock_plan_2026-05-10.md` | 무기 확장 기획 | 높음 | 신규 무기 10종과 누적 기록 기반 해금 |
| `Planner/game_contents/weapons/Weapons_modify.md` | 무기 수정 계획 | 중간 | 무기 조정 아이디어와 수정 방향 |
| `Planner/game_contents/weapons/rules/weapon_slot_limit_8_2026-05-26.md` | 무기 슬롯 규칙 | 매우 높음 | 한 런에서 보유 가능한 무기 수를 8개로 확장 |
| `Planner/game_contents/weapons/rules/weapon_unlock_acquire_upgrade_terms_2026-05-26.md` | 용어 기준 | 높음 | 해금, 획득, 업그레이드 용어 구분 |
| `Planner/game_contents/weapons/guided_missile/guided_missile_unlock_accessibility_2026-05-26.md` | 유도미사일 해금 접근성 | 높음 | guidedMissile 해금 난이도/접근성 |

과거 색인에는 무기 최대 보유 수가 4개로 남아 있는 부분이 있으나, 최신 문서는 `weapon_slot_limit_8_2026-05-26.md`를 우선한다.

## 5. 개별 무기 상세 기획

특정 무기의 공격 방식, 밸런스, 이펙트 규칙을 다루는 분야다.

| 문서 | 무기 | 성격 |
|---|---|---|
| `Planner/game_contents/weapons/boxcutter/boxcutter_base_stat_1_5x_2026-05-26.md` | 커터칼 | 기본 능력치 1.5배 상향 |
| `Planner/game_contents/weapons/compass_blade/compass_blade_stack_explosion_balance_2026-05-25.md` | 나침반 칼날 | 스택 폭발 밸런스 |
| `Planner/game_contents/weapons/compass_blade/compass_blade_five_hit_explosion_rule_2026-05-27.md` | 나침반 칼날 | 5회 타격 후 폭발 규칙 |
| `Planner/game_contents/weapons/compass_blade/compass_blade_respawn_after_explosion_2026-05-27.md` | 나침반 칼날 | 폭발 후 재생성 규칙 |
| `Planner/game_contents/weapons/compass_blade/compass_blade_visible_explosion_effect_2026-05-27.md` | 나침반 칼날 | 폭발 이펙트 가시성 |
| `Planner/game_contents/weapons/onigiri/onigiri_single_cushion_explosion_rule_2026-05-26.md` | 오니기리 | 단일 쿠션 폭발 규칙 |
| `Planner/game_contents/weapons/onigiri/onigiri_instant_rice_burst_2026-05-30.md` | 오니기리 | 즉시 밥풀 폭발 규칙 |
| `Planner/game_contents/weapons/onigiri/onigiri_terminal_rice_burst_2026-05-30.md` | 오니기리 | 종료 시 밥풀 폭발 규칙 |
| `Planner/game_contents/weapons/onigiri/onigiri_immediate_expire_no_burst_2026-05-30.md` | 오니기리 | 즉시 소멸 시 폭발 금지 |
| `Planner/game_contents/weapons/umbrella_guard/umbrella_guard_open_spin_explosion_plan_2026-05-25.md` | 우산 방패 | 펼침 회전 폭발 |

개별 무기 문서는 실제 구현 전 현재 코드와 다시 대조해야 한다. 특히 같은 무기에 여러 문서가 있으면 날짜가 최신인 문서를 먼저 본다.

## 6. 캐릭터 성장, 패시브, 보상, 재화

한 판 안의 성장과 다음 판에 남는 성장, XP/골드/상점 흐름을 다루는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `Planner/B.게임기획,밸런스 구현/B-1 캐릭터 성장,능력치 업그레이드 구조 구현/meta_progression_2x_growth_plan_2026-05-25.md` | 메타프로그레션 | 높음 | 주인공 2배 성장 체감 구조 |
| `Planner/B.게임기획,밸런스 구현/B-1 캐릭터 성장,능력치 업그레이드 구조 구현/Rewards_Drops/dual_drop_system_2026-05-08.md` | XP/골드 이원화 | 매우 높음 | 교과서 XP와 황금 코인 분리 |
| `Planner/Essential_game_plan/passive_upgrade_catalog_plan_2026-05-17.md` | 패시브/코인 경제 | 매우 높음 | 패시브 상점, 가격표, 구매 순서 |
| `Planner/B.게임기획,밸런스 구현/B-1 캐릭터 성장,능력치 업그레이드 구조 구현/Rewards_Drops/xp_textbook_drop_rule_guard_2026-05-30.md` | XP 드랍 규칙 보호 | 높음 | 교과서 드랍 규칙 회귀 방지 |

현재 핵심은 "이번 판 성장 재화"와 "다음 판에도 남는 재화"를 분리하는 것이다. 초보자 기준으로 말하면, 교과서는 이번 판 레벨업용이고 황금 코인은 장기 성장용이다.

## 7. 전투 피드백, 이펙트, 사망 연출

공격이 맞았는지, 적이 죽었는지, 위험이 보이는지를 다루는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `Planner/Tech_plan/Combat_Feedback/common_enemy_hit_spark_2026-05-30.md` | 피격 이펙트 | 높음 | 공통 적 피격 스파크 |
| `Planner/game_contents/weapons/combat_feedback/player_weapon_arm_action_rules_2026-05-30.md` | 플레이어 무기 팔 동작 | 높음 | 무기 사용 시 팔 액션 규칙 |
| `Planner/Tech_plan/Combat_Feedback/zombie_body_collapse_death_effect_2026-05-30.md` | 좀비 사망 연출 | 높음 | 몸체 붕괴 사망 효과 |
| `Planner/Tech_plan/Combat_Feedback/zombie_death_violent_scatter_restore_2026-06-01.md` | 좀비 사망 연출 복원 | 높음 | 격렬한 파편 박살 연출 복원 |
| `Planner/Tech_plan/Combat_Feedback/zombie_death_three_effect_rotation_2026-06-01.md` | 좀비 사망 연출 다양화 | 높음 | 좀비 사망 효과 3종 랜덤 규칙 |
| `Planner/Tech_plan/effect_implementation_technical_plan_2026-05-10.md` | 이펙트 기술기획 | 높음 | VFXLayer, 이벤트 큐, 색상 규칙 |
| `Planner/Tech_plan/effect_sloution.md` | 효과 매칭 구조 | 높음 | 아이템과 효과를 연결하는 구조 |

이 분야는 기획과 그래픽/개발이 함께 걸린다. 실제 3D 캐릭터/몬스터 시각 작업으로 넘어가면 `Graphic_designer/` 정책도 같이 확인해야 한다.

## 8. 기술 기획과 코드 점검

기술스택, 구현 방향, 중간 점검을 다루는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `Planner/Tech_plan/tech_stakc.md` | 기술스택 종합 | 높음 | Escape! zombie school 기술스택과 선택 이유 |
| `Planner/Planning_Methodology/Major_Review_Point/5.16_게임기술스택,코드_중간점검.md` | 코드 중간점검 | 중간 | 2026-05-16 기준 기술스택/코드 점검 |
| `Planner/Planning_Methodology/Major_Review_Point/5.16_플레이테스트_XP경제_실측.md` | 플레이테스트 실측 | 높음 | XP 경제와 무기 업그레이드 체감 측정 |

기술 구현 자체는 `Developer/` 영역이지만, 기술 방향과 검토 기록은 Planner 안에도 남아 있다.

## 9. 기획 방법론, 색인, 서브에이전트 운용

문서 정리 방식, 서브에이전트 검토, Compound Engineering 기록을 다루는 분야다.

| 문서 | 성격 | 사용법 |
|---|---|---|
| `Planner/Planning_Methodology/README.md` | 방법론 폴더 안내 | Planning_Methodology 폴더 구조 확인 |
| `Planner/Planning_Methodology/Planner_Index/planner_documents_by_field_2026-05-14.md` | 과거 분야별 색인 | 2026-05-14~05-24 정리 기준 확인 |
| `Planner/Planning_Methodology/Planner_Index/planner_disposal_log_2026-05-14.md` | 파기 로그 | 삭제/파기된 과거 문서 확인 |
| `Planner/Planning_Methodology/Planner_Index/planner_documents_by_field_2026-06-03.md` | 최신 분야별 색인 | 현재 문서. 2026-06-03 기준 전체 60개 정리 |
| `Planner/Planning_Methodology/Subagent_Workflow/subagent_planner.md` | 서브에이전트 운용 | 기획 평가용 에이전트 조합 확인 |
| `Planner/Planning_Methodology/Subagent_Workflow/subagent_validation_pipeline.md` | 서브에이전트 검증 파이프라인 | 에이전트 결과 검증 흐름 확인 |
| `Planner/Planning_Methodology/Compound_Engineering/compound_engineering_folder_structure_2026-05-16.md` | CE 폴더 구조 | Compound Engineering 문서 구조 확인 |

기획 문서를 새로 만들 때는 이 색인을 먼저 보고, 같은 분야 문서가 이미 있는지 확인한다.

## 10. 외부 레퍼런스와 참고자료

직접 구현 지시가 아니라 참고자료로 유지하는 문서다.

| 문서 | 분야 | 사용법 |
|---|---|---|
| `Planner/Ref_Vampire_GameDesign/Top Checkup List.txt` | 체크리스트 | 1스테이지 세부기획 항목 참고 |
| `Planner/Ref_Vampire_GameDesign/1스테이지 토탈기획 시나리오.txt` | 서비스/스테이지 참고 | 1스테이지 전체 구성 참고 |
| `Planner/Ref_Vampire_GameDesign/vampire_5minite_monster.md` | 몬스터 참고 | 5분 몬스터 스폰 설계 참고 |
| `Planner/Ref_Vampire_GameDesign/Vampire_5minute_levelup.md` | 레벨업 참고 | 5분 세션 레벨업 설계 참고 |
| `Planner/Ref_Vampire_GameDesign/vampire_survivors_formula_reference.md` | 공식 참고 | 데미지/레벨업 메커닉 참고 |
| `Planner/Ref_Vampire_GameDesign/게임데미지공식기획기준.txt` | 밸런스 철학 | 몇 방에 죽는가 기준 참고 |
| `Planner/game_contents/weapons/references/Vampire_5minute_Firearms.md` | 무기 참고 | Vampire Survivors식 무기 위력 참고 |
| `Planner/game_contents/weapons/references/뱀파이어 서바이버 무기해금 조건 자료.txt` | 해금 참고 | 업적/누적 기록 기반 해금 참고 |

레퍼런스는 그대로 복사하지 않는다. 현재 프로젝트의 학교 좀비 생존 콘셉트에 맞게 바꿔서 사용한다.

## 11. 루트에서 정리한 세부 기획 문서

2026-06-03 정리에서 `Planner/` 루트에 흩어져 있던 세부 기획 문서를 아래 폴더로 이동했다. `Planner/current_game_rules.md`는 현재 규칙 정본이므로 루트에 유지한다.

| 분야 | 이동 위치 |
|---|---|
| 커터칼 | `Planner/game_contents/weapons/BoxCutter/` |
| 나침반 칼날 | `Planner/game_contents/weapons/CompassBlade/` |
| 오니기리 | `Planner/game_contents/weapons/Onigiri/` |
| 유도미사일 | `Planner/game_contents/weapons/GuidedMissile/` |
| 무기 공통 규칙 | `Planner/game_contents/weapons/Rules/` |
| 몬스터/웨이브 | `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Monster_Wave/` |
| XP/드랍 | `Planner/B.게임기획,밸런스 구현/B-1 캐릭터 성장,능력치 업그레이드 구조 구현/Rewards_Drops/` |
| 전투 피드백/VFX/사망 연출 | `Planner/Tech_plan/Combat_Feedback/` |

이번 이동 후 `Planner/` 루트의 md 문서는 `current_game_rules.md`만 남는다.

## 12. 분야별 빠른 사용표

| 하려는 일 | 먼저 볼 문서 |
|---|---|
| 현재 전체 게임 규칙 확인 | `Planner/current_game_rules.md` |
| Stage 1 밸런스 수정 | `stage1_replan_2026-05-06.md`, `stage1_reverse_design_current_2026-05-09.md` |
| Stage 2 구현 준비 | `stage2_corridor_projectile_plan_2026-06-03.md` |
| 몬스터 스폰 조정 | Stage 1/Stage 2 스테이지 문서와 `Monster_Wave/e06_late_wave_spawn_pressure_2_percent_2026-05-30.md` |
| 무기 슬롯/해금 판단 | `Planner/game_contents/weapons/rules/weapon_slot_limit_8_2026-05-26.md`, `Planner/game_contents/weapons/rules/weapon_unlock_acquire_upgrade_terms_2026-05-26.md` |
| 무기 추가/업그레이드 | `Planner/game_contents/weapons/weapon_upgrade_flow_and_unlock_plan_2026-05-14.md`, `Planner/game_contents/weapons/weapon_expansion_unlock_plan_2026-05-10.md` |
| 개별 무기 조정 | `Planner/game_contents/weapons/boxcutter/`, `Planner/game_contents/weapons/compass_blade/`, `Planner/game_contents/weapons/onigiri/`, `Planner/game_contents/weapons/guided_missile/` 하위 문서 |
| XP/골드/상점 | `dual_drop_system_2026-05-08.md`, `passive_upgrade_catalog_plan_2026-05-17.md`, `result_coin_shop_flow_requirements_2026-05-17.md` |
| 출근길 UX | `commuter_target_planning_2026-05-14.md`, `commuter_friendly_implementation_request_2026-05-17.md` |
| 타이틀 화면 | `title_landing_screen_plan_2026-05-10.md`, `title_screen_multi_agent_concept_review_2026-05-23.md` |
| 전투 이펙트/VFX | `effect_implementation_technical_plan_2026-05-10.md`, `effect_sloution.md`, `Combat_Feedback/` 하위 문서 |
| 서브에이전트 논의 | `subagent_planner.md`, `subagent_validation_pipeline.md` |
| 과거 파기 문서 확인 | `planner_disposal_log_2026-05-14.md` |

## 13. 현재 Planner 상황 요약

현재 `Planner/`는 크게 아래 8개 분야로 나뉜다.

```text
1. 서비스 방향 / 출근길 UX / 타이틀
2. Stage 1 / Stage 2 / 몬스터 / 웨이브
3. 무기 / 업그레이드 / 해금
4. 캐릭터 성장 / 패시브 / XP / 골드
5. 전투 피드백 / VFX / 사망 연출
6. 기술 기획 / 코드 점검
7. 기획 방법론 / 색인 / 서브에이전트
8. 외부 레퍼런스
```

정리상 가장 눈에 띄는 점은 두 가지다.

1. 2026-05-26 이후 추가된 개별 무기/이펙트/사망 연출 문서는 같은 맥락별 폴더로 이동했다.
2. 기존 2026-05-14 색인은 역사적으로 유용하지만, Stage 2와 최신 개별 문서까지 반영한 최신 색인은 이 문서를 기준으로 보는 것이 좋다.

추가로 더 정리하려면 각 새 폴더 안에 `README.md`를 만들어 해당 분야의 정본 순서를 적는 작업이 다음 단계다.
