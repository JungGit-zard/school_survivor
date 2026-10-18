import { EXPANSION_STAGES, EXPANSION_ENEMIES, EXPANSION_BOSSES } from './expansionContent.js'
import { getStageObjectSightObstacles, isStageObjectSightBlocked, obstacleCosY, obstacleSinY } from '../components/StageObjects/stageObjectColliders.js'

// Gameplay geometry only. 1 block = 4 units. Radius .192/.048 blocks;
// escape centre-lane width 1.2/.3 blocks, plus the player's body on each side.
export const EXPANSION_PLAYER_RADIUS = .192
export const EXPANSION_SAFE_WIDTH = 1.2
export const EXPANSION_SAFETY_LIMITS = Object.freeze({obstacles:32,sightQueries:16384,clipTests:32768,candidates:800,polygonTests:200000,retryMs:250})
const EPS=1e-9, TAU=2*Math.PI
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])
function ccw(p){let area=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];area+=a[0]*b[1]-b[0]*a[1]}return area<0?p.slice().reverse():p}
function clip(subject,boundary){
 let out=subject
 for(let i=0;i<boundary.length && out.length;i++){
  const a=boundary[i],b=boundary[(i+1)%boundary.length],input=out;out=[]
  let prev=input[input.length-1],pv=cross(a,b,prev)
  for(const cur of input){const cv=cross(a,b,cur)
   if((cv>=-EPS)!==(pv>=-EPS)){const t=pv/(pv-cv);out.push([prev[0]+t*(cur[0]-prev[0]),prev[1]+t*(cur[1]-prev[1])])}
   if(cv>=-EPS)out.push(cur)
   prev=cur;pv=cv
  }
 }
 return out.length>=3 && Math.abs(out.reduce((area,a,i)=>{const b=out[(i+1)%out.length];return area+a[0]*b[1]-b[0]*a[1]},0))>EPS?out:[]
}
export function expansionPolygonContains(poly,x,z,pad=0){
 if(poly.length<3)return false
 let inside=true,min=Infinity
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dz=b[1]-a[1]
  if(cross(a,b,[x,z]) < -EPS)inside=false
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)))
  min=Math.min(min,(x-a[0]-t*dx)**2+(z-a[1]-t*dz)**2)
 }
 return inside || min<=pad*pad+EPS
}
export function expansionSafetyContext(type,a){
 const definition=EXPANSION_ENEMIES[type]??EXPANSION_BOSSES[type]
 const stageId=a.stageId??Object.values(EXPANSION_STAGES).find(s=>s.bossId===type||s.enemyIds.includes(type))?.id
 const stage=EXPANSION_STAGES[stageId]
 return {stageId,halfX:a.halfX??stage?.mapHalfXUnits??7.5,halfZ:a.halfZ??stage?.mapHalfZUnits??19.2,obstacles:a.obstacles??(definition?getStageObjectSightObstacles(stageId):[])}
}
// Convex authored pieces, in WORLD XZ. All consumers use this same clipped set.
export function expansionAuthoredPolygons(s){
 const [x,z]=s.originXZ,r=s.rangeUnits,w=s.widthUnits??0,out=[]
 const point=(angle,radius,ox=0,oz=0)=>[x+ox+Math.sin(angle)*radius,z+oz+Math.cos(angle)*radius]
 const line=(yaw,ox=0,oz=0,both=false)=>{
  const c=Math.cos(yaw),sn=Math.sin(yaw),lo=both?-r:0
  out.push(ccw([[-w/2,lo],[w/2,lo],[w/2,r],[-w/2,r]].map(([side,along])=>[x+ox+c*side+sn*along,z+oz-sn*side+c*along])))
 }
 const circle=(ox=0,oz=0,inner=0,angle=TAU,yaw=0)=>{
  const n=Math.max(2,Math.ceil(128*angle/TAU)),arc=[]
  for(let i=0;i<=n;i++)arc.push(point(yaw-angle/2+i*angle/n,r,ox,oz))
  if(inner>0)for(let i=0;i<n;i++)out.push(ccw([point(yaw-angle/2+i*angle/n,inner,ox,oz),arc[i],arc[i+1],point(yaw-angle/2+(i+1)*angle/n,inner,ox,oz)]))
  else out.push(ccw(angle<TAU?[[x+ox,z+oz],...arc]:arc.slice(0,-1)))
 }
 switch(s.shape){
 case 'disk':circle();break
 case 'three_disks':s.offsetsUnits.forEach(([ox,oz])=>circle(ox,oz));break
 case 'annulus':circle(0,0,Math.max(0,r-w));break
 case 'sector':circle(0,0,0,(s.angleDeg??60)*Math.PI/180,Math.atan2(s.directionXZ?.[0]??Math.sin(s.yaw??0),s.directionXZ?.[1]??Math.cos(s.yaw??0)));break
 case 'line':line(s.yaw??0);break
 case 'cross':{const a=(s.angleDeg??0)*Math.PI/180;line(a,0,0,true);line(a+Math.PI/2,0,0,true);break}
 case 'three_lines':s.anglesDeg.forEach(a=>line((s.yaw??0)+a*Math.PI/180));break
 case 'grid':s.lineOffsetsUnits.forEach(o=>{line(0,o,0,true);line(Math.PI/2,0,o,true)});break
 }
 return out
}
function sight(ctx,from,to,padding){
 if(ctx.work.sightQueries>=EXPANSION_SAFETY_LIMITS.sightQueries){ctx.work.exhausted=true;return true}
 ctx.work.sightQueries++
 return isStageObjectSightBlocked(from,to,ctx.obstacles,padding)
}
function visibility(origin,ctx){
 const {halfX:hx,halfZ:hz,obstacles}=ctx,[x,z]=origin
 if(Math.abs(x)>hx||Math.abs(z)>hz||sight(ctx,{x,z},{x,z},0))return []
 const corners=[[-hx,-hz],[hx,-hz],[hx,hz],[-hx,hz]]
 for(const o of obstacles){const c=obstacleCosY(o),s=obstacleSinY(o)
  for(const u of [-o.halfX,o.halfX])for(const v of [-o.halfZ,o.halfZ])corners.push([o.x+c*u+s*v,o.z-s*u+c*v])
 }
 const angles=corners.flatMap(([cx,cz])=>{const a=Math.atan2(cz-z,cx-x);return [a-1e-7,a,a+1e-7]}).sort((a,b)=>a-b)
 return angles.map(a=>{
  const dx=Math.cos(a),dz=Math.sin(a)
  let hi=Math.min(dx>EPS?(hx-x)/dx:dx<-EPS?(-hx-x)/dx:Infinity,dz>EPS?(hz-z)/dz:dz<-EPS?(-hz-z)/dz:Infinity),lo=0
  if(sight(ctx,{x,z},{x:x+dx*hi,z:z+dz*hi},0)){
   // Use the actual OBB sight solver, including rotation; no second collision oracle.
   for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(sight(ctx,{x,z},{x:x+dx*mid,z:z+dz*mid},0))hi=mid;else lo=mid}
   hi=lo
  }
  return [x+dx*hi,z+dz*hi]
 })
}
export function buildExpansionSafetyGeometry(s,ctx){
 ctx.work={sightQueries:0,clipTests:0,candidates:0,polygonTests:0,exhausted:false}
 s.safetyWork=ctx.work
 if(ctx.obstacles.length>EXPANSION_SAFETY_LIMITS.obstacles || ctx.halfX<.792 || ctx.halfZ<.792)return []
 const bounds=[[-ctx.halfX,-ctx.halfZ],[ctx.halfX,-ctx.halfZ],[ctx.halfX,ctx.halfZ],[-ctx.halfX,ctx.halfZ]]
 const authored=expansionAuthoredPolygons(s),pieces=[]
 // Grid lines emit from their own fixed centres, not from the boss-to-player ray.
 const origins=s.shape==='grid'?s.lineOffsetsUnits.flatMap(o=>[[s.originXZ[0]+o,s.originXZ[1]],[s.originXZ[0],s.originXZ[1]+o]]):s.shape==='three_disks'?s.offsetsUnits.map(([ox,oz])=>[s.originXZ[0]+ox,s.originXZ[1]+oz]):null
 const cache=new Map()
 authored.forEach((poly,index)=>{
  const clipped=clip(poly,bounds);if(!clipped.length)return
  const sourceIndex=s.shape==='three_disks'?index:0
  if(!ctx.obstacles.length){clipped.sourceIndex=sourceIndex;pieces.push(clipped);return}
  const origin=origins?.[index]??s.originXZ,key=origin.join(',')
  let visible=cache.get(key);if(!visible){visible=visibility(origin,ctx);cache.set(key,visible)}
  for(let i=0;i<visible.length;i++){
   const triangle=ccw([origin,visible[i],visible[(i+1)%visible.length]])
   if(Math.abs(cross(triangle[0],triangle[1],triangle[2]))<EPS)continue
   if(ctx.work.clipTests>=EXPANSION_SAFETY_LIMITS.clipTests){ctx.work.exhausted=true;break}
   ctx.work.clipTests++
   const part=clip(clipped,triangle);if(part.length){part.sourceIndex=sourceIndex;pieces.push(part)}
  }
 })
 return ctx.work.exhausted?[]:pieces
}
// Exact capsule-vs-convex-piece test: endpoint/edge distances plus crossings.
function capsuleHits(poly,ax,az,bx,bz,pad){
 if(expansionPolygonContains(poly,ax,az,pad)||expansionPolygonContains(poly,bx,bz,pad))return true
 const dx=bx-ax,dz=bz-az,length2=dx*dx+dz*dz
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],ex=b[0]-a[0],ez=b[1]-a[1],den=dx*ez-dz*ex
  if(Math.abs(den)>EPS){const u=((a[0]-ax)*dz-(a[1]-az)*dx)/den,t=((a[0]-ax)*ez-(a[1]-az)*ex)/den
   if(t>=0&&t<=1&&u>=0&&u<=1)return true
  }
  const t=length2?Math.max(0,Math.min(1,((a[0]-ax)*dx+(a[1]-az)*dz)/length2)):0
  if((a[0]-ax-t*dx)**2+(a[1]-az-t*dz)**2<=pad*pad+EPS)return true
 }
 return false
}
export function certifyExpansionEscape(snapshot,a,ctx,others){
 const px=a.playerX,pz=a.playerZ,r=EXPANSION_PLAYER_RADIUS,clearance=EXPANSION_SAFE_WIDTH/2+r
 const work=ctx.work??={sightQueries:0,clipTests:0,candidates:0,polygonTests:0,exhausted:false}
 const inside=(x,z,pad)=>Math.abs(x)+pad<=ctx.halfX+EPS&&Math.abs(z)+pad<=ctx.halfZ+EPS
 if(!inside(px,pz,r)||ctx.halfX<clearance||ctx.halfZ<clearance||work.exhausted)return null
 const existing=[...others].filter(s=>s.phase!=='recovery')
 if(existing.length>6||!Number.isFinite(snapshot.windupMs)||snapshot.windupMs<0||snapshot.windupMs>1600)return null
 const hazards=[snapshot,...existing].map(s=>s.safetyPolygons??expansionAuthoredPolygons(s))
 const check=(polys,predicate)=>polys.some(p=>{
  if(work.polygonTests>=EXPANSION_SAFETY_LIMITS.polygonTests){work.exhausted=true;return true}
  work.polygonTests++
  return predicate(p)
 })
 const max=snapshot.windupMs/1000*3 // existing player speed: 3 units/s (.75 blocks/s)
 for(let distance=0;distance<=max+EPS;distance+=.2)for(let i=0;i<32;i++){
  if(work.candidates>=EXPANSION_SAFETY_LIMITS.candidates||work.exhausted)return null
  work.candidates++
  const angle=i*TAU/32,x=px+Math.cos(angle)*distance,z=pz+Math.sin(angle)*distance
  if(!inside(x,z,clearance)||hazards.some(ps=>check(ps,p=>expansionPolygonContains(p,x,z,clearance))))continue
  // A destination beyond an active/warning hazard is not a safe route. Check
  // the WHOLE swept 1.2-unit centre lane plus body, not just its endpoint.
  if(hazards.slice(1).some(ps=>check(ps,p=>capsuleHits(p,px,pz,x,z,clearance))))continue
  if(sight(ctx,{x:px,z:pz},{x,z},clearance)||work.exhausted)continue
  // At a map edge a full symmetric lane cannot exist at the initial centre.
  // Permit body-safe inward ingress, then require the full-width lane INSIDE
  // the map. Convex map guarantees the whole body-centre segment stays inside.
  // Never carve an artificial safe hole out of actual attack damage.
  let ingress=0
  for(const [from,to,half]of [[px,x,ctx.halfX],[pz,z,ctx.halfZ]]){
   if(Math.abs(from)>half-clearance)ingress=Math.max(ingress,(Math.abs(from)-(half-clearance))/(Math.abs(from)-Math.sign(from)*to))
  }
  return {fromXZ:[px,pz],toXZ:[x,z],fullWidthFromXZ:[px+(x-px)*ingress,pz+(z-pz)*ingress],boundaryIngress:ingress>0,widthUnits:EXPANSION_SAFE_WIDTH,bodyRadiusUnits:r,clearanceUnits:clearance}
 }
 return null
}
