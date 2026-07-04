# 무기별 전체 문서 인덱스 (2026-07-04)

16종 무기 각각에 대한 모든 문서(기획·구현·그래픽·QA)의 단일 인덱스.
파일을 이동·추가하면 이 인덱스도 갱신한다. 스탯 수치의 정본은 항상
`Developer/r3f_prototype/src/lib/weaponCatalog.js`.

경로 약어: `P`=Planner/game_contents/weapons, `D`=Developer/weapons,
`D구`=Developer/구현기록, `G`=Graphic_designer/weapons,
`G아`=Graphic_designer/graphic_asset/weapon_graphics, `Q`=Quaility_Assurance/weapons

---

## 1. pencilThrow 연필

- 구현: `D구/게임기획밸런스구현코드연결/pencil_homing_tumbler_radius_notes_2026-04-26.md`, `pencil_opening_damage_balance_2026-05-25.md`
- QA: `Q/pencil_opening_damage_validation_2026-05-25.md`, `Q/pencil_upgrade_choice_validation_2026-05-17.md`

## 2. schoolBag 30cm 자

- 개별 문서 없음 (스탯은 weaponCatalog.js, 커터칼 쿨다운의 기준값)

## 3. boxCutter 커터칼

- 기획: `P/boxcutter/boxcutter_base_stat_1_5x_2026-05-26.md`
- 구현: `D구/게임기획밸런스구현코드연결/boxcutter_base_stat_1_5x_implementation_2026-05-26.md`, `D구/그래픽구현코드연결/boxcutter_stab_slash_effect_implementation_2026-05-27.md`, `boxcutter_trail_and_umbrella_scale_tuning_2026-05-26.md`, `boxcutter_triangle_trail_removed_2026-05-27.md`
- 그래픽: `G/boxcutter_all_angle_stab_slash_effect_proposal_2026-05-27.md`, `G/boxcutter_stab_slash_effect_implementation_2026-05-27.md`, `G/boxcutter_trail_and_umbrella_scale_visual_2026-05-26.md`, `G/boxcutter_triangle_trail_removed_2026-05-27.md`
- QA: `Q/boxcutter_base_stat_1_5x_validation_2026-05-26.md`, `Q/boxcutter_stab_slash_effect_validation_2026-05-27.md`, `Q/boxcutter_trail_and_umbrella_scale_validation_2026-05-26.md`, `Q/boxcutter_triangle_trail_removed_validation_2026-05-27.md`
- 최근 변경(코드): 쿨다운 = 30cm자의 절반 (2026-07-04, weaponCatalog.js 주석)

## 4. tumbler 텀블러

- 구현: `D구/게임기획밸런스구현코드연결/pencil_homing_tumbler_radius_notes_2026-04-26.md` (연필과 공용 노트)

## 5. scienceFlask 과학 플라스크

- 구현: `D/science_flask_zone_damage_fix_2026-07-04.md`, `D구/그래픽구현코드연결/combat_item_flask_update_notes_2026-04-26.md`
- 그래픽: `Graphic_designer/A.graphic/A-4.effect/Items_Effects_Feedback/combat_item_flask_visual_notes_2026-04-26.md`
- QA: `Q/science_flask_zone_damage_fix_validation_2026-07-04.md`
- 최근 변경(코드): **웅덩이 존 리워크** — 착탄 절반 + 존 5s(+1s/레벨) 연필Lv1 틱 (2026-07-04)

## 6. bell 벨

- 구현: `D구/그래픽구현코드연결/bell_sonic_ring_effect_implementation_2026-05-30.md`, `electric_bell_effect_scale_down_implementation_2026-05-30.md`
- 그래픽: `G/bell_sonic_ring_effect_2026-05-30.md`, `G/electric_bell_effect_scale_down_2026-05-30.md`
- QA: `Q/bell_sonic_ring_effect_validation_2026-05-30.md`, `Q/electric_bell_effect_scale_down_validation_2026-05-30.md`

## 7. stunGun 전기

- 구현: `D구/그래픽구현코드연결/stungun_outline_removal_note_2026-05-03.md`

## 8. onigiri 오니기리

- 기획: `P/onigiri/` 4건 (single_cushion_explosion_rule, instant/terminal/immediate rice_burst)
- 구현: `D구/게임기획밸런스구현코드연결/onigiri_retarget_and_rice_burst_fix_2026-05-25.md`, `onigiri_single_cushion_explosion_implementation_2026-05-26.md`, `D구/그래픽구현코드연결/onigiri_*` 4건
- 그래픽: `G/onigiri_*` 4건, `G아/07_onigiri/concept/onigiri_rice_burst_concept_2026-05-25.md`
- QA: `Q/onigiri_*` 6건
- 주의: 카드 노출 레벨 문서-코드 불일치 (README 참조)

## 9. chibiko 치비코

- 기획: `P/chibiko_weapon_plan_2026-06-12.md`
- 구현: `D구/chibiko_player_trail_follow_2026-06-14.md`, `D구/게임기획밸런스구현코드연결/chibiko_weapon_implementation_2026-06-12.md`
- 그래픽: `G/chibiko_three_mini_graphic_implementation_2026-06-12.md`
- QA: `Q/chibiko_weapon_validation_2026-06-12.md`, `Q/chibiko_player_trail_follow_validation_2026-06-14.md`

## 10. guidedMissile 보조배터리 미사일

- 기획: `P/guided_missile/guided_missile_unlock_accessibility_2026-05-26.md`
- 구현: `D구/게임기획밸런스구현코드연결/guided_missile_unlock_visibility_fix_2026-05-26.md`
- QA: `Q/guided_missile_unlock_visibility_validation_2026-05-26.md`
- 참고: 상어미사일 데미지 기준(×1.3)

## 11. sharkMissile 상어미사일

- 기획: `P/shark_missile_unlock_plan_2026-06-11.md`, `P/shark_missile_runtime_integration_2026-06-14.md`
- 구현: `D/shark_missile_homing_yaw_fix_2026-06-28.md`, `D구/shark_missile_false_negative_root_cause_2026-06-14.md`, `shark_missile_in_game_runtime_2026-06-14.md`, `D구/게임기획밸런스구현코드연결/shark_missile_implementation_2026-06-11.md`, `shark_missile_integration_2026-06-14.md`
- 그래픽: `G/shark_missile_weapon_concept_2026-06-09.md`, `G아/14_shark_missile/` 4건 (concept/implementation×2/qa_reference)
- QA: `Q/shark_missile_*` 5건
- 최근 변경(코드): **dart 비행 리워크** — 1.5s 방랑→귀소, 파라미터 정본 `sharkMissileRuntime.js SHARK_DART` (2026-07-04)

## 12. starlink 고장난 스타링크

- 기획: `P/rules/starlink_ground_flash_half_scale_rule_2026-06-28.md`
- 구현: `D/starlink_ground_flash_half_scale_implementation_2026-06-28.md`
- 그래픽: `G/starlink_ground_flash_half_scale_direction_2026-06-28.md`
- QA: `Q/starlink_ground_flash_half_scale_validation_2026-06-28.md`

## 13. compassBlade 나침반 칼날

- 기획: `P/compass_blade/` 4건 (five_hit_explosion_rule, respawn, stack_explosion_balance, visible_explosion_effect)
- 구현: `D/compass_blade_black_screen_fix_2026-06-25.md`, `D구/게임기획밸런스구현코드연결/compass_blade_*` 4건, `D구/그래픽구현코드연결/compass_blade_visible_explosion_effect_implementation_2026-05-27.md`, `compass_dash_go_bubble_umbrella_saturation_2026-05-25.md`
- 그래픽: `G/compass_blade_stack_explosion_visual_2026-05-25.md`, `G/compass_blade_visible_explosion_effect_2026-05-27.md`, `G아/10_compassBlade/concept/` 1건
- QA: `Q/compass_blade_*` 6건 + `Q/compass_dash_go_bubble_umbrella_saturation_validation_2026-05-25.md`
- 최근 변경(코드): 폭발 데미지 30 고정 — 플라스크 파생 해제 (2026-07-04, compassBlade.js 주석)

## 14. umbrellaGuard 우산 방어막

- 기획: `P/umbrella_guard/umbrella_guard_open_spin_explosion_plan_2026-05-25.md`
- 구현: `D구/게임기획밸런스구현코드연결/umbrella_guard_open_spin_explosion_implementation_2026-05-25.md`, `D구/그래픽구현코드연결/umbrella_guard_*` 2건
- 그래픽: `G아/11_umbrellaGuard/concept/` 3건
- QA: `Q/umbrella_guard_*` 3건

## 15. eraserBomb 지우개 폭탄

- 기획: `P/rules/eraser_bomb_graphic_half_scale_rule_2026-06-28.md`
- 구현: `D/eraser_bomb_graphic_half_scale_implementation_2026-06-28.md`
- 그래픽: `G/eraser_bomb_graphic_half_scale_threemini_review_2026-06-28.md`, 핸드오프 `Developer/agent_room/threemini_eraser_bomb_half_scale_handoff_2026-06-28.md`
- QA: `Q/eraser_bomb_graphic_half_scale_validation_2026-06-28.md`

## 16. studentLantern 학생용 랜턴 (신규 2026-07-04)

- 기획: `P/rules/student_lantern_half_range_arm_pose_rule_2026-07-04.md`
- 구현: `D/student_lantern_cone_attack_2026-07-04.md`, `D/student_lantern_half_range_arm_pose_2026-07-04.md`
- 그래픽: `G/student_lantern_cone_visual_2026-07-04.md`, `G/student_lantern_arm_pose_visual_2026-07-04.md`
- QA: `Q/student_lantern_cone_attack_validation_2026-07-04.md`, `Q/student_lantern_half_range_arm_pose_validation_2026-07-04.md`

---

## 무기 시스템 공통 문서

- 목록/정합성: `P/weapon_list.md`, `P/weapon_docs_runtime_match_audit_2026-06-03.md`
- 해금/확장 설계: `P/weapon_upgrade_flow_and_unlock_plan_2026-05-14.md`, `P/weapon_expansion_unlock_plan_2026-05-10.md`, `CEO/docs/plans/2026-05-19-001-feat-weapon-meta-progression-expansion-plan.md`
- 로스터/카드풀: `P/stage1_weapon_roster_card_pool_drift_resolution_2026-06-24.md`
- 공통 규칙: `P/rules/weapon_slot_limit_8_2026-05-26.md`, `P/rules/weapon_unlock_acquire_upgrade_terms_2026-05-26.md`
- 전투 피드백: `P/combat_feedback/player_weapon_arm_action_rules_2026-05-30.md`, `G/player_weapon_arm_action_2026-05-30.md`, `Q/player_weapon_arm_action_validation_2026-05-30.md`
- 치트/도구: `D/weapon_cheat_panel_2026-07-04.md`, `Q/weapon_cheat_panel_validation_2026-07-04.md`, `D구/title_unlock_all_weapons_cheat_2026-06-12.md`, `Q/title_unlock_all_weapons_cheat_validation_2026-06-12.md`
- 카드/업그레이드 시스템: `D구/게임기획밸런스구현코드연결/upgrade_choice_unique_weapon_fix_2026-05-25.md`, `Q/upgrade_choice_unique_weapon_validation_2026-05-25.md`
- 아카이브/리뷰: `G/weapon_graphics_archive_setup_2026-05-25.md`, `Q/weapon_graphics_archive_validation_2026-05-25.md`, `Q/weapon_implementation_code_review_2026-05-25.md`
- 초기 노트: `D구/게임기획밸런스구현코드연결/current_weapon_implementation_notes_2026-05-03.md`, `weapon_range_balance_notes_2026-05-01.md`
- 외부 참고: `P/references/Vampire_5minute_Firearms.md`
- 솔루션(버그 패턴): `CEO/docs/solutions/architecture-patterns/or-condition-weapon-unlock-evaluator-2026-05-19.md`, `CEO/docs/solutions/conventions/sensor-weapon-track-rigidbody-and-match-collider-2026-06-04.md`
