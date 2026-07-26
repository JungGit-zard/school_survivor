export const MAX_ENEMY_HIT_EVENTS = 256

export class EnemyHitEventQueue {
  constructor(capacity = MAX_ENEMY_HIT_EVENTS) {
    this.capacity = capacity
    this.x = new Float32Array(capacity)
    this.sparkY = new Float32Array(capacity)
    this.numberY = new Float32Array(capacity)
    this.z = new Float32Array(capacity)
    this.amount = new Float32Array(capacity)
    this.critical = new Uint8Array(capacity)
    this.read = 0
    this.write = 0
    this.count = 0
    this.dropped = 0
  }

  push(x, sparkY, numberY, z, amount, critical = false) {
    if (this.count >= this.capacity || !Number.isFinite(x) || !Number.isFinite(sparkY) || !Number.isFinite(numberY) || !Number.isFinite(z) || !Number.isFinite(amount)) {
      this.dropped += 1
      return false
    }
    const slot = this.write
    this.x[slot] = x; this.sparkY[slot] = sparkY; this.numberY[slot] = numberY; this.z[slot] = z; this.amount[slot] = amount
    this.critical[slot] = critical ? 1 : 0
    this.write = (slot + 1) % this.capacity
    this.count += 1
    return true
  }

  drainInto(out) {
    if (!out || this.count === 0) return false
    const slot = this.read
    out.x = this.x[slot]; out.sparkY = this.sparkY[slot]; out.numberY = this.numberY[slot]; out.z = this.z[slot]; out.amount = this.amount[slot]
    out.critical = this.critical[slot] === 1
    this.read = (slot + 1) % this.capacity
    this.count -= 1
    return true
  }
}

export function createEnemyHitEventQueue(capacity) { return new EnemyHitEventQueue(capacity) }
