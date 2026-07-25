# Stage 4 주방 충돌체 후속 QA — 2026-07-26

## 검증 범위

- Stage 4 대형 주방 가구 8종의 충돌체 파트, 물리 충돌체 생성, 시야 장애물 생성
- `kitchenClutter`의 물리 충돌 및 E04 시야 차단 제외
- 중앙 조리대 승인 ID 4개의 배치 계약

## 계약

- 물리/시야 차단: `kitchenPrepTable`, `kitchenCookLine`, `kitchenSinkCounter`, `kitchenRefrigerator`, `kitchenTrayRack`, `kitchenShelfCart`, `kitchenTrashBins`, `kitchenCrateStack`
- 제외: `kitchenClutter`
- 중앙 허용 ID: `stage4-preptable-center-north`, `stage4-preptable-center-mid-west`, `stage4-preptable-center-mid-east`, `stage4-preptable-center-south`

## 실행 검증

- `stageObjectAssets.test.jsx`: 8종 차단 타입 등록 및 `kitchenClutter` 제외
- `stageObjectColliders.test.js`: 8종 비어 있지 않은 collider parts, Stage 4 collider/sight obstacle 생성, clutter 제외
- `stageObjectPlacements.test.js`: 중앙 승인 조리대 4개만 허용
- 프로덕션 build 실행 결과는 작업 완료 보고에 기록한다.
