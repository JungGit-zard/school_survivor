// 모든 데미지 숫자를 한 곳에서 풀링·렌더·정리한다.
// 성능: 고정 슬롯 풀(캔버스 텍스처 빌보드)을 게임 시작 시 1회 생성하고 재활용한다.
// emit마다 React 마운트/언마운트나 THREE 객체 할당이 발생하지 않는다(캔버스 재그리기 + 텍스처 업로드만).
// 근거: drei/troika Text는 개당 SDF 지오메트리 생성 + 워커 비동기 비용이 있어 초당 수십 히트에서 GC/워커 스래싱.
//       동시 표시 ≤POOL_SIZE, 숫자마다 독립 opacity/색/문자열이 필요해 InstancedMesh보다 슬롯 풀이 단순·충분.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  subscribeDamageNumber,
  pickDamageNumberSlot,
  computeDamageNumberFrame,
  formatDamageAmount,
  damageNumberJitter,
  damageNumbersEnabled,
  DAMAGE_NUMBER_LIFE_MS,
} from '../lib/damageNumbers.js'
import { useGameStore } from '../store/useGameStore.js'

// 동시 표시 상한(과제 요구: 24~32). 초과 시 pickDamageNumberSlot이 가장 오래된 것을 재활용.
const POOL_SIZE = 28
const CANVAS_W = 96
const CANVAS_H = 48
// "아주 작게": 월드 높이. 화면에서 아주 작은 숫자로 보이도록.
const NUMBER_WORLD_H = 0.36
const NUMBER_WORLD_W = NUMBER_WORLD_H * (CANVAS_W / CANVAS_H)
const FONT_PX = 34

function drawDamageText(ctx, text, colorHex) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.font = `900 ${FONT_PX}px "Arial Black", Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.miterLimit = 2
  // 카툰 외곽선: 어떤 배경에서도 읽히도록 진한 테두리 + 색 채움.
  ctx.strokeStyle = 'rgba(24,14,8,0.95)'
  ctx.lineWidth = FONT_PX * 0.3
  ctx.strokeText(text, CANVAS_W / 2, CANVAS_H / 2 + 1)
  ctx.fillStyle = colorHex
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2 + 1)
}

export default function DamageNumbersLayer() {
  const groupRef = useRef()
  const gameKey = useGameStore((s) => s.gameKey)

  // 풀을 1회 생성. 캔버스/텍스처/머티리얼/메시 모두 고정, emit 시 재활용만 한다.
  const pool = useMemo(() => {
    const geo = new THREE.PlaneGeometry(NUMBER_WORLD_W, NUMBER_WORLD_H)
    const slots = []
    for (let i = 0; i < POOL_SIZE; i += 1) {
      const canvas = document.createElement('canvas')
      canvas.width = CANVAS_W
      canvas.height = CANVAS_H
      const ctx = canvas.getContext('2d')
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: false, // 적/벽에 가려지지 않고 항상 위에 뜨도록
        opacity: 0,
        toneMapped: false,
      })
      const mesh = new THREE.Mesh(geo, material)
      mesh.visible = false
      mesh.renderOrder = 1000
      mesh.frustumCulled = false
      slots.push({ mesh, canvas, ctx, texture, material, active: false, startMs: 0, life: 0, x: 0, y0: 0, z: 0 })
    }
    return { geo, slots }
  }, [])

  // 언마운트 시 GPU 리소스 정리.
  useEffect(() => {
    return () => {
      pool.geo.dispose()
      pool.slots.forEach((s) => {
        s.texture.dispose()
        s.material.dispose()
      })
    }
  }, [pool])

  // 게임 재시작 시 잔여 숫자 클리어.
  useEffect(() => {
    pool.slots.forEach((s) => {
      s.active = false
      s.mesh.visible = false
      s.material.opacity = 0
    })
  }, [gameKey, pool])

  useEffect(() => {
    return subscribeDamageNumber((event) => {
      if (!damageNumbersEnabled()) return
      const text = formatDamageAmount(event.amount)
      if (text === null) return
      const now = performance.now()
      const idx = pickDamageNumberSlot(pool.slots, now)
      const slot = pool.slots[idx]
      const color = event.colorHex || '#ffffff'
      drawDamageText(slot.ctx, text, color)
      slot.texture.needsUpdate = true
      const jitter = damageNumberJitter()
      slot.active = true
      slot.startMs = now
      slot.life = event.life ?? DAMAGE_NUMBER_LIFE_MS
      slot.x = (event.x ?? 0) + jitter.x
      slot.y0 = event.y ?? 0.6
      slot.z = (event.z ?? 0) + jitter.z
      slot.mesh.visible = true
      slot.mesh.position.set(slot.x, slot.y0, slot.z)
      slot.material.opacity = 1
    })
  }, [pool])

  useFrame((state) => {
    const now = performance.now()
    const cam = state.camera
    for (let i = 0; i < pool.slots.length; i += 1) {
      const slot = pool.slots[i]
      if (!slot.active) continue
      const f = computeDamageNumberFrame(slot, now)
      if (f.done) {
        slot.active = false
        slot.mesh.visible = false
        slot.material.opacity = 0
        continue
      }
      slot.mesh.position.set(slot.x, f.y, slot.z)
      slot.mesh.quaternion.copy(cam.quaternion) // 항상 카메라를 바라보게(빌보드)
      slot.mesh.scale.set(f.scale, f.scale, 1)
      slot.material.opacity = f.opacity
    }
  })

  return (
    <group ref={groupRef}>
      {pool.slots.map((slot, i) => (
        <primitive key={i} object={slot.mesh} />
      ))}
    </group>
  )
}
