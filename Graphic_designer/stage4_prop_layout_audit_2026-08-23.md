# Stage 4 소품 최종 배치 정본

작성일: 2026-08-23
범위: Stage 4 기본 authored 배치 중 벽 안전 여백 때문에 X/Z를 조정한 소품 23개.

## 안전 기준

- Stage 4 bounds: X `[-9.36, 9.36]`, Z `[-16.00, 16.00]`.
- solid 19개는 회전과 scale을 반영한 collider AABB 전체가 모든 벽에서 `0.8` units 이상 떨어진다. player-only pocket을 피하기 위해 실제 최소 여백은 `0.850`이다.
- collider가 없는 `kitchenClutter` 4개는 실제 `KitchenClutter.jsx` 파츠의 visual AABB 전체가 모든 벽에서 `0.8` units 이상 떨어진다.
- 아래 표의 좌표는 `[X, Z]`이며, 표에 없는 Y·rotation·scale·type·props·개수는 변경하지 않았다.

## 최종 좌표

### Solid furniture (19)

| ID | 변경 축 | 최종 X, Z |
| --- | --- | ---: |
| cookline-north-center | Z | `-0.390, -14.500` |
| refrigerator-north-west-closed | X, Z | `-7.807, -14.579` |
| refrigerator-north-west-open | Z | `-6.196, -14.562` |
| crates-north-west-corner | X | `-8.059, -11.600` |
| shelfcart-east-north | X | `8.157, -10.400` |
| shelfcart-east-upper | X | `8.190, -7.200` |
| preptable-east-side-counter | X | `7.858, -4.000` |
| trash-east-wheelie | X | `8.096, -0.800` |
| trayrack-east-mid | X | `8.008, 2.600` |
| crates-east-mid | X | `8.060, 5.800` |
| preptable-east-south-counter | X | `7.828, 11.600` |
| shelfcart-west-north | X | `-8.140, -8.800` |
| trash-west-wheelie | X | `-8.109, -3.200` |
| sink-west-mid | X | `-7.919, 1.000` |
| trash-west-round | X | `-8.097, 4.800` |
| shelfcart-west-south | X | `-8.135, 10.600` |
| crates-south-west-corner | X | `-8.050, 13.200` |
| preptable-south-serving-left | Z | `-2.180, 14.496` |
| preptable-south-serving-right | Z | `1.170, 14.473` |

### Passable kitchen clutter (4)

| ID | 변경 축 | 최종 X, Z | visual local extent |
| --- | --- | ---: | --- |
| clutter-east-trays | X | `7.700, 8.800` | X `[-0.86, 0.80]`, Z `[-0.36, 0.36]` |
| clutter-west-pots | X | `-7.930, -5.600` | X `[-0.50, 0.47]`, Z `[-0.41, 0.20]` |
| clutter-west-bags | X | `-7.960, 7.400` | X `[-0.55, 0.545]`, Z `[-0.25, 0.25]` |
| clutter-south-trays | Z | `3.770, 14.520` | X `[-0.86, 0.80]`, Z `[-0.36, 0.36]` |

## 고정 불변사항과 검증

- pressure cauldron은 `[0, 0, 0]` 하나만 유지한다.
- player start `[0, 0, 7]`은 모든 solid footprint와 비충돌이다.
- solid root footprint끼리 겹치지 않으며, 벽·인접 소품 사이 player-only pocket이 없다.
- Firebase override 입력을 clamp, coerce, write하지 않았으며 canonical authored 기본 배치만 바꿨다.
- `stage4PropLayout.static.test.js`, `stageObjectPlacements.test.js`, `stageObjectColliders.test.js` focused 실행 결과: `24 passed | 30 skipped`.
