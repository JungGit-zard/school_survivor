import * as THREE from 'three'
import { EXPANSION_STAGE_VISUALS } from '../../lib/expansionVisuals.js'
import { getCachedToonMat, getCachedOutlineMat, inflateScale } from '../../lib/toon.js'
import { getExpansionGeometry } from './expansionRig.js'
import { captureStudioPartBaseTransforms, composeStudioPartPosition, composeStudioPartRotation, disposeStudioOwnedMaterials } from '../StudioTunedGroup.jsx'

// Static scenery is geometry/material batched. It is decoration, not a second
// collider registry: every raised prop footprint is outside the playable bounds.
export function createExpansionEnvironment(stageId,{halfX=7.5,halfZ=19.2}={}) {
 const art=EXPANSION_STAGE_VISUALS[stageId]
 if(!art)return null
 const root=new THREE.Group();root.name=`${stageId}-${art.theme}-environment`
 const records=[],bounds=[]
 const add=(name,shape,size,p,color=art.coat,r=[0,0,0],emissive=.06)=>records.push({name,shape,size,p,color,r,emissive})
 const box=(n,s,p,c,r)=>add(n,'box',s,p,c,r)
 const cyl=(n,s,p,c,r)=>add(n,'cylinder',s,p,c,r)
 const orb=(n,s,p,c)=>add(n,'orb',s,p,c)
 const cone=(n,s,p,c,r)=>add(n,'cone',s,p,c,r)
 const ring=(n,s,p,c,r)=>add(n,'ring',s,p,c,r)
 const claim=(x,z,hx,hz)=>bounds.push({minX:x-hx,maxX:x+hx,minZ:z-hz,maxZ:z+hz})
 box('arena-slab',[halfX*2,.30,halfZ*2],[0,-.17,0],art.floor)
 for(let z=-halfZ;z<=halfZ;z+=1.8)box('floor-seam',[halfX*2,.015,.025],[0,-.011,z],art.dark)
 for(let x=-halfX;x<=halfX;x+=1.8)box('floor-seam',[.025,.015,halfZ*2],[x,-.011,0],art.dark)
 // Flat inlaid central compass/medallion, never an invisible raised blocker.
 for(let i=0;i<4;i++)box('inlaid-wayfinding',[.10,.012,5],[Math.cos(i*Math.PI/2)*2,-.002,Math.sin(i*Math.PI/2)*3],art.accent,[0,i*Math.PI/2,0])
 for(const side of [-1,1]) {
   const x=side*(halfX+1.5)
   for(let z=-halfZ+2;z<halfZ;z+=5.1) {
     claim(x,z,1.28,1.85)
     box('perimeter-plinth',[2.5,.33,3.6],[x,.13,z],art.dark)
     if(stageId==='stage6') {
       box('bookcase-back',[.20,3.65,3.45],[x+side*.94,1.99,z],art.coat)
       for(const dz of [-1.66,1.66])box('bookcase-upright',[2.30,3.65,.15],[x,1.99,z+dz],art.trim)
       for(let tier=0;tier<4;tier++) {
         const y=.38+tier*.83
         box('bookcase-shelf',[2.30,.12,3.46],[x,y,z],art.coat)
         for(let b=0;b<11;b++) {
           const h=.47+(b%3)*.10
           box('gilt-books',[.30,h,.17],[x-side*.33,y+.08+h*.5,z-1.45+b*.27],['#84705b','#4b698c','#b99159','#784755'][b%4],[0,0,(b%5===0?side*.13:0)])
           box('book-gilt',[.315,.05,.175],[x-side*.33,y+.20,z-1.45+b*.27],art.trim)
         }
       }
       cyl('brass-lamp-stem',[.10,1.05,.10],[x,4.22,z],art.trim)
       cone('library-lampshade',[.87,.52,.87],[x,4.88,z],art.light)
       orb('lamp-pearl',[.23,.23,.23],[x,4.62,z],art.trim)
     } else if(stageId==='stage7') {
       box('lab-console',[2.32,1.03,3.30],[x,.84,z],art.coat)
       box('worktop',[2.50,.15,3.50],[x,1.44,z],art.dark)
       for(let b=0;b<5;b++) {
         const bz=z-1.30+b*.63
         cyl('culture-fluid',[.39,.78,.39],[x-side*.23,1.91,bz],b%2?art.trim:'#8da0e5')
         cyl('culture-lid',[.46,.09,.46],[x-side*.23,2.33,bz],art.light)
         cyl('flask-neck',[.13,.33,.13],[x+side*.54,1.88,bz],art.trim)
         orb('round-flask',[.44,.45,.44],[x+side*.54,1.63,bz],art.light)
         box('control-key',[.18,.05,.18],[x-side*.72,1.55,bz],art.trim)
       }
       for(let b=0;b<6;b++) {
         const a=b*Math.PI*2/6
         orb('orbit-model',[.20,.20,.20],[x+Math.cos(a)*.76,3.33+Math.sin(a)*.65,z],b%2?art.trim:art.light)
       }
       ring('atom-orbit',[1.74,1.74,1.74],[x,3.33,z],art.trim,[0,Math.PI/2,0])
       box('lab-backscreen',[.20,1.12,1.30],[x+side*.95,2.32,z],art.dark)
       for(let b=0;b<5;b++)box('oscilloscope-bar',[.03,.14+b*.07,.12],[x+side*.83,2.14,z-.47+b*.24],art.trim)
     } else if(stageId==='stage8') {
       cyl('terracotta-planter',[1.92,.70,2.12],[x,.65,z],'#ac765e')
       cyl('planter-rim',[2.10,.14,2.35],[x,1.05,z],'#d79d73')
       cyl('dark-soil',[1.85,.06,2.05],[x,1.12,z],art.dark)
       for(let b=0;b<6;b++) {
         const a=b*Math.PI/3,bx=x+Math.cos(a)*.57,bz=z+Math.sin(a)*.70,h=1.10+(b%3)*.35
         cyl('plant-stem',[.075,h,.075],[bx,1.18+h*.5,bz],art.trim)
         for(let leaf=0;leaf<3;leaf++)orb('round-leaf',[.57,.20,.31],[bx+(leaf%2?-.2:.2),1.35+leaf*.38,bz],leaf%2?art.skin:art.coat)
         orb('flower-center',[.28,.28,.28],[bx,1.24+h,bz],art.light)
         for(let petal=0;petal<4;petal++){
           const a2=petal*Math.PI/2
           orb('bloom-petal',[.30,.29,.24],[bx+Math.cos(a2)*.19,1.24+h+Math.sin(a2)*.19,bz],art.trim)
         }
       }
       box('glasshouse-rib',[.16,5.3,.16],[x+side*.94,2.8,z],art.light)
       cone('glasshouse-leaf-fin',[1.55,1.5,.21],[x+side*.64,4.46,z],art.coat,[0,0,side*.35])
     } else if(stageId==='stage9') {
       box('proscenium-pillar',[.47,4.80,.47],[x,2.60,z],art.trim)
       for(let pleat=0;pleat<7;pleat++)cyl('velvet-drape',[.44,4.05,.44],[x+side*.33,2.6,z-1.32+pleat*.44],pleat%2?art.coat:'#5d2e59')
       for(let fringe=0;fringe<9;fringe++)cone('curtain-fringe',[.18,.26,.18],[x-side*.37,.45,z-1.44+fringe*.36],art.trim,[0,0,Math.PI])
       box('spotlight-base',[1.65,.22,1.2],[x,.43,z],art.dark)
       cyl('spotlight-barrel',[.88,1.10,.88],[x,1.14,z],art.dark,[Math.PI/2,0,side*-.30])
       cyl('spotlight-lens',[.70,1.12,.70],[x,1.14,z],art.trim,[Math.PI/2,0,side*-.30])
       for(const dx of [-.45,.45])box('spotlight-yoke',[.12,1.25,.12],[x+dx,.96,z],art.trim)
       ring('opera-emblem',[.73,.73,.73],[x-side*.30,4.28,z],art.light,[0,Math.PI/2,0])
     } else {
       box('rooftop-generator',[2.15,1.67,3.20],[x,1.13,z],art.coat)
       box('generator-face',[.10,1.30,2.80],[x-side*1.10,1.17,z],art.dark)
       for(let fin=0;fin<12;fin++)box('cooling-fin',[.12,.86,.09],[x-side*1.18,1.18,z-1.25+fin*.23],art.trim)
       for(let battery=0;battery<3;battery++){
         cyl('capacitor-cell',[.53,.95,.53],[x,2.42,z-.92+battery*.92],art.dark)
         cyl('capacitor-terminal',[.20,.17,.20],[x,2.98,z-.92+battery*.92],art.light)
         ring('capacitor-band',[.61,.61,.61],[x,2.42,z-.92+battery*.92],art.trim,[Math.PI/2,0,0])
       }
       box('roof-railing',[.16,1.15,3.65],[x+side*.95,.92,z],art.dark)
       for(const dz of [-1.5,0,1.5])box('roof-railing-post',[.13,1.55,.13],[x+side*.95,.84,z+dz],art.trim)
     }
   }
 }
 // End-of-arena landmarks are large, multi-volume sculptures behind the boundary.
 for(const side of [-1,1]) {
   const z=side*(halfZ+1.4)
   claim(0,z,halfX+2.7,1.15)
   box('end-platform',[halfX*2+5,.36,2.2],[0,.12,z],art.dark)
   for(let x=-halfX;x<=halfX;x+=1.35) {
     box('end-dado',[.32,2.2,.28],[x,1.39,z],art.trim)
     if(stageId==='stage6') {
       for(let page=0;page<4;page++)box('archive-pediment-book',[1.08,.14,.66],[x,2.8+page*.17,z],page%2?art.coat:art.trim,[0,0,(page%2-.5)*.09])
     }else if(stageId==='stage7') {
       cyl('prism-base',[.92,.22,.92],[x,2.63,z],art.dark)
       cone('prism-crystal',[.67,1.15,.67],[x,3.30,z],x%2?art.trim:art.light,[0,Math.PI/4,0])
     }else if(stageId==='stage8') {
       box('moonwindow-rib',[.075,2.1,.075],[x,3.57,z],art.light,[0,0,x*.045])
       orb('hanging-bloom',[.55,.45,.5],[x,3.07,z],art.trim)
       cyl('hanging-stem',[.055,.70,.055],[x,3.65,z],art.skin)
     }else if(stageId==='stage9') {
       orb('mask-sign',[.74,1.0,.28],[x,3.25,z],art.light)
       box('mask-eyeL',[.13,.09,.10],[x-.14,3.38,z+side*.14],art.dark)
       box('mask-eyeR',[.13,.09,.10],[x+.14,3.38,z+side*.14],art.dark)
     }else {
       box('lightning-rod',[.10,4.6,.10],[x,2.4,z],art.trim)
       cone('rod-crown',[.26,.50,.26],[x,4.94,z],art.light)
       for(let tooth=0;tooth<3;tooth++)ring('rod-insulator',[.57,.57,.57],[x,3.30+tooth*.25,z],art.light,[Math.PI/2,0,0])
     }
   }
   if(stageId==='stage6'||stageId==='stage9')box('ornate-crossbeam',[halfX*2+1,.50,.52],[0,5.23,z],art.trim)
 }
 if(stageId==='stage10')for(const side of [-1,1]) {
   const x=side*(halfX+2),z=-halfZ-2.8;claim(x,z,1,1)
   box('turbine-pylon',[.44,6.8,.44],[x,3.5,z],art.light)
   orb('turbine-hub',[.80,.80,.80],[x,6.5,z],art.trim)
   // These two turbines animate in the fixed-size spectacle pool below.
 }
 // Hero landmarks: silhouettes beyond the playable edges, never roofs over actors.
 if(stageId==='stage6') {
   const z=-halfZ-2.4;claim(0,z,5.5,.55)
   ring('oculus-brass',[10.4,10.4,1.3],[0,6.4,z],art.trim)
   ring('oculus-inner-rim',[8.8,8.8,1.1],[0,6.4,z],art.light)
   for(let spoke=0;spoke<12;spoke++) {
     const a=spoke*Math.PI/6
     box('oculus-tracery',[.12,1.65,.13],[Math.sin(a)*4.45,6.4+Math.cos(a)*4.45,z],art.trim,[0,0,-a])
   }
 } else if(stageId==='stage7') {
   for(const side of [-1,1]) {
     const x=side*(halfX+4.1),z=-halfZ+4;claim(x,z,1.3,1.3)
     cyl('reaction-tower-core',[1.27,5.1,1.27],[x,2.8,z],art.trim)
     for(let level=0;level<7;level++) {
       ring('tower-glass-rib',[2.15,2.15,2.15],[x,.45+level*.82,z],art.light,[Math.PI/2,0,0])
       for(const dx of [-.91,.91])box('tower-glass-brace',[.075,.86,.075],[x+dx,.85+level*.82,z],art.dark)
     }
     cone('tower-prism-cap',[2.4,1.65,2.4],[x,6.58,z],art.light,[0,Math.PI/4,0])
     for(let r=0;r<4;r++)cone('ceiling-prism',[.55,1.4,.55],[x+side*1.45,4.8+r*.6,z+2-r*.3],r%2?art.trim:art.light,[0,0,side*.35])
   }
 } else if(stageId==='stage8') {
   const z=-halfZ-2.9;claim(0,z,6.5,1)
   // Open star-glass dome ribs; no opaque ceiling or central support.
   for(let rib=0;rib<11;rib++) {
     const a=-Math.PI*.46+rib*Math.PI*.092
     box('starlight-dome-rib',[.10,1.44,.12],[Math.sin(a)*6.1,3.5+Math.cos(a)*5.0,z],art.light,[0,0,-a])
     orb('glass-dome-star',[.16,.16,.16],[Math.sin(a)*5.6,3.5+Math.cos(a)*4.6,z+.10],art.trim)
   }
   for(const side of [-1,1]) {
     const x=side*(halfX+4),z0=halfZ*.62;claim(x,z0,1.8,1.8)
     cyl('giant-flower-stem',[.20,5.1,.20],[x,2.58,z0],art.skin)
     orb('giant-bloom-core',[.80,.8,.8],[x,5.3,z0],art.light)
     for(let petal=0;petal<7;petal++) {
       const a=petal*Math.PI*2/7
       orb('giant-bloom-petal',[1.0,1.30,.44],[x+Math.cos(a)*.82,5.3+Math.sin(a)*.82,z0],art.trim)
     }
     box('aqueduct-trough',[.72,.30,halfZ*1.4],[x,3.9,0],art.coat)
     box('aqueduct-water',[.54,.06,halfZ*1.4],[x,4.08,0],art.light)
   }
 } else if(stageId==='stage9') {
   for(const side of [-1,1])for(let tier=0;tier<3;tier++) {
     const x=side*(halfX+3.4+tier*.85),z=0;claim(x,z,.50,halfZ*.80)
     box('floating-grandstand',[.95,.28,halfZ*1.6],[x,1.2+tier*1.05,z],art.trim)
     for(let seat=0;seat<14;seat++) {
       const z0=-halfZ*.75+seat*halfZ*1.5/13
       box('velvet-seat',[.61,.22,.65],[x,1.50+tier*1.05,z0],art.coat)
       box('velvet-backrest',[.17,.77,.65],[x+side*.27,1.88+tier*1.05,z0],art.coat,[0,0,-side*.13])
     }
   }
   const z=-halfZ-3;claim(0,z,2.4,.5)
   orb('great-opera-mask',[4.3,5.1,.45],[0,5.8,z],art.light)
   for(const side of [-1,1])box('great-mask-eye',[.76,.31,.10],[side*.92,6.35,z+.25],art.dark,[0,0,side*-.22])
   ring('great-mask-smile',[1.8,.74,.20],[0,4.8,z+.26],art.trim)
 } else {
   for(let building=0;building<17;building++) {
     const x=(building-8)*1.75,z=-halfZ-8-(building%3)*1.5,h=3+(building%5)*.82
     claim(x,z,.70,.9);box('distant-city-tower',[1.25,h,1.5],[x,h*.5-.4,z],art.dark)
     for(let floor=0;floor<4;floor++)for(const dx of [-.3,.3])box('city-window',[.13,.20,.035],[x+dx,.7+floor*.60,z+.77],floor%2?art.trim:art.light)
   }
   for(const side of [-1,1]) {
     const x=side*(halfX+5),z=halfZ*.40;claim(x,z,1.25,1.25)
     box('sky-piercing-rod',[.20,10,.20],[x,5.1,z],art.trim)
     cone('rod-sky-tip',[.56,1.2,.56],[x,10.7,z],art.light)
     for(let tooth=0;tooth<5;tooth++)ring('tower-insulator',[1.5,1.5,1.5],[x,7.7+tooth*.35,z],art.light,[Math.PI/2,0,0])
     for(let cloud=0;cloud<5;cloud++)orb('storm-cloud',[2.1,1.2,1.5],[x+(cloud-2)*1.45,8.2+Math.sin(cloud)*.3,-halfZ-5],cloud%2?art.coat:art.dark)
   }
 }
 const staticRoot=new THREE.Group();staticRoot.name='authored-static-volumes';root.add(staticRoot)
 const batches=new Map()
 for(const record of records){const key=`${record.shape}:${record.color}:${record.emissive}`;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(record)}
 const matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(),e=new THREE.Euler()
 for(const [key,items]of batches) {
   const first=items[0],geometry=getExpansionGeometry(first.shape)
   const solid=new THREE.InstancedMesh(geometry,getCachedToonMat(first.color,first.emissive),items.length)
   solid.name=`${art.theme}-${key}-solid`;solid.frustumCulled=false
   const hull=new THREE.InstancedMesh(geometry,getCachedOutlineMat(),items.length)
   hull.name=`${art.theme}-${key}-outline`;hull.frustumCulled=false;hull.renderOrder=1
   for(let i=0;i<items.length;i++) {
     const item=items[i];p.fromArray(item.p);q.setFromEuler(e.fromArray(item.r));s.fromArray(item.size)
     matrix.compose(p,q,s);solid.setMatrixAt(i,matrix)
     s.multiplyScalar(inflateScale(1.025));matrix.compose(p,q,s);hull.setMatrixAt(i,matrix)
   }
   staticRoot.add(solid,hull)
 }
 const spectacle=new THREE.Group();spectacle.name=`${art.theme}-bounded-spectacle`;root.add(spectacle)
 for(let i=0;i<art.spectacleCount;i++) {
   const side=i%2?-1:1,x=side*(halfX+1.35),z=-halfZ+1.6+(i/2%8)*(halfZ*2-3.2)/8
   const moving=new THREE.Group();moving.name=`${art.theme}-spectacle-${i}`;moving.position.set(x,3+(i%3)*.36,z)
   moving.userData.expansionPhase=i*1.71
   const shape=stageId==='stage6'?'box':stageId==='stage7'?'orb':stageId==='stage8'?'cone':stageId==='stage9'?'cone':'ring'
   const mesh=new THREE.Mesh(getExpansionGeometry(shape),getCachedToonMat(i%2?art.accent:art.light,.22))
   mesh.name=`${art.theme}-spectacle-solid`;mesh.scale.set(stageId==='stage6'?.55:.22,stageId==='stage6'?.11:.35,.26)
   const hull=new THREE.Mesh(mesh.geometry,getCachedOutlineMat());hull.scale.copy(mesh.scale).multiplyScalar(inflateScale(1.035));hull.renderOrder=1
   moving.add(mesh,hull)
   if(stageId==='stage10'&&i<2) {
     moving.clear();moving.position.set(side*(halfX+2),6.5,-halfZ-2.8);moving.userData.expansionTurbine=true
     for(let blade=0;blade<3;blade++) {
       const a=blade*Math.PI*2/3,part=new THREE.Mesh(getExpansionGeometry('box'),getCachedToonMat(art.light,.1))
       part.position.set(Math.sin(a)*1.45,Math.cos(a)*1.45,0);part.rotation.z=-a;part.scale.set(.32,3.1,.18)
       const outline=new THREE.Mesh(part.geometry,getCachedOutlineMat());outline.position.copy(part.position);outline.rotation.copy(part.rotation);outline.scale.copy(part.scale).multiplyScalar(inflateScale(1.035));outline.renderOrder=1
       moving.add(part,outline)
     }
   } else if(stageId==='stage7') {
     moving.userData.expansionMolecule=true
     const orbit=new THREE.Mesh(getExpansionGeometry('ring'),getCachedToonMat(art.light,.12));orbit.scale.setScalar(.72);moving.add(orbit)
     for(let atom=0;atom<3;atom++) {
       const a=atom*Math.PI*2/3,part=new THREE.Mesh(getExpansionGeometry('orb'),getCachedToonMat(art.accent,.12))
       part.position.set(Math.sin(a)*.36,Math.cos(a)*.36,0);part.scale.setScalar(.17);moving.add(part)
     }
   } else if(stageId==='stage6') {
     const pages=new THREE.Mesh(getExpansionGeometry('box'),getCachedToonMat(art.light,.08));pages.position.y=.022;pages.scale.set(.49,.065,.27);moving.add(pages)
   }
   spectacle.add(moving)
 }
 root.userData.staticPartCount=records.length;root.userData.decorationBounds=bounds;root.userData.spectacle=spectacle;root.userData.expansionStageId=stageId
 captureStudioPartBaseTransforms(root)
 return root
}
export function animateExpansionEnvironment(root,time=0,reducedMotion=false) {
 if(!root)return
 const spectacle=root.userData.spectacle;spectacle.visible=!reducedMotion
 if(reducedMotion)return
 const t=Number.isFinite(time)?time:0
 for(const node of spectacle.children) {
   const a=node.userData.expansionPhase
   if(node.userData.expansionTurbine) {
     node.rotation.z=composeStudioPartRotation(node,'z',0,t*.28+a)
     continue
   }
   node.position.y=composeStudioPartPosition(node,'y',0,Math.sin(t*.62+a)*.22)
   node.position.z=composeStudioPartPosition(node,'z',0,root.userData.expansionStageId==='stage6'?Math.sin(t*.20+a)*.65:0)
   node.rotation.y=composeStudioPartRotation(node,'y',0,node.userData.expansionMolecule?t*.24+a:Math.sin(t*.31+a)*.35)
   node.rotation.z=composeStudioPartRotation(node,'z',0,Math.sin(t*.47+a)*.13)
 }
}
export function disposeExpansionEnvironment(root) {
 disposeStudioOwnedMaterials(root)
 root?.traverse(node=>{if(node.isInstancedMesh)node.dispose()})
 // Shared unit geometry/cached materials are not disposed on floor switches.
}
