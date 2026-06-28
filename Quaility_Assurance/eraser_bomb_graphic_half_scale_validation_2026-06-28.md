# 지우개 폭탄 그래픽 절반 축소 QA 기록

## 자동 테스트

- 명령: `npm test -- EraserBomb.test.jsx effectVisualScale.test.js weaponCatalog.test.js`
- 결과: 통과
- 검증 항목:
  - 지우개 폭탄 모델 스케일이 `0.4`다.
  - 폭발 먼지 시각 스케일은 기존 공식 결과의 절반이다.
  - 공용 시각 축소 배율은 `1 / 2`로 유지된다.
  - 무기 카탈로그의 지우개 폭탄 데미지, 쿨다운, 판정 반경 기대값은 유지된다.

## 빌드

- 명령: `npm run build`
- 결과: 통과
- 비고: Vite 큰 chunk 경고는 기존 대형 번들 경고다.

## 전체 테스트

- 명령: `npm test`
- 결과: 실패 1건, 통과 323건
- 실패: `src/lib/playerMovementBounds.test.js`
- 원인: 현재 `stage1.mapHalfX` 값 기준 실제 Stage 1 이동 X 범위는 `-5~5`인데, 기존 테스트는 `-12~12`를 기대한다.
- 판단: 지우개 폭탄 그래픽 축소와 직접 관련 없는 기존 Stage 1 이동 경계 기대값 불일치다.

## 브라우저 검증

- 환경: Chrome headless, `1280x720`, `/graphics-studio`
- 결과: 통과
- 확인:
  - `Weapon Model / Eraser`가 선택된다.
  - 그래픽 스튜디오 캔버스에서 축소된 지우개 모델이 표시된다.
- 스크린샷:
  - `Quaility_Assurance/eraser_bomb_half_scale_graphics_studio_2026-06-28.png`

## 확인 범위

- 그래픽 크기만 조정했다.
- 피해 반경, 데미지, 쿨다운, 타겟 선택 로직은 변경하지 않았다.
