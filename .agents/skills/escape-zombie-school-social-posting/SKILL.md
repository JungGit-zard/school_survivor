---
name: escape-zombie-school-social-posting
description: Run or maintain the Escape! zombie school X/Facebook posting workflow using its guarded native UI runners, immutable receipts, and the user's fixed schedule. Use for posting execution, schedule/status recovery, and related posting automation changes; do not activate for unrelated social copywriting.
---

# Escape! zombie school social posting

Honor the user's canonical schedule: daily KST 03:00, 12:00, 18:00, and 21:00; for every slot publish one post per locale (`ja`, `en`, `vi`, `ko`), X first and Facebook second. Use the configured scheduled entrypoint and its slot intake guard; read [references/proven-method.md](references/proven-method.md) for the current invocation.

A task that asks only to edit code, settings, copy, or this workflow is not authorization to publish. Live posting requires an explicit request to post or an already-authorized scheduled run. Never open a new browser for discovery, interrupt an active user's run, replay missed/canceled slots, or infer that a `publish_intent` receipt means a post succeeded.

Scheduled X `PublishOnly -SinglePost` uses the existing website link-card path: keep `x_link_card.enabled` true, build the card from the selected image SHA-256, and verify the exact public card HTML and PNG before the one publish action. The scheduled runner must not pass `-DirectPhoto` or fall back to photo posting if card readiness fails. Report and stop on missing/unreachable card assets. Do not replace this established path with a new card implementation.

Use only the native paths in [references/proven-method.md](references/proven-method.md). Reuse the platform mutexes and refresh/validate the target Chrome HWND for each locale. Scheduled X uses the website card generated from the selected image; Facebook uses the native image chooser. Before publishing, verify the frozen localized copy, selected image SHA/card binding, audience, and exact visible card. X uses `WindowsXPosting.ps1`; Facebook publishes through its UI Automation `InvokePattern` path. Treat the receipt's pre-click `publish_intent` as an at-most-once boundary: after one actual publish action, do not click again. Leave verification to the user's established evidence process; never relabel a click as verified.

Image selection is ordered by SHA-256 history: consume the configured sequence without reusing a digest, and stop when that locale/platform sequence is exhausted. Preserve the user's five-copy rotation, localized four-panel creative, and exact game-start CTA. Do not bypass the existing image-sequence and CTA guards.

Edited comics retain their original consumption identity. Catalog `sha256` identifies the current artifact and `derivedFromSha256` links its original comic; `PostingVariant.ps1` resolves that ancestry for both historical receipts and current candidates. An already-consumed original, dialogue-filled version, or vertical edit consumes the entire lineage. New bytes never authorize replay. Active comics use four panels in one vertical column with readable localized dialogue in every balloon. Keep historical source files and receipts immutable; generate website cards from the selected edited artifact's exact SHA, without changing the existing card-only X path.

For comic edits, reuse the existing drawing, story, costumes, and cute short two-head-tall characters. Rearrange existing panels into one column/four rows in original top-left → top-right → bottom-left → bottom-right order. Every speech balloon must contain clear dialogue in its locale; leave zero empty balloons and preserve existing dialogue, game-start CTA, and footer. The user's durable style reference is `Graphic_designer/comic_vertical_20261018/style_reference_user_20261018.png` under the active repository. Preserve the established website link-card method.

If an exact login form is detected, persist and report `LOGIN_REQUIRED` for platform, locale/slot, and timestamp through the existing failure ledger and Windows/Orca reporting route. Do not call ambiguous loading, profile-address, or security-challenge errors a logout. Keep unresolved failures in the 30-minute status report until resolved. Never automatically replay a user-canceled backlog or missed slot. Bounded retries are allowed only for failures before any publish click within the current slot; never retry an uncertain or already-clicked intent, or a locale that may have published.

For a request to post immediately, use only a verified on-demand wrapper and a fresh cycle identifier accepted by both receipt schemas. Do not invent a slot-shaped `RunId`, use historical authorization, or call `FullCycle` as a shortcut. If the current runners do not expose a validated immediate route that preserves X-then-Facebook ordering, report that limitation and the exact supported per-post steps; do not fabricate a command or mutate the live browser.

Keep credentials, tokens, passwords, and credential-store contents out of commands, logs, receipts, reports, and skill files. Do not weaken account/window guards, profile mutexes, explicit publish authorization, immutable receipt checks, deduplication, or failure reporting.
