// Shared mutable registry — Enemy.jsx writes every frame, ZombieInstanceLayer reads.
// Bypasses React state to avoid 76-enemy re-render cascade.

const _entries = new Map()  // id → ZombieVisualEntry

export const zombieVisualRegistry = {
  register(id, entry) { _entries.set(id, { ...entry }) },
  unregister(id) { _entries.delete(id) },
  update(id, patch) {
    const e = _entries.get(id)
    if (!e) return
    e.x = patch.x; e.y = patch.y; e.z = patch.z
    e.yaw = patch.yaw
    e.type = patch.type
    e.phase = patch.phase
    e.wt = patch.wt
    e.vs = patch.vs
    e.hitFlash = patch.hitFlash
  },
  get entries() { return _entries },
}

// ZombieVisualEntry shape:
// { x, y, z, yaw, type, phase, wt (walkTime), vs (visualScale), hitFlash }
