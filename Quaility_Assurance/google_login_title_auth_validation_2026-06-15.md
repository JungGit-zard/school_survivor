# Google Login Title Auth Validation

Date: 2026-06-15

## Automated Checks

- `npm test -- --run src/lib/firebaseAuth.test.js src/components/GoogleAccountPanel.test.jsx`
- `npm test -- --run src/components/TitleScreen.settings.test.jsx src/components/resultCoinShopFlow.test.jsx`
- `npm test -- --run`
- `npm run build`
- Playwright smoke check at `http://127.0.0.1:5178`

## Coverage

- Missing Firebase env variables show a disabled setup state.
- Firebase env variables are converted into the expected web config shape.
- Firebase user data is normalized for UI state.
- Signed-out UI shows a Google login action.
- Signed-in UI shows account identity and logout.
- Existing title settings, cheat buttons, stage selection, and coin shop entry tests still pass.
- Browser smoke check shows `Google 로그인 설정 필요` and a disabled login button when `.env` is missing.

## Screenshot

- `Quaility_Assurance/google_login_title_auth_390x844_2026-06-15.png`

## Remaining Manual Checks

- Create a Firebase project.
- Enable Google provider in Firebase Authentication.
- Add real Vite env values to a local `.env`.
- Run the game and confirm the Google popup succeeds on the configured domain.
