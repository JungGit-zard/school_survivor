# Quest Acceptance Mobile Readability - 2026-10-11

## Scope
- Task: Improve mobile quest acceptance readability for the Escape! zombie school R3F HUD.
- Branch: `zombie_only`.
- Focus files:
  - `Developer/r3f_prototype/src/components/HUD.jsx`
  - `Developer/r3f_prototype/src/components/HUD.questInventory.test.jsx`

## Changes
- Grouped the quest received title and next objective into a dedicated `questDialoguePrimary` block so the two high-priority messages stay adjacent with minimal spacing.
- Made NPC dialogue visually secondary by reducing its weight, line height, padding, and responsive font ceiling while preserving the dark ivory presentation.
- Increased the quest title/next-action hierarchy with responsive `clamp(...)` font sizing and tighter line heights.
- Reduced clutter in the divider and content gaps.
- Added mobile-safe popup sizing with `min(calc(100vw - 24px), 560px)`, `maxHeight: calc(100dvh - 48px)`, `overflowY: auto`, and responsive portrait image sizing.
- Kept tap-to-close, quest logic, localization strings, graphics, and unrelated HUD behavior unchanged.

## Verification
- Mandatory precommand checker: passed using the checkout-local checker path after the canonical D: project path was unavailable in this workspace.
- Required documents were read before implementation.
- Initial dependency install failed with the configured npm cache/log path, then succeeded with a local scoped cache:
  - `NPM_CONFIG_CACHE='./.npm-cache' npm ci --prefer-online --no-audit --no-fund`
- Focused regression test passed:
  - Command: `NPM_CONFIG_CACHE='./.npm-cache' npm run test -- src/components/HUD.questInventory.test.jsx`
  - Result: `1 passed (1)`, `10 passed (10)`.
- The worker build attempt stopped at the release env gate because the clean checkout did not yet contain its ignored `.env` file.
- Advisor final build verification after copying the existing release environment file without displaying its contents:
  - Command: `npm.cmd run build`
  - Result: PASS. Firebase release env gate, branch guard, legacy B02 source/artifact gates, dialogue store gate, Studio/game sync tests (45/45), Vite production build, and Hosting asset verification (56 assets) all passed.
- Advisor mobile browser verification:
  - 360x800 viewport: the popup stayed within the viewport with 12px side margins, the NPC dialogue was visibly smaller than the quest notice and next action, and tapping the popup closed it and resumed gameplay.

## Notes
- The test assertions avoid direct `clamp(...)` parsing because jsdom drops unsupported complex CSS values from `element.style`; instead, regression coverage checks DOM adjacency, hierarchy-related line height/weight/padding, and popup overflow behavior.
- No commit, push, or deploy was performed.
