import * as THREE from 'three'
const tau=Math.PI*2
export const EXPANSION_PATTERN_SHAPES=Object.freeze({b05_p1:'annulus',b05_p2:'cross',b06_p1:'disk',b06_p2:'three_disks',b07_p1:'three_lines',b07_p2:'annulus',b08_p1:'cross',b08_p2:'sector',b09_p1:'grid',b09_p2:'annulus',b10_p1:'disk',b10_p2:'sector'})
export const EXPANSION_TELEGRAPH_CAPACITY=32
// B10 결재 도장(b10_p1) disk 중심 "決" 도장 무늬 데칼(스펙 Part B §12-3).
// 2026-11-14 Terry: 경고는 원형 색상만 — windup(경고) 중에는 도장 무늬를 띄우지 않는다(windupMaxOpacity 0).
// active(타격) 순간에만 0.9로 찍힌다. 텍스처는 모듈 수명 동안 하나만 만든다(캔버스가 없으면 생략).
export const B10_STAMP_PATTERN_ID='b10_p1'
export const B10_STAMP_DECAL=Object.freeze({color:'#d7263d',windupMaxOpacity:0,activeOpacity:.9,radiusScale:.82})
let b10StampTexture
export function getB10StampTexture() {
 if(b10StampTexture!==undefined)return b10StampTexture
 b10StampTexture=null
 if(typeof document==='undefined')return null
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256
 const ctx=canvas.getContext?.('2d')
 if(!ctx||typeof ctx.fillText!=='function')return null
 ctx.clearRect(0,0,256,256)
 ctx.strokeStyle=B10_STAMP_DECAL.color;ctx.fillStyle=B10_STAMP_DECAL.color
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
export const EXPANSION_TELEGRAPH_FILL=Object.freeze({color:'#f5ce69',activeColor:'#f88578',windupOpacity:.4,windupOpacityGain:.18,activeOpacity:.55})
export function updateExpansionTelegraphVisual(root,event) {
 if(!root)return
 const raw=event.windupMs>0?event.elapsedMs/event.windupMs:event.progress??0
 const progress=Number.isFinite(raw)?Math.max(0,Math.min(1,raw)):0
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
 const fillMat=new THREE.MeshBasicMaterial({color:active?F.activeColor:F.color,transparent:true,opacity:active?F.activeOpacity:F.windupOpacity,side:THREE.DoubleSide,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2})
 root.userData.fillMat=fillMat
 function groundMesh(parent,geometry,mat,px=0,pz=0) {
   const mesh=new THREE.Mesh(geometry,mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(px,.003,pz);mesh.renderOrder=3;parent.add(mesh);return mesh
 }
 if(Array.isArray(d.safetyPolygons)) {
   // Locked WORLD polygons already include map and wall clipping. Never draw
   // the unclipped authored footprint over a safe/damage-free area.
   const chunks=Array.from({length:shape==='three_disks'?d.offsetsUnits.length:1},()=>[])
   d.safetyPolygons.forEach(p=>chunks[p.sourceIndex??0].push(p))
   for(const polygons of chunks){
     const fill=[]
     for(const p of polygons)for(let i=1;i+1<p.length;i++)for(const v of [p[0],p[i],p[i+1]])fill.push(v[0]-x,0,v[1]-z)
     const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(fill,3))
     const mesh=new THREE.Mesh(geometry,fillMat);mesh.renderOrder=3;root.add(mesh)
   }
   if(shape==='disk')addB10StampDecal(root,d,radius)
   root.userData.expansionSnapshot=d
   updateExpansionTelegraphVisual(root,d)
   return root
 }
 function circle(px,pz,inner=0,outer=radius,angle=tau) {
   if(outer<=inner||inner<0)return
   groundMesh(root,inner===0?new THREE.CircleGeometry(outer,48,-Math.PI/2-angle/2,angle):new THREE.RingGeometry(inner,outer,48,1,-Math.PI/2-angle/2,angle),fillMat,px,pz)
 }
 function line(angle,offsetX=0,offsetZ=0,both=false) {
   const group=new THREE.Group();group.rotation.y=angle;group.position.set(offsetX,0,offsetZ)
   const l=both?length*2:length,z=both?0:l/2
   groundMesh(group,new THREE.PlaneGeometry(width,l),fillMat,0,z)
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
 return root
}
export function disposeExpansionTelegraphVisual(root) {
 if(!root)return
 root.traverse(n=>{if(n.isMesh)n.geometry.dispose()})
 root.userData.fillMat?.dispose()
 root.userData.stampMat?.dispose()
}
