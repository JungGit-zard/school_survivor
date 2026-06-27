# Explosive Scatter Variants Visual Direction - 2026-06-27

## Visual Goal

- 폭발성 막타에서 좀비 파편이 매번 같은 방식으로 흩어져 보이지 않게 한다.
- 카툰 렌더링과 외곽선 기반 조각 연출은 유지한다.

## Variants

- `burst`: 기존 방사형 폭발 느낌 유지.
- `spiral`: 조각이 약간 회전 흐름을 타며 퍼지는 느낌.
- `wave`: 조각별 지연과 방향 차이로 파동처럼 밀려나는 느낌.

## Constraints

- 조각 수와 모델 구조는 바꾸지 않는다.
- `scatter` 조각 크기 0.5배 정책은 유지한다.
- 한 번의 사망 연출 안에서는 하나의 변형만 사용해 시각 리듬이 흐트러지지 않게 한다.
