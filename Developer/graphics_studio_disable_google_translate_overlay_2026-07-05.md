# Graphics Studio Disable Google Translate Overlay

- Date: 2026-07-05
- Area: `Developer/r3f_prototype/index.html`

## 변경 내용

- 앱 HTML에 `notranslate` 메타와 `translate="no"` 속성을 추가했다.
- Google Translate가 페이지 안에 삽입하는 대표 overlay/icon selector를 숨김 처리했다.

## 제한

- 브라우저 확장 프로그램의 브라우저 chrome UI 자체는 웹앱에서 제거할 수 없다.
- 페이지 DOM 안에 삽입되는 번역 아이콘과 배너를 대상으로 막는다.
