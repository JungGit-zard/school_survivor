# Ranking Score Policy CEO Decision - 2026-06-21

## Decision

User ranking should be based on survival progress, not farming output.

The first official direction is:

```text
Longer survival + farther stage progress = higher rank
```

## Recommended Formula Direction

For the first score policy:

```text
rankingScore = survivalSeconds + stageBonus + clearBonus
```

Suggested values:

```text
Stage 1: survivalSeconds + clearBonus
Stage 2: survivalSeconds + 60 + clearBonus
clearBonus: 30
```

Examples:

```text
Stage 1 180s survival = 180
Stage 1 clear = 240 + 30 = 270
Stage 2 180s survival = 180 + 60 = 240
Stage 2 clear = 240 + 60 + 30 = 330
```

## Why

- The product identity is a short survival game.
- Players can understand the rule immediately.
- Kill count and gold can over-reward farming, weapon balance quirks, or specific builds.
- Survival time maps directly to the player's goal: endure the infected school and escape.

## Security Boundary

Current client-side localStorage and Firebase personal progress should not be treated as official public leaderboard evidence.

Before public competitive ranking, add server validation such as Cloud Functions:

```text
finishRun -> validate -> updateProgress -> updateRankingEntry
```

Until then, ranking should be framed as personal, local, or unofficial test ranking.

## Follow-Up

- Create a pure `rankingScorePolicy` function before changing ranking implementation.
- Store score inputs separately: stageId, survivalSeconds, cleared, kills, submittedAt.
- Keep public leaderboard entries separate from personal progress records.
