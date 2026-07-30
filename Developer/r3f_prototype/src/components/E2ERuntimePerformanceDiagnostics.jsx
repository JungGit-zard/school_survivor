import { useEffect, useState } from 'react'
import { isE2EPerformanceDiagnostics } from '../lib/e2eAuth.js'
import { createE2EPerformanceResult, getE2EPerformanceDurationSeconds } from '../lib/e2eRuntimePerformance.js'
import { STAGE_ENTRY_METRIC_EVENT } from '../lib/stageEntryMetrics.js'

// This is deliberately DOM/RAF/listener-free unless the strict DEV E2E gate is
// active. Frame samples stay in local variables; React renders once on finish.
export default function E2ERuntimePerformanceDiagnostics({ enabled = isE2EPerformanceDiagnostics(), canvasRootRef }) {
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState(enabled ? 'running' : 'disabled')

  useEffect(() => {
    if (!enabled) return undefined

    const durationMs = getE2EPerformanceDurationSeconds(window.location.search) * 1000
    const startedAt = performance.now()
    const intervals = []
    const visibilityTransitions = []
    let previousFrameAt = null
    let rafId = 0
    let canvas = null
    let stageEntryMetric = null
    let webglContextLostCount = 0
    let completed = false

    const onContextLost = () => { webglContextLostCount += 1 }
    const findCanvas = () => {
      if (canvas) return canvas
      canvas = canvasRootRef?.current?.querySelector?.('canvas') || null
      canvas?.addEventListener('webglcontextlost', onContextLost)
      return canvas
    }
    const onStageEntryMetric = (event) => { stageEntryMetric = event.detail || null }
    const onVisibilityChange = () => {
      const hidden = document.hidden || document.visibilityState === 'hidden'
      visibilityTransitions.push({ atMs: performance.now() - startedAt, state: hidden ? 'hidden' : 'visible' })
      previousFrameAt = null
    }
    const finish = (endedAt) => {
      if (completed) return
      completed = true
      setResult(createE2EPerformanceResult({
        startedAt,
        endedAt,
        intervals,
        visibilityTransitions,
        webglContextLostCount,
        canvas: findCanvas(),
        stageEntryMetric,
      }))
      setStatus('complete')
    }
    const sample = (now) => {
      findCanvas()
      const hidden = document.hidden || document.visibilityState === 'hidden'
      if (!hidden && previousFrameAt !== null) intervals.push(now - previousFrameAt)
      previousFrameAt = hidden ? null : now
      if (now - startedAt >= durationMs) {
        finish(now)
        return
      }
      rafId = requestAnimationFrame(sample)
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener(STAGE_ENTRY_METRIC_EVENT, onStageEntryMetric)
    rafId = requestAnimationFrame(sample)
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener(STAGE_ENTRY_METRIC_EVENT, onStageEntryMetric)
      canvas?.removeEventListener('webglcontextlost', onContextLost)
    }
  }, [canvasRootRef, enabled])

  if (!enabled) return null
  return (
    <section aria-live="off" style={styles.hidden}>
      <output data-testid="e2e-runtime-performance-status">{status}</output>
      <pre data-testid="e2e-runtime-performance-json">{result ? JSON.stringify(result) : ''}</pre>
    </section>
  )
}

const styles = {
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
}
