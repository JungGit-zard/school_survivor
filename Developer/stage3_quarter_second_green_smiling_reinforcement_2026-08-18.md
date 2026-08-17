# Stage 3 반복 보강 런타임 연결

`src/lib/burstEvents.js`에 Stage 3 전용 반복 descriptor(E01, E07)를 추가했다. `repeatingBurstTickAt`은 0.25~149.75의 0~598 틱만 반환하고, `repeatingBurstSecAtTick`은 범위 밖 틱을 거부한다.

`src/components/Enemies.jsx`는 기존 `SCHEDULE_BURST`와 RAF 큐를 그대로 사용한다. 반복 descriptor는 one-shot `firedBurstsRef`를 사용하지 않고 별도 scheduled/consumed tick ref를 사용한다. 프레임이 늦어져도 마지막 소비 틱부터 요청 틱까지 순서대로 배치를 만든 뒤 기존 pooled spawn drain으로 보낸다.

반복 보강은 사용자 지정 추가량이므로 기존 난이도 곡선의 밀도 계수를 재계산하는 `stageBurstJarmobBaseHp`에서는 제외했다. 이로써 기존 웨이브가 감소하거나 교체되지 않고, Stage 3에만 명시 스폰이 순수 추가된다.

집중 검증은 첫/마지막/150초 제외, 599틱, 타입별 1,797·합계 3,594, Stage 3 런타임 포함, 기존 RAF 큐 소비 경로를 확인한다.
