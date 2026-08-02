# Investigation Dialogue Comedy Rewrite Routing / QA Note

Date: 2026-08-02
Board: escape-zombie-school

## Request

Revise investigation monologues so prop investigation situations are as silly and comedic as possible, with the key point being the 17-year-old pure/frail heroine getting flustered by the absurd comedy.

## Subagent mandatory routing

Board: escape-zombie-school
Trigger: Escape! zombie school content/copy implementation request touching investigation dialogue and regression tests.
Specialists involved: levelmini, balanceqa
Cards/artifacts/review trail: This artifact is written explicitly for levelmini content-tone routing and balanceqa acceptance review.

## Implementation scope

- `Developer/r3f_prototype/src/lib/investigationDialogue.js`
  - Rewrote prop investigation lines from solemn/frail-only tone to absurd comedic situations.
  - Preserved protagonist persona: first-person, 17-year-old pure/frail schoolgirl, gentle and easily flustered.
  - Preserved deterministic selection and reward subject type mappings.
- `Developer/r3f_prototype/src/lib/investigationDialogue.test.js`
  - Updated expectations to require comedic/flustered language rather than only quiet/solemn language.

## Acceptance notes for balanceqa

- Comedy should come from the investigated prop/situation behaving absurdly or being interpreted absurdly.
- The heroine should react with embarrassment, surprise, confusion, or gentle fluster rather than becoming cynical or aggressive.
- Existing investigation reward subject mappings must remain unchanged.

## Verification

```text
node --input-type=module ... investigation dialogue acceptance scan
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
