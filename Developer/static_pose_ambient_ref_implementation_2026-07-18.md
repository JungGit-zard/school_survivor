# staticPose 정적 포즈 게이트 및 로비 ambient ref 보정

## 목적

스테이지 보스 카드 프리뷰가 로비에서 상시 내부 보행 애니메이션을 돌리지 않도록 `staticPose`를 명확한 early animation gate로 고정하고, 로비 배경 앰비언트 드리프트가 스테이지 보스 프리뷰 리렌더를 유발하지 않도록 ref 기반 DOM transform 갱신으로 보정한다.

## 구현

- `ZombieMesh`에 `staticPose = false` prop을 명시하고 `useFrame` 콜백 첫 처리로 `if (staticPose) return`을 배치했다.
- 정적 로비 프리뷰는 `StageBossPreview` → `EnemyVisual` → `ZombieMesh`로 `staticPose`를 전달한다.
- Graphics Studio interactive 프리뷰는 `staticPose=false`를 유지해 기존 애니메이션 확인 흐름을 보존한다.
- `Lobby`의 ambient drift는 React state 대신 `ambientDriftRef.current.style.transform` 직접 갱신으로 변경해 2.4초 interval마다 카드 프리뷰가 리렌더되지 않게 했다.

## 변경 파일

- `Developer/r3f_prototype/src/components/ZombieMesh.jsx`
- `Developer/r3f_prototype/src/components/StageBossPreview.jsx`
- `Developer/r3f_prototype/src/components/Lobby.jsx`
- `Developer/r3f_prototype/src/components/ZombieMesh.test.js`
- `Developer/r3f_prototype/src/components/StageBossPreview.test.jsx`
- `Developer/r3f_prototype/src/components/Lobby.test.jsx`

## 검증

- `npm.cmd exec -- vitest run src/components/ZombieMesh.test.js src/components/StageBossPreview.test.jsx src/components/Lobby.test.jsx`
- 결과: 테스트 파일 3개 통과, 테스트 59개 통과
- 참고: 기존 jsdom/R3F mock 경고(`act`, Three 태그 casing)는 출력됐으나 실패 없음
