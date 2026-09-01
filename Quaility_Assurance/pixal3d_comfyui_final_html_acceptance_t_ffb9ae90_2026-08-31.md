# Pixal3D-ComfyUI final HTML acceptance QA

- Task: `t_ffb9ae90`
- Profile: `balanceqa`
- Tool time: `2026-08-31 17:02:07 KST`
- Reviewed artifact: `D:/JungSil/2.Minigame_project/school_survivor-integration/Graphic_designer/pixal3d_comfyui_complete_recovery_architecture_2026-09-01.html`
- Prior blocker record checked: `D:/JungSil/2.Minigame_project/school_survivor-integration/Quaility_Assurance/pixal3d_comfyui_html_evidence_review_t_9bb4edcb_2026-09-01.md`
- Scope: static/read-only evidence acceptance of the revised final HTML. No inference, no ComfyUI POST, no server/browser launch, no download/install, no git command, no game runtime/Firebase/Graphics Studio mutation.

## Verdict

ACCEPT / evidence-supported for final HTML documentation scope.

The revised HTML resolves the two prior rejection blockers from `t_9bb4edcb`:

1. Codex session evidence is now corrected. The HTML states that session `01a04e7e-a2c8-7920-ada4-3cda005b1a1f` is present in local history and cites line `1890` with the user command `아까 그린 원화를 가지고, pixel 3d엔진 받아서 다시 해봐`.
2. The appendix now includes all 50 current `*pixal3d*.md` iteration records from the configured Three_Mini knowledge iterations directory, without omitting any discovered basename.

Acceptance is limited to the documentation/evidence artifact. This does not verify new generation, live ComfyUI behavior, viewer live serving, game integration, Firebase state, Google login, or Graphics Studio runtime application.

## Evidence summary

### Static HTML structure and dependency boundary

Observed result from read-only Python HTML parser:

```text
HTML_BYTES 107083
HTML_SHA256 465f07f3c0ff414f5780b05e51c89eb24934c12f99c757289589bc6a412ad206
DOCTYPE True LANG ko
ID_COUNT 14 DUP_IDS []
HREF_COUNT 12 SRC_COUNT 0 MISSING_INTERNAL [] EXTERNAL_ATTRS [] EXTERNAL_COUNT 0
```

Interpretation:
- Doctype and Korean language marker are present.
- Internal navigation anchors resolve.
- No `src` resources and no external `http/https` attributes were detected; the artifact is self-contained for static review.

### Prior blocker 1: Codex session evidence

Observed result from local history scan:

```text
HISTORY_EXISTS True HISTORY_MATCHES 67
HISTORY_LINE 1784 {"session_id":"01a04e7e-a2c8-7920-ada4-3cda005b1a1f","ts":1788023326,"text":"진행해"}
HISTORY_LINE 1835 {"session_id":"01a04e7e-a2c8-7920-ada4-3cda005b1a1f","ts":1788059108,"text":"잘했다 이제 저걸로 어제 그 그래픽 모델링 엔진 써서 저번 하를 토대로 저 원화를 토대로 모델링 시작해"}
HTML_CONTAINS 01a04e7e-a2c8-7920-ada4-3cda005b1a1f True
HTML_CONTAINS line 1890 True
HTML_CONTAINS 1890 True
HTML_CONTAINS 아까 그린 원화를 가지고 True
HTML_CONTAINS pixel 3d엔진 받아서 다시 해봐 True
```

Note: the terminal excerpt only printed the first matching lines, but the same scan confirmed the HTML contains the required line-1890 claim and exact recovered text. The prior QA blocker was about whether the revised HTML corrected the claim; this is satisfied.

### Prior blocker 2: complete `*pixal3d*.md` index

Observed result from Three_Mini knowledge iterations directory:

```text
ITER_DIR_EXISTS True PIXAL3D_MD_COUNT 50
MISSING_BASENAMES_COUNT 0
BASENAME_NON_ONCE_COUNT 50
```

Interpretation:
- The configured directory exists.
- 50 current `*pixal3d*.md` records were discovered.
- Every discovered basename appears in the revised HTML.
- `BASENAME_NON_ONCE_COUNT 50` is not a failure here; each basename appears in the main table and elsewhere in grouped/appendix evidence, so repetition is expected.

### Required ComfyUI/error-history coverage

Term and appendix inspection showed the revised document covers the categories requested by the prior QA record:

```text
TERM_COUNT quota 16
TERM_COUNT Access violation 12
TERM_COUNT OSError 1455 5
TERM_COUNT DINO 20
TERM_COUNT Flex 30
TERM_COUNT GEMM 26
TERM_COUNT passmanager 4
TERM_COUNT MoGe 2
TERM_COUNT CuMesh 88
TERM_COUNT sm75 40
TERM_COUNT system_stats 5
TERM_COUNT /queue 12
TERM_COUNT /prompt 11
TERM_COUNT POST 85
TERM_COUNT history 45
TERM_COUNT output 74
TERM_COUNT GLB 112
TERM_COUNT one POST 7
TERM_COUNT exact-once 4
TERM_COUNT state.json 4
TERM_COUNT submit-response.json 2
TERM_COUNT sha256 14
TERM_COUNT safe 23
TERM_COUNT resubmit 11
TERM_COUNT recovery 17
TERM_COUNT API 10
TERM_COUNT dependency 5
TERM_COUNT architecture 11
TERM_COUNT state machine 1
```

Manual line readback additionally confirmed:
- `appendix-errors` includes hosted quota, official/community routes, Windows access violation, dtype/Linear, companion lazy import, DINO pagefile 1455, monitor/tqdm, NAF, shape SLAT dtype, texture/OOM, o_voxel, flex_gemm/TF32, CuMesh/remesh/BVH/kernel image, CUDA staging/build blockers, CP949/sm75 wheel, native install/restart, exact successful POST/history/output, viewer publish, standalone runner, and SHA gate rows.
- `appendix-comfyui-architecture` includes node settings, directory tree, GET vs POST mutation matrix, exact-one state machine, output selection proof, dependency/runtime compatibility matrix, and safe recovery decision tree.

### File/hash inventory recheck

Read-only hash/size checks matched the HTML claims for all specific files that were present and were directly mapped during review:

```text
CHECK concept exists True size 1292648 size_ok True hash_ok True
CHECK alpha exists True size 1338039 size_ok True hash_ok True
CHECK input original exists True size 1292648 size_ok True hash_ok True
CHECK input alpha exists True size 1338039 size_ok True hash_ok True
CHECK payload exists True size 1676 size_ok True hash_ok True
CHECK template exists True size 2248 size_ok True hash_ok True
CHECK fresh glb exists True size 5512304 size_ok True hash_ok True
CHECK viewer glb exists True size 5512304 size_ok True hash_ok True
CHECK old blockbench exists True size 174040 size_ok True hash_ok True
CHECK prompt response exists True size 85 size_ok True hash_ok True
CHECK history receipt exists True size 2371 size_ok True hash_ok True
CHECK final receipt exists True size 1404 size_ok True hash_ok True
CHECK runner exists True size 9038 size_ok True hash_ok True
CHECK publisher exists True size 1444 size_ok True hash_ok True
CHECK alpha helper exists True size 2149 size_ok True hash_ok True
CHECK toolchain exists True size 1200 size_ok True hash_ok True
CHECK notice exists True size 2016 size_ok True hash_ok True
```

The CuMesh wheel was found at the concrete external-lab path below, matching the size/hash cited by HTML:

```text
WHEEL_FOUND D:\JungSil\2.Minigame_project\school_survivor-3d-modeling-lab\pixal3d-real-run\local-q4\sm75-build-artifacts\cumesh-1.0-cp311-cp311-win_amd64.whl 1917165 66a30f46508fc96fb8ae9aea94f67cb65c3e7a329cece9d9624a694620104fd3
```

Two other same-named upstream wheel files also exist under `official-sources/ComfyUI-Trellis2/wheels/...` with different size/hash; those are not the HTML's sm75 build-artifact claim.

### GLB proof

Read-only GLB header checks:

```text
GLB_HEADER fresh glb b'glTF' 2 5512304 matches_size True
GLB_HEADER viewer glb b'glTF' 2 5512304 matches_size True
```

This supports the document's claim that the accepted GLB and viewer-target GLB are binary glTF v2 files with declared length equal to file size and matching SHA256.

### Locked template node settings

The actual template is a dict with `prompt` and `client_id`; prompt keys include `6`, `39`, `44`, `41`, `43`, `19`. Readback of those prompt nodes matches the revised HTML's node/class/settings summary:

```text
NODE 6 {"class_type": "Trellis2LoadImageWithTransparency_GGUF", "inputs": {"image": "__INPUT_IMAGE__"}}
NODE 39 {"class_type": "Trellis2LoadModel_GGUF", "inputs": {"backend": "sdpa", "device": "cuda", "keep_models_loaded": false, "low_vram": true, "model_format": "GGUF Q4_K_M", "modelname": "Pixal3D-GGUF"}}
NODE 44 {"class_type": "Trellis2PreProcessImage_GGUF", "inputs": {"image": ["6", 2], "padding": 0, "remove_background": false}}
NODE 41 {"class_type": "Trellis2MeshWithVoxelGenerator_GGUF", "inputs": {"generate_texture_slat": true, "image": ["44", 0], "max_num_tokens": 49152, "max_views": 4, "pipeline": ["39", 0], "pipeline_type": "512", "sampler": "euler", "seed": 250830, "shape_steps": 12, "sparse_structure_resolution": 32, "sparse_structure_steps": 12, "texture_steps": 12, "use_tiled_decoder": true}}
NODE 43 {"class_type": "Trellis2PostProcessAndUnWrapAndRasterizer_GGUF", "inputs": {"bake_on_vertices": false, "bvh": ["41", 1], "double_side_material": false, "dual_contouring_resolution": "512", "fill_holes": true, "mesh": ["41", 0], "mesh_cluster_global_iterations": 1, "mesh_cluster_refine_iterations": 0, "mesh_cluster_smooth_strength": 1, "mesh_cluster_threshold_cone_half_angle_rad": 60.0, "remesh": true, "remesh_band": 1.0, "remesh_project": 0.0, "remove_floaters": true, "remove_inner_faces": true, "simplify_method": "Cumesh", "target_face_num": 100000, "texture_alpha_mode": "OPAQUE", "texture_size": 1024, "use_custom_normals": false, "uv_unwrap_method": "Xatlas"}}
NODE 19 {"class_type": "Trellis2ExportMesh_GGUF", "inputs": {"file_format": "glb", "filename_prefix": "__FILENAME_PREFIX__", "trimesh": ["43", 0]}}
```

### Secret scan

Static scan did not find common credential patterns:

```text
SECRET_SCAN api_key 0
SECRET_SCAN token_assign 0
SECRET_SCAN password_assign 0
SECRET_SCAN email 0
SECRET_SCAN bearer 0
```

## Blockers

None for the final HTML documentation acceptance scope.

## Observations / limits

- This acceptance intentionally did not perform live browser rendering or visual screenshot review, because the task explicitly prohibited browser/server/process mutation and there is no need to prove static-document evidence with a live server.
- This acceptance intentionally did not use git status/diff because the task explicitly prohibited git operations.
- The HTML's final footer still references source task `t_03f0284f`; that is acceptable as provenance for the authored HTML, while this record covers final QA task `t_ffb9ae90`.
- The external GLB/viewer facts are accepted from file/hash/receipt evidence, not from a new viewer launch.
