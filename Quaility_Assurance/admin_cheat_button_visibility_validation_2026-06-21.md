# Admin cheat button visibility validation

Date: 2026-06-21

## Scope

- Admin config default and persistence.
- Admin UI checkbox for cheat menu button visibility.
- Title screen hiding of the top cheat menu button when admin operations disable it.
- 1280 x 720 admin layout fit.

## Commands

```powershell
npx.cmd vitest run src/lib/adminConfig.test.js src/components/AdminPage.test.jsx src/components/TitleScreen.settings.test.jsx --maxWorkers=1 --no-file-parallelism
npx.cmd vitest run --maxWorkers=1 --no-file-parallelism
npm.cmd run build
```

## Results

- Targeted tests: 3 files, 19 tests passed.
- Full tests: 54 files, 293 tests passed.
- Production build: passed.
- Browser check: `/admin` at 1280 x 720 contains one `cheatMenuButtonVisible` checkbox and no page overflow.
- Screenshot: `Quaility_Assurance/screenshots/admin-cheat-button-visibility-1280x720.png`

## Decision

- Passed for private testing admin control.
