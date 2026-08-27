# Stage 3 Basketball Hoop/Ball Concept — 2026-08-26

## Problem
The current south/6-o'clock Stage 3 hoop uses `stage3-hoop-south-damaged` with `props: { damaged: true }` at `position: [0, 0, 17.0]`. The model language is too broken/boxy and can read like stacked blocks or bad modeling instead of an intentional cute gym prop.

## Direction
Replace the south hoop/ball look with a **bright, cute, mobile-readable school gym prop**. It should feel like a toy-like blocky sports-day object, not horror damage.

## Mood Rules
- Bright, playful, school gym/sports festival.
- No horror darkness.
- Tension can come from gameplay, not from muddy props.
- Clear silhouette at mobile size.
- Blocky/stylized but not generic boxes.

## Image 2.0 / Concept Art Prompt
A cute stylized low-poly school gym basketball hoop and basketball prop set for a mobile 3D survival game, Roblox-like blocky proportions but polished, bright cheerful school sports-day mood, cream white backboard with bold blue border, thick rounded orange rim, simple chunky white net strips, padded blue support post with red-orange base cushion, warm orange basketball with thick readable dark seams, toy-like rounded edges, friendly colorful lighting, not scary, not dark, clean gym wood floor, mobile-game readable silhouette, 3/4 isometric concept art, simple shapes, high contrast colors, charming and cute, no realism, no horror.

## Model Blueprint
### Hoop
- Backboard:
  - cream/white main panel
  - bold blue outer border and smaller inner target rectangle
  - slightly rounded/blocky proportions using layered boxes
- Rim:
  - orange circular/ring impression using low-poly torus if available, or cylinder/box ring fallback
  - thick enough to read on phone
- Net:
  - 6~8 simple ivory hanging strips
  - no dense mesh
- Support:
  - blue padded post
  - red/orange cushion base
  - angled support arm to show it is a hoop, not a stack of boxes
- Damage:
  - remove broken/cracked horror damage from south hoop
  - if any wear is needed, use tiny playful scuffs only, not broken glass

### Ball
- Low-poly sphere/icosahedron, slightly oversized.
- Orange body.
- Thick dark seam bands/arc hints.
- Add one or two loose balls near south hoop if readable, not clutter.

## Placement
- South hoop currently: `[0, 0, 17.0]`, rotation `[0, Math.PI, 0]`.
- Target: pull slightly inward from the south wall if mobile audit shows clipping, likely `z ≈ 15.8~16.2`.
- Keep facing north with rotation `[0, Math.PI, 0]`.
- Keep center arena clear.

## Files
- Model: `src/components/StageObjects/GymProps.jsx`
- Placement: `src/components/StageObjects/stageObjectPlacements.js`
- Tests likely: `src/components/StageObjects/stageObjectPlacements.test.js`, `src/components/StageObjects/stage4PropLayout.static.test.js` only for stage4 no change unless needed.

## Verification
- Stage 3 screenshots:
  - iPhone SE 375x667
  - Pixel 393x851
  - Wide Android 430x932
- Confirm south hoop reads as hoop/ball, not broken boxes.
- Confirm no edge clipping at 6 o'clock.
- Run relevant StageObject tests and production build.
