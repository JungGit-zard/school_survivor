# 커터칼 기본 능력치 1.5배 상향 구현

## 변경 내용

- `WEAPON_CATALOG.boxCutter.base.damage`를 16에서 24로 변경했다.
- `WEAPON_CATALOG.boxCutter.base.range`를 0.85에서 1.275로 변경했다.
- 커터칼 공격 판정과 시각 효과 fallback 사거리도 1.275로 맞췄다.
- `boxCutterRange` 업그레이드 상한을 1.17에서 1.755로 변경했다.

## 유지한 값

- 쿨타임: 1100ms 유지
- 공격 폭: 0.22 유지
- 공격 모션 시간: 240ms 유지
- 넉백: 1.8 유지
