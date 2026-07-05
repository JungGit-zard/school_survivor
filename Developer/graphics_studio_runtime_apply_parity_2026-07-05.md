# Graphics Studio Runtime Apply Parity - 2026-07-05

## Purpose

Make Graphics Studio edits apply to the actual game runtime immediately, not only to the studio preview.

## Implementation

- Moved material tuning application into `StudioTunedGroup`.
- Runtime `StudioTunedGroup` now applies:
  - global scale
  - per-axis scale
  - X/Y/Z rotation
  - outline color, opacity, and thickness
  - color blend, saturation, brightness, and emissive intensity
- Added runtime tuning wrappers for catalog items that were not fully wired:
  - stage floors
  - mini health bars
  - E04 projectile
  - hit spark / charge warning / pickup pop VFX
  - zombie death collapse base and numbered death styles
  - title scene
- Connected the image-only extra battery upgrade icon to DOM-side studio tuning for scale, rotation, brightness, saturation, and outline shadow.
- Studio control changes now save immediately and dispatch the runtime tuning event; Apply remains as an explicit save confirmation button.

## Notes

The studio preview still uses `StudioTuningPreviewProvider` to avoid double-applying nested runtime tuning wrappers while previewing a selected item.
