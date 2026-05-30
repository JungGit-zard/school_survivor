# 오니기리 즉시 소멸 구현 기록

## 요청

- 오니기리가 바운스 종료 뒤 바닥에 한참 남았다가 터지는 동작을 제거한다.
- 관련 코드를 전부 삭제한다.

## 원인

- `Onigiri.jsx`에 마지막 충돌 지점에서 `flashes` 상태를 만들고 `RiceBurst`를 렌더링하는 코드가 있었다.
- `RiceBurst`는 `RiceGrain` 파편을 일정 시간 표시했다.
- `onigiri.js`에는 `createRiceBurstGrains`, `shouldShowRiceBurst`가 있어 마지막 충돌 뒤 잔류 효과 생성을 돕고 있었다.

## 변경

- `RiceGrain` 컴포넌트를 삭제했다.
- `RiceBurst` 컴포넌트를 삭제했다.
- `flashes`, `flashIdRef`, `addFlash`, `removeFlash` 상태와 렌더링을 삭제했다.
- `onBounceFlash` 전달과 호출을 삭제했다.
- `createRiceBurstGrains`, `shouldShowRiceBurst` 유틸 함수를 삭제했다.
- 마지막 바운스가 끝났거나 다음 목표가 없으면 `onDone(id)`를 즉시 호출하도록 정리했다.

## 결과

- 오니기리는 더 이상 마지막 위치에 밥풀/흰색 원/플래시를 남기지 않는다.
- 남은 오니기리 관련 그래픽은 날아가는 투사체 모델 자체뿐이다.
