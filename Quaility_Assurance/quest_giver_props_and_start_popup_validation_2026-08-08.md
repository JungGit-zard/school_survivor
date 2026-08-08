# Quest giver Props and start popup validation

Date: 2026-08-08

## Scope

- Stage 1 `stage1-talk-book` starts only when its canonical giver placement exists.
- Graphics Studio labels and colors quest givers separately, including Stage 2 copy placements, and restores them only through the explicit action.
- Quest-start toast is a large centered popup; item and completion toasts remain compact.
- Stage 4 is included in normalized Firebase Studio prop placements.

## Automated validation

Passed:

```text
npx vitest run src/components/StagePropPlacementEditor.questGivers.test.jsx src/components/StudentDialogueTrigger.runtime.test.jsx src/components/HUD.questInventory.test.jsx src/components/StudentDialogueTrigger.test.jsx src/lib/stagePropPlacements.test.js src/lib/quests.test.js src/lib/firebaseStudio.test.js

Test Files  7 passed (7)
Tests       45 passed (45)
```

Earlier production build validation passed with `npm run build` after the source changes. The final correction updated test expectations only.

## Browser limitation

The browser reached the Firebase-auth-gated entry. No Firebase authentication, local storage, or stage-entry bypass was added, so authenticated in-game visual confirmation was not available in this run.
