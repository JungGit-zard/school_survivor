# Firebase Privacy Minimization and Account Deletion Gate - 2026-06-24

Project: Escape! zombie school
Role: Backend_Mini / 백엔드미니
Kanban task: t_3738e092
Scope: Google login + Firebase Realtime Database personal progress only. No official leaderboard, multiplayer, server economy, or new backend platform implementation.

## 0. Gate decision

Decision: a tiny code patch to stop writing `profile.email` and `profile.photoURL` to Firebase personal progress is safe to prepare now, but the full public-facing gate still needs Terry/launch decision before release.

Why the minimization patch is safe:

- Current cloud path is still private personal progress: `users/{uid}`.
- `email` and `photoURL` are not needed for progress backup.
- `GoogleAccountPanel.jsx` may still use `user.email` and `user.photoURL` in memory for the signed-in account panel, but they do not need to be persisted in Realtime Database.
- The patch does not add official ranking, multiplayer, server economy, or backend expansion.
- The patch can be verified with existing focused tests around `firebaseProgress.js`.

What still needs Terry or launch-side decision:

1. Whether Google login/cloud save stays enabled in the next internal/public-facing test build.
2. The live privacy policy URL and account deletion request channel/contact.
3. Whether account deletion is implemented as a simple request path first or a full in-app self-serve deletion flow.
4. Firebase Console Rules deployment and App Check enforcement timing, because repo-only code cannot prove the live console state.

Recommended release posture:

- If Google login/cloud save is enabled for any public-facing test: treat privacy policy, account deletion, Data safety, and Firebase rules as blockers.
- If Google login/cloud save is hidden/disabled for the test: Data safety scope can be reduced, but the app must not claim cloud save/account features in Play listing or release notes.

## 1. Evidence read

Required startup/project docs:

- `project_develop_policy.md`
- `Bang_Rules.md`
- `AGENTS.md`
- `SESSION_CONTINUITY.md`
- `CLAUDE.md`
- latest `SESSION_MEMORY.md` entry found in file: `Session 5 · Entry 2 · 2026-06-21 1117 KST` plus later appended notes in the same entry, including Google nickname/Firebase profile expansion.
- `CEO/current_product_priorities.md`

Required backend/launch/QA docs:

- `Developer/auto_deploy_backend_boundary_2026-06-24.md`
- `CEO/auto_deploy_google_play_readiness_gate_2026-06-24.md`
- `Quaility_Assurance/auto_deploy_integration_gate_2026-06-24.md`
- `Developer/firebase_realtime_database_security_review_2026-06-21.md`

Code inspected:

- `Developer/r3f_prototype/src/lib/firebaseProgress.js`
- `Developer/r3f_prototype/src/lib/firebaseAuth.js`
- `Developer/r3f_prototype/src/store/useAuthStore.js`
- `Developer/r3f_prototype/src/lib/firebaseProgress.test.js`
- `Developer/r3f_prototype/src/components/GoogleAccountPanel.jsx`
- `Developer/r3f_prototype/src/components/GoogleAccountPanel.test.jsx`

Environment/project checks:

- gstack gate returned `GSTACK_OK`.
- `git status --short --branch` shows a dirty worktree with many existing unrelated modified/untracked files, so this task should avoid broad changes and avoid commit/push.

## 2. Current data flow

Current auth object mapping in `firebaseAuth.js`:

```js
export function toAuthUser(user) {
  if (!user) return null
  return {
    uid: user.uid,
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    photoURL: user.photoURL ?? '',
  }
}
```

Current persisted Firebase profile in `firebaseProgress.js`:

```js
export function buildCloudUserProfile(user = cloudUser) {
  if (!user) return null
  return {
    uid: readString(user.uid),
    displayName: readString(user.displayName),
    email: readString(user.email),
    photoURL: readString(user.photoURL),
    nickname: getSavedNickname(user),
  }
}
```

Current personal progress path:

```text
users/{uid}
```

Current stored snapshot shape:

```text
users/{uid}
  profile.uid
  profile.displayName
  profile.email
  profile.photoURL
  profile.nickname
  schemaVersion
  updatedAt
  progress.goldTotal
  progress.records
  progress.weaponUnlocks
  progress.passiveUpgrades
  progress.titleSettings
```

Risk: Google `email` and `photoURL` are collected by Auth for the sign-in session and currently persisted into Realtime Database even though progress backup does not require them.

## 3. Target minimized schema

For Stage 1 personal progress backup, the cloud save should persist only:

```text
users/{uid}
  profile.uid
  profile.displayName
  profile.nickname
  schemaVersion
  updatedAt
  progress.goldTotal
  progress.records
  progress.weaponUnlocks
  progress.passiveUpgrades
  progress.titleSettings
```

Notes:

- Keep `uid`: required for identity/path consistency.
- Keep `displayName`: acceptable account display fallback, already visible in Google account UI.
- Keep `nickname`: user-chosen game display name and ranking/local display priority.
- Remove persisted `email`: not needed for gameplay/progress backup.
- Remove persisted `photoURL`: not needed unless the game intentionally displays profile images from cloud state. Current UI can display the in-memory Google auth `photoURL` without storing it.
- Keep `schemaVersion = 1` for this minimal removal unless a migration/reader requires version branching. Existing reads are not currently implemented, and optional missing fields are the safest narrow change.

## 4. Minimal patch proposal

Recommended code patch when Terry/maintainer approves implementation:

File: `Developer/r3f_prototype/src/lib/firebaseProgress.js`

```diff
 export function buildCloudUserProfile(user = cloudUser) {
   if (!user) return null
   return {
     uid: readString(user.uid),
     displayName: readString(user.displayName),
-    email: readString(user.email),
-    photoURL: readString(user.photoURL),
     nickname: getSavedNickname(user),
   }
 }
```

File: `Developer/r3f_prototype/src/lib/firebaseProgress.test.js`

```diff
   it('normalizes the Google user profile stored under the user path', () => {
     saveNicknameForUser({ uid: 'uid-1' }, '생존왕')
 
     expect(buildCloudUserProfile({
       uid: 'uid-1',
       displayName: 'Tester',
       email: 'tester@example.com',
       photoURL: 'https://example.com/me.png',
     })).toEqual({
       uid: 'uid-1',
       displayName: 'Tester',
-      email: 'tester@example.com',
-      photoURL: 'https://example.com/me.png',
       nickname: '생존왕',
     })
   })
```

Optional follow-up test hardening:

```js
expect(buildCloudUserProfile({
  uid: 'uid-1',
  displayName: 'Tester',
  email: 'tester@example.com',
  photoURL: 'https://example.com/me.png',
})).not.toHaveProperty('email')
```

Verification command:

```bash
cd Developer/r3f_prototype
npm test -- src/lib/firebaseProgress.test.js src/lib/firebaseAuth.test.js src/store/useAuthStore.cloudProgress.test.js src/components/GoogleAccountPanel.test.jsx
```

Expected result after patch:

- `firebaseProgress.test.js` passes with `profile.email` and `profile.photoURL` absent.
- `firebaseAuth.test.js` can still pass because in-memory auth session can keep email/photoURL for account UI.
- `GoogleAccountPanel.test.jsx` can still pass because UI display does not require Realtime Database persistence.
- Cloud save remains best-effort and does not block the offline/mobile loop.

## 5. Firebase Realtime Database Rules gate

Repo search found no `database.rules.json` in `Developer/r3f_prototype`, so live Firebase Console rules cannot be verified from this workspace.

Minimum live rules for personal progress:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

Recommended repo artifact before public-facing testing:

- Add a tracked rules proposal file, for example `Developer/firebase_realtime_database_rules_personal_progress_2026-06-24.json` or the Firebase-standard `database.rules.json` only if the project has a Firebase deploy workflow.
- Do not deploy rules from an agent unless Terry explicitly provides/approves Firebase project access and target.

Recommended validation direction after field minimization:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        "profile": {
          "uid": { ".validate": "newData.isString() && newData.val() === $uid" },
          "displayName": { ".validate": "newData.isString() && newData.val().length <= 80" },
          "nickname": { ".validate": "newData.isString() && newData.val().length <= 24" },
          "$other": { ".validate": false }
        },
        "schemaVersion": { ".validate": "newData.isNumber() && newData.val() === 1" },
        "updatedAt": { ".validate": "newData.isString()" },
        "progress": {
          "goldTotal": { ".validate": "newData.isNumber() && newData.val() >= 0" }
        }
      }
    }
  }
}
```

Caution:

- The strict `$other` rule should only be deployed after confirming the exact `progress.records`, `progress.weaponUnlocks`, `progress.passiveUpgrades`, and `progress.titleSettings` keys; otherwise legitimate saves may fail.
- Apply strict validation in stages: first uid read/write boundary, then profile minimization, then progress shape validation.

## 6. Account deletion readiness

Public-facing Google login means users need a clear way to request or perform account/data deletion.

Minimum acceptable Stage 1 path before public/open/production testing:

1. Privacy policy page/URL states what is collected:
   - Firebase Auth user ID.
   - Google display name and/or in-game nickname if stored.
   - Game progress: gold total, records, weapon unlocks, passive upgrades, title settings.
   - Local storage usage.
   - Explicitly state email/photoURL are not stored in progress after the minimization patch, if that patch lands.
2. Account deletion page or section states how to request deletion:
   - User signs in with the same Google account or provides enough account proof through the official support channel.
   - Operator deletes `users/{uid}` from Realtime Database and, if required, deletes/disables Firebase Auth user.
   - State expected processing time.
3. In-app settings/title account panel should eventually include a small `계정/데이터 삭제 안내` link or button.

Recommended staged implementation:

- Stage A, fastest gate: document/request flow only.
  - Create privacy/account deletion markdown or web page.
  - Add Play Console privacy policy URL.
  - Add support channel for deletion requests.
- Stage B, safer UX: in-app deletion instructions.
  - Add a non-destructive button/link in account panel or settings.
  - It opens the deletion instructions page or shows a modal with the request path.
- Stage C, self-serve deletion later:
  - Requires Firebase Auth reauthentication and careful handling of Realtime Database deletion.
  - Not required for Stage 1 loop and should not displace mobile gameplay stabilization.

Do not implement a destructive in-app delete button without a separate review. Account deletion is irreversible for cloud progress and should include reauthentication or explicit support verification.

## 7. Data safety implications

If Google login/cloud save is enabled and the minimization patch lands, likely declarations still include:

- User IDs: yes, Firebase UID/path identity.
- Name/display name or nickname: yes, if `displayName`/`nickname` are stored.
- App activity / game progress: yes, progress records, unlocks, gold, settings.

Likely reduced/avoided declarations after minimization:

- Email address stored in Realtime Database: no, if only used transiently by Firebase Auth/UI and not persisted by this app. Confirm with final implementation and Play Data safety interpretation.
- Profile photo URL stored in Realtime Database: no, if only used transiently by Auth/UI and not persisted by this app.

Still disclose/verify separately:

- Firebase Auth itself processes account identity as part of sign-in.
- Any Google/Firebase SDK behavior not visible in code should be checked against SDK docs and Play SDK/Data safety guidance.
- No analytics/crash/ads/IAP evidence was found in the inspected launch gate; future SDK additions change Data safety.

## 8. No official ranking / multiplayer boundary

This gate does not authorize any of the following:

- Public/global leaderboard.
- Server-validated ranking submission.
- Cloud Functions `finishRun`.
- Multiplayer or realtime battle sync.
- Server-authoritative economy/rewards.
- Supabase/PlayFab/Nakama/custom backend migration.

Current `users/{uid}/progress` remains a convenience backup for personal progress only. Local/client-derived records are not anti-cheat-safe and must not become public competitive data without later server validation.

## 9. Recommended task breakdown

### Task 1: Apply profile minimization patch

Objective: Stop persisting email/photoURL to Realtime Database personal progress.

Files:

- Modify: `Developer/r3f_prototype/src/lib/firebaseProgress.js`
- Modify: `Developer/r3f_prototype/src/lib/firebaseProgress.test.js`

Verification:

```bash
cd Developer/r3f_prototype
npm test -- src/lib/firebaseProgress.test.js src/lib/firebaseAuth.test.js src/store/useAuthStore.cloudProgress.test.js src/components/GoogleAccountPanel.test.jsx
```

### Task 2: Add Firebase rules proposal artifact

Objective: Record the exact personal-progress rules that Terry/ops can apply in Firebase Console.

Files:

- Create: `Developer/firebase_realtime_database_rules_personal_progress_2026-06-24.json` or project-standard `database.rules.json` after Firebase deploy workflow decision.

Verification:

- Confirm the rules include default deny and `auth.uid === $uid`.
- Do not claim live deployment unless Firebase Console deployment is actually performed and verified.

### Task 3: Add privacy/account deletion launch artifact

Objective: Give Launch_Mini/Play Console a concrete privacy/account deletion text source.

Suggested assignee: `launchmini` or a launch/privacy role, not backend-only.

Files:

- Create under `CEO/` or `marketing/` depending on final owner, for example `CEO/privacy_account_deletion_gate_2026-06-24.md`.

Must include:

- Data collected.
- Purpose.
- Retention/deletion.
- Deletion request path.
- Contact/support channel.
- Statement that official leaderboard/multiplayer are not enabled.

### Task 4: Optional in-app deletion instructions

Objective: Surface deletion instructions without implementing destructive self-serve deletion yet.

Files likely involved:

- `Developer/r3f_prototype/src/components/GoogleAccountPanel.jsx`
- related test file.

Need Terry decision first:

- What URL/contact should the button show?
- Whether the next internal test build should expose this UI.

## 10. Acceptance checklist

Before public-facing Google login/cloud save:

- [ ] `firebaseProgress.js` no longer persists `profile.email`.
- [ ] `firebaseProgress.js` no longer persists `profile.photoURL`.
- [ ] Focused Firebase/account panel tests pass.
- [ ] Firebase Realtime Database live rules restrict `users/{uid}` to `auth.uid === $uid`.
- [ ] `schemaVersion` remains present in every cloud snapshot.
- [ ] Privacy policy URL exists and matches actual data.
- [ ] Account deletion request/instruction path exists.
- [ ] Play Data safety form matches actual collection/storage.
- [ ] No official ranking/multiplayer/server economy was added.

## 11. Commands/tools run for this gate

```bash
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
git status --short --branch
python - <<'PY'
from pathlib import Path
p=Path('SESSION_MEMORY.md')
text=p.read_text(encoding='utf-8', errors='replace')
headers=[]
for i,line in enumerate(text.splitlines(),1):
    if line.startswith('## Session '): headers.append((i,line))
print('headers', len(headers))
if headers:
    start=headers[-1][0]
    lines=text.splitlines()
    end=len(lines)
    for j in range(start, len(lines)+1):
        if j>start and lines[j-1].startswith('## Session '):
            end=j-1; break
    print('\n'.join(f'{n}|{lines[n-1]}' for n in range(start, end+1)))
PY
```

Hermes tools used:

- `kanban_show(t_3738e092)`
- `skill_view(writing-plans)`
- `read_file` for required policy/backend/launch/QA docs and inspected source files.
- `search_files` for Firebase tests, deletion/account references, rules artifacts, and email/photoURL usage.
- `write_file` for this artifact.

## 12. Final recommendation

Backend recommendation: land the email/photoURL persistence removal as the only immediate code change for Firebase privacy minimization, then keep the rest as launch/ops gates. Do not add official leaderboard, multiplayer, server economy, or a new backend. Block public-facing Google login/cloud save until the live Firebase rules, privacy policy URL, account deletion path, and Play Data safety text are verified.
