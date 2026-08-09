# Stage 2 guard chase visible-screen graphics record (2026-08-09)

- Kanban: `t_8f459fee`
- Visual requirement: the Stage 2 RZT fugitive/barbary-man and six RZG security guards must be visible when their chase formation spawns.
- Graphics boundary: no monster model, toon material, outline, Studio tuning, texture, title, or Firebase visual-state path was changed.
- Runtime visual fix: formation spawn positions now use current screen bounds and keep the entire trailing guard formation inside the visible area with inset, so no member begins outside the camera view.
- Verification boundary: browser/build/tests were skipped by user; verification is limited to code diff and direct file inspection.
