from pathlib import Path
import json,hashlib,subprocess,datetime,shutil
ROOT=Path(__file__).resolve().parents[3]
D=ROOT/'Developer/agent_room/owner_apply_audio_matilda_vending_20261019'
C=Path('F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/owner_apply_audio_matilda_vending_20261019')
sha=lambda b:hashlib.sha256(b).hexdigest()
for name in ['sound-result.md','sound-inventory.json','sound-before.json','sound-transfers.json','sound-red.log','sound-green.log','sound-events-green.log','sound-offline-network.cjs','level-result.md','level-inventory.json','checkpoint.md']:
    shutil.copyfile(C/name,D/name)
roots=['Developer/r3f_prototype/src','Developer/r3f_prototype/public','Developer/r3f_prototype/scripts']
paths=set()
for directory in roots:
    paths.update(p for p in (ROOT/directory).rglob('*') if p.is_file())
for name in ['index.html','package.json','package-lock.json','vite.config.js','vitest.config.js','.env','firebase.owner-expanded-20261019.json']:
    p=ROOT/'Developer/r3f_prototype'/name
    if p.is_file(): paths.add(p)
paths.update(D/name for name in ['release-common.cjs','preserve-current-live.cjs','seal-candidate.cjs','verify-channel.cjs','promote-expanded.cjs','release-checks.cjs','live-baseline.json'])
paths.add(ROOT/'marketing/x_daily_zombie_school_posting/Build-XWebsiteCards.mjs')
files=[{'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size}for p in sorted(paths)]
old=json.loads((ROOT/'Developer/agent_room/owner_all_20261018/integration-ready.json').read_text())
allowed_source={'Developer/r3f_prototype/src/components/HUD.jsx','Developer/r3f_prototype/src/components/Enemy.jsx','Developer/r3f_prototype/src/components/StageVendingLayer.jsx','Developer/r3f_prototype/src/lib/dialogueVoice.js'}
public_audio=['/sfx/enemies/'+n+'.'+ext for n in ['matildaDeath','matildaLaugh','matildaSpawn'] for ext in ['mp3','ogg']]+['/sfx/events/matildaWarningTick.'+ext for ext in ['mp3','ogg']]+['/sfx/audition-20261016/dialogue-matilda-'+v+'.wav'for v in ['A','B','C']]+['/sfx/audition-20261016/manifest.js']
allowed_source.update('Developer/r3f_prototype/public'+p for p in public_audio)
changed=[]
for f in old['files']:
    if '/src/' not in f['path'] and '/public/' not in f['path']:continue
    p=ROOT/f['path']
    if p.is_file() and sha(p.read_bytes())==f['sha256']:continue
    changed.append(f['path'])
    if f['path'] not in allowed_source and not ('.test.' in f['path']):raise RuntimeError('Unexpected frozen runtime drift '+f['path'])
result={'schemaVersion':1,'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'authority':'Terry 2026-10-19 22:22 KST expanded scope; CEO/owner_apply_audio_matilda_vending_20261019.md','inputRoots':roots,'allowedExistingHostingReplacements':['/index.html']+public_audio,'replacementExpectedSha256':{p:sha((ROOT/'Developer/r3f_prototype/public'/p.lstrip('/')).read_bytes()) for p in public_audio},'oldFrozenRuntimeDrift':changed,'files':files}
(D/'reviewed-source.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'files':len(files),'sourceManifestSha256':sha((D/'reviewed-source.json').read_bytes()),'allowedExistingReplacements':len(result['allowedExistingHostingReplacements']),'frozenRuntimeDrift':changed},ensure_ascii=False,indent=2))
