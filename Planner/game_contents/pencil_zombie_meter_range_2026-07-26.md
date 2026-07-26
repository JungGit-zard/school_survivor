# 연필 Zombie Meter 발사 범위 결정 (2026-07-26)

## 결정

- E01 지면 collider footprint 약 0.7467을 반올림해 `1zm = 0.75 world units`로 고정한다.
- 연필 기본 발사 원은 지름 6zm, 반지름 3zm, 즉 2.25 world units다.
- 과거 연필 기본 range `22`는 이 결정으로 대체한다.

## 발사 eligibility

- player center에서 enemy center까지의 거리가 `<= 2.25`면 기본 발사 후보에 포함한다.
- `2.25 + epsilon`은 후보가 아니다.
- 기존 LOS/벽/장애물 차단 규칙은 유지한다.
- 원 그래픽이나 별도 시각 반경 표시는 추가하지 않는다.

## base/buff 정책

- Catalog의 Base Range는 2.25 world units다.
- runtime weapon state의 명시적 `w.range`가 있으면 Base Range보다 우선한다. 따라서 Chibiko 같은 명시적 range buff는 3zm base에 적용될 수 있다.
- 연필 자체에는 현재 range upgrade가 없다.
- Zombie Meter는 모델·Graphics Studio scale 변경으로 자동 보정하거나 재계산하지 않는다.

## 비범위

Projectile homing, speed, 3.5초 수명, pierce sweep, damage, cooldown과 Firebase/Graphics Studio 데이터는 이번 결정의 대상이 아니다.
