# Firebase Realtime Database Rules Todo

Date: 2026-07-04

## Goal

Make every Google signed-in player's best ranking record shared at:

```text
rankings/{seasonId}/entries/{uid}
```

## Do First

1. Open Firebase Console.
2. Select this game's Firebase project.
3. Open Authentication and confirm Google sign-in is enabled.
4. Open Realtime Database.
5. Open the Rules tab.
6. Copy the current rules into a local note before editing.

## Rules To Publish

Use this as the minimum production rule for ranking sharing:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "rankings": {
      "$seasonId": {
        "entries": {
          ".read": "auth != null",
          "$uid": {
            ".write": "auth != null && auth.uid === $uid && newData.exists() && newData.child('uid').val() === auth.uid && newData.child('score').isNumber() && (!data.exists() || !data.child('score').isNumber() || newData.child('score').val() > data.child('score').val())",
            ".validate": "newData.hasChildren(['uid', 'displayName', 'score', 'survivalSeconds', 'stageId']) && newData.child('uid').val() === $uid && newData.child('displayName').isString() && newData.child('score').isNumber() && newData.child('score').val() >= 0 && newData.child('survivalSeconds').isNumber() && newData.child('survivalSeconds').val() > 0 && (newData.child('stageId').val() === 'stage1' || newData.child('stageId').val() === 'stage2')"
          }
        }
      }
    },
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

## Publish Checklist

1. Paste the rules into Firebase Console > Realtime Database > Rules.
2. Click Publish.
3. Sign in to the game with Google account A.
4. Finish or pause a run so a score is submitted.
5. In Realtime Database Data tab, confirm a record exists under `rankings/{seasonId}/entries/{accountAUid}`.
6. Confirm that child has `uid`, `displayName`, `score`, `survivalSeconds`, and `stageId`.
7. Submit a lower or equal score from the same Google account.
8. Confirm the existing account A record was not overwritten.
9. Submit a higher score from the same Google account.
10. Confirm the same `accountAUid` record was updated, not duplicated.
11. Sign in with Google account B.
12. Open ranking UI and confirm account A's score appears.
13. Submit account B's score and confirm both accounts' best records remain.

## Failure Checks

- If ranking read fails, check that `.read` exists at `rankings/$seasonId/entries`.
- If score submit fails, check that the submitted `uid` equals the signed-in `auth.uid` and the new score is higher than the saved score.
- If no Firebase data appears, check `VITE_FIREBASE_DATABASE_URL` in the runtime environment.
- If old console edits disappear later, check whether Firebase CLI deployment overwrote console rules.

## References

- Firebase Realtime Database Rules define who can read and write database paths: https://firebase.google.com/docs/database/security
- Firebase Auth populates the `auth.uid` value used by Realtime Database Rules: https://firebase.google.com/docs/database/security/rules-conditions
- Firebase Console rules can be edited at Realtime Database > Rules: https://firebase.google.com/docs/rules/manage-deploy
