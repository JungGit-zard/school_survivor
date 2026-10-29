import { beforeEach,describe,it,expect,vi } from 'vitest'
const ranking=vi.hoisted(()=>({submitRun:vi.fn(),registerRankingEntry:vi.fn()}))
vi.mock('../lib/firebaseRanking.js',async original=>({...await original(),...ranking}))
import { useGameStore } from './useGameStore.js'
import { installProgressTransactionTestClient } from '../../test/progressTransactionClient.js'
import { _resetFirebaseProgressForTests,_seedHydratedFirebaseProgressForTests,readFirebasePlayerProgress,buildCloudProgressSnapshot,updateFirebasePlayerProgress } from '../lib/firebaseProgress.js'
import { load } from '../lib/playerRecords.js'
import { getStageConfig,isStageUnlocked,getNextStageId,isStageVisible } from '../lib/stageConfig.js'
import { enemyPool,enemySimulationRuntime } from '../lib/refs.js'
import { EXPANSION_STAGES } from '../lib/expansionContent.js'
import { expansionAttackSnapshots } from '../lib/expansionAttackRuntime.js'
import { getBossClearBonus,getRankingScore } from '../lib/rankingScorePolicy.js'
beforeEach(()=>{
 _resetFirebaseProgressForTests()
 _seedHydratedFirebaseProgressForTests({uid:'expansion-offline-test'},{progress:{goldTotal:30,records:{stage5BossDefeats:1}}})
 installProgressTransactionTestClient()
 ranking.submitRun.mockResolvedValue({written:[],skipped:[],failed:[]});ranking.registerRankingEntry.mockResolvedValue({written:[],skipped:[],failed:[]})
 useGameStore.getState().reloadPersistentProgress()
})
// Release entry boundary (a8ddfe0c, 1fcfc848): stages 6-10 stay defined but the store refuses entry until
// they join VISIBLE_STAGE_IDS. These end-to-end runs re-enable themselves once the stages are released.
const itWhenReleased=(...ids)=>ids.every(isStageVisible)?it:it.skip
describe('new stage gameplay progression against offline-only progress fixture',()=>{
 itWhenReleased('stage5',...Object.keys(EXPANSION_STAGES)).each(Object.values(EXPANSION_STAGES))('$id selectable→boss→portal→own persisted keys and next stage (Stage10 terminal)',async stage=>{
  const store=()=>useGameStore.getState(),next=getNextStageId(stage.id)
  expect(getNextStageId('stage5')).toBe('stage6')
  updateFirebasePlayerProgress(p => {p.records[`stage${stage.order-1}BossDefeats`]=1})
  expect(isStageUnlocked(stage.id,{})).toBe(false)
  expect(isStageUnlocked(stage.id,{[stage.unlockClearsKey]:1})).toBe(false)
  expect(isStageUnlocked(stage.id,{[`stage${stage.order-1}BossDefeats`]:1})).toBe(true)
  store().resetGame(stage.id)
  expect(store()).toMatchObject({currentStageId:stage.id,phase:'playing',bossSpawnSec:150,bossDefeated:false,escapePortalActive:false})
  store().tickTime(150000);store().spawnBoss();expect(store().recordBossDefeat()).toBe(true)
  expect(store()).toMatchObject({bossAliveCount:0,bossDefeated:true,phase:'playing'})
  store().tickTime(60000);store().activateEscapePortal()
  expect(store().clearStage()).toBe(true)
  expect(store()).toMatchObject({phase:'cleared',currentStageId:stage.id})
  expect(await store().continueToNextStage()).toBe(!!next)
  expect(load()).toMatchObject({[stage.clearRecordKey]:1,[stage.bestRecordKey]:210})
  expect(readFirebasePlayerProgress().records).toMatchObject({[stage.clearRecordKey]:1,[stage.bestRecordKey]:210})
  expect(buildCloudProgressSnapshot().progress.records).toMatchObject({[stage.clearRecordKey]:1,[stage.bestRecordKey]:210})
  expect(store().currentStageId).toBe(next??stage.id)
  if(!next)expect(store().phase).toBe('cleared')
  else expect(isStageUnlocked(next,load())).toBe(true)
  const base=210+stage.scoreStageBonus,escape=Math.floor(base*.15),bonus=Math.floor((base+escape)*.2)
  expect(getBossClearBonus({stageId:stage.id,survivalSeconds:210,cleared:true,bossDefeated:true})).toBe(bonus)
  expect(getRankingScore({stageId:stage.id,survivalSeconds:210,cleared:true,bossBonus:bonus})).toBe(base+escape+bonus)
  store().resetGame(stage.id);expect(store()).toMatchObject({currentStageId:stage.id,phase:'playing',escapePortalActive:false,bossDefeated:false})
 })
 itWhenReleased('stage6','stage7')('real reset clears pool and warnings, while store pause freezes elapsed gameplay time',()=>{
  const store=()=>useGameStore.getState();store().resetGame('stage6')
  expect(enemyPool.spawn({type:'E21',x:0,z:1,hp:44,maxHp:44,spawnTimer:300})).toBeTruthy()
  for(let i=0;i<155;i++)enemySimulationRuntime.step(enemyPool,{delta:1/60,playerX:0,playerZ:0,halfX:7.5,halfZ:19.2,elapsedSec:30})
  expect(expansionAttackSnapshots.size).toBeGreaterThan(0)
  const elapsed=store().elapsedMs
  useGameStore.setState({phase:'paused'})
  // Game's actual frame loop gates advancement on playing; publication is not a tick.
  store().publishRuntimeElapsedMs();expect(store().elapsedMs).toBe(elapsed)
  useGameStore.setState({phase:'playing'});store().tickTime(1000);expect(store().elapsedMs).toBe(elapsed+1000)
  updateFirebasePlayerProgress(p => {p.records.stage6BossDefeats=1})
  store().resetGame('stage7');expect(expansionAttackSnapshots.size).toBe(0);expect(enemyPool.activeCount).toBe(0)
 })
})
