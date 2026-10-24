/* QA ONLY. Live canonical values remain in page RAM, never written to disk/logs. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const FRONT = 'F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/stage4-upgrade-20261024/Developer/r3f_prototype';
const ROOT = 'F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration';
const OUT = __dirname;
const { chromium } = createRequire(path.join(FRONT, 'package.json'))('@playwright/test');
const result = { startedAt: new Date().toISOString(), checks: [], console: [], pageErrors: [], failedNetwork: [], blockedNetwork: [], writesAllowed: 0, studioInputsStored: false };
const save = () => fs.writeFileSync(path.join(OUT, 'visual-result.json'), JSON.stringify(result, null, 2));
const sourceHashes = () => {
  const files = [];
  function walk(dir) { for (const e of fs.readdirSync(dir, { withFileTypes:true })) {const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(jsx?|css)$/.test(e.name))files.push(p);} }
  walk(path.join(FRONT,'src'));
  return Object.fromEntries(files.map(p=>[path.relative(FRONT,p).replaceAll('\\','/'),crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
};
let browser, context, page;
(async () => {
  const gatePath=path.join(ROOT,'Developer/agent_room/stage4_upgrade_20261024/advisor-qa-ready.json');
  assert(fs.existsSync(gatePath),'ROOT_FREEZE_FLAG_MISSING');
  result.freezeGate=JSON.parse(fs.readFileSync(gatePath,'utf8').replace(/^\uFEFF/,''));
  result.sourceHashesBefore=sourceHashes();
  const expected=result.freezeGate.sourceHashes;
  assert(expected,'CURRENT_SOURCE_HASH_RECEIPT_REQUIRED');
  result.freezeMismatches=Object.keys(expected).filter(k=>expected[k]!==result.sourceHashesBefore[k]);
  assert.equal(result.freezeMismatches.length,0,'SOURCE_DIFFERS_FROM_ROOT_FREEZE');
  result.freezeSourceCount=Object.keys(expected).length;
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:false,args:['--window-size=1260,920','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  // One isolated non-persistent context, one page; no user Chrome/profile touched.
  context=await browser.newContext({viewport:{width:1180,height:820},serviceWorkers:'block'});
  const blank=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Stage4 읽기 전용 개발 프리뷰</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:system-ui;background:#171d28;color:white}#tools{position:absolute;top:0;left:0;right:0;height:76px;z-index:9999;background:#101622;padding:4px 10px;box-sizing:border-box;font-size:12px}button{margin:4px;padding:4px 8px}#mount{position:absolute;inset:76px 0 0;overflow:hidden}#status{font-size:11px}</style></head><body><div id="tools">개발 전용 · 테스트 진행도 저장 안 됨 · Firebase 정본 읽기 전용 <span id="revision">검증 대기</span><br><button id="start">시작/재개</button><button id="pause">일시정지</button><button id="restart">재시작</button><button id="warning">솥 예고 12초</button><button id="boss">B04 150초</button><button id="soup">B04 HP50%</button><button id="exit">장면 종료</button><span id="status"></span></div><div id="mount"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script></body></html>`;
  // Exact public database config only, no credentials copied/extracted.
  const envText=fs.readFileSync(path.join(FRONT,'.env'),'utf8');
  const databaseLine=envText.split(/\r?\n/).find(l=>/^VITE_FIREBASE_DATABASE_URL=/.test(l));
  assert(databaseLine,'DATABASE_PUBLIC_CONFIG_MISSING');
  const base=databaseLine.slice(databaseLine.indexOf('=')+1).trim().replace(/^['"]|['"]$/g,'').replace(/\/$/,'');
  const canonicalURL=base+'/studioWorkspaces/v1/canonical/current.json';
  await context.route('**/*',async route=>{
    const req=route.request(), url=new URL(req.url());
    if(req.url()===canonicalURL && req.method()==='GET') return route.continue();
    if(url.origin==='http://localhost:5184' && ['GET','HEAD'].includes(req.method())) {
      if(url.pathname==='/stage4-review') return route.fulfill({status:200,contentType:'text/html',body:blank});
      return route.continue();
    }
    result.blockedNetwork.push({method:req.method(),host:url.hostname,path:url.pathname});
    return route.abort('blockedbyclient');
  });
  if(context.routeWebSocket) await context.routeWebSocket(/.*/, socket=>{socket.close();});
  await context.addInitScript(()=>{
    window.__storageCalls=[];
    for(const name of ['getItem','setItem','removeItem','clear','key']) {
      Object.defineProperty(Storage.prototype,name,{configurable:true,value:function(){window.__storageCalls.push(name);throw new Error('QA_STORAGE_FORBIDDEN:'+name);}});
    }
  });
  page=await context.newPage();
  page.on('close',()=>{result.pageClosedAt=new Date().toISOString();save();});
  page.on('crash',()=>{result.pageCrashedAt=new Date().toISOString();save();});
  browser.on('disconnected',()=>{result.browserDisconnectedAt=new Date().toISOString();save();});
  page.on('console',m=>{ if(['error','warning'].includes(m.type()))result.console.push({type:m.type(),text:m.text()}); });
  page.on('pageerror',e=>result.pageErrors.push(String(e)));
  page.on('requestfailed',r=>{const u=new URL(r.url());result.failedNetwork.push({host:u.hostname,path:u.pathname,error:r.failure()?.errorText});});
  await page.goto('http://localhost:5184/stage4-review');
  await page.waitForFunction(()=>window.__vite_plugin_react_preamble_installed__===true);
  // Fresh read at visual-test start, before ANY player or enemy module mount.
  result.canonicalBefore=await page.evaluate(async url=>{
    const startedAt=new Date().toISOString();
    const response=await fetch(url,{cache:'no-store',credentials:'omit'});
    if(!response.ok)throw new Error('CANONICAL_READ_HTTP_'+response.status);
    const raw=await response.text(), original=JSON.parse(raw);
    const sha=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join('');
    const studio=await import('/src/lib/firebaseStudio.js');
    const runtime=await import('/src/lib/studioRuntimeState.js');
    const keys=[...studio.FIREBASE_STUDIO_DATASET_KEYS].sort();
    if(JSON.stringify(Object.keys(original.datasets??{}).sort())!==JSON.stringify(keys))throw new Error('INCOMPLETE_CANONICAL_SIX_DATASETS');
    const decoded=studio.decodeFirebaseStudioSnapshotFromStorage(original);
    const normalized=studio.normalizeFirebaseStudioSnapshot(decoded);
    if(!normalized || keys.some(k=>!decoded.datasets[k]||typeof decoded.datasets[k]!=='object'||Array.isArray(decoded.datasets[k])))throw new Error('CANONICAL_VALIDATION_FAILED');
    if(JSON.stringify(decoded.datasets)!==JSON.stringify(normalized.datasets))throw new Error('CANONICAL_NORMALIZATION_LOSS');
    if(!studio.applyFirebaseStudioSnapshot(normalized))throw new Error('APPLY_CANONICAL_FAILED');
    const state=runtime.getFirebaseStudioRuntimeState();
    if(!runtime.isFirebaseStudioRuntimeReady()||state.revision!==original.revision||JSON.stringify(state.datasets)!==JSON.stringify(normalized.datasets))throw new Error('RUNTIME_REVISION_DATASET_ACK_FAILED');
    window.__canonical={original,raw,normalized,sha,url,startedAt,studio,runtime};
    document.querySelector('#revision').textContent='LIVE revision '+original.revision+' ACK';
    return {startedAt,completedAt:new Date().toISOString(),http:response.status,schemaVersion:original.schemaVersion,revision:original.revision,rawBytes:new TextEncoder().encode(raw).length,rawSHA256:await sha(raw),datasetCount:keys.length,allDatasetsExact:true,ready:true};
  },canonicalURL);
  result.checks.push({name:'fresh live canonical full-six-dataset hydration before mount',passed:true});save();
  await page.evaluate(async()=>{
    const React=(await import('/node_modules/.vite/deps/react.js')).default;
    const dom=await import('/node_modules/.vite/deps/react-dom_client.js');
    const createRoot=dom.createRoot??dom.default?.createRoot;
    const fiber=await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const {ENEMY_STATS}=await import('/src/components/Enemy.jsx');
    const {stageHpOverride}=await import('/src/components/Enemies.jsx');
    const {useGameStore}=await import('/src/store/useGameStore.js');
    const {useAuthStore}=await import('/src/store/useAuthStore.js');
    const progress=await import('/src/lib/firebaseProgress.js');
    if(useAuthStore.getState().user!==null || progress.getUserProgressPath()!=='')throw new Error('CLOUD_USER_NOT_NULL');
    const refs=await import('/src/lib/refs.js');
    const time=await import('/src/lib/gameRuntimeTime.js');
    const config=await import('/src/lib/stageConfig.js');
    const GameCanvas=(await import('/src/components/GameCanvas.jsx')).default;
    const HUD=(await import('/src/components/HUD.jsx')).default;
    const SfxLayer=(await import('/src/components/SfxLayer.jsx')).default;
    const VirtualJoystick=(await import('/src/components/VirtualJoystick.jsx')).default;
    const {StudioTuningRuntimeProvider}=await import('/src/components/StudioTunedGroup.jsx');
    const sfx=await import('/src/lib/sfxEvents.js');
    const initial=useGameStore.getState();
    const fixture=()=>{
      refs.resetRuntimeRefs([0,0,5]);
      useGameStore.setState({...initial,currentStageId:'stage4',bossSpawnSec:config.getStageConfig('stage4').bossWarningSec,phase:'paused',gameKey:useGameStore.getState().gameKey+1,player:{...initial.player,hp:100000,maxHp:100000},elapsedMs:0,progressRunId:undefined});
    };
    fixture();
    const events=[];
    sfx.subscribeSfx(e=>events.push({id:e.id,eventId:e._id,gameMs:time.getRuntimeElapsedMs(),phase:useGameStore.getState().phase,gameKey:useGameStore.getState().gameKey}));
    const root=createRoot(document.querySelector('#mount'));
    const noop=()=>{};
    function Preview(){
      const phase=useGameStore(s=>s.phase), gameKey=useGameStore(s=>s.gameKey);
      return React.createElement(StudioTuningRuntimeProvider,null,React.createElement(GameCanvas,{phase,gameKey}),React.createElement(HUD,{onGoToTitle:()=>window.qa.exit(),onGoToLobby:()=>window.qa.exit(),onGoToRanking:noop,onOpenCoinShop:noop,onOpenMissionCenter:noop,onOpenWeaponEncyclopedia:noop}),React.createElement(SfxLayer),React.createElement(VirtualJoystick,{enabled:true,phase}));
    }
    window.qa={useGameStore,refs,time,events,initial,fixture,root,config,
      play(){useGameStore.setState({phase:'playing'});}, pause(){useGameStore.setState({phase:'paused'});},
      seek(ms){time.setRuntimeElapsedMs(ms);useGameStore.setState({elapsedMs:ms});},
      restart(){fixture();root.render(React.createElement(Preview));},
      exit(){root.render(null);refs.resetRuntimeRefs();useGameStore.setState(initial,true);},
      // Existing runtime damage path only; no enemy stats or Studio input changed.
      soup(){const b=[...refs.enemyBodies.values()].find(body=>body._enemyType==='B04');if(!b)throw new Error('B04_RUNTIME_BODY_NOT_FOUND');const hp=stageHpOverride('B04','stage4')?.hp??ENEMY_STATS.B04.hp;b._enemyHit(hp*0.51,{canCrit:false,ignoreSightBlock:true});},
      state(){const s=useGameStore.getState();return {phase:s.phase,elapsedMs:time.getRuntimeElapsedMs(),gameKey:s.gameKey,currentStageId:s.currentStageId,playerHp:s.player.hp,bossSpawned:s.bossSpawned,bossAliveCount:s.bossAliveCount,enemyIds:[...refs.enemyBodies.keys()],cloudUserNull:useAuthStore.getState().user===null&&progress.getUserProgressPath()==='',storageCalls:[...window.__storageCalls]};},
      scene(){const canvas=document.querySelector('canvas');return fiber._roots.get(canvas)?.store?.getState?.()?.scene;},
      inspect(){const scene=this.scene();if(!scene)return {sceneFound:false};const warning=scene.getObjectByName('pressure-cauldron-world-warning'), boundary=scene.getObjectByName('pressure-cauldron-world-boundary'),soup=scene.getObjectByName('B04 국물 대폭발 원형 표식');return {sceneFound:true,warning:warning?{visible:warning.visible,progress:warning.userData.progress,state:warning.userData.hazardState,position:warning.position.toArray(),scale:warning.scale.toArray()}:null,boundary:boundary?{radius:boundary.geometry.parameters.outerRadius,matrix:boundary.matrixWorld.elements.slice()}:null,soup:soup?{phase:soup.userData.soupBlastState,circles:soup.children.length,segments:soup.children.map(c=>c.children.filter(n=>n.name==='b04-soup-segment').length)}:null};}
    };
    for(const [id,fn] of Object.entries({start:()=>window.qa.play(),pause:()=>window.qa.pause(),restart:()=>window.qa.restart(),warning:()=>{window.qa.restart();window.qa.seek(11900);window.qa.play();},boss:()=>{window.qa.seek(149900);window.qa.play();},soup:()=>window.qa.soup(),exit:()=>window.qa.exit()}))document.getElementById(id).onclick=()=>{try{fn();}catch(e){document.getElementById('status').textContent=String(e);}};
    root.render(React.createElement(Preview));
    setInterval(()=>{const s=window.qa.state();document.querySelector('#status').textContent=s.phase+' '+(s.elapsedMs/1000).toFixed(1)+'s';},200);
  });
  await page.waitForFunction(()=>window.qa?.inspect().sceneFound,{},{timeout:60000});
  result.initialState=await page.evaluate(()=>window.qa.state());
  await page.screenshot({path:path.join(OUT,'desktop-initial.png')});
  // QA can continue through explicit command file; no Studio data crosses it.
  fs.writeFileSync(path.join(OUT,'browser-ready.json'),JSON.stringify({pid:process.pid,url:page.url(),startedAt:result.startedAt,headful:true,oneBrowser:true}));
  result.status='PREVIEW_READY';save();
  setInterval(async()=>{
    const commandPath=path.join(OUT,'qa-command.json');
    if(!fs.existsSync(commandPath))return;
    let cmd;try{cmd=JSON.parse(fs.readFileSync(commandPath,'utf8'));}catch{return;}
    if(cmd.id===result.lastCommandId)return;result.lastCommandId=cmd.id;
    try{
      let response;
      if(cmd.action==='evaluate')response=await page.evaluate('('+cmd.expression+')()');
      else if(cmd.action==='screenshot'){if(cmd.viewport)await page.setViewportSize(cmd.viewport);await page.screenshot({path:path.join(OUT,cmd.name)});response={screenshot:cmd.name};}
      else if(cmd.action==='finalize'){
        result.canonicalAfter=await page.evaluate(async()=>{
          const b=window.__canonical,r=await fetch(b.url,{cache:'no-store',credentials:'omit'});if(!r.ok)throw new Error('AFTER_READ_FAILED');const raw=await r.text(),after=JSON.parse(raw);
          const fullEqual=(a,c)=>{if(typeof a!==typeof c||Array.isArray(a)!==Array.isArray(c)||a===null||c===null)return a===c;if(typeof a!=='object')return Object.is(a,c);const ak=Object.keys(a).sort(),ck=Object.keys(c).sort();return JSON.stringify(ak)===JSON.stringify(ck)&&ak.every(k=>fullEqual(a[k],c[k]));};
          const eq=fullEqual(b.original,after),hash=await b.sha(raw), runtime=b.runtime.getFirebaseStudioRuntimeState();
          return {checkedAt:new Date().toISOString(),http:r.status,revision:after.revision,rawSHA256:hash,fullKeysTypesStructureValuesEqual:eq,rawHashEqual:hash===await b.sha(b.raw),runtimeSixDatasetsExact:fullEqual(runtime.datasets,b.normalized.datasets),runtimeRevisionEqual:runtime.revision===b.original.revision,storageCalls:window.__storageCalls.length,cloudUserNull:window.qa.state().cloudUserNull};
        });
        result.sourceHashesAfter=sourceHashes();result.sourceFreezeEqual=JSON.stringify(result.sourceHashesAfter)===JSON.stringify(result.sourceHashesBefore);
        result.events=await page.evaluate(()=>window.qa.events);result.finalState=await page.evaluate(()=>window.qa.state());
        result.status='FINAL_EVIDENCE_COLLECTED';response=result.canonicalAfter;
      }else throw new Error('UNKNOWN_QA_ACTION');
      result.lastCommand={id:cmd.id,response};
    }catch(e){result.lastCommand={id:cmd.id,error:String(e)};}
    save();
  },400);
})().catch(e=>{result.status='BLOCKED';result.fatal=String(e.stack||e);save();console.error(result.fatal);if(browser)console.error('Owned browser kept for diagnosis; no fallback scene mounted.');else process.exitCode=1;});
