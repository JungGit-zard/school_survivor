import { useEffect, useState } from 'react'
import { isE2EAudioDiagnostics } from '../lib/e2eAuth.js'
import { buildFailureResult, getAudioDiagnosticCatalog, runAudioDiagnostics, validateAudioDiagnosticCatalog } from '../lib/audioDiagnostics.js'

export default function AudioDiagnostics({ enabled = isE2EAudioDiagnostics() }) {
  const [status, setStatus] = useState(enabled ? 'starting' : 'disabled')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!enabled) return undefined

    const controller = new AbortController()
    const catalog = getAudioDiagnosticCatalog()
    const catalogValidation = validateAudioDiagnosticCatalog(catalog)
    let context = null
    let disposed = false

    const run = async () => {
      try {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext
        if (!AudioContextConstructor) throw new Error('Web Audio AudioContext is unavailable.')
        context = new AudioContextConstructor()
        const next = await runAudioDiagnostics({
          catalog,
          audioContext: context,
          signal: controller.signal,
          onProgress: ({ completed, total }) => {
            if (!disposed) setStatus(`decoding ${completed}/${total}`)
          },
        })
        if (!disposed) {
          setResult(next)
          setStatus(next.status)
        }
      } catch (error) {
        if (controller.signal.aborted) return
        const next = buildFailureResult(catalog, catalogValidation, error)
        if (!disposed) {
          setResult(next)
          setStatus(next.status)
        }
      } finally {
        if (context?.close) await context.close().catch(() => {})
      }
    }

    void run()
    return () => {
      disposed = true
      controller.abort()
      void context?.close?.().catch(() => {})
    }
  }, [enabled])

  return (
    <main style={styles.root}>
      <section style={styles.panel} aria-live="polite">
        <h1 style={styles.heading}>E2E browser audio decode diagnostics</h1>
        <p data-testid="audio-diagnostics-status" style={styles.status}>{status}</p>
        <p style={styles.note}>Decode-only measurement: duration, channels, sample rate, PCM sample peak/RMS, dBFS, and decoded-sample overs. No playback, LUFS, or true-peak claim.</p>
        <pre data-testid="audio-diagnostics-json" style={styles.json}>{result ? JSON.stringify(result) : ''}</pre>
      </section>
    </main>
  )
}

const styles = {
  root: {
    width: '100vw',
    minHeight: '100vh',
    boxSizing: 'border-box',
    padding: 24,
    background: '#101820',
    color: '#eef6ff',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  panel: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: 20,
    border: '1px solid #5a7b98',
    borderRadius: 8,
    background: '#172532',
  },
  heading: { margin: '0 0 12px', fontSize: 20 },
  status: { margin: '0 0 12px', color: '#9fe6a0', fontWeight: 700 },
  note: { margin: '0 0 16px', color: '#c4d8e8', lineHeight: 1.5 },
  json: { margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12, lineHeight: 1.5 },
}
