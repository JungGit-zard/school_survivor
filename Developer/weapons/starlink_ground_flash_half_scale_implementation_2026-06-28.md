# 스타링크 바닥 원형 효과 절반 축소 구현 기록

## 변경 요약

- `Starlink.jsx`의 `StrikeVisual`에서 바닥 원형 플래시와 링 지오메트리 반지름을 `scaleEffectVisual()`로 감쌌다.
- 기존 `REDUCED_EFFECT_VISUAL_SCALE` 값이 `1 / 2`이므로 원형 효과만 절반 크기로 렌더링된다.
- 색상, 투명도, renderOrder, 링 개수, `flashScale` 애니메이션 방식은 유지했다.
- `applyRadialDamage`에 전달되는 실제 피해 반경은 변경하지 않았다.

## 수정 파일

- `Developer/r3f_prototype/src/components/Weapons/Starlink.jsx`
- `Developer/r3f_prototype/src/components/Weapons/Starlink.test.jsx`
