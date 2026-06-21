# Ranking Score Policy Implementation - 2026-06-21

## Summary

Applied the Agent Room ranking score decision to the game ranking code.

The active formula is:

```text
rankScore = survivalSeconds + stageBonus + clearBonus
```

Current constants:

```text
Stage 1 stageBonus = 0
Stage 2 stageBonus = 60
clearBonus = 30
```

## Code Changes

- Added `Developer/r3f_prototype/src/lib/rankingScorePolicy.js`.
- Updated `Developer/r3f_prototype/src/lib/userRanking.js` to normalize ranking entries through the score policy.
- Updated `Developer/r3f_prototype/src/components/UserRanking.jsx` to display score as the primary ranking value.
- Updated ranking tests to cover the score policy and UI output.

## Data Behavior

The ranking row now carries:

```text
score
scoreType = survival_v1
survivalSeconds
stageId
stageLabel
kills
cleared
submittedAt
```

Local personal ranking chooses the best score between Stage 1 and Stage 2 records.
For example, Stage 2 220s becomes `220 + 60 = 280`, which beats Stage 1 180s.

## Boundary

This applies the policy to the current local/personal ranking display.
Official online public ranking still requires server validation before the score can be treated as competitive evidence.
