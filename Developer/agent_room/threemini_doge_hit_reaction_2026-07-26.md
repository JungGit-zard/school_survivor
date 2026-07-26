# threemini 라우팅 기록 — 도지 피격 반응

## 반드시 지킬 사항

- Three.js 인게임 도지 모델 전용 그룹만 120ms squash로 구동한다.
- 시각 효과는 refs와 `useFrame`으로 실행하고 기존 스파크를 유지한다.

## 절대로 하면 안 되는 사항

- 공용 `DogeMesh`, Studio/Firebase 값, 타이틀 도지나 물리 그룹을 변경하지 않는다.

## 결과

- `DancingDogeEvent.jsx`의 `hitVisualRef`가 모델만 감싸며 X/Z 1.12, Y 0.78의 짧은 피격 반응을 적용한다.
