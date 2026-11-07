// Sltera 돌진 이벤트 런타임(S1~S5 매 판). 스케줄·판정 정본은 lib/slteraEvent.js.
// 예고 없음(Terry 스펙 "갑자기 나타나"): 예정 시각이 되면 화면 가장자리 바로 밖에서 곧장 튀어나와
// 14u/s로 화면을 가로지르며, 화면에 보이는 차선 위 좀비를 무작위로 치고, 로자리와 겹치면 질주당 1회
// 최대 HP 15% 피해. 반대편 화면 밖으로 빠지면 숨는다. 차선은 화면에 보이는 행 중 무작위(로자리 조준 아님).
// 매 프레임 할당 없음: pass·스크래치·충돌 impact 객체를 전부 ref로 재사용한다.
import { useRef } from 'react'
import { usePlayingFrame } from '../lib/usePlayingFrame.js'
import { useGameStore } from '../store/useGameStore.js'
import { playerPos, screenBounds } from '../lib/refs.js'
import { getRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { createWeaponTargetScratch, resolveWeaponTarget, scanOrientedBoxEnemiesInto } from '../lib/weaponTargeting.js'
import { applyEnemyHit } from '../lib/weaponCollision.js'
import {
  SLTERA_DAMAGE_SOURCE, SLTERA_KNOCKBACK, SLTERA_KNOCKBACK_MS, SLTERA_PHASE,
  beginSlteraPass, checkSlteraPlayerHit, createSlteraPass, getSlteraPassStartMs, getSlteraSweepBox,
  rollSlteraRunOver, stepSlteraPass,
} from '../lib/slteraEvent.js'
import SlteraCar from './SlteraCar.jsx'

export default function SlteraEvent({ stageId, gameKey }) {
  const carRef = useRef(null)
  // SlteraCar의 예고 맥동 입력. 게임에서는 예고가 없으므로 항상 -1(평시 라이트).
  const telegraphRef = useRef(-1)
  const state = useRef(null)
  if (state.current === null) {
    state.current = {
      pass: createSlteraPass(),
      passIndex: 0,
      scratch: createWeaponTargetScratch(),
      box: { centerX: 0, centerZ: 0, yaw: 0, halfWidth: 0, halfDepth: 0 },
      impact: { source: { x: 0, z: 0 }, knockback: SLTERA_KNOCKBACK, knockbackMs: SLTERA_KNOCKBACK_MS },
    }
  }

  usePlayingFrame((_, delta) => {
    const s = state.current
    const pass = s.pass
    const elapsedMs = getRuntimeElapsedMs()

    if (pass.phase === SLTERA_PHASE.DONE) {
      // 다음 예정 시각이 지났으면 곧장 질주 시작. 이미 지나간 예정은 건너뛰지 않고 지금 바로 한 번 달린다.
      if (elapsedMs < getSlteraPassStartMs(stageId, gameKey, s.passIndex)) return
      while (getSlteraPassStartMs(stageId, gameKey, s.passIndex + 1) <= elapsedMs) s.passIndex += 1
      s.passIndex += 1
      beginSlteraPass(pass, { playerX: playerPos.x, playerZ: playerPos.z, bounds: screenBounds })
      const car = carRef.current
      if (car) {
        car.rotation.y = pass.dir > 0 ? Math.PI / 2 : -Math.PI / 2
        car.position.set(pass.x, 0, pass.laneZ)
        car.visible = true
      }
      // 튀어나오는 순간의 돌진음(전용 엔진음 없음 — soundmini 검토 대상). 차 앞코가 화면에 들어오기
      // ≈0.08초 전이라 사전 예고가 아니라 등장음이다.
      emitSfx({ id: 'sharkFire', volume: 0.55, rate: 1.25 })
    }

    stepSlteraPass(pass, delta * 1000)

    // 좀비 치기 — 이번 프레임 쓸고 간 사각형 중 화면에 보이는 부분 안의 적마다 질주당 한 번만 굴린다.
    const box = s.box
    if (pass.swept && getSlteraSweepBox(pass, box, screenBounds)) {
      const scratch = s.scratch
      const count = scanOrientedBoxEnemiesInto(scratch, box.centerX, box.centerZ, box.yaw, box.halfWidth, box.halfDepth)
      let ranOver = false
      s.impact.source.x = pass.prevX - pass.dir * 1.5
      s.impact.source.z = pass.laneZ
      for (let i = 0; i < count; i += 1) {
        const special = scratch.special[i]
        const index = scratch.indices[i]
        const generation = special ? (scratch.generations[i] || null) : scratch.generations[i]
        const rb = special ?? resolveWeaponTarget(index, generation, null)
        if (!rb) continue
        const damage = rollSlteraRunOver(pass, index, generation, special, rb._enemyType)
        if (damage > 0 && applyEnemyHit(rb, generation, damage, s.impact)) ranOver = true
      }
      if (ranOver) emitSfx({ id: 'zombieGiantThud', volume: 0.6, rate: 1.1 })
    }

    // 로자리 피격 — 질주당 1회. 무적 판정은 damagePlayer의 일반 규칙을 따른다.
    if (pass.swept) {
      const live = useGameStore.getState()
      const hit = checkSlteraPlayerHit(pass, playerPos.x, playerPos.z, live.player?.maxHp ?? 0)
      if (hit > 0) live.damagePlayer(hit, { source: SLTERA_DAMAGE_SOURCE })
    }

    const car = carRef.current
    if (car) {
      car.position.x = pass.x
      if (pass.phase === SLTERA_PHASE.DONE) car.visible = false
    }
  })

  return (
    <group ref={carRef} visible={false}>
      <SlteraCar telegraphRef={telegraphRef} />
    </group>
  )
}
