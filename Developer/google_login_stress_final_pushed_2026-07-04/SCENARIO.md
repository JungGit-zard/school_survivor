# Google login anti-hang stress scenario — final pushed version

Target commit: `origin/feature/stage2-corridor-floor-graphics` at `08406ed`.

Goal: repeatedly exercise the Google login entry point on the final pushed web build and detect the failure modes most likely to affect testers before they submit real Google credentials.

## Preconditions

1. Use production build output from `npm run build`.
2. Serve with `npm run preview -- --host localhost --port 4173`.
3. Use the same Firebase `.env` values as the release build, without printing secrets.
4. Start from a fresh browser context per iteration to avoid cached popup/session artifacts.

## Iteration steps

Repeat at least 40 times:

1. Open `http://localhost:4173/` with a mobile Android-like viewport/user-agent.
2. Wait for the title screen and `Google 로그인` button.
3. Verify the login button is clickable before interaction.
4. Click `Google 로그인`.
5. Wait up to 15 seconds for a popup window.
6. Verify the popup URL is Google/Firebase OAuth-like:
   - `accounts.google.*`, or
   - Firebase auth handler/OAuth URL.
7. Check the app did not surface known local config errors:
   - `auth/unauthorized-domain`
   - `Firebase auth is not configured`
   - generic immediate `failed` text.
8. Close the popup without entering real Google credentials.
9. Return focus to the app.
10. Verify the app is still responsive and the login button is clickable again.
11. Record elapsed time, popup URL, app error text, console/page errors, and screenshots for failures.

## What this scenario can prove

- The final pushed build loads with Firebase config.
- The login button does not freeze the app before Google account entry.
- OAuth popup creation works repeatedly in a desktop Chromium/mobile-viewport environment.
- Closing/canceling the login attempt does not leave the app stuck.
- The localhost authorized-domain path is valid.

## What this scenario cannot fully prove

- Real Google account credential completion.
- Android WebView behavior after installation from Play internal testing.
- Google embedded-user-agent policy behavior inside a real Capacitor WebView.

Those require a real Android device installed from the internal-test track.
