import { useCallback, useEffect, useRef, useState } from 'react'

// Frame callbacks only update the pending scalar/list reference. React gets at
// most one commit on the next animation frame, outside the simulation tick.
//
// The returned ref always holds the LATEST requested list (pending or committed),
// never just the last committed one. R3F 8 requests its next loop frame before
// running useFrame callbacks, so a flush queued in frame N runs only after frame
// N+1's callbacks. When the ref lagged at the committed list, a fire in frame N+1
// rebuilt from it and resurrected items removed in frame N — a pencil that had
// spent its last hit came back with hitsLeft 0 and froze on screen forever
// (2026-11-13 pencil afterimage bug).
export function useDeferredProjectileState() {
  const [items, commitItems] = useState([])
  const latestRef = useRef(items)
  const pendingRef = useRef(null)
  const rafRef = useRef(0)

  const flush = useCallback(() => {
    rafRef.current = 0
    if (!pendingRef.current) return
    const next = pendingRef.current
    pendingRef.current = null
    commitItems(next)
  }, [])

  const request = useCallback((next) => {
    latestRef.current = next
    pendingRef.current = next
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(flush)
  }, [flush])

  const remove = useCallback((id) => {
    request(latestRef.current.filter((item) => item.id !== id))
  }, [request])

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  return [items, latestRef, request, remove]
}
