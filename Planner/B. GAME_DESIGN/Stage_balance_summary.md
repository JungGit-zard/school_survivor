# Stage Balance Summary — 스테이지 진행·난이도 요약

> 작성일: 2026-06-09
> 목적: Stage 1·2의 진행 구성과 난이도를 한 문서에서 비교·참조할 수 있게 요약한 인덱스 겸 치트시트.
> 난이도 정본은 각 스테이지의 기획/역기획 문서이며, 실제 동작값의 최종 진실은 코드(`Enemies.jsx`, `stage2ProjectileRules.js`)다.

---

## 🟦 STAGE 1 — 교실 생존 (접근·돌진 압박)

### 문서 지도
| 역할 | 문서 |
|------|------|
| ⭐ 난이도 정본(역기획) | [stage1_reverse_design_current_2026-05-09.md](B-2_Stage_process_difficulty/Stage1_Balance/stage1_reverse_design_current_2026-05-09.md) |
| 초기 재기획 | [stage1_replan_2026-05-06.md](B-2_Stage_process_difficulty/Stage1_Balance/stage1_replan_2026-05-06.md) |
| 후반 E06 압박 | [e06_late_wave_spawn_pressure_2_percent_2026-05-30.md](B-2_Stage_process_difficulty/Monster_Wave/e06_late_wave_spawn_pressure_2_percent_2026-05-30.md) |
| 무대 소품(버려진 교실) | [stage1_classroom_desk_disrupted_layout_2026-06-07.md](B-2_Stage_process_difficulty/Stage1_Balance/stage1_classroom_desk_disrupted_layout_2026-06-07.md) · CEO 그래픽 재구성 요구사항(`CEO/docs/brainstorms/2026-05-20-...md`) |
| 코드 정본 | `Developer/r3f_prototype/src/components/Enemies.jsx` (`WAVE_PHASES`, `BURST_EVENTS`) |

### 난이도 레벨 — 300초 웨이브
| 시간 | 동시 적 수 | 구성 | 체감 역할 |
|------|:---:|------|------|
| 0:00–0:30 | 12 | E01 100% | 기본 처치 학습 |
| 0:30–1:00 | 18 | E01 90 / E03 10 | 빠른 적 첫 압박 |
| 1:00–1:30 | 26 | E01 60 / E03 30 / E02 10 | 탱커 첫 등장 |
| 1:30–2:00 | 34 | E01 50 / E03 30 / E02 20 | 밀도 상승 |
| 2:00–2:30 | 44 | E01 40 / E03 35 / E02 25 | 추격 밀도 상승 |
| 2:30–3:00 | 54 | +E05 10 | 돌진 예고 |
| 3:00–3:30 | 64 | +E05 15 | 돌진 본격 |
| 3:30–4:00 | **76** | +E06 3 | 보스 전 최종 압박 |
| 4:00–4:20 | 25 | E01 60 / E02 40 ·보스 | B01 등장, 일반 적 감소 |
| 4:20–4:40 | 35 | E02 60 / E05 40 ·보스 | 보스+돌진 |
| 4:40–5:00 | 45 | E02 50 / E05 50 ·보스 | 마지막 생존 압박 |

버스트 이벤트: 0s E01×8 · 30s E01×6 · 60s E02×4 · 90s E03×6 · 120s E01×8+E02×4 · 150s E05×4 · 180s E05×4 · 210s E06×1 · 230s E01×12+E02×8+E05×4 · **240s B01×1** · 270s E05×5.

### 적 스탯 (역기획 §7)
| ID | 역할 | HP | 속도 | 접촉피해 | XP | 비고 |
|----|------|---:|---:|---:|---:|------|
| E01 | 기본 잡몹 | 8 | 0.475 | 8 | 6 | 단순 추격 |
| E02 | 탱커 | 70 | 0.55 | 14 | 10 | 높은 HP 벽 |
| E03 | 러너 | 14 | 1.10 | 6 | 3 | 빠른 추격 |
| E04 | (Stage1 제외) | 32 | 0.45 | 8 | 7 | 탄환형 → 미사용 |
| E05 | 돌진 | 70 | 0.50 | 16 | 10 | 경고 후 돌진, 기절 |
| E06 | 거대 엘리트 | 320 | 0.60 | 20 | 40 | 벽 역할, 보너스 드랍 |
| B01 | 보스 | 1400 | 0.475 | 22 | 0 | 240s 등장, **탄환無** 접근/돌진 |

**기준값:** 플레이어 HP100·속도3·무적520ms, 첫 레벨업 XP 4. 클리어 = **300초 생존**(보스 처치 불필요).

---

## 🟥 STAGE 2 — 복도 투사체 (탄환 회피)

### 문서 지도
| 역할 | 문서 |
|------|------|
| ⭐ 난이도·설계 정본 | [stage2_corridor_projectile_plan_2026-06-03.md](B-2_Stage_process_difficulty/Stage2_Corridor_Projectile/stage2_corridor_projectile_plan_2026-06-03.md) |
| 구현 계획 | [stage2_corridor_implementation_plan_2026-06-04.md](B-2_Stage_process_difficulty/Stage2_Corridor_Projectile/stage2_corridor_implementation_plan_2026-06-04.md) |
| E04 투사체 규칙(코드) | `Developer/r3f_prototype/src/lib/stage2ProjectileRules.js` |
| 웨이브 코드 정본 | `Developer/r3f_prototype/src/components/Enemies.jsx` (`STAGE2_WAVE_PHASES`, `STAGE2_BURST_EVENTS`) |
| QA | `Quaility_Assurance/stage2_corridor_qa_plan_and_initial_validation_2026-06-04.md` · `.../stage2_google_play_pre_internal_test_qa_gate_2026-06-06.md` |
| 시각 가독성 | `Graphic_designer/stage2_corridor_visual_readability_review_2026-06-04.md` |
| CEO 밸런스 판단(HOLD) | `CEO/ceo_review_stage2_corridor_balance_2026-06-07.md` |

### 난이도 레벨 — 300초 웨이브 (설계 §6)
| 시간 | 적 구성 | E04 상한 | 의도 |
|------|---------|:---:|------|
| 0:00–0:30 | E01 | 0 | 탄환 없이 복도 이동 적응 |
| 0:30–1:00 | E01+E03 | 0 | 직선 도주만으론 불리 |
| 1:00–1:30 | E01+E02+E03 | 0 | E02 첫 투입(벽) |
| **1:30–2:00** | E01+E03+**E04** | 1~2 | **E04 첫 등장** — 탄환 회피 튜토리얼 |
| 2:00–2:30 | E02+E04 | 2~3 | 탱커 뒤 탄환 구조 |
| 2:30–3:00 | E01+E03+E05 | 0~1 | E05 첫 강조 |
| 3:00–3:30 | E03+E04+E05 | 2~3 | 레인 변경 요구 |
| 3:30–4:00 | E02+E04+E06 | 3~4 | E06 벽 + 탄환 |
| 4:00–4:30 | B01+소량+제한E04 | 2~3 | **B01 등장**(인지 우선) |
| 4:30–5:00 | B01+E04+E05+E03 | 3~4 | 최종 종합 압박 |

### E04 투사체 규칙 (설계 §7 / 코드)
| 항목 | 값 |
|------|-----|
| 첫 등장 | 90초 이후 |
| 첫 발사 지연 | 등장 후 0.8~1.0초 (코드 900ms) |
| 발사 쿨다운 | 2200ms |
| 화면 내 탄환 상한 | 6발 |
| 탄환 라인 | 초반 1 → 중반 2 → 후반 3 (직선만, 유도 금지) |
| 최소 발사 거리 | 3.0~3.5 |
| 금지 | 오프스크린 즉시발사 · 근접 즉시발사 · 보스 경고 중 발사 |
| E04 동시 개체 캡(코드) | ~120s 2 / 120~270s 3 / 270s~ 4 |

**B01:** 240초 등장, 자체 탄환 없음(원거리는 E04 담당). **입장 조건:** Stage1 클리어 1회 ∨ Stage1 180초 생존 3회. **보상:** Stage1 대비 +15~20%. 클리어 = **300초 생존**.

---

## 🔑 두 스테이지 난이도 철학 대비
| | Stage 1 | Stage 2 |
|---|---------|---------|
| 압박 수단 | **물량**(접근·돌진), 동시 적 피크 **76** | **투사체 회피**, 피크 **~44** (Stage1의 58%) |
| 신규 학습 | 이동·성장·무기 선택 | 원거리 탄환 읽기 · 레인 변경 |
| E04 탄환 | 없음(제외) | 90초 후 핵심 적 |
| 보스 B01 | 240s, 접근/돌진 | 240s, 접근/돌진(탄환無) |
| 기준 플레이어 | 신규 | Stage1 3~5회 + 일부 해금 |
| 보상 | 기준 | +15~20% |

> 핵심: Stage 1은 **물량**으로, Stage 2는 **탄환 회피 + 안전 레인**으로 난이도를 만든다. 두 스테이지 모두 "공정성(맞기 전 위험 인지·회피 공간·실패 이유 이해)"이 난이도보다 우선한다.

---

## 참고
- 설계 문서의 난이도표와 실제 코드(`WAVE_PHASES`/`STAGE2_WAVE_PHASES`)는 코드 쪽이 더 세분화·일부 수치 조정되어 구현돼 있다. 정확한 현재 동작값은 항상 코드를 확인할 것.
- 본 요약은 인덱스/치트시트이며, 수치 변경 시 각 스테이지 정본 문서와 코드를 우선 갱신한 뒤 본 문서를 맞춘다.
