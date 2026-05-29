# 게임기획밸런스구현코드연결

게임기획·밸런스 정본과 실제 구현 코드의 연결 기록을 보관한다.

- 정본: `Planner/B.게임기획,밸런스 구현/`, `Planner/` 루트의 규칙 문서, `Bang_Rules.md`
- 실행 코드: `Developer/r3f_prototype/src/`

각 기록은 정본의 한 줄 결정이 어느 store/lib/component 변경으로 떨어졌는지 추적한다. 동일 무기·시스템의 갱신은 시간순으로 정렬하고, 이전 룰을 대체하는 항목은 본 표에서 *대체됨* 으로 표기한다.

---

## 무기 — 메커닉 / 밸런스 / 해금

### Pencil Throw (연필 던지기)

- [pencil_homing_tumbler_radius_notes_2026-04-26.md](pencil_homing_tumbler_radius_notes_2026-04-26.md) — 호밍 + 텀블러 반경 노트
- [pencil_opening_damage_balance_2026-05-25.md](pencil_opening_damage_balance_2026-05-25.md) — 오프닝 데미지 밸런스

### 30cm Ruler / School Bag

- [ruler_swing_cooldown_note_2026-05-01.md](ruler_swing_cooldown_note_2026-05-01.md) — 자 휘두르기 쿨다운

### Compass Blade (나침반 칼날)

- **최신 정본**: [compass_blade_five_hit_explosion_implementation_2026-05-27.md](compass_blade_five_hit_explosion_implementation_2026-05-27.md) — 폭발 임계 10→5스택
- 2026-05-27 — [compass_blade_respawn_after_explosion_implementation_2026-05-27.md](compass_blade_respawn_after_explosion_implementation_2026-05-27.md) — 폭발 후 칼날 재생성
- 2026-05-25 — [compass_blade_stack_explosion_implementation_2026-05-25.md](compass_blade_stack_explosion_implementation_2026-05-25.md) — 스택 폭발 초기안 (10스택, *5-hit으로 대체됨*)
- 2026-05-25 — [compass_blade_full_audit_and_fix_2026-05-25.md](compass_blade_full_audit_and_fix_2026-05-25.md) — 풀 오디트 + 3D 리빌드 (기준 기록)

### Umbrella Guard (우산 방어막)

- 2026-05-25 — [umbrella_guard_open_spin_explosion_implementation_2026-05-25.md](umbrella_guard_open_spin_explosion_implementation_2026-05-25.md) — 펴짐 + 회전 + 폭발 메커닉

### Onigiri (오니기리)

- 2026-05-26 — [onigiri_single_cushion_explosion_implementation_2026-05-26.md](onigiri_single_cushion_explosion_implementation_2026-05-26.md) — 단일 쿠션 폭발 룰
- 2026-05-25 — [onigiri_retarget_and_rice_burst_fix_2026-05-25.md](onigiri_retarget_and_rice_burst_fix_2026-05-25.md) — 재타깃 + 쌀 버스트 보정

### Box Cutter (커터칼)

- 2026-05-26 — [boxcutter_base_stat_1_5x_implementation_2026-05-26.md](boxcutter_base_stat_1_5x_implementation_2026-05-26.md) — 기본 능력치 1.5배 상향

### Guided Missile (보조배터리 미사일)

- 2026-05-26 — [guided_missile_unlock_visibility_fix_2026-05-26.md](guided_missile_unlock_visibility_fix_2026-05-26.md) — 해금 카드 노출 보정

### 무기 일반 (legacy 기준 기록)

- [auto_attack_review_notes_2026-04-26.md](auto_attack_review_notes_2026-04-26.md) — 자동 공격 흐름 초기 리뷰
- [current_weapon_implementation_notes_2026-05-03.md](current_weapon_implementation_notes_2026-05-03.md) — 7종 기준 무기 상태 스냅샷
- [weapon_range_balance_notes_2026-05-01.md](weapon_range_balance_notes_2026-05-01.md) — 무기 사거리 밸런스

---

## 무기 시스템 — 슬롯 / 해금 / 업그레이드

- 2026-05-26 — [weapon_slot_limit_8_implementation_2026-05-26.md](weapon_slot_limit_8_implementation_2026-05-26.md) — 슬롯 상한 4→8 확장
- 2026-05-26 — [weapon_unlock_acquire_upgrade_terminology_alignment_2026-05-26.md](weapon_unlock_acquire_upgrade_terminology_alignment_2026-05-26.md) — 해금/획득/업그레이드 용어 정렬
- 2026-05-25 — [upgrade_choice_unique_weapon_fix_2026-05-25.md](upgrade_choice_unique_weapon_fix_2026-05-25.md) — 레벨업 카드 무기 중복 방지

---

## 패시브 / 캐릭터 성장

- [magnet_initial_radius_balance_2026-05-25.md](magnet_initial_radius_balance_2026-05-25.md) — 자석 초기 반경 밸런스

---

## 적 / 스폰

- [e01_spawn_reduction_note_2026-05-03.md](e01_spawn_reduction_note_2026-05-03.md) — E01 스폰 감소 노트

---

## 결과 / 메타 흐름

- [result_coin_shop_flow_plan_2026-05-17.md](result_coin_shop_flow_plan_2026-05-17.md) — 결과 화면 → 코인 상점 흐름

---

## 표기 규칙

- 무기별 섹션 내에서 위로 갈수록 최신.
- 이전 룰을 명시적으로 대체한 기록은 *대체됨* 으로 표시한다.
- 정본은 항상 `Planner/`. 본 폴더는 정본 ↔ 코드 매핑 기록만 보관.
