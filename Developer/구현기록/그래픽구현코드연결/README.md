# 그래픽구현코드연결

그래픽 정본 문서와 실제 구현 코드의 연결 기록을 보관한다.

- 정본: `Graphic_designer/A.graphic/` 및 `Graphic_designer/` 루트의 시각 기획 문서
- 실행 코드: `Developer/r3f_prototype/src/`

각 기록은 그래픽 의사결정이 어떤 컴포넌트/머티리얼/지오메트리 변경으로 떨어졌는지 추적한다. 같은 주제가 시간순으로 갱신될 때 옛 기록은 남기되 최신 항목을 본문 첫 줄에서 명시한다.

---

## 무기 효과

### Box Cutter (커터칼)

- **최신**: [boxcutter_stab_slash_effect_implementation_2026-05-27.md](boxcutter_stab_slash_effect_implementation_2026-05-27.md) — 전방 찌르기 + 끝점 대칭 절삭 효과 방향 적용
- 2026-05-27 — [boxcutter_triangle_trail_removed_2026-05-27.md](boxcutter_triangle_trail_removed_2026-05-27.md) — 큰 삼각형 트레일 잔상 완전 제거
- 2026-05-26 — [boxcutter_trail_and_umbrella_scale_tuning_2026-05-26.md](boxcutter_trail_and_umbrella_scale_tuning_2026-05-26.md) — *(트레일 부분은 위 두 기록으로 대체됨, 우산 스케일 튜닝 내용은 여전히 유효)*

### Compass Blade (나침반 칼날)

- **최신**: [compass_blade_visible_explosion_effect_implementation_2026-05-27.md](compass_blade_visible_explosion_effect_implementation_2026-05-27.md) — 폭발 가시화 이펙트 적용

### Umbrella Guard (우산 방어막)

- 2026-05-25 — [umbrella_guard_palette_application_2026-05-25.md](umbrella_guard_palette_application_2026-05-25.md) — 5색 팔레트 적용
- 2026-05-25 — [umbrella_guard_and_charge_warning_visual_fix_2026-05-25.md](umbrella_guard_and_charge_warning_visual_fix_2026-05-25.md) — 우산 시각 + 보스 차지 경고 시각 보정
- 2026-05-25 — [compass_dash_go_bubble_umbrella_saturation_2026-05-25.md](compass_dash_go_bubble_umbrella_saturation_2026-05-25.md) — 컴퍼스/대시/우산 채도 보정

### 전투 아이템

- [combat_item_flask_update_notes_2026-04-26.md](combat_item_flask_update_notes_2026-04-26.md) — 과학 플라스크 시각 업데이트
- [stungun_outline_removal_note_2026-05-03.md](stungun_outline_removal_note_2026-05-03.md) — 전기 무기 외곽선 제거

---

## UI / HUD

- 2026-05-26 — [hud_restart_and_ruler_cooldown_ui_2026-05-26.md](hud_restart_and_ruler_cooldown_ui_2026-05-26.md) — 재시작 흐름 + 30cm 자 쿨다운 UI
- 2026-05-25 — [upgrade_icon_fallback_fix_2026-05-25.md](upgrade_icon_fallback_fix_2026-05-25.md) — 무기 아이콘 로드 실패 시 그려진 아이콘 fallback
- [mini_healthbar_implementation_notes_2026-05-01.md](mini_healthbar_implementation_notes_2026-05-01.md) — 적 미니 체력바 구현

---

## 환경 / 타이틀

- [title_screen_technical_discussion_2026-05-23.md](title_screen_technical_discussion_2026-05-23.md) — 타이틀 화면 기술 논의
- [prop_obstacle_design_discussion_2026-05-21.md](prop_obstacle_design_discussion_2026-05-21.md) — 소품 장애물 디자인 논의

---

## 표기 규칙

- 같은 주제의 기록이 시간순으로 갱신되면 위로 갈수록 최신.
- 상위 기록으로 대체된 부분은 본 표에서 *대체됨* 으로 표기.
- 정본은 항상 `Graphic_designer/`. 본 폴더는 정본 ↔ 코드 매핑 기록만.
