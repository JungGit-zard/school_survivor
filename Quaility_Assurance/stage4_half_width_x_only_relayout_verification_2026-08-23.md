# Stage 4 가로 절반 검증 기록

- 사전 감사: `stage4_half_width_x_only_placement_bounds_preaudit_2026-08-23.md`
- 검증 대상: Stage 4 경계, 바닥 18×40, authored X 0.5배, override 1회 해석, 소품 collider/시야, B04 Soup Blast.
- 초기 X 0.5배 축소 RED에서 벽-소품 pocket 7곳, 인접 소품 pocket 2쌍, `stage4-sink-west-mid` 서쪽 경계 초과 약 0.21이 검출됐다.
- 소품 X 9개만 최소 조정한 후 Stage 4 blocking collider 전수 경계 이탈 0, collider 겹침 0, 벽 pocket 0, 인접 pocket 0을 복원했다. Y/Z/rotation/scale/props/blocking은 변경하지 않았다.
- GREEN: `stageConfig.test.js` + `ClassroomFloor.test.jsx` + `b04SoupBlast.test.js` 27/27 통과.
- GREEN: `stageObjectPlacements.test.js -t "stage 4 cafeteria kitchen placements"` 14/14 통과.
- GREEN: `stageObjectColliders.test.js` 14/14 통과.
