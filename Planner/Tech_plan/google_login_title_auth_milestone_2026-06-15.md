# Google Login Title Auth Milestone

Date: 2026-06-15

## Scope

Add the first Google account login milestone to the title screen.

- Use Firebase Authentication with the Google provider.
- Read Firebase web config from Vite `.env` variables.
- Do not commit real Firebase keys.
- Keep permanent progress storage local for this milestone.
- Prepare the client for the later Firestore and Cloud Functions progress-save milestone.

## Player Flow

1. The title screen shows a compact Google account panel.
2. If Firebase env variables are missing, the panel shows a setup-required state and disables login.
3. If Firebase is configured, the panel checks the stored auth session.
4. Signed-out users can press `Google로 로그인`.
5. Signed-in users see their display name, email, avatar when available, and a logout button.

## Out Of Scope

- Firestore progress subscription.
- Server-owned coin total.
- Server-owned passive purchases.
- Cloud Functions validation for run results.
- Guest-to-account migration.

Those items remain in `Planner/Tech_plan/google_login_secure_cloud_save_design_2026-06-14.md`.
