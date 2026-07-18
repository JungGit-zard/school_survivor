# Stage 1 세로형 교실 맵 구현 메모

작성일: 2026-06-18

## 현재 구현 상태

Stage 1은 이미 `mapHalfX = 34`, `mapHalfZ = 54`로 설정되어 있다. 실제 물리 경계는 `68 x 108 units`이며, 가로보다 세로가 긴 구조다.

관련 파일:

- `Developer/r3f_prototype/src/lib/stageConfig.js`
- `Developer/r3f_prototype/src/components/Floor.jsx`
- `Developer/r3f_prototype/src/components/ClassroomFloor.jsx`
- `Developer/r3f_prototype/src/components/Game.jsx`
- `Developer/r3f_prototype/src/components/Player.jsx`
- `Developer/r3f_prototype/src/components/Enemies.jsx`
- `Developer/r3f_prototype/src/components/StageObjects/stageObjectPlacements.js`
- `Developer/r3f_prototype/src/components/StageObjects/stageObjectColliders.js`

## 핵심 판단

맵 크기 자체는 현재도 세로형이다. 구현 작업의 우선순위는 다음 순서가 맞다.

1. 정본 수치 테스트 추가.
2. 오브젝트 배치를 세로축으로 확장.
3. 모바일 세로 화면에서 긴 교실로 읽히는 시각 기준 추가.
4. 경계 근처 스폰과 카메라 검증.
5. 필요할 때만 `mapHalfZ`를 54에서 60으로 늘리는 후보 검토.

## 변경 후보

### 1차 구현

- `stageConfig.js`의 `mapHalfX = 34`, `mapHalfZ = 54` 유지.
- `stageObjectPlacements.js`에서 일부 책상/의자/학생을 `z = ±26`, `z = ±38` 부근으로 분산.
- 중앙 `|x| < 12 && |z| < 12` 비움 유지.
- 현재 테스트가 요구하는 시작 근처 가독성도 유지하기 위해 중앙 주변 외곽 소품 일부는 남긴다.

### 2차 후보

- QA 후 필요하면 `mapHalfZ = 60`으로 확장.
- 이때 `ClassroomFloor`의 보이는 바닥 크기, 카메라 끝 시야, 스폰 경계 테스트를 같이 확인한다.

### 피해야 할 변경

- `mapHalfX < 32`: 스폰 링이 벽에 잘리면서 적이 너무 가까이 나타날 수 있다.
- `mapHalfZ > 60`: 적 압박이 늘어지는 긴 도망길이 될 수 있다.
- 오브젝트만 늘리고 스폰/XP 회수 검증을 하지 않는 변경.

## 스폰 관련 리스크

현재 적 스폰은 플레이어 기준 반경 `8.5~12.5` 링에서 좌표를 뽑은 뒤 맵 안으로 `clamp`한다. `clamp`는 값을 강제로 범위 안에 묶는 처리다.

문제는 플레이어가 벽이나 모서리 근처에 있을 때다. 링 바깥쪽에 뽑힌 좌표가 벽 안쪽으로 잘리면, 원래 의도보다 플레이어 가까이 적이 나타날 수 있다.

권장 구현:

- 스폰 helper를 테스트 가능하게 분리한다.
- 경계 밖 좌표를 단순 보정하지 말고, 가능한 경우 유효한 링 좌표가 나올 때까지 재샘플링한다.
- 보스는 일반 적과 다른 고정 방향/거리 스폰과 경고 연출을 검토한다.

## 추가 테스트 계획

- `stageConfig.test.js`
  - Stage 1이 `mapHalfX = 34`, `mapHalfZ = 54`인지 검증.
  - Stage 2가 기존 정사각형 기준을 유지하는지 검증.

- `stageObjectPlacements.test.js`
  - 모든 Stage 1 오브젝트가 맵 경계 안에 있는지 검증.
  - 중앙 생존 구역 `|x| < 12 && |z| < 12`이 비어 있는지 검증.
  - `z = ±26`, `z = ±38` 구간에 세로 리듬용 오브젝트가 있는지 검증.
  - 책상/의자 스케일과 쓰러진 학생 1:1 스케일을 유지하는지 검증.

- `stageObjectColliders.test.js`
  - 책상/의자는 플레이어/좀비를 막는 충돌체인지 검증.
  - 쓰러진 학생은 blocking collider가 아닌지 검증.

- `ClassroomFloor.test.jsx`
  - 보이는 바닥이 Stage 1/2 bounds와 카메라 여유를 충분히 덮는지 검증.

- `Enemies.test.jsx` 또는 분리된 스폰 테스트
  - 맵 경계 근처에서 스폰 좌표가 맵 밖으로 나가지 않는지 검증.
  - clamp 이후 플레이어에게 과도하게 가까워지지 않는지 검증.

## 구현 후 필수 QA

- 모바일 `375 x 812`, `390 x 844` 브라우저 플레이.
- 시작 지점, 상단 끝, 하단 끝, 좌우 끝, 네 모서리 스크린샷.
- 48초, 144초, 192초, 240초 전후 성장/압박 체크.
- 세로로 계속 도망만 가는 플레이가 정답이 아닌지 확인.
