# Ranking Score Policy Validation - 2026-06-21

## Scope

Validate that the documented ranking score policy is applied to the game ranking code.

## Requirements Checked

- `Planner/B. GAME_DESIGN/rank_score.md` exists.
- Stage 1 180s = 180.
- Stage 1 clear = 270.
- Stage 2 180s = 240.
- Stage 2 clear = 330.
- Ranking rows sort by score and tie-breakers.
- Ranking UI displays score as the primary ranking value.

## TDD Red Check

Command:

```powershell
npm test -- src/lib/rankingScorePolicy.test.js src/lib/userRanking.test.js src/components/UserRanking.test.jsx
```

Initial result:

```text
Test Files 3 failed (3)
Cannot find module './rankingScorePolicy.js'
expected html to contain '330점'
```

This was the expected failure before implementing the score policy.

## Focused Verification

Command:

```powershell
npm test -- src/lib/rankingScorePolicy.test.js src/lib/userRanking.test.js src/components/UserRanking.test.jsx
```

Result:

```text
Test Files 3 passed (3)
Tests 9 passed (9)
```

## Full Verification

Command:

```powershell
npm test
```

Result:

```text
Test Files 51 passed (51)
Tests 280 passed (280)
```

Command:

```powershell
npm run build
```

Result:

```text
✓ built in 1.82s
```

Vite emitted the existing large chunk warning. This is not a ranking score policy failure.

## Browser Verification

Target:

```text
http://127.0.0.1:5189/
```

Injected local records:

```json
{
  "bestSurvivalSeconds": 240,
  "stage1Clears": 1,
  "stage2BestSurvivalSec": 240,
  "stage2Clears": 1
}
```

Result:

```json
{
  "hasScoreHeader": true,
  "hasScore330": true,
  "hasStage2Clear": true,
  "firstRow": "1위테스트 생존자ME330점Stage 2 · 4:00 · 클리어",
  "rowCount": 100
}
```

Screenshot:

- `Quaility_Assurance/ranking_score_policy_page_2026-06-21.png`
