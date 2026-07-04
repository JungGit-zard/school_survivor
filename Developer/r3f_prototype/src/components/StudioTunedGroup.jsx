import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import {
  DEFAULT_STUDIO_TUNING,
  GRAPHICS_STUDIO_TUNING_EVENT,
  loadStudioTunings,
  normalizeStudioTuning,
} from '../lib/graphicsStudioConfig.js'

const StudioPreviewContext = createContext(false)

export function StudioTuningPreviewProvider({ children }) {
  return (
    <StudioPreviewContext.Provider value>
      {children}
    </StudioPreviewContext.Provider>
  )
}

export function getStudioTransformProps(tuning = DEFAULT_STUDIO_TUNING) {
  const t = normalizeStudioTuning(tuning)
  return {
    scale: [t.scale * t.scaleX, t.scale * t.scaleY, t.scale * t.scaleZ],
    rotation: [
      THREE.MathUtils.degToRad(t.rotationX),
      THREE.MathUtils.degToRad(t.rotationY),
      THREE.MathUtils.degToRad(t.rotationZ),
    ],
  }
}

function loadItemTuning(itemId) {
  return loadStudioTunings()[itemId] ?? DEFAULT_STUDIO_TUNING
}

export default function StudioTunedGroup({ itemId, children }) {
  const previewOnly = useContext(StudioPreviewContext)
  const [tuning, setTuning] = useState(() => loadItemTuning(itemId))

  useEffect(() => {
    if (previewOnly || typeof window === 'undefined') return undefined
    const update = () => setTuning(loadItemTuning(itemId))
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [itemId, previewOnly])

  const transform = useMemo(() => getStudioTransformProps(tuning), [tuning])

  if (previewOnly) return <>{children}</>
  return <group scale={transform.scale} rotation={transform.rotation}>{children}</group>
}
