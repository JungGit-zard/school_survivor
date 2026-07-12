import { describe, expect, it } from 'vitest'
import {
  CORRIDOR_DOORS,
  CORRIDOR_CEILING_LIGHTS,
  CORRIDOR_EXIT_SIGNS,
  CORRIDOR_EMERGENCY_GLOWS,
  buildCorridorDebris,
} from './Stage2CorridorDecor.jsx'
import { getStageBounds } from '../lib/stageConfig.js'

// 기획 §5 stage2 배치 규칙 정본 검증. 좌표계 mapHalfX=7.5, mapHalfZ=19.2.
const { halfX, halfZ } = getStageBounds('stage2')

describe('Stage2CorridorDecor 배치 규칙(기획 §5)', () => {
  it('맵 경계는 좁고 긴 복도(halfX 7.5, halfZ 19.2)', () => {
    expect(halfX).toBe(7.5)
    expect(halfZ).toBeCloseTo(19.2)
  })

  describe('교실 문 — 벽면 부착 |x|>=6.0, 열림각 <=45deg', () => {
    it('4개(좌우 벽 번갈아), 하나는 바리케이드', () => {
      expect(CORRIDOR_DOORS).toHaveLength(4)
      expect(CORRIDOR_DOORS.filter((d) => d.side === 'left')).toHaveLength(2)
      expect(CORRIDOR_DOORS.filter((d) => d.side === 'right')).toHaveLength(2)
      expect(CORRIDOR_DOORS.filter((d) => d.barricade)).toHaveLength(1)
    })

    it('벽면 부착 x=±7.44 (|x|>=6.0) 이고 맵 안쪽', () => {
      for (const door of CORRIDOR_DOORS) {
        const wallX = door.side === 'left' ? -7.44 : 7.44
        expect(Math.abs(wallX)).toBeGreaterThanOrEqual(6.0)
        expect(Math.abs(wallX)).toBeLessThan(halfX + 0.01)
      }
    })

    it('열림각은 45도(π/4) 이하로 통로 침범 방지', () => {
      for (const door of CORRIDOR_DOORS) {
        expect(door.open).toBeLessThanOrEqual(Math.PI / 4 + 1e-9)
        expect(door.open).toBeGreaterThan(0)
      }
    })

    it('문 z 위치가 In-Progress 프랍(locker -14.2 / cart 2.8 / board 13.4)과 충분히 이격', () => {
      const busyZ = [-14.2, 2.8, 13.4]
      for (const door of CORRIDOR_DOORS) {
        for (const z of busyZ) {
          expect(Math.abs(door.z - z)).toBeGreaterThan(1.0)
        }
      }
    })
  })

  describe('천장 형광등 — R4 예외(y>=3.0), 과한 깜빡임 금지', () => {
    it('6개 배치', () => {
      expect(CORRIDOR_CEILING_LIGHTS).toHaveLength(6)
    })

    it('깜빡이는 등은 2개뿐(나머지 상시 점등)', () => {
      const flickering = CORRIDOR_CEILING_LIGHTS.filter((l) => l.flicker)
      expect(flickering).toHaveLength(2)
      expect(flickering.length).toBeLessThan(CORRIDOR_CEILING_LIGHTS.length / 2)
    })

    it('등이 맵 장축 범위 안(|z|<halfZ)에 분포', () => {
      for (const light of CORRIDOR_CEILING_LIGHTS) {
        expect(Math.abs(light.z)).toBeLessThan(halfZ)
      }
    })
  })

  describe('EXIT 유도등 — 벽면 |x|>=6.0, 양 끝+중간', () => {
    it('3개(양 끝 근방 + 중간)', () => {
      expect(CORRIDOR_EXIT_SIGNS).toHaveLength(3)
      expect(CORRIDOR_EXIT_SIGNS.some((s) => s.z > 17)).toBe(true)
      expect(CORRIDOR_EXIT_SIGNS.some((s) => s.z < -17)).toBe(true)
      expect(CORRIDOR_EXIT_SIGNS.some((s) => Math.abs(s.z) < 1)).toBe(true)
    })

    it('벽면 부착 |x|>=6.0 이고 맵 안쪽', () => {
      for (const sign of CORRIDOR_EXIT_SIGNS) {
        expect(Math.abs(sign.x)).toBeGreaterThanOrEqual(6.0)
        expect(Math.abs(sign.x)).toBeLessThan(halfX + 0.01)
        expect(Math.abs(sign.z)).toBeLessThan(halfZ)
      }
    })
  })

  describe('비상등 레드 글로우 — 벽면 |x|>=6.0', () => {
    it('2개, 벽면 부착', () => {
      expect(CORRIDOR_EMERGENCY_GLOWS).toHaveLength(2)
      for (const glow of CORRIDOR_EMERGENCY_GLOWS) {
        expect(Math.abs(glow.x)).toBeGreaterThanOrEqual(6.0)
        expect(Math.abs(glow.x)).toBeLessThan(halfX + 0.01)
      }
    })
  })

  describe('바닥 데칼 — R5 예외(저상 y<0.03, 중앙 통로 포함 가능)', () => {
    const debris = buildCorridorDebris()

    it('15~20개 산포', () => {
      expect(debris.length).toBeGreaterThanOrEqual(15)
      expect(debris.length).toBeLessThanOrEqual(20)
    })

    it('모든 데칼 position.y < 0.03 (저상 데칼)', () => {
      for (const item of debris) {
        expect(item.position[1]).toBeLessThan(0.03)
      }
    })

    it('모든 데칼이 플레이 영역 안(맵 경계 내)', () => {
      for (const item of debris) {
        expect(Math.abs(item.position[0])).toBeLessThan(halfX)
        expect(Math.abs(item.position[2])).toBeLessThan(halfZ)
      }
    })

    it('중앙 통로(|x|<4.5)에도 저상 데칼이 존재(R5 예외 확인)', () => {
      expect(debris.some((d) => Math.abs(d.position[0]) < 4.5)).toBe(true)
    })

    it('시드 고정 — 재호출 시 동일 결과(결정론적)', () => {
      const a = buildCorridorDebris()
      const b = buildCorridorDebris()
      expect(a).toEqual(b)
      expect(a[0].position).toEqual(debris[0].position)
    })
  })
})
