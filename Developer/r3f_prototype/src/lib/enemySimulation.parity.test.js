import { describe, it, expect } from 'vitest'
import {
  ENEMY_RUNTIME_HP,
  ENEMY_RUNTIME_SPEED,
  ENEMY_RUNTIME_DAMAGE,
  ENEMY_RUNTIME_SCALE,
  ENEMY_RUNTIME_XP,
  ENEMY_RUNTIME_CONTACT_DIST,
} from './enemySimulation.js'
import { ENEMY_TYPE_CODES } from './enemyEntityPool.js'
import { ENEMY_STATS } from '../components/Enemy.jsx'

// ENEMY_STATS(실게임 드랍 경로)와 ENEMY_RUNTIME_*(순수 런타임 lookup, 측정 프로브가 읽음)는
// 같은 수치의 복사본 두 벌이다. 한쪽만 고치면 게임과 밸런스 프로브가 서로 다른 값으로 돌아
// "고쳤는데 프로브는 옛 값으로 합격"이 나온다. 실제로 E01 xp를 6→4로 내릴 때 이 함정을 밟을 뻔했다.
// 보스(B01~B04)는 런타임 테이블에서 의도적으로 0으로 비워둔 슬롯이라 제외한다.
const RUNTIME_TABLE_TYPES = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'RZL', 'RZC', 'RZT', 'RZG', 'E07']

const FIELDS = [
  ['hp', ENEMY_RUNTIME_HP],
  ['speed', ENEMY_RUNTIME_SPEED],
  ['damage', ENEMY_RUNTIME_DAMAGE],
  ['scale', ENEMY_RUNTIME_SCALE],
  ['xp', ENEMY_RUNTIME_XP],
  ['contactDist', ENEMY_RUNTIME_CONTACT_DIST],
]

describe('ENEMY_STATS ↔ ENEMY_RUNTIME_* 수치 패리티', () => {
  for (const [field, table] of FIELDS) {
    it(`${field}가 두 테이블에서 일치한다`, () => {
      for (const type of RUNTIME_TABLE_TYPES) {
        const code = ENEMY_TYPE_CODES[type]
        expect(code, `${type} 타입 코드`).toBeGreaterThan(0)
        // Float32Array라 소수 값은 fround 오차가 있다. 32비트로 내려 비교한다.
        expect(table[code], `${type}.${field}`).toBe(Math.fround(ENEMY_STATS[type][field]))
      }
    })
  }

  // 이번 작업의 본래 목적. 약한 적이 강한 적보다 보상이 높으면 강적을 잡을 이유가 없다.
  it('E01은 더 강한 E03보다 XP 보상이 높지 않다', () => {
    expect(ENEMY_STATS.E03.hp).toBeGreaterThan(ENEMY_STATS.E01.hp)
    expect(ENEMY_STATS.E01.xp).toBeLessThanOrEqual(ENEMY_STATS.E03.xp)
  })

  // 위 루프는 타입 하나라도 어긋나면 그 지점에서 멈춘다. E07은 신규 타입이라
  // 다른 타입의 기존 불일치에 가려지지 않도록 자기 슬롯만 따로 못박는다.
  it('E07(코드 15) 슬롯이 두 테이블에서 일치한다', () => {
    const code = ENEMY_TYPE_CODES.E07
    expect(code).toBe(15)
    for (const [field, table] of FIELDS) {
      expect(table.length, `${field} 테이블 길이`).toBeGreaterThan(code)
      expect(table[code], `E07.${field}`).toBe(Math.fround(ENEMY_STATS.E07[field]))
    }
  })

  // E07(웃는얼굴 좀비) = E01의 2배 hp/damage/speed. 더 두꺼운 적이 더 적은 보상이면 같은 역전이다.
  it('E07은 E01의 정확히 2배 스탯이고 E01/E03보다 XP 보상이 낮지 않다', () => {
    expect(ENEMY_STATS.E07.hp).toBe(ENEMY_STATS.E01.hp * 2)
    expect(ENEMY_STATS.E07.damage).toBe(ENEMY_STATS.E01.damage * 2)
    expect(ENEMY_STATS.E07.speed).toBe(ENEMY_STATS.E01.speed * 2)
    expect(ENEMY_STATS.E07.xp).toBeGreaterThanOrEqual(ENEMY_STATS.E01.xp)
    expect(ENEMY_STATS.E07.xp).toBeGreaterThanOrEqual(ENEMY_STATS.E03.xp)
  })
})
