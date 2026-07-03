# Matilda forward lean validation - 2026-07-03

## Checks

- `npm test -- src/components/MatildaMesh.test.js`
  - Result: 1 file passed, 12 tests passed.
- `npm test -- src/components/GraphicsStudioPreview.test.js`
  - Result: 1 file passed, 2 tests passed.
- `npm test -- src/components/MatildaMesh.test.js src/components/GraphicsStudioPreview.test.js src/components/ZombieMesh.test.js src/components/GraphicsStudio.test.jsx src/lib/graphicsStudioConfig.test.js`
  - Result: 5 files passed, 29 tests passed.
- `npm run build`
  - Result: build passed.
  - Remaining warning: existing large chunk warning.
- Browser smoke opened `http://127.0.0.1:5175/graphics-studio#enemy-matilda`.
  - `Enemy / Matilda` label found.
  - Motion set to `charge`.
  - Canvas found at 607 x 500.
  - Canvas pixel check was non-blank.
  - Console/page errors: none.
- Browser smoke re-ran after connecting legs and boots to the moving body group at `http://127.0.0.1:5176/graphics-studio#enemy-matilda`.
  - `Enemy / Matilda` label found.
  - Motion set to `charge`.
  - Canvas found at 607 x 500.
  - Console/page errors: none.

## Evidence

- Screenshot: `Quaility_Assurance/screenshots/matilda-forward-lean-check-2026-07-03.png`
- Screenshot: `Quaility_Assurance/screenshots/matilda-forward-lean-connected-legs-check-2026-07-03.png`
