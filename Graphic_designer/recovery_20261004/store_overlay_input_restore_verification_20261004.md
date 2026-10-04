# Google Play thirty-image builder input restoration

- Kanban: `t_0067ed05`; profile `threemini`; user-authorized GPT-6 Worker substitute.
- Scope: restore the one missing `marketing/google_playstore_image/store_20261003/bottom_character_energy_overlay.png` input and verify reproduction. No builder or existing screenshot was changed.
- Mandatory precommand rerun succeeded; receipt `7af286119cd893177be0493b2533acd37b6678472376deb9cb9c0bb13c69e64c`.

## Exact restored input

Copied the surviving input from `C:/Users/admin/school-survivor-marketing-recovery-20261004/marketing/google_playstore_image/store_20261003/bottom_character_energy_overlay.png` into its configured D destination. The copied C input, D restored input, and original generated source `C:/Users/admin/AppData/Roaming/orca/codex-runtime-home/home/generated_images/01a0d699-2b16-7fe1-8c1f-8fae3eb81fe7/exec-1d30d84e-0124-4828-94de-bd0a51bd7e4e.png` have identical SHA256.

- SHA256: `ccb06e94f4cac053b11f0970b57b868358106cf823ea0f522127fd97ca26b4a5`
- Size: 746,615 bytes.
- Dimensions/mode: 941×1672 RGBA.

## Reproduction verification

Loaded the unchanged D `build_store_images.py` with Python `runpy.run_path`. Used its existing D captures, D Stage screenshots, restored D overlay, font paths and render function. Redirected only output directory to `C:/Users/admin/school-survivor-marketing-recovery-20261004/repro_verification` to preserve all existing D screenshots.

Rendered ko/en/ja ten images each. Compared SHA256 of every regenerated PNG with the corresponding existing D store output: **30 of 30 byte hashes match**. Verification command exited 0. Detailed per-file comparison: `C:/Users/admin/school-survivor-marketing-recovery-20261004/Graphic_designer/recovery_20261004/store_reproduction_verification.json`.

Only the missing overlay and this role record were added to D by this scoped restoration. No game/Firebase, posting, scheduling, commit or push action was performed.
