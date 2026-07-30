# 짧은 모바일 타이틀 계정 패널 겹침 수정 (2026-07-30)

## 반드시 지켜야 할 사항

- 변경 범위는 타이틀 카피의 짧은 모바일 세로 여백뿐이다. Google 계정 패널의 44px 버튼, 안전 영역, 360px 이하 2행 정책은 바꾸지 않는다.
- 390×844 및 1280×720의 기존 배치는 변경하지 않는다.
- Graphics Studio, Firebase, 3D 모델, 조명, 변환값은 변경하지 않는다.

## 새로 하면 안 되는 사항

- 계정 패널을 숨기거나 버튼 높이를 44px 미만으로 줄이지 않는다.
- 일반 모바일 또는 데스크톱에 전역적인 카피 위치 보정을 적용하지 않는다.

## 증거와 수정

- 수정 전 증거: `Quaility_Assurance/evidence/critic_round2_title_mobile_320x568_2026-07-30.png`에서 두 줄 계정 패널 하단이 첫 제목 줄 `탈출!`과 겹쳤다.
- `TitleScreen.jsx`의 `.title-copy`에만 `max-width: 360px` 및 `max-height: 600px` 조건을 적용했다. 짧은 320×568 화면에서 타이틀 카피 시작점을 최소 96px(안전 영역 포함 시 88px 아래)로 내려 계정 패널 아래에 여백을 만든다.
- 조건 밖인 390×844 및 1280×720은 기존 인라인 `styles.content` 위치를 그대로 사용한다.

## 검증

- `TitleScreen.settings.test.jsx`: 짧은 모바일 조건, 타이틀/4분 목표·온보딩·CTA DOM 존재, 전용 카피 클래스 검증.
- `GoogleAccountPanel.test.jsx`: 기존 360px 이하 2행 및 44px 버튼 정책 검증을 유지.
- `npm.cmd test -- --run src/components/TitleScreen.settings.test.jsx src/components/GoogleAccountPanel.test.jsx`: 2개 파일, 20개 테스트 통과.
- `git diff --check`: 오류 없음. 기존 다른 작업 파일의 LF→CRLF 경고만 출력됐다.
- 자동화 브라우저 연결은 이 세션에서 사용할 수 없어 새 스크린샷은 만들지 않았다. 수정 전 320×568 캡처와 CSS 조건·DOM 회귀 테스트로 검증했으며, 조건은 360px 이하 및 600px 이하에서만 발동한다.
