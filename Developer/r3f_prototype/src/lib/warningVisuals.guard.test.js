// Guard: 2026-11-14 Terry "게임내 모든 경고그래픽, 바닥 영역경고 전부 굵은테두리 없애고 원형 색상만 사용하고
// 커졌다,작아지는 속도를 절반으로 줄여". Floor warnings are borderless fills; every periodic warning pulse runs
// at half its previous rate. Visual only — hazard radii/timings are checked by their own suites.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  CHARGE_CUE_PULSE_RAD_PER_SEC,
  CHARGE_WARNING_LINE_BLINK_HALF_TURNS,
  PROJECTILE_DECAL_PULSE_RAD_PER_MS,
  WARNING_PULSE_SPEED_SCALE,
} from './warningPulse.js'
import { B03_SHUTTLE_TELEGRAPH_BLINKS, B03_SHUTTLE_TELEGRAPH_MS } from './b03ShuttleRun.js'
import { DECAL_VISUAL, getDecalVisuals } from './projectileZombieShotGeometry.js'
import { SHOT_KIND, SHOT_MOTION } from './projectileZombieShotPool.js'
import { createExpansionTelegraphVisual, disposeExpansionTelegraphVisual } from '../components/expansion/expansionTelegraphs.js'
import { STAGE5_CALL_LANE_WARNING, getStage5CallLaneQuads } from '../components/StageObjects/Stage5CallLaneGroundWarning.jsx'

const src = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('warning pulses run at half their previous speed', () => {
  it('halves every periodic warning pulse/blink rate', () => {
    expect(WARNING_PULSE_SPEED_SCALE).toBe(0.5)
    expect(CHARGE_CUE_PULSE_RAD_PER_SEC).toBe(6) // was 12 rad/s ("GO!" bubble)
    expect(PROJECTILE_DECAL_PULSE_RAD_PER_MS).toBe(0.0125) // was 0.025 rad/ms (impact marker)
    expect(CHARGE_WARNING_LINE_BLINK_HALF_TURNS).toBe(3) // was sin(t·π·6) (charge arrow)
    expect(B03_SHUTTLE_TELEGRAPH_BLINKS).toBe(1.5) // was 3 blinks per 1.25s lane telegraph
    expect(B03_SHUTTLE_TELEGRAPH_MS).toBe(1250) // telegraph length itself is unchanged
    expect(STAGE5_CALL_LANE_WARNING.chimingHz).toBe(1) // was 2Hz
    expect(STAGE5_CALL_LANE_WARNING.callingHz).toBe(0.5) // was 1Hz
  })

  it('wires the halved constants into every renderer (no stale literal rates left)', () => {
    const enemy = src('../components/Enemy.jsx')
    expect(enemy).toContain('Math.sin(t * CHARGE_CUE_PULSE_RAD_PER_SEC)')
    expect(enemy).not.toContain('Math.sin(t * 12)')
    const pooled = src('../components/ZombieInstanceLayer.jsx')
    expect(pooled).toContain('Math.sin(pool.spawnTimer[enemyIndex]*CHARGE_CUE_PULSE_RAD_PER_MS)')
    expect(pooled).not.toContain('spawnTimer[enemyIndex]*.012')
    const decals = src('../components/PooledEnemyProjectileLayer.jsx')
    // Pulse peaks at 1.0 × the real marker radius — the visual never exceeds the hit area.
    expect(decals).toContain('0.92 + 0.08 * Math.sin(pool.ageMs[i] * PROJECTILE_DECAL_PULSE_RAD_PER_MS)')
    const vfx = src('../components/VFXLayer.jsx')
    expect(vfx).toContain('Math.sin(t * Math.PI * CHARGE_WARNING_LINE_BLINK_HALF_TURNS)')
    expect(vfx).not.toContain('Math.sin(t * Math.PI * 6)')
  })

  it('halves the HUD warning banner grow/shrink pulse (layout untouched)', () => {
    const hud = src('../components/HUD.jsx')
    const animationOf = (style) => hud.match(new RegExp(`\\n  ${style}: \\{[\\s\\S]*?animation: '([^']+)'`))?.[1]
    expect(animationOf('bossWarning')).toBe('bossPulse 1.6s ease-in-out infinite') // was 0.8s
    expect(animationOf('projectileWarning')).toBe('bossPulse 1.6s ease-in-out infinite') // was 0.8s
    expect(animationOf('matildaWarning')).toBe('bossPulse 1.0s ease-in-out infinite') // was 0.5s
    expect(animationOf('formationWarning')).toBe('bossPulse 1.4s ease-in-out infinite') // was 0.7s
  })
})

describe('floor warnings have no border mesh', () => {
  it('expansion/boss/Stage 6/E-series telegraphs are one fill material, every shape', () => {
    const shapes = [
      { shape: 'disk', radius: 1.6 },
      { shape: 'annulus', radius: 4, innerRadius: 2.8 },
      { shape: 'sector', radius: 3, angleDeg: 70 },
      { shape: 'line', length: 4, width: 0.8 },
      { shape: 'cross', length: 3, width: 0.6 },
    ]
    for (const phase of ['windup', 'active']) {
      for (const authored of shapes) {
        const root = createExpansionTelegraphVisual({ ...authored, phase, originXZ: [0, 0], windupMs: 1000, elapsedMs: 0 })
        const meshes = []
        root.traverse((n) => { if (n.isMesh) meshes.push(n) })
        expect(meshes.length, authored.shape).toBeGreaterThan(0)
        for (const mesh of meshes) expect(mesh.material, authored.shape).toBe(root.userData.fillMat)
        expect(root.userData.edgeMat).toBeUndefined()
        // A full disc is a CircleGeometry of exactly the authored radius (no RingGeometry band on top).
        if (authored.shape === 'disk') {
          expect(meshes).toHaveLength(1)
          expect(meshes[0].geometry).toBeInstanceOf(THREE.CircleGeometry)
          expect(meshes[0].geometry.parameters.radius).toBe(1.6)
        }
        disposeExpansionTelegraphVisual(root)
      }
    }
  })

  it('projectile-zombie impact markers draw the fill only (no ring)', () => {
    for (const kind of [SHOT_KIND.DECAL_MARKER, SHOT_KIND.DECAL_HEAL]) {
      expect(getDecalVisuals(kind, SHOT_MOTION.DECAL, 0)).not.toContain(DECAL_VISUAL.RING)
    }
  })

  it('Stage 5 call lane is a single fill rectangle; Stage 4 cauldron and B02/B03/B04 have no outline/ring meshes', () => {
    expect(getStage5CallLaneQuads({ minX: -2, maxX: 2 }, 10)).toEqual({ fill: [[0, 0, 4, 20]] })
    const cauldron = src('../components/StageObjects/Stage4CauldronGroundWarning.jsx')
    expect(cauldron).not.toContain('ringGeometry')
    expect(cauldron).toContain('<circleGeometry args={[radius, 64]} />')
    const enemy = src('../components/Enemy.jsx')
    expect(enemy).not.toContain('b04-soup-segment')
    expect(enemy).not.toContain('color={visual.outline}')
    expect(enemy).not.toContain('color={visual.shadow}')
    const soup = enemy.slice(enemy.indexOf('export function B04SoupBlastVisual'), enemy.indexOf('export function getB03ShuttleRunVisualState'))
    expect(soup).not.toContain('ringGeometry')
  })
})
