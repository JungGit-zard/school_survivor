# Stage 4 바닥 타일 exact square-world WebP 적용

- Kanban: `escape-zombie-school` / `t_f846db84`, `t_3b4d3c08`, `t_f8aa2c93` / `threemini`
- 화면 기준: Stage 4 바닥만 흰 세라믹 단일 타일 WebP 소스를 사용한다.
- 정본 소스: `Developer/r3f_prototype/src/assets/background_floor/tile_stage04_white_ceramic.webp` (`1254 × 1254`, RGB, `780,700` bytes).
- 기존 프로젝트 PNG 소스는 WebP 메타데이터/시각 확인 뒤 제거되었으며, 런타임 import는 WebP만 사용한다.

## 정확한 사각 타일 월드 매핑

- Stage 4 전투 경계: `28.8 × 32` world units.
- 목표 타일 월드 크기: `28.8 / 24 = 1.2` world units.
- X 반복: `repeatX = 24`.
- Z 반복: `repeatZ = 32 / 1.2 = 26.6666666667`.
- 기존 exact-bounds base `2.4` 대비 linear scale `0.5`, area scale `0.25`를 유지한다.
- 같은 repeat 값을 X/Z에 강제로 쓰지 않고 축별로 계산해, 직사각형 Stage 4 바닥에서도 흰 타일이 월드 기준 정사각형으로 보인다.

## 최적화 불변식

- 단일 `FloorPlane` 메시와 단일 `MeshLambertMaterial` 경로를 유지한다.
- `tile_stage04_white_ceramic.webp`는 R3F loader cache의 단일 원본을 UV repeat로만 복제 표시한다.
- 타일별 메시, instancing, geometry/material/texture 복제는 추가하지 않았다.
- props, cauldron, 다른 스테이지, Firebase, Studio, Title, audio는 변경하지 않았다.

## 검증

- PRE 확인: PNG `1254 × 1254`, RGB, `1,142,849` bytes / WebP `1254 × 1254`, RGB, `780,700` bytes.
- 최종 확인: 프로젝트 asset tree에는 WebP만 남았고 WebP 메타데이터는 `1254 × 1254`, RGB, `780,700` bytes로 유지된다.
- Focused test: `npm test -- --run src/components/ClassroomFloor.test.jsx` 통과 (9/9).
