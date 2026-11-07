import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  SLTERA_BOSS_DAMAGE, SLTERA_HALF_LENGTH, SLTERA_HALF_WIDTH, SLTERA_LANE_EDGE_MARGIN, SLTERA_PHASE,
  SLTERA_PLAYER_DAMAGE_RATIO, SLTERA_PLAYER_RADIUS, SLTERA_RUN_OVER_CHANCE, SLTERA_RUN_OVER_DAMAGE, SLTERA_SPEED,
  SLTERA_STAGE_IDS, SLTERA_THUD_GAP_MS,
  beginSlteraPass, checkSlteraPlayerHit, claimSlteraThud, createSlteraPass, getSlteraDeadlineMs, getSlteraPassStartMs,
  getSlteraPassTimesMs, getSlteraSweepBox, isSlteraStage, pickSlteraLaneZ, rollSlteraRunOver, stepSlteraPass,
} from './slteraEvent.js'

const bounds = { minX: -5, maxX: 5, minZ: -8, maxZ: 6 }
const seq = (values) => { let i = 0; return () => values[i++ % values.length] }
const lcg = (seed) => { let s = seed >>> 0; return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 0x100000000 } }
// 차선을 정확히 z로 두는 난수(방향 r0, 차선 (z - lo)/(hi - lo)).
const laneRand = (dirRoll, z) => {
  const lo = bounds.minZ + SLTERA_LANE_EDGE_MARGIN
  const hi = bounds.maxZ - SLTERA_LANE_EDGE_MARGIN
  return seq([dirRoll, (z - lo) / (hi - lo)])
}

// 한 질주를 끝까지 시뮬레이션. onStep(pass)는 매 step 뒤 호출.
function runPass(pass, onStep, dtMs = 1000 / 60) {
  for (let guard = 0; guard < 10_000 && pass.phase !== SLTERA_PHASE.DONE; guard += 1) {
    stepSlteraPass(pass, dtMs)
    onStep?.(pass)
  }
}

describe('Sltera run schedule — appears in every Stage 1-5 run', () => {
  it('schedules at least one pass in EVERY stage 1-5 run, finishing before the portal/Matilda warning', () => {
    expect(SLTERA_STAGE_IDS).toEqual(['stage1', 'stage2', 'stage3', 'stage4', 'stage5'])
    for (const stageId of SLTERA_STAGE_IDS) {
      const deadline = getSlteraDeadlineMs(stageId)
      for (let gameKey = 0; gameKey < 500; gameKey += 1) {
        const times = getSlteraPassTimesMs(stageId, gameKey, deadline)
        expect(times.length).toBeGreaterThanOrEqual(1)
        const first = times[0]
        // 무작위 굴림 없이 15~25초 사이에 반드시 잡힌다(일찍 끝나는 판도 대부분 본다).
        expect(first).toBeGreaterThanOrEqual(15_000)
        expect(first).toBeLessThan(25_000)
        // 85초 간격: 100~110초, 185~195초 질주도 탈출구·마틸다 예고 전에 나온다.
        expect(times.length).toBeGreaterThanOrEqual(3)
        expect(times[2]).toBeLessThan(195_000)
        // 최대 질주 시간(넓은 화면 40u 가정)까지 마감 전에 끝난다.
        expect(first + (40 / SLTERA_SPEED) * 1000).toBeLessThan(deadline)
      }
    }
  })

  it('is deterministic per run and repeats every 85 seconds', () => {
    expect(getSlteraPassStartMs('stage2', 7, 0)).toBe(getSlteraPassStartMs('stage2', 7, 0))
    expect(getSlteraPassStartMs('stage2', 7, 1) - getSlteraPassStartMs('stage2', 7, 0)).toBe(85_000)
    const distinct = new Set(Array.from({ length: 50 }, (_, k) => getSlteraPassStartMs('stage1', k, 0)))
    expect(distinct.size).toBeGreaterThan(10)
  })

  it('leaves draft stages 6-10 alone', () => {
    for (const stageId of ['stage6', 'stage7', 'stage8', 'stage9', 'stage10']) {
      expect(isSlteraStage(stageId)).toBe(false)
      expect(getSlteraPassStartMs(stageId, 1, 0)).toBe(Infinity)
    }
  })

  it('is mounted in Game.jsx for the Sltera stages, keyed by run', () => {
    const game = readFileSync(new URL('../components/Game.jsx', import.meta.url), 'utf8')
    expect(game).toMatch(/isSlteraStage\(currentStageId\) && <SlteraEvent key=\{`\$\{gameKey\}:\$\{currentStageId\}`\}/)
  })
})

describe('Sltera pass: sudden appearance (no warning) and crossing', () => {
  it('has no warning phase: it starts driving the moment the pass begins, from just off-screen', () => {
    expect(Object.values(SLTERA_PHASE)).toEqual(['drive', 'done'])
    const pass = beginSlteraPass(createSlteraPass(), { playerX: 0, playerZ: 0, bounds, rand: seq([0.2, 0.5]) })
    expect(pass.phase).toBe(SLTERA_PHASE.DRIVE)
    expect(pass.dir).toBe(1)
    expect(pass.startX).toBeLessThan(bounds.minX)
    expect(pass.endX).toBeGreaterThan(bounds.maxX)
    // 첫 프레임부터 움직이고, 차 앞코가 화면에 들어오기까지 0.1초도 안 걸린다.
    stepSlteraPass(pass, 1000 / 60)
    expect(pass.x).toBeGreaterThan(pass.startX)
    const msUntilVisible = ((bounds.minX - (pass.startX + SLTERA_HALF_LENGTH)) / SLTERA_SPEED) * 1000
    expect(msUntilVisible).toBeLessThan(100)
    runPass(pass)
    expect(pass.x).toBe(pass.endX)
  })

  it('component renders no warning strip and never feeds a telegraph pulse', () => {
    const src = readFileSync(new URL('../components/SlteraEvent.jsx', import.meta.url), 'utf8')
    expect(src).not.toMatch(/meshBasicMaterial|getSlteraTelegraphProgress|TELEGRAPH/)
    expect(src).toContain('const telegraphRef = useRef(-1)')
  })

  it('can come from the right', () => {
    const pass = beginSlteraPass(createSlteraPass(), { playerX: 2, playerZ: 3, bounds, rand: seq([0.9, 0.5]) })
    expect(pass.dir).toBe(-1)
    expect(pass.startX).toBeGreaterThan(bounds.maxX)
    expect(pass.endX).toBeLessThan(bounds.minX)
  })

  it('picks its lane at random among the visible rows, not aimed at Rosari', () => {
    const rand = lcg(99)
    let nearRosari = 0
    const N = 4000
    for (let i = 0; i < N; i += 1) {
      const z = pickSlteraLaneZ(bounds, 0, rand)
      expect(z).toBeGreaterThanOrEqual(bounds.minZ + SLTERA_LANE_EDGE_MARGIN)
      expect(z).toBeLessThanOrEqual(bounds.maxZ - SLTERA_LANE_EDGE_MARGIN)
      if (Math.abs(z) <= SLTERA_HALF_WIDTH + SLTERA_PLAYER_RADIUS) nearRosari += 1
    }
    // 판정 폭 2.5u / 보이는 행 11u ≈ 23% — 로자리 행을 겨냥하지 않는다.
    expect(nearRosari / N).toBeGreaterThan(0.18)
    expect(nearRosari / N).toBeLessThan(0.28)
    // 화면 범위가 아직 없으면(0 폭) 로자리 행으로 폴백.
    expect(pickSlteraLaneZ({ minX: 0, maxX: 0, minZ: 0, maxZ: 0 }, 2.5, rand)).toBe(2.5)
  })
})

describe('Sltera run-over and Rosari damage', () => {
  it('rolls each enemy once per pass with the 65% chance', () => {
    const pass = beginSlteraPass(createSlteraPass(), { playerX: 0, playerZ: 0, bounds, rand: seq([0.2, 0.5]) })
    expect(rollSlteraRunOver(pass, 3, 1, null, 'E01', () => SLTERA_RUN_OVER_CHANCE - 0.01)).toBe(SLTERA_RUN_OVER_DAMAGE)
    expect(rollSlteraRunOver(pass, 3, 1, null, 'E01', () => 0)).toBe(0) // already rolled
    expect(rollSlteraRunOver(pass, 4, 1, null, 'E01', () => SLTERA_RUN_OVER_CHANCE)).toBe(0) // spared
    expect(rollSlteraRunOver(pass, 4, 1, null, 'E01', () => 0)).toBe(0) // spared stays spared
    expect(rollSlteraRunOver(pass, 3, 2, null, 'E01', () => 0)).toBe(SLTERA_RUN_OVER_DAMAGE) // reused slot = new enemy
    const boss = {}
    expect(rollSlteraRunOver(pass, -1, null, boss, 'B01', () => 0)).toBe(SLTERA_BOSS_DAMAGE)
    expect(rollSlteraRunOver(pass, -1, null, boss, 'B01', () => 0)).toBe(0)
    // 다음 질주는 새로 굴린다.
    beginSlteraPass(pass, { playerX: 0, playerZ: 0, bounds, rand: seq([0.2, 0.5]) })
    expect(rollSlteraRunOver(pass, 3, 1, null, 'E01', () => 0)).toBe(SLTERA_RUN_OVER_DAMAGE)
  })

  it('runs over roughly 65% of a crowd at random', () => {
    const pass = beginSlteraPass(createSlteraPass(), { playerX: 0, playerZ: 0, bounds, rand: seq([0.2, 0.5]) })
    const rand = lcg(12345)
    let hits = 0
    for (let i = 0; i < 2000; i += 1) if (rollSlteraRunOver(pass, i, 0, null, 'E01', rand) > 0) hits += 1
    expect(hits / 2000).toBeGreaterThan(0.6)
    expect(hits / 2000).toBeLessThan(0.7)
  })

  it('plays at most one run-over thud per 150 ms of game time', () => {
    expect(SLTERA_THUD_GAP_MS).toBe(150)
    const pass = beginSlteraPass(createSlteraPass(), { playerX: 0, playerZ: 0, bounds, rand: seq([0.2, 0.5]) })
    // 무리를 쓸고 가며 60fps 연속 프레임마다 쳐도(0~133ms) 첫 쿵만 즉시 울린다.
    const t0 = 20_000
    const frames = Array.from({ length: 9 }, (_, i) => t0 + i * (1000 / 60))
    expect(frames.map((t) => claimSlteraThud(pass, t))).toEqual([true, false, false, false, false, false, false, false, false])
    // 직전 쿵에서 150ms가 지나면 다시 허용 — 간격은 늘 직전 쿵 기준.
    expect(claimSlteraThud(pass, t0 + 149)).toBe(false)
    expect(claimSlteraThud(pass, t0 + 150)).toBe(true)
    // 같은 시각(한 렌더 프레임에 몰아 도는 고정 스텝 — 런 시계가 그대로)은 한 번만.
    expect(claimSlteraThud(pass, t0 + 150)).toBe(false)
    expect(claimSlteraThud(pass, t0 + 299)).toBe(false)
    expect(claimSlteraThud(pass, t0 + 300)).toBe(true)
    // 새 질주는 첫 쿵부터 다시 즉시.
    beginSlteraPass(pass, { playerX: 0, playerZ: 0, bounds, rand: seq([0.2, 0.5]) })
    expect(claimSlteraThud(pass, t0 + 310)).toBe(true)
    // 런타임은 이 게이트를 거쳐서만 쿵을 내고, 음량·피치는 그대로다.
    const src = readFileSync(new URL('../components/SlteraEvent.jsx', import.meta.url), 'utf8')
    expect(src).toContain("if (ranOver && claimSlteraThud(pass, elapsedMs)) emitSfx({ id: 'zombieGiantThud', volume: 0.6, rate: 1.1 })")
    expect(src.match(/zombieGiantThud/g)).toHaveLength(1)
  })

  it('only sweeps the on-screen part of its path (zombies off-screen are not run over)', () => {
    const pass = beginSlteraPass(createSlteraPass(), { playerX: 0, playerZ: 0, bounds, rand: seq([0.2, 0.5]) })
    const box = {}
    // 출발 직후: 차 전체가 아직 화면 밖 → 치기 판정 없음.
    stepSlteraPass(pass, 10)
    expect(getSlteraSweepBox(pass, box, bounds)).toBe(false)
    // 화면 안을 지날 때: 사각형이 화면 X 범위 안으로 잘린다.
    let sawOnScreen = false
    runPass(pass, (p) => {
      if (!getSlteraSweepBox(p, box, bounds)) return
      sawOnScreen = true
      expect(box.centerX - box.halfDepth).toBeGreaterThanOrEqual(bounds.minX - 1e-9)
      expect(box.centerX + box.halfDepth).toBeLessThanOrEqual(bounds.maxX + 1e-9)
      expect(box.centerZ).toBe(p.laneZ)
    })
    expect(sawOnScreen).toBe(true)
    // 화면 범위를 안 주면 쓸고 간 전 구간(차 길이 포함).
    pass.prevX = 0; pass.x = 1
    expect(getSlteraSweepBox(pass, box)).toBe(true)
    expect(box.halfDepth).toBeCloseTo(SLTERA_HALF_LENGTH + 0.5, 9)
  })

  it('damages Rosari exactly once per pass when its lane crosses her', () => {
    const pass = beginSlteraPass(createSlteraPass(), { playerX: 0, playerZ: 0, bounds, rand: laneRand(0.2, 0) })
    expect(pass.laneZ).toBeCloseTo(0, 9)
    const damages = []
    runPass(pass, (p) => { const d = checkSlteraPlayerHit(p, 0, 0.5, 100); if (d > 0) damages.push(d) })
    expect(damages).toEqual([100 * SLTERA_PLAYER_DAMAGE_RATIO])
  })

  it('does not damage Rosari when the lane misses her row', () => {
    const pass = beginSlteraPass(createSlteraPass(), { playerX: 0, playerZ: 0, bounds, rand: laneRand(0.2, 3) })
    const damages = []
    runPass(pass, (p) => { const d = checkSlteraPlayerHit(p, 0, 0, 100); if (d > 0) damages.push(d) })
    expect(damages).toEqual([])
  })

  it('cannot tunnel past Rosari at a low frame rate', () => {
    const pass = beginSlteraPass(createSlteraPass(), { playerX: 0, playerZ: 0, bounds, rand: laneRand(0.2, 0) })
    const damages = []
    // 250ms step = 3.5u per step > car length; the swept box must still catch her.
    runPass(pass, (p) => { const d = checkSlteraPlayerHit(p, 0.1, 0, 80); if (d > 0) damages.push(d) }, 250)
    expect(damages).toHaveLength(1)
    expect(SLTERA_HALF_LENGTH * 2).toBeGreaterThan(3)
  })
})
