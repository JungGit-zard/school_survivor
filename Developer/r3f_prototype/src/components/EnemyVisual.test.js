import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { applyProps } from '@react-three/fiber'
import {
  CHARGE_CUE_LABEL,
  CHARGE_CUE_LAYOUT,
  B02_CORRIDOR_BLOCKADE_VISUALS,
  B03_SHUTTLE_RUN_VISUALS,
  B04_SOUP_BLAST_VISUALS,
  ENEMY_SIZE_MULTIPLIER,
  EnemyVisual,
  ENEMY_SPAWN_REVEAL_DELAY_MS,
  ENEMY_STATS,
  MATILDA_CONTACT_KILL_DELAY_MS,
  MATILDA_CONTACT_PLAYER_OVERLAP_THRESHOLD,
  PLAYER_CONTACT_HALF_EXTENT,
  MATILDA_EDGE_INSET,
  MATILDA_CHARGE_STALL_REVERSE_MS,
  MATILDA_LAUGH_DURATION_MS,
  SPAWN_SMOKE_END_SCALE,
  SPAWN_SMOKE_START_SCALE,
  SPAWN_SMOKE_DURATION_MS,
  SPAWN_SMOKE_OPAQUE_MS,
  advanceMatildaContactKillCountdown,
  advanceEnemySpawnTimer,
  createMatildaContactKillCountdown,
  getSpawnSmokeOpacity,
  getBodyContactDistance,
  getChargeHitDistance,
  getEnemyColliderHalfExtents,
  getB02CorridorBlockadeLineVisualState,
  getB03ShuttleRunVisualState,
  getB04SoupBlastVisualState,
  hasB03ShuttleRunVisualChanged,
  getEnemySpawnSfx,
  getMatildaBodyHalfExtents,
  hasMatildaReachedStageEdge,
  isMatildaBodyContact,
  isMatildaChargeBlockedFrame,
  isMatildaChargingOutward,
  resolveSightBlockedEnemyVelocity,
  shouldReverseMatildaChargeOnObstacle,
  shouldRenderB02CorridorBlockadeVisual,
} from './Enemy.jsx'

describe('B02 corridor blockade visual states', () => {
  it('uses cyan surfaces and dark outlines, and lights every boss-ring line at once', () => {
    // 순차 점등을 없앴다 — 보스를 두르는 선은 활성 구간 내내 전부 같은 상태로 켜져 있다.
    expect(getB02CorridorBlockadeLineVisualState({ phase: 'telegraph' })).toBe('telegraph')
    expect(getB02CorridorBlockadeLineVisualState({ phase: 'active' })).toBe('active')
    expect(getB02CorridorBlockadeLineVisualState({ phase: 'stun' })).toBe('completed')
    expect(shouldRenderB02CorridorBlockadeVisual({ phase: 'telegraph', lineZs: [-3, 3] })).toBe(true)
    expect(shouldRenderB02CorridorBlockadeVisual({ phase: 'active', lineZs: [-3, 3] })).toBe(true)
    expect(shouldRenderB02CorridorBlockadeVisual({ phase: 'stun', lineZs: [-3, 3] })).toBe(false)
    expect(shouldRenderB02CorridorBlockadeVisual({ phase: 'idle', lineZs: [-3, 3] })).toBe(false)

    for (const visual of Object.values(B02_CORRIDOR_BLOCKADE_VISUALS)) {
      expect(visual.surface).toMatch(/^#(0|1|2)[0-9a-f]{5}$/i)
      expect(visual.outline).toMatch(/^#0[0-9a-f]{5}$/i)
      expect(visual.shadow).toMatch(/^#0[0-9a-f]{5}$/i)
      expect(visual.surfaceOpacity).toBeGreaterThan(0)
      expect(visual.outlineOpacity).toBeGreaterThan(0)
      expect(visual.shadowOpacity).toBeGreaterThan(0)
      expect(visual.shadowOpacity).toBeLessThan(visual.outlineOpacity)
    }

    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    expect(source).toContain('userData={{ blockadeLineState: visualState }}')
    expect(source).toContain('color={visual.shadow}')
    expect(source).toContain('B02_BLOCKADE_LINE_WIDTH + 0.42')
    expect(source).toContain("if (!shouldRenderB02CorridorBlockadeVisual({ phase, lineZs })) return null")
  })
})

describe('B03 shuttle run visual states', () => {
  it('keeps a single yellow warning lane and distinguishes the two dangerous passes', () => {
    expect(getB03ShuttleRunVisualState({ phase: 'telegraph', passIndex: -1 })).toBe('telegraph')
    expect(getB03ShuttleRunVisualState({ phase: 'active', passIndex: 0 })).toBe('outbound')
    expect(getB03ShuttleRunVisualState({ phase: 'active', passIndex: 1 })).toBe('returning')
    expect(getB03ShuttleRunVisualState({ phase: 'stun', passIndex: -1 })).toBe('stun')

    expect(B03_SHUTTLE_RUN_VISUALS.telegraph.surface).toBe('#f5b83d')
    expect(B03_SHUTTLE_RUN_VISUALS.outbound.surface).toBe('#ffd34e')
    expect(B03_SHUTTLE_RUN_VISUALS.returning.surface).toBe('#e6a81f')
    expect(B03_SHUTTLE_RUN_VISUALS.outbound.surface).not.toBe(B04_SOUP_BLAST_VISUALS.explode.surface)
    expect(B03_SHUTTLE_RUN_VISUALS.returning.surface).not.toBe(B04_SOUP_BLAST_VISUALS.explode.surface)
    expect(hasB03ShuttleRunVisualChanged(
      { phase: 'active', laneZ: 4, passIndex: 0, startX: 0, endX: 6.6 },
      { phase: 'active', laneZ: 4, passIndex: 1, startX: 0, endX: 6.6 },
    )).toBe(true)
    expect(hasB03ShuttleRunVisualChanged(
      { phase: 'active', laneZ: 4, passIndex: 1, startX: 0, endX: 6.6 },
      { phase: 'active', laneZ: 4, passIndex: 1, startX: 0, endX: 6.6 },
    )).toBe(false)
    for (const visual of Object.values(B03_SHUTTLE_RUN_VISUALS)) {
      expect(visual.outline).toMatch(/^#[0-9a-f]{6}$/i)
      expect(visual.surfaceOpacity).toBeGreaterThan(0)
      expect(visual.outlineOpacity).toBeGreaterThan(0)
    }

    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    expect(source).toContain('userData={{ shuttleRunState: visualState }}')
    expect(source).toContain('B03_SHUTTLE_LANE_WIDTH + 0.18')
    expect(source).toContain('hasB03ShuttleRunVisualChanged(previous, state) ? { ...state } : previous')
  })

  // 예고선은 시전마다 다른 구간을 그린다(출발점 = 그때의 보스 X). startX/endX 비교가 빠지면
  // 두 번째 시전(HP 30%)에서 첫 시전의 선이 그대로 남는다 — 값으로 판정한다.
  it('시전마다 달라지는 왕복 코스 구간을 리렌더 판정에 반영한다', () => {
    // HP 65% 시전: 보스가 x=0 → 코스 [0, 6.6].
    const first = { phase: 'telegraph', laneZ: 4, passIndex: -1, startX: 0, endX: 6.6 }
    // HP 30% 시전: 보스가 x=4.2 → 코스 [4.2, -6.6]. phase/laneZ/passIndex는 전부 같다.
    const second = { phase: 'telegraph', laneZ: 4, passIndex: -1, startX: 4.2, endX: -6.6 }
    expect(hasB03ShuttleRunVisualChanged(first, second)).toBe(true)
    expect(hasB03ShuttleRunVisualChanged(first, { ...first, startX: 1.5 })).toBe(true)
    expect(hasB03ShuttleRunVisualChanged(first, { ...first, endX: -6.6 })).toBe(true)
    expect(hasB03ShuttleRunVisualChanged(first, { ...first })).toBe(false)

    // 컴포넌트가 실제 코스 구간을 쓰는지: 옛 아레나 전폭 지오메트리가 돌아오면 실패한다.
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    expect(source).toContain('getB03ShuttleRunLaneGeometry(startX, endX)')
    expect(source).toContain('args={[length, 0.024, B03_SHUTTLE_LANE_WIDTH]}')
    expect(source).not.toContain('args={[halfX * 2, 0.024, B03_SHUTTLE_LANE_WIDTH]}')
  })
})

describe('B04 soup blast visual states', () => {
  it('uses three outlined orange circles for the warning and concurrent blast', () => {
    expect(getB04SoupBlastVisualState('telegraph')).toBe('telegraph')
    expect(getB04SoupBlastVisualState('explode')).toBe('explode')
    expect(B04_SOUP_BLAST_VISUALS.explode.surfaceOpacity).toBeGreaterThan(B04_SOUP_BLAST_VISUALS.telegraph.surfaceOpacity)
    for (const visual of Object.values(B04_SOUP_BLAST_VISUALS)) {
      expect(visual.surface).toMatch(/^#[0-9a-f]{6}$/i)
      expect(visual.outline).toMatch(/^#[0-9a-f]{6}$/i)
    }

    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    expect(source).toContain('userData={{ soupBlastState: visualState }}')
    expect(source).toContain('name="B04 국물 대폭발 원형 표식"')
    expect(source).not.toContain('name="B04 급식 국자 원형 표식"')
    expect(source).toContain('circle.radius + 0.18')
    expect(source).toContain('<B04SoupBlastVisual')
  })
})

describe('R3F boss ultimate group props', () => {
  it('never sends DOM aria-label props into a Three group', () => {
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    const labels = [
      'B02 복도 봉쇄선',
      'B03 왕복 오래달리기 레인',
      'B04 국물 대폭발 원형 표식',
    ]

    for (const label of labels) {
      expect(source).toContain(`name="${label}"`)
      expect(source).not.toContain(`aria-label="${label}"`)
      expect(() => applyProps(new THREE.Group(), { name: label })).not.toThrow()
      expect(() => applyProps(new THREE.Group(), { 'aria-label': label })).toThrow(/reading 'label'/)
    }
    expect(source).not.toMatch(/<group[^>]*aria-label=/)
  })
})

describe('Enemy charge warning cue', () => {
  it('wanders deterministically without approaching while sight is blocked, then releases control when clear', () => {
    const blocked = resolveSightBlockedEnemyVelocity({ blocked: true, enemyId: 17, dirX: 3, dirZ: 4, speed: 2 })

    expect(resolveSightBlockedEnemyVelocity({ blocked: true, enemyId: 17, dirX: 3, dirZ: 4, speed: 2 })).toEqual(blocked)
    expect(blocked.x * 3 + blocked.z * 4).toBeCloseTo(0, 8)
    expect(Math.hypot(blocked.x, blocked.z)).toBeCloseTo(1.1, 8)
    expect(resolveSightBlockedEnemyVelocity({ blocked: false, enemyId: 17, dirX: 3, dirZ: 4, speed: 2 })).toBeNull()
  })

  it('starts and restarts Matilda charges through a visible laugh pause', () => {
    const bounds = { halfX: 10, halfZ: 14.4 }

    expect(hasMatildaReachedStageEdge({ x: 0, z: 0 }, bounds)).toBe(false)
    expect(hasMatildaReachedStageEdge({ x: bounds.halfX - MATILDA_EDGE_INSET, z: 0 }, bounds)).toBe(true)
    expect(hasMatildaReachedStageEdge({ x: 0, z: -bounds.halfZ + MATILDA_EDGE_INSET }, bounds)).toBe(true)
    expect(MATILDA_EDGE_INSET).toBeGreaterThanOrEqual(1.1)
    expect(MATILDA_LAUGH_DURATION_MS).toBeGreaterThanOrEqual(700)

    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    expect(source).toContain("chargeState.current = isMatilda ? 'matildaLaugh' : 'chase'")
    expect(source).toContain('matildaLaughCuePendingRef.current = isMatilda')
    expect(source).toContain("chargeState.current = 'matildaLaugh'")
    // 보스 프레임은 매 프레임 객체를 만들지 않기 위해 고정 SFX 객체를 재사용한다.
    expect(source).toContain("const MATILDA_LAUGH_SFX = Object.freeze({ id: 'matildaLaugh'")
    expect(source).toContain("const MATILDA_DASH_SFX = Object.freeze({ id: 'matildaDash'")
    expect(source).toContain('emitSfx(MATILDA_LAUGH_SFX)')
    expect(source).toContain('emitSfx(MATILDA_DASH_SFX)')
  })

  it('reverses Matilda immediately when a charge is blocked by a prop instead of waiting at the obstacle', () => {
    const hitDistance = 0.5

    expect(isMatildaChargeBlockedFrame({
      movedAlong: 0.01,
      expectedMove: 0.1,
      distanceToPlayer: 3,
      hitDistance,
    })).toBe(true)
    expect(isMatildaChargeBlockedFrame({
      movedAlong: 0.01,
      expectedMove: 0.1,
      distanceToPlayer: 0.52,
      hitDistance,
    })).toBe(false)
    expect(shouldReverseMatildaChargeOnObstacle({
      movedAlong: 0.01,
      expectedMove: 0.1,
      distanceToPlayer: 3,
      hitDistance,
      stalledMs: MATILDA_CHARGE_STALL_REVERSE_MS,
    })).toBe(true)

    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    expect(source).toContain('cd.multiplyScalar(-1)')
    expect(source).toContain('matildaChargeStallMsRef.current = blockedFrame')
  })

  it('lets Matilda leave an edge toward the player before checking for the next charge endpoint', () => {
    const bounds = { halfX: 10, halfZ: 14.4 }
    const rightEdge = { x: bounds.halfX - MATILDA_EDGE_INSET, z: 0 }

    expect(isMatildaChargingOutward(rightEdge, { x: -1, z: 0 }, bounds)).toBe(false)
    expect(isMatildaChargingOutward(rightEdge, { x: 1, z: 0 }, bounds)).toBe(true)
  })

  it('only lets Matilda deal charge damage at the normal body contact distance', () => {
    const stats = { contactDist: 0.36, scale: 3 }

    expect(getChargeHitDistance(stats, true)).toBeCloseTo(getBodyContactDistance(stats))
    expect(getChargeHitDistance(stats, false)).toBeCloseTo(stats.contactDist * ENEMY_SIZE_MULTIPLIER * 1.5)
  })

  it('keeps E05 and B01 charge warning readable with a non-HTML 3D toon speech bubble', () => {
    expect(ENEMY_STATS.E05.charger).toBe(true)
    expect(ENEMY_STATS.B01.charger).toBe(true)

    expect(CHARGE_CUE_LABEL).toBe('GO!')
    expect(CHARGE_CUE_LAYOUT.y).toBeGreaterThan(1.5)
    expect(CHARGE_CUE_LAYOUT.pulseScale).toBeGreaterThan(0)
    expect(CHARGE_CUE_LAYOUT.billboard).toBe(true)
    expect(Object.keys(CHARGE_CUE_LAYOUT.parts)).toEqual(expect.arrayContaining([
      'bubble',
      'tail',
      'gVertical',
      'gTop',
      'gBottom',
      'gMiddle',
      'oLeft',
      'oRight',
      'oTop',
      'oBottom',
      'bang',
      'bangDot',
    ]))

    expect(CHARGE_CUE_LAYOUT.parts.bubble.size[0]).toBeGreaterThan(0.8)
    expect(CHARGE_CUE_LAYOUT.parts.tail.rotation[2]).toBeGreaterThan(0)
    expect(CHARGE_CUE_LAYOUT.parts.bang.size[1]).toBeGreaterThan(0.2)
  })

  it('renders the shared GO! cue for B04 only when its phase-2 charger enters warn, without changing B01', () => {
    const containsChargeCue = (node) => {
      if (Array.isArray(node)) return node.some(containsChargeCue)
      if (!node || typeof node !== 'object') return false
      if (node.type?.name === 'ChargeToonCue') return true
      return containsChargeCue(node.props?.children)
    }

    expect(ENEMY_STATS.B04.chefPhase2.charger).toBe(true)
    expect(containsChargeCue(EnemyVisual({ type: 'B04', animPhase: 'warn', isChefPhase2: false, showHealthBar: false }))).toBe(false)
    expect(containsChargeCue(EnemyVisual({ type: 'B04', animPhase: 'warn', isChefPhase2: true, showHealthBar: false }))).toBe(true)
    expect(containsChargeCue(EnemyVisual({ type: 'B01', animPhase: 'warn', showHealthBar: false }))).toBe(true)

    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    expect(source).toContain('isChefPhase2={isChefPhase2}')
  })

  it('does not reintroduce the previous Html sprite cue', () => {
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain("import { Html } from '@react-three/drei'")
    expect(source).not.toContain('<Html')
    expect(source).not.toContain('GoSpeechBubble')
  })

  it('shows the supplied smoke asset as an unobstructed camera-facing billboard before reveal', () => {
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    const asset = readFileSync(new URL('../assets/effects/spawn_smoke_puff.webp', import.meta.url))

    expect(source).toContain("import spawnSmokeUrl from '../assets/effects/spawn_smoke_puff.webp'")
    expect(source).toContain('function SpawnSmokeEffect')
    expect(source).toContain('<Billboard')
    expect(source).toContain('<planeGeometry args={[1, 1]} />')
    expect(source).toContain('<SpawnSmokeEffect position={spawnPos} visualScale={cs * 0.333} />')
    expect(source).toContain('const [spawnRevealed, setSpawnRevealed] = useState(false)')
    expect(source).toContain('{spawnRevealed && (')
    expect(source).not.toContain('setTimeout(() =>')
    expect(SPAWN_SMOKE_DURATION_MS).toBeGreaterThan(ENEMY_SPAWN_REVEAL_DELAY_MS)
    expect(SPAWN_SMOKE_START_SCALE).toBeLessThan(SPAWN_SMOKE_END_SCALE)
    // 정본 스펙: 줌아웃 카메라에서 좀비보다 큼직하게 — 기존(끝 1.12) 대비 2배 이상 확대
    expect(SPAWN_SMOKE_START_SCALE).toBeGreaterThanOrEqual(1.2)
    expect(SPAWN_SMOKE_END_SCALE).toBeGreaterThanOrEqual(2.4)
    expect(source).toContain('depthTest={false}')
    expect(source).toContain('depthWrite={false}')
    expect(asset.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(asset.subarray(8, 12).toString('ascii')).toBe('WEBP')
  })

  it('shows the puff first, holds it fully opaque for the 300ms reveal window, then fades', () => {
    // (2) 연기가 300ms 동안 완벽하게 보인 뒤 좀비 등장
    expect(ENEMY_SPAWN_REVEAL_DELAY_MS).toBe(300)
    expect(SPAWN_SMOKE_OPAQUE_MS).toBe(ENEMY_SPAWN_REVEAL_DELAY_MS)

    // 앞 300ms 동안 opacity 1.0 유지
    expect(getSpawnSmokeOpacity(0)).toBe(1)
    expect(getSpawnSmokeOpacity(150)).toBe(1)
    expect(getSpawnSmokeOpacity(SPAWN_SMOKE_OPAQUE_MS)).toBe(1)

    // 리빌 이후부터 페이드아웃 시작, 끝에서 완전 투명
    expect(getSpawnSmokeOpacity(SPAWN_SMOKE_OPAQUE_MS + 1)).toBeLessThan(1)
    expect(getSpawnSmokeOpacity(SPAWN_SMOKE_DURATION_MS)).toBe(0)
    const mid = (SPAWN_SMOKE_OPAQUE_MS + SPAWN_SMOKE_DURATION_MS) / 2
    expect(getSpawnSmokeOpacity(mid)).toBeCloseTo(0.5, 5)

    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    // (1) 연기 먼저 — RigidBody(좀비)는 spawnRevealed 이후에만 렌더
    expect(source.indexOf('<SpawnSmokeEffect')).toBeLessThan(source.indexOf('{spawnRevealed && ('))
    // (3) 효과 없이는 스폰 없음 — 모듈 로드 시 텍스처 프리로드
    expect(source).toContain('useLoader.preload(THREE.TextureLoader, spawnSmokeUrl)')
    expect(source).toContain('material.opacity = getSpawnSmokeOpacity(elapsed)')
  })

  it('pauses both smoke and reveal timing while gameplay is paused', () => {
    const afterPlaying = advanceEnemySpawnTimer(0, 0.16, 'playing')
    const afterPause = advanceEnemySpawnTimer(afterPlaying, 1, 'paused')
    const afterResume = advanceEnemySpawnTimer(afterPause, 0.16, 'playing')

    expect(afterPlaying).toBe(160)
    expect(afterPause).toBe(160)
    expect(afterResume).toBe(320)
  })

  it('uses a dedicated poof sound for regular zombie spawns', () => {
    expect(getEnemySpawnSfx('E01')).toMatchObject({ id: 'zombieSpawn' })
    expect(getEnemySpawnSfx('B01')).toMatchObject({ id: 'bossSpawn' })
    expect(getEnemySpawnSfx('E01').volume).toBeLessThan(getEnemySpawnSfx('B01').volume)
    expect(getEnemySpawnSfx('E01', true)).toMatchObject({ id: 'matildaSpawn' })
  })

describe("Matilda's rendered body matches her physics collider (no untouchable-lunge bug)", () => {
  it('uses B01 base scale for Matilda at runtime while forwarding that same scale to the collider and visual', () => {
    const enemySource = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    const enemiesSource = readFileSync(new URL('./Enemies.jsx', import.meta.url), 'utf8')

    // EnemyVisual keeps the optional prop so any caller's merged stat override
    // reaches both the visual and collider path. Matilda deliberately supplies
    // B01's base 2.00 scale to restore her intended visible size.
    expect(enemySource).toContain(
      "export function EnemyVisual({ type = 'E01', animPhase = 'normal', hitFlash = false, hp, showHealthBar = true, groupRef = null, isMatilda = false, forceMesh = false, staticPose = false, scale, bossFaceRecipe, isChefPhase2 = false }) {",
    )
    expect(enemySource).toContain('const cs = (scale ?? stats.scale) * ENEMY_SIZE_MULTIPLIER')

    // Enemy forwards the merged scale to EnemyVisual, keeping the visual group
    // and CuboidCollider derived from the exact same `cs`.
    expect(enemySource).toContain(
      '<EnemyVisual groupRef={groupRef} type={type} animPhase={animPhase} hitFlash={hitFlash} hp={hp} isMatilda={isMatilda} scale={stats.scale} isChefPhase2={isChefPhase2} />',
    )
    expect(enemiesSource).toMatch(/const matildaStats = \{[\s\S]*?scale:\s+ENEMY_STATS\.B01\.scale,/)
  })

  it('produces the same cs for Matilda whether derived by the collider path or the EnemyVisual scale-prop path', () => {
    // Mirrors Enemy's `const cs = stats.scale * ENEMY_SIZE_MULTIPLIER` (colArgs input)
    // against EnemyVisual's `const cs = (scale ?? stats.scale) * ENEMY_SIZE_MULTIPLIER`
    // when Enemy forwards `scale={stats.scale}`. Both must be the same number so the
    // visible body never falls short of (or exceeds) the hit-box.
    const mergedStats = { ...ENEMY_STATS.B01, scale: ENEMY_STATS.B01.scale } // Matilda runtime statOverride
    const colliderCs = mergedStats.scale * ENEMY_SIZE_MULTIPLIER
    const visualCs = (mergedStats.scale ?? ENEMY_STATS.B01.scale) * ENEMY_SIZE_MULTIPLIER

    expect(visualCs).toBe(colliderCs)
    expect(colliderCs).toBeCloseTo(8 / 3, 8)

    // Regression guard: the bug passed a 3.0 override to both paths, enlarging
    // the body and collider together by 1.5x instead of restoring B01 size.
    const buggyVisualCs = 3.0 * ENEMY_SIZE_MULTIPLIER
    expect(buggyVisualCs).not.toBe(colliderCs)
  })

  it('sizes the hit-box body-contact distance from the same scale so it matches the visible mesh half-extent', () => {
    // getBodyContactDistance(stats) already derives the enemy half-extent from
    // stats.scale (see Enemy.jsx). With EnemyVisual's cs fix, that half-extent now
    // equals the rendered body's half-extent, so "body contact" really means the
    // player's collider touches Matilda's visible body -- no more invisible gap.
    const matildaStats = { ...ENEMY_STATS.B01, scale: ENEMY_STATS.B01.scale }

    expect(getBodyContactDistance(matildaStats)).toBeCloseTo(0.5093333333333333, 8)

    // Sanity: 0.5093… = B01 enemyHalfExtent(0.3733…) + player half-extent(0.136).
    const enemyHalfExtent = Math.max(0.14, 0.10) * ENEMY_STATS.B01.scale * ENEMY_SIZE_MULTIPLIER
    const playerContactHalfExtent = 0.136
    expect(getBodyContactDistance(matildaStats)).toBeCloseTo(enemyHalfExtent + playerContactHalfExtent, 8)

    // A 3.0 override would make both contact and visible half-extent 1.5x too large.
    const buggyHalfExtent = Math.max(0.14, 0.10) * 3.0 * ENEMY_SIZE_MULTIPLIER
    expect(buggyHalfExtent).not.toBeCloseTo(enemyHalfExtent, 3)
  })
})

describe('Matilda dies only on real body-box contact, not the old widest-axis scalar radius', () => {
  const matildaStats = { ...ENEMY_STATS.B01, scale: ENEMY_STATS.B01.scale }
  const { halfX, halfZ } = getMatildaBodyHalfExtents(matildaStats)

  it('derives the box half-extents from the exact same source as the physics CuboidCollider (colArgs)', () => {
    const colliderHalfExtents = getEnemyColliderHalfExtents(matildaStats)

    expect(halfX).toBeCloseTo(colliderHalfExtents[0], 10)
    expect(halfZ).toBeCloseTo(colliderHalfExtents[2], 10)
    // Sanity: x (wide) and z (thin) are genuinely different -- the bug only exists
    // because Matilda's body is a rectangle, not a circle.
    expect(halfX).toBeGreaterThan(halfZ)
  })

  it('does NOT kill on front/back (z-axis) approach at the old scalar-radius distance -- the regression guard', () => {
    // Old scalar bug used Math.max(halfX, halfZ) + player half-extent = 0.5093...
    // for every direction. True z-depth contact is only halfZ + 0.136 = 0.4027...
    // 0.45 sits strictly between those two numbers: before the fix this killed the
    // player; after the fix it must not.
    expect(halfZ + 0.136).toBeCloseTo(0.4027, 3)
    expect(Math.max(halfX, halfZ) + 0.136).toBeCloseTo(0.5093, 3)

    const contact = isMatildaBodyContact({
      enemyX: 0, enemyZ: 0.45, yaw: 0, playerX: 0, playerZ: 0, halfX, halfZ,
    })
    expect(contact).toBe(false)
  })

  it('kills on z-axis (front/back) contact once truly within the depth half-extent', () => {
    const contact = isMatildaBodyContact({
      enemyX: 0, enemyZ: 0.33, yaw: 0, playerX: 0, playerZ: 0, halfX, halfZ,
    })
    expect(contact).toBe(true)
  })

  it('requires deeper x-axis body overlap instead of the old 0.5093 distance', () => {
    expect(isMatildaBodyContact({
      enemyX: 0.44, enemyZ: 0, yaw: 0, playerX: 0, playerZ: 0, halfX, halfZ,
    })).toBe(true)
    expect(isMatildaBodyContact({
      enemyX: 0.45, enemyZ: 0, yaw: 0, playerX: 0, playerZ: 0, halfX, halfZ,
    })).toBe(false)
  })

  it("rotates the contact box with Matilda's facing yaw (groupRef.rotation.y), so a world-axis check alone cannot fit her charge orientation", () => {
    // At yaw=0, a 0.42 offset along world x is Matilda's local width axis -> contact.
    expect(isMatildaBodyContact({
      enemyX: 0, enemyZ: 0, yaw: 0, playerX: 0.42, playerZ: 0, halfX, halfZ,
    })).toBe(true)

    // Rotate Matilda 90 degrees: world +x now maps onto her local depth (z) axis,
    // where 0.42 exceeds halfZ + the deeper-overlap allowance -> no contact.
    expect(isMatildaBodyContact({
      enemyX: 0, enemyZ: 0, yaw: Math.PI / 2, playerX: 0.42, playerZ: 0, halfX, halfZ,
    })).toBe(false)
  })

  it('does not kill on a diagonal approach that clears the depth axis, even while still inside the width axis', () => {
    // Diagonal point: within halfX + player extent (0.5093) on x, but past
    // halfZ + player extent (0.4027) on z -- the player has not actually
    // touched the rectangular body, only entered its naive bounding circle.
    expect(isMatildaBodyContact({
      enemyX: 0, enemyZ: 0, yaw: 0, playerX: 0.42, playerZ: 0.42, halfX, halfZ,
    })).toBe(false)

    // A diagonal point that lands inside both axes is a genuine corner-region
    // touch and must still register as contact.
    expect(isMatildaBodyContact({
      enemyX: 0, enemyZ: 0, yaw: 0, playerX: 0.35, playerZ: 0.30, halfX, halfZ,
    })).toBe(true)
  })

  it('leaves the general charger (E05/B01 non-Matilda) contact-distance grace unchanged', () => {
    expect(getChargeHitDistance(ENEMY_STATS.E05, false)).toBeCloseTo(
      ENEMY_STATS.E05.contactDist * ENEMY_SIZE_MULTIPLIER * 1.5,
      10,
    )
    expect(getChargeHitDistance(ENEMY_STATS.B01, false)).toBeCloseTo(
      ENEMY_STATS.B01.contactDist * ENEMY_SIZE_MULTIPLIER * 1.5,
      10,
    )

    // The Enemy.jsx source still routes the general-charger contact check through
    // the unchanged scalar helper, and the obstacle-stall detector still uses the
    // conservative scalar getBodyContactDistance (not the new box check).
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')
    expect(source).toContain('hitPlayer = dist < getChargeHitDistance(stats, false)')
    expect(source).toContain('const hitDistance = getChargeHitDistance(stats, true)')
    expect(source).toContain('isMatildaChargeBlockedValues(movedAlong, expectedMove, dist, hitDistance)')
  })
})

// 유예 없는 즉사 회귀 테스트 (2026-08-13).
// 신고: "마틸다가 밀고 화면 끝까지 갈 때까지 안 죽는다." 원인은 1000ms 접촉 유지 조건이었다 —
// 밀려나는 동안 접촉이 한 프레임만 끊겨도 카운트다운이 전액 리셋돼(아래 리셋 테스트) 영원히
// 1000ms를 못 채웠다. 이제 닿는 프레임에 바로 죽인다.
describe('Matilda body contact instant death', () => {
  it('requires about half the player half-width of real body overlap before contact becomes lethal', () => {
    const halfX = 0.5
    const halfZ = 0.2

    expect(isMatildaBodyContact({ enemyX: 0, enemyZ: 0, yaw: 0, playerX: halfX + PLAYER_CONTACT_HALF_EXTENT, playerZ: 0, halfX, halfZ })).toBe(false)
    expect(isMatildaBodyContact({ enemyX: 0, enemyZ: 0, yaw: 0, playerX: halfX + MATILDA_CONTACT_PLAYER_OVERLAP_THRESHOLD, playerZ: 0, halfX, halfZ })).toBe(true)
  })

  it('keeps the rotated OBB shape while using the same deeper-overlap threshold', () => {
    const halfX = 0.5
    const halfZ = 0.2
    const yaw = Math.PI / 2

    expect(isMatildaBodyContact({ enemyX: 0, enemyZ: 0, yaw, playerX: 0, playerZ: -(halfX + PLAYER_CONTACT_HALF_EXTENT), halfX, halfZ })).toBe(false)
    expect(isMatildaBodyContact({ enemyX: 0, enemyZ: 0, yaw, playerX: 0, playerZ: -(halfX + MATILDA_CONTACT_PLAYER_OVERLAP_THRESHOLD), halfX, halfZ })).toBe(true)
  })

  it('kills on the very first deeper body-contact frame with no grace period', () => {
    const countdown = createMatildaContactKillCountdown()

    expect(advanceMatildaContactKillCountdown(countdown, true, 0)).toBe(true)
    expect(countdown.fired).toBe(true)
  })

  it('kills even when the contact frame delta is tiny', () => {
    const countdown = createMatildaContactKillCountdown()

    expect(advanceMatildaContactKillCountdown(countdown, true, 1)).toBe(true)
  })

  it('fires exactly once and never re-fires while contact continues', () => {
    const countdown = createMatildaContactKillCountdown()

    expect(advanceMatildaContactKillCountdown(countdown, true, 16)).toBe(true)
    expect(advanceMatildaContactKillCountdown(countdown, true, 16)).toBe(false)
    expect(advanceMatildaContactKillCountdown(countdown, true, 1000)).toBe(false)
  })

  it('stays silent while there is no body contact', () => {
    const countdown = createMatildaContactKillCountdown()

    expect(advanceMatildaContactKillCountdown(countdown, false, 5000)).toBe(false)
    expect(countdown.started).toBe(false)
    expect(countdown.fired).toBe(false)
    expect(countdown.remainingMs).toBe(MATILDA_CONTACT_KILL_DELAY_MS)
  })

  it('wires every Matilda state through the shared body-contact countdown and preserves collider-derived extents', () => {
    const source = readFileSync(new URL('./Enemy.jsx', import.meta.url), 'utf8')

    expect(MATILDA_CONTACT_KILL_DELAY_MS).toBe(0)
    expect(source).toContain('const matildaContactKillCountdownRef = useRef(createMatildaContactKillCountdown())')
    expect(source).toContain('contactArgs.halfX = matildaHalfExtents.halfX')
    expect(source).toContain('contactArgs.halfZ = matildaHalfExtents.halfZ')
    expect(source).toContain('if (advanceMatildaContactKillCountdown(matildaContactKillCountdownRef.current, matildaBodyContact, delta * 1000)) {')
    expect(source).toContain("killPlayer('matilda')")
    expect(source).not.toContain('onKill: () =>')
    expect(source).not.toContain('advanceMatildaContactKillCountdown(matildaContactKillCountdownRef.current, {')
    expect(source).toContain("chargeState.current === 'matildaAim'")
    expect(source).toContain("chargeState.current === 'charge'")
    expect(source).toContain("chargeState.current === 'matildaLaugh'")
  })
})
})
