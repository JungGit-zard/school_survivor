# 모바일 플레이 영역·퀘스트 NPC 접근 QA (2026-09-12)

- Kanban 참조: `escape-zombie-school` / `t_3fdd132d`
- 범위: 게임 카메라의 플레이어 좌우 가시성. NPC 모델·배치·Firebase 값은 변경하지 않았다.

## 확인된 원인

기존 `Game.jsx`는 먼 쪽 바닥의 `reachSide`로 카메라 follow clamp와 landscape zoom을 계산했다. 원근 카메라에서 플레이어는 가까운 쪽 행에 있으므로 실제 가로 폭이 더 좁다. 같은 공식으로 stage1 플레이어 `(x: 8, y: .32, z: 13.6)`를 투영하면 375×667에서 NDC X `1.0737`, 800×360에서 `1.2436`으로 화면 밖이었다.

`gameCameraFraming`은 가까운 쪽 reach를 zoom 기준으로 쓰고, 플레이어 메시 상단과 물리 collider 반폭을 화면 안에 두는 데 필요한 만큼만 focus X를 추가로 따라간다. 이동 세계 경계는 유지한다.

## 검증

- `gameCameraFraming.test.js`: 375×667, 360×800, 800×360에서 최대 X/Z의 플레이어 머리·collider 오른쪽 점이 NDC `<= 1`.
- `playerMovementBounds.test.js`, `QuestWorldLayer.test.jsx` 통과.
- `studentProximity.test.js`는 현재 작업과 무관하게 Stage4 pressure-cauldron 조사 대상 1개가 기대 목록에 없는 기존 실패가 있었다. 이 작업에서 해당 파일·퀘스트 경로는 수정하지 않았다.

## NPC 접근 확인 범위

기본 학생 배치는 현재 플레이어 이동 경계 안에 있다. `findQuestByGiverPlacementId`는 Stage2 `-copy-` 배치 ID를 이미 지원한다. 실제 Firebase Studio 오버라이드가 화면 밖에 있다는 증거는 이 read-only 검사에서 얻지 못했으므로, 보이지 않는 NPC로 상호작용 지점을 옮기거나 Studio 좌표를 clamp하지 않았다.

## 추가 프레임 검증 (2026-09-12)

- 여백은 화면 폭의 8%이며 375px 세로 화면에서 한쪽 30px이다. 물리 collider 폭(.136)이 아니라 `PlayerMesh`의 `PlayerVisual` 부모 좌표계에서 양팔 outline 최외곽을 계산한 world half-width `0.2154`를 사용했다. 모델 변형은 하지 않았다.
- 실제 `camera.position.lerp` 이후 `lookAt`된 카메라로 양쪽 외곽을 투영한다. 그 프레임이 안전영역 밖일 때만 목표 pose로 즉시 보정하므로 일반 추적은 계속 부드럽고, 경계 이동·초기 카메라·회전/리사이즈 상황의 이전 각도 잔류는 남지 않는다.
- `gameCameraFraming.test.js`는 375x667, 360x800, 800x360에서 Stage 1~4의 좌우 및 상하 이동 한계 네 모서리를 검증한다. 별도 테스트가 이전 카메라 위치에서 lerp하는 상황을 재현한다.
- `studentProximity.test.js` 전체의 Stage4 pressure-cauldron 목록 불일치는 이번 범위 밖에서 관찰했으며, 변경 전 baseline을 재현하지 않아 기존 실패라고 단정하지 않았다. NPC 상호작용 관련 필터 테스트만 통과했다.
- 화면 폭 8% 여백은 NDC 경계 `±0.84`(=`1 - 2 * .08`)로 변환했다. `lookAt` 뒤 `updateMatrixWorld()`를 호출한 뒤에만 PlayerVisual 점을 투영하므로, 테스트와 실제 frame의 카메라 행렬 순서가 같다.
