// Sltera 돌진 이벤트 런타임(S1~S5 매 판). 스케줄·경로·판정 정본은 lib/slteraEvent.js.
// 예고 없음(Terry 스펙 "갑자기 나타나"): 예정 시각이 되면 화면 한 모서리 바로 밖에서 튀어나와 반대편
// 모서리 쪽으로 사선을 따라 지그재그로 비틀거리며(4.2u/s, 핸들 발작·떨림) 화면을 지나간다.
// 크기는 11-07판의 7/15(11-13 Terry: 11-08판의 2배로 키웠다가 다시 30% 줄임 = 1.4배, 속도 1.5배 — 비주얼 그룹 scale = 판정 배율 SLTERA_SIZE_SCALE).
// 스테이지 프랍(책상·사물함 등, 좀비와 같은 장애물 OBB)에 부딪히면 뒤로 밀렸다가 방향을 바꿔 다시 달린다.
// 지나가는 길의 좀비를 무작위로 치고, 로자리와 겹치면 질주당 1회 최대 HP 15% 피해.
// 11-14: 등장하면 한 번 뛰어 옆으로 1회전하고 쿵 떨어진다. 차체는 단단하다 — 닿은 좀비·로자리는 박스 밖으로 밀려나고,
// 치인 좀비·로자리는 포물선을 그리며 날아간다(규칙·수치는 lib/slteraEvent.js '치여 날아가기' 절).
// 오너 치트 '슬테라 즉시 출현'(lib/slteraInstantSpawn.js)이 이 판의 수신기를 통해 질주를 바로 시작시킨다.
// 매 프레임 할당 없음: pass·스크래치·충돌 impact·비행 표 객체를 전부 ref로 재사용한다.
import { useEffect, useRef } from 'react'
import { usePlayingFrame } from '../lib/usePlayingFrame.js'
import { useGameStore } from '../store/useGameStore.js'
import { enemyPool, enemySimulationRuntime, playerPos, portalTarget, screenBounds } from '../lib/refs.js'
import { getRuntimeElapsedMs } from '../lib/gameRuntimeTime.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { emitEnemyHitScreenShake } from '../lib/criticalScreenShake.js'
import { createWeaponTargetScratch, resolveWeaponTarget, scanOrientedBoxEnemiesInto } from '../lib/weaponTargeting.js'
import { applyEnemyHit, isPointInOrientedBox2D } from '../lib/weaponCollision.js'
import { isBossType } from '../lib/burstEvents.js'
import { getStageBounds } from '../lib/stageConfig.js'
import { getPlayerMovementBounds } from '../lib/playerMovementBounds.js'
import { getStageObjectSightObstacles } from './StageObjects/stageObjectColliders.js'
import {
  SLTERA_BOSS_RADIUS, SLTERA_BOSS_SHOVE_DISTANCE, SLTERA_BOSS_SHOVE_SEC, SLTERA_DAMAGE_SOURCE, SLTERA_LANDING_SQUASH,
  SLTERA_PHASE, SLTERA_PLAYER_LAUNCH_DISTANCE, SLTERA_PLAYER_LAUNCH_SEC, SLTERA_PLAYER_RADIUS, SLTERA_SHOVE_DISTANCE,
  SLTERA_SHOVE_PEAK, SLTERA_SHOVE_SEC, SLTERA_SIZE_SCALE, SLTERA_SPECIAL_RADIUS, SLTERA_ZOMBIE_LAUNCH_DISTANCE,
  SLTERA_ZOMBIE_LAUNCH_PEAK, SLTERA_ZOMBIE_LAUNCH_SEC, SLTERA_ZOMBIE_RADIUS, addSlteraLaunch, beginSlteraPass,
  bumpSlteraOffBody, checkSlteraPlayerHit, claimSlteraThud, consumeSlteraLandingThud, consumeSlteraPassStart,
  createSlteraLaunchTable, createSlteraRunState, getSlteraLandingSquash, getSlteraSweepBox,
  hasSlteraRolled, isSlteraBodySolid, isSlteraPointOnScreen, planSlteraLaunchInto, pushOutOfSlteraBody, pushOutOfSlteraBodyWithin,
  removeSlteraLaunchAt, requestSlteraInstantPassOn, rollSlteraRunOver, slteraPlayerLaunch, startSlteraPlayerLaunch,
  stepSlteraLaunchTable, stepSlteraPass,
} from '../lib/slteraEvent.js'
import { registerSlteraInstantSpawnTarget } from '../lib/slteraInstantSpawn.js'
import SlteraCar from './SlteraCar.jsx'

// 등장 점프의 옆 1회전 축 높이(차량 로컬 단위 — 차체 몸통 가운데, 바닥 0.2 ~ 지붕 0.77). 바깥 그룹만 돌린다.
const SLTERA_ROLL_PIVOT_Y = 0.45
const ARENA_WALL_INSET = 0.6 // 좀비 플레이필드 = 스테이지 경계에서 벽 두께만큼 안쪽(아래 arena는 몸 반경까지 뺀 '중심' 한계)

// 넉백 경로용 impact: 맞는 자리에서 dir 반대쪽 1u를 source로 두면 기존 경로가 dir 방향으로 민다.
function setImpactToward(impact, x, z, dirX, dirZ, distance, sec) {
  impact.source.x = x - dirX
  impact.source.z = z - dirZ
  impact.knockback = sec > 0 ? distance / sec : 0
  impact.knockbackMs = sec * 1000
  return impact
}

export default function SlteraEvent({ stageId, gameKey }) {
  const carRef = useRef(null)
  const rollRef = useRef(null)
  // SlteraCar의 예고 맥동 입력. 게임에서는 예고가 없으므로 항상 -1(평시 라이트).
  const telegraphRef = useRef(-1)
  const state = useRef(null)
  if (state.current === null) {
    const { halfX, halfZ } = getStageBounds(stageId)
    state.current = {
      run: createSlteraRunState(),
      scratch: createWeaponTargetScratch(),
      box: { centerX: 0, centerZ: 0, yaw: 0, halfWidth: 0, halfDepth: 0 },
      // 차는 플레이어 무기가 아니다 — 로자리 시야(사선) 가림과 무관하게 친다.
      impact: { source: { x: 0, z: 0 }, knockback: 0, knockbackMs: 0, ignoreSightBlock: true },
      landingImpact: { source: { x: 0, z: 0 }, knockback: 0, knockbackMs: 0, ignoreSightBlock: true },
      contact: { x: 0, z: 0, nx: 0, nz: 0 },
      dir: { x: 0, z: 0, distance: 0 },
      playerT: { x: 0, y: 0, z: 0 },
      launches: createSlteraLaunchTable(),
      // 밀어내기·날리기 한계는 모두 몸 '중심'이 있을 수 있는 범위다. 로자리는 이동 한계(Player의 clamp)가 이미 중심 한계.
      arena: {
        minX: -halfX + ARENA_WALL_INSET + SLTERA_ZOMBIE_RADIUS, maxX: halfX - ARENA_WALL_INSET - SLTERA_ZOMBIE_RADIUS,
        minZ: -halfZ + ARENA_WALL_INSET + SLTERA_ZOMBIE_RADIUS, maxZ: halfZ - ARENA_WALL_INSET - SLTERA_ZOMBIE_RADIUS,
      },
      playerBounds: getPlayerMovementBounds(stageId),
    }
  }

  // 슬테라 즉시 출현(오너 치트) 수신기 — 이 판이 살아 있는 동안만. 질주 중 탭은 무시된다.
  useEffect(() => registerSlteraInstantSpawnTarget(() => requestSlteraInstantPassOn(state.current.run)), [])
  // 판이 끝나 내려갈 때 날던 좀비를 바닥 높이로 돌려놓는다(착지 피해는 버린다).
  useEffect(() => () => {
    const table = state.current.launches
    for (let i = 0; i < table.count; i += 1) {
      if (enemyPool.isIndexGenerationAlive(table.index[i], table.generation[i])) enemyPool.posY[table.index[i]] = table.baseY[i]
    }
    table.count = 0
  }, [])

  // STUDIO_OUTER_MOTION_ONLY — 이 프레임 훅은 SlteraCar를 감싼 바깥 그룹(위치·방향·점프 높이·착지 눌림)과
  // 회전축 그룹(옆 1회전)만 움직인다. SlteraCar 안쪽 파츠는 건드리지 않는다.
  usePlayingFrame((_, delta) => {
    const s = state.current
    const pass = s.run.pass
    const elapsedMs = getRuntimeElapsedMs()

    // 치인 풀 좀비의 비행(차가 떠난 뒤에도 끝까지): 비주얼 높이만 올리고, 착지하면 바닥으로 — 치기 피해는 이때 들어간다
    // (죽는 좀비는 날아간 뒤 착지 자리에서 부서진다).
    const launches = s.launches
    stepSlteraLaunchTable(launches, delta)
    for (let i = launches.count - 1; i >= 0; i -= 1) {
      const index = launches.index[i]
      const generation = launches.generation[i]
      if (!enemyPool.isIndexGenerationAlive(index, generation)) { removeSlteraLaunchAt(launches, i); continue }
      if (!launches.done[i]) { enemyPool.posY[index] = launches.baseY[i] + launches.height[i]; continue }
      enemyPool.posY[index] = launches.baseY[i]
      const damage = launches.damage[i]
      removeSlteraLaunchAt(launches, i)
      if (damage > 0) {
        s.landingImpact.source.x = enemyPool.posX[index]
        s.landingImpact.source.z = enemyPool.posZ[index]
        applyEnemyHit(enemyPool.proxies[index], generation, damage, s.landingImpact)
      }
    }

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
        car.scale.setScalar(SLTERA_SIZE_SCALE)
        car.visible = true
      }
      // 튀어나오는 순간의 돌진음(전용 엔진음 없음 — soundmini 검토 대상). 차가 화면 바로 밖에서 출발하므로
      // 사전 예고가 아니라 등장음이다.
      emitSfx({ id: 'sharkFire', volume: 0.55, rate: 1.25 })
    }

    stepSlteraPass(pass, delta * 1000, playerPos.x, playerPos.z, screenBounds)

    // 등장 점프 착지 — 쿵(치기 쿵과 같은 소리·같은 150ms 간격 제한, 더 무겁게) + 기존 피격 화면 흔들림(감소 모션·
    // 흔들림 설정을 그대로 따른다). 같은 프레임의 치기 쿵은 간격 제한에 막혀 겹치지 않는다.
    if (consumeSlteraLandingThud(pass, elapsedMs)) {
      emitSfx({ id: 'zombieGiantThud', volume: 0.8, rate: 0.85 })
      if (isSlteraPointOnScreen(screenBounds, pass.x, pass.z)) emitEnemyHitScreenShake(pass.x - playerPos.x, pass.z - playerPos.z)
    }

    // 좀비 — 땅 위의 차(공중 점프 중이 아님)는 단단하다. 이번 프레임 쓸고 간 박스(몸 반경만큼 넓힘)에 닿은 적마다:
    //   풀 좀비: 박스 밖으로 밀어내고, 이번 질주에서 처음 닿았으면(차 중심이 화면 안일 때) 치기를 굴려 날린다.
    //   물리 몸체 적(보스·특수 적): 차가 장애물처럼 밀려나 튕기고, 치기 성공이면 기존 넉백 경로로 밀린다.
    const box = s.box
    if (pass.swept && isSlteraBodySolid(pass)) {
      const onScreen = getSlteraSweepBox(pass, box, screenBounds)
      const scratch = s.scratch
      // 가장 큰 몸(보스) 반경만큼 넓혀 훑고, 적마다 자기 몸 반경으로 다시 거른다.
      const count = scanOrientedBoxEnemiesInto(scratch, box.centerX, box.centerZ, box.yaw, box.halfWidth + SLTERA_BOSS_RADIUS, box.halfDepth + SLTERA_BOSS_RADIUS)
      const contact = s.contact
      const dir = s.dir
      let ranOver = false
      let moved = false
      for (let i = 0; i < count; i += 1) {
        const special = scratch.special[i]
        const index = scratch.indices[i]
        const generation = special ? (scratch.generations[i] || null) : scratch.generations[i]
        const rb = special ?? resolveWeaponTarget(index, generation, null)
        if (!rb) continue
        const type = rb._enemyType
        if (special) {
          const t = rb.translation?.()
          if (!t) continue
          const boss = isBossType(type)
          const radius = boss ? SLTERA_BOSS_RADIUS : SLTERA_SPECIAL_RADIUS
          if (!isPointInOrientedBox2D(box.centerX, box.centerZ, box.yaw, box.halfWidth + radius, box.halfDepth + radius, t.x, t.z)) continue
          pushOutOfSlteraBody(pass, t.x, t.z, radius, contact)
          const fresh = onScreen && !hasSlteraRolled(pass, index, generation, special)
          const damage = fresh ? rollSlteraRunOver(pass, index, generation, special, type) : 0
          if (damage > 0) {
            const distance = boss ? SLTERA_BOSS_SHOVE_DISTANCE : SLTERA_ZOMBIE_LAUNCH_DISTANCE
            const sec = boss ? SLTERA_BOSS_SHOVE_SEC : SLTERA_ZOMBIE_LAUNCH_SEC
            planSlteraLaunchInto(pass, t.x, t.z, contact.nx, contact.nz, distance, radius, pass.obstacles, s.arena, null, dir)
            if (applyEnemyHit(rb, generation, damage, setImpactToward(s.impact, t.x, t.z, dir.x, dir.z, dir.distance, sec))) ranOver = true
          }
          // 물리 몸체는 차가 대신 밀려난다(몸을 순간이동시키지 않는다).
          bumpSlteraOffBody(pass, t.x, t.z, radius)
          continue
        }
        const x = enemyPool.posX[index]
        const z = enemyPool.posZ[index]
        if (!isPointInOrientedBox2D(box.centerX, box.centerZ, box.yaw, box.halfWidth + SLTERA_ZOMBIE_RADIUS, box.halfDepth + SLTERA_ZOMBIE_RADIUS, x, z)) continue
        if (pushOutOfSlteraBodyWithin(pass, x, z, SLTERA_ZOMBIE_RADIUS, s.arena, contact)) {
          enemyPool.posX[index] = contact.x
          enemyPool.posZ[index] = contact.z
          moved = true
        }
        if (!onScreen || hasSlteraRolled(pass, index, generation, null)) continue
        const damage = rollSlteraRunOver(pass, index, generation, null, type)
        const hit = damage > 0
        const distance = hit ? SLTERA_ZOMBIE_LAUNCH_DISTANCE : SLTERA_SHOVE_DISTANCE
        const sec = hit ? SLTERA_ZOMBIE_LAUNCH_SEC : SLTERA_SHOVE_SEC
        planSlteraLaunchInto(pass, contact.x, contact.z, contact.nx, contact.nz, distance, SLTERA_ZOMBIE_RADIUS, pass.obstacles, s.arena, null, dir)
        const planned = dir.distance
        // 수평 이동 = 기존 넉백 경로(속도·시간, 매 step 프랍·경계 충돌). 피해 0으로 걸고 피해는 착지 때.
        enemySimulationRuntime.applyHitIndex(enemyPool, index, generation, 0, dir.x * planned / sec, dir.z * planned / sec, sec * 1000)
        const slot = addSlteraLaunch(launches, index, generation, enemyPool.posY[index], sec, hit ? SLTERA_ZOMBIE_LAUNCH_PEAK : SLTERA_SHOVE_PEAK, damage)
        if (slot < 0 && hit) {
          s.landingImpact.source.x = contact.x
          s.landingImpact.source.z = contact.z
          applyEnemyHit(rb, generation, damage, s.landingImpact) // 비행 표가 가득 — 피해만 바로
        }
        if (hit) ranOver = true
      }
      if (moved) enemyPool.markSpatialChanged()
      // 쿵 소리는 게임 시간 150ms에 한 번 — 무리를 쓸고 가면 연속 프레임마다 쳐서 쿵이 쌓이고 클리핑했다.
      // 런 시계(elapsedMs)로 잰다: 일시정지 중엔 흐르지 않고, 한 렌더 프레임에 몰아 도는 고정 스텝끼리는
      // 같은 값이라 프레임 끊김 뒤 따라잡기 스텝에서도 한꺼번에 여러 번 울리지 않는다.
      if (ranOver && claimSlteraThud(pass, elapsedMs)) emitSfx({ id: 'zombieGiantThud', volume: 0.6, rate: 1.1 })
    }

    // 로자리 — 피해는 질주당 1회(무적 판정은 damagePlayer의 일반 규칙). 첫 접촉에 날아가고(조작 정지·다시 안 맞음),
    // 그 뒤 접촉은 박스 밖으로 밀려나기만 한다.
    if (pass.swept && isSlteraBodySolid(pass)) {
      const live = useGameStore.getState()
      const wasHit = pass.playerHit
      const hit = checkSlteraPlayerHit(pass, playerPos.x, playerPos.z, live.player?.maxHp ?? 0)
      const contact = s.contact
      // 차와 벽 사이에 끼면 벽을 따라 옆으로 빠진다(이동 한계 밖으로 밀면 Player의 clamp가 차 안으로 되돌린다).
      const pushed = pushOutOfSlteraBodyWithin(pass, playerPos.x, playerPos.z, SLTERA_PLAYER_RADIUS, s.playerBounds, contact)
      const body = slteraPlayerLaunch.body
      if (pushed) {
        playerPos.x = contact.x
        playerPos.z = contact.z
        const t = body?.translation?.()
        if (t) {
          s.playerT.x = contact.x; s.playerT.y = t.y; s.playerT.z = contact.z
          body.setTranslation(s.playerT, true)
        }
      }
      if (!wasHit && pass.playerHit) {
        const dir = s.dir
        planSlteraLaunchInto(pass, contact.x, contact.z, contact.nx, contact.nz, SLTERA_PLAYER_LAUNCH_DISTANCE, SLTERA_PLAYER_RADIUS, pass.obstacles, s.playerBounds, portalTarget, dir)
        startSlteraPlayerLaunch(slteraPlayerLaunch, dir.x, dir.z, dir.distance)
        body?._applyKnockback?.(slteraPlayerLaunch.vx, slteraPlayerLaunch.vz, SLTERA_PLAYER_LAUNCH_SEC * 1000)
      }
      if (hit > 0) live.damagePlayer(hit, { source: SLTERA_DAMAGE_SOURCE })
    }

    const car = carRef.current
    if (car) {
      car.position.x = pass.x
      car.position.z = pass.z
      car.position.y = pass.jumpHeight
      car.rotation.y = pass.heading // 지그재그로 꺾일 때도 늘 진행 방향을 본다
      // 착지 눌림: 바닥(그룹 원점) 기준으로 세로로 눌리고 가로로 퍼졌다가 가라앉는다.
      const squash = getSlteraLandingSquash(pass) * SLTERA_LANDING_SQUASH
      car.scale.set(SLTERA_SIZE_SCALE * (1 + squash * 0.5), SLTERA_SIZE_SCALE * (1 - squash), SLTERA_SIZE_SCALE * (1 + squash * 0.5))
      if (pass.phase === SLTERA_PHASE.DONE) car.visible = false
    }
    const roll = rollRef.current
    if (roll) roll.rotation.z = pass.jumpRollSign * pass.jumpRoll // 진행축(차 앞뒤) 옆 1회전, 착지 뒤 2π = 똑바로
  })

  return (
    <group ref={carRef} visible={false} scale={SLTERA_SIZE_SCALE}>
      <group ref={rollRef} position={[0, SLTERA_ROLL_PIVOT_Y, 0]}>
        <group position={[0, -SLTERA_ROLL_PIVOT_Y, 0]}>
          <SlteraCar telegraphRef={telegraphRef} />
        </group>
      </group>
    </group>
  )
}
