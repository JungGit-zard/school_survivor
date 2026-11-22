import * as THREE from 'three'
import { TELEGRAPH_FEATHER, TELEGRAPH_PALETTE, addOpaqueVertexAlpha, buildTelegraphFeatherGeometry, circleLoop, rectLoop, telegraphBoundaryEdges, telegraphOpacity } from '../../lib/telegraphStyle.js'
const tau=Math.PI*2
export const EXPANSION_PATTERN_SHAPES=Object.freeze({b05_p1:'annulus',b05_p2:'cross',b06_p1:'disk',b06_p2:'three_disks',b07_p1:'three_lines',b07_p2:'annulus',b08_p1:'cross',b08_p2:'sector',b09_p1:'grid',b09_p2:'annulus',b10_p1:'disk',b10_p2:'sector'})
export const EXPANSION_TELEGRAPH_CAPACITY=32
// B10 결재 도장(b10_p1) disk 중심 "決" 도장 무늬 데칼(스펙 Part B §12-3).
// 2026-11-14 Terry: 경고는 원형 색상만 — windup(경고) 중에는 도장 무늬를 띄우지 않는다(windupMaxOpacity 0).
// active(타격) 순간에만 0.9로 찍힌다. 텍스처는 모듈 수명 동안 하나만 만든다(캔버스가 없으면 생략).
export const B10_STAMP_PATTERN_ID='b10_p1'
// color = 도장 잉크(화면 오버레이 B10StampImpactOverlay도 쓴다), floorColor = 바닥에 찍히는 무늬(2026-11-22 채도 낮춘 공용 팔레트).
export const B10_STAMP_DECAL=Object.freeze({color:'#d7263d',floorColor:TELEGRAPH_PALETTE.stamp,windupMaxOpacity:0,activeOpacity:.9,radiusScale:.82})
let b10StampTexture
export function getB10StampTexture() {
 if(b10StampTexture!==undefined)return b10StampTexture
 b10StampTexture=null
 if(typeof document==='undefined')return null
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256
 const ctx=canvas.getContext?.('2d')
 if(!ctx||typeof ctx.fillText!=='function')return null
 ctx.clearRect(0,0,256,256)
 ctx.strokeStyle=B10_STAMP_DECAL.floorColor;ctx.fillStyle=B10_STAMP_DECAL.floorColor
 ctx.lineWidth=18;ctx.beginPath();ctx.arc(128,128,110,0,tau);ctx.stroke()
 ctx.lineWidth=6;ctx.beginPath();ctx.arc(128,128,88,0,tau);ctx.stroke()
 ctx.font='bold 128px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('決',128,136)
 b10StampTexture=new THREE.CanvasTexture(canvas);b10StampTexture.colorSpace=THREE.SRGBColorSpace
 return b10StampTexture
}
function addB10StampDecal(root,d,radius) {
 if((d.patternId??d.id)!==B10_STAMP_PATTERN_ID||!positive(radius))return
 const texture=getB10StampTexture()
 if(!texture)return
 const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:d.phase==='active'?B10_STAMP_DECAL.activeOpacity:0,depthWrite:false,toneMapped:false,side:THREE.DoubleSide})
 const size=radius*B10_STAMP_DECAL.radiusScale*2
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size,size),material)
 mesh.name='b10-stamp-decal';mesh.rotation.x=-Math.PI/2;mesh.position.y=.008;mesh.renderOrder=6
 root.add(mesh);root.userData.stampMat=material
}
const positive=v=>Number.isFinite(v)&&v>0&&v<=64
// 2026-11-14 Terry "경고그래픽 굵은테두리 없애고 원형 색상만": 바닥 경고는 경고색 반투명 채움 하나뿐이다.
// 테두리(edge band/stroke)·흑백 사선 해치·흰 수축 카운트다운은 그리지 않는다. 채움은 실제 피해 기하
// (safetyPolygons 또는 authored 반경)와 정확히 같고, 남은 시간은 채움 불투명도 상승으로만 읽힌다.
// 2026-11-22 Terry "모든 공격궤도 표시자는 채도를 낮추고 끝에 블러": 색은 공용 팔레트(lib/telegraphStyle.js)에서만 온다.
// 채도를 낮춘 만큼 불투명도는 ×1.3(예전 .4/.58/.55 → .52/.754/.715) — 바닥 대비가 예전 수준으로 유지된다.
// 채움(불투명도 그대로) = 실제 피해 기하이고, 그 바깥에만 TELEGRAPH_FEATHER 폭의 번짐 띠(telegraph-feather 메시)가 붙는다.
const EXPANSION_WINDUP_OPACITY=telegraphOpacity(.4)
export const EXPANSION_TELEGRAPH_FILL=Object.freeze({color:TELEGRAPH_PALETTE.caution,activeColor:TELEGRAPH_PALETTE.strike,windupOpacity:EXPANSION_WINDUP_OPACITY,windupOpacityGain:Math.round((telegraphOpacity(.58)-EXPANSION_WINDUP_OPACITY)*1000)/1000,activeOpacity:telegraphOpacity(.55)})
// 2차 신규 좀비(novel2) 계열만 색으로 피해 여부를 가른다(2026-11-15 threemini): 피해 0 안내(E89 "차렷!" 원·E103 커피)는
// 위 노랑 그대로, 피해가 있는 예고는 빨강. E92 기관사 돌진선은 스냅샷 피해가 0(피해는 머리 접촉)이라 contactAttack 표식으로
// 피해 예고임을 알린다. 보스·확장 적(novel2가 아닌 스냅샷)의 색은 바꾸지 않는다. 불투명도 규칙은 위와 같다.
export const NOVEL2_DAMAGE_TELEGRAPH_FILL=Object.freeze({color:TELEGRAPH_PALETTE.danger,activeColor:TELEGRAPH_PALETTE.dangerStrike})
export function isNovel2DamageTelegraph(d){return d?.novel2===true&&(d.contactAttack===true||d.damage>0)}
function telegraphFillColor(d,active){const red=isNovel2DamageTelegraph(d),F=red?NOVEL2_DAMAGE_TELEGRAPH_FILL:EXPANSION_TELEGRAPH_FILL;return active?F.activeColor:F.color}
// ── Stage 6 B05 교장 「교가 제창」(b05_p2) 십자 경고만의 등장·퇴장 곡선 (Terry 2026-11-22 "노출시작과 종료를 좀 더 부드럽게") ──
// 그림만이다. 피해 기하(safetyPolygons)·타이밍·판정은 그대로이고, 아래 곡선은 불투명도 배수(fade)와 원점 기준 XZ 배율(scale)만 준다.
//   windup 앞 fadeInMs: 가운데서 펼쳐지며(startScale→1, easeOutCubic) 서서히 진해진다(fade 0→1, smoothstep). 그 뒤 타격까지 1 고정.
//   active(피해 판정 창): scale 1·fade 1 고정 — 바닥 표시 = 실제 피격 범위. 타격 순간 불투명도가 한 번 번쩍(impactFlash)이고 active 동안 가라앉는다.
//   recovery 앞 fadeOutMs: 피해가 끝난 뒤 fade 1→0(smoothstep)으로 사라지며 살짝 퍼진다(fadeOutScaleGain). 예전엔 recovery 첫 프레임에 툭 꺼졌다.
// createExpansionTelegraphVisual은 언제나 실제 크기 그대로 만들고, 시간 곡선은 updateExpansionTelegraphVisual이 매 프레임 입힌다
// (ExpansionHazardLayer가 만든 같은 프레임에 바로 update를 부르므로 첫 화면부터 곡선이 적용된다).
// impactFlashOpacity: 채움 불투명도가 ×1.3(.715)으로 올라 번쩍임은 .3 → .2(최대 .915, 1을 넘지 않게).
export const B05_CHANT_TELEGRAPH=Object.freeze({patternId:'b05_p2',fadeInMs:320,startScale:.18,impactFlashOpacity:.2,fadeOutMs:420,fadeOutScaleGain:.05})
export function isB05ChantTelegraph(d){return (d?.patternId??d?.id)===B05_CHANT_TELEGRAPH.patternId}
const clamp01=v=>v<0?0:v>1?1:v
const smooth01=v=>{const t=clamp01(v);return t*t*(3-2*t)}
const easeOutCubic=v=>{const t=1-clamp01(v);return 1-t*t*t}
/** 시간 → {fade, scale, flash}. phase가 우선(active면 무조건 1·1), 경과 시간은 등장·퇴장 램프에만 쓴다. out을 채워 돌려준다. */
export function b05ChantTelegraphEnvelope(phase,elapsedMs,windupMs,activeMs,out={fade:1,scale:1,flash:0}) {
 const C=B05_CHANT_TELEGRAPH,e=elapsedMs
 out.fade=1;out.scale=1;out.flash=0
 if(!Number.isFinite(e))return out // 경과 시간이 없으면 곡선 없이 그대로 보인다(숨기지 않는다)
 if(phase==='active'){out.flash=activeMs>0?(1-clamp01((e-windupMs)/activeMs))**2:0;return out}
 if(phase==='recovery'){const k=smooth01((e-windupMs-activeMs)/C.fadeOutMs);out.fade=1-k;out.scale=1+C.fadeOutScaleGain*k;return out}
 const rampMs=windupMs>0?Math.min(C.fadeInMs,windupMs*.5):C.fadeInMs,t=e/rampMs
 out.fade=smooth01(t);out.scale=C.startScale+(1-C.startScale)*easeOutCubic(t)
 return out
}
/** recovery 페이드가 아직 남았는가(ExpansionHazardLayer가 이미 그리던 b05_p2 십자만 recovery에도 남겨 둔다). */
export function b05ChantTelegraphFading(event){return isB05ChantTelegraph(event)&&event.phase==='recovery'&&event.elapsedMs<event.windupMs+event.activeMs+B05_CHANT_TELEGRAPH.fadeOutMs}
const chantEnvelope={fade:1,scale:1,flash:0}
const CHANT_WINDUP_COLOR=new THREE.Color(EXPANSION_TELEGRAPH_FILL.color),CHANT_ACTIVE_COLOR=new THREE.Color(EXPANSION_TELEGRAPH_FILL.activeColor)
function updateB05ChantTelegraph(root,event,progress) {
 const F=EXPANSION_TELEGRAPH_FILL,C=B05_CHANT_TELEGRAPH,mat=root.userData.fillMat
 const env=b05ChantTelegraphEnvelope(event.phase,event.elapsedMs,event.windupMs,event.activeMs,chantEnvelope)
 const hot=event.phase==='active'||event.phase==='recovery'
 // 같은 root를 windup→active→recovery 내내 쓴다(ExpansionHazardLayer가 다시 만들지 않는다) → 색은 페이즈가 바뀔 때만 바꾼다.
 if(root.userData.chantHot!==hot){root.userData.chantHot=hot;mat.color.copy(hot?CHANT_ACTIVE_COLOR:CHANT_WINDUP_COLOR)}
 mat.opacity=event.phase==='active'?F.activeOpacity+env.flash*C.impactFlashOpacity:(hot?F.activeOpacity:F.windupOpacity+progress*F.windupOpacityGain)*env.fade
 root.scale.set(env.scale,1,env.scale)
}
export function updateExpansionTelegraphVisual(root,event) {
 if(!root)return
 const raw=event.windupMs>0?event.elapsedMs/event.windupMs:event.progress??0
 const progress=Number.isFinite(raw)?Math.max(0,Math.min(1,raw)):0
 if(root.userData.b05Chant){updateB05ChantTelegraph(root,event,progress);return}
 const F=EXPANSION_TELEGRAPH_FILL
 root.userData.fillMat.opacity=event.phase==='active'?F.activeOpacity:F.windupOpacity+progress*F.windupOpacityGain
 if(root.userData.stampMat)root.userData.stampMat.opacity=event.phase==='active'?B10_STAMP_DECAL.activeOpacity:progress*B10_STAMP_DECAL.windupMaxOpacity
}
// This is a read-only view of locked gameplay geometry. No attack timer or damage
// lookup exists here; all dimensions/offsets/angles come from the actual snapshot.
export function createExpansionTelegraphVisual(event) {
 if(!event)return null
 const d=event.pattern?{...event.pattern,...event}:event
 const raw=d.shape,shape=({circle:'disk',ring:'annulus',fan:'sector'})[raw]??raw
 if(!['disk','annulus','line','cross','sector','three_disks','three_lines','grid'].includes(shape))return null
 if(d.phase&&!['windup','telegraph','active'].includes(d.phase))return null
 const x=d.originXZ?.[0]??d.x??0,z=d.originXZ?.[1]??d.z??0,yaw=d.yaw??0
 const radius=d.outerRadius??d.radius??d.rangeUnits,length=d.length??d.rangeUnits,width=d.width??d.widthUnits
 if(!Number.isFinite(x+z+yaw))return null
 if(['disk','annulus','sector','three_disks'].includes(shape)&&!positive(radius))return null
 if(['line','cross','three_lines','grid'].includes(shape)&&(!positive(length)||!positive(width)))return null
 if(shape==='annulus'&&!Number.isFinite(d.innerRadius)&&!positive(width))return null
 if(shape==='three_disks'&&(!Array.isArray(d.offsetsUnits)||d.offsetsUnits.length>8||!d.offsetsUnits.every(v=>v.length===2&&v.every(Number.isFinite))))return null
 if(shape==='three_lines'&&(!Array.isArray(d.anglesDeg)||d.anglesDeg.length>8||!d.anglesDeg.every(Number.isFinite)))return null
 if(shape==='grid'&&(!Array.isArray(d.lineOffsetsUnits)||d.lineOffsetsUnits.length>8||!d.lineOffsetsUnits.every(Number.isFinite)))return null
 const root=new THREE.Group();root.name=`expansion-${shape}-${d.phase??'telegraph'}`;root.position.set(x,.035,z)
 const active=d.phase==='active',F=EXPANSION_TELEGRAPH_FILL
 // vertexColors: 번짐 띠가 같은 재질을 쓰며 정점 알파로 사라진다. 채움 지오메트리에는 알파 1 color를 붙인다.
 const fillMat=new THREE.MeshBasicMaterial({color:telegraphFillColor(d,active),transparent:true,opacity:active?F.activeOpacity:F.windupOpacity,side:THREE.DoubleSide,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,vertexColors:true})
 root.userData.fillMat=fillMat
 function groundMesh(parent,geometry,mat,px=0,pz=0) {
   if(!geometry.attributes.color)addOpaqueVertexAlpha(geometry)
   const mesh=new THREE.Mesh(geometry,mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(px,.003,pz);mesh.renderOrder=3;parent.add(mesh);return mesh
 }
 // 채움 윤곽 바깥쪽 번짐(XY 평면 — groundMesh가 채움과 같은 회전으로 눕힌다).
 function featherMesh(parent,loops,px=0,pz=0,holes=null) {
   const mesh=groundMesh(parent,buildTelegraphFeatherGeometry(loops,{plane:'xy',holes}),fillMat,px,pz);mesh.name=TELEGRAPH_FEATHER.name;return mesh
 }
 if(Array.isArray(d.safetyPolygons)) {
   // Locked WORLD polygons already include map and wall clipping. Never draw
   // the unclipped authored footprint over a safe/damage-free area.
   const chunks=Array.from({length:shape==='three_disks'?d.offsetsUnits.length:1},()=>[])
   d.safetyPolygons.forEach(p=>chunks[p.sourceIndex??0].push(p))
   for(const polygons of chunks){
     const fill=[]
     for(const p of polygons)for(let i=1;i+1<p.length;i++)for(const v of [p[0],p[i],p[i+1]])fill.push(v[0]-x,0,v[1]-z)
     const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(fill,3));addOpaqueVertexAlpha(geometry)
     const mesh=new THREE.Mesh(geometry,fillMat);mesh.renderOrder=3;root.add(mesh)
   }
   // 번짐: 잘린 조각들이 맞닿은 안쪽 변은 빼고(채움 안 줄무늬 방지) 바깥 경계에만 붙인다. 채움 메시들 뒤에 둔다(children[0] = 채움).
   const loops=d.safetyPolygons.filter(p=>p.length>=3).map(p=>p.map(v=>[v[0]-x,v[1]-z]))
   if(loops.length){const feather=new THREE.Mesh(buildTelegraphFeatherGeometry(loops,{boundary:telegraphBoundaryEdges(loops)}),fillMat);feather.name=TELEGRAPH_FEATHER.name;feather.renderOrder=3;root.add(feather)}
   if(shape==='disk')addB10StampDecal(root,d,radius)
   root.userData.expansionSnapshot=d
   updateExpansionTelegraphVisual(root,d)
   // 시간 곡선 표식은 위 초기 불투명도 뒤에 붙인다 → 만든 직후의 root는 실제 피해 기하 그대로(배율 1).
   if(isB05ChantTelegraph(d))root.userData.b05Chant=true
   return root
 }
 function circle(px,pz,inner=0,outer=radius,angle=tau) {
   if(outer<=inner||inner<0)return
   const start=-Math.PI/2-angle/2
   groundMesh(root,inner===0?new THREE.CircleGeometry(outer,48,start,angle):new THREE.RingGeometry(inner,outer,48,1,start,angle),fillMat,px,pz)
   const loops=[circleLoop(outer,{segments:48,start,angle})]
   if(inner>0)loops.push(circleLoop(inner,{segments:48,start,angle}))
   featherMesh(root,loops,px,pz,inner>0?[false,true]:null)
 }
 function line(angle,offsetX=0,offsetZ=0,both=false) {
   const group=new THREE.Group();group.rotation.y=angle;group.position.set(offsetX,0,offsetZ)
   const l=both?length*2:length,z=both?0:l/2
   groundMesh(group,new THREE.PlaneGeometry(width,l),fillMat,0,z)
   featherMesh(group,[rectLoop(width/2,l/2)],0,z)
   root.add(group)
 }
 switch(shape) {
 case 'disk':circle(0,0);addB10StampDecal(root,d,radius);break
 case 'annulus':circle(0,0,d.innerRadius??Math.max(0,radius-width));break
 case 'three_disks':d.offsetsUnits.forEach(([ox,oz])=>circle(ox,oz));break
 case 'sector': {
   const angle=d.angle??(d.angleDeg??60)*Math.PI/180
   if(!positive(angle)||angle>tau){disposeExpansionTelegraphVisual(root);return null}
   root.rotation.y=d.directionXZ?Math.atan2(d.directionXZ[0],d.directionXZ[1]):yaw
   circle(0,0,0,radius,angle);break
 }
 case 'line':line(yaw);break
 case 'cross': {
   const a=(d.angleDeg??0)*Math.PI/180
   line(a,0,0,true);line(a+Math.PI/2,0,0,true);break
 }
 case 'three_lines':d.anglesDeg.forEach(deg=>line(yaw+deg*Math.PI/180));break
 case 'grid':d.lineOffsetsUnits.forEach(o=>{line(0,o,0,true);line(Math.PI/2,0,o,true)});break
 }
 root.userData.expansionSnapshot=d
 if(isB05ChantTelegraph(d))root.userData.b05Chant=true
 return root
}
export function disposeExpansionTelegraphVisual(root) {
 if(!root)return
 root.traverse(n=>{if(n.isMesh)n.geometry.dispose()})
 root.userData.fillMat?.dispose()
 root.userData.stampMat?.dispose()
}
