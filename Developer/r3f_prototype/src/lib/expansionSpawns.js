import { EXPANSION_STAGES, EXPANSION_BOSSES, getExpansionStats } from './expansionContent.js'
// Bounded safe-ring search, no fallback onto player or obstructed positions.
export function expansionSpawnPosition(type,stageId,player,bounds,taken=[],obstacles=[],random=Math.random,scaleOverride) {
 const s=EXPANSION_STAGES[stageId];if(!s)return null
 const stats=getExpansionStats(type)
 const scale=scaleOverride??stats?.scale??1
 const radius=.28*scale*4/3
 const boss=!!EXPANSION_BOSSES[type]
 for(let i=0;i<s.spawnPolicy.maxAttempts;i++){
  const angle=random()*Math.PI*2
  const r=boss?s.spawnPolicy.bossSpawnDistanceUnits:s.spawnPolicy.minDistanceUnits+random()*(s.spawnPolicy.maxDistanceUnits-s.spawnPolicy.minDistanceUnits)
  const x=player.x+Math.sin(angle)*r,z=player.z+Math.cos(angle)*r
  if(Math.abs(x)>bounds.halfX-radius || Math.abs(z)>bounds.halfZ-radius)continue
  if(taken.some(p=>Math.hypot(p[0]-x,p[2]-z)<radius*2+.1))continue
  if(obstacles.some(o=>{const dx=x-o.x,dz=z-o.z,c=o.cosY??Math.cos(o.rotationY??0),sn=o.sinY??Math.sin(o.rotationY??0);return Math.abs(dx*c-dz*sn)<o.halfX+radius&&Math.abs(dx*sn+dz*c)<o.halfZ+radius}))continue
  return [x,.25*scale*4/3,z]
 }
 return null
}
