import {afterEach,expect,it} from 'vitest'
import {certifyExpansionEscape,expansionSafetyContext,EXPANSION_SAFETY_LIMITS} from './expansionAttackSafety.js'
import {createExpansionAttackState,stepExpansionAttack,clearExpansionAttacks} from './expansionAttackRuntime.js'
const args={x:0,z:0,playerX:0,playerZ:0,playing:true,alive:true,gameKey:0,hpRatio:1,deltaMs:2500,halfX:7.5,halfZ:19.2,obstacles:[]}
afterEach(clearExpansionAttacks)
it('rejects a full-width escape corridor crossing a surrounding active hazard even with safe endpoints',()=>{
 const rectangle=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d]]
 const snapshot={phase:'windup',windupMs:1400,safetyPolygons:[rectangle(-1,-1,1,1)]}
 const other={phase:'active',safetyPolygons:[rectangle(-2,-2,2,-1.9),rectangle(-2,1.9,2,2),rectangle(-2,-2,-1.9,2),rectangle(1.9,-2,2,2)]}
 expect(certifyExpansionEscape(snapshot,args,expansionSafetyContext('B06',args),[other])).toBe(null)
})
it('does not indefinitely defer boss patterns at body-valid map corners',()=>{
 for(const type of ['B05','B06','B07','B08','B09'])for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
  clearExpansionAttacks();const a={...args,x:sx*6,z:sz*17,playerX:sx*(7.5-.192),playerZ:sz*(19.2-.192)}
  const state=createExpansionAttackState(type,'corner');stepExpansionAttack(state,a)
  expect(state.snapshot,`${type} corner ${sx},${sz}`).toBeTruthy()
  const ch=state.snapshot.escapeChannel;expect(ch).toBeTruthy();expect(ch.boundaryIngress).toBe(true)
  // Body-valid ingress, then full 1.2/.3-block centre-lane plus .192/.048-block body.
  for(let i=0;i<=100;i++){
   const t=i/100,x=ch.fromXZ[0]+t*(ch.toXZ[0]-ch.fromXZ[0]),z=ch.fromXZ[1]+t*(ch.toXZ[1]-ch.fromXZ[1])
   expect(Math.abs(x)+.192).toBeLessThanOrEqual(7.500001);expect(Math.abs(z)+.192).toBeLessThanOrEqual(19.200001)
   const fx=ch.fullWidthFromXZ[0]+t*(ch.toXZ[0]-ch.fullWidthFromXZ[0]),fz=ch.fullWidthFromXZ[1]+t*(ch.toXZ[1]-ch.fullWidthFromXZ[1])
   expect(Math.abs(fx)+.792).toBeLessThanOrEqual(7.500001);expect(Math.abs(fz)+.792).toBeLessThanOrEqual(19.200001)
  }
 }
})
it('bounds failed retries instead of rebuilding safety every frame at population cap150',()=>{
 const states=Array.from({length:150},(_,i)=>createExpansionAttackState('B06',`cap:${i}`))
 const a={...args,halfX:.7,halfZ:.7}
 const t=performance.now();states.forEach(s=>stepExpansionAttack(s,a))
 const attempts=states.map(s=>s.safetyAttempts)
 for(let frame=0;frame<10;frame++)states.forEach(s=>stepExpansionAttack(s,{...a,deltaMs:16}))
 expect(states.map(s=>s.safetyAttempts)).toEqual(attempts)
 expect(attempts.every(n=>n===1)).toBe(true)
 states.forEach(s=>stepExpansionAttack(s,{...a,playing:false,deltaMs:10000}))
 expect(states.map(s=>s.safetyAttempts)).toEqual(attempts)
 states.forEach(s=>stepExpansionAttack(s,{...a,deltaMs:100}))
 expect(states.every(s=>s.safetyAttempts===2)).toBe(true)
 console.log('ATTACK_SAFETY_CAP150',JSON.stringify({elapsedMs:performance.now()-t,actors:150,frames:10,attempts:states.reduce((n,s)=>n+s.safetyAttempts,0)}))
})

it('profiles bounded authored obstacle work at cap150 and retains locked geometry through frames',()=>{
 const obstacles=[{x:-4,z:-10,halfX:.6,halfZ:1,rotationY:.2},{x:4,z:-5,halfX:.6,halfZ:1,rotationY:-.3},{x:-4,z:2,halfX:.6,halfZ:1},{x:4,z:9,halfX:.6,halfZ:1}]
 const states=Array.from({length:150},(_,i)=>createExpansionAttackState('B09',`profile:${i}`)),a={...args,playerZ:1,obstacles}
 const t=performance.now();states.forEach(s=>stepExpansionAttack(s,a));const startupMs=performance.now()-t
 const snaps=states.filter(s=>s.snapshot).map(s=>s.snapshot);expect(snaps.length).toBe(1) // further warnings start inside the first warning: no safe swept lane
 expect(states.reduce((n,s)=>n+s.safetyAttempts,0)).toBe(1) // no 149 doomed geometry builds
 const receipts=snaps.map(s=>JSON.stringify(s.safetyWork)),geometry=snaps.map(s=>s.safetyPolygons)
 for(const s of snaps){expect(s.safetyWork.exhausted).toBe(false)
  for(const key of ['sightQueries','clipTests','candidates','polygonTests'])expect(s.safetyWork[key]).toBeLessThanOrEqual(EXPANSION_SAFETY_LIMITS[key])
 }
 const ft=performance.now();for(let f=0;f<10;f++)states.forEach(s=>stepExpansionAttack(s,{...a,deltaMs:16}))
 expect(snaps.map(s=>JSON.stringify(s.safetyWork))).toEqual(receipts);snaps.forEach((s,i)=>expect(s.safetyPolygons).toBe(geometry[i]))
 console.log('ATTACK_SAFETY_WINDUP_PROFILE',JSON.stringify({actors:150,admitted:snaps.length,startupMs,tenFramesMs:performance.now()-ft,work:snaps.map(s=>s.safetyWork)}))
})
it('returns no certificate on over-budget layouts, not a partially clipped damaging attack',()=>{
 const state=createExpansionAttackState('B09','budget')
 stepExpansionAttack(state,{...args,obstacles:Array.from({length:33},(_,i)=>({x:4,z:i*.1,halfX:.1,halfZ:.1}))})
 expect(state.snapshot).toBe(null);expect(state.patternIndex).toBe(0)
})
