import { describe, it, expect } from 'vitest'
import { EXPANSION_STAGES, EXPANSION_ENEMIES, EXPANSION_BOSSES, getExpansionStats } from './expansionContent.js'
import { createExpansionAttackState, stepExpansionAttack, expansionAttackContains, expansionAttackSnapshots, clearExpansionAttacks } from './expansionAttackRuntime.js'
import { createEnemyEntityPool, enemyTypeToCode } from './enemyEntityPool.js'
import { createEnemySimulationRuntime, ENEMY_RUNTIME_HP, ENEMY_RUNTIME_SPEED } from './enemySimulation.js'
import { getNextStageId, isStageUnlocked, getStageConfig, isStageVisible } from './stageConfig.js'
import { getRuntimeSpawnEventsForStage } from './burstEvents.js'

describe('expansion live gameplay', () => {
 it('registers exact counts, append-only codes and absolute stats', () => {
  expect(Object.keys(EXPANSION_STAGES)).toHaveLength(5)
  expect(Object.keys(EXPANSION_ENEMIES)).toHaveLength(15)
  expect(Object.keys(EXPANSION_BOSSES)).toHaveLength(5)
  Object.values(EXPANSION_ENEMIES).forEach((e,i)=>{
   expect(enemyTypeToCode(e.id)).toBe(17+i)
   expect(ENEMY_RUNTIME_HP[17+i]).toBeCloseTo(e.hp)
   expect(ENEMY_RUNTIME_SPEED[17+i]).toBeCloseTo(e.speedUnitsPerSec)
   expect(getExpansionStats(e.id).hp).toBe(e.hp)
  })
  Object.values(EXPANSION_BOSSES).forEach((b,i)=>expect(enemyTypeToCode(b.id)).toBe(32+i))
 })
 it('chains 5-10 by previous-stage boss proof while the release boundary hides navigation',()=>{
  const nav=(id,next)=>isStageVisible(id)&&isStageVisible(next)?next:null
  // Release entry boundary (a8ddfe0c, 1fcfc848) hides next-stage navigation into unreleased stages.
  expect(getNextStageId('stage5')).toBe(nav('stage5','stage6'))
  expect(getNextStageId('stage6')).toBe(nav('stage6','stage7'))
  expect(getNextStageId('stage10')).toBe(null)
  // f8a0ee89: only the previous stage's boss defeat unlocks; escape clears never do.
  expect(isStageUnlocked('stage6',{})).toBe(false)
  expect(isStageUnlocked('stage6',{stage5Clears:1})).toBe(false)
  expect(isStageUnlocked('stage6',{stage5BossDefeats:1})).toBe(true)
  for(let n=7;n<=10;n++) expect(isStageUnlocked(`stage${n}`,{[`stage${n-1}BossDefeats`]:1})).toBe(true)
  expect(getStageConfig('stage5').bossType).toBe('B03')
  for(const s of Object.values(EXPANSION_STAGES)) {
   expect(getStageConfig(s.id).bossType).toBe(s.bossId)
   const events=getRuntimeSpawnEventsForStage(s.id)
   expect(events.filter(e=>e.type===s.bossId)).toEqual([{sec:150,type:s.bossId,count:1}])
   expect(events.filter(e=>e.type==='E08').map(e=>e.sec)).toEqual([90,180])
  }
 })
 it('all 15 pooled enemies survive simulation and move with real HP',()=>{
  const pool=createEnemyEntityPool(), rt=createEnemySimulationRuntime()
  for(const e of Object.values(EXPANSION_ENEMIES)) pool.spawn({type:e.id,hp:e.hp,maxHp:e.hp,x:4,z:8,spawnTimer:300})
  rt.step(pool,{delta:1/60,playerX:0,playerZ:0,halfX:7.5,halfZ:19.2,elapsedSec:2})
  expect(pool.activeCount).toBe(15)
  for(let i=0;i<=pool.highestActive;i++) if(pool.active[i]) expect(Math.hypot(pool.velX[i],pool.velZ[i])).toBeGreaterThan(0)
  const i=pool.nextActiveIndex(),generation=pool.generation[i]
  rt.applyHitIndex(pool,i,generation,99999,0,0,0)
  expect(pool.active[i]).toBe(0)
  expect(pool.activeCount).toBe(14)
 })
 it('boss attack snapshots lock, pause, hit once and clear on death/reset',()=>{
  clearExpansionAttacks()
  const state=createExpansionAttackState('B06','boss',1)
  const args={deltaMs:2500,playing:true,alive:true,gameKey:1,x:0,z:0,playerX:1,playerZ:2,hpRatio:1}
  stepExpansionAttack(state,args)
  expect(state.snapshot.targetXZ).toEqual([1,2])
  expect(state.snapshot.phase).toBe('windup')
  const snap=state.snapshot
  stepExpansionAttack(state,{...args,deltaMs:9999,playing:false,playerX:6})
  expect(state.snapshot).toBe(snap)
  expect(state.snapshot.elapsedMs).toBe(0)
  expect(stepExpansionAttack(state,{...args,deltaMs:1400}).damage).toBe(20)
  expect(stepExpansionAttack(state,{...args,deltaMs:10}).damage).toBe(0)
  stepExpansionAttack(state,{...args,deltaMs:0,alive:false})
  expect(expansionAttackSnapshots.size).toBe(0)
  expect(state.snapshot).toBe(null)
  clearExpansionAttacks()
 })
 it('executes both distinct patterns per boss with interior ring safe and edge hit',()=>{
  clearExpansionAttacks()
  for(const boss of Object.values(EXPANSION_BOSSES)) {
   expect(boss.patterns).toHaveLength(2)
   const s=createExpansionAttackState(boss.id,boss.id,1)
   const args={deltaMs:2500,playing:true,alive:true,gameKey:1,x:0,z:0,playerX:0,playerZ:1,hpRatio:1}
   stepExpansionAttack(s,args)
   expect(s.snapshot.patternId).toBe(boss.patterns[0].id)
   stepExpansionAttack(s,{...args,deltaMs:10000})
   stepExpansionAttack(s,{...args,deltaMs:10000})
   expect(s.snapshot.patternId).toBe(boss.patterns[1].id)
   if(s.snapshot.shape==='annulus'){
    expect(expansionAttackContains(s.snapshot,0,0)).toBe(false)
    expect(expansionAttackContains(s.snapshot,boss.patterns[1].rangeUnits,0)).toBe(true)
   }
   stepExpansionAttack(s,{...args,alive:false})
  }
 })
})
