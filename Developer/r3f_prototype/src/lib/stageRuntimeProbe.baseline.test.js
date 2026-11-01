// 기준선(감독·Sltera 없음, 현재 게임) 측정 하네스. 평소 테스트 실행에서는 건너뛴다.
//
// 실행(한 작업씩, 워커 1개):
//   EZS_PROBE_TASK=<task> EZS_PROBE_OUT=<dir> npx vitest run --maxWorkers=1 --no-file-parallelism src/lib/stageRuntimeProbe.baseline.test.js
// task:
//   grid    — REF_BUILD_V1 보정 탐색. EZS_PROBE_M="0.6,0.8,1" 배수 × EZS_PROBE_SEEDS(기본 10)시드 × KITE 6변형
//   kite    — KITE 6변형 × 100시드 클리어율(실제 HP, rush). EZS_PROBE_MMAP='{"stage1":0.9}'로 배수 덮어쓰기(보정 확인용)
//   dodge   — KITE_DODGE(반경 4u, 시드마다 방향 교대) × 100시드 클리어율
//   immortal— 불사 기록 모드 받은 피해(T-P5). KITE 변형을 시드마다 돌려 100시드, 포탈 거부·240s까지
//   refuse  — PORTAL_REFUSE(실제 HP, 420s). KITE(변형 순환)·KITE_DODGE 각 100시드 (E1~E3 기준선)
// EZS_PROBE_STAGES="stage1,stage2"로 스테이지를 좁힐 수 있다. 결과는 스테이지마다 JSON으로 바로 쓴다(중간에 끊겨도 남는다).
import { describe, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { damageInWindow, runStageRuntimeProbe } from './stageRuntimeProbe.js'
import { botSpecLabel, kiteVariantSpecs, PORTAL_MODE_REFUSE } from './balanceProbeBots.js'

const TASK = process.env.EZS_PROBE_TASK
const OUT = process.env.EZS_PROBE_OUT
const STAGES = (process.env.EZS_PROBE_STAGES || 'stage1,stage2,stage3,stage4,stage5').split(',').filter(Boolean)
export const BASELINE_SEED_START = 10001
export const BASELINE_SEED_COUNT = 100
export const CALIBRATION_SEED_START = 20001

function compact(result, label, extra = {}) {
  return {
    seed: result.seed,
    bot: label,
    cleared: result.cleared,
    clearSec: result.clearSec,
    died: result.died,
    deathSec: result.deathSec,
    deathCause: result.deathCause,
    survivedSec: result.survivedSec,
    damageTotal: result.damageTotal,
    damage0to180: damageInWindow(result, 0, 180),
    damage180to210: damageInWindow(result, 180, 210),
    damage180to240: damageInWindow(result, 180, 240),
    alive210: result.alive210,
    spawnClockAt210: result.spawnClockAt210,
    spawnHpByBin: result.spawnHpByBin,
    damageBySource: result.damageBySource,
    damageByBin: result.damageByBin,
    level: result.level,
    levelAt: result.levelAt,
    kills: result.kills,
    spawnCount: result.spawnCount,
    spawnCountBySource: result.spawnCountBySource,
    spawnHash: result.spawnHash,
    maxActiveProjectiles: result.maxActiveProjectiles,
    maxActiveEnemies: result.maxActiveEnemies,
    matildaLethalContacts: result.matildaLethalContacts,
    ...extra,
  }
}

function seeds(start, count) {
  return Array.from({ length: count }, (_, i) => start + i)
}

function write(name, payload) {
  mkdirSync(OUT, { recursive: true })
  writeFileSync(join(OUT, name), JSON.stringify(payload))
}

const TASKS = {
  grid(stageId) {
    const multipliers = (process.env.EZS_PROBE_M || '0.6,0.8,1,1.25,1.6').split(',').map(Number)
    const seedList = seeds(CALIBRATION_SEED_START, Number(process.env.EZS_PROBE_SEEDS || 10))
    const rows = []
    for (const m of multipliers) {
      for (const seed of seedList) {
        for (const spec of kiteVariantSpecs()) {
          const r = runStageRuntimeProbe({ stageId, seed, bot: spec, startDamageMultiplierOverride: m })
          rows.push({ m, seed, bot: botSpecLabel(spec), cleared: r.cleared, deathSec: r.deathSec, deathCause: r.deathCause })
        }
      }
      write(`grid_${stageId}.json`, rows)
    }
  },
  kite(stageId) {
    const mmap = process.env.EZS_PROBE_MMAP ? JSON.parse(process.env.EZS_PROBE_MMAP) : {}
    const override = mmap[stageId] ?? null
    const rows = []
    for (const seed of seeds(BASELINE_SEED_START, BASELINE_SEED_COUNT)) {
      for (const spec of kiteVariantSpecs()) {
        const r = runStageRuntimeProbe({ stageId, seed, bot: spec, startDamageMultiplierOverride: override })
        rows.push(compact(r, botSpecLabel(spec), { m: override }))
      }
      if (seed % 10 === 0) write(`kite_${stageId}.json`, rows)
    }
    write(`kite_${stageId}.json`, rows)
  },
  dodge(stageId) {
    const rows = []
    for (const seed of seeds(BASELINE_SEED_START, BASELINE_SEED_COUNT)) {
      const spec = { kind: 'KITE_DODGE', radius: 4, direction: seed % 2 ? 1 : -1 }
      rows.push(compact(runStageRuntimeProbe({ stageId, seed, bot: spec }), botSpecLabel(spec)))
    }
    write(`dodge_${stageId}.json`, rows)
  },
  immortal(stageId) {
    const variants = kiteVariantSpecs()
    const rows = []
    for (const seed of seeds(BASELINE_SEED_START, BASELINE_SEED_COUNT)) {
      const spec = { ...variants[seed % variants.length], portalMode: PORTAL_MODE_REFUSE }
      rows.push(compact(runStageRuntimeProbe({ stageId, seed, bot: spec, immortal: true, maxSec: 240 }), botSpecLabel(spec)))
      if (seed % 10 === 0) write(`immortal_${stageId}.json`, rows)
    }
    write(`immortal_${stageId}.json`, rows)
  },
  refuse(stageId) {
    const variants = kiteVariantSpecs()
    const rows = []
    for (const seed of seeds(BASELINE_SEED_START, BASELINE_SEED_COUNT)) {
      const kite = { ...variants[seed % variants.length], portalMode: PORTAL_MODE_REFUSE }
      const dodge = { kind: 'KITE_DODGE', radius: 4, direction: seed % 2 ? 1 : -1, portalMode: PORTAL_MODE_REFUSE }
      for (const spec of [kite, dodge]) {
        rows.push(compact(runStageRuntimeProbe({ stageId, seed, bot: spec, maxSec: 420 }), `${botSpecLabel(spec)}_refuse`))
      }
      if (seed % 10 === 0) write(`refuse_${stageId}.json`, rows)
    }
    write(`refuse_${stageId}.json`, rows)
  },
}

describe.skipIf(!TASK || !OUT)('기준선 측정(환경변수 게이트)', () => {
  for (const stageId of STAGES) {
    it(`${TASK} ${stageId}`, () => {
      const task = TASKS[TASK]
      if (!task) throw new Error(`unknown EZS_PROBE_TASK ${TASK}`)
      task(stageId)
    }, 6 * 60 * 60 * 1000)
  }
})
