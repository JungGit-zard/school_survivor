import { useCallback, useEffect, useRef, useState } from 'react'

// Frame callbacks only update the pending scalar/list reference. React gets at
// most one commit on the next animation frame, outside the simulation tick.
export function useDeferredProjectileState() {
  const [items, commitItems] = useState([])
  const itemsRef = useRef(items)
  const pendingRef = useRef(null)
  const rafRef = useRef(0)

  const flush = useCallback(() => {
    rafRef.current = 0
    if (!pendingRef.current) return
    const next = pendingRef.current
    pendingRef.current = null
    itemsRef.current = next
    commitItems(next)
  }, [])

  const request = useCallback((next) => {
    pendingRef.current = next
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(flush)
  }, [flush])

  const remove = useCallback((id) => {
    const source = pendingRef.current ?? itemsRef.current
    request(source.filter((item) => item.id !== id))
  }, [request])

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  return [items, itemsRef, request, remove]
}
