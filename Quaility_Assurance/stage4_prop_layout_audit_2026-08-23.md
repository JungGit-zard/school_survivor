# Stage 4 소품 배치 QA 기록

## 최종 비충돌 clutter 시각 검증

- non-solid `kitchenClutter` visual-AABB invariant를 별도로 추가했고 collider는 추가하지 않았다.
- pots/bags/trays의 실제 source part bounds에 authored rotation과 scale을 반영해 `0.8` 벽 여백을 확인했다.
- focused 검증 결과: `24 passed | 30 skipped` (placement, collider, Stage 4 static layout).
- `git diff --check`: PASS.

- 정적 안전 기준: `Developer/r3f_prototype/src/components/StageObjects/stage4PropLayout.static.test.js`
- 최종 결과: 맵 좌표 초과 0개, 모든 solid collider AABB 벽 여유 `>= 0.8`(실제 최소 `0.85`), root AABB 중첩 0개, 시작점 `[0,0,7]` 비충돌.
- 기존 `stageObjectColliders.test.js`의 벽·인접 소품 player-only pocket 검사도 PASS.
- 세부 위치·footprint·최소 이동안: `Graphic_designer/stage4_prop_layout_audit_2026-08-23.md`
- Firebase override와 적/HUD/업그레이드 코드는 변경하지 않았다.
