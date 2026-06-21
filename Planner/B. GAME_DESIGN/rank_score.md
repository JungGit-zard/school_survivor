# Rank Score Policy

> Date: 2026-06-21  
> Scope: Escape! zombie school user ranking score policy  
> Status: Active design policy for the current ranking implementation

## 1. Core Decision

Ranking is based on survival progress, not farming output.

The player-facing rule is:

```text
The longer you survive, the higher your score.
Harder stages and stage clears add bonus points.
```

Korean UI copy:

```text
오래 버틸수록 점수가 높고, 어려운 스테이지와 클리어에는 보너스가 붙습니다.
```

## 2. Rank Score Formula

```text
rankScore = survivalSeconds + stageBonus + clearBonus
```

Current values:

| Case | Formula | Score |
|---|---:|---:|
| Stage 1, 180s survival | 180 | 180 |
| Stage 1 clear | 240 + 30 | 270 |
| Stage 2, 180s survival | 180 + 60 | 240 |
| Stage 2 clear | 240 + 60 + 30 | 330 |

Constants:

```text
Stage 1 stageBonus = 0
Stage 2 stageBonus = 60
clearBonus = 30
```

Clear means the player survived until the stage duration.
Current Stage 1 and Stage 2 duration is 240 seconds.

## 3. Tie Breakers

When two entries have the same `rankScore`, sort by:

1. Cleared run first.
2. Higher stage first.
3. Longer survival time first.
4. Higher kill count first.
5. Earlier submitted/achieved time first.
6. Nickname 가나다순.

## 4. Values Excluded From Score

Do not include these values in the first ranking score:

- Gold.
- Total gold.
- Weapon unlock count.
- Passive upgrade level.
- XP.
- Level-up count.
- Total damage.

Reasons:

- They make the score harder for beginners to understand.
- They over-reward farming and balance quirks.
- They are unsafe for public competition before server validation.

## 5. Current Implementation Boundary

The current client can use this score for local and personal ranking display.

Public competitive ranking must not treat client-side `localStorage` or personal Firebase progress as trusted evidence.

Until server validation exists, public ranking should be framed as:

```text
personal record
local record
unofficial test ranking
```

## 6. Future Server-Validated Ranking

Official public ranking should use a separate leaderboard path from personal progress.

Recommended paths:

```text
leaderboards/global_survival_v1/entries/{uid}
leaderboards/stage1_survival_v1/entries/{uid}
leaderboards/stage2_survival_v1/entries/{uid}
```

Recommended entry fields:

```text
uid
nickname
score
scoreType = survival_v1
stageId
survivalSeconds
kills
cleared
runId
submittedAt
updatedAt
validationStatus
schemaVersion
```

Recommended server flow:

```text
finishRun -> validate -> updateProgress -> updateRankingEntry
```

The leaderboard entry is the official ranking source of truth.
Personal `users/{uid}/progress` remains a recovery/progression record, not a public competitive score source.
