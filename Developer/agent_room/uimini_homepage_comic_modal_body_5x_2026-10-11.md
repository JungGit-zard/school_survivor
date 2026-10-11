# UI_Mini homepage comic modal body 5x handoff — 2026-10-11

## Scope

Kanban task: `t_ed51b199`

User clarification: `만화본문` means the full comic body inside the modal only. The prior thumbnail interpretation is rejected and was not carried into this clone.

Changed only:

- `Developer/r3f_prototype/src/components/WebLandingPage.jsx`
  - Moved the comic viewer dialog through `createPortal(..., document.body)` so the modal is fixed to the viewport instead of being trapped by the landing page's transformed/scrolling section.
  - Wrapped the full comic image in `.web-landing__comic-viewer-body` with native `overflow: auto` for vertical and horizontal access.
  - Kept header close button and previous/next controls outside the scrolling comic body.
  - Set the full comic image to `5x` the old contained artwork baseline using the old modal slot formula `calc(min(92dvh, 980px) - 136px)` and source ratio `1314 / 5160 = 0.2546511628`.
  - Did not change listing thumbnails, routes, Firebase, title, game content, or comic assets.
- `Developer/r3f_prototype/src/components/WebLandingPage.test.jsx`
  - Added focused assertions for modal body wrapper, 5x CSS contract, body scrolling, and portal-aware dialog lookup.
- `Developer/agent_room/uimini_homepage_comic_modal_body_5x_2026-10-11.md`
  - This handoff record.

## Verification

Mandatory pre-command checker:

- Profile: `uimini`
- Domain: `auto`
- matched_domains: `ui`
- match_evidence: `ui` keyword
- combined_receipt_sha256: `7c76b1078f3e4b86d5755f614d93269f0e8c13029e5e2720b138d4440bec9520`

Focused test:

```text
npm test -- src/components/WebLandingPage.test.jsx
```

Result:

```text
Test Files  1 passed (1)
Tests       11 passed (11)
Pretest gates passed: branch guard, legacy B02 source gate, dialogue store gate, studio-game sync source contract.
```

Browser dimension verification:

- Browser: local Chrome via Playwright API, headless.
- Baseline server: `http://localhost:5188/landing` from detached clean worktree at `c5099369`.
- Changed server: `http://localhost:5187/landing` from `C:/Users/admin/AppData/Local/Temp/escape-docs-comic-20261011`.
- Desktop viewport: `1280x800`.
- Mobile viewport: `390x844`.

Measured modal image/artwork dimensions:

| Viewport | Before old contained artwork baseline | After changed comic image | Ratio |
| --- | ---: | ---: | ---: |
| Desktop 1280x800 | `152.7907 x 600 px` computed from old `object-fit: contain` slot | `763.9531 x 2999.9844 px` | `5.0000 x 5.0000` by CSS slot baseline |
| Mobile 390x844 | `163.0969 x 640.4688 px` computed from old `object-fit: contain` slot | `815.4844 x 3202.3438 px` | `5.0000 x 5.0000` |

Additional browser observations:

- After desktop dialog body: `914 x 586 px`, `scrollHeight=3000`, `overflow=auto`.
- After mobile dialog body: `364 x 643.4688 px`, `scrollWidth=815`, `scrollHeight=3202`, `overflow=auto`.
- The old baseline desktop dialog was visibly affected by the landing page section transform/scroll position (`dialog y≈549.9`, content low/offscreen); the portal change keeps the changed dialog viewport-fixed (`dialog y≈38.4` desktop, `y≈33.8` mobile).

## Limits

- No commit, push, deploy, Firebase write, AAB/APK build, or Google Play action was performed.
- Temporary measurement files and servers were used only for local verification and are not part of the source change.

## Advisor release verification

- Source commit: `9480e7ed`, pushed to verified `origin/zombie_only`.
- Independently passed 11 focused tests; release gates passed another 45 tests, production build, and 56 JavaScript asset checks.
- Safe preview promotion: `npm run deploy:hosting:safe -- comic-body-5x-20261011`, completed successfully on retry.
- Fresh live browser: `https://escapezombie.com/` game title -> homepage link -> `/landing` -> comic body, confirmed.
- Live desktop 1264x569 image: 493.359375 x 1937.390625 px; mobile 390x844: 815.484375 x 3202.34375 px. Scale is 5; scroll is auto.
- Local next episode and Escape close checked independently. No Firebase data writes or authentication changes.
