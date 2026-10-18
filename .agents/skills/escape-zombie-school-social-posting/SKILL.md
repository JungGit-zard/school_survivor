---
name: escape-zombie-school-social-posting
description: Run or maintain the Escape! zombie school X/Facebook posting workflow using its guarded native UI runners, immutable receipts, and the user's fixed schedule. Use for posting execution, schedule/status recovery, and related posting automation changes; do not activate for unrelated social copywriting.
---

# Escape! zombie school social posting

Honor the user's canonical schedule: daily KST 03:00, 12:00, 18:00, and 21:00; for every slot publish one post per locale (`ja`, `en`, `vi`, `ko`), X first and Facebook second. Use the configured scheduled entrypoint and its slot intake guard; read [references/proven-method.md](references/proven-method.md) for the current invocation.

A task that asks only to edit code, settings, copy, or this workflow is not authorization to publish. Live posting requires an explicit request to post or an already-authorized scheduled run. Never open a new browser for discovery, interrupt an active user's run, replay missed/canceled slots, or infer that a `publish_intent` receipt means a post succeeded.

Use only the native paths in [references/proven-method.md](references/proven-method.md). Reuse the platform mutexes and refresh/validate the target Chrome HWND for each locale. X selects its image through its native clipboard/file path; Facebook uses the native image chooser. Before the one publish action, verify the frozen localized copy, intended locale image, audience, and exact attachment. X uses `WindowsXPosting.ps1`; Facebook publishes through its UI Automation `InvokePattern` path. Treat the receipt's pre-click `publish_intent` as an at-most-once boundary: after one actual publish action, do not click again. Leave verification to the user's established evidence process; never relabel a click as verified.

Image selection is ordered by SHA-256 history: consume the configured sequence without reusing a digest, and stop when that locale/platform sequence is exhausted. Preserve the user's five-copy rotation, localized four-panel creative, and exact game-start CTA. Do not bypass the existing image-sequence and CTA guards.

If an exact login form is detected, persist and report `LOGIN_REQUIRED` for platform, locale/slot, and timestamp through the existing failure ledger and Windows/Orca reporting route. Do not call ambiguous loading, profile-address, or security-challenge errors a logout. Keep unresolved failures in the 30-minute status report until resolved. Never automatically replay a user-canceled backlog or missed slot. Bounded retries are allowed only for failures before any publish click within the current slot; never retry an uncertain or already-clicked intent, or a locale that may have published.

For a request to post immediately, use only a verified on-demand wrapper and a fresh cycle identifier accepted by both receipt schemas. Do not invent a slot-shaped `RunId`, use historical authorization, or call `FullCycle` as a shortcut. If the current runners do not expose a validated immediate route that preserves X-then-Facebook ordering, report that limitation and the exact supported per-post steps; do not fabricate a command or mutate the live browser.

Keep credentials, tokens, passwords, and credential-store contents out of commands, logs, receipts, reports, and skill files. Do not weaken account/window guards, profile mutexes, explicit publish authorization, immutable receipt checks, deduplication, or failure reporting.
