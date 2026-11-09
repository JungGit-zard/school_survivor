import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getStageVendingPlacement } from './stageVending.js'
import { getStageBounds } from './stageConfig.js'
import { EXPANSION_ENEMIES, EXPANSION_BOSSES } from './expansionContent.js'
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8')
const rules = JSON.parse(read('../../database.rules.json')).rules
const entries = rules.rankingService.v1.public.$seasonId.stage.$stageId.$window.$periodKey.entries
const globals = rules.rankingService.v1.public.$seasonId.global.$window.$periodKey.entries
const acceptsStage = (expression, stageId) => Function('newData', `return (${expression})`)({isString:()=>true,val:()=>stageId})
describe('final minimal backend and Stage5 compatibility',()=>{
 it('accepts exactly stage1 through stage10 in both ranking entry schemas',()=>{
  for(let n=0;n<=11;n++)for(const e of [entries, globals])expect(acceptsStage(e.$uid.stageId['.validate'],`stage${n}`)).toBe(n>=1&&n<=10)
 })
 it('enumerates all ten stages without removing allTime, original pending paths or UID ownership',()=>{
  const ranking=read('./firebaseRanking.js')
  const line=ranking.split('\n').find(l=>l.startsWith('const RANKING_STAGE_IDS'))
  for(let n=1;n<=10;n++)expect(line).toContain(`'stage${n}'`)
  expect(entries['.read']).toContain("$window === 'allTime'")
  expect(entries.$uid['.write']).toContain('$uid === auth.uid')
  expect(entries.$uid['.write']).toContain("newData.child('stageId').val() === $stageId")
 })
 it('permits only accepted expansion encounter IDs with the existing value validation',()=>{
  const expression=rules.users.$uid.progress.encounteredZombieTypes.$zombieType['.validate']
  const accept=(type,value=1)=>Function('$zombieType','newData',`return (${expression})`)(type,{val:()=>value})
  for(const e of [...Object.values(EXPANSION_ENEMIES),...Object.values(EXPANSION_BOSSES)])expect(accept(e.id),e.id).toBe(true)
  // B10 = Stage 5 교감 좀비 (2026-11-08). 'E59M' 미니는 도감·조우 대상이 아니다.
  expect(accept('B10')).toBe(true)
  for(const type of ['E71','B11','E59M','unknown'])expect(accept(type)).toBe(false)
  expect(accept('E19',2)).toBe(false)
 })
 it('retains the accepted Stage5 east-wall vending position inside its stage bounds',()=>{
  // 2026-11-08 교무실 개편: 북벽 복사기(6.0, −13.4)와 겹치던 (6.25, −14)를 동벽 레인 4 앞끝으로 옮겼다(스펙 Part B §3-5).
  const p=getStageVendingPlacement('stage5');expect(p).toMatchObject({id:'vending-stage5',stageId:'stage5',wallSide:'east',position:{x:8.55,y:0,z:-10.6}})
  const b=getStageBounds('stage5');expect(Math.abs(p.position.x)).toBeLessThan(b.halfX);expect(Math.abs(p.position.z)).toBeLessThan(b.halfZ)
 })
 it('keeps sessionStorage identity separate before touching the forbidden localStorage getter',()=>{
  const guard=read('./studioLocalStorageGuard.js');expect(guard).toMatch(/try\s*\{\s*if \(storage === scope.sessionStorage\) return false\s*return storage === scope.localStorage/)
 })
 it('connects the same memory-only RTDB transform to dependency optimization',()=>{
  const config=read('../../vite.config.js');expect(config).toMatch(/optimizeDeps:\s*\{\s*rolldownOptions:\s*\{\s*plugins:\s*\[firebaseDatabaseMemoryStoragePlugin\(\)\]/)
 })
})
