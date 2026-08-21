# Runtime Graphic Revision v2

Date: 2026-04-24

## Purpose

Apply the `Bang_survivor_Graphic_concept.md` direction to the current playable prototype.

The revision focused on:

- keeping the game readable in a 9:16 mobile frame
- improving the school survival background structure
- making Three.js toon characters easier to distinguish
- aligning enemy colors with `color_palette_guide.md`
- improving HUD, weapon slots, warnings, XP, and healing readability

## Files Changed

- `Developer/school_survivor_prototype/index.html`
- `Developer/school_survivor_prototype/styles/main.css`
- `Developer/school_survivor_prototype/src/data.js`
- `Developer/school_survivor_prototype/src/game.js`
- `Developer/school_survivor_prototype/src/three-characters.js`

## Implemented Decisions

- Added a dedicated simple 3D player model for `StudentSurvivor`: head, hair, white shirt, navy school uniform, yellow tie, arms, legs, shoes, and blue school bag.
- Added a fixed 9:16 `#game-frame` so desktop screens do not stretch the vertical prototype.
- Added floor guide bands and school-area markings to make the map read as a school interior and circulation space.
- Replaced the large single top HUD band with smaller HP, timer, and level panels.
- Added HP, XP, enemy count, objective, and 4 weapon slot HUD elements.
- Changed the bottom HUD from a text-only weapon bar to icon-like weapon slots with locked-state dimming.
- Changed XP to star-shaped green pickups and healing to a clear medical cross pickup.
- Added stronger warning shapes and danger callouts for charge, spit, shockwave, boss slam, and cone attacks.
- Reworked Three.js character profiles so enemy types differ by body width, height, head shape, accessories, spikes, and boss crest.
- Replaced the heavy black Three.js outline with a light transparent rim, fixed render order, and kept character bodies front-facing so color is not swallowed by the outline.
- Locked the Three.js renderer to the logical 720x1280 game coordinate system so the 3D character layer stays aligned with Phaser after the CSS frame fix.
- Updated enemy tint values toward the project palette guide.

## Visual QA Checklist

- Player position should be visible through the blue ring, toon body, and backpack.
- Enemy types should now differ by silhouette, color, and scale.
- Boss and special attacks now have stronger pre-impact warnings.
- XP and healing pickups now use different shapes, not only different colors.
- Desktop view should preserve the 9:16 frame with side margins.

## Validation

- `node --check Developer/school_survivor_prototype/src/game.js`
- `node --check Developer/school_survivor_prototype/src/three-characters.js`
- `node --check Developer/school_survivor_prototype/src/data.js`
- Local server responded with HTTP 200 at `http://127.0.0.1:4173/`
- Chrome headless screenshots were generated for `720x1280`, `1080x1920`, and `1365x768` in `Graphic_designer/qa_screenshots/`.
- Follow-up desktop captures exposed and drove fixes for the Three.js coordinate alignment and black-outline readability issue.
- Final player-model capture: `Graphic_designer/qa_screenshots/student_3d_player_720x1280.png`.

## Remaining Risk

Playwright is not installed in this workspace, so Playwright-based comparison was not completed. Chrome headless became unstable during the final repeated capture pass, so one final manual browser review is still recommended at:

- `720x1280`
- `1080x1920`
- `1365x768`

---

## 2026-04-26 R3F Monster Outline Update

- Applied toon outline rendering to each zombie block in `Developer/r3f_prototype/src/components/ZombieMesh.jsx`.
- The outline now follows each animated body part because it is rendered inside the same block group as the colored mesh.
- Removed the self-recursive outline call that would have caused a render loop if the old outline wrapper was mounted.
- This follows the project concept direction of three.js toon characters with visible outline treatment.

## 2026-04-26 Monster Death Collapse Visual

- Added a Rapier-driven block collapse effect for zombie death.
- The effect keeps the toon block style and palette from the live zombie mesh.
- Death pieces are separated into head, body, arms, and legs so the monster appears to physically break apart instead of instantly disappearing.
- The effect is intentionally short-lived and is cleaned up after 1 second to preserve mobile-frame readability during large waves.

## 2026-04-26 Floor Grid Density

- Increased the R3F prototype floor grid line density by 4x.
- The floor size and invisible boundary walls stay unchanged.
- This makes the school-floor spacing read more clearly at the current mobile-frame camera zoom.

## 2026-04-26 Player Foot Shadow and Debris Layering

- Added a small flat circular shadow under the player feet only.
- The shadow is intentionally simple so it supports readability without adding floor clutter.
- Zombie death debris is now forced to render behind live enemy bodies when they overlap on screen.
- This keeps the break-apart effect readable without competing with active enemy silhouettes.

## 2026-04-26 Zombie Debris Color and Size Pass

- Reduced the live zombie display scale to two-thirds of the previous enlarged size.
- Kept collider/contact scaling tied to the visual scale so enemy body size and gameplay reach stay aligned.
- Adjusted zombie death debris materials so fragments keep the zombie body/skin palette instead of appearing as black blocks.
- Softened the debris outline treatment to preserve the toon silhouette without swallowing the colored faces.

## 2026-04-26 Player Ellipse Shadow

- Revised the player foot shadow into a small dark ellipse under the protagonist.
- The ellipse is intentionally flat and local to the character, improving ground contact without adding a separate lighting system.

## 2026-04-26 Player Size Reduction

- Reduced the protagonist model to four-fifths of its previous screen size.
- Kept the character-local shadow under the scaled model so ground contact still reads clearly.

## 2026-04-26 Player Shadow Visibility Fix

- Raised the protagonist ellipse shadow above the floor surface so it is no longer hidden by the ground plane.
- Made the ellipse slightly wider and darker to read clearly at the reduced protagonist size.

## 2026-04-26 Bag Swing and Tumbler Orbit Visuals

- Replaced the old static bag aura ring with a visible swinging school bag model that sweeps around the protagonist during melee attacks.
- Added a small orange tumbler model that continuously orbits the protagonist.
- Added a subtle orbit guide ring at the tumbler path so the player can read its contact route without confusing it with the removed bag aura.

## 2026-04-26 Bag Swing Trail and Tumbler Scale

- Reduced the tumbler visual size by half while keeping the same orbit path.
- Added a pale blue translucent arc during the bag swing so the attack reads as an active slash-like motion rather than a simple moving prop.
- The bag remains hidden until the close-range attack actually triggers, making the swing feel reactive to nearby zombies.

## 2026-04-26 Bag Swing Arm Motion and Size

- Reduced the visible swinging bag prop by half.
- Added player arm motion during the bag swing so the protagonist appears to actively swing the bag rather than having the bag move independently.
- The right arm performs the main swing and the left arm adds a small balancing motion.
