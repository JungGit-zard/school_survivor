// Sltera 돌진 이벤트 런타임(S1~S5 매 판). 스케줄·경로·판정 정본은 lib/slteraEvent.js.
// 예고 없음(Terry 스펙 "갑자기 나타나"): 예정 시각이 되면 화면 한 모서리 바로 밖에서 튀어나와 반대편
// 모서리 쪽으로 사선을 따라 지그재그로 비틀거리며(4.2u/s, 핸들 발작·떨림) 화면을 지나간다.
// 크기는 11-07판의 7/15(11-13 Terry: 11-08판의 2배로 키웠다가 다시 30% 줄임 = 1.4배, 속도 1.5배 — 비주얼 그룹 scale = 판정 배율 SLTERA_SIZE_SCALE).
// 스테이지 프랍(책상·사물함 등, 좀비와 같은 장애물 OBB)에 부딪히면 뒤로 밀렸다가 방향을 바꿔 다시 달린다.
// 지나가는 길의 좀비를 무작위로 치고, 로자리와 겹치면 질주당 1회 최대 HP 15% 피해.
// 오너 치트 '슬테라 즉시 출현'(lib/slteraInstantSpawn.js)이 이 판의 수신기를 통해 질주를 바로 시작시킨다.
// 매 프레임 할당 없음: pass·스크래치·충돌 impact 객체를 전부 ref로 재사용한다.
import { useEffect, useRef } from 'react'
import { usePlayingFrame } from '../lib/usePlayingFrame.js'
import { useGameStore } from '../store/useGameStore.js'
import { playerPos, screenBounds } from '../lib/refs.js'
import { getRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { createWeaponTargetScratch, resolveWeaponTarget, scanOrientedBoxEnemiesInto } from '../lib/weaponTargeting.js'
import { applyEnemyHit } from '../lib/weaponCollision.js'
import { getStageObjectSightObstacles } from './StageObjects/stageObjectColliders.js'
import {
  SLTERA_DAMAGE_SOURCE, SLTERA_IMPACT_BACK, SLTERA_KNOCKBACK, SLTERA_KNOCKBACK_MS, SLTERA_PHASE, SLTERA_SIZE_SCALE,
  beginSlteraPass, checkSlteraPlayerHit, claimSlteraThud, consumeSlteraPassStart, createSlteraRunState, getSlteraSweepBox,
  requestSlteraInstantPassOn, rollSlteraRunOver, stepSlteraPass,
} from '../lib/slteraEvent.js'
import { registerSlteraInstantSpawnTarget } from '../lib/slteraInstantSpawn.js'
import SlteraCar from './SlteraCar.jsx'

export default function SlteraEvent({ stageId, gameKey }) {
  const carRef = useRef(null)
  // SlteraCar의 예고 맥동 입력. 게임에서는 예고가 없으므로 항상 -1(평시 라이트).
  const telegraphRef = useRef(-1)
  const state = useRef(null)
  if (state.current === null) {
    state.current = {
      run: createSlteraRunState(),
      scratch: createWeaponTargetScratch(),
      box: { centerX: 0, centerZ: 0, yaw: 0, halfWidth: 0, halfDepth: 0 },
      impact: { source: { x: 0, z: 0 }, knockback: SLTERA_KNOCKBACK, knockbackMs: SLTERA_KNOCKBACK_MS },
    }
  }

  // 슬테라 즉시 출현(오너 치트) 수신기 — 이 판이 살아 있는 동안만. 질주 중 탭은 무시된다.
  useEffect(() => registerSlteraInstantSpawnTarget(() => requestSlteraInstantPassOn(state.current.run)), [])

  usePlayingFrame((_, delta) => {
    const s = state.current
    const pass = s.run.pass
    const elapsedMs = getRuntimeElapsedMs()

    if (pass.phase === SLTERA_PHASE.DONE) {
      // 예정 시각이 지났거나(이미 지나간 예정은 건너뛰지 않고 지금 바로 한 번) 즉시 출현 요청이 있으면 시작.
      if (!consumeSlteraPassStart(s.run, stageId, gameKey, elapsedMs)) return
      beginSlteraPass(pass, {
        bounds: screenBounds, playerX: playerPos.x, playerZ: playerPos.z, obstacles: getStageObjectSightObstacles(stageId),
      })
      const car = carRef.current
      if (car) {
        car.rotation.y = pass.heading
        car.position.set(pass.x, 0, pass.z)
        car.visible = true
      }
      // 튀어나오는 순간의 돌진음(전용 엔진음 없음 — soundmini 검토 대상). 차가 화면 바로 밖에서 출발하므로
      // 사전 예고가 아니라 등장음이다.
      emitSfx({ id: 'sharkFire', volume: 0.55, rate: 1.25 })
    }

    stepSlteraPass(pass, delta * 1000, playerPos.x, playerPos.z)

    // 좀비 치기 — 차 중심이 화면 안일 때, 이번 프레임 쓸고 간 회전 사각형 안의 적마다 질주당 한 번만 굴린다.
    const box = s.box
    if (pass.swept && getSlteraSweepBox(pass, box, screenBounds)) {
      const scratch = s.scratch
      const count = scanOrientedBoxEnemiesInto(scratch, box.centerX, box.centerZ, box.yaw, box.halfWidth, box.halfDepth)
      let ranOver = false
      s.impact.source.x = pass.prevX - Math.sin(pass.heading) * SLTERA_IMPACT_BACK
      s.impact.source.z = pass.prevZ - Math.cos(pass.heading) * SLTERA_IMPACT_BACK
      for (let i = 0; i < count; i += 1) {
        const special = scratch.special[i]
        const index = scratch.indices[i]
        const generation = special ? (scratch.generations[i] || null) : scratch.generations[i]
        const rb = special ?? resolveWeaponTarget(index, generation, null)
        if (!rb) continue
        const damage = rollSlteraRunOver(pass, index, generation, special, rb._enemyType)
        if (damage > 0 && applyEnemyHit(rb, generation, damage, s.impact)) ranOver = true
      }
      // 쿵 소리는 게임 시간 150ms에 한 번 — 무리를 쓸고 가면 연속 프레임마다 쳐서 쿵이 쌓이고 클리핑했다.
      // 런 시계(elapsedMs)로 잰다: 일시정지 중엔 흐르지 않고, 한 렌더 프레임에 몰아 도는 고정 스텝끼리는
      // 같은 값이라 프레임 끊김 뒤 따라잡기 스텝에서도 한꺼번에 여러 번 울리지 않는다.
      if (ranOver && claimSlteraThud(pass, elapsedMs)) emitSfx({ id: 'zombieGiantThud', volume: 0.6, rate: 1.1 })
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
      car.position.z = pass.z
      car.rotation.y = pass.heading // 지그재그로 꺾일 때도 늘 진행 방향을 본다
      if (pass.phase === SLTERA_PHASE.DONE) car.visible = false
    }
  })

  return (
    <group ref={carRef} visible={false} scale={SLTERA_SIZE_SCALE}>
      <SlteraCar telegraphRef={telegraphRef} />
    </group>
  )
}
