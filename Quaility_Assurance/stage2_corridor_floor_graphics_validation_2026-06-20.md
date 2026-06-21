# Stage 2 Corridor Floor Graphics Validation - 2026-06-20

## 검증 대상

Stage 2 복도 바닥 텍스처 반복, 10배 밀도 적용, 상단 교실 문/창문 배경의 `2/5` 크기 표시와 좌우 반복, 벽 경계 처리를 확인한다.

## 검증 방법

- 로컬 개발 서버 `http://localhost:5173`에서 게임을 실행했다.
- 브라우저 자동화로 Stage 2를 선택하고 게임을 시작했다.
- 시작 지점, 상단 진행 지점, 10배 밀도 적용 지점, 상단 반복 적용 지점에서 스크린샷을 저장했다.
- `ClassroomFloor`, `stage2CorridorWall`, `playerMovementBounds` 테스트로 표시 크기와 벽 경계 값을 확인했다.

## 검증 결과

- Stage 2 시작 지점에서 회색 복도 바닥 타일이 반복되어 보인다.
- Stage 2 바닥 타일 반복 횟수를 기존 Stage 2 기준보다 10배 늘려 더 촘촘하게 보이도록 했다.
- Stage 2 상단 교실 문/창문 이미지는 기존 축소 표시보다 2배 큰 `2/5` 크기로 키우고, 좌우로 5개 반복 배치했다.
- Stage 2 상단 교실 문/창문 이미지의 아랫선은 플레이어가 넘지 못하는 벽처럼 보이도록 사용한다.
- 캐릭터의 보이는 몸이 이미지 안으로 겹쳐 들어가지 않도록 정지선에 시각 여유값을 둔다.
- 390x844 화면에서 캐릭터가 상단 벽 이미지 아래에서 멈추는 것을 확인했다.
- 기존 중앙 이동 라인은 남아 있지만 바닥 그래픽을 과하게 가리지 않는다.
- Stage 1 바닥 텍스처는 변경하지 않았다.

## 증거 파일

```text
Quaility_Assurance/stage2_corridor_floor_start_2026-06-20.png
Quaility_Assurance/stage2_corridor_floor_top_2026-06-20.png
Quaility_Assurance/stage2_corridor_floor_density10_2026-06-20.png
Quaility_Assurance/stage2_corridor_endwall_small_repeated_meshes_2026-06-20.png
Quaility_Assurance/stage2_corridor_wall_block_2x_inset_2026-06-21.png
```
