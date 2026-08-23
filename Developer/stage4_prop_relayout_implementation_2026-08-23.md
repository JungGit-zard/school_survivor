# Stage 4 소품 벽 안전여백 구현 기록

## 변경

- `r3f_prototype/src/components/StageObjects/stageObjectPlacements.js`의 Stage 4 authored canonical 배치만 수정했다.
- solid 19개를 X 또는 Z 한 축으로만 이동했다. 한 개 냉장고만 북쪽과 서쪽 벽 모두에 걸려 X/Z 두 축 이동이 필요했다.
- 목표는 한 타일 `0.8` 이상이다. `0.8` 정확값은 기존 player-only pocket 규칙의 0.847 미만이라, 최종 최소 여유를 0.85로 잡았다.
- Firebase runtime override의 `withStage4CurrentWidthOverrideCoordinates` 및 저장 경로는 변경하지 않았다.

## Phase 5.1 비충돌 clutter 시각 안전

- `kitchenClutter`에는 collider를 추가하지 않았으며 계속 통과 가능 소품으로 유지했다.
- 필요한 축만 이동했다: east-trays X `7.700`, west-pots X `-7.930`, west-bags X `-7.960`, south-trays Z `14.520`.
- 정적 테스트는 `KitchenClutter.jsx` 실제 파츠의 local visual AABB에 authored 회전과 scale을 반영하여, 모든 시각 외곽이 Stage 4 벽에서 `0.8` 이상 떨어졌는지 고정한다.
- default authored 배치만 수정했으며 Firebase override 입력에는 clamp/coerce/write를 하지 않았다.

## 고정 검증

- `stage4PropLayout.static.test.js`: 전체 map 안, solid AABB 벽 여유, root AABB 비중첩, 시작점 `[0,0,7]` 비충돌.
- 기존 `stageObjectColliders.test.js`: 벽/소품 간 player-only pocket 없음.
- 기존 `stageObjectPlacements.test.js`: Stage 4의 정본 X 안전 이동 및 필요한 Z 이동을 고정한다.
