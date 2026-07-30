# 로비 터치 대상 검증 (2026-07-31)

## 대상

- 스테이지 카드의 `입장하기`/`준비 중` primary 버튼과 `점수 레코드` 버튼(활성·disabled 상태 모두)

## 계약 검증

- `Lobby.test.jsx`에 각 스테이지 카드의 primary/ranking 버튼 전체가 `minHeight >= 44`인지 검사하는 테스트를 추가했다.
- 잠긴 Stage 4의 disabled primary와 ranking 버튼도 각각 44px임을 명시적으로 검사한다.
- 기존 설정 버튼 44px 및 하단 메뉴 버튼 48px 계약은 유지한다.

## 실행 결과

- `npm.cmd test -- src/components/Lobby.test.jsx` → 1 파일, 22 테스트 통과.
- `npm.cmd run build` → Vite production build 및 Legacy B02 artifact gate 통과.

## 레이아웃 판정

- 144px 프리뷰에서 ranking 제어는 34–78px, primary 제어는 90–134px을 차지한다. 두 영역은 12px 떨어져 있어 카드 내부에서 겹치지 않는다.
- 이 위치·높이는 뷰포트 너비와 무관한 카드 내부 절대 좌표이므로 320/390/412px 모바일 및 1280px 데스크톱에서 다음 카드와 하단 메뉴의 흐름 높이를 바꾸지 않는다.

## 범위 외 변경

- Firebase/Graphics Studio/localStorage에는 접근하거나 변경하지 않았다.
