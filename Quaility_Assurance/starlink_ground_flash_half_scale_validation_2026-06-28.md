# 스타링크 바닥 원형 효과 절반 축소 QA 기록

## 자동 테스트

- 명령: `npm test -- Starlink.test.jsx effectVisualScale.test.js`
- 결과: 통과
- 검증 항목:
  - 스타링크 바닥 원형 효과 지오메트리 반지름이 기존 값의 절반으로 계산된다.
  - `effectVisualScale`의 기본 배율이 `1 / 2`로 유지된다.
  - 원형/링 지오메트리 구조는 유지된다.

## 추가 검증

- 명령: `npm test -- Starlink.test.jsx effectVisualScale.test.js weaponCatalog.test.js`
- 결과: 통과, 21개 테스트
- 확인:
  - 스타링크 시각 효과 축소 테스트 통과.
  - 무기 카탈로그의 스타링크 데미지, 쿨다운, 판정 반경 값은 기존 기대값 유지.

## 빌드

- 명령: `npm run build`
- 결과: 통과
- 비고: Vite 큰 chunk 경고는 기존 대형 번들 경고다.

## 전체 테스트

- 명령: `npm test`
- 결과: 실패 1건, 통과 321건
- 실패: `src/lib/playerMovementBounds.test.js`
- 원인: 현재 `stage1.mapHalfX` 값 기준 실제 Stage 1 이동 X 범위는 `-5~5`인데, 기존 테스트는 `-12~12`를 기대한다.
- 판단: 스타링크 바닥 원형 효과 크기 변경과 직접 관련 없는 기존 Stage 1 이동 경계 기대값 불일치다.

## 확인 범위

- 바닥 원형 시각 효과만 조정했다.
- 스타링크 피해 반경, 데미지, 쿨다운, 타겟 선택 로직은 변경하지 않았다.
