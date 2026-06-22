# Admin cheat button visibility setting

Date: 2026-06-21

## Summary

- Added an admin operations setting for title cheat menu button visibility.
- Default: `cheatMenuButtonVisible = true`.
- Storage path: `school_survivor:adminConfig.operations.cheatMenuButtonVisible`.
- The title screen reads the admin setting and hides the top cheat menu button when the value is `false`.

## Files

- `Developer/r3f_prototype/src/lib/adminConfig.js`
- `Developer/r3f_prototype/src/components/AdminPage.jsx`
- `Developer/r3f_prototype/src/components/TitleScreen.jsx`

## Notes

- This controls only the visible title cheat menu button.
- Existing title settings and ranking controls are unchanged.
