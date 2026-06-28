# threemini 지우개 폭탄 그래픽 절반 축소 핸드오프

## 호출 배경

- 사용자 지시: `지우개 폭탄의 그래픽 크기를 절반으로 줄여, 쓰리미니 불러`
- 역할: `threemini` 관점의 Three.js/R3F VFX 읽기 전용 검토.

## threemini 검토 요약

- 최소 변경 지점은 `EraserBomb.jsx`의 모델 스케일과 폭발 먼지 시각 스케일이다.
- 기존 공용 유틸 `scaleEffectVisual`을 재사용하는 방향이 적합하다.
- 판정/밸런스 영역인 `applyRadialDamage`, `weaponCatalog.js`의 데미지/반경/쿨다운은 건드리지 않는다.
- 현재 diff에는 그래픽 축소와 별개로 투척 궤적/착지점 변경이 섞여 있으므로 커밋/리뷰 때 구분해야 한다.

## 반영

- `ERASER_MODEL_VISUAL_SCALE = scaleEffectVisual(0.8)`
- `getEraserExplosionVisualScale(radius, progress) = scaleEffectVisual(0.3 + radius * 2 * progress)`
- 테스트: `EraserBomb.test.jsx`
