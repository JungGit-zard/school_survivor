---
title: "R3F useFrame cross-scope ref causes silent render loop abort — canvas frozen"
date: 2026-07-01
category: runtime-errors
module: "Enemy / ZombieMesh instanced rendering"
problem_type: runtime_error
component: development_workflow
severity: critical
symptoms:
  - All zombie enemies invisible immediately after spawning
  - Game canvas frozen on last rendered frame; HUD timer continues counting
  - No crash dialog or user-visible error
  - Build and dev server start cleanly with no warnings
  - "ReferenceError: ageRef is not defined" present in browser DevTools console (easy to miss)
root_cause: scope_issue
resolution_type: code_fix
tags:
  - react-three-fiber
  - useframe
  - reference-error
  - scope
  - instanced-mesh
  - render-loop
  - silent-failure
  - enemy
related_components:
  - Enemy.jsx
  - ZombieInstanceLayer.jsx
  - EnemyProjectile
---

# R3F useFrame cross-scope ref causes silent render loop abort — canvas frozen

## Problem

A variable scoping mistake in `Enemy.jsx` caused `ageRef` (declared inside `EnemyProjectile`) to be referenced inside the separate `Enemy` component's `useFrame` callback. The resulting runtime `ReferenceError` silently killed the R3F render loop every frame, making the canvas appear frozen while all React UI continued running normally. All zombie enemies were invisible.

## Symptoms

- All zombies invisible — canvas displays last successfully rendered frame and never updates
- HUD timer and React UI elements continue counting/updating normally (no full app freeze)
- Game appears "frozen" or stuck on the spawn frame
- No visible error in the game UI — nothing obviously wrong from the player's perspective
- `ReferenceError: ageRef is not defined` in browser console (easy to miss if DevTools closed)
- Build succeeds with no warnings; TypeScript/Babel emit clean output

## What Didn't Work

- **Checking React state and store**: `useGameStore` values updated normally, pointing away from state as the culprit
- **Inspecting HUD/UI components**: These rendered fine, so the issue didn't appear to be React
- **Assuming a Three.js geometry or material problem**: The new InstancedMesh architecture was the natural suspect, but the mesh setup itself was correct
- **Looking for async timing issues**: The "frozen canvas" symptom suggested race conditions in the new registry bridge — a false lead

## Solution

In `Enemy.jsx`, inside the `Enemy` component's `useFrame` callback, replace the out-of-scope reference:

```js
// BEFORE (bug) — ageRef is defined in EnemyProjectile, not Enemy
zombieVisualRegistry.update(id, {
  // ...
  wt: ageRef.current,  // ReferenceError: ageRef is not defined
  // ...
})

// AFTER (fix) — performance.now() is a Web API global, always in scope
zombieVisualRegistry.update(id, {
  // ...
  wt: performance.now() * 0.001,  // milliseconds → seconds, always valid
  // ...
})
```

`performance.now()` returns a monotonically increasing timestamp in milliseconds. Multiplying by `0.001` converts to seconds, matching the unit expected by the walk animation phase (`Math.sin(wt * walkFrequency)`).

## Why This Works

**Root cause chain:**

1. `ageRef` is declared with `useRef(0)` inside `EnemyProjectile` — a separate function component defined earlier in the same `.jsx` file
2. JavaScript closures do not cross function boundaries — `Enemy`'s `useFrame` callback has no access to `EnemyProjectile`'s local `ageRef`
3. At runtime, every `useFrame` tick throws `ReferenceError: ageRef is not defined` synchronously
4. R3F's render loop iterates registered `useFrame` subscribers sequentially; a thrown error propagates out of that loop **before** `renderer.render(scene, camera)` is called
5. The Three.js canvas never gets a new draw command — it holds the last successfully painted frame indefinitely
6. React's reconciler runs on a separate cycle and is unaffected, so HUD/UI keeps updating
7. The next frame registers the same subscribers and throws again — indefinitely

**Why the build didn't catch it:** `ReferenceError` for an undeclared variable is a runtime JavaScript error, not a static type error. Babel/esbuild/Vite emit the code as-is. A `.jsx` file without strict TypeScript gets no coverage here.

**The silent-failure trap:** The frozen-canvas symptom is uniquely deceptive because the UI keeps working. Standard debugging intuition ("the app is running, so the error must be visual") points in the wrong direction. The actual cause is a one-line JavaScript scope violation logged clearly in the browser console.

## Prevention

### 1. Treat same-file ≠ same-scope

When multiple function components share a file, local `useRef`/`useState` declarations in one component are invisible to all others. Before shipping any `useFrame` callback that references a variable, trace every identifier back to its declaration site. If it lives inside another function's body, it is inaccessible.

**Rule:** When adding a cross-component feature (like a registry bridge), audit every variable reference in the new code block before committing.

### 2. Add ESLint `no-undef` for `.jsx` files

ESLint's `no-undef` rule catches references to undeclared identifiers statically, before runtime:

```jsonc
// eslint.config.js or .eslintrc
"rules": {
  "no-undef": "error"
}
```

A TypeScript migration (`.tsx`) would also surface this at `tsc --noEmit` time.

### 3. Check browser DevTools console first when canvas freezes in dev

A `ReferenceError` on line X is a one-line fix. The frozen-canvas symptom looks architectural but the console says exactly what went wrong. **Team norm: any time the canvas freezes during development, open DevTools console before investigating Three.js geometry, material, or async timing issues.**

### 4. R3F `useFrame` exceptions silently abort the entire frame

Unlike React render errors (which ErrorBoundary catches), an exception thrown inside `useFrame` propagates out of R3F's subscriber loop and aborts the `renderer.render()` call for that frame. There is no built-in recovery. The canvas stays on the last painted frame.

Consider adding a dev-mode monitor:

```js
// Detect "canvas not repainting" as a canary in development
// Canvas.onError fires for uncaught WebGL errors but not JS scope errors —
// a frame-count staleness check is more reliable.
```

### 5. Co-locate new registry write calls with existing working code

The `zombieVisualRegistry.update(...)` call was added at the bottom of a large `useFrame` callback. The safest pattern: write new blocks immediately adjacent to existing code that already uses the same variables, not at the end of a long function where identifier provenance is hard to see at a glance.

## Related Issues

- `CEO/docs/solutions/design-patterns/r3f-gate-useframe-on-game-phase-*.md` — related but distinct: covers phase-gating `useFrame` to prevent logic running during pause. Different root cause and fix. Both involve `useFrame` and `Enemy` components.
- Introduced during InstancedMesh performance refactor (draw calls: 1,824 → 24). The `zombieVisualRegistry` bridge was new code added as part of that feature.
