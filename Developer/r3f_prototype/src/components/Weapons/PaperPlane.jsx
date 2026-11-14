import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { usePlayingFrame } from '../../lib/usePlayingFrame.js'
import { emitSfx } from '../../lib/sfxEvents.js'
import { playerPos } from '../../lib/refs.js'
import { useGameStore } from '../../store/useGameStore.js'
import { getToonGradient } from '../../lib/toon.js'
import { createWeaponTargetScratch, scanClosestEnemiesInto } from '../../lib/weaponTargeting.js'
import { SHOT_HEIGHT, SHOT_KIND, SHOT_KIND_INFO, SHOT_MOTION } from '../../lib/projectileZombieShotPool.js'
import {
  SHOT_OUTLINE_THICKNESS, SHOT_VISUALS, composeShotQuaternion, createOutlineGeometry,
  createShotBodyMaterial, createShotOutlineMaterial, getShotVisualIndex,
} from '../../lib/projectileZombieShotGeometry.js'
import { clearPaperPlanePool, createPaperPlanePool, launchPaperPlanes, stepPaperPlanes } from '../../lib/paperPlane.js'

// 종이비행기(paperPlane) — 2026-11-07 Terry: E47 종이비행기 좀비의 탄을 로자리 무기로.
// 2026-11-08 Terry: 좀비 종이비행기와 크기·비행속도·공격 방식까지 완전히 같게, 로자리 것만 민트 테두리.
// 동작·수치 정본: lib/paperPlane.js(E47 탄 스펙 + 공용 선회) + weaponCatalog.js paperPlane.base(피해·쿨·대수).
// 렌더: 좀비 탄 레이어(PooledEnemyProjectileLayer)와 같은 메시·재질·크기·높이·기울기(bank) 규칙을 쓰고,
// 외곽선 헐 색만 민트다. 몸체 + 외곽선 InstancedMesh 한 쌍. 풀 용량이 늘 때만 메시를 다시 만들고,
// 매 프레임 할당은 없다. 풀은 16에서 시작해 두 배씩, 안전망 상한 PAPER_PLANE_MAX_CAPACITY(64)까지만 는다.
export const PAPER_PLANE_VISUAL = getShotVisualIndex(SHOT_KIND.PAPER_PLANE, SHOT_MOTION.HOMING)
export const PAPER_PLANE_VISUAL_SCALE = SHOT_KIND_INFO[SHOT_KIND.PAPER_PLANE].size // 좀비 탄과 같은 1.35
// 좀비 탄과의 유일한 차이: 외곽선. E04 청록 탄(#34D6B8)보다 밝고 초록 쪽인 민트.
// 몸체 메시·크기는 같고, 민트 헐만 좀비 탄 외곽선(0.013)보다 굵게 둬 폰 화면에서도 테두리 색이 읽히게 한다.
export const PAPER_PLANE_OUTLINE_COLOR = 0x5cffc8
export const PAPER_PLANE_OUTLINE_THICKNESS = SHOT_OUTLINE_THICKNESS * 2.3

let _paperPlaneAssets = null
export function getPaperPlaneAssets() {
  if (!_paperPlaneAssets) {
    const bodyGeo = SHOT_VISUALS[PAPER_PLANE_VISUAL].create()
    _paperPlaneAssets = {
      bodyGeo,
      outlineGeo: createOutlineGeometry(bodyGeo, PAPER_PLANE_OUTLINE_THICKNESS),
      bodyMat: createShotBodyMaterial(getToonGradient()),
      outlineMat: createShotOutlineMaterial(PAPER_PLANE_OUTLINE_COLOR),
    }
  }
  return _paperPlaneAssets
}

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3(PAPER_PLANE_VISUAL_SCALE, PAPER_PLANE_VISUAL_SCALE, PAPER_PLANE_VISUAL_SCALE)
const _zero = new THREE.Matrix4().makeScale(0, 0, 0)

// 좀비 탄 레이어(writeProjectileZombieShotFrame)와 같은 규칙: 높이 SHOT_HEIGHT, 진행 방향 + bank 기울기.
export function writePlaneMatrices(pool, body, outline) {
  const n = pool.highest + 1
  for (let i = 0; i < n; i += 1) {
    if (!pool.active[i]) {
      body.setMatrixAt(i, _zero)
      outline.setMatrixAt(i, _zero)
      continue
    }
    _p.set(pool.posX[i], SHOT_HEIGHT, pool.posZ[i])
    composeShotQuaternion(_q, PAPER_PLANE_VISUAL, pool.velX[i], pool.velZ[i], pool.ageMs[i], i)
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
    if (bodyRef.current && outlineRef.current) writePlaneMatrices(poolRef.current, bodyRef.current, outlineRef.current)
  }, [active, ended])
  useEffect(() => { clearPaperPlanePool(poolRef.current); lastFireRef.current = 0; lastHitSfxRef.current = 0 }, [gameKey])

  usePlayingFrame(({ clock }, delta) => {
    if (!active) return
    const pool = poolRef.current
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
    if (bodyRef.current && outlineRef.current) writePlaneMatrices(pool, bodyRef.current, outlineRef.current)
  })

  if (!active) return null
  // renderOrder: 좀비 탄 레이어와 같다(외곽선 1, 몸체 2).
  return (
    <group>
      <instancedMesh key={`o${capacity}`} ref={outlineRef} args={[assets.outlineGeo, assets.outlineMat, capacity]} frustumCulled={false} count={0} renderOrder={1} />
      <instancedMesh key={`b${capacity}`} ref={bodyRef} args={[assets.bodyGeo, assets.bodyMat, capacity]} frustumCulled={false} count={0} renderOrder={2} />
    </group>
  )
}
