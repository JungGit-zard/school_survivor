# 커터칼 삼각 잔상 제거 검증

## 검증 대상

- 커터칼 삼각 잔상 렌더링 제거
- 커터칼 판정/카탈로그 테스트 유지
- 프로덕션 빌드 안정성

## 실행 결과

- `npm.cmd test -- --run src/lib/boxCutter.test.js src/lib/weaponCatalog.test.js`
  - 통과: 2개 테스트 파일, 20개 테스트
- `npm.cmd run build`
  - 통과
  - 기존과 같은 대형 번들 경고가 표시됨
- `rg "CutterTrail|shapeGeometry|trailShape" Developer/r3f_prototype/src/components/Weapons/BoxCutter.jsx`
  - 일치 항목 없음
