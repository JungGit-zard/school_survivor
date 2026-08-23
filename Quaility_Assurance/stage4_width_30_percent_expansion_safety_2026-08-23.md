# Stage 4 가로폭 30% 확장 안전 배치

## 정본

- 맵: `halfX=9.36`, `halfZ=16` (`18.72 × 32`).
- 바닥: 타일 월드 크기 `0.8`, 반복 `23.4 × 40`.
- 시작점 `[0, 0, 7]`, 압력 가마솥 중심 X `0`, 모든 배치의 Y/Z·회전·스케일·props·개수·타입은 변경하지 않는다.
- 아래 X는 직전 좌표의 30% 확장을 시작점으로 삼고, 플레이어 전용 틈을 없애는 최소 안전 보정까지 반영한 최종값이다.

## 최종 X 맵

```text
stage4-cookline-north-center=-0.39
stage4-refrigerator-north-west-closed=-8.46
stage4-refrigerator-north-west-open=-6.196
stage4-crates-north-west-corner=-8.685
stage4-clutter-north-cookline-spill=2.34
stage4-sink-north-east=4.81
stage4-crates-north-east-corner=7.02
stage4-trayrack-north-east-inner=5.98
stage4-shelfcart-east-north=8.807
stage4-shelfcart-east-upper=8.84
stage4-preptable-east-side-counter=8.508
stage4-trash-east-wheelie=8.71
stage4-trayrack-east-mid=8.658
stage4-crates-east-mid=8.685
stage4-clutter-east-trays=7.93
stage4-preptable-east-south-counter=8.56
stage4-shelfcart-west-north=-8.79
stage4-clutter-west-pots=-8.58
stage4-trash-west-wheelie=-8.71
stage4-sink-west-mid=-8.5475
stage4-trash-west-round=-8.747
stage4-clutter-west-bags=-8.06
stage4-shelfcart-west-south=-8.785
stage4-crates-south-west-corner=-8.685
stage4-preptable-south-serving-left=-2.18
stage4-preptable-south-serving-right=1.17
stage4-crates-south-west-stack=-7.02
stage4-crates-south-center-stack=-4.68
stage4-clutter-south-trays=3.77
stage4-trash-south-round=5.33
stage4-trayrack-south-east=7.54
stage4-pressure-cauldron-center=0
stage4-student-serving-south=2.73
stage4-student-kitchen-northeast=5.915
```

## 안전 보정 ID

벽/이웃 틈 검사에서 걸린 16개만 X를 보정했다: `stage4-refrigerator-north-west-closed`, `stage4-refrigerator-north-west-open`, `stage4-crates-north-west-corner`, `stage4-shelfcart-east-north`, `stage4-shelfcart-east-upper`, `stage4-preptable-east-side-counter`, `stage4-trash-east-wheelie`, `stage4-trayrack-east-mid`, `stage4-crates-east-mid`, `stage4-preptable-east-south-counter`, `stage4-shelfcart-west-north`, `stage4-trash-west-wheelie`, `stage4-trash-west-round`, `stage4-shelfcart-west-south`, `stage4-crates-south-west-corner`, `stage4-preptable-south-serving-left`.

Firebase 원격 배열은 변경하거나 다시 저장하지 않는다. 배열 안에 `|x| > 9.36` 좌표가 있으면 기존 전폭(`halfX=14.4`) 좌표 세트로 해석해 런타임 메모리에서만 X에 `0.65`를 곱한다. 전부 현재 경계 안이면 사용자 좌표를 그대로 사용한다.
