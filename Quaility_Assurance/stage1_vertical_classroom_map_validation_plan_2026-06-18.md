# Stage 1 세로형 교실 맵 검수 계획

작성일: 2026-06-18

## 검수 결론

Stage 1은 현재 코드상 이미 `68 x 108 units`의 세로형 맵이다. 그러나 기획 문서에는 세로형 정본 수치가 명확히 선언되어 있지 않고, 일부 과거 문서에는 5분/300초 기준이 남아 있다.

검수상 가장 큰 위험은 다음 두 가지다.

- 화면에서는 긴 교실이 아니라 중앙 주변 소품이 있는 넓은 바닥처럼 보일 수 있다.
- 세로로 계속 도망가는 플레이가 쉬워져, Stage 1의 핵심인 적 처치, XP 수집, 레벨업 성장이 느슨해질 수 있다.

## 검수한 문서/영역

- `project_develop_policy.md`
- `Planner/B. GAME_DESIGN/Stage_balance_summary.md`
- `Planner/current_game_rules.md`
- `Planner/B. GAME_DESIGN/B-2_Stage_process_difficulty/Stage1_Balance/stage1_reverse_design_current_2026-05-09.md`
- `Planner/B. GAME_DESIGN/B-2_Stage_process_difficulty/Stage1_Balance/stage1_replan_2026-05-06.md`
- `Planner/B. GAME_DESIGN/B-2_Stage_process_difficulty/Stage1_Balance/stage1_classroom_desk_disrupted_layout_2026-06-07.md`
- `Planner/stage1_classroom_prop_mixed_layout_2026-06-09.md`
- `Planner/stage1_unconscious_student_density_2026-06-11.md`
- `Graphic_designer/Concept_Rules/stage_graphic_cons.md`
- Stage 1 관련 코드: stage config, floor, camera, player clamp, enemy spawn, stage object placements/colliders

## 문서 정합성 이슈

- 현재 정본은 4분/240초지만, 과거 Stage 1 문서에는 5분/300초 수치가 남아 있다.
- `Stage_balance_summary.md`와 현재 코드가 우선 정본이다.
- 일부 문서는 책상/프롭을 "시각 오브젝트"로 설명하지만, 현재 책상/의자는 실제 blocking collider다.
- 학생 밀도는 과거 2명 문서와 이후 10명 문서가 함께 존재한다. 현재 코드 정본은 10명이다.
- "외곽 배치"라는 표현은 현재 `z = ±54` 맵 기준으로 모호하다. 앞으로는 외곽 좌표를 수치로 명시해야 한다.

## 자동 테스트 체크리스트

- Stage 1 bounds가 `mapHalfX = 34`, `mapHalfZ = 54`인지 확인.
- Stage 2 bounds가 기존 기준을 유지하는지 확인.
- 모든 Stage 1 오브젝트가 맵 경계 안에 있는지 확인.
- 중앙 `|x| < 12 && |z| < 12`에 큰 오브젝트가 없는지 확인.
- 책상/의자는 blocking collider, 쓰러진 학생은 non-blocking인지 확인.
- 바닥 시각 크기가 Stage 1 bounds와 카메라 여유를 덮는지 확인.
- 경계 근처 적 스폰이 맵 밖으로 나가지 않고 플레이어에게 너무 붙지 않는지 확인.

## 브라우저 QA 체크리스트

해상도:

- 모바일 `375 x 812`
- 모바일 `390 x 844`
- 데스크톱 기준 화면 1개

위치:

- 시작 지점 `x = 0`, `z = 0`
- 상단 끝 근처 `z = +50`
- 하단 끝 근처 `z = -50`
- 좌측 끝 근처 `x = -32`
- 우측 끝 근처 `x = +32`
- 네 모서리 근처

시간대:

- `0~30초`: 이동/자동공격/XP 수집 학습
- `48초`: 첫 성장 체크
- `144초`: 중반 압박 체크
- `192초`: 보스/위험 구간 진입 체크
- `224~240초`: 최종 압박과 클리어 직전 체크

## 통과 기준

- 첫 화면과 이동 중 화면에서 Stage 1이 교실로 읽힌다.
- 세로형 구조가 느껴지지만, 긴 빈 바닥처럼 보이지 않는다.
- 플레이어, 적, XP, 골드, 회복 아이템, 돌진 경고가 소품에 묻히지 않는다.
- 세로로 계속 달리는 전략만으로 생존과 성장이 쉬워지지 않는다.
- 책상/의자 충돌이 납득 가능하고, 플레이어/좀비 끼임이 없다.
- 맵 끝과 모서리에서 카메라가 플레이어를 부자연스럽게 밀어내거나 빈 배경을 보여주지 않는다.

## 실패 시 조정 순서

1. 오브젝트 대비와 배치 밀도를 먼저 조정한다.
2. 쓰러진 학생은 외곽으로 밀거나 명도를 낮춘다.
3. XP/골드 회수가 느슨하면 드랍 회수 거리나 적 재배치 정책을 검토한다.
4. 도망 플레이가 너무 강하면 앞쪽/측면 스폰 비중 또는 먼 적 정리/재배치 정책을 검토한다.
5. 그래도 세로 교실감이 약하면 마지막으로 `mapHalfZ = 60` 후보를 검토한다.
