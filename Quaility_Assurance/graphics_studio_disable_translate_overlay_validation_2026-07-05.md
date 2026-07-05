# Graphics Studio Disable Translate Overlay Validation

- Date: 2026-07-05
- Area: `Developer/r3f_prototype`

## 검증 항목

- `index.html`에 `notranslate` meta/html/body/root 속성이 들어간다.
- Google Translate overlay selector 숨김 CSS가 들어간다.

## 실행한 테스트

- `npm test -- src/faviconRoute.test.js`
- `npm run build`
