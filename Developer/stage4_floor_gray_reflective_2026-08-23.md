# Stage 4 gray reflective ceramic floor revision

- Kanban: `escape-zombie-school` / `t_7e84476b` / `threemini`.
- Scope: Stage 4 floor only. Props, pressure cauldron, Studio, Firebase, title, audio, Stages 1-3, and port 5173 are excluded.
- Latest user art direction: cool elegant light-gray ceramic; an extremely thin, straight gray grout edge; and a restrained baked overhead-light reflection. The former pure-white direction is replaced.
- Exact user density: one tile is `0.8 x 0.8` world units. The unchanged `28.8 x 32` Stage 4 combat floor uses exactly `repeatX = 36` and `repeatZ = 40`, keeping tiles square without stretch.
- Runtime method remains one `FloorPlane`, one material, one R3F loader-cached WebP source, and UV repetition only. No per-tile mesh, material, or texture allocation is introduced.
- Asset: `Developer/r3f_prototype/src/assets/background_floor/tile_stage04_white_ceramic.webp`, WebP, 1254 x 1254, RGB. The existing filename is intentionally retained so the single import path stays stable.
- Image source method: built-in ImageGen edit of the prior Stage 4 single-tile source, using the user's kitchen-floor concept as material and lighting reference.

## Targeted cleanup iteration

- Visual review rejected the previous marble-like veins, cracks, and rough stone texture because they are absent from the user's reference.
- Built-in ImageGen edit prompt: remove all marble veins, cracks, stone pattern, mottling, grain, dirt, stains, and rough detail; preserve only the cool light-gray tone, subtle rectangular overhead reflection, and ultra-thin straight edge grout.
- Final visual inspection confirms a nearly uniform, smooth hygienic industrial ceramic surface with no visible marble veins or cracks. Size, source count, tile world size, and repeat contract are unchanged.

## WebP optimization

- The approved final pixels were re-encoded only; no image generation or art alteration was performed in this step.
- The available libwebp-backed WebP encoder was used at visually lossless quality 95 / method 6.
- Final runtime asset: `1254 x 1254`, RGB, WebP, exactly `25,510` bytes (from `1,007,170` bytes; `981,660` bytes / 97.47% smaller).
- Direct post-conversion image inspection confirmed the cool-gray surface, subtle upper rectangular reflection, and thin straight grout remain visually intact. The `0.8`, `repeatX = 36`, `repeatZ = 40`, one-loader-source contract is unchanged.
