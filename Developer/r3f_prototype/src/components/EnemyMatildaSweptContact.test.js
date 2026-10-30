import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MATILDA_CONTACT_PLAYER_OVERLAP_THRESHOLD,
  MATILDA_EDGE_INSET,
  clampMatildaDashSpeedToBounds,
  isMatildaBodyContact,
  isMatildaSweptBodyContact,
} from './Enemy.jsx'

// 돌진 계수 0.03(2026-10-30) 이후 한 프레임 이동이 치사 폭을 넘어 플레이어를 뚫고 지나가던 결함 회귀.
describe('Matilda swept dash contact', () => {
  const halfX = 0.5
  const halfZ = 0.2

  it('한 프레임에 플레이어를 통째로 넘어가는 돌진도 접촉으로 잡는다 (점 판정은 놓친다)', () => {
    const step = { fromX: 0, fromZ: -3, enemyX: 0, enemyZ: 3, yaw: 0, playerX: 0, playerZ: 0, halfX, halfZ }
    expect(isMatildaBodyContact(step)).toBe(false)
    expect(isMatildaBodyContact({ ...step, enemyZ: -3 })).toBe(false)
    expect(isMatildaSweptBodyContact(step)).toBe(true)
  })

  it('회전된 돌진(yaw 90°)에서도 몸통 폭 기준으로 잡는다', () => {
    const yaw = Math.PI / 2
    // 로컬 x(넓은 축)가 월드 z로 돈 상태. 월드 x로 돌진하며 플레이어를 넘는다.
    expect(isMatildaSweptBodyContact({ fromX: -4, fromZ: 0, enemyX: 4, enemyZ: 0, yaw, playerX: 0, playerZ: halfX, halfZ, halfX })).toBe(true)
  })

  it('나란히 스쳐 지나가는 돌진은 접촉이 아니다', () => {
    const offset = halfX + MATILDA_CONTACT_PLAYER_OVERLAP_THRESHOLD + 0.05
    expect(isMatildaSweptBodyContact({ fromX: 0, fromZ: -3, enemyX: 0, enemyZ: 3, yaw: 0, playerX: offset, playerZ: 0, halfX, halfZ })).toBe(false)
  })

  it('플레이어에 못 미치는 짧은 돌진은 접촉이 아니고, 이동이 0이면 점 판정과 같다', () => {
    expect(isMatildaSweptBodyContact({ fromX: 0, fromZ: -3, enemyX: 0, enemyZ: -1, yaw: 0, playerX: 0, playerZ: 0, halfX, halfZ })).toBe(false)
    const still = { fromX: 0, fromZ: 0.1, enemyX: 0, enemyZ: 0.1, yaw: 0, playerX: 0, playerZ: 0, halfX, halfZ }
    expect(isMatildaSweptBodyContact(still)).toBe(isMatildaBodyContact(still))
  })

  it('Enemy.jsx는 돌진(charge) 상태에서만 스윕 판정을 쓴다', () => {
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    expect(source).toContain("if (chargeState.current === 'charge') {\n          contactArgs.fromX = matildaPreviousChargePosRef.current.x")
    expect(source).toContain('matildaBodyContact = isMatildaSweptBodyContact(contactArgs)')
    expect(source).toContain('matildaBodyContact = isMatildaBodyContact(contactArgs)')
  })
})

describe('Matilda dash bounds clamp', () => {
  const bounds = { halfX: 10, halfZ: 10 }

  it('한 프레임 이동이 가장자리(bounds - inset)를 넘지 않게 속도를 깎는다', () => {
    const limit = bounds.halfX - MATILDA_EDGE_INSET
    const speed = clampMatildaDashSpeedToBounds({ x: limit - 0.5, z: 0 }, { x: 1, z: 0 }, 100, 1 / 30, bounds)
    expect(speed * (1 / 30)).toBeCloseTo(0.5, 10)
  })

  it('가장자리에서 먼 돌진·반대 방향·이미 넘어선 위치는 그대로 둔다', () => {
    expect(clampMatildaDashSpeedToBounds({ x: 0, z: 0 }, { x: 1, z: 0 }, 5, 1 / 60, bounds)).toBe(5)
    expect(clampMatildaDashSpeedToBounds({ x: 8.5, z: 0 }, { x: -1, z: 0 }, 100, 1 / 30, bounds)).toBe(100)
    expect(clampMatildaDashSpeedToBounds({ x: 9.5, z: 0 }, { x: 1, z: 0 }, 100, 1 / 30, bounds)).toBe(100)
  })
})
