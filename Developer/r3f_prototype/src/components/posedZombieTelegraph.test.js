import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  POSED_ZOMBIE_PART_COUNT,
  POSED_ZOMBIE_RECOVER_DAMPING,
  POSED_ZOMBIE_STATE_POSE_DELTAS,
  POSED_ZOMBIE_TYPES,
  buildPosedZombieParts,
  buildPosedZombieStatePose,
} from './ZombieMesh.jsx'
import { phase } from './ZombieInstanceLayer.jsx'
import {
  ENEMY_STATE_NOVEL_APPROACH,
  ENEMY_STATE_NOVEL_ATTACK,
  ENEMY_STATE_NOVEL_ATTACK_ALT,
  ENEMY_STATE_NOVEL_RECOVER,
  ENEMY_STATE_NOVEL_RECOVER_ALT,
  ENEMY_STATE_NOVEL_TELEGRAPH,
  ENEMY_STATE_NOVEL_TELEGRAPH_ALT,
} from '../lib/novelZombieBehavior.js'

function poolWithState(state) {
  return { state: [state] }
}

describe('신규 12종 상태 코드가 예고/타격/회복 포즈로 매핑된다', () => {
  it('7~13이 모두 평시로 떨어지지 않는다 (BLOCKER 회귀 잠금)', () => {
    expect(phase(poolWithState(ENEMY_STATE_NOVEL_TELEGRAPH), 0)).toBe('warn')
    expect(phase(poolWithState(ENEMY_STATE_NOVEL_TELEGRAPH_ALT), 0)).toBe('warn')
    expect(phase(poolWithState(ENEMY_STATE_NOVEL_ATTACK), 0)).toBe('charge')
    expect(phase(poolWithState(ENEMY_STATE_NOVEL_ATTACK_ALT), 0)).toBe('charge')
    expect(phase(poolWithState(ENEMY_STATE_NOVEL_RECOVER), 0)).toBe('stun')
    expect(phase(poolWithState(ENEMY_STATE_NOVEL_RECOVER_ALT), 0)).toBe('stun')
    // 접근은 평시 보행이 맞다.
    expect(phase(poolWithState(ENEMY_STATE_NOVEL_APPROACH), 0)).toBe('normal')
  })

  it('기존 상태 코드 매핑이 바뀌지 않았다', () => {
    expect(phase(poolWithState(1), 0)).toBe('normal')
    expect(phase(poolWithState(2), 0)).toBe('warn')
    expect(phase(poolWithState(3), 0)).toBe('charge')
    expect(phase(poolWithState(4), 0)).toBe('stun')
    expect(phase(poolWithState(5), 0)).toBe('normal')
    expect(phase(poolWithState(6), 0)).toBe('normal')
  })
})

describe('상태 포즈 델타 — 파트 슬롯 증설 없이 회전만', () => {
  it('12종 전부 예고·타격 델타를 가지고 슬롯 수는 13개 그대로다', () => {
    expect(POSED_ZOMBIE_TYPES).toHaveLength(12)
    expect(POSED_ZOMBIE_PART_COUNT).toBe(13)
    POSED_ZOMBIE_TYPES.forEach((type) => {
      const deltas = POSED_ZOMBIE_STATE_POSE_DELTAS[type]
      expect(deltas, type).toBeTruthy()
      expect(Object.keys(deltas).sort()).toEqual(['attack', 'telegraph'])
      ;['telegraph', 'attack'].forEach((key) => {
        // 회전 3축만. 위치·스케일·소품·질감은 하나도 없다.
        Object.values(deltas[key]).forEach((axis) => expect(axis).toHaveLength(3))
      })
      ;['warn', 'charge', 'stun'].forEach((state) => {
        const pose = buildPosedZombieStatePose(type, state)
        expect(pose, `${type}/${state}`).toHaveLength(POSED_ZOMBIE_PART_COUNT)
        pose.forEach((axis) => {
          expect(axis).toHaveLength(3)
          axis.forEach((value) => expect(Number.isFinite(value)).toBe(true))
        })
      })
      // 파트 행 자체는 그대로여야 한다 — 슬롯표·카탈로그 불변.
      expect(buildPosedZombieParts(type)).toHaveLength(POSED_ZOMBIE_PART_COUNT)
    })
    expect(buildPosedZombieStatePose('E01', 'warn')).toBeNull()
  })

  it('타입마다 예고 포즈와 타격 포즈가 실제로 다르다 (E34 기획 요구)', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      const warn = buildPosedZombieStatePose(type, 'warn').flat()
      const charge = buildPosedZombieStatePose(type, 'charge').flat()
      const l1 = warn.reduce((sum, value, index) => sum + Math.abs(value - charge[index]), 0)
      // 라디안 합. 0.8 이상이면 눈에 띄는 자세 변화다.
      expect(l1, `${type} 예고/타격 차이`).toBeGreaterThan(0.8)
    })
  })

  it('회복은 타격 포즈의 감쇠판이라 세 상태가 서로 구분된다', () => {
    expect(POSED_ZOMBIE_RECOVER_DAMPING).toBeGreaterThan(0)
    expect(POSED_ZOMBIE_RECOVER_DAMPING).toBeLessThan(1)
    POSED_ZOMBIE_TYPES.forEach((type) => {
      const charge = buildPosedZombieStatePose(type, 'charge').flat()
      const stun = buildPosedZombieStatePose(type, 'stun').flat()
      stun.forEach((value, index) => {
        expect(value).toBeCloseTo(charge[index] * POSED_ZOMBIE_RECOVER_DAMPING, 9)
      })
      // 그래도 평시(델타 0)와는 다르다.
      expect(stun.some((value) => Math.abs(value) > 0.03)).toBe(true)
    })
  })
})

// 회색조 판독 측정. balanceqa의 24×32 정면 투영을 같은 해상도로 재현한다.
// 주의: 이 래스터라이저는 각 박스의 **투영 AABB**를 채우므로 회전 사각형을 정확히
// 채우는 balanceqa 구현보다 보수적으로 넓다 — 절대값은 그쪽보다 높게 나온다.
// 따라서 단언은 절대 임계가 아니라 **같은 측정자 안에서의 상대 개선**으로 한다.
const GRID_W = 24
const GRID_H = 32
const VIEW = { x0: -1.3, x1: 1.3, y0: -0.1, y1: 2.1 }

function silhouette(type, state) {
  const parts = buildPosedZombieParts(type)
  const delta = state ? buildPosedZombieStatePose(type, state) : null
  const grid = new Uint8Array(GRID_W * GRID_H)
  const matrix = new THREE.Matrix4()
  const scratch = new THREE.Matrix4()
  const corner = new THREE.Vector3()
  parts.forEach((part, index) => {
    const euler = new THREE.Euler(
      part.rot[0] + (delta ? delta[index][0] : 0),
      part.rot[1] + (delta ? delta[index][1] : 0),
      part.rot[2] + (delta ? delta[index][2] : 0),
    )
    matrix.makeTranslation(part.pivot[0], part.pivot[1], part.pivot[2])
    matrix.multiply(scratch.makeRotationFromEuler(euler))
    matrix.multiply(scratch.makeTranslation(part.offset[0], part.offset[1], part.offset[2]))
    matrix.multiply(scratch.makeScale(part.box[0], part.box[1], part.box[2]))
    const half = [part.size[0] / 2, part.size[1] / 2, part.size[2] / 2]
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (let c = 0; c < 8; c += 1) {
      corner
        .set(c & 1 ? half[0] : -half[0], c & 2 ? half[1] : -half[1], c & 4 ? half[2] : -half[2])
        .applyMatrix4(matrix)
      minX = Math.min(minX, corner.x)
      maxX = Math.max(maxX, corner.x)
      minY = Math.min(minY, corner.y)
      maxY = Math.max(maxY, corner.y)
    }
    const cx0 = Math.max(0, Math.floor(((minX - VIEW.x0) / (VIEW.x1 - VIEW.x0)) * GRID_W))
    const cx1 = Math.min(GRID_W - 1, Math.ceil(((maxX - VIEW.x0) / (VIEW.x1 - VIEW.x0)) * GRID_W) - 1)
    const cy0 = Math.max(0, Math.floor(((minY - VIEW.y0) / (VIEW.y1 - VIEW.y0)) * GRID_H))
    const cy1 = Math.min(GRID_H - 1, Math.ceil(((maxY - VIEW.y0) / (VIEW.y1 - VIEW.y0)) * GRID_H) - 1)
    for (let y = cy0; y <= cy1; y += 1) {
      for (let x = cx0; x <= cx1; x += 1) grid[y * GRID_W + x] = 1
    }
  })
  return grid
}

function iou(a, b) {
  let intersection = 0
  let union = 0
  for (let k = 0; k < a.length; k += 1) {
    if (a[k] && b[k]) intersection += 1
    if (a[k] || b[k]) union += 1
  }
  return union ? intersection / union : 0
}

function pairIou(state) {
  const silhouettes = POSED_ZOMBIE_TYPES.map((type) => silhouette(type, state))
  const result = new Map()
  for (let a = 0; a < POSED_ZOMBIE_TYPES.length; a += 1) {
    for (let b = a + 1; b < POSED_ZOMBIE_TYPES.length; b += 1) {
      result.set(`${POSED_ZOMBIE_TYPES[a]}/${POSED_ZOMBIE_TYPES[b]}`, iou(silhouettes[a], silhouettes[b]))
    }
  }
  return result
}

describe('회색조 실루엣 — 예고 포즈가 최악 쌍을 갈라놓는다', () => {
  // balanceqa가 지목한 base IoU 상위 4쌍.
  const WATCH_PAIRS = ['E35/E36', 'E35/E43', 'E34/E44', 'E40/E42']

  it('지목된 4쌍 모두 예고 포즈에서 평시보다 분명히 갈라진다', () => {
    const base = pairIou(null)
    const warn = pairIou('warn')
    WATCH_PAIRS.forEach((pair) => {
      const baseValue = base.get(pair)
      const warnValue = warn.get(pair)
      expect(baseValue, pair).toBeGreaterThan(0)
      // 평시보다 낮아야 하고, 측정 노이즈가 아닌 폭(0.05 이상)이어야 한다.
      expect(warnValue, `${pair} base=${baseValue} warn=${warnValue}`).toBeLessThan(baseValue - 0.05)
    })
  })

  it('예고 포즈가 66쌍 중앙값도 평시보다 낮춘다', () => {
    const median = (map) => {
      const values = Array.from(map.values()).sort((a, b) => a - b)
      return values[Math.floor(values.length / 2)]
    }
    const base = pairIou(null)
    const warn = pairIou('warn')
    expect(base.size).toBe(66)
    expect(warn.size).toBe(66)
    expect(median(warn)).toBeLessThan(median(base))
  })

  it('모든 타입의 예고 실루엣이 자기 평시 실루엣과 다르다 (평시 보행 렌더 회귀 방지)', () => {
    POSED_ZOMBIE_TYPES.forEach((type) => {
      const base = silhouette(type, null)
      const warn = silhouette(type, 'warn')
      const charge = silhouette(type, 'charge')
      expect(iou(base, warn), `${type} 평시↔예고`).toBeLessThan(0.95)
      expect(iou(warn, charge), `${type} 예고↔타격`).toBeLessThan(0.95)
    })
  })
})

describe('예고 중 제자리 걷기가 사라졌다', () => {
  it('포즈형은 예고·회복에서 보행 사인을 멈춘다 (기존 타입 warn은 불변)', () => {
    const source = fs.readFileSync(new URL('./ZombieInstanceLayer.jsx', import.meta.url), 'utf8')
    expect(source).toContain("const planted = state === 'stun' || (posed > 0 && state === 'warn')")
    expect(source).toContain('const walk = planted ? 0 :')
    expect(source).toContain('setPartRotation(e,part[0],time,type,state,posed)')
    expect(source).toContain('POSED_STATE_POSE_BY_TYPE[posed-1][state]')
  })
})
