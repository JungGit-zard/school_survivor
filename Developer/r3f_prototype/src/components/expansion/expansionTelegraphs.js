import * as THREE from 'three'
export const EXPANSION_PATTERN_SHAPES=Object.freeze({b05_p1:'cross',b05_p2:'annulus',b06_p1:'disk',b06_p2:'three_disks',b07_p1:'three_lines',b07_p2:'annulus',b08_p1:'cross',b08_p2:'sector',b09_p1:'grid',b09_p2:'annulus'})
export const EXPANSION_TELEGRAPH_CAPACITY=32
const tau=Math.PI*2
const positive=v=>Number.isFinite(v)&&v>0&&v<=64
// World-space diagonal hatch: normal spacing .28 units (.07 blocks), width
// .045 units (.01125 blocks). Clip each stripe to the authoritative convex piece.
const hatchSpacing=.28,hatchWidth=.045,sqrt2=Math.SQRT2
function clipWarningStripe(p,bound,keepAbove) {
 const out=[]
 for(let i=0;i<p.length;i++){
   const a=p[i],b=p[(i+1)%p.length],da=(a[0]+a[1])/sqrt2-bound,db=(b[0]+b[1])/sqrt2-bound
   const ia=keepAbove?da>=0:da<=0,ib=keepAbove?db>=0:db<=0
   if(ia)out.push(a)
   if(ia!==ib){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])}
 }
 return out
}
function addWarningCues(root,parent,polygons,x,z) {
 if(!polygons.length)return
 const hatch=[],centers=[],offsets=[],inner=[]
 for(const p of polygons){
   if(p.length<3)continue
   const projections=p.map(v=>(v[0]+v[1])/sqrt2),lo=Math.min(...projections),hi=Math.max(...projections)
   for(let k=Math.ceil((lo-hatchWidth)/hatchSpacing);k*hatchSpacing<=hi;k++){
     const clipped=clipWarningStripe(clipWarningStripe(p,k*hatchSpacing,true),k*hatchSpacing+hatchWidth,false)
     for(let i=1;i+1<clipped.length;i++)for(const v of [clipped[0],clipped[i],clipped[i+1]])hatch.push(v[0]-x,.004,v[1]-z)
   }
   // Convex pieces are contracted about their own interior centroid. Scaling
   // the whole authored shape could cross a wall shadow or fill an annulus hole.
   const cx=p.reduce((n,v)=>n+v[0],0)/p.length,cz=p.reduce((n,v)=>n+v[1],0)/p.length
   for(let i=0;i<p.length;i++){
     const a=p[i],b=p[(i+1)%p.length]
     for(const [v,isInner]of [[a,0],[b,0],[b,1],[a,0],[b,1],[a,1]]){
       centers.push(cx-x,cz-z);offsets.push(v[0]-cx,v[1]-cz);inner.push(isInner)
     }
   }
 }
 if(!offsets.length)return
 if(!root.userData.hatchMat){
   const options={transparent:true,opacity:.92,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}
   root.userData.hatchMat=new THREE.MeshBasicMaterial({...options,color:'#171717'})
   root.userData.shrinkMat=new THREE.MeshBasicMaterial({...options,color:'#ffffff'})
   root.userData.warningCues=[]
 }
 const hatchGeometry=new THREE.BufferGeometry();hatchGeometry.setAttribute('position',new THREE.Float32BufferAttribute(hatch,3))
 const hatchMesh=new THREE.Mesh(hatchGeometry,root.userData.hatchMat);hatchMesh.userData.warningCue='hatch';hatchMesh.renderOrder=4;parent.add(hatchMesh)
 const geometry=new THREE.BufferGeometry(),positions=new THREE.BufferAttribute(new Float32Array(inner.length*3),3);positions.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('position',positions)
 const mesh=new THREE.Mesh(geometry,root.userData.shrinkMat);mesh.userData.warningCue='shrink';mesh.renderOrder=5
 // Positions contract in-place. Avoid stale bounding-sphere frustum/raycast
 // caches; vertex count/buffers stay constant for the entire warning.
 mesh.frustumCulled=false;parent.add(mesh)
 root.userData.warningCues.push({mesh,centers,offsets,inner})
}
export function updateExpansionTelegraphVisual(root,event) {
 if(!root)return
 const raw=event.windupMs>0?event.elapsedMs/event.windupMs:event.progress??0
 const progress=Number.isFinite(raw)?Math.max(0,Math.min(1,raw)):0
 root.userData.fillMat.opacity=event.phase==='active'?.30:.12+progress*.08
 if(root.userData.warningProgress===progress)return
 root.userData.warningProgress=progress
 const outer=.96*(1-progress),inside=outer*.84
 for(const cue of root.userData.warningCues??[]){
   const a=cue.mesh.geometry.attributes.position,array=a.array
   for(let i=0;i<cue.inner.length;i++){
     const scale=cue.inner[i]?inside:outer
     array[i*3]=cue.centers[i*2]+cue.offsets[i*2]*scale
     array[i*3+1]=.006
     array[i*3+2]=cue.centers[i*2+1]+cue.offsets[i*2+1]*scale
   }
   a.needsUpdate=true;cue.mesh.geometry.boundingSphere=null;cue.mesh.geometry.boundingBox=null
 }
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
 const active=d.phase==='active',color=active?'#f88578':'#f5ce69',edge=active?'#c1f6eb':'#fff0b5'
 const fillMat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:active?.30:.12,side:THREE.DoubleSide,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2})
 const edgeMat=new THREE.MeshBasicMaterial({color:edge,transparent:true,opacity:.88,side:THREE.DoubleSide,depthWrite:false,toneMapped:false})
 root.userData.fillMat=fillMat;root.userData.edgeMat=edgeMat
 function groundMesh(parent,geometry,mat,px=0,pz=0) {
   const mesh=new THREE.Mesh(geometry,mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(px,.003,pz);mesh.renderOrder=3;parent.add(mesh);return mesh
 }
 if(Array.isArray(d.safetyPolygons)) {
   // Locked WORLD polygons already include map and wall clipping. Never draw
   // the unclipped authored footprint over a safe/damage-free area.
   const chunks=Array.from({length:shape==='three_disks'?d.offsetsUnits.length:1},()=>[])
   d.safetyPolygons.forEach(p=>chunks[p.sourceIndex??0].push(p))
   for(const polygons of chunks){
     const fill=[],stroke=[]
     for(const p of polygons){
       for(let i=1;i+1<p.length;i++)for(const v of [p[0],p[i],p[i+1]])fill.push(v[0]-x,0,v[1]-z)
       for(let i=0;i<p.length;i++){
         const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)
         if(l<1e-7)continue
         const nx=-dz/l*.012,nz=dx/l*.012
         const v=[[a[0],a[1]],[b[0],b[1]],[b[0]+nx,b[1]+nz],[a[0]+nx,a[1]+nz]]
         for(const j of [0,1,2,0,2,3])stroke.push(v[j][0]-x,.001,v[j][1]-z)
       }
     }
     for(const [vertices,material]of [[fill,fillMat],[stroke,edgeMat]]){
       const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3))
       const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=3;root.add(mesh)
       if(material===fillMat&&!active)addWarningCues(root,mesh,polygons,x,z)
     }
   }
   root.userData.expansionSnapshot=d
   updateExpansionTelegraphVisual(root,d)
   return root
 }
 function circle(px,pz,inner=0,outer=radius,angle=tau) {
   if(outer<=inner||inner<0)return
   groundMesh(root,inner===0?new THREE.CircleGeometry(outer,48,-Math.PI/2-angle/2,angle):new THREE.RingGeometry(inner,outer,48,1,-Math.PI/2-angle/2,angle),fillMat,px,pz)
   const band=Math.min(.055,outer*.08)
   groundMesh(root,new THREE.RingGeometry(Math.max(inner,outer-band),outer,48,1,-Math.PI/2-angle/2,angle),edgeMat,px,pz)
   if(inner>0)groundMesh(root,new THREE.RingGeometry(inner,Math.min(outer,inner+band),48,1,-Math.PI/2-angle/2,angle),edgeMat,px,pz)
   if(angle<tau)for(const sign of [-1,1]){
     const a=sign*angle/2,l=outer-inner
     const line=new THREE.Group();line.rotation.y=a;line.position.set(px,0,pz)
     groundMesh(line,new THREE.PlaneGeometry(.045,l),edgeMat,0,inner+l*.5);root.add(line)
   }
 }
 function line(angle,offsetX=0,offsetZ=0,both=false) {
   const group=new THREE.Group();group.rotation.y=angle;group.position.set(offsetX,0,offsetZ)
   const l=both?length*2:length,z=both?0:l/2,stroke=Math.min(.045,width*.12)
   groundMesh(group,new THREE.PlaneGeometry(width,l),fillMat,0,z)
   groundMesh(group,new THREE.PlaneGeometry(stroke,l),edgeMat,-width/2+stroke/2,z)
   groundMesh(group,new THREE.PlaneGeometry(stroke,l),edgeMat,width/2-stroke/2,z)
   groundMesh(group,new THREE.PlaneGeometry(width,stroke),edgeMat,0,z-l/2+stroke/2)
   groundMesh(group,new THREE.PlaneGeometry(width,stroke),edgeMat,0,z+l/2-stroke/2)
   root.add(group)
 }
 switch(shape) {
 case 'disk':circle(0,0);break
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
 root.userData.fillMat?.dispose();root.userData.edgeMat?.dispose()
 root.userData.hatchMat?.dispose();root.userData.shrinkMat?.dispose()
}
