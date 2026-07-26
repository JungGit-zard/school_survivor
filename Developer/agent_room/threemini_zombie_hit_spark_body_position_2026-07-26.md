# threemini 시각 구현 기록 — 풀 좀비 피격 스파크 몸통 위치

## 반드시 지킬 사항

- 일반 풀링 좀비의 노란 피격 스파크는 `visualScale * 0.42` 높이(몸통)에 표시한다.
- 데미지 숫자는 `visualScale * 0.95` 높이(머리 위)를 유지한다.
- 두 높이는 큐의 별도 typed-array 채널(`sparkY`, `numberY`)로 전달한다.

## 앞으로 하면 안 되는 사항

- 스파크와 데미지 숫자에 단일 높이 값을 공유하지 않는다.
- 특수 `Enemy.jsx`의 기존 몸통/머리 높이 구현, 모델, Firebase Graphics Studio 값은 변경하지 않는다.

## 라우팅 및 검증

- 라우팅: threemini (R3F 시각 효과 위치).
- RED: 단일 `0.95 * visualScale` 채널 구현에서 피격 스파크 높이 계약 테스트가 실패함.
- GREEN: 큐와 flush가 `sparkY`/`numberY`를 분리해 소비함을 집중 테스트 9개 통과로 검증했다.
- Firebase, Graphics Studio, localStorage 변경 없음.
