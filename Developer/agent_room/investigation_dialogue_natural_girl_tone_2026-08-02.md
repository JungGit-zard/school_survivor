# Investigation Dialogue Natural Girl-Tone Comedy Rewrite QA Note

Date: 2026-08-02
Board: escape-zombie-school

## Request

Do not put the literal word `당황` in every investigation line. Instead, write the best naturally comedic zombie-school investigation lines. Also avoid stiff `했다` narration and use friendly young-girl endings such as `했어`.

## Subagent mandatory routing

Board: escape-zombie-school
Trigger: Escape! zombie school content/copy implementation request touching investigation dialogue and regression tests.
Specialists involved: levelmini, balanceqa
Cards/artifacts/review trail: This artifact is written explicitly for levelmini content-tone routing and balanceqa acceptance review.

## Implementation scope

- `Developer/r3f_prototype/src/lib/investigationDialogue.js`
  - Removed literal `당황` usage from sampled investigation lines.
  - Rewrote dialogue into short, gentle girl-tone narration (`했어`, `같아`, `이야`, etc.).
  - Preserved silly zombie-school investigation comedy and deterministic selection.
- `Developer/r3f_prototype/src/lib/investigationDialogue.test.js`
  - Replaced forced `당황` assertions with checks for short, first-person, non-`했다` girl-tone comedic lines.
  - Added guard that literal `당황` is not overused.

## Verification

```text
sample scan
sampleCount=29
max=36
stiffCount=0
literalDanghwangCount=0
misses=0
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
