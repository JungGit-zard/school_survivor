# 오니기리 즉시 밥풀 폭발 구현 기록

## 요청

- 오니기리가 없어짐과 동시에 밥풀 폭발을 보여 준다.

## 구현

- `OnigiiriProjectile`의 마지막 충돌 처리에서 `onBurst(x, z, startMs)`를 호출한 뒤 즉시 `onDone(id)`로 투사체를 제거한다.
- `OnigiriBurst`는 투사체와 분리된 짧은 VFX로만 동작한다.
- `OnigiriBurstGrain`은 작은 밥풀 알갱이를 낮게 퍼뜨리고 0.36초 동안 페이드아웃한다.
- `createOnigiriBurstGrains`는 밥풀 위치, 각도, 속도, 크기, 짧은 지연값을 만든다.

## 지연 방지

- 폭발 시작 시간은 `performance.now()`가 아니라 `useFrame`의 `clock.elapsedTime * 1000`을 사용한다.
- VFX 수명 계산도 같은 시간 기준을 사용한다.
- 서로 다른 시간 기준이 섞여 늦게 터지는 문제를 피한다.

## 결과

- 오니기리 투사체는 바운스 종료 지점에 남지 않는다.
- 밥풀 폭발은 투사체 제거와 같은 프레임에서 시작된다.
