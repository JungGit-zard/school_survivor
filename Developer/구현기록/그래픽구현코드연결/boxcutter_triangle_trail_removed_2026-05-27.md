# 커터칼 삼각 잔상 제거 구현

## 변경 내용

- `Developer/r3f_prototype/src/components/Weapons/BoxCutter.jsx`에서 `CutterTrail` 컴포넌트를 제거했다.
- 커터칼 공격 중 `<CutterTrail />` 렌더링 호출을 제거했다.
- 공격 판정, 피해, 사거리, 쿨타임, 모션 로직은 변경하지 않았다.

## 영향

- 커터칼 공격 시 삼각형 `shapeGeometry` 잔상이 더 이상 표시되지 않는다.
- 커터칼 본체 모델은 기존처럼 공격 방향으로 움직인다.
