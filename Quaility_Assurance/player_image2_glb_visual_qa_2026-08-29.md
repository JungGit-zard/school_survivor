# Player Image 2.0 GLB visual QA

Final standalone GLB inspected through Blender 5.2 orthographic renders.

- `player-image2-front-orthographic.png`: eyes, white shirt, yellow tie, red jacket, blue uniform, attached shoes visible.
- `player-image2-right-orthographic.png`: Y-up side view is upright.
- `player-image2-back-orthographic.png`: cyan backpack and flap visible; no front-face swap.

Root cause of the failed prior evidence: the GLB contained dark outline duplicates while the Blender Workbench renderer did not honor the runtime BackSide outline material rule, so the hulls covered surface colors. The raw authoring script also copied the runtime shoe pivot (`-0.76`) instead of the Blockbench source offset (`-0.48`), leaving shoes detached in the standalone file.

Resolution: final GLB now contains 29 colored semantic surface meshes only (1,276 triangles). Runtime derives BackSide outlines from the same surface geometry inside the pre-existing PlayerMesh outline slots. Validator PASS: 29 meshes, zero armatures, no errors. The final GLB SHA-256 is `238DE386D331156CD148B5A0A97DDD5A3303A27103020556238D2E27B6A0E92F`.
