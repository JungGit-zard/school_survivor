import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { getToonGradient } from '../../lib/toon.js'
import { createWeaponTargetScratch, scanClosestEnemiesInto } from '../../lib/weaponTargeting.js'
import { createOutlineGeometry, createPaperPlaneGeometry } from '../../lib/projectileZombieShotGeometry.js'
import {
  PAPER_PLANE_HEIGHT, clearPaperPlanePool, createPaperPlanePool, launchPaperPlanes, stepPaperPlanes,
} from '../../lib/paperPlane.js'

// 종이비행기(paperPlane) — 2026-11-07 Terry: E47 종이비행기 좀비의 탄을 로자리 무기로.
// 동작·수치 정본: lib/paperPlane.js(비행·피격) + weaponCatalog.js paperPlane.base.
// 렌더: 좀비 탄과 같은 저폴리 다트를 로자리 팔레트(흰 몸체 + 분홍 용골)로 칠한 InstancedMesh 한 쌍
// (몸체 + BackSide 외곽선). 풀 용량이 늘 때만 메시를 다시 만들고, 매 프레임 할당은 없다.
export const PAPER_PLANE_BODY_COLOR = 0xfff6fa
export const PAPER_PLANE_KEEL_COLOR = 0xff7eb6
export const PAPER_PLANE_VISUAL_SCALE = 2.3 // 좀비 탄(1.35)보다 크게 — 길이 약 0.74u(1블록)

let _paperPlaneAssets = null
export function getPaperPlaneAssets() {
  if (!_paperPlaneAssets) {
    const bodyGeo = createPaperPlaneGeometry(PAPER_PLANE_BODY_COLOR, PAPER_PLANE_KEEL_COLOR)
    _paperPlaneAssets = {
      bodyGeo,
      outlineGeo: createOutlineGeometry(bodyGeo, 0.013),
      bodyMat: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getToonGradient(), emissive: 0x2a1820 }),
      outlineMat: new THREE.MeshBasicMaterial({ color: 0x050209, side: THREE.BackSide }),
    }
  }
  return _paperPlaneAssets
}

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _qBank = new THREE.Quaternion()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3(PAPER_PLANE_VISUAL_SCALE, PAPER_PLANE_VISUAL_SCALE, PAPER_PLANE_VISUAL_SCALE)
const _zero = new THREE.Matrix4().makeScale(0, 0, 0)
const UP = new THREE.Vector3(0, 1, 0)
const FORWARD = new THREE.Vector3(0, 0, 1)

function writePlaneMatrices(pool, body, outline, time) {
  const n = pool.highest + 1
  for (let i = 0; i < n; i += 1) {
    if (!pool.active[i]) {
      body.setMatrixAt(i, _zero)
      outline.setMatrixAt(i, _zero)
      continue
    }
    // 활공: 진행 방향을 보고 좌우로 살짝 기울며 위아래로 떠다닌다.
    const wobble = Math.sin(time * 6 + i * 1.7)
    _q.setFromAxisAngle(UP, Math.atan2(pool.dirX[i], pool.dirZ[i]))
    _qBank.setFromAxisAngle(FORWARD, 0.3 * wobble)
    _q.multiply(_qBank)
    _p.set(pool.posX[i], playerPos.y - 0.32 + PAPER_PLANE_HEIGHT + 0.06 * wobble, pool.posZ[i])
    _m.compose(_p, _q, _s)
    body.setMatrixAt(i, _m)
    outline.setMatrixAt(i, _m)
  }
  body.count = n
  outline.count = n
  body.visible = n > 0
  outline.visible = n > 0
  body.instanceMatrix.needsUpdate = true
  outline.instanceMatrix.needsUpdate = true
}

export function PaperPlaneWeapon() {
  const poolRef = useRef(null)
  if (poolRef.current === null) poolRef.current = createPaperPlanePool(16)
  const targetScratchRef = useRef(null)
  if (targetScratchRef.current === null) targetScratchRef.current = createWeaponTargetScratch(8)
  const lastFireRef = useRef(0)
  const timeRef = useRef(0)
  const lastHitSfxRef = useRef(0)
  const nowRef = useRef(0)
  // 적중 효과음 콜백은 한 번만 만든다(매 프레임 클로저 할당 없음). 60ms 안의 연타는 한 번만 울린다.
  const onHitRef = useRef(null)
  if (onHitRef.current === null) {
    onHitRef.current = () => {
      if (nowRef.current - lastHitSfxRef.current < 60) return
      lastHitSfxRef.current = nowRef.current
      emitSfx({ id: 'pencilHit', volume: 0.42, rate: 1.15 + Math.random() * 0.1 })
    }
  }
  const bodyRef = useRef(null)
  const outlineRef = useRef(null)
  // 풀 용량이 두 배로 늘 때만 바뀐다 → InstancedMesh를 그 크기로 다시 만든다.
  const [capacity, setCapacity] = useState(16)
  const phase = useGameStore((s) => s.phase)
  const weapon = useGameStore((s) => s.weapons.paperPlane)
  const active = !!weapon?.active
  const assets = useMemo(() => getPaperPlaneAssets(), [])

  // 무기가 빠지거나(교체 카드) 판이 끝나면 떠 있던 비행기를 지운다.
  const gameKey = useGameStore((s) => s.gameKey)
  const ended = phase === 'gameover' || phase === 'cleared'
  useEffect(() => {
    if (active && !ended) return
    clearPaperPlanePool(poolRef.current)
    if (bodyRef.current && outlineRef.current) writePlaneMatrices(poolRef.current, bodyRef.current, outlineRef.current, 0)
  }, [active, ended])
  useEffect(() => { clearPaperPlanePool(poolRef.current); lastFireRef.current = 0; lastHitSfxRef.current = 0 }, [gameKey])

  usePlayingFrame(({ clock }, delta) => {
    if (!active) return
    const pool = poolRef.current
    timeRef.current += delta
    const now = clock.elapsedTime * 1000
    nowRef.current = now
    if (now - lastFireRef.current >= weapon.cooldown) {
      const scratch = targetScratchRef.current
      const count = Math.max(1, Math.floor(weapon.projectileCount ?? 1))
      const found = scanClosestEnemiesInto(scratch, weapon.range ?? 9, Math.min(count, scratch.indices.length))
      if (found > 0 && launchPaperPlanes(pool, { originX: playerPos.x, originZ: playerPos.z, weapon, scratch, targetCount: found }) > 0) {
        lastFireRef.current = now
        // 전용 효과음이 없어 연필 발사·타격음을 공유한다(soundmini 검토 대상).
        emitSfx({ id: 'pencilFire', volume: 0.5, rate: 1.25 })
      }
    }
    stepPaperPlanes(pool, delta, undefined, onHitRef.current)
    if (pool.capacity !== capacity) { setCapacity(pool.capacity); return }
    if (bodyRef.current && outlineRef.current) writePlaneMatrices(pool, bodyRef.current, outlineRef.current, timeRef.current)
  })

  if (!active) return null
  return (
    <group>
      <instancedMesh key={`o${capacity}`} ref={outlineRef} args={[assets.outlineGeo, assets.outlineMat, capacity]} frustumCulled={false} count={0} />
      <instancedMesh key={`b${capacity}`} ref={bodyRef} args={[assets.bodyGeo, assets.bodyMat, capacity]} frustumCulled={false} count={0} />
    </group>
  )
}
