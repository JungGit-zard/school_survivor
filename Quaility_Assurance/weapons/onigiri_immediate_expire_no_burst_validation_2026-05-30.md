# 오니기리 즉시 소멸 검증 기록

## 검증 목표

- 오니기리 마지막 충돌 뒤 잔류 밥풀 효과 코드가 남아 있지 않은지 확인한다.
- 마지막 바운스 종료 또는 다음 목표 없음 상태에서 즉시 소멸하도록 테스트가 정리되었는지 확인한다.

## 코드 검수

- `RiceBurst`, `RiceGrain`, `createRiceBurstGrains`, `shouldShowRiceBurst`, `onBounceFlash`, `flashes`, `flashIdRef` 검색 결과 없음.
- 오니기리 투사체는 마지막 처리에서 `onDone(id)`를 즉시 호출한다.

## 검증 결과

- `rg` 검색으로 삭제 대상 코드명이 남아 있지 않음을 확인했다.
- `npm.cmd test -- src/lib/onigiri.test.js --run`: 통과, 1개 파일 / 2개 테스트.
- `npm.cmd test -- --run`: 통과, 27개 파일 / 163개 테스트.
- `npm.cmd run build`: 통과.
- 빌드 중 번들 크기 경고가 있었지만 이번 오니기리 소멸 변경의 실패는 아니다.
