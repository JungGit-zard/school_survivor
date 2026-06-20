# Stage 2 Corridor Floor Implementation - 2026-06-20

## 구현 범위

Stage 2 전용 복도 바닥 텍스처와 상단 끝 배경을 `ClassroomFloor`에 적용했다.

변경 파일:

```text
Developer/r3f_prototype/src/components/ClassroomFloor.jsx
Developer/r3f_prototype/src/components/ClassroomFloor.test.jsx
Developer/r3f_prototype/src/assets/background_floor/tile_stage02_corridor.png
Developer/r3f_prototype/src/assets/background_floor/stage02_corridor_end_wall.png
```

## 구현 내용

- Stage 1은 기존 `tile_stage01` 텍스처를 그대로 사용한다.
- Stage 2는 `tile_stage02_corridor.png`를 반복 텍스처로 사용한다.
- Stage 2 바닥 타일은 요청에 따라 기존 Stage 2 반복 기준보다 10배 촘촘하게 배치한다.
- Stage 2 맵 상단에는 `stage02_corridor_end_wall.png`를 배치해 문과 창문이 목적지처럼 보이게 했다.
- Stage 2 상단 교실 문/창문 이미지는 표시 높이를 1/5로 줄이고, 가로 방향으로 5회 반복되게 했다.
- 기존 Stage 2 복도 라인 오버레이는 유지하되, 새 바닥 텍스처를 가리지 않도록 투명도를 낮췄다.

## 검증

```text
npm test -- src/components/ClassroomFloor.test.jsx
npm run build
```

두 명령 모두 통과했다. `npm run build`는 Vite의 chunk size 경고만 출력했다.
