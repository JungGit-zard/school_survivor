# 커터칼 기본 능력치 1.5배 상향 검증

## 검증 대상

- 커터칼 기본 피해와 기본 사거리 카탈로그 값
- 커터칼 공격 판정 fallback 사거리
- 커터칼 사거리 업그레이드 상한
- 전체 테스트와 빌드 안정성

## 기대 결과

- 기본 피해는 24다.
- 기본 사거리는 1.275다.
- 사거리 값을 생략한 공격 판정도 1.275 기본 사거리를 사용한다.
- 기존 커터칼 판정 테스트가 계속 통과한다.

## 실행 결과

- `npm.cmd test -- --run src/lib/weaponCatalog.test.js src/lib/boxCutter.test.js src/lib/upgrades.test.js`
  - 통과: 3개 테스트 파일, 40개 테스트
- `npm.cmd test -- --run`
  - 통과: 23개 테스트 파일, 149개 테스트
- `npm.cmd run build`
  - 통과
  - 기존과 같은 대형 번들 경고가 표시됨
