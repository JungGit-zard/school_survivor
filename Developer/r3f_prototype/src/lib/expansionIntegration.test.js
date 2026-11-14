import { afterEach, describe,it,expect } from 'vitest'
import { readFileSync } from 'node:fs'

it('mounts authoritative hazard registry exactly once in GameCanvas and retains Game cleanup',()=>{
 const game=readFileSync(new URL('../components/Game.jsx',import.meta.url),'utf8')
 const canvas=readFileSync(new URL('../components/GameCanvas.jsx',import.meta.url),'utf8')
 expect(game.match(/<ExpansionHazardLayer\b/g)??[]).toHaveLength(0)
 expect(canvas.match(/<ExpansionHazardLayer\b/g)??[]).toHaveLength(1)
 expect(canvas).toContain('events={expansionAttackSnapshots}')
 expect(game).toContain("if (useGameStore.getState().phase === 'playing') {\n      runGameplayFixedSteps")
 expect(game).toContain('advanceRuntimeTime(fixedDelta * 1000)')
 expect(game).toContain('return clearExpansionAttacks')
 expect(game).toContain("phase==='gameover'||phase==='cleared'")
})
import { EXPANSION_STAGES,EXPANSION_ENEMIES,EXPANSION_BOSSES,EXPANSION_BEHAVIORS } from './expansionContent.js'
import { buildExpansionBurstBatch, stageHpOverride, shouldDropTextbook, getEliteBonusTextbookXp, ELITE_BONUS, overtimeHpStatOverride } from '../components/Enemies.jsx'
import { createEnemyEntityPool } from './enemyEntityPool.js'
import { createEnemySimulationRuntime,ENEMY_RUNTIME_DAMAGE,ENEMY_RUNTIME_CONTACT_DIST,ENEMY_RUNTIME_SCALE,ENEMY_RUNTIME_XP } from './enemySimulation.js'
import { createExpansionAttackState,stepExpansionAttack,expansionAttackSnapshots,clearExpansionAttacks } from './expansionAttackRuntime.js'
import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'
import { getStageObjectColliders } from '../components/StageObjects/stageObjectColliders.js'
import { getStageObjectSightObstacles } from '../components/StageObjects/stageObjectColliders.js'
import { ENEMY_STATS } from '../components/Enemy.jsx'
import { getRuntimeSpawnEventsForStage } from './burstEvents.js'
import { playerPos } from './refs.js'
import { getStageBounds } from './stageConfig.js'
const randomSeed=()=>{let x=777;return()=>((x=Math.imul(x,1664525)+1013904223)>>>0)/4294967296}
afterEach(clearExpansionAttacks)
const args=(deltaMs=2500)=>({deltaMs,playing:true,alive:true,gameKey:1,x:0,z:0,playerX:0,playerZ:.5,hpRatio:1})
describe('expansion real integrations',()=>{
 // 2026-11-08: stage6(운동장)은 경계 12×20, 줄(assembly_row)·트랙(track_lanes) 포메이션, 보스 앵커(조회대 앞 (0,−17)),
 // 일반 적 190마리를 쓴다. 링 거리(8.5u) 규칙은 포메이션 없는 행에만 적용한다. stage7~10은 기존 그대로.
 it.each(Object.values(EXPANSION_STAGES))('$id safe scheduled events reach actual pool and special boss route without fallback',stage=>{
  const cache={id:stage.id,bounds:stage.id==='stage6'?getStageBounds('stage6'):{halfX:7.5,halfZ:19.2},obstacles:getStageObjectSightObstacles(stage.id)}
  const expectedNormal=stage.events.filter(e=>!e.type.startsWith('B')).reduce((n,e)=>n+e.count,0)
  let pool=createEnemyEntityPool();const random=randomSeed();let bossCount=0,normal=0,coin=0
  const saved=playerPos.clone();playerPos.set(0,0,0)
  try{for(const evt of getRuntimeSpawnEventsForStage(stage.id)){
   // stage6은 일반 적이 190마리라 한 풀(150)에 다 안 들어간다 — 실제 게임은 동시 천장이 자른다. 테스트 풀은 차면 새로 쓴다.
   if(pool.activeCount>130){expect(pool.validateInvariants()).toBe(true);pool=createEnemyEntityPool()}
   const batch=buildExpansionBurstBatch(cache,evt,{pooledActive:0,specialActive:0,pooledQueued:0},random)
   expect(batch.length).toBeGreaterThan(0)
   const minDistance=row=>row.type.startsWith('B')?5.999:evt.formation==='assembly_row'?3:evt.formation==='track_lanes'?4:8.499
   for(const row of batch){expect(row.pos.every(Number.isFinite)).toBe(true);expect(Math.hypot(row.pos[0],row.pos[2])).toBeGreaterThanOrEqual(minDistance(row))
    if(row.type.startsWith('B')){bossCount++;continue}
    expect(pool.spawn({type:row.type,hp:row.statOverride?.hp??ENEMY_STATS[row.type].hp,maxHp:row.statOverride?.hp??ENEMY_STATS[row.type].hp,x:row.pos[0],z:row.pos[2],spawnTimer:300})).toBeTruthy()
    row.type==='E08'?coin++:normal++
   }
  }}finally{playerPos.copy(saved)}
  expect(bossCount).toBe(1);expect(coin).toBe(2);expect(normal).toBeLessThanOrEqual(expectedNormal);expect(normal).toBeGreaterThan(expectedNormal*.9)
  expect(pool.validateInvariants()).toBe(true)
  expect(buildExpansionBurstBatch(cache,{type:stage.enemyIds[0],count:20},{pooledActive:147,specialActive:1,pooledQueued:2},random)).toEqual([])
  expect(buildExpansionBurstBatch(cache,{type:stage.enemyIds[0],count:20},{pooledActive:147,specialActive:1,pooledQueued:1},random)).toHaveLength(1)
 })
 // stage6 운동장은 solid가 축구 골대 2개뿐인 개방지다(중앙 안전지대 규칙 없음, 스펙 Part C C-3-4). stage7~10은 4개·중앙 비움 그대로.
 it('keeps actual physical/sight blockers on every new map (4 + clear centre for 7-10, 2 goals for the stage6 schoolyard)',()=>{
  for(const stage of Object.values(EXPANSION_STAGES)){
   const count=stage.id==='stage6'?2:4
   // stage6은 퀘스트 의뢰 학생 2명(비 solid)이 배치에 더해진다(2026-11-13). solid·시야 장애물 수는 골대 2개 그대로.
   const placements=getStageObjectPlacements(stage.id).filter(p=>p.type==='expansionObstacle');expect(placements).toHaveLength(count)
   expect(getStageObjectColliders(stage.id)).toHaveLength(count);expect(getStageObjectSightObstacles(stage.id)).toHaveLength(count)
   if(stage.id==='stage6'){expect(placements.map(p=>[p.position[0],p.position[2]])).toEqual([[0,-11],[0,11]]);expect(getStageObjectPlacements(stage.id).filter(p=>p.type==='unconsciousStudent').map(p=>p.id)).toEqual(['stage6-student-relay-east','stage6-student-roll-west']);continue}
   expect(getStageObjectPlacements(stage.id)).toHaveLength(count)
   for(const p of placements)expect(Math.abs(p.position[0])-p.props.halfX).toBeGreaterThanOrEqual(2)
  }
 })
 it('keeps absolute new stats, normal 30-percent drops and exact boss gold/XP',()=>{
  for(const e of Object.values(EXPANSION_ENEMIES)){
   const c=e.typeCode;expect(ENEMY_STATS[e.id].hp).toBe(e.hp);expect(stageHpOverride(e.id,e.stageId)).toBeUndefined()
   expect(ENEMY_RUNTIME_DAMAGE[c]).toBe(e.contactDamage);expect(ENEMY_RUNTIME_CONTACT_DIST[c]).toBeCloseTo(e.contactDistUnits);expect(ENEMY_RUNTIME_SCALE[c]).toBeCloseTo(e.scale);expect(ENEMY_RUNTIME_XP[c]).toBe(e.xpPerTextbook)
   // 평시(120초 이후) 30%. 초반 2분은 전 스테이지 공통 ×2 부스트(2026-08-24)를 확장 적도 똑같이 받는다 → 60%.
   expect(shouldDropTextbook({type:e.id,xp:e.xpPerTextbook},.299,120)).toBe(true);expect(shouldDropTextbook({type:e.id,xp:e.xpPerTextbook},.3,120)).toBe(false)
   expect(shouldDropTextbook({type:e.id,xp:e.xpPerTextbook},.599,0)).toBe(true);expect(shouldDropTextbook({type:e.id,xp:e.xpPerTextbook},.6,0)).toBe(false)
  }
  // 보스 보상은 데이터 그대로(B05 교장 4권 × 45 XP, 골드 10 / B06~B09 3 × 40).
  for(const b of Object.values(EXPANSION_BOSSES)){expect(ELITE_BONUS[b.id]).toEqual({gold:b.gold,textbook:b.textbooks,textbookXp:b.textbookXp});expect(getEliteBonusTextbookXp(b.id,0)).toBe(b.textbookXp)}
  expect(ELITE_BONUS.B05).toEqual({gold:10,textbook:4,textbookXp:45})
 })
 it('waits for attack completion before one HP50 transition, preserves windup duration',()=>{
  const s=createExpansionAttackState('B05','transition',1);stepExpansionAttack(s,args());const first=s.snapshot
  stepExpansionAttack(s,{...args(100),hpRatio:.4});expect(s.snapshot).toBe(first);expect(s.enrageRemainingMs).toBe(0)
  stepExpansionAttack(s,{...args(4000),hpRatio:.4});stepExpansionAttack(s,{...args(1),hpRatio:.4});expect(s.enrageRemainingMs).toBeGreaterThan(0)
  stepExpansionAttack(s,{...args(1500),hpRatio:.4});expect(s.enraged).toBe(true)
  stepExpansionAttack(s,{...args(6000),hpRatio:.4});expect(s.snapshot.windupMs).toBe(EXPANSION_BOSSES.B05.patterns[s.snapshot.patternId==='b05_p1'?0:1].windupMs)
 })
 // 2026-11-08: E21이 lob(사거리 형) → dash(계주 바통, 발동 1.4u)로 바뀌어 같은 규칙을 dash 사거리로 본다.
 it('does not start special attacks outside authored trigger distance',()=>{
  const s=createExpansionAttackState('E21','range',1)
  expect(EXPANSION_BEHAVIORS[EXPANSION_ENEMIES.E21.behaviorId].rangeUnits).toBe(1.4)
  stepExpansionAttack(s,{...args(),playerZ:3});expect(s.snapshot).toBe(null)
  stepExpansionAttack(s,{...args(1),playerZ:1.2});expect(s.snapshot.targetXZ).toEqual([0,1.2])
 })
 it('resets pooled warnings synchronously and pool reuse cannot retain an old attack',()=>{
  const pool=createEnemyEntityPool(),runtime=createEnemySimulationRuntime()
  const h=pool.spawn({type:'E23',x:0,z:1,spawnTimer:300,hp:88,maxHp:88})
  const context={delta:1/60,playerX:0,playerZ:0,halfX:7.5,halfZ:19.2,elapsedSec:10}
  for(let i=0;i<155;i++)runtime.step(pool,context)
  expect(expansionAttackSnapshots.size).toBe(1);runtime.reset();expect(expansionAttackSnapshots.size).toBe(0)
  runtime.step(pool,context);expect(expansionAttackSnapshots.size).toBe(0)
  runtime.applyHit(pool,h,999);expect(pool.activeCount).toBe(0)
 })
})
