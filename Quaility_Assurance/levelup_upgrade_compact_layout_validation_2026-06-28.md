# 레벨업 업그레이드 컴팩트 레이아웃 QA 기록

## 자동 테스트

- 명령: `npm test -- HUD.test.jsx`
- 결과: 통과
- 검증 항목:
  - 레벨업 업그레이드 오버레이가 전체 화면 `inset: 0` 구조가 아니다.
  - 업그레이드 선택지가 3개 렌더링된다.
  - 선택지 묶음이 `repeat(3, minmax(0, 1fr))` 3열 grid를 사용한다.

## 빌드

- 명령: `npm run build`
- 결과: 통과
- 비고: Vite 큰 chunk 경고는 기존 대형 번들 경고다.

## 전체 테스트

- 명령: `npm test`
- 결과: 실패 1건, 통과 320건
- 실패: `src/lib/playerMovementBounds.test.js`
- 원인: 현재 `stage1.mapHalfX` 값 기준 실제 Stage 1 이동 X 범위는 `-5~5`인데, 기존 테스트는 `-12~12`를 기대한다.
- 판단: 레벨업 업그레이드 UI 변경과 직접 관련 없는 기존 Stage 1 이동 경계 기대값 불일치다.

## 브라우저 검증

- 환경:
  - Chrome headless `390x844`
  - Chrome headless `1280x720`
- 결과: 통과
- 확인:
  - 레벨업 UI가 하단 패널로만 표시된다.
  - 선택 카드 3개가 나란히 표시된다.
  - 전투 화면과 캐릭터가 계속 보인다.
  - 모바일 패널 크기: 약 `366x216`
  - 데스크톱 패널 크기: 약 `760x197`
- 스크린샷:
  - `Quaility_Assurance/levelup_upgrade_compact_mobile_2026-06-28.png`
  - `Quaility_Assurance/levelup_upgrade_compact_desktop_2026-06-28.png`
