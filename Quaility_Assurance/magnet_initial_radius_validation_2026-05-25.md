# 자력 초기 반경 조정 검증 - 2026-05-25

## 검증 목표

초기 자력 발현 반경이 기존의 절반인 `0.75 units`로 줄어들고, 자력 파워업 배율 적용과 비용 구조는 그대로 유지되는지 확인한다.

## 검증 항목

- 기본 자력 반경 제곱값이 `0.75 * 0.75 = 0.5625`인지 확인한다.
- 자력 Lv.2 배율 예시 `1.16` 적용 시 반경이 `0.75 * 1.16` 기준으로 계산되는지 확인한다.
- 잘못된 배율 입력은 기존처럼 `1`배로 되돌아가는지 확인한다.
- 패시브 상점의 자력 구매/비용 테스트가 기존과 동일하게 통과하는지 확인한다.

## 실행한 검증

```powershell
cd Developer/r3f_prototype
npm test -- pickup.test.js useGameStore.passives.test.js --run
npm test -- --run
npm run build
```

## 결과

- `npm test -- pickup.test.js useGameStore.passives.test.js --run`
  - 테스트 파일 2개 통과.
  - 테스트 12개 통과.
- `npm test -- --run`
  - 테스트 파일 18개 통과.
  - 테스트 130개 통과.
- `npm run build`
  - 빌드 성공.
  - 기존 Vite chunk size warning은 계속 표시되지만 빌드는 실패하지 않았다.

## 판정

초기 자력 반경은 절반으로 줄었고, 자력 파워업 배율과 비용 구조는 유지된 것으로 판정한다.
