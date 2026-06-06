# Weapon Graphics Archive

This folder is the canonical graphics archive for every weapon in Escape! zombie school.

## Required Structure

Every weapon folder must preserve:

- `original_icon.png`: copied source icon used as the 2D reference.
- `concept/`: art direction, 2D reference notes, and visual decisions.
- `implementation/`: notes about the current in-game 3D/VFX implementation.
- `qa_reference/`: screenshots, review notes, and visual validation evidence.

Do not remove or overwrite `original_icon.png`. If an icon changes, add a dated copy in the same weapon folder and update this index.

## Weapon Index

| No. | Weapon ID | Display Name | Folder | Source Icon |
| --- | --- | --- | --- | --- |
| 01 | `pencilThrow` | Pencil Throw | `01_pencilThrow/` | `original_icon.png` |
| 02 | `schoolBag` | 30cm Ruler | `02_schoolBag/` | `original_icon.png` |
| 03 | `tumbler` | Tumbler | `03_tumbler/` | `original_icon.png` |
| 04 | `scienceFlask` | Science Flask | `04_scienceFlask/` | `original_icon.png` |
| 05 | `bell` | Bell | `05_bell/` | `original_icon.png` |
| 06 | `stunGun` | Stun Gun | `06_stunGun/` | `original_icon.png` |
| 07 | `onigiri` | Onigiri | `07_onigiri/` | `original_icon.png` |
| 08 | `extraBattery` | Extra Battery | `08_extraBattery/` | `original_icon.png` |
| 09 | `starlink` | Starlink | `09_starlink/` | `original_icon.png` |
| 10 | `compassBlade` | Compass Blade | `10_compassBlade/` | `original_icon.png` |
| 11 | `umbrellaGuard` | Umbrella Guard | `11_umbrellaGuard/` | `original_icon.png` |
| 12 | `eraserBomb` | Eraser Bomb | `12_eraserBomb/` | `original_icon.png` |

## Current Concept Notes

- `07_onigiri/concept/onigiri_rice_burst_concept_2026-05-25.md`
- `10_compassBlade/concept/compass_blade_icon_to_3d_concept_2026-05-25.md`
- `11_umbrellaGuard/concept/umbrella_guard_icon_remake_2026-05-25.md`

## Maintenance Rule

When a weapon visual changes, update the matching weapon folder first:

1. Preserve or add the 2D source/reference image.
2. Add a dated concept or implementation note.
3. Add QA evidence or a validation note.
4. Keep this README's index current.
