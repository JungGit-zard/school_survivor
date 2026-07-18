# Classroom Desk Stage Object Implementation · 2026-06-06

## 구현 범위

- `src/components/StageObjects/` 폴더를 새로 만들었다.
- `ClassroomDesk.jsx`에서 Three.js primitive geometry 기반 책상 컴포넌트를 구현했다.
- `StageObjectLayer.jsx`와 `stageObjectPlacements.js`로 스테이지별 배치 데이터를 분리했다.
- `Floor.jsx`에 시각 전용 레이어로 연결했다.

## 구조

- `src/components/StageObjects/ClassroomDesk.jsx`
  - 책상 단일 프리팹 역할
- `src/components/StageObjects/StageObjectLayer.jsx`
  - 스테이지별 배치 데이터를 읽어 오브젝트를 렌더링
- `src/components/StageObjects/stageObjectPlacements.js`
  - Stage 1 / Stage 2 배치 좌표, 회전, 스케일 저장
- `src/components/StageObjects/index.js`
  - 추후 배경 오브젝트 확장용 배럴 파일

## 구현 규칙

- 충돌체를 추가하지 않았다. 이번 책상은 배경 시각 오브젝트다.
- 기존 `toonMat`, `outlineMat`, `inflateScale` 패턴을 그대로 재사용했다.
- 외부 GLB/FBX 같은 3D 파일은 사용하지 않았다.
- Stage 1과 Stage 2 모두 중앙 플레이 구역을 피하는 좌표만 사용했다.

## 현재 배치 좌표

### Stage 1

- `[-18, 0, -20]`
- `[19, 0, -16]`
- `[-21, 0, 13]`
- `[20, 0, 18]`

### Stage 2

- `[-10.4, 0, -22]`
- `[10.3, 0, -8]`
- `[-10.1, 0, 10]`
- `[10.2, 0, 24]`

## 검증 계획

- `src/components/StageObjects/stageObjectPlacements.test.js`
  - 두 스테이지 모두 책상 배치 데이터가 존재하는지 확인
  - Stage 1 중앙부 회피 배치 확인
  - Stage 2 중앙 레인 회피 배치 확인
- 빌드 검증
  - `npm test`
  - `npm run build`

## 검증 결과

- `npm test` 통과
  - 34개 파일, 204개 테스트 통과
- `npm run build` 통과
- 참고
  - 기존 번들 크기 경고(`index` 청크 500kB 초과)는 남아 있다.
  - 이번 책상 오브젝트 추가로 빌드 실패나 테스트 실패는 발생하지 않았다.
