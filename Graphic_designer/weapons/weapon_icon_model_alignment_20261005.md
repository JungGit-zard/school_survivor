# Weapon icon ↔ R3F model alignment — 2026-10-05

Kanban task: `t_bb95cd58`

Scope is intentionally limited to the three requested weapon model surfaces:

- `Tumbler.jsx`: recolored only. Body is sky/cyan blue, lid is near-white, handle/straw are mint-cyan to match `src/assets/weapon_icon/03_wea_tumbler.png.webp`. Geometry and runtime behavior were not changed.
- `SharkMissile.jsx`: reshaped shared model toward the icon's chubby cute shark read. The main body/top/belly use rounded ellipsoid groups with relative outline inflation; both eyes are visible with pupils/highlights, smile/tongue/teeth are pushed to the +Z face, fins are triangular, and the rear rocket identity is kept smaller in red/silver.
- `UmbrellaGuard.jsx`: canopy panels now use a violet/lilac/rosy-pink palette, with white blossom and blue droplet details appended after the original shaft/grip children so pre-existing numeric Studio child paths for the shaft/grip are preserved. Explosion colors were restored to the legacy gameplay palette.

Verification notes:

- Focused unit/static run: `npm.cmd exec -- vitest run src/components/Weapons/Tumbler.test.jsx src/lib/sharkMissileRuntime.test.js src/lib/sharkMissileTargeting.test.js` → 3 files passed, 23 tests passed.
- Diff whitespace check: `git diff --check -- ...` → clean.
- Static search confirmed no `inflateScale(args.map...)` / sub-1 direct outline inflation in `SharkMissile.jsx`, and no floating umbrella decoration y literals `0.57`/`0.62` remain in `UmbrellaGuard.jsx`.

Studio caveat:

- New umbrella blossom/droplet decoration children are appended after the original shaft/grip meshes; existing shaft/grip numeric child paths stay in place, while only newly appended decorative children have new trailing indices.

Advisor final review: restored the shark snout's two direct mesh children, keeping the original first 18 child indices/types. Enlarged the eyes, corrected outward fin direction, and placed the small teeth over a forward-facing open mouth. Game and Studio continue importing the same three model exports; no Firebase tuning or decal values were read or written during the isolated visual review.

Final visual and test evidence: `Quaility_Assurance/weapon_icon_models_t_bb95cd58/README.md`.
