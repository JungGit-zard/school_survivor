---
title: Dead Zombie Ghost Rendering After Kill
date: 2026-07-02
category: ui-bugs
module: zombie_rendering
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - Dead instanced enemies (E01-E06) remain visible for 1-3 frames after being killed
  - Ghost frozen at last-known position, more visible at high kill rates
  - Only affects InstancedMesh types; B01 boss and Matilda (React mesh) are unaffected
root_cause: async_timing
resolution_type: code_fix
severity: medium
related_components:
  - ZombieInstanceLayer
  - zombieVisualRegistry
tags:
  - instanced-mesh
  - react-lifecycle
  - useframe
  - r3f
  - ghost-rendering
  - async-timing
  - enemy-death
  - visual-registry
---

# Dead Zombie Ghost Rendering After Kill

## Problem

After an enemy was killed, a ghost copy continued to render on screen for 1–3 frames before disappearing. The ghost appeared frozen at the death position, creating a disorienting visual artifact more noticeable at high kill rates.

## Symptoms

- Dead instanced enemies (E01–E06) remain briefly visible after being killed
- Ghost is frozen at the last known position (no movement, no animation update)
- Only affects InstancedMesh-rendered types; B01 boss and Matilda use React mesh and are unaffected
- Physics and damage were already correct; the bug was purely visual

## What Didn't Work

- **Knockback null-coalescing check**: `impact.knockback ?? 0.85` — confirmed `??` passes `0` through correctly, not the bug
- **SharkMissile same-frame double-fire**: parent `usePlayingFrame` registers before child, so `activeMissileCount === 1` is seen while missile is in flight; not reproducible
- **`useEffect` cleanup as the only unregister path**: works for normal unmounts but fires 1–3 frames too late when death is triggered in a physics-frame callback

## Solution

Add an immediate `zombieVisualRegistry.unregister(id)` call in the `_enemyHit` death handler, before React state updates are queued.

**Before (Enemy.jsx — death handler):**
```js
if (hpRef.current <= 0) {
  dead.current = true
  rb.current._enemyDead = true
  rb.current._enemyHit = null
  enemyBodies.delete(id)
  // No unregister here — relied on useEffect cleanup (too late)
  onDeath?.(id, { ... })
}

// useEffect cleanup (deferred, runs after React commit):
return () => {
  enemyBodies.delete(id)
  if (useInstanced) zombieVisualRegistry.unregister(id)
}
```

**After (Enemy.jsx — death handler):**
```js
if (hpRef.current <= 0) {
  dead.current = true
  rb.current._enemyDead = true
  rb.current._enemyHit = null
  enemyBodies.delete(id)
  // 죽는 즉시 제거 — useEffect cleanup은 React 커밋 후라서 늦음
  if (useInstanced) zombieVisualRegistry.unregister(id)  // ← ADDED
  onDeath?.(id, { ... })
}

// useEffect cleanup kept as safety net for non-death unmounts:
return () => {
  enemyBodies.delete(id)
  if (useInstanced) zombieVisualRegistry.unregister(id)
}
```

## Why This Works

`zombieVisualRegistry` is a module-level `Map` used as an **imperative bridge** between Enemy.jsx (logic) and ZombieInstanceLayer.jsx (GPU InstancedMesh rendering). ZombieInstanceLayer reads this registry in `useFrame` — every frame, synchronously, bypassing React state.

The timing gap before the fix:

```
Frame N:  _enemyHit fires
          → dead.current = true
          → onDeath() → setEnemies() queued [React batches this]
          → ZombieInstanceLayer.useFrame reads registry
            ← DEAD ENEMY STILL IN REGISTRY → renders ghost

Frame N+1: React commit cycle runs
           → Enemy component unmounts
           → useEffect cleanup fires
           → zombieVisualRegistry.unregister(id)  ← TOO LATE
```

The fix closes the gap: `unregister(id)` is called synchronously inside the event handler, so the dead enemy is gone from the registry before ZombieInstanceLayer reads it next frame.

**Key insight:** When a React component writes to an imperative registry that a `useFrame` callback reads every frame, cleanup must happen in the event handler — not in `useEffect`. React's deferred batching and unmounting are incompatible with frame-by-frame imperative rendering.

## Prevention

**Convention — imperative registries must be cleaned up at the event, not in useEffect:**

When a module-level registry (Map, array) is written by a React component AND read imperatively every frame by a renderer, deletion must happen synchronously in the event handler that triggers removal. Keep `useEffect` cleanup as a safety net for unmounts triggered by other paths (stage end, player death).

```js
// ✓ Correct pattern
function onEnemyDeath() {
  myRegistry.delete(id)    // immediate, synchronous
  onDeath?.(id, payload)   // then trigger React state update
}
return () => { myRegistry.delete(id) }  // safety net only

// ✗ Wrong pattern
function onEnemyDeath() {
  onDeath?.(id, payload)   // React defers unmount
}
return () => { myRegistry.delete(id) }  // runs 1-3 frames late
```

**Test case to catch regressions:**
```js
it('removes instanced enemy from visual registry synchronously on kill', () => {
  // render enemy with hp=1
  triggerHit(1)  // lethal hit
  // assert immediately — no await, no tick
  expect(zombieVisualRegistry.entries.has(id)).toBe(false)
})
```

**Code review trigger:** When a component registers into a module-level registry in `useEffect` AND that registry is read every frame in `useFrame` → verify deletion is also in the event handler, not only in `useEffect` cleanup.

## Related Issues

- `CEO/docs/solutions/runtime-errors/r3f-useframe-cross-scope-ref-render-abort-2026-07-01.md` — Same files (Enemy.jsx, ZombieInstanceLayer, zombieVisualRegistry), different root cause (variable scope violation rather than async_timing). Documents another way the render loop can desync from React state.
- `CEO/docs/solutions/design-patterns/r3f-gate-useframe-on-game-phase-2026-06-03.md` — Phase-gating `useFrame` callbacks; complementary pattern for ensuring rendering respects logical game state.
