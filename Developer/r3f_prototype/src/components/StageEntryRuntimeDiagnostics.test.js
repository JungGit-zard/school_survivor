import { describe, expect, it, vi } from 'vitest'
import {
  STAGE_ENTRY_WARMUP_MAX_HOLD_MS, STAGE_ENTRY_WARMUP_MAX_PASSES, isStageEntryWarmupPending, runStageEntryWarmup,
} from './StageEntryRuntimeDiagnostics.jsx'

// 가짜 렌더러: compileAsync 한 번마다 programs에 add개를 더한다.
function fakeGl(adds) {
  const programs = []
  let call = 0
  return {
    info: { programs },
    calls: () => call,
    compileAsync: vi.fn(async () => { for (let i = 0; i < (adds[call] ?? 0); i += 1) programs.push({}); call += 1 }),
  }
}

describe('stage-entry shader warm-up', () => {
  it('is pending for a gameKey until its warm-up finished', () => {
    expect(isStageEntryWarmupPending(123456)).toBe(true)
  })

  it('repeats compileAsync until a pass creates no new program (late Suspense children)', async () => {
    const gl = fakeGl([40, 3, 0, 9])
    await expect(runStageEntryWarmup({ gl, scene: {}, camera: {}, isCancelled: () => false })).resolves.toBe('compiled')
    expect(gl.calls()).toBe(3)
  })

  it('a warm cache (restart) releases after one pass', async () => {
    const gl = fakeGl([0])
    await runStageEntryWarmup({ gl, scene: {}, camera: {}, isCancelled: () => false })
    expect(gl.calls()).toBe(1)
  })

  it('never holds forever: pass cap and time cap', async () => {
    const gl = fakeGl(Array(50).fill(1))
    await runStageEntryWarmup({ gl, scene: {}, camera: {}, isCancelled: () => false })
    expect(gl.calls()).toBe(STAGE_ENTRY_WARMUP_MAX_PASSES)
    // compileAsync가 끝나지 않아도(컨텍스트 손실 등) 남은 시간이 지나면 timeout으로 풀어 준다.
    const hung = { info: { programs: [] }, compileAsync: () => new Promise(() => {}) }
    let first = true
    const now = () => { if (first) { first = false; return 0 } return STAGE_ENTRY_WARMUP_MAX_HOLD_MS - 5 }
    await expect(runStageEntryWarmup({ gl: hung, scene: {}, camera: {}, isCancelled: () => false, now })).resolves.toBe('timeout')
  })
})
