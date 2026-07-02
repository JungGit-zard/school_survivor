// Shared mutable registry — Enemy.jsx writes every frame, ZombieInstanceLayer reads.
// Bypasses React state to avoid 76-enemy re-render cascade.

const _entries = new Map()  // id → ZombieVisualEntry

export const zombieVisualRegistry = {
  register(id, entry) { _entries.set(id, { ...entry }) },
  unregister(id) { _entries.delete(id) },
  update(id, patch) {
    const e = _entries.get(id)
    // 자가치유 upsert: entry가 어떤 이유로든 소실되면(HMR 모듈 재평가 등) 재생성해
    // "체력바만 남고 몸통 투명" 영구화를 막는다. 죽은 적은 update()를 호출하지
    // 않으므로(Enemy.jsx dead 체크 선행) 유령 부활은 불가능하다.
    if (!e) { _entries.set(id, { ...patch }); return }
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
