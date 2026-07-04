# Shared Google Account Best Ranking

Date: 2026-07-04

## Change

- Ranking submissions now store each Google user's best score under:

```text
rankings/{seasonId}/entries/{uid}
```

- Each entry stores the submitting Google `uid`.
- Existing same-user scores are overwritten only when the new score is higher.
- Different Google accounts each keep one best-score record.

## Runtime Behavior

- Game end still calls `submitRankingEntry(user, entry, seasonId)` only when a Google user exists.
- Ranking page reads the shared season path:

```text
rankings/{seasonId}/entries
```

- The UI displays Top 100 from all Google accounts' best records.
- If legacy duplicate records exist, UI merge keeps the best record per `uid`.

## Firebase Rules Needed

The code writes shared account-best records, but Firebase Console Rules must also allow authenticated users to share the ranking path.

Minimum direction:

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
            ".write": "auth != null && auth.uid === $uid && newData.exists() && newData.child('uid').val() === auth.uid && newData.child('score').isNumber() && (!data.exists() || !data.child('score').isNumber() || newData.child('score').val() > data.child('score').val())"
          }
        }
      }
    }
  }
}
```

Existing `users/{uid}` rules should stay private to the matching uid.
