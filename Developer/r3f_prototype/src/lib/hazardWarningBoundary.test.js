import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  PRESSURE_CAULDRON_WARNING_OUTER_RADIUS,
  isPressureCauldronWarningBoundaryVisible,
} from './hazardWarningBoundary.js'
import {
  PRESSURE_CAULDRON_BOIL_LEAD_MS,
  PRESSURE_CAULDRON_BURST_DURATION_MS,
  PRESSURE_CAULDRON_DAMAGE_RADIUS,
  PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS,
  isInsidePressureCauldronBlastRadius,
} from './stage4PressureCauldronHazard.js'

const CAULDRON_SOURCE = fs.readFileSync(
  new URL('../components/StageObjects/PressureCauldron.jsx', import.meta.url),
  'utf8',
)
const GROUND_WARNING_SOURCE = fs.readFileSync(
  new URL('../components/StageObjects/Stage4CauldronGroundWarning.jsx', import.meta.url),
  'utf8',
)

const UNIT_PER_BLOCK = 4

describe('stage4 가마솥 경고 경계 — 3초 전 구간 표시', () => {
  it('주기 마지막 3000ms 전 구간(1ms 단위 전수)에서 한 프레임도 빠지지 않고 표시된다', () => {
    expect(PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS).toBe(15_000)
    expect(PRESSURE_CAULDRON_BOIL_LEAD_MS).toBe(3_000)

    const warningStart = PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS - PRESSURE_CAULDRON_BOIL_LEAD_MS
    const hidden = []
    for (let offset = 0; offset < PRESSURE_CAULDRON_BOIL_LEAD_MS; offset += 1) {
      const elapsedMs = warningStart + offset
      if (!isPressureCauldronWarningBoundaryVisible(elapsedMs, 'stage4', 'playing')) hidden.push(elapsedMs)
    }
    expect(hidden).toEqual([])
    // 예고 구간 바로 앞 1ms는 꺼져 있어야 한다 — 3000ms보다 길어지면 안 된다.
    expect(isPressureCauldronWarningBoundaryVisible(warningStart - 1, 'stage4', 'playing')).toBe(false)
  })

  it('이후 주기에서도 같은 3000ms 창이 반복되고 250ms 발동 뒤에 꺼진다', () => {
    const cycle = PRESSURE_CAULDRON_EXPLOSION_INTERVAL_MS
    for (const cycleIndex of [1, 2, 3, 13]) {
      const warningStart = cycleIndex * cycle + (cycle - PRESSURE_CAULDRON_BOIL_LEAD_MS)
      expect(isPressureCauldronWarningBoundaryVisible(warningStart - 1, 'stage4', 'playing')).toBe(false)
      expect(isPressureCauldronWarningBoundaryVisible(warningStart, 'stage4', 'playing')).toBe(true)
      expect(isPressureCauldronWarningBoundaryVisible(warningStart + PRESSURE_CAULDRON_BOIL_LEAD_MS - 1, 'stage4', 'playing')).toBe(true)
      // 발동 순간(cycleElapsed=0)에도 경계가 끊기지 않는다.
      const burstAt = (cycleIndex + 1) * cycle
      expect(isPressureCauldronWarningBoundaryVisible(burstAt, 'stage4', 'playing')).toBe(true)
      expect(isPressureCauldronWarningBoundaryVisible(burstAt + PRESSURE_CAULDRON_BURST_DURATION_MS - 1, 'stage4', 'playing')).toBe(true)
      expect(isPressureCauldronWarningBoundaryVisible(burstAt + PRESSURE_CAULDRON_BURST_DURATION_MS, 'stage4', 'playing')).toBe(false)
    }
  })

  it('playing/stage4가 아니면 표시되지 않는다 (pause·게임오버·다른 스테이지·시간역주행)', () => {
    const insideWarning = 14_000
    for (const phase of ['paused', 'gameover', 'levelup', 'idle', 'clear']) {
      expect(isPressureCauldronWarningBoundaryVisible(insideWarning, 'stage4', phase)).toBe(false)
    }
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage5', undefined]) {
      expect(isPressureCauldronWarningBoundaryVisible(insideWarning, stageId, 'playing')).toBe(false)
    }
    expect(isPressureCauldronWarningBoundaryVisible(-1, 'stage4', 'playing')).toBe(false)
    expect(isPressureCauldronWarningBoundaryVisible(Number.NaN, 'stage4', 'playing')).toBe(false)
  })
})

describe('stage4 가마솥 경고 경계 — 단일 world 링', () => {
  it('바깥 테두리 반경 정본이 실제 피해 반경 3.2 units / 0.8 blocks와 같다', () => {
    expect(PRESSURE_CAULDRON_WARNING_OUTER_RADIUS).toBe(PRESSURE_CAULDRON_DAMAGE_RADIUS)
    expect(PRESSURE_CAULDRON_WARNING_OUTER_RADIUS).toBe(3.2)
    expect(PRESSURE_CAULDRON_WARNING_OUTER_RADIUS / UNIT_PER_BLOCK).toBeCloseTo(0.8, 12)
    // 테두리 안쪽은 피해 판정 안, 바깥은 밖.
    expect(isInsidePressureCauldronBlastRadius(PRESSURE_CAULDRON_WARNING_OUTER_RADIUS - 1e-6, 0)).toBe(true)
    expect(isInsidePressureCauldronBlastRadius(PRESSURE_CAULDRON_WARNING_OUTER_RADIUS + 1e-6, 0)).toBe(false)
  })

  it('가마솥은 Stage4CauldronGroundWarning 하나만 경고 링으로 렌더한다 (중복 링 금지)', () => {
    expect(CAULDRON_SOURCE).toContain('<Stage4CauldronGroundWarning />')
    expect(CAULDRON_SOURCE.match(/<Stage4CauldronGroundWarning \/>/g)).toHaveLength(1)
    // 모델 로컬 공간(0.4 base scale × Studio scale) 안에 두 번째 경계를 두지 않는다.
    expect(CAULDRON_SOURCE).not.toContain('pressure-cauldron-warning-boundary')
    expect(CAULDRON_SOURCE).not.toContain('hazardWarningBoundary')
  })

  it('그 단일 링은 scene에 portal되어 부모 배율을 상속하지 않고, 바깥 반경이 피해 반경이다', () => {
    expect(GROUND_WARNING_SOURCE).toContain('createPortal(')
    expect(GROUND_WARNING_SOURCE).toMatch(/<\/group>,\s*scene,\s*\)/)
    expect(GROUND_WARNING_SOURCE).toContain('const radius = PRESSURE_CAULDRON_DAMAGE_RADIUS')
    expect(GROUND_WARNING_SOURCE).toContain('name="pressure-cauldron-world-boundary"')
    expect(GROUND_WARNING_SOURCE).toContain('<ringGeometry args={[radius - 0.19, radius, 64]} />')
    // 표시 구간은 이 모듈의 정본과 같다: boiling || bursting.
    expect(GROUND_WARNING_SOURCE).toContain('root.current.visible = visual.boiling || visual.bursting')
  })
})
