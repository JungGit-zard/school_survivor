# Stage Visual Quality Work Schedule — 2026-08-26

> Goal: mobile-readable cute blocky 3D art direction first, then Stage 3 basketball replacement, EXP textbook attraction verification/restore, and stage-specific lighting redesign.

## Ground Rule
Do not model or "shave down" assets blindly. Every graphics change must follow:
1. current-state audit
2. reference/context research
3. concept/art-direction note
4. implementation
5. mobile viewport screenshot verification
6. tests/build verification

## Work Schedule

### Phase 0 — Preserve Current State / Baseline
**Target:** today, first
- Record current git status.
- Keep Stage 4 mobile-safe prop changes intact unless a later visual review says otherwise.
- Identify current files for Stage 3 props, EXP textbook pickup, and stage lighting.

**Output:** baseline notes in this file or a separate handoff.

### Phase 1 — Visual Direction Research + Local History Review
**Target:** today
- Review existing project docs and prior implementation notes for graphics direction.
- Review current source structure: StageObjects, floor, lighting, pickup/EXP item effects.
- If external web search is available in the running agent, research Roblox/low-poly/mobile-stylized readability, cute prop silhouettes, and staged theme-park-like lighting. If not available, document that limitation and proceed with local/project evidence.

**Output:** `stage_visual_direction_mobile_blocky_cute_2026-08-26.md`

### Phase 2 — Stage 3 Basketball South Hoop/Ball Concept
**Target:** after Phase 1
- Inspect Stage 3 south/6-o'clock basketball hoop and ball placement/model.
- Define bright, cute school-gym concept; not dark/horror.
- Produce concept prompt/spec for Image 2.0 or equivalent image-generation backend.
- If image generation is unavailable, write an exact art brief + model blueprint before coding.

**Output:** Stage 3 basketball concept note + optional concept image/art prompt.

### Phase 3 — Stage 3 Basketball Model Replacement
**Target:** after concept approval/selection
- Replace the bad hoop/ball model with a readable cute blocky/stylized model.
- Keep silhouette clear on mobile.
- Keep south placement inside visible/safe bounds.
- Add/update tests for Stage 3 prop type/placement if needed.

**Verification:** Stage 3 screenshots at iPhone SE, Pixel, wide Android sizes; relevant tests; build.

### Phase 4 — EXP Textbook Attraction Effect Audit/Restore
**Target:** parallel after Phase 1 source discovery
- Locate EXP textbook item rendering and attraction-to-player logic.
- Check whether previous smooth suck-in/easing/visual flourish still exists.
- Restore smooth attraction if missing or weakened.

**Verification:** code-level test if possible + screenshot/video or deterministic visual audit.

### Phase 5 — Stage Lighting Concept Redesign
**Target:** after Phase 1 direction doc
- Assign a concept to each existing stage from what is already built.
- Stage 1: classroom readable warm crisis.
- Stage 2: corridor chase/readability lanes.
- Stage 3: bright playful school gym/sports light.
- Stage 4: clean cafeteria/kitchen tile with lively mint/yellow accents.
- Convert concepts into concrete light/colormap/lightmap rules.

**Output:** `stage_lighting_concept_map_2026-08-26.md`

### Phase 6 — Lighting Implementation + Verification
**Target:** after Phase 5
- Implement stage-specific lighting adjustments using existing architecture.
- Avoid making scenes dark/scary.
- Preserve mobile performance: prefer baked/cheap lighting where already used.

**Verification:** screenshots per stage on mobile sizes; tests; production build.

## Immediate Start Checklist
- [x] Git status captured.
- [x] Stage 3 basketball files found: `src/components/StageObjects/GymProps.jsx`, `src/components/StageObjects/stageObjectPlacements.js`.
- [x] EXP textbook pickup/effect files found: `src/components/XpTextbook.jsx`, `src/components/Enemies.jsx`.
- [x] Lighting files found: `src/lib/stageLightingProfile.js`, `src/lib/stageFloorLightBake.js`, `src/components/ClassroomFloor.jsx`, `src/components/Game.jsx`.
- [x] Direction doc created: `Developer/agent_room/stage_visual_direction_mobile_blocky_cute_2026-08-26.md`.
- [x] Stage 3 basketball concept drafted: `Developer/agent_room/stage3_basketball_hoop_ball_concept_2026-08-26.md`.

## Acceptance Criteria
- Graphics decisions are documented before implementation.
- Stage 3 south hoop/ball no longer looks like broken boxes or bad modeling.
- EXP textbook attraction effect is confirmed alive or restored.
- Every stage has a clear lighting concept and implemented stage-specific lighting.
- Mobile screenshots are delivered for Terry to inspect.
