# Stage 4 주방 소품 불투명 depth pass 수정

- Kanban: `escape-zombie-school` / `t_0802748b` / `threemini`
- 정본 감사: `Quaility_Assurance/stage4_prop_transparency_abnormal_visual_audit_2026-08-22.md`
- 변경: `KitchenProps.jsx`의 모든 surface material factory를 `getStagePropDepthWritingToonMaterial`로 전환했다. 따라서 35개 주방 프랍 표면은 기존 cache/material lifecycle을 유지하면서 `depthWrite: true`를 사용한다.
- 보존: outline의 `depthWrite: false`와 투명 inverted-hull 패스, 37개 Stage 4 배치 경로(주방 35 + 학생 2), Studio/placement/Firebase/바닥/가마솥/Stage 1~3/타이틀/오디오.
- 검증: RED는 기존 factory 및 35개 surface 기대에서 실패했다. GREEN은 `npm test -- --run src/components/StageObjects/stageObjectAssets.test.jsx -t "keeps all 35 Stage 4 kitchen surfaces"` 통과(1 passed), `git diff --check` 통과.
