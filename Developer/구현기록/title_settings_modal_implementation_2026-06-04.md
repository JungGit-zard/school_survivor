# Title Settings Modal Implementation

## 작업 일자

- 2026-06-04

## 구현 범위

- 타이틀 화면 오른쪽 위에 설정 진입용 톱니 버튼을 추가했다.
- 설정 화면은 화면을 크게 덮는 바텀시트가 아니라 별도 플로팅 모달처럼 뜨도록 구현했다.
- MVP 설정 항목은 `진동`, `연출 줄이기`, `조작법 보기`로 제한했다.

## 구현 파일

- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
- `Developer/r3f_prototype/src/components/TitleScreen.settings.test.jsx`

## 동작 규칙

- `진동`과 `연출 줄이기`는 `localStorage`의 `school_survivor:titleSettings`에 저장한다.
- `연출 줄이기`가 켜지면 타이틀 화면의 강한 빛 번짐과 그림자 효과를 줄인다.
- 모달은 닫기 버튼, 바깥 영역 클릭, `Esc` 키로 닫힌다.
- `조작법 보기`는 별도 화면 이동 없이 모달 안에서 접고 펼친다.

## 검증

- `npm test -- TitleScreen.settings.test.jsx resultCoinShopFlow.test.jsx`
- `npm run build`

## 남은 과제

- 실제 사운드 시스템이 생기면 `소리` 설정을 추가한다.
- 전투 중 일시정지 설정 화면은 별도 상태 전환 위험이 있어 추후 구현한다.
