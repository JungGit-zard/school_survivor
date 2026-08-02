# Investigation Dialogue Short Comedy Rewrite Routing / QA Note

Date: 2026-08-02
Board: escape-zombie-school

## Request

Shorten the comedic investigation monologues to about half length while preserving the key tone: silly prop/situation comedy and the pure, frail 17-year-old heroine getting flustered.

## Subagent mandatory routing

Board: escape-zombie-school
Trigger: Escape! zombie school content/copy implementation request touching investigation dialogue and regression tests.
Specialists involved: levelmini, balanceqa
Cards/artifacts/review trail: This artifact is written explicitly for levelmini content-tone routing and balanceqa acceptance review.

## Implementation scope

- `Developer/r3f_prototype/src/lib/investigationDialogue.js`
  - Recompressed all prop/student investigation lines to short one- or two-beat monologues.
  - Preserved comedic absurdity + flustered heroine persona.
  - Preserved deterministic selection and reward subject mappings.
- `Developer/r3f_prototype/src/lib/investigationDialogue.test.js`
  - Added a max-length assertion for selected dialogue lines.

## Verification

```text
length acceptance scan
misses=0
max=40
previousAvg=74.53571428571429
currentAvg=36.42857142857143
ratio=0.48873981792045995
```

```text
npm test -- src/lib/investigationDialogue.test.js src/lib/studentProximity.test.js src/components/StudentDialogueTrigger.test.jsx src/components/QuestWorldLayer.test.jsx src/store/useGameStore.studentDialogue.test.js src/lib/studentSearchRewards.test.js
Test Files  6 passed (6)
Tests  46 passed (46)
```

```text
npm run build
branch guard: ok
Title surface canonical gate passed.
Canonical title BGM source gate passed.
Legacy B02 source gate passed.
✓ built
Legacy B02 artifact gate passed (dist).
Title surface canonical gate passed.
Canonical title BGM artifact gate passed.
```
