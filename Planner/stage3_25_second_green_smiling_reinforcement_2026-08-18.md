# Stage 3 25초 녹색·웃는 좀비 보강

## 확정 규칙

- 대상은 Stage 3만이다.
- 정확한 시각은 25, 50, 75, 100, 125초다. 150초는 제외한다.
- 각 시각에 E01 3마리를 먼저, E07 3마리를 다음으로 추가한다.
- 총 5틱, E01 15마리, E07 15마리, 합계 30마리다.
- 기존 Stage 3 버스트·formation·RZL·B03·마틸다·도지·오버타임과 Stage 1/2/4는 보존한다.

## 구현 결정

Stage 3 런타임 버스트 표에 `stage3TwentyFiveSecondE01E07` 반복 descriptor 두 개(E01, E07)를 둔다. 기존 RAF `SCHEDULE_BURST`가 descriptor를 소비하므로 별도 interval이나 새 프레임 루프는 만들지 않는다.

## 인수 기준

- descriptor의 반복 시각은 25, 50, 75, 100, 125초이고 150초 항목은 없다.
- E01이 E07보다 먼저 처리된다.
- Stage 3 런타임 목록에만 descriptor가 들어간다.
- 기존 pooled `addEnemies(..., true, token)` 경로로 전달된다.
