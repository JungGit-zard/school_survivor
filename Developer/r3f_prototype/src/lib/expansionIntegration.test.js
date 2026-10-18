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
const randomSeed=()=>{let x=777;return()=>((x=Math.imul(x,1664525)+1013904223)>>>0)/4294967296}
afterEach(clearExpansionAttacks)
const args=(deltaMs=2500)=>({deltaMs,playing:true,alive:true,gameKey:1,x:0,z:0,playerX:0,playerZ:.5,hpRatio:1})
describe('expansion real integrations',()=>{
 it.each(Object.values(EXPANSION_STAGES))('$id safe scheduled events reach actual pool and special boss route without fallback',stage=>{
  const cache={id:stage.id,bounds:{halfX:7.5,halfZ:19.2},obstacles:getStageObjectSightObstacles(stage.id)}
  const pool=createEnemyEntityPool(),random=randomSeed();let bossCount=0,normal=0,coin=0
  const saved=playerPos.clone();playerPos.set(0,0,0)
  try{for(const evt of getRuntimeSpawnEventsForStage(stage.id)){
   const batch=buildExpansionBurstBatch(cache,evt,{pooledActive:0,specialActive:0,pooledQueued:0},random)
   expect(batch.length).toBeGreaterThan(0)
   for(const row of batch){expect(row.pos.every(Number.isFinite)).toBe(true);expect(Math.hypot(row.pos[0],row.pos[2])).toBeGreaterThanOrEqual(row.type.startsWith('B')?5.999:8.499)
    if(row.type.startsWith('B')){bossCount++;continue}
    expect(pool.spawn({type:row.type,hp:row.statOverride?.hp??ENEMY_STATS[row.type].hp,maxHp:row.statOverride?.hp??ENEMY_STATS[row.type].hp,x:row.pos[0],z:row.pos[2],spawnTimer:300})).toBeTruthy()
    row.type==='E08'?coin++:normal++
   }
  }}finally{playerPos.copy(saved)}
  expect(bossCount).toBe(1);expect(coin).toBe(2);expect(normal).toBeLessThanOrEqual(100);expect(normal).toBeGreaterThan(90)
  expect(pool.validateInvariants()).toBe(true)
  expect(buildExpansionBurstBatch(cache,{type:stage.enemyIds[0],count:20},{pooledActive:147,specialActive:1,pooledQueued:2},random)).toEqual([])
  expect(buildExpansionBurstBatch(cache,{type:stage.enemyIds[0],count:20},{pooledActive:147,specialActive:1,pooledQueued:1},random)).toHaveLength(1)
 })
 it('keeps 4 actual physical/sight blockers on every new map without blocking center',()=>{
  for(const stage of Object.values(EXPANSION_STAGES)){
   const placements=getStageObjectPlacements(stage.id);expect(placements).toHaveLength(4)
   expect(getStageObjectColliders(stage.id)).toHaveLength(4);expect(getStageObjectSightObstacles(stage.id)).toHaveLength(4)
   for(const p of placements)expect(Math.abs(p.position[0])-p.props.halfX).toBeGreaterThanOrEqual(2)
  }
 })
 it('keeps absolute new stats, normal 30-percent drops and exact boss gold/XP',()=>{
  for(const e of Object.values(EXPANSION_ENEMIES)){
   const c=e.typeCode;expect(ENEMY_STATS[e.id].hp).toBe(e.hp);expect(stageHpOverride(e.id,e.stageId)).toBeUndefined()
   expect(ENEMY_RUNTIME_DAMAGE[c]).toBe(e.contactDamage);expect(ENEMY_RUNTIME_CONTACT_DIST[c]).toBeCloseTo(e.contactDistUnits);expect(ENEMY_RUNTIME_SCALE[c]).toBeCloseTo(e.scale);expect(ENEMY_RUNTIME_XP[c]).toBe(e.xpPerTextbook)
   expect(shouldDropTextbook({type:e.id,xp:e.xpPerTextbook},.299,0)).toBe(true);expect(shouldDropTextbook({type:e.id,xp:e.xpPerTextbook},.3,0)).toBe(false)
  }
  for(const b of Object.values(EXPANSION_BOSSES)){expect(ELITE_BONUS[b.id]).toEqual({gold:b.gold,textbook:3,textbookXp:40});expect(getEliteBonusTextbookXp(b.id,0)).toBe(40)}
 })
 it('waits for attack completion before one HP50 transition, preserves windup duration',()=>{
  const s=createExpansionAttackState('B05','transition',1);stepExpansionAttack(s,args());const first=s.snapshot
  stepExpansionAttack(s,{...args(100),hpRatio:.4});expect(s.snapshot).toBe(first);expect(s.enrageRemainingMs).toBe(0)
  stepExpansionAttack(s,{...args(4000),hpRatio:.4});stepExpansionAttack(s,{...args(1),hpRatio:.4});expect(s.enrageRemainingMs).toBeGreaterThan(0)
  stepExpansionAttack(s,{...args(1500),hpRatio:.4});expect(s.enraged).toBe(true)
  stepExpansionAttack(s,{...args(6000),hpRatio:.4});expect(s.snapshot.windupMs).toBe(1600)
 })
 it('does not start ranged attacks outside authored trigger distance',()=>{
  const s=createExpansionAttackState('E21','range',1)
  stepExpansionAttack(s,{...args(),playerZ:7});expect(s.snapshot).toBe(null)
  stepExpansionAttack(s,{...args(1),playerZ:3});expect(s.snapshot.targetXZ).toEqual([0,3])
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
