"""Hidden, explicitly scoped release operations. No runtime edits or Rules deployment."""
from pathlib import Path
from datetime import datetime,timezone
import subprocess,json,hashlib,sys
ROOT=Path('F:/From_SSD_D_20261005/JungSil/2.Minigame_project/releases/boss-only-unlock-20261019')
REL=Path('Developer/agent_room/boss_only_unlock_20261019');D=ROOT/REL
CANON=ROOT.parent.parent/'school_survivor-integration';NODE='C:/Program Files/nodejs/node.exe'
def sha(b):return hashlib.sha256(b).hexdigest()
def run(args,cwd=ROOT,check=True):
 p=subprocess.run(args,cwd=cwd,capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW)
 if check and p.returncode:raise RuntimeError((args,p.returncode,p.stdout.decode(errors='replace')[-3000:],p.stderr.decode(errors='replace')[-3000:]))
 return p
def node(mode,*args,check=True):return run([NODE,str(D/'release-v2.cjs'),mode,*args],check=check)
def git(*args):return run(['git',*args]).stdout.decode().strip()
def put(n,o):(D/n).write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
def nohelpers():
 p=node('inventory');i=json.loads(p.stdout);assert not i['blockers'],i;return i
def commitpush():
 node('gate');m=json.loads((D/'release-input-manifest-v2.json').read_text());assert git('rev-parse','HEAD')==m['baseHeadNotFeatureCommit']
 before=nohelpers();remote=git('ls-remote','origin','refs/heads/zombie_only').split()[0];assert remote==m['baseHeadNotFeatureCommit'],'Unexpected remote; no rebase/force'
 # Only source author paths and reviewed release helpers/config; preserve all unrelated dirty source.
 names=m['authorChangedPaths']+[f['path'] for f in m['helpers']]
 for n in names:assert not n.startswith('/') and '..' not in Path(n).parts
 assert set(git('diff','--cached','--name-only').splitlines())==set(m['authorChangedPaths'])
 run(['git','add','--',*[f['path'] for f in m['helpers']]])
 assert set(git('diff','--cached','--name-only').splitlines())==set(names)
 git('diff','--cached','--check');node('gate')
 git('commit','-m','fix: require previous-stage boss proof with compatible ledger persistence')
 head=git('rev-parse','HEAD')
 for f in m['files']+m['helpers']:assert sha(run(['git','show',head+':'+f['path']]).stdout)==f['sha256'],f['path']
 prepush=nohelpers();assert git('ls-remote','origin','refs/heads/zombie_only').split()[0]==remote
 p=run(['git','push','origin','HEAD:refs/heads/zombie_only']);print(p.stderr.decode(errors='replace'))
 assert git('ls-remote','origin','refs/heads/zombie_only').split()[0]==head
 postpush=nohelpers();fence=node('cutover')
 result={'utc':datetime.now(timezone.utc).isoformat(),'normalPush':True,'forced':False,'beforeRemote':remote,'sourceCommit':head,'before':before,'prepush':prepush,'postpush':postpush,'oldSourceGateRejected':True,'oldPublisherDeclaredExited':False}
 put('normal-push-fence-v2.json',result);print(json.dumps(result))
def tests():
 results=[]
 for name,args in [('syntax',[NODE,'--check',str(D/'release-v2.cjs')]),('guards',[NODE,str(D/'release-v2-negative.cjs')]),('absent_approval_gate',[NODE,str(D/'release-v2.cjs'),'gate'])]:
  p=run(args,check=False);ok=p.returncode==0 if name!='absent_approval_gate' else p.returncode!=0
  assert ok,(name,p.stdout,p.stderr)
  print(p.stdout.decode(errors='replace'),p.stderr.decode(errors='replace'))
  results.append({'name':name,'exitCode':p.returncode,'expectedRejection':name=='absent_approval_gate','stdout':p.stdout.decode(errors='replace'),'stderr':p.stderr.decode(errors='replace')})
 put('helper-self-tests-v2.json',{'utc':datetime.now(timezone.utc).isoformat(),'pass':True,'productionWrites':False,'results':results})
if __name__=='__main__':
 mode=sys.argv[1] if len(sys.argv)>1 else 'tests'
 if mode=='tests':tests()
 elif mode=='commit-push':commitpush()
 elif mode in ('capture','gate','inventory','cutover','promote'):
  p=node(mode,*sys.argv[2:]);print(p.stdout.decode(errors='replace'))
 else:raise RuntimeError('Unsupported operation')
