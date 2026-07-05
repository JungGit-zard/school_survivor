# Lobby Stage Boss Preview

Date: 2026-07-05

## Change

- Replaced the lobby card's temporary block monster preview with the real `EnemyVisual` runtime model.
- All stage cards currently show the Stage 1 boss model `B01`.
- The preview uses `animPhase="normal"` so the existing idle animation runs in the card.
- Enlarged the preview camera zoom so the boss fills more of the graphics space.
- Removed the old square `STAGE` badge from the stage card header.
- Promoted the stage title to a larger top-left card hero line using `Stage 1 - 교실 생존` format.
- Added a shared `StageBossPreview` component so the lobby and Graphics Studio render the same boss preview frame.
- Added saved stage boss preview framing values: `zoom`, `panX`, and `panY`.
- Graphics Studio now syncs stage boss preview framing to the connected game window through the existing studio game bridge.
- Overlaid the stage title, clear tag, and best-record text on top of the lobby boss preview.
- Right-aligned the overlaid stage title, clear tag, and best-record text.
- Increased the lobby boss preview area height to `126px`.
- Fixed stage boss preview zoom so changing `zoom` recreates the R3F camera with the new value.
- Moved the `입장하기` button into the boss preview section.
- Moved the cleared-stage `클리어` badge to the top-left of the boss preview.
- Split the stage title into two lines: stage label first, Korean stage title below.
- Moved the `점수 레코드` button into the boss preview as a small button below the clear badge.
- Reduced stage card inner padding and expanded the boss preview height.
- Changed the lobby ambient light layer from a horizontal loop to random full-screen drift.
