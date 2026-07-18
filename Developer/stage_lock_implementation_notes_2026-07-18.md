# Stage Lock implementation notes — 2026-07-18

Task: t_b8995205 — Create simple low-poly 3D stage lock and register it in Graphics Studio.

## Implemented code paths
- `Developer/r3f_prototype/src/components/StageLock.jsx`
  - Exports `StageLockModel` wrapped by `StudioTunedGroup` with shared item id `stage-lock`.
  - Exports `StageLockPreview` as a reusable Canvas component for future lobby use.
  - Uses low-poly box/cylinder geometry, cached toon materials, and outline materials.
  - Keeps the shackle collars as simple small box blocks around the two shackle bases.
  - Rotates the circular keyhole face by `Math.PI / 2` so the dark keyhole visibly faces the positive-Z/front preview camera side.
  - Keeps Studio selection metadata in `userData` only; removed DOM-style dashed `data-*` props because React Three Fiber treats dashed props as nested object paths and they broke the live Studio canvas.
  - Does not assign `studioPartId`; stable child order lets the documented numeric scene-tree path select parts.
- `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`
  - Adds `STAGE_LOCK_STUDIO_ITEM_ID`.
  - Registers Stage Lock under the Graphics Studio `ui` category with preview kind `stageLock` and apply targets.
- `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`
  - Imports `StageLockModel`.
  - Adds `stageLock` camera framing and preview rendering.
- Focused tests:
  - `Developer/r3f_prototype/src/components/StageLock.test.jsx`
  - `Developer/r3f_prototype/src/lib/graphicsStudioStageLock.test.js`

## Non-goals preserved
- Did not modify `Lobby.jsx`.
- Did not add assets, gameplay logic, animation, physics, audio, or new persistence/default tuning paths.
- Did not commit or push.

## Verification commands
- `npm test -- --run src/lib/graphicsStudioStageLock.test.js src/components/StageLock.test.jsx` — PASS, 2 files / 7 tests.
- Browser runtime verification at `http://127.0.0.1:5174/graphics-studio#stage-lock` — PASS: Stage Lock renders as a 3D toon preview with gold body, silver U-shaped shackle, box collars, and front keyhole after removing dashed `data-*` props.
- `git diff --check` — reports CRLF-added-line false positives in existing CRLF-tracked files under this bash config.
- `git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --check` — PASS, with unrelated working-copy LF→CRLF warnings only.
