# Stage 4 바닥 타일 1/4 면적 적용

- Kanban: `escape-zombie-school` / `t_f846db84` / `threemini`
- 화면 기준: 기존 타일 한 칸의 가로·세로를 각각 1/2로 하여 보이는 면적을 정확히 1/4로 변경했다.
- Stage 4 repeat: `12 -> 24` (frequency `x2`, linear scale `0.5`, area scale `0.25`).
- 바닥 전체 크기, 카메라, 캐릭터, 장애물, Stage 1~3 타일 값은 변경하지 않았다.

## 최적화 불변식

- 기존 단일 `FloorPlane` 메시와 단일 `MeshLambertMaterial` 경로를 유지한다.
- `tile_stage04_cafeteria.webp`는 R3F loader cache의 단일 원본을 UV repeat로만 복제 표시한다.
- 타일별 메시, instancing, geometry/material/texture 복제는 추가하지 않았다. 따라서 타일 수 증가에 따라 draw call, geometry 수, material 수, texture memory가 증가하지 않는다.

## 검증

- RED: 새 기대값을 먼저 추가한 뒤 `STAGE4_TILE_LINEAR_SCALE`이 없어 focused test가 실패함을 확인했다.
- GREEN: `npm test -- --run src/components/ClassroomFloor.test.jsx` 통과 (8/8).
