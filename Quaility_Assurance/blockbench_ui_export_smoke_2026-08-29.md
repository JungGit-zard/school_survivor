# Blockbench UI export smoke: blocked record

- Scope: temporary Generic Model only; no game model or original art was used.
- Confirmed UI evidence: Blockbench 5.1.6 created Generic Model `blockbench_ui_smoke`.
- Blocker: the available Orca Windows GUI provider exposed no usable File Export menu action and moved the app window off-screen during menu automation. Therefore the built-in glTF 2.0 export, `run_pipeline.ps1`, and validator were not run or claimed as PASS.
- Cleanup: Blockbench process was closed. No project assets were changed.
