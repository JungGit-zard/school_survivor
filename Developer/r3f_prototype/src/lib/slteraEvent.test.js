import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  SLTERA_BASE_HALF_LENGTH, SLTERA_BASE_HALF_WIDTH, SLTERA_BASE_SPEED, SLTERA_BOSS_DAMAGE, SLTERA_EDGE_MARGIN,
  SLTERA_HALF_LENGTH, SLTERA_HALF_WIDTH, SLTERA_MAX_DEVIATION_RAD, SLTERA_PHASE, SLTERA_PLAYER_DAMAGE_RATIO,
  SLTERA_PLAYER_RADIUS, SLTERA_ROSARI_CLEARANCE, SLTERA_ROSARI_SPAN, SLTERA_RUN_OVER_CHANCE, SLTERA_RUN_OVER_DAMAGE,
  SLTERA_SIZE_SCALE, SLTERA_SPEED, SLTERA_SPEED_SCALE, SLTERA_STAGE_IDS, SLTERA_THUD_GAP_MS,
  SLTERA_BOUNCE_SEC, SLTERA_MAX_BOUNCES, SLTERA_OFFSCREEN_PAD, SLTERA_EXIT_MODE_SEC, getSlteraBodyBox, getSlteraObstacleOverlap,
  beginSlteraPass, checkSlteraPlayerHit, claimSlteraThud, consumeSlteraPassStart, createSlteraPass, createSlteraRunState,
  SLTERA_DEADLINE_CLEAR_MS, getSlteraDeadlineMs, getSlteraPassStartMs, isSlteraNaturalStartAllowed, getSlteraPassTimesMs, getSlteraSweepBox, isSlteraPointOnScreen,
  isSlteraStage, requestSlteraInstantPassOn, rollSlteraRunOver, slteraViewHalfWidthAt, stepSlteraPass,
} from './slteraEvent.js'
import { getGameplayGroundReach } from './gameCameraFraming.js'
import { isPointInOrientedBox2D } from './weaponCollision.js'
import { getStageObjectSightObstacles } from '../components/StageObjects/stageObjectColliders.js'

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

describe('Sltera size and speed (Terry 11-13: 2x then -30% = 1.4x the 11-08 size, 1.5x the 11-08 speed)', () => {
  // 11-08판: 크기 1/3(판정 길이 1.23u·폭 0.63u), 속도 1/5(2.8u/s).
  const OLD_HALF_LENGTH = SLTERA_BASE_HALF_LENGTH / 3
  const OLD_HALF_WIDTH = SLTERA_BASE_HALF_WIDTH / 3
  const OLD_SPEED = SLTERA_BASE_SPEED / 5

  it('scales the hit box and the visual together to 0.7x the 2x car (판정박스 1.73u x 0.89u)', () => {
    expect(SLTERA_SIZE_SCALE).toBeCloseTo((2 / 3) * 0.7, 12)
    expect(SLTERA_BASE_HALF_LENGTH * 2).toBeCloseTo(3.7, 9)
    expect(SLTERA_BASE_HALF_WIDTH * 2).toBeCloseTo(1.9, 9)
    // 2배판(길이 2.47u·폭 1.27u)의 0.7배 = 11-08판(1.23u·0.63u)의 1.4배.
    expect(SLTERA_HALF_LENGTH).toBeCloseTo(OLD_HALF_LENGTH * 2 * 0.7, 12)
    expect(SLTERA_HALF_WIDTH).toBeCloseTo(OLD_HALF_WIDTH * 2 * 0.7, 12)
    expect(SLTERA_HALF_LENGTH).toBeCloseTo(OLD_HALF_LENGTH * 1.4, 12)
    expect(SLTERA_HALF_WIDTH).toBeCloseTo(OLD_HALF_WIDTH * 1.4, 12)
    expect(SLTERA_HALF_LENGTH * 2).toBeCloseTo(1.7267, 3)
    expect(SLTERA_HALF_WIDTH * 2).toBeCloseTo(0.8867, 3)
    // 크기에 묶인 화면 밖 여유들은 차 귀퉁이 거리에서 뽑는다(2배판 1.5u·1.45u → ≈1.08u·≈1.03u).
    const corner = Math.hypot(SLTERA_HALF_LENGTH, SLTERA_HALF_WIDTH)
    expect(SLTERA_EDGE_MARGIN).toBeCloseTo(corner + 0.11, 12)
    expect(SLTERA_OFFSCREEN_PAD).toBeCloseTo(corner + 0.06, 12)
    expect(SLTERA_ROSARI_CLEARANCE).toBeCloseTo(1.3 + (SLTERA_HALF_WIDTH - OLD_HALF_WIDTH), 12)
    const src = readFileSync(new URL('../components/SlteraEvent.jsx', import.meta.url), 'utf8')
    expect(src).toContain('<group ref={carRef} visible={false} scale={SLTERA_SIZE_SCALE}>')
    // 차체 판정박스 = 지금 위치·방향의 OBB.
    const pass = straightPass()
    for (let i = 0; i < 300; i += 1) stepSlteraPass(pass, STEP_MS)
    const body = getSlteraBodyBox(pass, {})
    expect(body).toEqual({ centerX: pass.x, centerZ: pass.z, yaw: pass.heading, halfWidth: SLTERA_HALF_WIDTH, halfDepth: SLTERA_HALF_LENGTH })
    // 판정 폭: 차 중심선에서 옆으로 0.4u인 좀비는 11-08판(반폭 0.317)이면 안 치였지만 이제는 친다. 0.5u는 안 친다
    // (2배판 반폭 0.633이면 쳤다).
    const box = {}
    getSlteraSweepBox(pass, box)
    const sideX = Math.cos(box.yaw); const sideZ = -Math.sin(box.yaw)
    expect(box.halfWidth).toBeCloseTo(SLTERA_HALF_WIDTH, 9)
    expect(isPointInOrientedBox2D(box.centerX, box.centerZ, box.yaw, box.halfWidth, box.halfDepth, box.centerX + sideX * 0.4, box.centerZ + sideZ * 0.4)).toBe(true)
    expect(isPointInOrientedBox2D(box.centerX, box.centerZ, box.yaw, OLD_HALF_WIDTH, box.halfDepth, box.centerX + sideX * 0.4, box.centerZ + sideZ * 0.4)).toBe(false)
    expect(isPointInOrientedBox2D(box.centerX, box.centerZ, box.yaw, box.halfWidth, box.halfDepth, box.centerX + sideX * 0.5, box.centerZ + sideZ * 0.5)).toBe(false)
    expect(isPointInOrientedBox2D(box.centerX, box.centerZ, box.yaw, OLD_HALF_WIDTH * 2, box.halfDepth, box.centerX + sideX * 0.5, box.centerZ + sideZ * 0.5)).toBe(true)
  })

  it('drives at 1.5x the 11-08 speed (4.2u/s) along its actual (zigzag) path', () => {
    expect(SLTERA_SPEED_SCALE).toBeCloseTo(3 / 10, 12)
    expect(SLTERA_BASE_SPEED).toBe(14)
    expect(SLTERA_SPEED).toBeCloseTo(OLD_SPEED * 1.5, 12)
    expect(SLTERA_SPEED).toBeCloseTo(4.2, 12)
    const rand = lcg(4242)
    for (let k = 0; k < 20; k += 1) {
      const pass = beginSlteraPass(createSlteraPass(), { bounds, playerX: 0, playerZ: 0, rand })
      let path = 0
      runPass(pass, (p) => { path += Math.hypot(p.x - p.prevX, p.z - p.prevZ) })
      const speed = path / (pass.elapsedMs / 1000)
      expect(speed).toBeGreaterThan(4.2 * 0.98)
      expect(speed).toBeLessThanOrEqual(4.2 * 1.0001)
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
      // 지그재그: 화면 안에서 좌우로 여러 번 꺾는다(질주마다 최소 2번, 아래에서 중앙값 5번 이상).
      // 11-13: 11-08판 설정 그대로도 질주 200번 중 ~2%는 2번이었다 — 최소 3번은 특정 난수열에서만 성립했다.
      expect(peaks.length).toBeGreaterThanOrEqual(2)
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

  it('stays on screen far longer than the 11-07 straight dash (≈0.75s → ≈6.6s median at 390×844 after the 11-13 1.5x speed-up)', () => {
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
    // 11-08판(2.8u/s) 중앙값 ≈9.2초 → 11-13 속도 1.5배(4.2u/s)로 ≈6.6초(최소 ≈5초).
    expect(onScreen[0]).toBeGreaterThan(4)
    const median = onScreen[Math.floor(onScreen.length / 2)]
    expect(median).toBeGreaterThan(5.5)
    expect(median).toBeLessThan(7.5)
    expect(median / oldMaxSec).toBeGreaterThan(5)
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
    // 11-07판(무작위 가로 차선)은 가만히 선 로자리를 질주당 ≈14% 쳤다. 11-08판 ≈7%. 2배판 ≈22%, 지금(1.4배·속도 1.5배)
    // ≈5%(비키기 여유는 늘어난 반폭만큼 넓혔다). 여전히 정통으로 노리지는 않는다.
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
      // 판정박스는 차체 방향 OBB를 이번 step 이동만큼 늘린 상자 — 앞으로 달릴 땐 폭은 거의 그대로.
      expect(box.halfWidth).toBeGreaterThanOrEqual(SLTERA_HALF_WIDTH)
      expect(box.halfWidth).toBeLessThan(SLTERA_HALF_WIDTH + 0.02)
      expect(box.halfDepth).toBeGreaterThanOrEqual(SLTERA_HALF_LENGTH)
      expect(box.yaw).toBe(p.heading)
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

describe('Sltera obstacle physics (Terry 11-13: bounce back off obstacles, then change direction)', () => {
  // 직선 사선(지그재그·발작·떨림 없음) + 장애물. 튕긴 뒤 다시 까는 경로는 원래대로 지그재그다.
  function straightPassWith(obstacles, rand = seq([0.1, 0.1, 0.1, 0.9, 0.1])) {
    const pass = beginSlteraPass(createSlteraPass(), { bounds, obstacles, rand })
    pass.waypointCount = 0
    pass.jerkCount = 0
    pass.wobbleRad = 0
    return pass
  }
  const overlapsAny = (pass, obstacles) => obstacles.some((o) => getSlteraObstacleOverlap(pass, o) > 1e-6)

  it('is knocked back along its approach, then drives off in a new direction that no longer points into the obstacle', () => {
    const probe = straightPassWith([])
    // 사선 한가운데(화면 안)에 비스듬한 책상 하나.
    const desk = { x: (probe.entryX + probe.exitX) / 2, z: (probe.entryZ + probe.exitZ) / 2, halfX: 1.0, halfZ: 0.45, rotationY: 0.4 }
    const obstacles = [desk]
    const pass = straightPassWith(obstacles)
    let guard = 0
    while (pass.bounces === 0 && pass.phase !== SLTERA_PHASE.DONE && guard++ < 10_000) stepSlteraPass(pass, STEP_MS)
    expect(pass.bounces).toBe(1)
    const preHeading = pass.bounceFromHeading
    const preFx = Math.sin(preHeading); const preFz = Math.cos(preHeading)
    const nX = pass.contactNX; const nZ = pass.contactNZ
    expect(preFx * nX + preFz * nZ).toBeLessThan(0) // 장애물 쪽으로 달려들다 부딪혔다
    expect(overlapsAny(pass, obstacles)).toBe(false)
    const hitX = pass.x; const hitZ = pass.z
    // 튕김: 뒤로(부딪히기 전 진행 반대쪽으로) 짧게 밀리고 장애물에서 멀어진다. 밀리는 속도는 줄어든다.
    const pushes = []
    let px = pass.x; let pz = pass.z
    while (pass.bounceLeftSec > 0 && guard++ < 20_000) {
      stepSlteraPass(pass, STEP_MS)
      pushes.push(Math.hypot(pass.x - px, pass.z - pz))
      px = pass.x; pz = pass.z
      expect(overlapsAny(pass, obstacles)).toBe(false)
    }
    const backX = pass.x - hitX; const backZ = pass.z - hitZ
    const back = Math.hypot(backX, backZ)
    expect(back).toBeGreaterThan(0.4)
    expect(back).toBeLessThan(1.2) // ≈0.72u — 짧은 튕김
    expect((backX * preFx + backZ * preFz) / back).toBeLessThan(-0.9) // 진행 반대쪽으로
    expect(backX * nX + backZ * nZ).toBeGreaterThan(0) // 장애물에서 멀어지는 쪽
    expect(pushes.length).toBeGreaterThan(10)
    expect(pushes[pushes.length - 2]).toBeLessThan(pushes[0] * 0.25) // 줄어드는 튕김(마지막 프레임은 다시 달리기 시작분이 섞인다)
    expect(pushes.length * STEP_MS).toBeCloseTo(SLTERA_BOUNCE_SEC * 1000, -2)
    // 방향 전환: 새 사선은 부딪히기 전과 다르고, 장애물 면 바깥쪽을 본다.
    const newFx = Math.sin(pass.diagHeading); const newFz = Math.cos(pass.diagHeading)
    expect(Math.abs(wrap(pass.diagHeading - preHeading))).toBeGreaterThan(0.5)
    expect(newFx * nX + newFz * nZ).toBeGreaterThan(0.45) // 면 법선에서 60° 안
    expect(Math.abs(wrap(pass.heading - pass.diagHeading))).toBeLessThan(0.35) // 차체도 새 방향을 본다
    expect(pass.waypointCount).toBeGreaterThan(0) // 새 방향으로 다시 지그재그
    // 이어서 달려 화면 밖에서 끝난다 — 다시 같은 책상에 박히지 않는다.
    runPass(pass, (p) => expect(overlapsAny(p, obstacles)).toBe(false))
    expect(pass.phase).toBe(SLTERA_PHASE.DONE)
    expect(pass.bounces).toBe(1)
    expect(isSlteraPointOnScreen(bounds, pass.x, pass.z, -SLTERA_OFFSCREEN_PAD)).toBe(false)
  })

  it('never ends up inside an obstacle and always finishes, across many passes through a cluttered room', () => {
    // 세로 화면 안에 책상·사물함 같은 상자 14개(일부 회전). 무작위 질주 300번, 60fps와 20fps를 섞는다.
    const rand = lcg(1313)
    const obstacles = []
    for (let i = 0; i < 14; i += 1) {
      obstacles.push({
        x: lerpTest(bounds.minX + 1, bounds.maxX - 1, rand()),
        z: lerpTest(bounds.minZ + 1.5, bounds.maxZ - 1.5, rand()),
        halfX: lerpTest(0.3, 1.2, rand()),
        halfZ: lerpTest(0.25, 0.6, rand()),
        rotationY: rand() < 0.5 ? 0 : lerpTest(-0.8, 0.8, rand()),
      })
    }
    let bounced = 0; let brokeThrough = 0; let solidSteps = 0; let maxBounces = 0; let inside = 0
    for (let k = 0; k < 300; k += 1) {
      const pass = beginSlteraPass(createSlteraPass(), { bounds, playerX: 0, playerZ: 0, obstacles, rand })
      const dt = k % 3 === 0 ? 50 : STEP_MS
      let steps = 0
      for (; steps < 20_000 && pass.phase !== SLTERA_PHASE.DONE; steps += 1) {
        stepSlteraPass(pass, dt, 0, 0)
        if (pass.solid) {
          solidSteps += 1
          for (const o of obstacles) if (getSlteraObstacleOverlap(pass, o) >= 1e-6) inside += 1
        }
      }
      expect(pass.phase).toBe(SLTERA_PHASE.DONE)
      expect(Number.isFinite(pass.x) && Number.isFinite(pass.z)).toBe(true)
      expect(pass.bounces).toBeLessThanOrEqual(SLTERA_MAX_BOUNCES)
      if (pass.bounces > 0) bounced += 1
      if (pass.brokeThrough) brokeThrough += 1
      maxBounces = Math.max(maxBounces, pass.bounces)
    }
    expect(inside).toBe(0)
    expect(solidSteps).toBeGreaterThan(10_000)
    expect(bounced).toBeGreaterThan(100) // 이 방에서는 대부분의 질주가 한 번 이상 튕긴다
    expect(brokeThrough / 300).toBeLessThan(0.15) // 끼임 안전장치(조기 탈출 포함)는 드물게만
  })

  it('does not collide while still off screen (props just outside the view cannot swallow a pass)', () => {
    const probe = straightPassWith([])
    // 출발 지점 바로 앞(아직 화면 밖)에 상자 — 화면에 들어와 겹침이 풀릴 때까지 통과한다.
    const block = { x: probe.entryX + probe.dirX * 0.5, z: probe.entryZ + probe.dirZ * 0.5, halfX: 0.6, halfZ: 0.6, rotationY: 0 }
    const pass = straightPassWith([block])
    let sawVisible = false
    runPass(pass, (p) => { if (isSlteraPointOnScreen(bounds, p.x, p.z)) sawVisible = true })
    expect(sawVisible).toBe(true)
    expect(pass.bounces).toBe(0)
  })

  it('on the real Stage 1-6 props: never sits inside a prop while solid, always finishes, rarely needs the stuck escape', () => {
    const rand = lcg(2611)
    for (const stageId of PROP_STAGE_IDS) {
      const obstacles = getStageObjectSightObstacles(stageId)
      expect(obstacles.length).toBeGreaterThan(0)
      const xs = obstacles.map((o) => o.x); const zs = obstacles.map((o) => o.z)
      const minX = Math.min(...xs); const maxX = Math.max(...xs); const minZ = Math.min(...zs); const maxZ = Math.max(...zs)
      let brokeThrough = 0; let bounced = 0; let inside = 0
      const N = 60
      for (let k = 0; k < N; k += 1) {
        // 카메라가 따라가는 로자리 자리(프랍 위는 피한다)를 중심으로 세로 화면을 잡는다.
        let px = 0; let pz = 0
        for (let t = 0; t < 30; t += 1) {
          px = lerpTest(minX, maxX, rand()); pz = lerpTest(minZ, maxZ, rand())
          if (!obstacles.some((o) => Math.abs(px - o.x) < o.halfX + 0.4 && Math.abs(pz - o.z) < o.halfZ + 0.4)) break
        }
        const view = { minX: px + bounds.minX, maxX: px + bounds.maxX, minZ: pz + bounds.minZ, maxZ: pz + bounds.maxZ }
        const pass = beginSlteraPass(createSlteraPass(), { bounds: view, playerX: px, playerZ: pz, obstacles, rand })
        for (let steps = 0; steps < 5_000 && pass.phase !== SLTERA_PHASE.DONE; steps += 1) {
          stepSlteraPass(pass, STEP_MS, px, pz)
          if (pass.solid) for (const o of obstacles) if (getSlteraObstacleOverlap(pass, o) >= 1e-6) inside += 1
        }
        expect(pass.phase).toBe(SLTERA_PHASE.DONE)
        if (pass.brokeThrough) brokeThrough += 1
        if (pass.bounces > 0) bounced += 1
      }
      expect(inside).toBe(0)
      expect(bounced).toBeGreaterThan(N * 0.3) // 실제 교실·복도·체육관·급식실·교무실·운동장에서 부딪혀 튕긴다
      // 교무실(S5) 책상 섬 사이 통로(≈2.2u)는 1.73u 차체에도 넉넉하지 않아 가끔 끼임 안전장치로 뚫고 나간다.
      // 끼임 조기 탈출(같은 자리 세 번째 튕김·1.2초 제자리)도 뚫고 나가기로 센다.
      expect(brokeThrough / N).toBeLessThan(stageId === 'stage5' ? 0.25 : 0.12)
    }
  })

  it('on the real Stage 1-6 props: never ends while still visible, and every run fits the Matilda-warning clear window', () => {
    // balanceqa 11-13: 화면 가장자리에서 튕긴 뒤 경로가 1.5u로 잘려 화면 안에서 끝나(사라져) 버리던 회귀.
    // 차 귀퉁이까지 ≈0.97u — 끝날 때 차 중심이 화면에서 그보다 밖이어야 차 전체가 안 보인다.
    const corner = Math.hypot(SLTERA_HALF_LENGTH, SLTERA_HALF_WIDTH)
    expect(corner).toBeCloseTo(0.97, 2)
    const rand = lcg(777)
    let maxRunMs = 0
    for (const stageId of PROP_STAGE_IDS) {
      const obstacles = getStageObjectSightObstacles(stageId)
      const xs = obstacles.map((o) => o.x); const zs = obstacles.map((o) => o.z)
      const minX = Math.min(...xs); const maxX = Math.max(...xs); const minZ = Math.min(...zs); const maxZ = Math.max(...zs)
      let visibleEnds = 0
      for (let k = 0; k < 200; k += 1) {
        let px = 0; let pz = 0
        for (let t = 0; t < 30; t += 1) {
          px = lerpTest(minX, maxX, rand()); pz = lerpTest(minZ, maxZ, rand())
          if (!obstacles.some((o) => Math.abs(px - o.x) < o.halfX + 0.4 && Math.abs(pz - o.z) < o.halfZ + 0.4)) break
        }
        const view = { minX: px + bounds.minX, maxX: px + bounds.maxX, minZ: pz + bounds.minZ, maxZ: pz + bounds.maxZ }
        const pass = beginSlteraPass(createSlteraPass(), { bounds: view, playerX: px, playerZ: pz, obstacles, rand })
        const dt = k % 4 === 0 ? 50 : STEP_MS
        for (let steps = 0; steps < 5_000 && pass.phase !== SLTERA_PHASE.DONE; steps += 1) stepSlteraPass(pass, dt, px, pz)
        expect(pass.phase).toBe(SLTERA_PHASE.DONE)
        if (isSlteraPointOnScreen(view, pass.x, pass.z, -corner)) visibleEnds += 1
        maxRunMs = Math.max(maxRunMs, pass.elapsedMs)
      }
      expect(visibleEnds).toBe(0)
    }
    expect(maxRunMs).toBeLessThan(SLTERA_DEADLINE_CLEAR_MS)
    expect(SLTERA_EXIT_MODE_SEC * 1000).toBeLessThan(SLTERA_DEADLINE_CLEAR_MS)
  })

  it('never circles in place: Stage 6 props and a desk corridor/pocket narrower than the car (Terry 11-13 live report)', () => {
    // 라이브: "책상 사이에 끼어서 제자리만 맴돌다가 사라진다". 반경 1u 안 튕김 수, 화면 안 반경 1u 체류 시간,
    // 끝 위치(차 전체가 화면 밖)를 질주마다 본다.
    const corner = Math.hypot(SLTERA_HALF_LENGTH, SLTERA_HALF_WIDTH)
    const gap = 1.3 // 차 폭 0.89u < 통로 1.3u < 차 길이 1.73u
    expect(gap).toBeLessThan(SLTERA_HALF_LENGTH * 2)
    expect(gap).toBeGreaterThan(SLTERA_HALF_WIDTH * 2)
    const rand = lcg(6606)
    const stage6 = getStageObjectSightObstacles('stage6')
    let escaped = 0
    const runs = []
    for (let k = 0; k < 240; k += 1) {
      const scene = k % 3 // 0: 사선 위 좁은 통로, 1: 끝이 막힌 좁은 주머니, 2: 운동장(S6) 프랍
      const pass = beginSlteraPass(createSlteraPass(), { bounds, playerX: 0, playerZ: 0, obstacles: stage6, rand })
      let view = bounds
      if (scene === 2) {
        const o = stage6[k % stage6.length]
        view = { minX: o.x + bounds.minX, maxX: o.x + bounds.maxX, minZ: o.z + bounds.minZ, maxZ: o.z + bounds.maxZ }
        beginSlteraPass(pass, { bounds: view, playerX: o.x, playerZ: o.z, obstacles: stage6, rand })
      } else {
        // 화면 가운데를 지나는 사선을 따라 양쪽 벽(길이 7u) — 지그재그 차가 통로 안에서 계속 벽에 닿는다.
        const a = pass.diagHeading
        const nX = Math.cos(a); const nZ = -Math.sin(a)
        const midU = pass.length / 2
        const cX = pass.entryX + pass.dirX * midU; const cZ = pass.entryZ + pass.dirZ * midU
        const walls = [-1, 1].map((side) => ({
          x: cX + nX * side * (gap / 2 + 0.3), z: cZ + nZ * side * (gap / 2 + 0.3), halfX: 0.3, halfZ: 3.5, rotationY: a,
        }))
        if (scene === 1) walls.push({ x: cX + pass.dirX * 3.8, z: cZ + pass.dirZ * 3.8, halfX: gap / 2 + 0.6, halfZ: 0.3, rotationY: a })
        pass.obstacles = walls
      }
      const at = []
      let prevBounces = 0
      let anchorX = pass.x; let anchorZ = pass.z; let anchorMs = 0; let maxDwellMs = 0
      for (let steps = 0; steps < 5_000 && pass.phase !== SLTERA_PHASE.DONE; steps += 1) {
        stepSlteraPass(pass, STEP_MS, 0, 0)
        if (pass.bounces > prevBounces) { at.push([pass.x, pass.z]); prevBounces = pass.bounces }
        if (isSlteraPointOnScreen(view, pass.x, pass.z) && Math.hypot(pass.x - anchorX, pass.z - anchorZ) <= 1) {
          maxDwellMs = Math.max(maxDwellMs, pass.elapsedMs - anchorMs)
        } else { anchorX = pass.x; anchorZ = pass.z; anchorMs = pass.elapsedMs }
      }
      const maxNear = Math.max(0, ...at.map(([x, z]) => at.filter(([u, v]) => Math.hypot(u - x, v - z) <= 1).length))
      runs.push({ scene, maxNear, maxDwellMs, done: pass.phase === SLTERA_PHASE.DONE, visibleEnd: isSlteraPointOnScreen(view, pass.x, pass.z, -corner) })
      if (pass.brokeThrough && pass.exiting) escaped += 1
    }
    for (const r of runs) {
      expect(r.done).toBe(true)
      expect(r.visibleEnd).toBe(false) // 화면 안에서 사라지지 않는다
      expect(r.maxNear).toBeLessThanOrEqual(3) // 같은 자리에서 핀볼처럼 계속 튀지 않는다
      expect(r.maxDwellMs).toBeLessThan(2_500) // 반경 1u 안에 2.5초 넘게 머무르지 않는다(계속 나아간다)
    }
    expect(runs.some((r) => r.scene !== 2 && r.maxNear >= 2)).toBe(true) // 통로·주머니에서 실제로 끼일 뻔했다
    expect(escaped).toBeGreaterThan(0) // 끼임 탈출이 실제로 일어났다
  })

  it('is wired: SlteraEvent hands the stage prop obstacles and Rosari position to the car', () => {
    const src = readFileSync(new URL('../components/SlteraEvent.jsx', import.meta.url), 'utf8')
    expect(src).toContain('obstacles: getStageObjectSightObstacles(stageId)')
    expect(src).toContain('stepSlteraPass(pass, delta * 1000, playerPos.x, playerPos.z)')
  })
})

function lerpTest(a, b, t) { return a + (b - a) * t }
// 슬테라 질주 스테이지(S1~S5) + 운동장(S6) 프랍 — S6은 지금 질주 대상이 아니지만 라이브 '끼임' 보고 대비로 함께 본다.
const PROP_STAGE_IDS = Object.freeze([...SLTERA_STAGE_IDS, 'stage6'])
