import {afterEach,describe,it,expect} from 'vitest'
import {createExpansionAttackState,stepExpansionAttack,expansionAttackContains,clearExpansionAttacks} from './expansionAttackRuntime.js'
const args={x:0,z:0,playerX:0,playerZ:1,playing:true,alive:true,gameKey:0,hpRatio:1,deltaMs:2500,halfX:7.5,halfZ:19.2,obstacles:[]}
function begin(type='B08',index=0,extra={}){clearExpansionAttacks();const state=createExpansionAttackState(type,'test');state.patternIndex=index;stepExpansionAttack(state,{...args,...extra});return state}
afterEach(clearExpansionAttacks)
describe('expansion attack safety regression',()=>{
 it('never damages after skipping the complete active window',()=>{
  const state=begin('B06');expect(state.snapshot).toBeTruthy()
  expect(stepExpansionAttack(state,{...args,deltaMs:5000}).damage).toBe(0)
 })
 for(const [type,x,z] of [['B08',0,3],['B09',1.6,3]])it(`${type} clips cross/grid behind a real blocker`,()=>{
  const state=begin(type,0,{obstacles:[{x:0,z:2,halfX:3,halfZ:.2}]})
  expect(state.snapshot).toBeTruthy()
  expect(expansionAttackContains(state.snapshot,x,z,.192)).toBe(false)
  expect(stepExpansionAttack(state,{...args,playerX:x,playerZ:z,deltaMs:1400}).damage).toBe(0)
 })
 it('clips actual damage at the map edge, not only the visual',()=>{
  const state=begin('B06',0,{playerX:7.2,playerZ:0})
  expect(state.snapshot).toBeTruthy()
  expect(expansionAttackContains(state.snapshot,7.6,0,0)).toBe(false)
 })
 it('defers instead of filling a physically inescapable narrow room',()=>{
  const state=begin('B06',0,{halfX:.7,halfZ:.7,playerZ:0})
  expect(state.snapshot).toBe(null)
  expect(state.patternIndex).toBe(0)
 })
 it('includes player radius at a sector side but excludes rounded rectangle corner misses',()=>{
  const state=begin('B08',1,{playerX:0,playerZ:2})
  const s=state.snapshot,a=Math.PI/3,r=2
  expect(expansionAttackContains(s,r*Math.sin(a)+.1,r*Math.cos(a),.192)).toBe(true)
  const line={shape:'line',originXZ:[0,0],yaw:0,rangeUnits:2,widthUnits:1}
  expect(expansionAttackContains(line,.65,2.15,.192)).toBe(false)
 })
})
