---
title: Graphics Studio Stage 2 boss v2 part focus contract
date: 2026-07-17
category: docs/solutions/ui-bugs
module: Graphics Studio enemy part focusing
problem_type: ui_contract
component: tooling
severity: high
tags: [graphics-studio, stage2-boss, v2, part-focus, outline]
---

# Graphics Studio Stage 2 보스 v2 파트 포커스 계약

## 정본 규칙

- 현재 v2의 사람이 읽을 수 있는 semantic part ID만 선택 대상으로 사용한다.
- 실제로 편집할 수 있는 최소 가시 파트에만 part ID를 부여한다.
- 애니메이션 pivot, 렌더 외곽선, focus helper, decal, shadow는 선택 대상에서 제외한다.
- focus helper는 raycast를 받지 않아야 한다.
- 파트 하나의 transform과 material 변경은 다른 파트로 번지지 않아야 한다.
- 과거 보스 전용 focus 경로나 texture 편집 예외를 복구하지 않는다.

## 회귀 검증

1. 모든 편집 파트를 순서대로 선택할 수 있다.
2. 같은 파트를 반복 선택해도 focus outline이 중복되지 않는다.
3. focus 상태에서 다른 파트를 바로 선택할 수 있다.
4. 좌우 파트가 서로 독립적으로 변경된다.
5. Apply와 Reset을 반복해도 transform drift가 없다.
6. v2 이외의 Stage 2 보스 focus 경로가 존재하지 않는다.

## 관련 정책

- `docs/solutions/integration-issues/stage2-boss-v2-no-legacy-gate.md`
- `Planner/stage2_boss_complete_rebuild_plan_2026-07-17.md`
