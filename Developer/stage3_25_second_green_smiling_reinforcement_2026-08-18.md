# Stage 3 25초 반복 보강 런타임 연결

`src/lib/burstEvents.js`의 Stage 3 descriptor는 25초 시작, 25초 간격, 150초 미만으로 설정한다. 따라서 0~4 틱은 각각 25, 50, 75, 100, 125초를 뜻한다.

`src/components/Enemies.jsx`는 기존 `SCHEDULE_BURST` RAF 큐와 `scheduledRepeatBurstTicksRef`/`consumedRepeatBurstTicksRef`를 그대로 사용한다. 반복 descriptor는 one-shot `firedBurstsRef`를 소비하지 않고, 지연 프레임에도 소비하지 못한 틱을 시각 순서대로 pooled spawn drain에 전달한다.

이 보강은 기존 Stage 3 웨이브를 줄이거나 교체하지 않는 사용자 지정 추가분이다. 집중 검증은 첫·마지막·150초 제외, 5틱, 타입별 15마리·합계 30마리, Stage 3 격리와 기존 RAF 소비 경로를 확인한다.
