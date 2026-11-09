import { EXPANSION_ENEMIES, EXPANSION_BOSSES, EXPANSION_BEHAVIORS, EXPANSION_LIMITS } from './expansionContent.js'
import { AUTHORED_ATTACK_BOSSES } from './stage5ViceBoss.js'
import { getStageObjectSightObstacles } from '../components/StageObjects/stageObjectColliders.js'
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
 // e.attackDamage: 적별 특수행동 피해 덮어쓰기(Stage 6 E20 국민체조 7, 2026-11-08 wave 5). 공유 행동 표(DATA.behaviors)는
 // stage7~10도 쓰므로 고치지 않는다 — 필드가 없는 적은 표 값 그대로.
 return {...b,id:e.id.toLowerCase()+'_special',shape,origin:['lob','hop'].includes(e.behaviorId)?'player_snapshot':'boss_snapshot',damage:e.attackDamage??b.attackDamage,angleDeg:e.behaviorId==='orbit'?120:60,rangeUnits:['lob','hop'].includes(e.behaviorId)?b.widthUnits:b.rangeUnits}
}
function buildSnapshot(state,p,a) {
 const dx=a.playerX-a.x,dz=a.playerZ-a.z,length=Math.hypot(dx,dz)||1
 let tx=a.playerX,tz=a.playerZ
 const e=EXPANSION_ENEMIES[state.type]
 if(e?.behaviorId==='hop' && length>2) {tx=a.x+dx/length*2;tz=a.z+dz/length*2} // 2 units / .5 blocks
 const origin=p.origin==='player_snapshot'?[tx,tz]:[a.x,a.z]
 return {...p,type:state.type,key:state.key,attackId:`${state.key}:${state.patternIndex}`,sourceEntityId:state.key,patternId:p.id,originXZ:origin,targetXZ:[tx,tz],sourceXZ:[a.x,a.z],directionXZ:[dx/length,dz/length],yaw:Math.atan2(dx,dz),phase:'windup',elapsedMs:0,gameKey:state.gameKey,hit:false,rangeUnits:snapshotRangeUnits(p,origin,a.playerX,a.playerZ)}
}
// R1(Stage 6 훈화 고리): radiusMode 'player_distance'면 외반경 = clamp(원점–플레이어 거리 + padding, min, max).
// 고리 띠가 windup 시작 순간의 플레이어를 정확히 지난다 — 어디에 서 있든 기믹이 살아 있다. 그 외 패턴은 rangeUnits 그대로.
export function snapshotRangeUnits(p,origin,playerX,playerZ) {
 if(p.radiusMode!=='player_distance')return p.rangeUnits
 const d=Math.hypot(playerX-origin[0],playerZ-origin[1])
 return Math.min(p.maxRangeUnits??Infinity,Math.max(p.minRangeUnits??0,d+(p.radiusPaddingUnits??0)))
}
// R4: ignoresSightBlockers면 피해 기하는 장애물 없이 만든다(훈화는 골대 뒤에서도 들린다). 탈출 인증은 원래 문맥(실제 골대).
function buildSnapshotSafety(s,p,context,a,others) {
 s.safetyBounds={halfX:context.halfX,halfZ:context.halfZ}
 s.safetyPolygons=buildExpansionSafetyGeometry(s,p.ignoresSightBlockers?{...context,obstacles:[]}:context)
 s.escapeChannel=certifyExpansionEscape(s,a,context,others)
}
// 스냅샷 페이즈 진행 + 피격 판정(보스·일반 적·해저드 공유). 이번 프레임 피해(0 또는 s.damage)를 돌려준다.
// The current player position is not a historical swept trajectory. Never
// replay damage when an entire active window was skipped (including resume).
function advanceSnapshotPhase(s,a) {
 const old=s.elapsedMs
 s.elapsedMs+=a.deltaMs
 const activeStart=s.windupMs,activeEnd=activeStart+s.activeMs
 s.phase=s.elapsedMs<activeStart?'windup':s.elapsedMs<activeEnd?'active':'recovery'
 if(a.deltaMs>0 && old<activeEnd && s.phase==='active' && !s.hit && expansionAttackContains(s,a.playerX,a.playerZ,EXPANSION_PLAYER_RADIUS)){s.hit=true;return s.damage}
 return 0
}
const snapshotTotalMs=s=>s.windupMs+s.activeMs+s.recoveryMs
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
 // B10(Stage 5 교감 좀비)은 확장 DATA.bosses 밖의 authored-attack 보스다 — 같은 런타임을 합성 조회로 탄다.
 const boss=EXPANSION_BOSSES[state.type]??AUTHORED_ATTACK_BOSSES[state.type],enemy=EXPANSION_ENEMIES[state.type]
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
    for(const snap of expansionAttackSnapshots.values()){if(snap.type===state.type)sameType++;if(EXPANSION_BOSSES[snap.type]||AUTHORED_ATTACK_BOSSES[snap.type]||snap.hazard)bossActive=true}
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
  // R2: 격노(2페이즈) 보스 고리는 같은 스냅샷에 바깥 고리를 더한다(B05 훈화 고리 +2.4u).
  if(boss && state.enraged && p.phase2ExtraRingOffsetsUnits) s.extraRingOffsetsUnits=p.phase2ExtraRingOffsetsUnits
  const context=expansionSafetyContext(state.type,a)
  state.safetyAttempts++
  // Failed admission is retried on gameplay time, not every render frame.
  state.nextSafetyMs=state.ageMs+EXPANSION_SAFETY_LIMITS.retryMs
  buildSnapshotSafety(s,p,context,a,expansionAttackSnapshots.values())
  // Defer without consuming the authored pattern/cooldown; caller keeps chasing.
  if(!s.safetyPolygons.length || !s.escapeChannel)return out
  state.patternIndex++;state.snapshot=s;state.hit=false
  expansionAttackSnapshots.set(state.key,s)
  state.nextMs=state.ageMs+(boss?(state.enraged?p.phase2CooldownMs:p.cooldownMs):p.cooldownMs)
  return out
 }
 const total=snapshotTotalMs(s)
 const damage=advanceSnapshotPhase(s,a)
 if(damage>0){out.damage=damage;state.hit=true}
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

// ── 비보스 해저드 발신원(Stage 6 조회대 스피커 '훈화 말씀', 스펙 Part C C-7) ────────────────────────
// 보스·일반 적과 같은 스냅샷 맵·같은 안전 기하·같은 텔레그래프(ExpansionHazardLayer)를 쓴다. 해저드는 채널 상한
// (freeChannel)을 우회하지만 만들어진 스냅샷은 채널 수와 "보스 활성"(일반 적 특수행동 차단)에 포함된다.
// 성공 시 스냅샷, 안전 기하·탈출 인증 실패 시 null(호출측이 재시도한다).
// rangeUnitsOverride: 고정 외반경(동심 물결 2번째 고리 = 1번째 고리 외반경 + 오프셋). 없으면 패턴 규칙(플레이어 거리).
// certExcludeKeyPrefix: 탈출 인증에서 빼는 같은 회차 형제 고리 키 접두어(함께 읽히도록 설계된 동심 고리 쌍).
export function emitExpansionHazardSnapshot({hazardId,pattern,originXZ,key,gameKey=0,playerX,playerZ,stageId,halfX,halfZ,obstacles,rangeUnitsOverride,certExcludeKeyPrefix}) {
 if(!pattern || !originXZ || !Number.isFinite(playerX+playerZ) || !key)return null
 const [ox,oz]=originXZ
 const dx=playerX-ox,dz=playerZ-oz,length=Math.hypot(dx,dz)||1
 const s={...pattern,type:hazardId,key,attackId:key,sourceEntityId:key,patternId:pattern.id,originXZ:[ox,oz],targetXZ:[playerX,playerZ],sourceXZ:[ox,oz],
  directionXZ:[dx/length,dz/length],yaw:Math.atan2(dx,dz),phase:'windup',elapsedMs:0,gameKey,hit:false,hazard:true,activeCued:false,
  rangeUnits:Number.isFinite(rangeUnitsOverride)?rangeUnitsOverride:snapshotRangeUnits(pattern,[ox,oz],playerX,playerZ)}
 const context={stageId,halfX,halfZ,obstacles:obstacles??getStageObjectSightObstacles(stageId)}
 const others=certExcludeKeyPrefix?[...expansionAttackSnapshots].filter(([k])=>!k.startsWith(certExcludeKeyPrefix)).map(([,v])=>v):expansionAttackSnapshots.values()
 buildSnapshotSafety(s,pattern,context,{playerX,playerZ},others)
 if(!s.safetyPolygons.length || !s.escapeChannel)return null
 expansionAttackSnapshots.set(key,s)
 return s
}

// 해저드 스냅샷만 진행한다. out.damage = 이번 프레임 합산 피해, out.activeStarts = active에 처음 들어간 고리 수(SFX용).
// 정지·레벨업(playing false) 중에는 진행하지 않는다. 다른 판(gameKey)의 해저드는 지운다.
const hazardStepOut={damage:0,activeStarts:0}
export function stepExpansionHazardSnapshots(a,out=hazardStepOut) {
 out.damage=0;out.activeStarts=0
 if(!a?.playing || !Number.isFinite(a.deltaMs) || a.deltaMs<0)return out
 for(const [key,s] of expansionAttackSnapshots){
  if(!s.hazard)continue
  if(a.gameKey!==undefined && s.gameKey!==a.gameKey){expansionAttackSnapshots.delete(key);continue}
  out.damage+=advanceSnapshotPhase(s,a)
  if(s.phase!=='windup' && !s.activeCued){s.activeCued=true;out.activeStarts++}
  if(s.elapsedMs>=snapshotTotalMs(s))expansionAttackSnapshots.delete(key)
 }
 return out
}
