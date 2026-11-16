import { EXPANSION_STAGES, EXPANSION_ENEMIES, EXPANSION_BOSSES } from './expansionContent.js'
import { AUTHORED_ATTACK_BOSSES } from './stage5ViceBoss.js'
import { NOVEL2_EXPANSION_ENEMIES } from './novelZombie2Content.js'
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
 // a.stageId(호출측이 넘긴 현재 스테이지)가 우선. B10 같은 authored-attack 보스는 확장 스테이지 표에 없으므로 레코드의 stageId로 폴백.
 // 2차 신규 좀비(E94/E97)는 확장 스테이지 표에 없으므로 자기 행의 stageId로 폴백한다(Stage 2·3 맵 반폭 7.5×19.2 = 기본값).
 const definition=EXPANSION_ENEMIES[type]??EXPANSION_BOSSES[type]??AUTHORED_ATTACK_BOSSES[type]??NOVEL2_EXPANSION_ENEMIES[type]
 const stageId=a.stageId??Object.values(EXPANSION_STAGES).find(s=>s.bossId===type||s.enemyIds.includes(type))?.id??AUTHORED_ATTACK_BOSSES[type]?.stageId??NOVEL2_EXPANSION_ENEMIES[type]?.stageId
 const stage=EXPANSION_STAGES[stageId]
 let obstacles=a.obstacles??(definition?getStageObjectSightObstacles(stageId):[])
 // 2차 신규 좀비(E94/E97)는 Stage 2·3 맵 전체 장애물(Stage 3 체육관 39개)이 안전 기하 상한(32)을 넘으면 공격을 영원히 못 낸다.
 // 이 종들의 공격은 사거리 3.2u 안이라, 공격자·플레이어 둘레 10u 안의 가까운 장애물 32개만 쓴다(기존 확장 적·보스는 그대로).
 if(NOVEL2_EXPANSION_ENEMIES[type]) obstacles=novel2NearSafetyObstacles(obstacles,a.x,a.z,a.playerX,a.playerZ)
 return {stageId,halfX:a.halfX??stage?.mapHalfXUnits??7.5,halfZ:a.halfZ??stage?.mapHalfZUnits??19.2,obstacles}
}
// 2차 신규 좀비의 짧은 공격(대걸레·뜀틀·기관사 돌진선·줄넘기 줄·미믹 물기) 전용: 장애물이 상한(32)을 넘는 맵(Stage 3 체육관 39개)에서
// 공격자·플레이어 둘레 10u 안의 가까운 장애물 32개만 남긴다. 상한 이하면 그대로 돌려준다(기존 판정과 같다).
export function novel2NearSafetyObstacles(obstacles,ax,az,px,pz){
 if(!obstacles || obstacles.length<=EXPANSION_SAFETY_LIMITS.obstacles || !Number.isFinite(ax+az+px+pz))return obstacles??[]
 const near=o=>Math.min(Math.hypot(o.x-ax,o.z-az),Math.hypot(o.x-px,o.z-pz))
 return obstacles.filter(o=>near(o)<=10).sort((p,q)=>near(p)-near(q)).slice(0,EXPANSION_SAFETY_LIMITS.obstacles)
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
 const ringAt=(outer,inner)=>{
  const n=128,at=(angle,radius)=>[x+Math.sin(angle)*radius,z+Math.cos(angle)*radius]
  for(let i=0;i<n;i++){const a0=-Math.PI+i*TAU/n,a1=-Math.PI+(i+1)*TAU/n;out.push(ccw([at(a0,inner),at(a0,outer),at(a1,outer),at(a1,inner)]))}
 }
 switch(s.shape){
 case 'disk':circle();break
 case 'three_disks':s.offsetsUnits.forEach(([ox,oz])=>circle(ox,oz));break
 // R3: 2페이즈 B05 훈화 고리는 같은 스냅샷에 바깥 고리(외반경 r+o, 폭 w)를 더 그린다. 각 고리는 128분할 사다리꼴.
 case 'annulus':circle(0,0,Math.max(0,r-w));for(const o of s.extraRingOffsetsUnits??[])ringAt(r+o,Math.max(0,r+o-w));break
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
// options.obstacleIngress(2차 신규 좀비 전용, 기본 꺼짐 — 확장 적·보스 판정은 그대로): 플레이어가 장애물에 붙어 서 있으면
// 출발점에서 1.2u 중앙 통로가 물리적으로 존재하지 않는다(통로 반폭 0.792u 안에 장애물). 그러면 모든 후보가 막혀 인증이
// 영원히 실패한다 — Stage 5 교무실 책상 통로(폭 2.2u)에서는 통로 가장자리 0.79u씩이 "공격이 절대 오지 않는 자리"가 됐다
// (2026-11-17 E101 복사기 부채꼴 실측: 2.5u 안 1,383자리 중 258자리에서 8초 동안 한 번도 예고 못 함).
// 맵 끝 진입(ingress)과 같은 규칙을 장애물에도 준다: 출발점에서 이미 통로 반폭 안에 들어와 있는("붙어 선") 장애물은 통로 폭 판정에서
// 빼고(맵 끝이 통로 한쪽을 자르는 것과 같다) 몸(반경 0.9 × 0.192u)만 막히지 않으면 된다. 붙어 있지 않은 다른 장애물은 여전히 전체 폭
// 통로(반폭 0.792u)를 경로 어디에서도 막으면 안 된다. 출발점이 아무 장애물에도 붙어 있지 않으면 판정은 기존과 똑같다.
const OBSTACLE_INGRESS_BODY_PAD=EXPANSION_PLAYER_RADIUS*.9
export function certifyExpansionEscape(snapshot,a,ctx,others,options){
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
 // 출발점이 장애물에 붙어 있을 때만(옵션) 진입 구간을 허용한다. 붙어 있지 않으면 아래 판정은 기존과 같다.
 const crowded=options?.obstacleIngress===true&&ctx.obstacles?.length>0&&sight(ctx,{x:px,z:pz},{x:px,z:pz},clearance)
 // 붙어 선 장애물을 뺀 통로 판정용 문맥(같은 work 계수를 공유한다).
 const laneCtx=crowded?{...ctx,obstacles:ctx.obstacles.filter(o=>!isStageObjectSightBlocked({x:px,z:pz},{x:px,z:pz},[o],clearance))}:null
 for(let distance=0;distance<=max+EPS;distance+=.2)for(let i=0;i<32;i++){
  if(work.candidates>=EXPANSION_SAFETY_LIMITS.candidates||work.exhausted)return null
  work.candidates++
  const angle=i*TAU/32,x=px+Math.cos(angle)*distance,z=pz+Math.sin(angle)*distance
  if(!inside(x,z,clearance)||hazards.some(ps=>check(ps,p=>expansionPolygonContains(p,x,z,clearance))))continue
  // A destination beyond an active/warning hazard is not a safe route. Check
  // the WHOLE swept 1.2-unit centre lane plus body, not just its endpoint.
  if(hazards.slice(1).some(ps=>check(ps,p=>capsuleHits(p,px,pz,x,z,clearance))))continue
  let obstacleFrom=null
  if(sight(ctx,{x:px,z:pz},{x,z},clearance)||work.exhausted){
   if(!crowded||work.exhausted)continue
   obstacleFrom=obstacleIngressFrom(ctx,laneCtx,px,pz,x,z,clearance)
   if(!obstacleFrom||work.exhausted)continue
  }
  // At a map edge a full symmetric lane cannot exist at the initial centre.
  // Permit body-safe inward ingress, then require the full-width lane INSIDE
  // the map. Convex map guarantees the whole body-centre segment stays inside.
  // Never carve an artificial safe hole out of actual attack damage.
  let ingress=0
  for(const [from,to,half]of [[px,x,ctx.halfX],[pz,z,ctx.halfZ]]){
   if(Math.abs(from)>half-clearance)ingress=Math.max(ingress,(Math.abs(from)-(half-clearance))/(Math.abs(from)-Math.sign(from)*to))
  }
  const fullWidthFromXZ=obstacleFrom??[px+(x-px)*ingress,pz+(z-pz)*ingress]
  return {fromXZ:[px,pz],toXZ:[x,z],fullWidthFromXZ,boundaryIngress:ingress>0,obstacleIngress:obstacleFrom!==null,widthUnits:EXPANSION_SAFE_WIDTH,bodyRadiusUnits:r,clearanceUnits:clearance}
 }
 return null
}
// 장애물 진입 경로: 몸(0.9 × 0.192u)은 출발점 → 목적지 전체를 모든 장애물에 막히지 않고 지나가고, 붙어 선 장애물을 뺀 나머지는
// 전체 폭 통로(반폭 0.792u)를 막지 않아야 한다. 성립하면 모든 장애물 기준으로 전체 폭이 처음 열리는 지점(없으면 목적지), 아니면 null.
function obstacleIngressFrom(ctx,laneCtx,px,pz,x,z,clearance){
 const dx=x-px,dz=z-pz,length=Math.hypot(dx,dz)
 if(length<EPS)return null
 if(sight(ctx,{x:px,z:pz},{x,z},OBSTACLE_INGRESS_BODY_PAD))return null
 if(sight(laneCtx,{x:px,z:pz},{x,z},clearance))return null
 let lo=0,hi=1
 if(sight(ctx,{x,z},{x,z},clearance))return [x,z]
 for(let i=0;i<6;i++){const mid=(lo+hi)/2;if(sight(ctx,{x:px+dx*mid,z:pz+dz*mid},{x,z},clearance))lo=mid;else hi=mid}
 return [px+dx*hi,pz+dz*hi]
}
