# Cumulative Shared Google Ranking

Date: 2026-07-04

## Change

- Ranking submissions now append every Google user score under:

```text
rankings/{seasonId}/entries/{pushId}
```

- Each entry stores the submitting Google `uid`.
- Each entry stores `displayName`, using `entry.displayName`, `entry.nickname`, Google display name, then `익명`.
- Existing same-user scores are no longer overwritten or filtered out.

## Runtime Behavior

- Game end still calls `submitRankingEntry(user, entry, seasonId)` only when a Google user exists.
- Ranking page still reads the shared season path:

```text
rankings/{seasonId}/entries
```

- The UI displays Top 100 from the shared cumulative pool.
- All submitted records remain in Firebase unless manually deleted or pruned later.

## Firebase Rules Needed

The code writes cumulative shared records, but Firebase Console Rules must also allow authenticated users to share the ranking path.

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
          "$entryId": {
            ".write": "auth != null && newData.child('uid').val() === auth.uid"
          }
        }
      }
    }
  }
}
```

Existing `users/{uid}` rules should stay private to the matching uid.

