# 자력 초기 발현 반경 조정 기록 - 2026-05-25

## 요청

자력 파워업 효과나 비용 구조는 수정하지 않고, 초기 상태에서 발현되는 자력의 정도만 기존의 절반으로 줄인다.

## 구현

- `Developer/r3f_prototype/src/lib/pickup.js`
  - `BASE_PULL_RADIUS`를 `1.5`에서 `0.75`로 변경했다.
  - `setMagnetMultiplier(mult)` 구조는 유지했다.
  - 따라서 자력 파워업은 기존처럼 `BASE_PULL_RADIUS * multiplier` 방식으로 적용된다.

## 유지한 사항

- 자력 파워업 레벨당 배율은 변경하지 않았다.
- 자력 파워업 비용은 변경하지 않았다.
- 아이템 직접 수집 반경 `COLLECT_RADIUS_SQ = 0.22 * 0.22`는 변경하지 않았다.

## 문서 반영

- `Planner/B.게임기획,밸런스 구현/B-1 캐릭터 성장,능력치 업그레이드 구조 구현/meta_progression_2x_growth_plan_2026-05-25.md`
  - 자력 초기 반경을 `0.75 units`로 정리했다.
  - 2배 성장 목표를 `1.5 units`로 정리했다.
- `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Stage1_Balance/stage1_reverse_design_current_2026-05-09.md`
  - 현재 수집/자력 기준을 `0.75 units`로 갱신했다.
