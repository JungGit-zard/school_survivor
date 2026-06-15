---
title: CoinShop Back Navigation Returns to Wrong Screen When Opened from Multiple Origins
date: 2026-06-16
category: CEO/docs/solutions/ui-bugs/
module: Screen navigation (App.jsx)
problem_type: ui_bug
component: frontend_stimulus
severity: medium
symptoms:
  - Navigating Title to CoinShop and pressing Back lands on the game screen instead of the title screen
  - Game screen renders with stale or uninitialized game state after returning from CoinShop
  - Back button destination is wrong when a sub-screen has multiple entry points
  - "`TypeError: onOpenCoinShop is not a function` thrown when an optional callback prop is called without optional chaining"
root_cause: logic_error
resolution_type: code_fix
related_components:
  - TitleScreen.jsx
  - CoinShop.jsx
  - HUD.jsx
tags:
  - react
  - screen-navigation
  - state-management
  - coinshop
  - prevscreen
  - back-navigation
  - ui-flow
  - optional-chaining
---

# CoinShop Back Navigation Returns to Wrong Screen When Opened from Multiple Origins

## Problem

`CoinShop` is reachable from two distinct origins: the TitleScreen and the in-game HUD. Its `onBack` handler was hardcoded to always navigate to `'game'`, so users who entered from the TitleScreen were dropped into the game screen with stale phase state instead of returning to the title.

A secondary issue: the `onOpenCoinShop` callback was called in `TitleScreen.jsx` without optional chaining, causing a `TypeError` crash if the prop was not provided.

## Symptoms

- User flow: **Title → CoinShop → Back** → lands on `'game'` screen, not `'title'`
- Game screen renders with wrong phase state (no game session was started, but the screen appears)
- `TypeError: onOpenCoinShop is not a function` if `TitleScreen` is rendered without the prop

## What Didn't Work

The hardcoded back destination was introduced when CoinShop was first reachable only from in-game. When a second entry point (TitleScreen) was added, the `onBack` handler was not updated to account for the new origin. The single-origin assumption silently broke the title-origin path.

## Solution

Track which screen opened `CoinShop` using a `prevScreen` state variable in `App.jsx`, set at each call site before transitioning.

**Before:**

```jsx
// hardcoded — always returns to game regardless of origin
<CoinShop onBack={() => setScreen('game')} />

// TitleScreen call site — no origin recorded
onOpenCoinShop={() => setScreen('coinShop')}
```

**After:**

```jsx
// App.jsx
const [prevScreen, setPrevScreen] = useState('title')

// TitleScreen call site — records origin before transitioning
onOpenCoinShop={() => { setPrevScreen('title'); setScreen('coinShop') }}

// In-game HUD call site — records origin before transitioning
onOpenCoinShop={() => { setPrevScreen('game'); setScreen('coinShop') }}

// CoinShop receives dynamic return destination
onBack={() => setScreen(prevScreen === 'game' ? 'game' : 'title')}
```

Also add optional chaining on the callback prop in TitleScreen:

```jsx
// BEFORE — throws TypeError if prop is omitted
onClick={() => onOpenCoinShop()}

// AFTER — safe when prop is absent
onClick={() => onOpenCoinShop?.()}
```

## Why This Works

`prevScreen` captures intent at the moment of navigation rather than inferring origin at the moment of return. Because React state is set synchronously alongside the `setScreen` call, `prevScreen` is always accurate when `onBack` fires later. The pattern scales cleanly if a third entry point is added — it only requires setting `setPrevScreen` at the new call site.

The fix was deliberately committed as a separate concern from the weapon integration work it accompanied (`3a19cf0 fix(ui): return from coin shop to source screen`), keeping the navigation fix atomic and reviewable on its own. (session history)

## Prevention

**Pattern rule:** Any time a screen or modal can be reached from more than one origin, the navigation state must include the return destination. Never hardcode a `setScreen` literal in a back/close handler if the component is reachable from multiple screens.

**Checklist for shared screens or modals:**

1. Identify all call sites that open the screen.
2. Add a `prevScreen` (or `returnTo`) state variable in the parent (`App.jsx`).
3. Each call site sets `prevScreen` immediately before calling `setScreen`.
4. The back handler reads `prevScreen` rather than a literal screen name.

**Optional callback props** must use optional chaining (`?.()`) at the call site. Props that wire up navigation between screens are especially at risk since they may be omitted in test harnesses or when the parent component is refactored.

## Related

- `CEO/docs/solutions/architecture-patterns/result-gated-passive-shop-flow-2026-05-17.md` — documents the intended architecture for gating coin shop access from the result screen; complementary context for the correct CoinShop integration pattern.
