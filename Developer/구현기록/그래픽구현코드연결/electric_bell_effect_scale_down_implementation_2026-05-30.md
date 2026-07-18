# Electric Spark and Bell Effect Scale Down Implementation - 2026-05-30

## Files

- `Developer/r3f_prototype/src/lib/effectVisualScale.js`
- `Developer/r3f_prototype/src/lib/effectVisualScale.test.js`
- `Developer/r3f_prototype/src/components/Weapons/Bell.jsx`
- `Developer/r3f_prototype/src/components/Weapons/StunGun.jsx`

## Implementation

- 공통 상수 `REDUCED_EFFECT_VISUAL_SCALE = 1 / 2`를 추가했다.
- 벨 음파의 렌더링 스케일에 `scaleEffectVisual(...)`을 적용했다.
- 전기스파크 번개 모델의 기본 스케일을 2분의 1로 줄였다.
- 전기 체인 스파크의 두께와 지그재그 흔들림 폭을 2분의 1로 줄였다.
- 전기 체인의 실제 연결 길이는 유지해 타격 피드백이 끊겨 보이지 않게 했다.

## Gameplay Impact

피해량, 쿨다운, 사거리, 체인 탐색 범위, 벨 피해 반경은 변경하지 않았다.
