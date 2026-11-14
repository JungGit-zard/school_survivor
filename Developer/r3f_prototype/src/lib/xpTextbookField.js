import * as THREE from 'three'
import { stepMagnetPull } from './pickup.js'

// XP 교과서 1권의 움직임(2026-11-13 인스턴스 층 전환 때 XpTextbook.jsx에서 그대로 옮김 — 동작 변화 없음).
// 좀비 사망 위치(pos)에서 착지 지점(land)으로 휘리릭 포물선 → 툭 착지 → 자석 끌림 + 둥둥 플로트 → 수집.
// 미리보기용 XpTextbook 컴포넌트와 게임용 XpTextbookLayer가 같은 함수를 쓴다.
export const TEXTBOOK_FLOOR_Y = 0.13
export const TEXTBOOK_TOSS_MS = 460     // 휘리릭 날아가 착지하기까지 시간
export const TEXTBOOK_HOP_HEIGHT = 0.85 // 포물선 최고 높이
export const TEXTBOOK_SCALE = 0.8       // 바깥 group 축척
const easeOut = (t) => 1 - (1 - t) * (1 - t)

export const TEXTBOOK_TOSS = 'toss'
export const TEXTBOOK_LANDED = 'landed'       // 이번 프레임에 착지했다
export const TEXTBOOK_FLOAT = 'float'
export const TEXTBOOK_COLLECTED = 'collected' // 이번 프레임에 주웠다

export function createTextbookItem({ id, pos, value }, land) {
  const p = { x: pos[0], y: TEXTBOOK_FLOOR_Y, z: pos[2] }
  return {
    id,
    pos,
    value,
    land,
    p,
    pRef: { current: p },
    seed: pos[0] * 11.3 + pos[2] * 7.7,
    // 착지 후 플로트 시간. 플레이 중에만 누적해야 일시정지 해제 때 회전·출렁임이 튀지 않는다.
    floatSec: 0,
    tossMs: 0,
    landed: false,
    collected: false,
    // 예전 바깥 group의 자세(위치·회전). 처음엔 사망 위치 바닥, 회전 0.
    position: new THREE.Vector3(pos[0], TEXTBOOK_FLOOR_Y, pos[2]),
    rotation: new THREE.Euler(0, 0, 0),
    slot: -1,
  }
}

export function stepTextbookItem(item, delta) {
  if (item.collected) return TEXTBOOK_COLLECTED
  const { pos, land } = item
  // 1) 던지기: pos에서 근처 랜덤 지점으로 휘리릭 포물선 비행 → 툭 착지
  if (!item.landed) {
    item.tossMs += delta * 1000
    const t = Math.min(1, item.tossMs / TEXTBOOK_TOSS_MS)
    const e = easeOut(t) // 수평은 감속하며 도착
    const x = pos[0] + (land.x - pos[0]) * e
    const z = pos[2] + (land.z - pos[2]) * e
    const hop = Math.sin(t * Math.PI) * TEXTBOOK_HOP_HEIGHT
    item.p.x = x
    item.p.z = z
    item.position.set(x, TEXTBOOK_FLOOR_Y + hop, z)
    // 휘리릭 회전 — 착지로 갈수록 잦아듦
    const spin = (1 - t) * 18 + 2
    item.rotation.x += delta * spin
    item.rotation.y += delta * spin * 0.7
    item.rotation.z += delta * spin * 0.5
    if (t >= 1) {
      item.landed = true
      item.p.x = land.x
      item.p.y = TEXTBOOK_FLOOR_Y
      item.p.z = land.z
      // 착지 시 평평하게 눕힘 (이후 둥둥 플로트가 y축 회전만 사용)
      item.rotation.set(0, 0, 0)
      return TEXTBOOK_LANDED
    }
    return TEXTBOOK_TOSS
  }

  // 2) 착지 후: 자석 끌림 + 둥둥 플로트
  if (stepMagnetPull(item.pRef, delta) === 'collected') {
    item.collected = true
    return TEXTBOOK_COLLECTED
  }

  // 둥둥 떠있는 플로트 (Y 위아래 + Z 앞뒤로 살짝)
  item.floatSec += delta
  const t = item.floatSec * 1.8 + item.seed
  const bobY = Math.sin(t) * 0.06
  const bobZ = Math.cos(t * 0.8) * 0.04
  const p = item.p
  item.position.set(p.x, p.y + bobY, p.z + bobZ)
  item.rotation.y = item.floatSec * 0.6
  return TEXTBOOK_FLOAT
}
