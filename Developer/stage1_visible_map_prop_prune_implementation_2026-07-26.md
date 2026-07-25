# Stage 1 visible map and prop prune implementation

- `ClassroomFloor`의 Stage 1 plane은 `getStageBounds('stage1')`에서 20 × 28.8 units로 계산한다. Stage 2/4의 기존 200 × 200 textured floor와 Stage 3 동작은 유지한다.
- `stageObjectPlacements` authored Stage 1 배열에서 envelope 밖 29개를 실제 삭제했다.
- `getStageObjectPlacements('stage1')`는 Firebase Studio runtime override에도 같은 envelope 필터를 적용한다. Firebase runtime state만 소비하며 원격 Firebase 쓰기나 브라우저 저장소는 사용하지 않는다.
- 테스트는 floor 치수·타일 밀도·31개 type count와 in-memory Firebase runtime override 보존/제외를 검증한다.
