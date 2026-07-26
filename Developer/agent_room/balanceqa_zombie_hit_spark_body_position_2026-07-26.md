# balanceqa 검증 기록 — 풀 좀비 피격 스파크 위치

## 반드시 지킬 사항

- 회귀 기준은 스파크 몸통 `0.42 * visualScale`, 데미지 숫자 머리 위 `0.95 * visualScale`이다.
- 큐 overflow/FIFO와 caller-owned scratch 객체 계약을 유지한다.

## 앞으로 하면 안 되는 사항

- 흰색 피격 플래시, 넉백, 피해량, 치명타, 데미지 숫자 높이를 이 수정으로 바꾸지 않는다.
- RAF 경로에 객체나 배열 할당을 추가하지 않는다.

## 라우팅 및 검증

- 라우팅: balanceqa (회귀·큐 안정성 검증).
- RED: 기존 구현은 `hit.y` 하나를 스파크와 숫자에 함께 사용해 실패함.
- GREEN: `enemyHitEventQueue`, `enemyHitVfx`, `Enemies` 집중 테스트 9개 및 전체 관련 테스트 77개가 통과했고 diff check도 통과했다.
- Firebase, Graphics Studio, localStorage 변경 없음.
