# Three_Mini training trail — Noise-to-image surface art vs texture decals

Created: 2026-08-01 10:03 KST  
Project: Escape! zombie school  
Specialist: `threemini` / `Three_Mini` / `mini_game_graphics_implementation_agent`

## Routing

Subagent mandatory routing

- Board: `escape-zombie-school`
- Trigger: Terry requested Graphics Studio/3D model surface art method training for the graphics subagent.
- Specialists involved: `threemini`
- Cards/artifacts/review trail: this artifact plus durable workspace update:
  - `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/mini_game_graphics_implementation_agent/knowledge/iterations/20260801_1003_noise_to_image_model_vs_texture_decal_graphics_studio_smiling_zombie.md`
- Verification:
  - `hermes kanban --board escape-zombie-school assignees`
  - `hermes kanban --board escape-zombie-school stats`
  - `git status --short --branch`

## Evidence found in Graphics Studio

The source string `웃는좀비` was not found verbatim, but the relevant Graphics Studio trace is:

- Catalog:
  - `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`
  - item id: `zombie-procedural-face-test`
  - label: `실험 · 직접 그린 얼굴 좀비`
  - source: `components/ProceduralFaceTestZombie.jsx`
  - previewKind: `proceduralFaceZombie`

- Implementation:
  - `Developer/r3f_prototype/src/components/ProceduralFaceTestZombie.jsx`
  - `FACE_FRAGMENT_SHADER` draws face features from UV/time using `softCircle` and `softLine`.
  - The face is a generated shader overlay on a plane in front of the head:
    - `<planeGeometry args={[0.54, 0.48]} />`
    - `<shaderMaterial ... transparent depthWrite={false} toneMapped={false} />`

## Training distinction

Three_Mini must distinguish these without mixing terminology:

1. **Texture/decal**: a pre-existing or uploaded image is mapped onto a face/UV/part.
2. **Procedural shader/canvas**: code mathematically generates the face from UV/time/noise/seed.
3. **AI diffusion/noise-to-image**: a model denoises latent/random noise, optionally conditioned by text/render/depth/edge/mask, then the generated image is baked into a runtime texture/decal/atlas.

Current “directly drawn smiling zombie” evidence is #2, not confirmed #3. Terry’s requested future method is #3, usually integrated into the game as a baked #1 asset after generation.

## ESZS-safe implementation policy

- Do not run heavy diffusion inference in mobile WebGL gameplay by default.
- Use offline/server-side AI generation, then store curated generated art as PNG/WebP/atlas/decal.
- For small animated expressions, procedural shader/canvas can be better than diffusion because it is deterministic, tiny, and fast.
- If using AI generation:
  - save prompt, seed, negative prompt, conditioning render/depth/mask, model/version if available;
  - record license/provenance;
  - compress/atlas the final output;
  - verify in Graphics Studio and live runtime screenshots.

## Durable workspace updated

Updated files are recorded in Three_Mini ledger/source index/knowledge base/manifest and TOML learning pointers.
