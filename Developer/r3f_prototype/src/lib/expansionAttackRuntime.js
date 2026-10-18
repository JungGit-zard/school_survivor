import { EXPANSION_ENEMIES, EXPANSION_BOSSES, EXPANSION_BEHAVIORS, EXPANSION_LIMITS } from './expansionContent.js'
import { expansionAuthoredPolygons, expansionPolygonContains, expansionSafetyContext, buildExpansionSafetyGeometry, certifyExpansionEscape, EXPANSION_PLAYER_RADIUS, EXPANSION_SAFETY_LIMITS, EXPANSION_SAFE_WIDTH } from './expansionAttackSafety.js'
// Gameplay-owned snapshots; visuals consume the identical locked geometry used by damage.
export const expansionAttackSnapshots = new Map()
const poolStates = new WeakMap()
export function clearExpansionAttacks() { expansionAttackSnapshots.clear() }
export function cancelExpansionAttack(state) {
 if(!state)return
 expansionAttackSnapshots.delete(state.key); state.snapshot=null; state.cancelled=true
}
export function createExpansionAttackState(type,key,gameKey=0) {
 return {type,key,gameKey,ageMs:0,nextMs:2500,nextSafetyMs:0,safetyAttempts:0,patternIndex:0,snapshot:null,cancelled:false,enraged:false,enrageRemainingMs:0,hit:false,velocityX:0,velocityZ:0,moveRemaining:0,result:{damage:0,velocityX:0,velocityZ:0,stop:false,noContact:false}}
}
function normalPattern(e) {
 const b=EXPANSION_BEHAVIORS[e.behaviorId]
 const shape={lob:'disk',trail:'disk',pulse:'disk',dash:'line',fan:'sector',rootline:'line',hop:'disk',beam:'line',orbit:'sector',ring:'annulus',cross:'cross',sidestep:'line'}[e.behaviorId]
 return {...b,id:e.id.toLowerCase()+'_special',shape,origin:['lob','hop'].includes(e.behaviorId)?'player_snapshot':'boss_snapshot',damage:b.attackDamage,angleDeg:e.behaviorId==='orbit'?120:60,rangeUnits:['lob','hop'].includes(e.behaviorId)?b.widthUnits:b.rangeUnits}
}
function buildSnapshot(state,p,a) {
 const dx=a.playerX-a.x,dz=a.playerZ-a.z,length=Math.hypot(dx,dz)||1
 let tx=a.playerX,tz=a.playerZ
 const e=EXPANSION_ENEMIES[state.type]
 if(e?.behaviorId==='hop' && length>2) {tx=a.x+dx/length*2;tz=a.z+dz/length*2} // 2 units / .5 blocks
 const origin=p.origin==='player_snapshot'?[tx,tz]:[a.x,a.z]
 return {...p,type:state.type,key:state.key,attackId:`${state.key}:${state.patternIndex}`,sourceEntityId:state.key,patternId:p.id,originXZ:origin,targetXZ:[tx,tz],sourceXZ:[a.x,a.z],directionXZ:[dx/length,dz/length],yaw:Math.atan2(dx,dz),phase:'windup',elapsedMs:0,gameKey:state.gameKey,hit:false}
}
// Distances are world units (1 block = 4 units). Circle vs convex fill uses
// Euclidean edge distance, so sector sides and rectangle corners include the body.
export function expansionAttackContains(s,x,z,padding=0) {
 if(!s || !Number.isFinite(x+z+padding) || padding<0)return false
 if(s.safetyBounds && (Math.abs(x)>s.safetyBounds.halfX || Math.abs(z)>s.safetyBounds.halfZ))return false
 return (s.safetyPolygons??expansionAuthoredPolygons(s)).some(p=>expansionPolygonContains(p,x,z,padding))
}
function freeChannel() {
 let windup=0,active=0
 for(const s of expansionAttackSnapshots.values()){if(s.phase==='windup')windup++;if(s.phase==='active')active++}
 return windup<EXPANSION_LIMITS.simultaneousNewTelegraphs && active<EXPANSION_LIMITS.simultaneousDamagingAreas
}
export function stepExpansionAttack(state,a) {
 const out=state.result;out.damage=0;out.velocityX=0;out.velocityZ=0;out.stop=false;out.noContact=false
 if(!a.alive || state.gameKey!==a.gameKey){cancelExpansionAttack(state);return out}
 if(!a.playing || state.cancelled || !Number.isFinite(a.deltaMs)||a.deltaMs<0)return out
 const boss=EXPANSION_BOSSES[state.type],enemy=EXPANSION_ENEMIES[state.type]
 if(!boss && (!enemy || enemy.behaviorId==='chase'))return out
 state.ageMs+=a.deltaMs
 if(boss && a.hpRatio<=boss.enrageHpRatio && !state.enraged && !state.snapshot){
  state.enraged=true;state.enrageRemainingMs=boss.enrageTransitionMs
  expansionAttackSnapshots.delete(state.key);state.snapshot=null
 }
 if(state.enrageRemainingMs>0){state.enrageRemainingMs=Math.max(0,state.enrageRemainingMs-a.deltaMs);out.stop=true;return out}
 let s=state.snapshot
 if(!s){
  if(state.ageMs<state.nextMs || state.ageMs<state.nextSafetyMs || !freeChannel())return out
  if(enemy) {
    const b=EXPANSION_BEHAVIORS[enemy.behaviorId]
    if(Math.hypot(a.playerX-a.x,a.playerZ-a.z)>b.rangeUnits)return out
    let sameType=0,bossActive=false
    for(const snap of expansionAttackSnapshots.values()){if(snap.type===state.type)sameType++;if(EXPANSION_BOSSES[snap.type])bossActive=true}
    if(sameType>=2 || (bossActive && expansionAttackSnapshots.size>=1))return out
  }
  // Whole-corridor rejection includes its starting cap. If another warning
  // already covers that cap, no candidate can succeed: avoid 150 doomed builds.
  for(const hazard of expansionAttackSnapshots.values()){
   if(hazard.phase!=='recovery' && expansionAttackContains(hazard,a.playerX,a.playerZ,EXPANSION_PLAYER_RADIUS+EXPANSION_SAFE_WIDTH/2)){
    state.nextSafetyMs=state.ageMs+EXPANSION_SAFETY_LIMITS.retryMs;return out
   }
  }
  const p=boss?boss.patterns[state.patternIndex%2]:normalPattern(enemy)
  s=buildSnapshot(state,p,a)
  const context=expansionSafetyContext(state.type,a)
  state.safetyAttempts++
  // Failed admission is retried on gameplay time, not every render frame.
  state.nextSafetyMs=state.ageMs+EXPANSION_SAFETY_LIMITS.retryMs
  s.safetyBounds={halfX:context.halfX,halfZ:context.halfZ}
  s.safetyPolygons=buildExpansionSafetyGeometry(s,context)
  s.escapeChannel=certifyExpansionEscape(s,a,context,expansionAttackSnapshots.values())
  // Defer without consuming the authored pattern/cooldown; caller keeps chasing.
  if(!s.safetyPolygons.length || !s.escapeChannel)return out
  state.patternIndex++;state.snapshot=s;state.hit=false
  expansionAttackSnapshots.set(state.key,s)
  state.nextMs=state.ageMs+(boss?(state.enraged?p.phase2CooldownMs:p.cooldownMs):p.cooldownMs)
  return out
 }
 const old=s.elapsedMs
 s.elapsedMs+=a.deltaMs
 const activeStart=s.windupMs,activeEnd=activeStart+s.activeMs,total=activeEnd+s.recoveryMs
 s.phase=s.elapsedMs<activeStart?'windup':s.elapsedMs<activeEnd?'active':'recovery'
 // The current player position is not a historical swept trajectory. Never
 // replay damage when an entire active window was skipped (including resume).
 if(a.deltaMs>0 && old<activeEnd && s.phase==='active' && !state.hit && expansionAttackContains(s,a.playerX,a.playerZ,EXPANSION_PLAYER_RADIUS)){out.damage=s.damage;state.hit=true;s.hit=true}
 const behavior=enemy?.behaviorId
 if(behavior==='dash' || behavior==='hop' || behavior==='sidestep'){
  out.noContact=behavior==='hop' && s.phase==='active'
  if(s.phase==='active'){
   const speed=behavior==='hop'?Math.hypot(s.targetXZ[0]-s.sourceXZ[0],s.targetXZ[1]-s.sourceXZ[1])/(s.activeMs/1000):EXPANSION_BEHAVIORS[behavior].attackSpeedUnitsPerSec
   const side=behavior==='sidestep'?((state.patternIndex&1)?1:-1):0
   out.velocityX=side?-s.directionXZ[1]*speed*side:s.directionXZ[0]*speed
   out.velocityZ=side?s.directionXZ[0]*speed*side:s.directionXZ[1]*speed
  }
 }
 out.stop=s.phase!=='recovery'
 if(s.elapsedMs>=total){expansionAttackSnapshots.delete(state.key);state.snapshot=null}
 return out
}
export function stepExpansionPooledAttack(pool,index,a) {
 let states=poolStates.get(pool);if(!states){states=new Array(pool.active.length);poolStates.set(pool,states)}
 let state=states[index]
 if(!state || state.generation!==pool.generation[index]){
  cancelExpansionAttack(state)
  const type=Object.keys(EXPANSION_ENEMIES).find(id=>EXPANSION_ENEMIES[id].typeCode===pool.type[index])
  state=createExpansionAttackState(type,`pool:${index}:${pool.generation[index]}`,0);state.generation=pool.generation[index];states[index]=state
 }
 a.x=pool.posX[index];a.z=pool.posZ[index];a.alive=pool.active[index]===1;a.gameKey=0;a.hpRatio=1
 return stepExpansionAttack(state,a)
}
export function cleanupExpansionPoolAttacks(pool) {
 const states=poolStates.get(pool);if(!states)return
 for(let i=0;i<states.length;i++)if(states[i]&&(!pool.active[i]||states[i].generation!==pool.generation[i])){cancelExpansionAttack(states[i]);states[i]=null}
}
export function resetExpansionPoolAttacks(pool) {
 const states=poolStates.get(pool);if(states)states.forEach(cancelExpansionAttack)
 poolStates.delete(pool)
}
