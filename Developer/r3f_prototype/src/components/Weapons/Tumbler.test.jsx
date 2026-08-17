import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createWeaponTargetScratch } from '../../lib/weaponTargeting.js'
import { tumblerHitMultiplier } from '../../lib/tumblerFalloff.js'
import { WEAPON_CATALOG } from '../../lib/weaponCatalog.js'

const source = readFileSync(new URL('./Tumbler.jsx', import.meta.url), 'utf8')

function indexOfOrThrow(needle) {
  const idx = source.indexOf(needle)
  if (idx < 0) throw new Error(`Missing Tumbler source snippet: ${needle}`)
  return idx
}

describe('TumblerModel visual spec', () => {
  it('keeps the original body outline/body/cap children at the front before adding decorative parts', () => {
    const outline = indexOfOrThrow('<mesh material={outMat} scale={inflateScale([1.12, 1.12, 1.08])}>')
    const body = indexOfOrThrow('<mesh material={bodyMat}>')
    const cap = indexOfOrThrow('<mesh material={capMat} position={[0, 0.34, 0]}>')
    const handleOutline = indexOfOrThrow('<mesh material={outMat} position={[0.29, 0, 0]}')
    const handleBody = indexOfOrThrow('<mesh material={handleMat} position={[0.29, 0, 0]}')
    const strawOutline = indexOfOrThrow('<mesh material={outMat} position={[-0.05, 0.56, 0]}')
    const strawBody = indexOfOrThrow('<mesh material={strawMat} position={[-0.05, 0.56, 0]}')

    expect([outline, body, cap, handleOutline, handleBody, strawOutline, strawBody]).toEqual(
      [...[outline, body, cap, handleOutline, handleBody, strawOutline, strawBody]].sort((a, b) => a - b),
    )
  })

  it('matches the tumbler scale and legacy body/cap geometry numbers exactly', () => {
    expect(source).toContain('<group rotation={[0, 0, Math.PI / 2]} scale={[0.6375, 0.6375, 0.6375]}>')
    expect(source).toContain('<cylinderGeometry args={[0.15, 0.20, 0.58, 10]} />')
    expect(source).toContain('<cylinderGeometry args={[0.16, 0.16, 0.10, 10]} />')
  })

  it('adds a matched outline/body C-handle and straw with the requested geometry proportions', () => {
    expect(source).toContain('const handleMat = useMemo(() => toonMat(0xe85d2a, 0.16), [])')
    expect(source).toContain('const strawMat = useMemo(() => toonMat(0x3dc2c8, 0.12), [])')
    expect(source).toContain('position={[0.29, 0, 0]} rotation={[0, 0, -Math.PI * 0.7]}')
    expect(source).toContain('<torusGeometry args={[0.20, 0.035, 8, 24, Math.PI * 1.4]} />')
    expect(source).toContain('position={[-0.05, 0.56, 0]} rotation={[0, 0, Math.PI * 0.12]}')
    expect(source).toContain('<cylinderGeometry args={[0.028, 0.028, 0.42, 8]} />')
    expect(source).toContain('scale={inflateScale([1.13, 1.13, 1.13])}')
    expect(source).toContain('scale={inflateScale([1.16, 1.16, 1.16])}')
  })

  it('uses squared orbit distance instead of Rapier intersections', () => {
    expect(source).toContain('scanOrbitEnemiesInto')
    expect(source).not.toContain('enemyBodies.forEach')
    expect(source).toContain('applyEnemyHit')
    expect(source).not.toContain('other.rigidBody')
    expect(source).not.toContain('@react-three/rapier')
  })
})

// ── 연속 타격 감쇠(2026-08-17) ────────────────────────────────────────────────
// 소스 문자열 대조가 아니라 실제 프레임 루프 본문을 그대로 떼어 실행한다.
// StunGunNearestTargetRegression.test.jsx가 쓰는 방식과 같다 — 프로덕션 코드가
// applyEnemyHit에 넘기는 피해값을 직접 관측해야 배율 순서를 진짜로 고정할 수 있다.
function extractPlayingFrameBody(src) {
  const head = 'usePlayingFrame(({ clock }) => {'
  const callbackStart = src.indexOf(head)
  expect(callbackStart).toBeGreaterThanOrEqual(0)
  const bodyStart = callbackStart + head.length
  let depth = 1
  for (let index = bodyStart; index < src.length; index += 1) {
    if (src[index] === '{') depth += 1
    if (src[index] === '}') depth -= 1
    if (depth === 0) return src.slice(bodyStart, index)
  }
  throw new Error('TumblerOrbit frame callback closing brace was not found')
}

function compileTumblerFrame(deps) {
  const body = extractPlayingFrameBody(source)
  const names = Object.keys(deps)
  const values = Object.values(deps)
  return new Function(...names, `return ({ clock }) => {${body}}`)(...values)
}

// 프레임마다 "이번에 텀블러 범위에 잡힌 적"을 대본대로 돌려주는 하네스.
function createTumblerHarness({ weapon, hitSucceeds = () => true } = {}) {
  const applied = []
  let plan = []
  const bodies = new Map()
  const bodyFor = (index) => {
    if (!bodies.has(index)) bodies.set(index, { id: `enemy-${index}` })
    return bodies.get(index)
  }

  const runFrame = (elapsedSeconds, targets) => {
    plan = targets
    frame({ clock: { elapsedTime: elapsedSeconds } })
  }

  const frame = compileTumblerFrame({
    weapons: { tumbler: { active: true, ...WEAPON_CATALOG.tumbler.base, ...weapon } },
    playerPos: { x: 0, y: 0, z: 0 },
    visualRefs: { current: [] },
    orbitXRef: { current: new Float32Array(3) },
    orbitZRef: { current: new Float32Array(3) },
    targetScratchRef: { current: createWeaponTargetScratch() },
    lastHitRef: {
      current: {
        times: new Float64Array(200),
        generations: new Uint16Array(200),
        special: new Array(3),
        specialTimes: new Float64Array(3),
      },
    },
    hitSeqRef: { current: 0 },
    impactRef: { current: { knockback: 3, knockbackMs: 220, source: { x: 0, z: 0 }, critChance: 0, critMultiplier: 1 } },
    scanOrbitEnemiesInto: (scratch) => {
      plan.forEach((target, slot) => {
        scratch.indices[slot] = target.index
        scratch.generations[slot] = target.generation
        scratch.special[slot] = undefined
      })
      scratch.count = plan.length
      return plan.length
    },
    resolveWeaponTarget: (index) => bodyFor(index),
    isEnemyHitLive: () => true,
    applyEnemyHit: (rb, generation, damage) => {
      const ok = hitSucceeds(rb, damage)
      if (ok) applied.push({ id: rb.id, damage })
      return ok
    },
    tumblerHitMultiplier,
    useGameStore: { getState: () => ({ recordMissionEvent: () => {} }) },
    emitSfx: () => {},
  })

  return { runFrame, applied }
}

describe('텀블러 연속 타격 감쇠 (프로덕션 프레임 루프 실행)', () => {
  // hitsPerSecond 2.5 → 적별 타격 게이트 400ms. 프레임을 0.5초 간격으로 돌려 매번 통과시킨다.
  const DAMAGE = 10
  const weapon = { damage: DAMAGE, hitsPerSecond: 2.5, count: 1 }
  const A = { index: 3, generation: 1 }
  const B = { index: 7, generation: 1 }

  it('한 적을 계속 때리면 5타 주기로 1.0/0.9/0.8/0.7/0.6 → 6타째 1.0으로 복귀한다', () => {
    const { runFrame, applied } = createTumblerHarness({ weapon })
    for (let i = 0; i < 7; i += 1) runFrame(1 + i * 0.5, [A])

    expect(applied.map((hit) => hit.damage)).toEqual([
      DAMAGE * 1.0,
      DAMAGE * 0.9,
      DAMAGE * 0.8,
      DAMAGE * 0.7,
      DAMAGE * 0.6,
      DAMAGE * 1.0,
      DAMAGE * 0.9,
    ])
  })

  it('카운터는 텀블러 전역이다 — 적이 바뀌어도 이어진다 (A 3타 후 B 첫 타격이 0.70)', () => {
    const { runFrame, applied } = createTumblerHarness({ weapon })
    runFrame(1.0, [A])
    runFrame(1.5, [A])
    runFrame(2.0, [A])
    runFrame(2.5, [B])

    expect(applied).toEqual([
      { id: 'enemy-3', damage: DAMAGE * 1.0 },
      { id: 'enemy-3', damage: DAMAGE * 0.9 },
      { id: 'enemy-3', damage: DAMAGE * 0.8 },
      { id: 'enemy-7', damage: DAMAGE * 0.7 },
    ])
  })

  it('같은 프레임에 여러 적을 훑어도 때린 순서대로 내려간다', () => {
    const { runFrame, applied } = createTumblerHarness({ weapon })
    runFrame(1.0, [A, B, { index: 11, generation: 1 }])

    expect(applied.map((hit) => hit.damage)).toEqual([DAMAGE * 1.0, DAMAGE * 0.9, DAMAGE * 0.8])
  })

  it('applyEnemyHit이 false면(실제로 안 맞은 타격) 카운터를 올리지 않는다', () => {
    let allow = false
    const { runFrame, applied } = createTumblerHarness({
      weapon,
      hitSucceeds: () => allow,
    })
    runFrame(1.0, [A])
    runFrame(1.5, [A])
    expect(applied).toHaveLength(0)

    allow = true
    runFrame(2.0, [A])
    // 앞의 두 번이 카운터를 올렸다면 0.8이 됐을 자리다. 첫 유효타이므로 100%여야 한다.
    expect(applied.map((hit) => hit.damage)).toEqual([DAMAGE * 1.0])
  })

  it('시간이 아무리 흘러도 회복하지 않는다 — 순수 순환이다', () => {
    const { runFrame, applied } = createTumblerHarness({ weapon })
    runFrame(1.0, [A])
    runFrame(2.0, [A])
    // 30초 공백을 둬도 3타째(0.80)로 이어진다. 시간 기반 리셋은 없다.
    runFrame(32.0, [A])

    expect(applied.map((hit) => hit.damage)).toEqual([DAMAGE * 1.0, DAMAGE * 0.9, DAMAGE * 0.8])
  })
})
