import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { initializeApp, deleteApp } from 'firebase/app'
import { getDatabase, connectDatabaseEmulator, ref, get, update, runTransaction, goOffline } from 'firebase/database'
import { build } from 'vite'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { chromium } from '@playwright/test'
import { firebaseDatabaseMemoryStoragePlugin } from './scripts/firebase-database-memory-storage.mjs'
const port = 59437
const namespace = 'demo-ezs-progress-p0'
const base = `http://127.0.0.1:${port}`
const child = spawn('C:/Program Files/Android/Android Studio/jbr/bin/java.exe', ['-jar', 'C:/Users/admin/.cache/firebase/emulators/firebase-database-emulator-v4.11.2.jar','--host','127.0.0.1','--port',String(port)], { windowsHide: true, stdio: ['ignore','pipe','pipe'] })
let log = ''
child.stdout.on('data', b => { log += b })
child.stderr.on('data', b => { log += b })
const apps = []
let browser, server
try {
  for (let i=0;i<100;i++) { try { await fetch(`${base}/.json?ns=${namespace}`); break } catch { await new Promise(r=>setTimeout(r,100)) } }
  const rules = await readFile('database.rules.json','utf8')
  const ruleResponse = await fetch(`${base}/.settings/rules.json?ns=${namespace}`,{method:'PUT',headers:{Authorization:'Bearer owner'},body:rules})
  if (!ruleResponse.ok) throw new Error(await ruleResponse.text())
  for (const k of ['API_KEY','AUTH_DOMAIN','PROJECT_ID','APP_ID','DATABASE_URL']) process.env[`VITE_FIREBASE_${k}`]='demo-ezs-progress-p0'
  const uid='synthetic-p0-user'
  const initial = {schemaVersion:1,updatedAt:new Date().toISOString(),profile:{uid,displayName:'QA',nickname:''},progress:{goldTotal:318,weaponUnlockSchemaVersion:2,records:{totalRuns:0,stage1Clears:0},titleSettings:{vibration:true,reducedEffects:false,hitCameraShake:true,unlockAllWeaponsCheat:false,unlockAllStagesCheat:false}}}
  const seedResponse=await fetch(`${base}/users/${uid}.json?ns=${namespace}`,{method:'PUT',headers:{Authorization:'Bearer owner'},body:JSON.stringify(initial)})
  if (!seedResponse.ok) throw new Error(await seedResponse.text())
  const contexts=[]
  const clients=[]
  for (const name of ['A','B']) {
    const app=initializeApp({projectId:namespace,apiKey:'demo-key',databaseURL:`https://${namespace}.firebaseio.com`},name); apps.push(app)
    const db=getDatabase(app)
    connectDatabaseEmulator(db,'127.0.0.1',port,{mockUserToken:{sub:uid,user_id:uid}})
    const module=await import(`./src/lib/firebaseProgress.js?sdk-${name}`)
    const client={load:async p=>(await get(ref(db,p))).val(),save:(p,v)=>update(ref(db,p),v),transaction:(p,f)=>runTransaction(ref(db,p),f)}
    clients.push(client);module._setFirebaseProgressClientForTests(client)
    await module.hydrateCloudProgress({uid}); contexts.push(module)
  }
  const [A,B]=contexts
  A.updateFirebasePlayerProgress(p=>{p.records.stage1Clears++;p.records.totalRuns++})
  const clearSaved=await A.requestCloudProgressSave()
  const afterA=await (await fetch(`${base}/users/${uid}/progress/records.json?ns=${namespace}`,{headers:{Authorization:'Bearer owner'}})).json()
  B.updateFirebasePlayerProgress(p=>{p.goldTotal++})
  const staleSaved=await B.requestCloudProgressSave()
  const afterB=await (await fetch(`${base}/users/${uid}/progress/records.json?ns=${namespace}`,{headers:{Authorization:'Bearer owner'}})).json()
  const result={timestamp:new Date().toISOString(),actualFirebaseSDK:true,actualProductionRules:true,syntheticAuth:true,productionWrites:0,clearSaved,staleSaved,afterA,afterB,clearLost:afterB.stage1Clears===0}
  console.log(JSON.stringify(result,null,2))
  await writeFile('progress-sdk-red-result.json',JSON.stringify(result,null,2))
  const oldApp=initializeApp({projectId:namespace,apiKey:'demo-key',databaseURL:`https://${namespace}.firebaseio.com`},'old');apps.push(oldApp)
  const oldDB=getDatabase(oldApp);connectDatabaseEmulator(oldDB,'127.0.0.1',port,{mockUserToken:{sub:uid,user_id:uid}})
  let oldRejected=false
  try { await update(ref(oldDB,`users/${uid}`),initial) } catch { oldRejected=true }
  if (!oldRejected || result.clearLost || !clearSaved || !staleSaved) throw new Error('SDK preservation contract failed')
  // Isolated new account: legacy first save, lost ACK, exact-sequence retry.
  const revisionUid='synthetic-revision-user'
  const revisionSeed=structuredClone(initial);revisionSeed.profile.uid=revisionUid
  await fetch(`${base}/users/${revisionUid}.json?ns=${namespace}`,{method:'PUT',headers:{Authorization:'Bearer owner'},body:JSON.stringify(revisionSeed)})
  const revisionApp=initializeApp({projectId:namespace,apiKey:'demo-key',databaseURL:`https://${namespace}.firebaseio.com`},'revision');apps.push(revisionApp)
  const revisionDB=getDatabase(revisionApp);connectDatabaseEmulator(revisionDB,'127.0.0.1',port,{mockUserToken:{sub:revisionUid,user_id:revisionUid}})
  const revisionModule=await import('./src/lib/firebaseProgress.js?sdk-revision')
  let loseAck=false, repeatedSequence=false
  revisionModule._setFirebaseProgressClientForTests({load:async path=>(await get(ref(revisionDB,path))).val(),transaction:async(path,mutate)=>{
    const outcome=await runTransaction(ref(revisionDB,path),mutate)
    if(loseAck){loseAck=false;await runTransaction(ref(revisionDB,path),mutate);repeatedSequence=true;throw new Error('synthetic ACK lost after actual SDK commit and same-sequence retry')}
    return outcome
  }})
  await revisionModule.hydrateCloudProgress({uid:revisionUid})
  const firstSaved=await revisionModule.requestCloudProgressSave()
  revisionModule.updateFirebasePlayerProgress(p=>{p.goldTotal+=1;p.records.totalKills+=1})
  loseAck=true
  const ambiguousSave=await revisionModule.requestCloudProgressSave()
  const retrySaved=await revisionModule.requestCloudProgressSave()
  const revisionValue=(await get(ref(revisionDB,`users/${revisionUid}/progress`))).val()
  const revisionResult={firstSaved,ambiguousSave,retrySaved,repeatedSequence,gold:revisionValue.goldTotal,kills:revisionValue.records.totalKills,revision:revisionValue.checkpointRevision}
  await writeFile('progress-sdk-revision-result.json',JSON.stringify(revisionResult,null,2))
  if(!firstSaved||ambiguousSave||!retrySaved||!repeatedSequence||revisionValue.goldTotal!==319||revisionValue.records.totalKills!==1||revisionValue.checkpointRevision<4)throw new Error('SDK revision/idempotency boundary failed')
  const define = Object.fromEntries(['API_KEY','AUTH_DOMAIN','PROJECT_ID','APP_ID','DATABASE_URL'].map(k=>[`import.meta.env.VITE_FIREBASE_${k}`,JSON.stringify(k==='DATABASE_URL'?`https://${namespace}.firebaseio.com`:'demo-ezs-progress-p0')]))
  define['process.env.NODE_ENV'] = JSON.stringify('production')
  const bundle=await build({configFile:false,envDir:false,define,plugins:[firebaseDatabaseMemoryStoragePlugin()],logLevel:'warn',build:{write:false,lib:{entry:'qa-sdk-browser-entry.js',formats:['es'],fileName:'entry'},rolldownOptions:{output:{inlineDynamicImports:true}}}})
  const code=(Array.isArray(bundle)?bundle[0]:bundle).output.find(o=>o.type==='chunk'&&o.isEntry).code
  server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/entry.js'?'text/javascript':'text/html');res.end(req.url==='/entry.js'?code:'<script type="module" src="/entry.js"></script>')})
  await new Promise(r=>server.listen(0,'127.0.0.1',r))
  browser=await chromium.launch({channel:'chrome',headless:true})
  const page=await browser.newPage()
  page.on('pageerror',e=>console.log('PAGEERROR '+e.stack))
  page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log('BROWSERLOG '+m.text())})
  await page.addInitScript(()=>{window.storageAttempts=[];Object.defineProperty(window,'localStorage',{get(){window.storageAttempts.push('localStorage');throw new Error('Forbidden localStorage')}})})
  await page.goto(`http://127.0.0.1:${server.address().port}/qa.html`)
  await page.waitForFunction(()=>window.qaReady)
  const browserResult=await page.evaluate(async()=>{
    const {progress:p,store,auth,user}=window.qa
    auth.setState({user,status:'signedIn'})
    await p.hydrateCloudProgress(user)
    store.getState().resetGame('stage1')
    store.getState().recordKill()
    store.getState().gainGold(2)
    const checkpointSaved=await p.requestCloudProgressSave()
    const client=await p.createFirebaseProgressClient()
    const beforeClear=await client.load(`users/${user.uid}`)
    store.getState().tickTime(240000)
    store.getState().clearStage()
    const saved=await store.getState().flushProgressBeforeTransition()
    const expected=p.readFirebasePlayerProgress()
    const claim=await p.claimFirebaseMissionReward({user,missionId:'first_stage1_escape',rewardAllowlist:{first_stage1_escape:{type:'gold',amount:10}}})
    const claimSave=await p.requestCloudProgressSave()
    const afterClaim=await client.load(`users/${user.uid}`)
    const continued=await store.getState().continueToNextStage()
    const nextSaved=await store.getState().flushProgressBeforeTransition()
    return {saved,checkpointSaved,beforeClear:beforeClear.progress.records,records:expected.records,gold:expected.goldTotal,claim:claim.ok,claimSave,goldAfterClaim:afterClaim.progress.goldTotal,continued,nextSaved,nextStage:store.getState().currentStageId,missions:expected.missions,storageAttempts:window.storageAttempts}
  })
  console.log('BROWSER '+JSON.stringify({oldRejected,...browserResult}))
  await writeFile('progress-sdk-browser-result.json',JSON.stringify({oldRejected,...browserResult},null,2))
  await writeFile('progress-rule-coverage.json',await (await fetch(`${base}/.inspect/coverage.json?ns=${namespace}`)).text())
  if (!browserResult.saved || !browserResult.checkpointSaved || browserResult.beforeClear.totalKills!==1 || browserResult.beforeClear.stage1Clears!==1 || browserResult.records.stage1Clears!==2 || browserResult.records.totalKills!==1 || browserResult.records.bestSurvivalSeconds!==240 || browserResult.records.totalSurvivalSeconds!==240 || !browserResult.claim || browserResult.goldAfterClaim!==331 || !browserResult.continued || !browserResult.nextSaved || browserResult.nextStage!=='stage2' || browserResult.storageAttempts.length) throw new Error('Browser SDK persistence failed')
  const stages=[]
  for(const stageId of ['stage2','stage3','stage4']) {
    const step=await page.evaluate(async stageId=>{
      const {progress:p,store,user}=window.qa
      if(store.getState().currentStageId!==stageId)throw new Error('Unexpected stage entry')
      store.getState().recordKill();store.getState().gainGold(1)
      const pointSaved=await p.requestCloudProgressSave()
      const client=await p.createFirebaseProgressClient()
      const before=(await client.load(`users/${user.uid}`)).progress
      store.getState().tickTime(240000);store.getState().clearStage()
      const cleared=await store.getState().flushProgressBeforeTransition()
      const saved=(await client.load(`users/${user.uid}`)).progress
      const continued=await store.getState().continueToNextStage()
      if(continued)await store.getState().flushProgressBeforeTransition()
      return {stageId,pointSaved,cleared,continued,before,saved,nextStage:store.getState().currentStageId}
    },stageId)
    if(!step.pointSaved||!step.cleared||step.before.records[`${stageId}Clears`]!==0||step.saved.records[`${stageId}Clears`]!==1||step.saved.records[`${stageId}BestSurvivalSec`]!==240||step.continued!==(stageId!=='stage4'))throw new Error('Stage SDK contract failed '+stageId)
    const context=await browser.newContext();const check=await context.newPage()
    await check.goto(`http://127.0.0.1:${server.address().port}/qa.html`);await check.waitForFunction(()=>window.qaReady)
    const records=await check.evaluate(async()=>{const{progress:p,user}=window.qa;await p.hydrateCloudProgress(user);return p.readFirebasePlayerProgress().records})
    if(records[`${stageId}Clears`]!==1||records[`${stageId}BestSurvivalSec`]!==240)throw new Error('Fresh context stage lost '+stageId)
    await context.close();stages.push({...step,freshRecords:records})
  }
  await writeFile('progress-sdk-all-stages-result.json',JSON.stringify(stages,null,2))
  const fresh=await browser.newContext()
  const freshPage=await fresh.newPage()
  await freshPage.goto(`http://127.0.0.1:${server.address().port}/qa.html`)
  await freshPage.waitForFunction(()=>window.qaReady)
  const restored=await freshPage.evaluate(async()=>{const {progress:p,user}=window.qa;await p.hydrateCloudProgress(user);return p.readFirebasePlayerProgress()})
  if(restored.records.stage1Clears!==2||restored.records.totalRuns!==5||restored.goldTotal!==334||restored.records.totalSurvivalSeconds!==960||restored.missions.counters['stage.stage1.clearCount']!==1)throw new Error('Fresh browser context did not restore cloud progress')
  await writeFile('progress-sdk-fresh-result.json',JSON.stringify(restored,null,2))
  await fresh.close()
  const beforeOffline=await (await fetch(`${base}/users/${uid}.json?ns=${namespace}`,{headers:{Authorization:'Bearer owner'}})).json()
  const offlineResult=await page.evaluate(async()=>{
    const {progress:p,store,offline,online}=window.qa
    offline();store.getState().resetGame('stage1');store.getState().recordKill();store.getState().gainGold(1);store.getState().clearStage()
    const samePending=p.requestCloudProgressSave()===p.requestCloudProgressSave()
    let acknowledged=false
    const save=store.getState().flushProgressBeforeTransition().then(ok=>{acknowledged=ok;return ok})
    await new Promise(r=>setTimeout(r,40))
    const beforeOnline={acknowledged,state:store.getState().progressSaveState,samePending}
    online();const recovered=await save
    return{beforeOnline,recovered,records:p.readFirebasePlayerProgress().records,gold:p.readFirebasePlayerProgress().goldTotal}
  })
  if(offlineResult.beforeOnline.acknowledged||offlineResult.beforeOnline.state!=='pending'||!offlineResult.beforeOnline.samePending||!offlineResult.recovered||offlineResult.records.stage1Clears!==3||offlineResult.records.totalRuns!==6||offlineResult.gold!==335)throw new Error('Actual SDK offline pending/recovery failed')
  await page.close()
  await fetch(`${base}/users/${uid}.json?ns=${namespace}`,{method:'PUT',headers:{Authorization:'Bearer owner'},body:JSON.stringify(beforeOffline)})
  const afterOfflineRestore=await (await fetch(`${base}/users/${uid}.json?ns=${namespace}`,{headers:{Authorization:'Bearer owner'}})).json()
  const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex')
  if(hash(beforeOffline)!==hash(afterOfflineRestore))throw new Error('Offline isolated snapshot restoration failed')
  await writeFile('progress-sdk-offline-result.json',JSON.stringify({...offlineResult,initialHash:hash(beforeOffline),restoredHash:hash(afterOfflineRestore)},null,2))
  // Two old in-memory sessions buying the same level must not both be charged.
  A.updateFirebasePlayerProgress(p=>{p.goldTotal-=10;p.passiveUpgrades.magnet=1})
  B.updateFirebasePlayerProgress(p=>{p.goldTotal-=10;p.passiveUpgrades.magnet=1})
  B.recordFirebaseProgressPurchase({category:'passiveUpgrades',id:'magnet',price:10,nextLevel:1})
  const firstPurchase=await A.requestCloudProgressSave()
  const secondPurchase=await B.requestCloudProgressSave()
  const purchaseRemote=await (await fetch(`${base}/users/${uid}/progress.json?ns=${namespace}`,{headers:{Authorization:'Bearer owner'}})).json()
  const purchaseResult={firstPurchase,secondPurchase,gold:purchaseRemote.goldTotal,level:purchaseRemote.passiveUpgrades.magnet}
  console.log('PURCHASE '+JSON.stringify(purchaseResult))
  await writeFile('progress-sdk-purchase-result.json',JSON.stringify(purchaseResult,null,2))
  if(!firstPurchase||secondPurchase||purchaseResult.gold!==324||purchaseResult.level!==1)throw new Error('Concurrent purchase double-charged or downgraded')
  B.updateFirebasePlayerProgress(p=>{p.records.stage2Clears+=1;p.records.totalKills+=1})
  const afterConflictSaved=await B.requestCloudProgressSave()
  const afterConflict=await (await fetch(`${base}/users/${uid}/progress.json?ns=${namespace}`,{headers:{Authorization:'Bearer owner'}})).json()
  if(!afterConflictSaved||afterConflict.records.stage2Clears!==2||afterConflict.goldTotal!==324)throw new Error('Rejected purchase blocked subsequent clear')
  A.updateFirebaseMissionProgress(p=>{p.counters['enemy.E01.count']=5})
  B.updateFirebaseMissionProgress(p=>{p.counters['enemy.E01.count']=1})
  await A.requestCloudProgressSave();await B.requestCloudProgressSave()
  const missions=await (await fetch(`${base}/users/${uid}/progress/missions/counters.json?ns=${namespace}`,{headers:{Authorization:'Bearer owner'}})).json()
  if(missions['enemy%2EE01%2Ecount']!==6)throw new Error('Concurrent mission counters were lost')
  await writeFile('progress-sdk-conflict-recovery-result.json',JSON.stringify({afterConflictSaved,afterConflict,missionCount:missions['enemy%2EE01%2Ecount']},null,2))
  A.updateFirebaseMissionProgress(p=>{p.active.qa_mission={counter:1,target:1,completedAt:new Date().toISOString()}})
  await A.requestCloudProgressSave()
  let releaseClaim,readyClaim
  const reachedClaim=new Promise(r=>{readyClaim=r})
  A._setFirebaseProgressClientForTests({...clients[0],transaction:async(path,mutate)=>{
    const outcome=await clients[0].transaction(path,mutate)
    if(path.endsWith('/progress')){readyClaim();await new Promise(r=>{releaseClaim=r})}
    return outcome
  }})
  const claim=A.claimFirebaseMissionReward({user:{uid},missionId:'qa_mission',rewardAllowlist:{qa_mission:{type:'gold',amount:10}}})
  await reachedClaim
  A.updateFirebasePlayerProgress(p=>{p.goldTotal+=5;p.records.totalKills+=1})
  releaseClaim();const claimed=await claim
  await A.requestCloudProgressSave();await A.requestCloudProgressSave()
  const claimRemote=await (await fetch(`${base}/users/${uid}/progress.json?ns=${namespace}`,{headers:{Authorization:'Bearer owner'}})).json()
  const claimResult={claimed:claimed.ok,gold:claimRemote.goldTotal,missionCount:claimRemote.missions.counters['enemy%2EE01%2Ecount'],kills:claimRemote.records.totalKills}
  await writeFile('progress-sdk-claim-inflight-result.json',JSON.stringify(claimResult,null,2))
  if(!claimResult.claimed||claimResult.gold!==339||claimResult.missionCount!==6||claimResult.kills!==6)throw new Error('SDK claim rebase lost or duplicated inflight/cross-session progress')
} finally {
  await browser?.close()
  if(server) await new Promise(r=>server.close(r))
  for (const app of apps) { goOffline(getDatabase(app));await deleteApp(app) }
  child.kill()
  await writeFile('progress-emulator-log.txt',log)
  console.log('Owned emulator stopped, PID '+child.pid)
}
