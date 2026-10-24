# Stage zombie concept planning — worker dispatch blocker

Date: 2026-10-23
Board: `escape-zombie-school`

The registered `levelmini` card `t_242e5ff5` and `threemini` card `t_9bd079e2` were dispatched from the project Kanban board. Each worker process failed twice before making tool calls or editing files. The exact provider response in both logs was HTTP 400: the configured `gpt-5.5` model is not supported when using Codex with a ChatGPT account. Both cards are blocked by the retry limit.

No Hermes profile, provider, model, authentication, project runtime, or user data was changed to work around the failure. The Advisor continued the explicitly requested document and concept-art work directly, using separate new output paths and recording the worker-routing failure here. No worker output is claimed.

## 2026-10-24 user correction and art revision

The owner noted that the first concept sheets were too detailed to implement and clarified that current zombies are made from only a few boxes. The Advisor inspected `ZombieMesh.jsx` and `ZombieInstanceLayer.jsx` directly: the regular mesh is assembled from a chamfered box head, torso, two arms, two legs, small hands/feet and two square eyes; ordinary type variation is primarily palette, scale and existing role animation. The RZC run crew has its already-implemented simple headband and uniform stripe blocks.

The plan and current implementation-reference art were revised to follow those shapes. Unsupported school props, new clothing details, textures, and extra parts were removed. Stage 2 and Stage 4 share the same E03/E02/E04 art because those stages use the same current model types. Earlier detailed sheets remain archived under `Graphic_designer/stage_zombie_concepts_20261023/`; the current plan embeds the new sheets from `Graphic_designer/stage_zombie_blockout_20261024/`. No game runtime, model asset, Studio value or gameplay behavior was changed. The registered cards remain blocked; no independent worker or QA sign-off is claimed.
