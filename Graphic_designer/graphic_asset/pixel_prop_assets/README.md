# Pixel Prop Assets

Escape! zombie school prototype school prop base assets.

The current game creates matching Phaser textures in code with `Graphics.generateTexture()`.
These SVG files are kept as source references for later PNG spritesheet replacement.

## Asset List

| File | Game Texture Key | Purpose |
| --- | --- | --- |
| `prop_fallen_desk_pixel.svg` | `prop_fallen_desk_pixel` | Fallen classroom desk |
| `prop_chair_pile_pixel.svg` | `prop_chair_pile_pixel` | Piled chairs |
| `prop_locker_pixel.svg` | `prop_locker_pixel` | School lockers |
| `prop_warning_sign_pixel.svg` | `prop_warning_sign_pixel` | Infection warning sign |
| `prop_barricade_pixel.svg` | `prop_barricade_pixel` | Temporary desk barricade |
| `prop_exam_papers_pixel.svg` | `prop_exam_papers_pixel` | Scattered exam papers |
| `prop_window_shadow_pixel.svg` | `prop_window_shadow_pixel` | Broken window shadow |
| `prop_blackboard_pixel.svg` | `prop_blackboard_pixel` | Large classroom blackboard |
| `prop_classroom_desk_cluster_pixel.svg` | `prop_classroom_desk_cluster_pixel` | Grouped classroom desks |
| `prop_school_door_pixel.svg` | `prop_school_door_pixel` | School classroom door |
| `prop_notice_board_pixel.svg` | `prop_notice_board_pixel` | Hallway notice board |

## Visibility Rules

- Pixel props must read clearly at 720 x 1280 mobile framing.
- Important school identity props should be large enough to recognize in one glance.
- Props need dark outlines and brighter top surfaces so they do not disappear into the floor.
- Phaser can use procedural textures for the prototype, but final production should replace these with exported PNG spritesheets.
