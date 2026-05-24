/**
 * ClassroomFloor - Stage 1 visible classroom floor background.
 * Static prop overlays were removed from gameplay.
 */

import { useMemo } from 'react'
import * as THREE from 'three'

const FLOOR_SIZE = 96
export const FLOOR_TEXTURE_SIZE = 4096
const TEX_SIZE = FLOOR_TEXTURE_SIZE

export const FLOOR_TEXTURE_STYLE = {
  base: '#6b5235',
  light: '#876b45',
  dark: '#2a2119',
  seam: '#1f1813',
  highlight: '#8a704a',
  dirt: '#241c16',
  infection: '#263c31',
  repeat: 6,
  plankHeightPx: 372,
  plankWidthPx: 1260,
  seamOpacity: 0,
  seamWidthPx: 1,
  verticalSeamOpacity: 0,
  scratchOpacity: 0.26,
  edgeGrimeOpacity: 0.28,
  boardTintOpacity: 0,
}

function buildWoodTexture() {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = TEX_SIZE
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = FLOOR_TEXTURE_STYLE.base
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)

  const PLANK_H = FLOOR_TEXTURE_STYLE.plankHeightPx
  const PLANK_W = FLOOR_TEXTURE_STYLE.plankWidthPx
  const rowCount = Math.ceil(TEX_SIZE / PLANK_H)

  for (let row = 0; row < rowCount; row++) {
    const y = row * PLANK_H
    const boardAlpha = row % 2 === 0 ? FLOOR_TEXTURE_STYLE.boardTintOpacity : FLOOR_TEXTURE_STYLE.boardTintOpacity * 0.65
    if (boardAlpha > 0) {
      ctx.fillStyle = row % 2 === 0 ? FLOOR_TEXTURE_STYLE.light : FLOOR_TEXTURE_STYLE.dark
      ctx.globalAlpha = boardAlpha
      ctx.fillRect(0, y + 2, TEX_SIZE, PLANK_H - 4)
    }

    for (let gy = y + 12; gy < Math.min(y + PLANK_H - 8, TEX_SIZE); gy += 9) {
      const n = Math.sin(gy * 0.09 + row) * 0.5 + Math.sin(gy * 0.31) * 0.25
      ctx.fillStyle = n > 0 ? FLOOR_TEXTURE_STYLE.light : FLOOR_TEXTURE_STYLE.dark
      ctx.globalAlpha = 0.035 + Math.abs(n) * 0.035
      ctx.fillRect(0, gy, TEX_SIZE, 1)
    }

    const off = row % 2 === 0 ? 0 : PLANK_W / 2
    for (let x = off; x < TEX_SIZE; x += PLANK_W) {
      ctx.fillStyle = FLOOR_TEXTURE_STYLE.seam
      ctx.globalAlpha = FLOOR_TEXTURE_STYLE.verticalSeamOpacity
      ctx.fillRect(x, y + 10, FLOOR_TEXTURE_STYLE.seamWidthPx, PLANK_H - 20)

      ctx.fillStyle = FLOOR_TEXTURE_STYLE.highlight
      ctx.globalAlpha = 0.08
      ctx.fillRect(x + 1, y + 10, 1, PLANK_H - 20)

      ctx.fillStyle = FLOOR_TEXTURE_STYLE.dark
      ctx.globalAlpha = 0.18
      ctx.beginPath()
      ctx.arc(x + 18, y + 42, 5, 0, Math.PI * 2)
      ctx.arc(x + 18, y + PLANK_H - 42, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  for (let y = PLANK_H; y < TEX_SIZE; y += PLANK_H) {
    ctx.fillStyle = FLOOR_TEXTURE_STYLE.seam
    ctx.globalAlpha = FLOOR_TEXTURE_STYLE.seamOpacity
    ctx.fillRect(0, y, TEX_SIZE, FLOOR_TEXTURE_STYLE.seamWidthPx)
    ctx.fillStyle = FLOOR_TEXTURE_STYLE.highlight
    ctx.globalAlpha = 0.16
    ctx.fillRect(0, y - 1, TEX_SIZE, 1)
    ctx.globalAlpha = 1
  }

  // Small cracks, nail marks, and scuffs: these sell the reference-image wood without creating thick grid lines.
  ctx.strokeStyle = FLOOR_TEXTURE_STYLE.dark
  ctx.globalAlpha = FLOOR_TEXTURE_STYLE.scratchOpacity
  ctx.lineWidth = 1
  for (let i = 0; i < 260; i++) {
    const x1 = (i * 173 + 71) % TEX_SIZE
    const y1 = (i * 211 + 39) % TEX_SIZE
    const x2 = x1 + 18 + (i % 5) * 12
    const y2 = y1 + ((i % 3) - 1)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
  for (let i = 0; i < 520; i++) {
    const x = (i * 97 + 19) % TEX_SIZE
    const y = (i * 131 + 11) % TEX_SIZE
    ctx.fillStyle = i % 3 === 0 ? FLOOR_TEXTURE_STYLE.dark : FLOOR_TEXTURE_STYLE.light
    ctx.globalAlpha = i % 3 === 0 ? 0.16 : 0.08
    ctx.fillRect(x, y, 2, 2)
  }
  ctx.globalAlpha = 1

  // Static grime patches are baked into the floor so the first screen no longer reads as a clean prototype tile.
  const grimePatches = [
    { x: 280, y: 320, r: 520, alpha: FLOOR_TEXTURE_STYLE.edgeGrimeOpacity, color: FLOOR_TEXTURE_STYLE.dirt },
    { x: 3720, y: 420, r: 620, alpha: 0.18, color: FLOOR_TEXTURE_STYLE.infection },
    { x: 3600, y: 3700, r: 560, alpha: FLOOR_TEXTURE_STYLE.edgeGrimeOpacity, color: FLOOR_TEXTURE_STYLE.dirt },
    { x: 420, y: 3680, r: 460, alpha: 0.16, color: FLOOR_TEXTURE_STYLE.infection },
    { x: 2060, y: 1740, r: 340, alpha: 0.10, color: FLOOR_TEXTURE_STYLE.dirt },
    { x: 1880, y: 2360, r: 280, alpha: 0.08, color: FLOOR_TEXTURE_STYLE.infection },
  ]
  for (const patch of grimePatches) {
    const grad = ctx.createRadialGradient(patch.x, patch.y, 0, patch.x, patch.y, patch.r)
    grad.addColorStop(0, patch.color)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.globalAlpha = patch.alpha
    ctx.beginPath()
    ctx.arc(patch.x, patch.y, patch.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(FLOOR_TEXTURE_STYLE.repeat, FLOOR_TEXTURE_STYLE.repeat)
  tex.generateMipmaps = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.anisotropy = 8
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function ClassroomFloor() {
  const woodTex = useMemo(() => buildWoodTexture(), [])
  const floorMat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: woodTex }),
    [woodTex]
  )

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={0}>
      <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
      <primitive object={floorMat} />
    </mesh>
  )
}
