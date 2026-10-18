import {afterEach,describe,expect,it} from 'vitest'
import * as THREE from 'three'
import {EXPANSION_BOSSES} from './expansionContent.js'
import {createExpansionAttackState,stepExpansionAttack,expansionAttackContains,clearExpansionAttacks,expansionAttackSnapshots} from './expansionAttackRuntime.js'
import {createExpansionTelegraphVisual,disposeExpansionTelegraphVisual} from '../components/expansion/expansionTelegraphs.js'
const args={x:0,z:0,playerX:0,playerZ:1,alive:true,playing:true,gameKey:0,hpRatio:1,deltaMs:2500,halfX:7.5,halfZ:19.2,obstacles:[]}
function start(type='B06',index=0,extra={}){
 clearExpansionAttacks();const state=createExpansionAttackState(type,'oracle');state.patternIndex=index
 stepExpansionAttack(state,{...args,...extra});return state
}
afterEach(clearExpansionAttacks)
// Independent oracle: THREE's closest point on the actual rendered triangles,
// not runtime polygon membership, clipping, or a second call to Contains.
function triangles(root){
 root.updateMatrixWorld(true);const out=[]
 root.traverse(mesh=>{if(!mesh.isMesh||mesh.material!==root.userData.fillMat)return
  const p=mesh.geometry.attributes.position,idx=mesh.geometry.index
  for(let i=0;i<(idx?.count??p.count);i+=3){const vs=[]
   for(let j=0;j<3;j++){const v=new THREE.Vector3().fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);v.y=0;vs.push(v)}
   if(new THREE.Triangle(...vs).getArea()>1e-10)out.push(new THREE.Triangle(...vs))
  }
 });return out
}
function distance(ts,x,z){const p=new THREE.Vector3(x,0,z),q=new THREE.Vector3();let d=Infinity
 for(const t of ts){t.closestPointToPoint(p,q);d=Math.min(d,p.distanceTo(q))}return d
}
// Independent slab intersection in obstacle-local XZ (no production sight helper).
function blocked(a,b,o,pad=0){const c=Math.cos(o.rotationY??0),s=Math.sin(o.rotationY??0)
 const local=([x,z])=>[c*(x-o.x)-s*(z-o.z),s*(x-o.x)+c*(z-o.z)]
 const u=local(a),v=local(b);let lo=0,hi=1
 for(let k=0;k<2;k++){const h=(k?o.halfZ:o.halfX)+pad,d=v[k]-u[k]
  if(Math.abs(d)<1e-12){if(Math.abs(u[k])>h)return false;continue}
  const t1=(-h-u[k])/d,t2=(h-u[k])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false
 }return true
}
describe('independent expansion attack safety oracle',()=>{
 for(const boss of Object.values(EXPANSION_BOSSES))for(let index=0;index<2;index++)it(`${boss.patterns[index].id}: body circle equals actual clipped warning AND active triangles`,()=>{
  const state=start(boss.id,index,{x:5.8,z:0,playerX:5.9,playerZ:.3,obstacles:[{x:4,z:2,halfX:2,halfZ:.25,rotationY:.3}]})
  const snap=state.snapshot;expect(snap).toBeTruthy();expect(snap.patternId).toBe(boss.patterns[index].id)
  for(const phase of ['windup','active']){
   const root=createExpansionTelegraphVisual({...snap,phase}),ts=triangles(root);expect(ts.length).toBeGreaterThan(0)
   for(let ix=0;ix<23;ix++)for(let iz=0;iz<25;iz++){
    const x=-7.4+ix*.67,z=-8.17+iz*.71,d=distance(ts,x,z)
    if(Math.abs(d-.192)<1e-5)continue
    const expected=Math.abs(x)<=7.5&&Math.abs(z)<=19.2&&d<=.192
    expect(expansionAttackContains(snap,x,z,.192),`${phase} circle at ${x},${z}`).toBe(expected)
   }
   for(const t of ts)for(const p of [t.a,t.b,t.c]){expect(Math.abs(p.x)).toBeLessThanOrEqual(7.50001);expect(Math.abs(p.z)).toBeLessThanOrEqual(19.20001)}
   disposeExpansionTelegraphVisual(root)
  }
 })
 for(const type of ['B08','B09'])it(`${type}: independently calculated cross/grid shadows for rotated OBB`,()=>{
  const obstacle={x:0,z:2,halfX:3,halfZ:.2,rotationY:.17}
  const snap=start(type,0,{playerZ:-1,obstacles:[obstacle]}).snapshot;expect(snap).toBeTruthy()
  let checked=0
  for(let ix=-12;ix<=12;ix++)for(let iz=-12;iz<=12;iz++){
   const x=ix*.31+.023,z=iz*.31+.047,r=snap.rangeUnits,w=snap.widthUnits
   const emitters=type==='B08'?[[0,0,0],[0,0,Math.PI/2]]:snap.lineOffsetsUnits.flatMap(o=>[[o,0,0],[0,o,Math.PI/2]])
   const expected=emitters.some(([ox,oz,a])=>{const side=Math.cos(a)*(x-ox)-Math.sin(a)*(z-oz),along=Math.sin(a)*(x-ox)+Math.cos(a)*(z-oz)
    return Math.abs(side)<w/2&&Math.abs(along)<r&&!blocked([ox,oz],[x,z],obstacle)
   })
   expect(expansionAttackContains(snap,x,z,0),`independent shadow at ${x},${z}`).toBe(expected);checked++
  }expect(checked).toBeGreaterThan(600)
 })
 it('certifies a physically clear 1.2 unit/.3 block lane plus .192 unit/.048 block body',()=>{
  const obstacle={x:3,z:2,halfX:1,halfZ:.3,rotationY:.4},snap=start('B06',0,{obstacles:[obstacle]}).snapshot
  expect(snap).toBeTruthy();const channel=snap.escapeChannel,clearance=.6+.192
  expect(channel.widthUnits).toBe(1.2);expect(channel.clearanceUnits).toBe(clearance)
  expect(blocked(channel.fromXZ,channel.toXZ,obstacle,clearance)).toBe(false)
  expect(Math.hypot(channel.toXZ[0]-channel.fromXZ[0],channel.toXZ[1]-channel.fromXZ[1])).toBeLessThanOrEqual(snap.windupMs/1000*3+1e-8)
  const root=createExpansionTelegraphVisual(snap)
  expect(distance(triangles(root),...channel.toXZ)).toBeGreaterThan(clearance-1e-5)
  expect(Math.abs(channel.toXZ[0])+clearance).toBeLessThanOrEqual(7.5)
  expect(Math.abs(channel.toXZ[1])+clearance).toBeLessThanOrEqual(19.2)
  disposeExpansionTelegraphVisual(root)
 })
 for(const [name,offset,expected] of [['before active',-1,false],['active start',0,true],['last active',299,true],['expired active',300,false],['far expired',5000,false]])it(`${name}: no deferred historical damage`,()=>{
  const state=start(),s=state.snapshot
  // Use authored duration rather than assuming the B06 active length.
  const delta=offset===299?s.windupMs+s.activeMs-1:offset===300?s.windupMs+s.activeMs:s.windupMs+offset
  expect(stepExpansionAttack(state,{...args,deltaMs:delta}).damage>0).toBe(expected)
  if(expected)expect(stepExpansionAttack(state,{...args,deltaMs:1}).damage).toBe(0)
 })
 it('pause freezes warning, resume expiry has no delayed hit, reset/death remove hazards',()=>{
  let state=start();const s=state.snapshot
  expect(stepExpansionAttack(state,{...args,playing:false,deltaMs:50000}).damage).toBe(0);expect(s.elapsedMs).toBe(0)
  expect(stepExpansionAttack(state,{...args,deltaMs:50000}).damage).toBe(0);expect(state.snapshot).toBe(null)
  state=start();stepExpansionAttack(state,{...args,gameKey:1,deltaMs:1});expect(expansionAttackSnapshots.size).toBe(0)
  state=start();stepExpansionAttack(state,{...args,alive:false,deltaMs:1});expect(expansionAttackSnapshots.size).toBe(0)
 })
 it('keeps a locked wall footprint even if caller arrays are subsequently replaced',()=>{
  const state=start('B08',0,{obstacles:[{x:0,z:2,halfX:3,halfZ:.2}]}),snap=state.snapshot
  const before=JSON.stringify(snap.safetyPolygons);stepExpansionAttack(state,{...args,deltaMs:100,obstacles:[]})
  expect(JSON.stringify(snap.safetyPolygons)).toBe(before);expect(expansionAttackContains(snap,0,3,.192)).toBe(false)
 })
})
