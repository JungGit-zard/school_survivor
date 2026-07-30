# LaunchMini / UI / Backend privacy-terms UI function audit

- Timestamp: 2026-07-30 17:12:10 KST
- Project: `D:/JungSil/2.Minigame_project/school_survivor-integration`
- Prototype: `Developer/r3f_prototype`
- Board: `escape-zombie-school`
- Trigger: user requested Google subagent review of recently applied project privacy policy, terms, and UI functions.
- Specialists involved: `launchmini`, `uimini`, `backendmini`; Hana performed final verification/synthesis as routing owner.

## Commands / verification actually run

```bash
hermes kanban --board escape-zombie-school assignees
hermes kanban --board escape-zombie-school stats
git status --short --branch
npm test -- --run src/components/ConsentGate.test.jsx src/components/LobbySettingsModal.test.jsx src/lib/consent.test.js src/lib/firebaseProgress.test.js src/lib/accountDeletion.test.js src/lib/localStoragePolicy.test.js src/lib/databaseRules.test.js
npm run build:legal
npm run build
curl -L -s -o ezs_page_tmp.html -w ... https://escape-zombie-school.web.app/privacy
curl -L -s -o ezs_page_tmp.html -w ... https://escape-zombie-school.web.app/terms
curl -L -s -o ezs_page_tmp.html -w ... https://escape-zombie-school.web.app/delete-account
npm run preview -- --host 127.0.0.1 --port 4173
curl -I http://localhost:4173/
```

## Verification results

- Subagent room routing check: OK.
- Active Kanban assignees include `launchmini`, `uimini`, `backendmini`, `balanceqa`.
- Git branch guard: OK on `zombie_only`.
- Focused tests: **7 files / 67 tests passed**.
- Production build: OK.
- Legal page generator: OK, regenerated:
  - `hosting/delete-account.html`
  - `hosting/privacy.html`
  - `hosting/terms.html`
- Public legal URLs:
  - `https://escape-zombie-school.web.app/privacy` → HTTP 200, title `개인정보처리방침 · Escape! Zombie School`
  - `https://escape-zombie-school.web.app/terms` → HTTP 200, title `이용약관 · Escape! Zombie School`
  - `https://escape-zombie-school.web.app/delete-account` → HTTP 200, title `계정 및 데이터 삭제 · Escape! Zombie School`
- Local production preview:
  - `http://localhost:4173/` → HTTP 200 via `localhost`
  - `http://127.0.0.1:4173/` → Vite host guard returned 403; use `localhost` for preview checks.
- Browser smoke:
  - `http://localhost:4173/` loaded title screen.
  - Title: `탈출! 좀비학교🧟‍♀️🏫❤️`
  - Visible UI: Google account panel, disabled Google login button when Firebase env unavailable in preview, game start button.
  - Console errors: 0.

## Passed / acceptable areas

### First-run consent UI
Files:
- `src/components/ConsentGate.jsx`
- `src/components/ConsentGate.test.jsx`
- `src/lib/legalDocuments.js`

Confirmed:
- Terms and privacy policy are separate required consent items.
- Master `전체 동의` toggles all required items.
- `확인하고 시작` stays disabled until every item is checked.
- Each document has `전문보기` / `접기` UI.
- `recordConsent(user)` is called only after all required checks.
- Save failure keeps the gate open and shows an error.
- Cancel/close path does not enter the lobby.
- Dialog semantics exist: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.

### Settings legal UI
Files:
- `src/components/LobbySettingsModal.jsx`
- `src/components/LobbySettingsModal.test.jsx`

Confirmed:
- Settings contains a legal notice section.
- Terms full text can be opened.
- Privacy policy full text can be opened.
- Account deletion entry point exists in settings.
- Account deletion has a second explicit confirmation step.
- Recent-login / reauthentication path is represented in UI/tests.

### Legal/public hosting
Files:
- `src/lib/legalDocuments.js`
- `scripts/build-legal-pages.mjs`
- `firebase.json`
- `hosting/*.html`

Confirmed:
- Single source legal text exists in `legalDocuments.js`.
- Static pages build from that source.
- Public privacy/terms/delete-account pages are live with HTTP 200.

## Findings requiring fixes before Play production confidence

### P0 / High — RTDB rules likely reject consent storage
Evidence:
- `src/lib/firebaseProgress.js:348-356` includes top-level `consent` in the remote payload when consent exists.
- `database.rules.json:5-50` allows/validates `schemaVersion`, `updatedAt`, `profile`, `progress`, optional `activity`, then blocks unknown top-level children with `$other.validate=false`.
- No `consent` validation node exists under `users/$uid`.

Impact:
- In production, `recordConsent()` can fail because the update containing `consent` is rejected by Firebase Realtime Database rules.
- User may get stuck in a repeated consent-save failure loop.
- Existing mocked/unit tests do not catch this rules mismatch.

Recommended fix:
- Add `consent` validation under `users/$uid` in `database.rules.json`.
- Validate `terms.version`, `terms.acceptedAt`, `privacy.version`, `privacy.acceptedAt`.
- Add `src/lib/databaseRules.test.js` coverage for consent accepted/rejected cases.

### P0 / High — Privacy/terms say ranking records are deleted, but implementation only deletes current daily/weekly buckets
Evidence:
- `src/lib/legalDocuments.js:72-75` says account deletion deletes progress, in-game currency, and ranking records.
- `src/lib/legalDocuments.js:107-110` says progress and ranking records are deleted without delay on account deletion request.
- `src/lib/firebaseRanking.js:140-146` states only active season's current daily + weekly ranking buckets are deletable by client.
- `src/lib/accountDeletion.js:21-27` treats ranking deletion as best-effort and still continues.
- `src/lib/accountDeletion.js:65` can return `ok: true` even if ranking deletion had failed paths.

Impact:
- Policy text and implementation are inconsistent.
- Google Play account/data deletion review risk.

Recommended fix:
- Best: implement server/Admin SDK/Cloud Function deletion for all ranking records for the uid.
- Then update tests to prove all relevant ranking namespaces are removed.
- If server deletion is not ready, adjust legal copy and public delete page very carefully so it does not promise broader deletion than the app/operator can actually perform.

### P1 — Privacy policy omits some Google Auth data that the app processes/displays
Evidence:
- `src/lib/legalDocuments.js:89-99` lists Google account identifier and display name; says email itself is not stored in game DB.
- `src/lib/firebaseAuth.js:38-48` maps `email`, `photoURL`, `emailVerified`, `providerIds` into the app auth user object.
- `src/components/GoogleAccountPanel.jsx:40-49` displays profile photo and email when signed in.

Impact:
- Even if email/photo are not stored in game DB, the app processes and displays them.
- Google Play Data safety / privacy policy could be considered incomplete.

Recommended fix options:
1. Code-minimize: stop mapping/displaying email and photoURL if not necessary.
2. Policy-align: disclose Google/Firebase Auth email/profile photo URL/email verification/auth metadata processing and align Play Data safety answers.

### P1 — Login-to-consent hydration race risk
Evidence:
- `src/components/TitleScreen.jsx:303-305` assumes `ensureStudioCloudReady(user)` makes `needsConsent(user)` accurate.
- `needsConsent()` returns true until Firebase player progress is hydrated: `src/lib/consent.js:18-23`.
- `recordConsent()` calls `writeFirebasePlayerConsent()`, which throws if progress runtime is not hydrated: `src/lib/firebaseProgress.js:195-199`, `360-363`.

Impact:
- A user may sign in and immediately press through consent before player progress hydration completes, causing save failure.

Recommended fix:
- Gate `needsConsent()` / `ConsentGate` behind explicit player progress hydration completion, not Studio cloud readiness.
- Update the misleading TitleScreen comment.

### P2 — Settings legal accordions need accessibility parity with ConsentGate
Evidence:
- `ConsentGate.jsx:176-180` uses `aria-expanded` and `aria-controls` for document expanders.
- `LobbySettingsModal.jsx:253-277` legal buttons lack `aria-expanded`, `aria-controls`, and panel ids.

Recommended fix:
- Add `aria-expanded`, `aria-controls`, and corresponding panel `id` for terms/privacy settings panels.
- Add tests in `LobbySettingsModal.test.jsx`.

### P2 — Settings modal lacks Escape/focus-trap behavior and deletion-in-progress close guard
Evidence:
- `ConsentGate.jsx:45-75` handles Escape and basic focus loop.
- `LobbySettingsModal.jsx:111-115` has scrim/X close but no Escape/focus trap.
- `LobbySettingsModal.jsx:144-194` disables delete/cancel buttons while deleting, but scrim/X remain active.

Recommended fix:
- Add dialog ref, initial focus, Escape close, and Tab loop similar to `ConsentGate`.
- Disable/ignore scrim and X while `deleteStage === 'deleting'` or `reauthBusy`.
- Add tests for Escape, focus behavior, scrim close, and deletion-in-progress close prevention.

### P2 — Mobile nested legal text scroll could be improved
Evidence:
- ConsentGate body scroll: `ConsentGate.jsx:284-290`.
- Inner legal text scroll: `ConsentGate.jsx:364-372`.
- Settings modal scroll: `LobbySettingsModal.jsx:314-320`; legal panel scroll is in the same component styles.

Recommended fix:
- Add `WebkitOverflowScrolling: 'touch'` to legal text panels.
- Consider a short hint that the legal text panel itself scrolls.

## Remediation update — 2026-07-31 01:24:36 local

Hana continued the audit findings through implementation and verification.

### Fixes applied after this audit

- **P0 / High consent RTDB rules**: fixed.
  - `database.rules.json` now validates top-level `users/$uid/consent`.
  - `src/lib/databaseRules.test.js` covers valid consent writes and rejects malformed consent / unknown children.
- **P0 / High account deletion ranking/legal copy mismatch**: fixed by policy-aligned wording for the current client-side deletion scope.
  - `src/lib/legalDocuments.js` no longer over-promises full historical ranking deletion by the client.
  - Legal copy now explains progress deletion, active daily/weekly ranking deletion attempts, and email-verified deletion requests for older/additional ranking records.
  - `src/lib/legalDocuments.test.js` covers the adjusted wording.
- **P1 Google Auth privacy disclosure**: fixed.
  - Privacy policy now discloses processing/display of Google/Firebase Auth email, profile photo URL, email verification state, and provider metadata.
  - It still states email/profile photo URL are not stored in the game DB.
- **P1 login-to-consent hydration race**: fixed.
  - `TitleScreen.jsx` explicitly hydrates Firebase player progress before `needsConsent(user)` is evaluated.
  - `TitleScreen.settings.test.jsx` covers the race.
- **P2 settings legal accessibility**: fixed.
  - `LobbySettingsModal.jsx` legal buttons now expose `aria-expanded` / `aria-controls`; panels have ids, `role="region"`, and labels.
  - `LobbySettingsModal.test.jsx` covers this.
- **P2 settings modal Escape/focus/delete busy UX**: fixed.
  - Settings modal now supports Escape close and focus trapping.
  - Scrim/X/Escape close are disabled/ignored while account deletion or reauth is busy.
  - `LobbySettingsModal.test.jsx` covers this.
- **P2 mobile legal panel scroll**: fixed.
  - Settings legal panels now include `WebkitOverflowScrolling: 'touch'`.
- **Preview browser smoke localStorage check**: verified.
  - Local production preview was reloaded after the implementation fixes.
  - The title screen loaded without the fatal localStorage dialog.
  - Current `studioLocalStorageGuard.js` remains scoped to Graphics Studio localStorage families and does not require an additional Firebase RTDB host-cache code change for this verified build.

### Verification after fixes

```bash
npx vitest run src/lib/studioLocalStorageGuard.test.js
npm test -- --run src/lib/studioLocalStorageGuard.test.js src/lib/databaseRules.test.js src/lib/legalDocuments.test.js src/lib/accountDeletion.test.js src/components/TitleScreen.settings.test.jsx src/components/LobbySettingsModal.test.jsx
npm run build:legal && npm run build
npm run preview -- --host 127.0.0.1
curl -I -sS -H 'Host: localhost:4173' http://127.0.0.1:4173/
```

Results:

- `src/lib/studioLocalStorageGuard.test.js`: **1 file / 10 tests passed**.
- Focused suite: **6 files / 63 tests passed**.
- Pretest gates: branch guard OK, title surface canonical OK, canonical title BGM OK, legacy B02 source gate OK.
- `npm run build:legal`: OK; regenerated `hosting/delete-account.html`, `hosting/privacy.html`, `hosting/terms.html`.
- `npm run build`: OK; postbuild artifact gates passed.
- Public legal URLs rechecked:
  - `https://escape-zombie-school.web.app/privacy` → HTTP 200
  - `https://escape-zombie-school.web.app/terms` → HTTP 200
  - `https://escape-zombie-school.web.app/delete-account` → HTTP 200
- Local production preview:
  - `http://localhost:4173/` loads the title screen.
  - Visible UI: Google account panel, Google login button, title heading, game start button.
  - Fatal localStorage dialog: **not present in the verified build**.
  - Browser console messages/errors: **0 / 0**.

### Remaining non-blocking note

- Vitest still prints existing React `act(...)` environment warnings in several jsdom component tests. They did not fail the suite.
- Vite build still prints large chunk warnings, especially `vendor-three`; this is a performance/code-splitting warning, not a correctness failure.

## Notes

- Original audit commands passed but identified release-confidence blockers; the remediation update above records the fixes and final verification evidence.
