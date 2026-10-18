# X homepage link-card automation — 2026-10-18

## Fixed behavior

- `posting_config.json` now keeps `x_link_card.enabled: true` with `https://escapezombie.com` as the base URL.
- The scheduled five-slot runner calls X with `-Run -SinglePost -PublishOnly` and omits `-DirectPhoto`. The existing X runner therefore binds the selected image's SHA-256 to `/share/x/<locale>/<sha256-prefix>`, checks the exact public card and composer preview, and stops on readiness failure. It must not fall back to a direct photo post. An explicit `-DirectPhoto` request is rejected when website cards are enabled for `PublishOnly -SinglePost`.
- `Build-XWebsiteCards.mjs` remains the only card generator; `XWebsiteCardReadiness.ps1`, the frozen receipt, and the X UI guards remain the existing readiness and at-most-once controls. No replacement implementation was added.

## Asset and deployment evidence

- The current generated pool contains 76 candidate cards (19 per locale). SHA comparison against the prior cached manifest found 23 new image variants that were not in that earlier snapshot (ja 5, en 5, vi 6, ko 7).
- The existing `Deploy-XWebsiteCards.cjs` plan-only check against live Hosting version `3ed993a4876b8335` identified 46 additive HTML/PNG paths and 106 byte-identical files. An attempted preview promotion stopped before live release because Hosting changed during preview (`Live Hosting release/config changed during preview; refusing promotion`).
- Re-reading the changed live baseline `65d2acb686b75f1b` found all 152 files from the current generated manifest already present with identical hashes (`newFileCount: 0`, `alreadyPresentCount: 152`). No additional deployment was needed or completed by this task.
- The 23 newly added dialogue-filled card URLs and their PNGs were then checked directly against the live origin: all 23 pages returned HTTP 200 with `text/html`, the required `summary_large_image` and exact `twitter:image` metadata; all 23 images returned HTTP 200 with `image/png` and matched the generated source SHA-256.
- The main-session dry-run selected `ja 555f084bc70b267c`, `en ba5eedd9009e106a`, `vi cc5766b7f486b2c7`, and `ko 20650156a69972cb`; all four card pages and PNGs returned HTTP 200 with `summary_large_image`, exact image URL, and matching PNG hash. The dry-run reported `published0` and `uiTouchedfalse`. This verifies current next selections only; the X composer/native card click and actual publication were not tested or authorized.
- The reason `x_link_card.enabled` was originally false is not recorded in the current config. Historical status reports contain X card readiness timeouts; they are evidence of earlier operational issues, not proof of the exact change that disabled the flag. Missing or unreachable cards continue to fail closed and surface as failures.

## Verification

- `Build-XWebsiteCards.mjs` generated all 76 configured cards in a temporary directory.
- `Deploy-XWebsiteCards.cjs` plan-only read confirmed no live additions were needed after the concurrent Hosting update. The race guard prevented the earlier promotion.
- Main ran `Test-XWebsiteCardReadiness.ps1` (5 cases) and `Build-XWebsiteCards.test.mjs` (2/2), then verified the four next-selected public card pairs. Main also verified the scheduled X dry-run returns `website_card` for all four locales and rejects `-DirectPhoto` when card mode is enabled.
- Existing `Test-WindowsXPostingLaunch.ps1` and `Test-WindowsXPostingAccountIdentity.ps1` static tests fail on old account-menu/auth-wait text expectations. The current exact `@jungsilx` guard was not changed. `Deploy-XWebsiteCards.test.cjs` passed 5/5.

No posting receipts, browser state, homepage source, or unrelated Hosting assets were modified by this task.
