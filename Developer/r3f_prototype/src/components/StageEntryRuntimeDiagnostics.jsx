import { useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore.js'
import { createStageEntryMetric, markStageEntryStart, publishStageEntryMetric } from '../lib/stageEntryMetrics.js'

// A Canvas-local, one-shot warmup.  It deliberately runs only after the real
// scene mounts, so compilation/upload work is shared with gameplay's WebGL
// context instead of constructing a throwaway lobby Canvas.
export default function StageEntryRuntimeDiagnostics({ gameKey }) {
  const { gl, scene, camera } = useThree()
  // Canvas is intentionally retained across a run reset, but Physics mounts a
  // fresh scene subtree.  Warm each gameKey once, including the new subtree.
  const lastWarmupGameKeyRef = useRef(null)

  useLayoutEffect(() => {
    if (lastWarmupGameKeyRef.current === gameKey) return undefined
    lastWarmupGameKeyRef.current = gameKey
    const devMetricsEnabled = import.meta.env.DEV
    const names = devMetricsEnabled ? markStageEntryStart(gameKey) : null
    let cancelled = false
    let publishFrame = 0
    const publish = (compileStatus) => {
      if (!devMetricsEnabled) return
      // Compile starts synchronously below.  Metrics wait one frame so renderer
      // info reflects the completed warm-up without delaying the warm-up itself.
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

    try {
      if (typeof gl.compileAsync === 'function') {
        // Start immediately in the real gameplay Canvas: no lobby WebGL context,
        // no delay that could collide with the first wave.
        gl.compileAsync(scene, camera).then(() => publish('compiled')).catch(() => publish('failed'))
      } else if (typeof gl.compile === 'function') {
        gl.compile(scene, camera)
        publish('compiled-sync')
      } else {
        publish('unsupported')
      }
    } catch {
      publish('failed')
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(publishFrame)
    }
  }, [camera, gameKey, gl, scene])

  return null
}
