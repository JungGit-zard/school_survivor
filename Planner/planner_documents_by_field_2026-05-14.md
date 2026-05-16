# Planner 문서 분야별 정리

작성일: 2026-05-14  
작성 위치: `Planner/`  
목적: `Planner/` 폴더 안의 현재 유효 기획 문서를 분야별로 모아, 어떤 문서를 먼저 봐야 하는지 정리한다.

주의: 2026-05-14에 중복되었거나 시간순에서 밀려난 기획 문서는 파기했다. 파기 내역은 `planner_disposal_log_2026-05-14.md`에 기록한다.

---

## 0. 전체 우선순위

기획이 서로 다르게 적혀 있으면 아래 순서로 판단한다.

1. `project_develop_policy.md`
   - 프로젝트 최상위 정책.
   - 역할별 폴더, 세션 연속성, 작업 방식 기준.

2. `Bang_Rules.md`
   - 프로젝트 공통 운영 룰과 현재 확정 수치.
   - 단위 기준: `1 block = 4 units`.

3. `Planner/stage1_replan_2026-05-06.md`
   - 1스테이지 최신 재기획 기준.
   - 2026-05-09 부록의 1스테이지 탄환 몬스터 금지 규칙 포함.

4. `Planner/stage1_reverse_design_current_2026-05-09.md`
   - 현재 구현 상태 기준 역기획 문서.
   - 실제 코드와 기획의 연결 상태를 볼 때 우선.

5. 최신 분야별 문서
   - 타깃/서비스 방향, 보상, 무기 확장, 타이틀, 이펙트, 리뷰 체계.

6. 유지 레퍼런스
   - 직접 구현 기준이 아니라 참고자료로만 사용.

---

## 1. 전체 색인/파기 기록

| 문서 | 성격 | 우선도 | 사용법 |
|---|---|---:|---|
| `planner_documents_by_field_2026-05-14.md` | 최신 분야별 색인 | 높음 | 현재 남아 있는 Planner 문서를 분야별로 찾을 때 본다 |
| `planner_disposal_log_2026-05-14.md` | 파기 기록 | 높음 | 삭제된 과거/중복 문서와 파기 이유를 확인할 때 본다 |

현재 색인은 파기 후 기준이다.  
삭제된 문서명은 이 문서에 다시 기준 문서처럼 싣지 않는다.

---

## 2. 타깃/서비스 방향

게임을 누구에게, 어떤 상황에서 플레이하게 할지 정하는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `commuter_target_planning_2026-05-14.md` | 출근길 직장인 타깃 기획 | 높음 | 중단되어도 아깝지 않은 5분 생존 경험 |
| `title_landing_screen_plan_2026-05-10.md` | 첫 화면/브랜딩 기획 | 중간 | `좀비락교 탈출`, 5분 생존 카피 |
| `Ref_Vampire_GameDesign/1스테이지 토탈기획 시나리오.txt` | 서비스 방향 레퍼런스 | 낮음 | 5분 세션, 광고, 도감, 장기 성장 참고 |

현재 핵심 기조:

```text
BangBang Survivor의 1차 완성 기준은 더 많은 콘텐츠가 아니라,
출근길에 끊겨도 아깝지 않고 한 손으로 기분 좋게 버틸 수 있는 5분 생존 경험이다.
```

기획 판단 기준:

- 한 손으로 가능한가.
- 무음으로도 위험을 알 수 있는가.
- 갑자기 중단되어도 보상이 남는가.
- 결과창이 짧고 바로 이해되는가.
- 5분 안에 성장과 보상을 체감하는가.

---

## 3. 1스테이지 핵심 기획/밸런스

1스테이지의 전체 구조, 수치, 난이도, 플레이 흐름을 정하는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `stage1_replan_2026-05-06.md` | 최신 1스테이지 재기획 | 매우 높음 | 5분 흐름, 무기/몬스터/스폰 재밸런스 |
| `stage1_reverse_design_current_2026-05-09.md` | 현재 구현 기준 역기획 | 매우 높음 | 현재 코드 기준 실제 동작 정리 |
| `Ref_Vampire_GameDesign/게임데미지공식기획기준.txt` | 밸런스 철학 레퍼런스 | 중간 | 적 체력은 몇 방에 죽는가로 결정 |

최신 기준:

- 1스테이지는 5분 생존 구조다.
- 보스는 4분에 등장한다.
- 현재 클리어는 5분 도달 기준이다.
- 1스테이지에서는 탄환 발사 몬스터를 쓰지 않는다.
- 난이도는 탄막보다 추격, 돌진, 밀도, 스폰 위치로 만든다.
- 데미지는 절대값보다 "몇 방에 죽는가" 기준으로 본다.

---

## 4. 몬스터/스폰/웨이브

몬스터 종류, 시간대별 등장, 동시 적 수, 버스트 이벤트를 다루는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `stage1_replan_2026-05-06.md` | 최신 스폰 기준 | 매우 높음 | 0-5분 웨이브, E04 제외, B01 4분 등장 |
| `stage1_reverse_design_current_2026-05-09.md` | 현재 구현 스폰 역기획 | 매우 높음 | 현재 적 수, 버스트 이벤트, 보스 구간 |
| `Ref_Vampire_GameDesign/vampire_5minite_monster.md` | 5분 몬스터 스폰 레퍼런스 | 낮음 | 초반 먹이, 중반 압박, 후반 포위 |

현재 확정 규칙:

- E01: 초반 기본 좀비, 저속으로 적응 지원.
- E03: 빠른 추격형.
- E02: 체력형 압박.
- E05: 돌진형, 경고 후 돌진.
- E06: 후반 엘리트.
- E04: 1스테이지 제외, 2스테이지 이후 후보.
- B01: 4분 등장 보스, 1스테이지에서는 탄환보다 접근/돌진 압박.

---

## 5. 무기/업그레이드/해금

무기 종류, 레벨업 카드, 신규 무기, 해금 조건을 다루는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `stage1_replan_2026-05-06.md` | 최신 무기 기본 기준 | 매우 높음 | 7종 무기 Lv.1/Lv.5 수치, 해금 레벨 |
| `stage1_reverse_design_current_2026-05-09.md` | 현재 구현 무기 역기획 | 매우 높음 | 현재 무기 수치, 카드 구조, Lv.5 제한 |
| `Weapons/weapon_upgrade_flow_and_unlock_plan_2026-05-14.md` | 무기 업그레이드 흐름/해금 정리 | 매우 높음 | 현재 구현 무기, 5분 업그레이드 흐름, 미구현 무기 해금 |
| `Weapons/weapon_expansion_unlock_plan_2026-05-10.md` | 신규 무기 10종/누적 해금 | 높음 | 장기 해금 구조와 추가 무기 |
| `Weapons/Vampire_5minute_Firearms.md` | 무기 역할 레퍼런스 | 낮음 | 강함은 데미지 구조로 결정 |
| `Weapons/뱀파이어 서바이버 무기해금 조건 자료.txt` | 해금 조건 레퍼런스 | 낮음 | 업적/누적 기록 기반 해금 |

현재 기준:

- 시작 무기: `pencilThrow`.
- 최대 보유 무기: 4개.
- 무기 레벨 상한: Lv.5.
- 레벨업 선택지: 3개.
- 신규 무기는 무기 슬롯이 남아 있고 조건을 만족할 때만 카드에 등장.
- 진화 시스템은 1차 필수 구현이 아니라 2차 이후 후보.

신규 무기 10종:

- `compassBlade`
- `umbrellaGuard`
- `eraserBomb`
- `notebookBoomerang`
- `chalkLine`
- `deskPush`
- `lockerDoor`
- `cleaningMop`
- `broadcastSpeaker`
- `fireExtinguisher`

추천 구현 순서:

1. 초급 3종: `compassBlade`, `umbrellaGuard`, `eraserBomb`
2. 중급 4종: `notebookBoomerang`, `chalkLine`, `deskPush`, `lockerDoor`
3. 후반 3종: `cleaningMop`, `broadcastSpeaker`, `fireExtinguisher`

---

## 6. 보상/드랍/성장 재화

XP, 골드, 장기 성장, 결과 보상을 다루는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `dual_drop_system_2026-05-08.md` | XP/골드 이원화 최신 기준 | 매우 높음 | 도라야키 XP, 황금 코인 분리 |
| `stage1_reverse_design_current_2026-05-09.md` | 현재 구현 보상 역기획 | 높음 | 30% XP 드랍, 시간 기반 코인 |
| `commuter_target_planning_2026-05-14.md` | 출근길 보상 방향 | 높음 | 중단되어도 보상 남기기 |
| `stage1_replan_2026-05-06.md` | 기존 골드/패시브 구상 | 중간 | 5분 클리어 골드, 패시브 2차 |
| `Ref_Vampire_GameDesign/Vampire_5minute_levelup.md` | 레벨업 횟수 레퍼런스 | 낮음 | 5분 약 20회 레벨업 |
| `Ref_Vampire_GameDesign/vampire_survivors_formula_reference.md` | XP/성장 공식 참고 | 낮음 | XP, Growth, Curse 개념 |

현재 기준:

- 도라야키: 이번 판 안에서 레벨업하는 XP 재화.
- 황금 코인: 다음 판에도 남는 장기 보상 재화.
- 일반 적 사망 시 도라야키 30% 드랍.
- 황금 코인은 25-35초마다 시간 기반으로 약 10개/5분.
- E06과 B01은 보너스 드랍 후보.

출근길 타깃 추가 권장:

- 1분 생존 보너스.
- 3분 생존 보너스.
- 4분 보스 조우 보너스.
- 5분 클리어 보너스.
- 사망해도 획득 코인은 보존.

주의:

- 실제 구현 전 `코인 1개 = 골드 1`인지, 별도 환산 단위인지 정해야 한다.

---

## 7. 타이틀/랜딩/UX

첫 화면, 메뉴, 카피, 출근길 UX를 다루는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `title_landing_screen_plan_2026-05-10.md` | 타이틀 화면 기획 | 높음 | `좀비락교 탈출`, 시작 화면 구조 |
| `commuter_target_planning_2026-05-14.md` | 출근길 UX 기획 | 높음 | 중단/재개, 짧은 결과창, 무음 대응 |
| `stage1_reverse_design_current_2026-05-09.md` | HUD/피드백 현재 기준 | 중간 | 시간, 레벨, 골드, HP/XP, 카드 |

현재 추천:

- 타이틀 전면 문구: `좀비락교 탈출`.
- 보조 문구: `5분만 버티면, 교문이 열린다`.
- 첫 화면은 마케팅 페이지보다 실제 게임 시작 화면에 가깝게 만든다.
- 결과창은 짧게 만든다.

결과창 필수 정보:

- 생존 시간.
- 획득 황금 코인.
- 누적 황금 코인.
- 새 해금 또는 해금 진행도.
- 다시하기 버튼.

---

## 8. 그래픽/VFX/기술 기획

전투 이펙트, 시각 피드백, 기술 구조를 다루는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `Tech_plan/effect_implementation_technical_plan_2026-05-10.md` | 이펙트 기술기획 기준본 | 높음 | VFXLayer, 이벤트 큐, 색상 규칙 |
| `Tech_plan/effect_sloution.md` | 아이템-효과 매핑 구조 | 높음 | `itemEffects.js`, `triggerItemVfx`, 외곽선 구조 |

현재 기준:

- 이펙트는 장식보다 게임 정보 전달이 우선이다.
- 플레이어 공격, 적 위험, XP/골드는 색상과 형태가 구분되어야 한다.
- 돌진 경고선은 1스테이지 핵심 위험 신호다.
- VFX는 `VFXLayer`와 이벤트 큐 중심으로 관리하는 방향이 좋다.
- `itemEffects.js`를 아이템과 효과의 단일 매핑 기준으로 둔다.

---

## 9. 문서 리뷰/서브에이전트 운용

기획안 평가 방식과 서브에이전트 사용 기준을 다루는 분야다.

| 문서 | 성격 | 우선도 | 핵심 내용 |
|---|---|---:|---|
| `subagent_planner.md` | 기획 평가용 서브에이전트 운용안 | 높음 | develop-director, game-developer, reviewer 중심 |

추천 조합:

- 전체 기획 평가: `develop-director`, `game-developer`, `reviewer`
- 게임성/밸런스 평가: `game-developer`, `reviewer`
- 코드 영향 범위 확인: `code-mapper`
- 타이틀/VFX/HUD 평가: `graphic_designer`, `ui-designer`

현재 운용 원칙:

- 서브에이전트는 필요할 때만 쓴다.
- 최종 판단은 Codex 본체가 문서 근거를 모아 정리한다.
- 그래픽 관련 결론은 필요하면 `Graphic_designer/`에도 기록한다.
- QA 관련 결론은 필요하면 `Quaility_Assurance/`에도 기록한다.

---

## 10. 레퍼런스/조사 자료

직접 구현 지시가 아니라 참고 자료로 쓰는 문서들이다.

| 문서 | 분야 | 핵심 내용 |
|---|---|---|
| `Ref_Vampire_GameDesign/Top Checkup List.txt` | 체크리스트 | 1스테이지 세부기획 필요 항목 |
| `Ref_Vampire_GameDesign/1스테이지 토탈기획 시나리오.txt` | 서비스 기획 | 5분 세션형 모바일 서비스 전체 구조 |
| `Ref_Vampire_GameDesign/vampire_5minite_monster.md` | 몬스터 | 초반 먹이, 중반 압박, 후반 포위 |
| `Weapons/Vampire_5minute_Firearms.md` | 무기 | 무기 강함은 타격 구조로 결정 |
| `Ref_Vampire_GameDesign/Vampire_5minute_levelup.md` | 성장 | 5분 약 20회 레벨업 |
| `Ref_Vampire_GameDesign/vampire_survivors_formula_reference.md` | 공식 | 데미지, XP, Growth, Curse 참고 |
| `Ref_Vampire_GameDesign/게임데미지공식기획기준.txt` | 밸런스 철학 | 적 체력은 몇 방에 죽는가로 결정 |
| `Weapons/뱀파이어 서바이버 무기해금 조건 자료.txt` | 해금 | 업적/누적 기록 기반 무기 해금 |

레퍼런스 사용 원칙:

- 그대로 복사하지 않는다.
- BangBang Survivor의 학교 좀비 탈출 콘셉트에 맞게 변환한다.
- 최신 1스테이지 기준과 충돌하면 최신 기준을 따른다.
- 특히 E04 원거리 몬스터와 탄환 패턴은 1스테이지에 사용하지 않는다.

---

## 11. 파기된 문서 확인

중복되었거나 시간순에서 밀려난 기획은 파기했다.

확인 위치:

```text
Planner/planner_disposal_log_2026-05-14.md
```

이 로그에는 파기 문서명, 파기 이유, 대체 기준 문서가 정리되어 있다.

---

## 12. 분야별 빠른 사용표

| 내가 하려는 일 | 먼저 볼 문서 |
|---|---|
| 1스테이지 전체 밸런스 조정 | `stage1_replan_2026-05-06.md`, `stage1_reverse_design_current_2026-05-09.md` |
| 현재 코드와 기획 차이 확인 | `stage1_reverse_design_current_2026-05-09.md` |
| 몬스터 스폰 수정 | `stage1_replan_2026-05-06.md`, `stage1_reverse_design_current_2026-05-09.md` |
| 탄환 몬스터 여부 판단 | `stage1_replan_2026-05-06.md` 2026-05-09 부록 |
| 무기 수치 조정 | `stage1_replan_2026-05-06.md`, `stage1_reverse_design_current_2026-05-09.md`, `Weapons/weapon_upgrade_flow_and_unlock_plan_2026-05-14.md` |
| 신규 무기 추가 | `Weapons/weapon_upgrade_flow_and_unlock_plan_2026-05-14.md`, `Weapons/weapon_expansion_unlock_plan_2026-05-10.md` |
| XP/골드 드랍 수정 | `dual_drop_system_2026-05-08.md` |
| 출근길 직장인 타깃 반영 | `commuter_target_planning_2026-05-14.md` |
| 타이틀 화면 구현 | `title_landing_screen_plan_2026-05-10.md` |
| VFX 구조 수정 | `Tech_plan/effect_implementation_technical_plan_2026-05-10.md`, `Tech_plan/effect_sloution.md` |
| 서브에이전트로 기획 평가 | `subagent_planner.md` |
| 파기된 문서 확인 | `planner_disposal_log_2026-05-14.md` |

---

## 13. 추천 폴더 구조

현재는 파일 이동 없이 색인만 사용한다.

나중에 실제 정리를 한다면 아래 구조가 좋다.

```text
Planner/
  00_Index/
  01_Target_Product/
  02_Stage_Balance/
  03_Monsters_Waves/
  04_Weapons_Unlocks/
  05_Rewards_Progression/
  06_UI_Title_UX/
  07_Tech_VFX/
  08_Agent_Review_Workflow/
  09_References/
```

이동 전 확인할 것:

- 문서 안의 상대 경로 링크.
- 코드 주석이나 세션 로그의 문서 경로.
- `Bang_Rules.md`나 `SESSION_CONTINUITY.md`에서 참조하는 파일명.

---

## 14. 최종 정리

현재 Planner 문서들은 아래 큰 흐름으로 묶인다.

```text
타깃/서비스 방향
→ 1스테이지 핵심 밸런스
→ 몬스터/스폰
→ 무기/해금
→ 보상/드랍
→ 타이틀/UX
→ VFX/기술기획
→ 서브에이전트 리뷰 체계
→ 레퍼런스
```

현재 가장 중요한 결론:

**BangBang Survivor는 5분 동안 자동 공격 무기를 성장시키며, 탄환이 아니라 추격/돌진/밀도 압박을 버티는 카툰풍 학교 좀비 생존 게임이다. 1차 완성 기준은 콘텐츠 양보다, 출근길에 중단되어도 아깝지 않은 5분 경험이다.**
