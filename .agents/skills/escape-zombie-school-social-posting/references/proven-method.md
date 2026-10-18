# Proven runner paths

Resolve the active repository root with `git rev-parse --show-toplevel`; run these repository-relative paths from that root. Keep secrets out of commands and output. Native X UI work uses `-NoProfile -STA -ExecutionPolicy Bypass` through the existing hidden runner.

Targets: X `@jungsilx` (`https://x.com/jungsilx`); Facebook `https://www.facebook.com/hyunuk.jung.56/`, author `Hyun Uk Jung`, audience `Friends`. Receipts live in `Developer/agent_room/x_posting_receipts` and `Developer/agent_room/facebook_posting_receipts`. Copy, rotation, and image-sequence config is `marketing/x_daily_zombie_school_posting/posting_config.json`; image catalog and locale/platform pools are under `marketing/x_daily_zombie_school_posting/image_pool/` (including `localized_social_image_pool` and `facebook_rotation_image_pool`). `PostingVariant.ps1` enforces selection and SHA order.

## X per-post path

`marketing/x_daily_zombie_school_posting/Invoke-XDailyZombieSchoolPosting.ps1` supports one authorized locale via:

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "marketing/x_daily_zombie_school_posting/Invoke-XDailyZombieSchoolPosting.ps1" -Run -SinglePost -PublishOnly -Language <ja|en|vi|ko> -CycleId <fresh-approved-id> -ReceiptDirectory "<canonical-x-receipt-directory>" -CredentialRecovery
```

`-PublishOnly` requires `-Run -SinglePost`; the ID must be stable and unique. The runner locks `Local\EscapeZombieSchoolXPosting`, freezes the intent/image SHA, checks sequence, writes `publish_intent`, then publishes through `WindowsXPosting.ps1` native UI guards. A `published_unverified` result is not success and must not be clicked again. Refresh/validate the X HWND and foreground for each locale.

If X says `You already said that`, the runner closes only that exact owned draft and returns `skipped_duplicate`; finish that locale without the five-minute failure retry. Do not repost it. Continue only at the next canonical cycle.

For on-demand X, inspect past receipt/history before freezing the body: scheduled variant lookup alone does not prove that its opening differs from the last posted copy. Use an approved copy with a distinct opening and preserve it in the receipt; if history or uniqueness is unclear, stop without publishing.

## Facebook per-locale path

`marketing/facebook_daily_zombie_school_posting/Invoke-FacebookDailyZombieSchoolPosting.ps1` requires explicit `-Action`, `-RunId`, `-Language`, and receipt directory. For each locale, skip immediately if its receipt is `publish_intent` or `verified`. Otherwise, if no entry exists, call `SelectSourcePair`; then call `DiscoverWindow` → `OpenProfile` with that fresh exact `WindowId`. For a `selected` entry, continue `OpenComposer` → `TypeText` → `AttachImage` → `VerifyDraft`. For a `prepared` entry, continue `ResumeOwnDraft` → `VerifyDraft`. Once prepared, call `PublishOnce -AuthorizePublish` only when live posting is authorized. The runner holds `Local\EscapeZombieSchoolFacebookHyunUkJung` for mutating actions. Facebook attaches through the native file chooser; X uses its existing native clipboard/file path.

After Facebook attachment, wait only within native bounded readiness checks for the exact filename/one attachment and frozen body, then run `VerifyDraft`. A `publish_intent` or `verified` entry is never republished. After one `PublishOnce`, wait boundedly for the exact composer to close and retain its separate `clickedUtc` evidence before moving to the next locale. If either signal is absent or uncertain, preserve state and do not click again or advance based on assumed success.

`PublishOnce` checks the prepared receipt and exact copy/image/audience, writes `publish_intent`, then calls `Invoke-FacebookPublishNative`. That function validates the exact profile/account and scoped enabled, visible Post button; it reacquires the button and invokes its `InvokePattern` once. Uncertain output or `publish_intent` is never a reason to click again. `FullCycleResumeSafe` is read-only; do not use undocumented `FullCycle` as a shortcut.

## Canonical slot and content gates

The user's schedule is KST 03:00, 12:00, 18:00, 21:00. Each slot: X `ja,en,vi,ko`, then Facebook `ja,en,vi,ko`. The scheduled entrypoint is `포스팅/Invoke-ZombieSchoolFiveSlotPosting.ps1`; its active scheduled mode uses `-PersistentScheduledRun -ScheduledSlot <HHmm>` where HHmm is `0300`, `1200`, `1800`, or `2100`. The slot intake guard accepts only the first 30 minutes after that KST slot and never infers/replays older slots. Scheduled mode derives the slot-specific cycle ID and default X/Facebook runner paths; preserve the existing hidden Task Scheduler action.

The configured five-copy rotation is `original`, `bell`, `supplies`, `escape`, `alarm`. Use the user's localized four-panel creative and exact game-start CTA. Consume each configured locale/platform image only once by SHA-256; after its sequence is exhausted, stop that locale/platform. Never reuse an image or bypass the CTA/image guards. The Korean original copy already begins `학교 문이 잠긴 순간`; do not reject it based on a different locale's opening rule.

For an immediate request, require a verified on-demand route and a fresh cycle ID valid for both receipt schemas. Do not invent a slot-shaped Facebook `RunId`, claim historical authorization, or fabricate an invocation. If no supported immediate route preserves X-first order, report the exact available per-post steps and stop before live mutation.

## Failure and receipts

A real visible login form produces durable platform/locale/cycle/time `LOGIN_REQUIRED`, an immediate existing Windows/Orca alert, and continued eligibility in 30-minute unresolved-failure reports. Do not infer logout from loading, profile-address mismatch, or security-challenge UI. Once resolved, normal resolved suppression applies. Never replay a missed or user-canceled slot. Bounded retries are allowed only for pre-click failures in the current slot; after one attempted click, stop that locale and preserve its receipt. Continue only untouched work under the current authorized slot policy. A `publish_intent` is a pre-click/at-most-once boundary, never proof of publication. Settings/code-only requests do not authorize live posting.
