import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  SLTERA_BASE_HALF_LENGTH, SLTERA_BASE_HALF_WIDTH, SLTERA_BASE_SPEED, SLTERA_BOSS_DAMAGE, SLTERA_EDGE_MARGIN,
  SLTERA_HALF_LENGTH, SLTERA_HALF_WIDTH, SLTERA_MAX_DEVIATION_RAD, SLTERA_PHASE, SLTERA_PLAYER_DAMAGE_RATIO,
  SLTERA_PLAYER_RADIUS, SLTERA_ROSARI_CLEARANCE, SLTERA_ROSARI_SPAN, SLTERA_RUN_OVER_CHANCE, SLTERA_RUN_OVER_DAMAGE,
  SLTERA_SIZE_SCALE, SLTERA_SPEED, SLTERA_SPEED_SCALE, SLTERA_STAGE_IDS, SLTERA_THUD_GAP_MS,
  beginSlteraPass, checkSlteraPlayerHit, claimSlteraThud, consumeSlteraPassStart, createSlteraPass, createSlteraRunState,
  SLTERA_DEADLINE_CLEAR_MS, getSlteraDeadlineMs, getSlteraPassStartMs, isSlteraNaturalStartAllowed, getSlteraPassTimesMs, getSlteraSweepBox, isSlteraPointOnScreen,
  isSlteraStage, requestSlteraInstantPassOn, rollSlteraRunOver, slteraViewHalfWidthAt, stepSlteraPass,
} from './slteraEvent.js'
import { getGameplayGroundReach } from './gameCameraFraming.js'
import { isPointInOrientedBox2D } from './weaponCollision.js'

// 390×844 세로 화면에서 로자리(0,0)를 따라가는 게임 카메라가 보는 바닥(Game.jsx screenBounds와 같은 계산).
const reach = getGameplayGroundReach(30, 390 / 844)
const bounds = { minX: -reach.reachSideFar, maxX: reach.reachSideFar, minZ: -reach.reachUp, maxZ: reach.reachDown }
const height = bounds.maxZ - bounds.minZ
const seq = (values) => { let i = 0; return () => values[i++ % values.length] }
const lcg = (seed) => { let s = seed >>> 0; return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 0x100000000 } }
const wrap = (a) => a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2))
const STEP_MS = 1000 / 60

// 한 질주를 끝까지 시뮬레이션. onStep(pass)는 매 step 뒤 호출.
function runPass(pass, onStep, dtMs = STEP_MS) {
  for (let guard = 0; guard < 100_000 && pass.phase !== SLTERA_PHASE.DONE; guard += 1) {
    stepSlteraPass(pass, dtMs)
    onStep?.(pass)
  }
}

// 차 사각형(중심·네 귀퉁이) 중 하나라도 보이는 바닥 안이면 화면에 보이는 것으로 친다.
function carVisible(pass, view = bounds) {
  const fx = Math.sin(pass.heading); const fz = Math.cos(pass.heading)
  for (const [a, b] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const x = pass.x + fx * SLTERA_HALF_LENGTH * a + fz * SLTERA_HALF_WIDTH * b
    const z = pass.z + fz * SLTERA_HALF_LENGTH * a - fx * SLTERA_HALF_WIDTH * b
    if (isSlteraPointOnScreen(view, x, z)) return true
  }
  return false
}

// 경로의 지그재그·발작이 없는 직선 사선 질주(판정 테스트용).
function straightPass(rand = seq([0.1, 0.1, 0.1, 0.9, 0.1])) {
  const pass = beginSlteraPass(createSlteraPass(), { bounds, rand })
  pass.waypointCount = 0
  pass.jerkCount = 0
  pass.wobbleRad = 0
  return pass
}

describe('Sltera run schedule — appears in every Stage 1-5 run (unchanged by the 11-08 rework)', () => {
  it('schedules at least one pass in EVERY stage 1-5 run, finishing before the portal/Matilda warning', () => {
    expect(SLTERA_STAGE_IDS).toEqual(['stage1', 'stage2', 'stage3', 'stage4', 'stage5'])
    // 최악의 질주 시간: 넓은 데스크톱 화면(40u × 20u) 사선을 사선 대비 최대 꺾임으로만 나아갈 때.
    const worstPassMs = (Math.hypot(40 + 2 * SLTERA_EDGE_MARGIN, 20 + 2 * SLTERA_EDGE_MARGIN) / (SLTERA_SPEED * Math.cos(SLTERA_MAX_DEVIATION_RAD))) * 1000
    for (const stageId of SLTERA_STAGE_IDS) {
      const deadline = getSlteraDeadlineMs(stageId)
      for (let gameKey = 0; gameKey < 500; gameKey += 1) {
        const times = getSlteraPassTimesMs(stageId, gameKey, deadline)
        expect(times.length).toBeGreaterThanOrEqual(3)
        expect(times[0]).toBeGreaterThanOrEqual(15_000)
        expect(times[0]).toBeLessThan(25_000)
        expect(times[2]).toBeLessThan(195_000)
        expect(times[0] + worstPassMs).toBeLessThan(deadline)
      }
    }
  })

  it('never runs a scheduled pass that would overlap the portal/Matilda warning — checks EVERY pass the runtime starts', () => {
    expect(SLTERA_DEADLINE_CLEAR_MS).toBe(12_000)
    for (const stageId of SLTERA_STAGE_IDS) {
      const deadline = getSlteraDeadlineMs(stageId)
      for (let gameKey = 0; gameKey < 200; gameKey += 1) {
        // 런타임과 같은 게이트로 0~320초를 100ms 간격으로 돌리고, 시작된 질주는 바로 끝났다고 친다.
        const run = createSlteraRunState()
        const started = []
        for (let t = 0; t <= 320_000; t += 100) {
          if (consumeSlteraPassStart(run, stageId, gameKey, t)) started.push(t)
        }
        expect(started.length).toBeGreaterThanOrEqual(2) // 첫 질주(15~25초)와 100~110초 질주는 늘 달린다
        expect(started[0]).toBeLessThan(25_100)
        for (const t of started) {
          // 시작이 예고 12초 전보다 이르거나 예고 12초 뒤 이후 — 세로 화면 최대 질주(≈11초)가 예고와 겹치지 않는다.
          expect(t <= deadline - SLTERA_DEADLINE_CLEAR_MS || t >= deadline + SLTERA_DEADLINE_CLEAR_MS).toBe(true)
        }
        // 모든 예정 질주 중 예고 앞뒤 12초 안은 정확히 건너뛰고, 나머지는 전부 달린다.
        const scheduled = getSlteraPassTimesMs(stageId, gameKey, 320_000)
        const expected = scheduled.filter((ms) => isSlteraNaturalStartAllowed(stageId, ms))
        expect(started.map((t) => Math.floor(t / 100))).toEqual(expected.map((ms) => Math.ceil(ms / 100)))
      }
    }
    // 즉시 출현은 예고 근처에서도 받는다(테리가 보며 지시하는 용도).
    const run = createSlteraRunState()
    run.passIndex = 99
    requestSlteraInstantPassOn(run)
    expect(consumeSlteraPassStart(run, 'stage1', 1, getSlteraDeadlineMs('stage1') - 1_000)).toBe(true)
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

describe('Sltera size and speed (Terry 11-08: 1/3 size, 1/5 speed)', () => {
  it('shrinks the hit box and the visual by the same 1/3 factor', () => {
    expect(SLTERA_SIZE_SCALE).toBeCloseTo(1 / 3, 12)
    expect(SLTERA_BASE_HALF_LENGTH * 2).toBeCloseTo(3.7, 9)
    expect(SLTERA_BASE_HALF_WIDTH * 2).toBeCloseTo(1.9, 9)
    expect(SLTERA_HALF_LENGTH * 2).toBeCloseTo(3.7 / 3, 9) // 1.23u
    expect(SLTERA_HALF_WIDTH * 2).toBeCloseTo(1.9 / 3, 9) // 0.63u
    const src = readFileSync(new URL('../components/SlteraEvent.jsx', import.meta.url), 'utf8')
    expect(src).toContain('<group ref={carRef} visible={false} scale={SLTERA_SIZE_SCALE}>')
    // 판정도 실제로 작아졌다: 차 중심선에서 옆으로 0.5u인 좀비는 11-07판(반폭 0.95)이면 치였지만 이제는 안 친다.
    const pass = straightPass()
    for (let i = 0; i < 300; i += 1) stepSlteraPass(pass, STEP_MS)
    const box = {}
    getSlteraSweepBox(pass, box)
    const sideX = Math.cos(box.yaw); const sideZ = -Math.sin(box.yaw)
    expect(box.halfWidth).toBeCloseTo(SLTERA_HALF_WIDTH, 12)
    expect(isPointInOrientedBox2D(box.centerX, box.centerZ, box.yaw, box.halfWidth, box.halfDepth, box.centerX + sideX * 0.2, box.centerZ + sideZ * 0.2)).toBe(true)
    expect(isPointInOrientedBox2D(box.centerX, box.centerZ, box.yaw, box.halfWidth, box.halfDepth, box.centerX + sideX * 0.5, box.centerZ + sideZ * 0.5)).toBe(false)
    expect(isPointInOrientedBox2D(box.centerX, box.centerZ, box.yaw, SLTERA_BASE_HALF_WIDTH, box.halfDepth, box.centerX + sideX * 0.5, box.centerZ + sideZ * 0.5)).toBe(true)
  })

  it('drives at 1/5 of the old 14u/s along its actual (zigzag) path', () => {
    expect(SLTERA_SPEED_SCALE).toBeCloseTo(1 / 5, 12)
    expect(SLTERA_BASE_SPEED).toBe(14)
    expect(SLTERA_SPEED).toBeCloseTo(2.8, 12)
    const rand = lcg(4242)
    for (let k = 0; k < 20; k += 1) {
      const pass = beginSlteraPass(createSlteraPass(), { bounds, playerX: 0, playerZ: 0, rand })
      let path = 0
      runPass(pass, (p) => { path += Math.hypot(p.x - p.prevX, p.z - p.prevZ) })
      const speed = path / (pass.elapsedMs / 1000)
      expect(speed).toBeGreaterThan(2.8 * 0.98)
      expect(speed).toBeLessThanOrEqual(2.8 * 1.0001)
    }
  })
})

describe('Sltera path: diagonal, zigzag, broken-car chaos (Terry 11-08)', () => {
  it('enters off-screen near one corner and leaves off-screen near the opposite corner', () => {
    const rand = lcg(77)
    const cx = (bounds.minX + bounds.maxX) / 2
    const corners = new Set()
    for (let k = 0; k < 300; k += 1) {
      const pass = beginSlteraPass(createSlteraPass(), { bounds, playerX: 0, playerZ: 0, rand })
      expect(pass.phase).toBe(SLTERA_PHASE.DRIVE)
      // 출발: 화면 밖, 차 전체가 아직 안 보인다.
      expect(isSlteraPointOnScreen(bounds, pass.entryX, pass.entryZ)).toBe(false)
      expect(carVisible(pass)).toBe(false)
      const su = Math.sign(pass.entryX - cx)
      const sv = pass.entryZ < (bounds.minZ + bounds.maxZ) / 2 ? -1 : 1
      corners.add(`${su},${sv}`)
      // 모서리 근처: 가로는 바깥 40% 안(또는 옆 변 밖), 세로는 그 변에서 화면 높이 15% 안(또는 위/아래 변 밖).
      const nearCorner = (x, z, cu, cv) => {
        const edgeZ = cv < 0 ? bounds.minZ : bounds.maxZ
        const inZ = cv < 0 ? z <= edgeZ + height * 0.15 : z >= edgeZ - height * 0.15
        const inX = cu * (x - cx) >= slteraViewHalfWidthAt(bounds, edgeZ) * 0.6
        return inZ && inX
      }
      expect(nearCorner(pass.entryX, pass.entryZ, su, sv)).toBe(true)
      expect(nearCorner(pass.exitX, pass.exitZ, -su, -sv)).toBe(true)
      runPass(pass)
      // 끝: 반대 모서리 쪽 화면 밖까지 가서 사라진다.
      expect(pass.progress).toBeGreaterThanOrEqual(pass.length)
      expect(carVisible(pass)).toBe(false)
      expect(Math.sign(pass.x - cx)).toBe(-su)
    }
    expect(corners.size).toBe(4) // 네 모서리 모두에서 출발한다
  })

  it('never drives straight: irregular zigzag widths and timings plus sudden jerks', () => {
    const rand = lcg(2026)
    const reversals = []
    const allSwings = []
    const allGaps = []
    // 변동계수(표준편차/평균) — 규칙적인 사인파면 0에 가깝다.
    const cv = (list) => {
      const mean = list.reduce((a, b) => a + b, 0) / list.length
      return Math.sqrt(list.reduce((a, b) => a + (b - mean) ** 2, 0) / list.length) / mean
    }
    for (let k = 0; k < 40; k += 1) {
      const pass = beginSlteraPass(createSlteraPass(), { bounds, playerX: 0, playerZ: 0, rand })
      const nX = pass.dirZ; const nZ = -pass.dirX
      const headings = []
      // 사선 기준 좌우 위치(w)의 꺾임: 직전 극값에서 0.35u 이상 되돌아오면 한 번 꺾인 것으로 센다.
      const peaks = []; const peakTimes = []
      let trend = 0; let extreme = NaN; let extremeT = 0; let lo = Infinity; let hi = -Infinity
      runPass(pass, (p) => {
        headings.push(p.heading)
        if (!carVisible(p)) return
        const w = (p.x - p.entryX) * nX + (p.z - p.entryZ) * nZ
        const t = p.elapsedMs
        if (trend === 0) {
          // 처음 0.35u 움직인 쪽이 첫 방향.
          lo = Math.min(lo, w); hi = Math.max(hi, w)
          if (hi - lo > 0.35) { trend = w >= hi ? 1 : -1; extreme = w; extremeT = t }
          return
        }
        if (trend > 0 ? w > extreme : w < extreme) { extreme = w; extremeT = t; return }
        if (Math.abs(w - extreme) > 0.35) { peaks.push(extreme); peakTimes.push(extremeT); trend = -trend; extreme = w; extremeT = t }
      })
      // 지그재그: 화면 안에서 좌우로 여러 번 꺾는다(질주마다 최소 3번, 아래에서 중앙값 5번 이상).
      expect(peaks.length).toBeGreaterThanOrEqual(3)
      reversals.push(peaks.length)
      // 좌우 폭·꺾임 박자는 질주 40번을 모아 아래에서 고르지 않음을 본다(한 질주의 꺾임 2~3번으로는 우연이 크다).
      allSwings.push(...peaks.slice(1).map((v, i) => Math.abs(v - peaks[i])))
      allGaps.push(...peakTimes.slice(1).map((t, i) => t - peakTimes[i]))
      // 직선 구간 없음: 어느 0.75초 구간을 봐도 차 방향이 6° 넘게 바뀐다.
      for (let i = 0; i + 45 <= headings.length; i += 15) {
        const win = headings.slice(i, i + 45).map((h) => wrap(h - headings[i]))
        expect(Math.max(...win) - Math.min(...win)).toBeGreaterThan(0.1)
      }
      // 발작: 0.1초 안에 30° 가까이 확 꺾이는 순간이 있다.
      let maxJerk = 0
      for (let i = 6; i < headings.length; i += 1) maxJerk = Math.max(maxJerk, Math.abs(wrap(headings[i] - headings[i - 6])))
      expect(maxJerk).toBeGreaterThan(0.5)
    }
    reversals.sort((a, b) => a - b)
    expect(reversals[Math.floor(reversals.length / 2)]).toBeGreaterThanOrEqual(5)
    expect(cv(allSwings)).toBeGreaterThan(0.3)
    expect(cv(allGaps)).toBeGreaterThan(0.3)
  })

  it('always faces its direction of travel, even mid-swerve', () => {
    const rand = lcg(31337)
    for (let k = 0; k < 30; k += 1) {
      const pass = beginSlteraPass(createSlteraPass(), { bounds, playerX: 0, playerZ: 0, rand })
      runPass(pass, (p) => {
        const travel = Math.atan2(p.x - p.prevX, p.z - p.prevZ)
        expect(Math.abs(wrap(p.heading - travel))).toBeLessThan(0.12)
      })
    }
    const src = readFileSync(new URL('../components/SlteraEvent.jsx', import.meta.url), 'utf8')
    expect(src).toContain('car.rotation.y = pass.heading')
  })

  it('stays on screen far longer than the 11-07 straight dash (≈0.75s → ≈8.7s median at 390×844)', () => {
    const rand = lcg(808)
    const onScreen = []
    for (let k = 0; k < 400; k += 1) {
      const pass = beginSlteraPass(createSlteraPass(), { bounds, playerX: 0, playerZ: 0, rand })
      let visibleMs = 0
      runPass(pass, (p) => { if (carVisible(p)) visibleMs += STEP_MS })
      onScreen.push(visibleMs / 1000)
    }
    onScreen.sort((a, b) => a - b)
    // 11-07판: 보이는 가로 폭(가장 넓은 위쪽 8.4u) + 차 길이 3.7u를 14u/s로 — 1초도 안 됐다.
    const oldMaxSec = (bounds.maxX - bounds.minX + SLTERA_BASE_HALF_LENGTH * 2) / SLTERA_BASE_SPEED
    expect(oldMaxSec).toBeLessThan(1)
    expect(onScreen[0]).toBeGreaterThan(5)
    const median = onScreen[Math.floor(onScreen.length / 2)]
    expect(median).toBeGreaterThan(7.5)
    expect(median).toBeLessThan(10.5)
    expect(median / oldMaxSec).toBeGreaterThan(8)
  })

  it('always finishes, even on a degenerate screen', () => {
    const flat = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 }
    const pass = beginSlteraPass(createSlteraPass(), { bounds: flat, rand: lcg(5) })
    runPass(pass)
    expect(pass.phase).toBe(SLTERA_PHASE.DONE)
    expect(Number.isFinite(pass.x) && Number.isFinite(pass.z)).toBe(true)
  })

  it('does not aim at a still Rosari: swerves near her row stay on the far side of the diagonal', () => {
    const rand = lcg(99)
    let hits = 0
    const N = 1000
    for (let k = 0; k < N; k += 1) {
      const pass = beginSlteraPass(createSlteraPass(), { bounds, playerX: 0, playerZ: 0, rand })
      const nX = pass.dirZ; const nZ = -pass.dirX
      const pu = -pass.entryX * pass.dirX - pass.entryZ * pass.dirZ
      const pw = -pass.entryX * nX - pass.entryZ * nZ
      const away = pw >= 0 ? -1 : 1
      for (let i = 0; i < pass.waypointCount; i += 1) {
        if (Math.abs(pass.wpU[i] - pu) >= SLTERA_ROSARI_SPAN) continue
        const w = (pass.wpX[i] - pass.entryX) * nX + (pass.wpZ[i] - pass.entryZ) * nZ
        expect((w - pw) * away).toBeGreaterThanOrEqual(SLTERA_ROSARI_CLEARANCE - 1e-9)
      }
      runPass(pass, (p) => { if (checkSlteraPlayerHit(p, 0, 0, 100) > 0) hits += 1 })
    }
    // 11-07판(무작위 가로 차선)은 가만히 선 로자리를 질주당 ≈14% 쳤다. 사선 개편 뒤에도 그 수준(발작·떨림으로만 맞는다).
    expect(hits / N).toBeGreaterThan(0.03)
    expect(hits / N).toBeLessThan(0.25)
  })
})

describe('Sltera run-over and Rosari damage', () => {
  it('rolls each enemy once per pass with the 65% chance', () => {
    const pass = beginSlteraPass(createSlteraPass(), { bounds, rand: lcg(1) })
    expect(rollSlteraRunOver(pass, 3, 1, null, 'E01', () => SLTERA_RUN_OVER_CHANCE - 0.01)).toBe(SLTERA_RUN_OVER_DAMAGE)
    expect(rollSlteraRunOver(pass, 3, 1, null, 'E01', () => 0)).toBe(0) // already rolled
    expect(rollSlteraRunOver(pass, 4, 1, null, 'E01', () => SLTERA_RUN_OVER_CHANCE)).toBe(0) // spared
    expect(rollSlteraRunOver(pass, 4, 1, null, 'E01', () => 0)).toBe(0) // spared stays spared
    expect(rollSlteraRunOver(pass, 3, 2, null, 'E01', () => 0)).toBe(SLTERA_RUN_OVER_DAMAGE) // reused slot = new enemy
    const boss = {}
    expect(rollSlteraRunOver(pass, -1, null, boss, 'B01', () => 0)).toBe(SLTERA_BOSS_DAMAGE)
    expect(rollSlteraRunOver(pass, -1, null, boss, 'B01', () => 0)).toBe(0)
    // 다음 질주는 새로 굴린다.
    beginSlteraPass(pass, { bounds, rand: lcg(2) })
    expect(rollSlteraRunOver(pass, 3, 1, null, 'E01', () => 0)).toBe(SLTERA_RUN_OVER_DAMAGE)
  })

  it('runs over roughly 65% of a crowd at random', () => {
    const pass = beginSlteraPass(createSlteraPass(), { bounds, rand: lcg(3) })
    const rand = lcg(12345)
    let hits = 0
    for (let i = 0; i < 2000; i += 1) if (rollSlteraRunOver(pass, i, 0, null, 'E01', rand) > 0) hits += 1
    expect(hits / 2000).toBeGreaterThan(0.6)
    expect(hits / 2000).toBeLessThan(0.7)
  })

  it('plays at most one run-over thud per 150 ms of game time', () => {
    expect(SLTERA_THUD_GAP_MS).toBe(150)
    const pass = beginSlteraPass(createSlteraPass(), { bounds, rand: lcg(4) })
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
    beginSlteraPass(pass, { bounds, rand: lcg(5) })
    expect(claimSlteraThud(pass, t0 + 310)).toBe(true)
    // 런타임은 이 게이트를 거쳐서만 쿵을 내고, 음량·피치는 그대로다.
    const src = readFileSync(new URL('../components/SlteraEvent.jsx', import.meta.url), 'utf8')
    expect(src).toContain("if (ranOver && claimSlteraThud(pass, elapsedMs)) emitSfx({ id: 'zombieGiantThud', volume: 0.6, rate: 1.1 })")
    expect(src.match(/zombieGiantThud/g)).toHaveLength(1)
  })

  it('has no warning phase and only runs zombies over while the car is on screen', () => {
    expect(Object.values(SLTERA_PHASE)).toEqual(['drive', 'done'])
    const src = readFileSync(new URL('../components/SlteraEvent.jsx', import.meta.url), 'utf8')
    expect(src).not.toMatch(/meshBasicMaterial|getSlteraTelegraphProgress|TELEGRAPH/)
    expect(src).toContain('const telegraphRef = useRef(-1)')
    const pass = beginSlteraPass(createSlteraPass(), { bounds, playerX: 0, playerZ: 0, rand: lcg(6) })
    const box = {}
    // 출발 직후: 차가 아직 화면 밖 → 치기 판정 없음. 첫 프레임부터 움직인다.
    stepSlteraPass(pass, STEP_MS)
    expect(Math.hypot(pass.x - pass.entryX, pass.z - pass.entryZ)).toBeGreaterThan(0)
    expect(getSlteraSweepBox(pass, box, bounds)).toBe(false)
    let sawOnScreen = false
    runPass(pass, (p) => {
      const on = getSlteraSweepBox(p, box, bounds)
      expect(on).toBe(isSlteraPointOnScreen(bounds, p.x, p.z))
      if (!on) return
      sawOnScreen = true
      expect(box.halfWidth).toBe(SLTERA_HALF_WIDTH)
      expect(box.halfDepth).toBeGreaterThanOrEqual(SLTERA_HALF_LENGTH)
      expect(Math.abs(wrap(box.yaw - p.heading))).toBeLessThan(0.12)
    })
    expect(sawOnScreen).toBe(true)
  })

  it('damages Rosari exactly once per pass when the car runs into her', () => {
    const pass = straightPass()
    // 직선 사선의 한가운데에 로자리를 세운다.
    const mx = (pass.entryX + pass.exitX) / 2
    const mz = (pass.entryZ + pass.exitZ) / 2
    const damages = []
    runPass(pass, (p) => { const d = checkSlteraPlayerHit(p, mx, mz, 100); if (d > 0) damages.push(d) })
    expect(damages).toEqual([100 * SLTERA_PLAYER_DAMAGE_RATIO])
  })

  it('does not damage Rosari when she is just outside the (smaller) car', () => {
    const pass = straightPass()
    const mx = (pass.entryX + pass.exitX) / 2
    const mz = (pass.entryZ + pass.exitZ) / 2
    const off = SLTERA_HALF_WIDTH + SLTERA_PLAYER_RADIUS + 0.1
    const damages = []
    runPass(pass, (p) => { const d = checkSlteraPlayerHit(p, mx + pass.dirZ * off, mz - pass.dirX * off, 100); if (d > 0) damages.push(d) })
    expect(damages).toEqual([])
  })

  it('cannot tunnel past Rosari at a low frame rate', () => {
    const pass = straightPass()
    const mx = (pass.entryX + pass.exitX) / 2
    const mz = (pass.entryZ + pass.exitZ) / 2
    const damages = []
    // 250ms step = 0.7u per step; the swept box covers the whole step.
    runPass(pass, (p) => { const d = checkSlteraPlayerHit(p, mx, mz, 80); if (d > 0) damages.push(d) }, 250)
    expect(damages).toHaveLength(1)
  })
})

describe('Sltera instant spawn (owner cheat)', () => {
  it('starts a pass on request without touching the natural schedule, and ignores taps during a pass', () => {
    const stageId = 'stage1'
    const gameKey = 3
    const first = getSlteraPassStartMs(stageId, gameKey, 0)
    const run = createSlteraRunState()
    // 예정 전: 자연 출현 없음.
    expect(consumeSlteraPassStart(run, stageId, gameKey, 5_000)).toBe(false)
    // 탭 → 다음 프레임에 바로 시작(요청은 한 번만 쌓인다).
    expect(requestSlteraInstantPassOn(run)).toBe(true)
    expect(requestSlteraInstantPassOn(run)).toBe(false)
    expect(consumeSlteraPassStart(run, stageId, gameKey, 5_016)).toBe(true)
    expect(run.passIndex).toBe(0)
    beginSlteraPass(run.pass, { bounds, playerX: 0, playerZ: 0, rand: lcg(8) })
    expect(run.pass.phase).toBe(SLTERA_PHASE.DRIVE)
    // 질주 중 탭은 무시 — 끝난 뒤에도 쌓여 있지 않다.
    expect(requestSlteraInstantPassOn(run)).toBe(false)
    expect(consumeSlteraPassStart(run, stageId, gameKey, 6_000)).toBe(false)
    runPass(run.pass)
    expect(consumeSlteraPassStart(run, stageId, gameKey, 9_000)).toBe(false)
    // 자연 스케줄은 그대로: 첫 예정 시각이 되면 평소처럼 달린다.
    expect(consumeSlteraPassStart(run, stageId, gameKey, first - 1)).toBe(false)
    expect(consumeSlteraPassStart(run, stageId, gameKey, first)).toBe(true)
    expect(run.passIndex).toBe(1)
  })

  it('is wired: SlteraEvent registers the receiver for its run and starts the pass through the schedule gate', () => {
    const src = readFileSync(new URL('../components/SlteraEvent.jsx', import.meta.url), 'utf8')
    expect(src).toContain('useEffect(() => registerSlteraInstantSpawnTarget(() => requestSlteraInstantPassOn(state.current.run)), [])')
    expect(src).toContain('if (!consumeSlteraPassStart(s.run, stageId, gameKey, elapsedMs)) return')
  })
})
