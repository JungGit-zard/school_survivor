# 지우개 폭탄 그래픽 절반 축소 구현 기록

## 변경 요약

- `EraserBomb.jsx`에 `scaleEffectVisual`을 적용했다.
- `ERASER_MODEL_VISUAL_SCALE`을 `scaleEffectVisual(0.8)`로 정의해 모델 스케일을 `0.8`에서 `0.4`로 줄였다.
- `getEraserExplosionVisualScale(radius, progress)`를 추가해 기존 폭발 먼지 스케일 공식 `0.3 + radius * 2 * progress`의 결과만 절반으로 줄였다.
- `applyRadialDamage`와 무기 카탈로그의 데미지/반경 값은 변경하지 않았다.

## 쓰리미니 검토 반영

- `threemini` 역할의 읽기 전용 검토 결과, 현재 접근은 최소 변경으로 적합하다는 의견을 받았다.
- 유지할 시각 요소: 오프화이트 본체, 파란 띠, 닳은 끝부분, toon 재질, 두꺼운 외곽선, 먼지 색/투명도/페이드.
- 주의점: 파일 diff에 이미 존재하던 투척 궤적/착지점 변경은 이번 그래픽 축소와 별도 이슈로 보아야 한다.

## 수정 파일

- `Developer/r3f_prototype/src/components/Weapons/EraserBomb.jsx`
- `Developer/r3f_prototype/src/components/Weapons/EraserBomb.test.jsx`
