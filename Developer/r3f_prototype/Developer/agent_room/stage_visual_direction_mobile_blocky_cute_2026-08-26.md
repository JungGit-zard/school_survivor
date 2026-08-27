# Mobile Blocky Cute Visual Direction — 2026-08-26

## Purpose
Define the visual direction before more Stage 3 prop, EXP pickup, or lighting work. The target is not realistic modeling and not random simplification. The target is **mobile-readable, cute, stylized blocky 3D** that feels intentional in a school survival game.

## Terry's Direction Interpreted
- The original art goal was a Roblox/blocky-style game look.
- The important screen is the real mobile gameplay screen, not a large desktop close-up.
- Assets must read clearly at phone scale.
- Cute flavor matters: rounded, toy-like, friendly school-prop shapes.
- Dark/horror mood is wrong for the main direction. Tension is allowed; murky/scary darkness is not.
- "Shave/detail reduction" means art-direction cleanup, not quality reduction.
- Do not turn every object into generic square boxes.
- Do not make objects overly realistic if that breaks the blocky/cute language.

## Practical Visual Rules
1. **Silhouette first**
   - A prop must be identifiable from a small mobile screenshot.
   - Basketball hoop must read as rim/backboard/net/stand, not stacked cubes.
   - Textbook must read as a book while moving.

2. **Simple but authored shapes**
   - Use block primitives, cylinders, and faceted shapes, but compose them into recognizable forms.
   - Add small iconic cues: rim color, backboard border, ball seams, book cover stripe.
   - Avoid excessive micro-detail that disappears on mobile.

3. **Rounded/cute where possible**
   - Prefer softened proportions, chunky parts, friendly colors.
   - Avoid harsh horror silhouettes unless the stage explicitly needs danger cue.

4. **Color contrast beats raw geometry detail**
   - Use readable color groups and warm accents.
   - Keep object/body/floor separation clear.
   - Lighting should reinforce the stage concept, not wash everything flat.

5. **Stage concept before light intensity**
   - Lighting is not just stronger or darker.
   - Each stage needs a concept, like theme-park zones/exhibition rooms.
   - The light map should express that concept cheaply and clearly.

## Stage Concept Seeds
- **Stage 1 Classroom:** warm classroom survival, readable desks/chairs, playful crisis; amber window/warm chalkboard accents.
- **Stage 2 Corridor:** chase corridor, clear route lanes, lockers/end-wall readable; cool hallway base with warm safety streaks.
- **Stage 3 Gym:** bright school gym/sports festival energy, readable court wood, cheerful hoop/ball props; orange/yellow sport accents, not dark.
- **Stage 4 Cafeteria/Kitchen:** clean ceramic tile, lively cafeteria utility, mint/yellow/white kitchen accents; tension from hazards, not darkness.

## Stage 3 Basketball Direction
- Replace the bad south/6-o'clock basketball hoop/ball look with a bright cute gym prop set.
- Hoop should have:
  - thick rounded orange rim
  - cream/white backboard with bold border
  - chunky blue/red support or padded post
  - simple low-poly net hint, not dense mesh
- Ball should have:
  - warm orange body
  - thick dark seam arcs readable at distance
  - slightly oversized toy-like proportion
- South placement must be pulled inside enough to avoid phone edge clipping.

## EXP Textbook Direction
- Textbook pickup should feel like a smooth, satisfying suck-in.
- Desired cues:
  - easing toward player, not snapping
  - slight bob/spin while attracted
  - optional pickup pop when collected
  - no jitter or sudden disappearance until close enough

## Lighting Direction
- Keep runtime lights cheap; use existing baked floor lightMap approach where possible.
- Stage lighting profiles should be documented by concept and color intent.
- Avoid dark/horror lighting.
- Use stronger but controlled colored zones so screenshots feel alive.

## Research Note
This runtime has no dedicated web_search tool exposed, so external web research cannot be performed directly from this session. If a browser/search-capable subagent is available later, assign it to gather references for: Roblox/low-poly mobile readability, stylized prop silhouettes, and colorful non-horror school/gym lighting. Until then, work from Terry's direction, existing project code, and local implementation history.

## Immediate Implementation Gate
Before coding each graphics change, create or update:
- concept note / art brief
- exact target files
- verification screenshots list
- tests/build commands
