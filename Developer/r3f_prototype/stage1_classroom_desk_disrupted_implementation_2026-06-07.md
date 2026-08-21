# Stage 1 교실 책상 흐트러짐 1차 구현

작성일: 2026-06-07

## 구현 범위

- `ClassroomDesk.jsx`에 책상 상태 변형을 추가했다.
- `stageObjectPlacements.js`의 Stage 1 책상 배치를 4개에서 6개로 늘렸다.
- Stage 1에 `upright`, `abandoned`, `tilted`, `overturned` 상태를 섞었다.
- 책상은 계속 시각 오브젝트로만 동작한다. 이번 변경에는 충돌체를 추가하지 않았다.

## 변형 규칙

- `upright`: 정상 책상.
- `abandoned`: 살짝 비틀린 버려진 책상.
- `tilted`: 한쪽으로 기울어진 책상.
- `overturned`: 뒤집힌 책상. 모델을 뒤집고 바닥에 맞도록 높이를 보정한다.

## 테스트

- `stageObjectPlacements.test.js`에 Stage 1 변형 포함 검증을 추가했다.
- 중앙 시작/회피 구역 회피 테스트를 유지했다.

## 남은 확인

- 모바일 세로 화면에서 책상이 하단 중앙 시야를 과하게 가리지 않는지 브라우저로 확인해야 한다.
- 뒤집힌 책상이 장애물처럼 보이면 위치를 더 벽 쪽으로 밀거나 수량을 줄인다.
