# Vertical comic integration QA

Date: 2026-10-18 KST
Profile / Kanban: `balanceqa` / `t_aa5e9d30` (blocked to prevent auto-dispatch; parent controls start)

## Result

**PASS — exact Hosting preview candidate only.** The frozen integration and preview evidence below match. This is not approval to promote the preview or publish social posts; the parent remains responsible for any promotion.

## Checks completed

Read-only manifest and PNG metadata check on `Graphic_designer/comic_vertical_20261018/{ko,ja,vi}_edits.json`:

| Locale | Manifest mappings | Missing outputs | Target SHA mismatches | Non-portrait outputs | Missing four-line dialogue / visual flag |
| --- | ---: | ---: | ---: | ---: | ---: |
| ko | 30 | 0 | 0 | 0 | 0 |
| ja | 30 | 0 | 0 | 0 | 0 |
| vi | 30 | 0 | 0 | 0 | 0 |

All three manifests are marked complete. For each mapping, the output file exists, measured PNG height exceeds width, and any target SHA stored in the manifest matches the output bytes. Each asset entry provides four non-empty dialogue lines and `visuallyChecked: true`.

After the VI platform-source correction, an additional targeted check passed: 30 VI source/target paths are unique; all files and declared source/target hashes match; all source paths match their target platform; and the X/Facebook 15-entry source sets exactly match the corresponding active config pools. The correction changed only VI manifest source-path metadata, not image bytes or dialogue.

## Frozen integration checks

`Graphic_designer/comic_vertical_20261018/pool_update.json` was checked after freeze:

- `complete: true`, exactly 120 unique source and target paths, and exactly 40 unique homepage paths.
- For all 120 records, actual source and target file SHA-256 values match `pool_update`; target PNG dimensions match recorded width/height and are portrait. Each catalog row matches the actual target SHA, root `derivedFromSha256`, four dialogue lines, locale CTA, `1x4` layout, four panels, zero empty balloons, and visual-review flag.
- All eight platform/locale pools contain 15 distinct configured paths that exactly match their mapping targets. Schedule times are unchanged from the registration backup and X website cards remain enabled.
- All 40 allowlisted homepage URLs map to Facebook comic outputs; each `buildSource` exists and its bytes match the approved target SHA.
- The isolated selector probe passed for all eight platform/locale pools. A temporary `publish_intent` receipt containing the first candidate's original root SHA caused that source and its edited derivative to be skipped in favor of a different root. The temporary fixture was outside the repository.
- Operational receipt snapshot remained identical before and after the probes: 115 JSON receipts, aggregate SHA-256 `4fddebdea55ec87bf6b470cd764fe680f7d7d1fc9bbf8065d1343272a5bc39b3`.
- The local X card manifest parsed successfully: 60 cards/120 HTML+PNG outputs, 15 cards per locale, card metadata and PNG hashes valid, and all 60 X target image hashes represented.

## Hosting preview evidence

Read-only verification of `Graphic_designer/comic_vertical_20261018/hosting-preview.json` passed for the exact candidate:

- `mode: preview-only`, channel `vertical-comics-20261018-final`, preview version `sites/escape-zombie-school/versions/f57cc4e5eeac71c3`; `liveUnchanged: true` and the recorded baseline contains 665 files.
- All 40 replacement paths exactly match the frozen homepage mapping. Each replacement hash matches either the mapped local PNG bytes or its deterministic gzip representation; 0 mismatches.
- All 120 additive paths exactly equal the 60-card manifest's HTML/PNG outputs. The preview records 160 uploads and 160 verified inputs, corresponding to 40 replacements plus 120 additions.
- Preview URL: https://escape-zombie-school--vertical-comics-20261018-final-o4f7i7oq.web.app

This verifies the immutable preview evidence and its local inputs; it does not claim a production promotion, a browser-click test, or a social post. No promotion or posting was performed by this reviewer.

Read-only source review covered `PostingVariant.ps1`, `Test-PostingImageLineage.ps1`, `Integrate-VerticalComicPool.cjs`, `Preview-VerticalComicAssets.cjs`, its test, and the existing website-card deployment helper. The intended checks bind published receipt hashes to catalog ancestry, guard X/Facebook immediately before writing a new publish intent, limit homepage replacements to the 40 backlog episode PNGs, preserve other baseline files and Hosting config, and allow only new card paths. Main reports the focused preview/card suites and nine lineage tests passing; those test runs were not executed independently in this QA pass.

## Scope

The preview-only evidence confirms the exact 40 image replacements and 120 additive card files against the frozen candidate and unchanged live baseline. The parent may separately apply its promotion gate and fresh-baseline fence. This report grants no production promotion or posting approval.

No posting, browser, Firebase write, config/catalog/receipt edit, deployment, or source modification was performed by this QA reviewer.
