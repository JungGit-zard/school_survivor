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
const RUNTIME_TABLE_TYPES = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'RZL', 'RZC', 'RZT', 'RZG']

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
})
