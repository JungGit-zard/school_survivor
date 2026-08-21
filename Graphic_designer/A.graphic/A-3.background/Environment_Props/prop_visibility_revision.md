# Prototype Prop Visibility Revision

## Problem

The first school prop pass was technically present, but it was too subtle in the 720 x 1280 mobile view. Props were small, low-contrast, and looked like background noise instead of readable school objects.

## Revision Direction

The prototype now uses bigger, higher-contrast pixel props and fixed school landmarks near the starting camera area.

Large landmark props:

- `prop_blackboard_pixel`: classroom blackboard
- `prop_classroom_desk_cluster_pixel`: grouped classroom desks
- `prop_school_door_pixel`: classroom door
- `prop_notice_board_pixel`: hallway notice board

Existing scattered props were also made larger and more opaque:

- `prop_fallen_desk_pixel`
- `prop_chair_pile_pixel`
- `prop_locker_pixel`
- `prop_warning_sign_pixel`
- `prop_barricade_pixel`
- `prop_exam_papers_pixel`
- `prop_window_shadow_pixel`

## Implementation Rules

- The first visible screen must immediately suggest a school classroom or hallway.
- Important props need dark outlines, bright readable surfaces, and clear silhouettes.
- Random small props can support atmosphere, but fixed landmarks carry the setting.
- Player and monsters remain fully Three.js toon-rendered.
- Background and school props remain Phaser 2D pixel graphics.
