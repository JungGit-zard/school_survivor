import { useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore.js'
import { createStageEntryMetric, markStageEntryStart, publishStageEntryMetric } from '../lib/stageEntryMetrics.js'

// 스테이지 진입 셰이더 예열이 끝난 gameKey. GameCanvas는 이 값이 지금 gameKey가 아닐 동안 프레임 루프를
// 멈추고('never') 로딩 화면을 덮는다. 예열 전에 첫 렌더가 돌면 three가 링크가 안 끝난 프로그램마다
// getProgramInfoLog/getProgramParameter에서 동기로 기다려 화면이 수 초 멈췄다(2026-11-17 실측 2.3~2.7초).
let warmedGameKey = null
const warmupListeners = new Set()

export function subscribeStageEntryWarmup(listener) {
  warmupListeners.add(listener)
  return () => warmupListeners.delete(listener)
}

export function isStageEntryWarmupPending(gameKey) {
  return warmedGameKey !== gameKey
}

function markStageEntryWarmed(gameKey) {
  warmedGameKey = gameKey
  warmupListeners.forEach((listener) => listener())
}

// 늦게 붙는 Suspense 자식(GLB 로드 후 마운트)까지 잡도록 새 프로그램이 안 생길 때까지 몇 번 더 돈다.
// 어느 경우에도 영원히 붙잡지 않는다: 패스 수·전체 시간 상한을 넘으면 그대로 게임을 시작한다(fail-open).
export const STAGE_ENTRY_WARMUP_MAX_PASSES = 6
export const STAGE_ENTRY_WARMUP_MAX_HOLD_MS = 10000
export const STAGE_ENTRY_WARMUP_PASS_GAP_MS = 50

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

function compileOnce(gl, scene, camera) {
  if (typeof gl.compileAsync === 'function') return gl.compileAsync(scene, camera).then(() => 'compiled')
  if (typeof gl.compile === 'function') {
    gl.compile(scene, camera)
    return Promise.resolve('compiled-sync')
  }
  return Promise.resolve('unsupported')
}

// 새 프로그램이 0개인 패스가 나오면 끝. 반환값 = 마지막 상태(지표용).
export async function runStageEntryWarmup({ gl, scene, camera, isCancelled, now = () => performance.now() }) {
  const startedAt = now()
  let status = 'unsupported'
  for (let pass = 0; pass < STAGE_ENTRY_WARMUP_MAX_PASSES; pass += 1) {
    const before = gl.info?.programs?.length ?? 0
    const remainingMs = STAGE_ENTRY_WARMUP_MAX_HOLD_MS - (now() - startedAt)
    if (remainingMs <= 0) return 'timeout'
    try {
      status = await Promise.race([compileOnce(gl, scene, camera), wait(remainingMs).then(() => 'timeout')])
    } catch {
      return 'failed'
    }
    if (isCancelled() || status === 'timeout' || status === 'unsupported') return status
    const created = (gl.info?.programs?.length ?? 0) - before
    if (created <= 0) return status
    await wait(STAGE_ENTRY_WARMUP_PASS_GAP_MS)
    if (isCancelled()) return status
  }
  return status
}

// A Canvas-local, one-shot warmup.  It deliberately runs only after the real
// scene mounts, so compilation/upload work is shared with gameplay's WebGL
// context instead of constructing a throwaway lobby Canvas.  The real lights
// are already mounted here, so programs compiled now are the ones the first
// render uses; GameCanvas keeps the frame loop stopped until this resolves.
export default function StageEntryRuntimeDiagnostics({ gameKey }) {
  const { gl, scene, camera } = useThree()
  // Canvas is intentionally retained across a run reset, but Physics mounts a
  // fresh scene subtree.  Warm each gameKey once, including the new subtree.
  const lastWarmupGameKeyRef = useRef(null)

  useLayoutEffect(() => {
    if (lastWarmupGameKeyRef.current === gameKey) return undefined
    lastWarmupGameKeyRef.current = gameKey
    // 배포 빌드에서는 프로그램마다 링크 로그를 읽는 동기 대기를 하지 않는다(개발 빌드는 셰이더 오류를 계속 보여 준다).
    if (!import.meta.env.DEV && gl.debug) gl.debug.checkShaderErrors = false
    const devMetricsEnabled = import.meta.env.DEV
    const names = devMetricsEnabled ? markStageEntryStart(gameKey) : null
    let cancelled = false
    let finished = false
    let publishFrame = 0
    const publish = (compileStatus) => {
      if (!devMetricsEnabled) return
      // Metrics wait one frame so renderer info reflects the completed warm-up
      // without delaying the warm-up itself.
      publishFrame = requestAnimationFrame(() => {
        if (cancelled) return
        const stageId = useGameStore.getState().currentStageId
        publishStageEntryMetric(createStageEntryMetric({
          gameKey,
          stageId,
          info: gl.info,
          compileStatus,
        }), names)
      })
    }

    // Start immediately in the real gameplay Canvas: no lobby WebGL context,
    // no delay that could collide with the first wave.  gl.compileAsync(scene, camera)
    // (or gl.compile(scene, camera) without it) runs inside runStageEntryWarmup.
    runStageEntryWarmup({ gl, scene, camera, isCancelled: () => cancelled })
      .then((status) => {
        if (cancelled) return
        finished = true
        markStageEntryWarmed(gameKey)
        publish(status)
      })

    return () => {
      cancelled = true
      // 예열 도중 정리되면(재마운트) 다음 마운트가 다시 예열하도록 표시를 되돌린다.
      if (!finished) lastWarmupGameKeyRef.current = null
      cancelAnimationFrame(publishFrame)
    }
  }, [camera, gameKey, gl, scene])

  return null
}
