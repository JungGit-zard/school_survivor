# Classroom Prop Black Blob Validation

Date: 2026-06-09

## Validation Scope

Validated the StageObject black-blob fix for classroom desk, chair, and unconscious student props.

## Automated Checks

Command:

```powershell
npm test -- src/components/StageObjects/stageObjectAssets.test.jsx src/components/StageObjects/stageObjectPlacements.test.js --pool=threads
```

Result:

- 2 test files passed.
- 14 tests passed.

Command:

```powershell
npm run build
```

Result:

- Build passed.
- Existing Vite chunk-size warning remains.

## Static Checks

- `StageObjects` contains no direct `castShadow receiveShadow` usage.
- `StageObjects` no longer calls the global `inflateScale()` helper.
- Remaining `castShadow` and `receiveShadow` strings in `StageObjects` are limited to the common disabled setting and regression tests.

## Runtime Check Guidance

Open:

```text
http://127.0.0.1:5178/?prop-shadow-fix=1
```

Manual checks:

- Stage 1 desk/chair clusters should not have static black floor slabs.
- Player's own local circular shadow may still appear under the player and should not be confused with prop blobs.
- Stage 2 desks should still read clearly without prop shadows.

## Residual Risk

The in-app browser was unavailable in this session, so visual confirmation was opened in the system browser. The served source on port `5178` was checked and contained the new prop rendering helper.
