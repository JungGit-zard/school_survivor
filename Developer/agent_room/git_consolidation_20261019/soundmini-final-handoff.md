# Matilda final source-owner handoff

Status: **final selection mapping; Git-only consolidation.** No audio generation, deployment, or READY315 bulk overwrite occurred.

The supplied audition export selected **Spawn C, Death C, Warning Tick C, dialogue A**, and **original** for Dash, Laugh, and Countdown End. The selection was applied after the post-charge cue refresh. Therefore `matildaLaugh` original means the current DAB/322 runtime pair, not the older READY315 A174/129 pair.

`dialogue-matilda` A maps to the current applied runtime profile: base frequency 610 Hz and glyph duration 76 ms. The historical audition candidate?s ?52 ms? copy is not the applied runtime mapping and must not replace it.

## Integrate

| Item | Selection | Runtime SHA-256 |
| --- | --- | --- |
| matildaSpawn | C | e5a19f7955f34680817304d120cc1247fea58718ed675dfebc0cfcc68ac134af / 4eac667f37d6e2952c025c5518c7ec91b90a4cf38d153537a7888f263a4d663f |
| matildaDeath | C | f345745d2be112f16c8be6b875b27e94fd68eded93814659ef02be3074361b98 / 3d4021d55d80693a6a7aa924be079b1597725702ec3b8ccb790d0ad1f1b478ae |
| matildaWarningTick | C | 0bb56c645ad13da9e721d292f4c64e3b92928c6db9b730da3c85b420ff0b7cd3 / f0ffdfbb952b85fba284da02503d7d1f141bdc10d0a31b03f5ebff2a0997ed8d |
| matildaLaugh | original | dab2f2a8aaeb3f946d9434adb34f456251aaf1d58df2fc23267007ae1e2289fc / 322ef0812fd87cda83a628751bda7d49966a4721f8a9b84030a2e3f1be9d4fbe |
| dialogue-matilda | A | f5cdc6229683a2569321e70e67111858cfe9e7740526c8d3b56d2dabb0006321 |

## Explicitly exclude

- `Developer/r3f_prototype/scripts/generate_voice_sfx.mjs`: it still has the superseded five-beat Spawn experiment and cannot reproduce selected Spawn C bytes.
- Whole-file staging of `Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json`: shared file with unrelated entries.

The machine-readable per-path bytes, SHA-256 values, preference export hash, provenance, and READY315 comparison are in [`soundmini-final-handoff.json`](soundmini-final-handoff.json).
