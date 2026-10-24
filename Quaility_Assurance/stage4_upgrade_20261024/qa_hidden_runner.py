"""Stage4 QA owned process launcher. No credentials or Studio values are read/copied."""
import argparse, datetime, json, pathlib, subprocess, sys, time
ROOT = pathlib.Path('F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration')
FRONT = ROOT.parent / 'releases/stage4-upgrade-20261024/Developer/r3f_prototype'
OUT = ROOT / 'Quaility_Assurance/stage4_upgrade_20261024'
p = argparse.ArgumentParser(); p.add_argument('mode', choices=['focused','final-focused','related','build','reserve','server','browser','wait-ready']); a=p.parse_args()
if a.mode == 'wait-ready':
    gate=ROOT/'Developer/agent_room/stage4_upgrade_20261024/advisor-qa-ready.json'
    deadline=time.monotonic()+45
    while not gate.is_file() and time.monotonic()<deadline: time.sleep(1)
    result={'time':datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds'),'gate':str(gate),'ready':gate.is_file(),'bounded_wait_sec':45}
    if gate.is_file(): result['receipt']=json.loads(gate.read_text(encoding='utf-8-sig'))
    (OUT/'ready-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False));sys.exit(0 if result['ready'] else 2)
commands={
 'final-focused':['npm.cmd','test','--','src/components/Game.stage4Feedback.runtime.test.jsx','src/lib/stage4CauldronFeedback.test.js','src/components/Game.stage4PressureCauldron.test.js','src/lib/stage4PressureCauldronHazard.test.js','src/lib/b04SoupBlast.test.js','src/components/HUD.stage4Guide.runtime.test.jsx','src/components/Stage4HazardGuide.test.jsx','src/components/Stage4Hazards.runtime.test.jsx','src/components/StageObjects/PressureCauldron.test.js','src/components/EnemyVisual.test.js'],
 'focused':['npm.cmd','test','--','src/components/Game.stage4Feedback.runtime.test.jsx','src/lib/stage4CauldronFeedback.test.js','src/components/Game.stage4PressureCauldron.test.js','src/lib/stage4PressureCauldronHazard.test.js','src/lib/b04SoupBlast.test.js'],
 'related':['npm.cmd','test','--','src/components/Enemies.test.jsx','src/components/EnemyVisual.test.js','src/lib/chefBossPhase.test.js','src/lib/stageConfig.test.js','src/lib/burstEvents.test.js','src/store/useGameStore.test.js','src/App.firebaseBootstrap.test.jsx','src/App.studioGameSync.test.jsx','src/components/HUD.questInventory.test.jsx','src/components/StageObjects/stage4PropLayout.static.test.js'],
 'build':['npm.cmd','run','build'], 'reserve':['npm.cmd','run','browser:reserve'],
 'server':['npm.cmd','run','dev','--','--host','localhost','--port','5184','--strictPort'],
 'browser':['node',str(OUT/'stage4_live_qa.cjs')],
}
cmd=commands[a.mode]; log=OUT/(a.mode+'.log');started=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds')
with log.open('w',encoding='utf-8') as f:
    f.write('COMMAND '+subprocess.list2cmdline(cmd)+'\nSTART '+started+'\n');f.flush()
    child=subprocess.Popen(cmd,cwd=FRONT,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
    receipt={'mode':a.mode,'pid':child.pid,'startedAt':started,'command':cmd,'cwd':str(FRONT),'log':str(log),'windowsHidden':True}
    (OUT/(a.mode+'-process.json')).write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(receipt,ensure_ascii=False),flush=True)
    if a.mode in ['server','browser']: sys.exit(0)
    code=child.wait(); receipt['exitCode']=code;receipt['endedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds')
    (OUT/(a.mode+'-process.json')).write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8');print('EXIT',code);sys.exit(code)
