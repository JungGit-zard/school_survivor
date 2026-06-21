# Stage 2 Corridor Floor Asset - 2026-06-20

## 작업 목적

첨부된 학교 복도 이미지를 기준으로 Stage 2 전용 바닥 그래픽을 만들고 게임에 적용한다.

사용 원본:

```text
Graphic_designer/graphic_asset/background_floor/stage02_resource.png.png
```

## 생성한 그래픽 리소스

```text
Graphic_designer/graphic_asset/background_floor/tile_stage02_corridor.png
Graphic_designer/graphic_asset/background_floor/stage02_corridor_end_wall.png
```

게임 적용용 복사본:

```text
Developer/r3f_prototype/src/assets/background_floor/tile_stage02_corridor.png
Developer/r3f_prototype/src/assets/background_floor/stage02_corridor_end_wall.png
```

## 처리 방향

- 바닥 타일은 원본 이미지의 회색 복도 바닥 구간을 잘라 반복 가능한 텍스처로 가공했다.
- 상단 교실 문, 창문, 게시판 구간은 별도 end wall 리소스로 분리했다.
- Stage 1의 기존 바닥 텍스처는 유지했다.
- Stage 2에서만 새 복도 바닥 타일과 상단 끝 배경이 보이도록 했다.
- Stage 2 바닥 타일은 10배 밀도 요청에 맞춰 더 촘촘하게 반복되도록 적용했다.
- 상단 교실 문/창문 이미지는 기존 축소 표시보다 2배 큰 `2/5` 크기로 키우고 좌우 5회 반복했다.
- 상단 교실 문/창문 이미지의 맨 아랫선은 캐릭터가 넘어가지 못하는 벽처럼 보이도록 연출한다.
- 캐릭터의 몸이 벽 이미지 안으로 겹쳐 보이지 않도록, 실제 정지선은 이미지 아랫선보다 약간 아래에 둔다.
- 캐릭터와 몬스터는 기존 three.js 3D 카툰 렌더링 방식을 유지하고, 배경만 2D 텍스처로 처리했다.

## 적용 확인

- 390x844 화면에서 Stage 2 시작 지점의 바닥 반복을 확인했다.
- Stage 2 상단 진행 지점에서 교실 창문과 벽이 보이는 것을 확인했다.
- Stage 2 상단 진행 지점에서 캐릭터가 창문/문 이미지 아랫선을 넘지 못하도록 개발 검증한다.
- 검증 스크린샷은 `Quaility_Assurance/` 폴더에 저장했다.
