"""Freeze release-owned helpers/config around immutable author V2 inputs; no Git/Firebase writes."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib,json,subprocess,re
CANON=Path('F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration')
CAND=CANON.parent/'releases/boss-only-unlock-20261019'
REL=Path('Developer/agent_room/boss_only_unlock_20261019')
QA=CANON/'Quaility_Assurance/boss_only_unlock_20261019'
BASE='a9f84bf8e7f22d2b1b1c191f7b23ee2e0e908ff8'
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def run(*args):
 p=subprocess.run(args,cwd=CAND,capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW)
 if p.returncode:raise RuntimeError((args,p.returncode,p.stderr.decode(errors='replace')))
 return p.stdout
def put(p,o):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
def main():
 raw=(CAND/REL/'ready.json').read_bytes();r=json.loads(raw);body=dict(r);expected=body.pop('ready_hash_sha256',None)
 assert r.get('ready') is True and r.get('source_frozen') is True and r.get('revision')=='V2_LEDGER_REUSE_BE02_COMPATIBILITY','V2 not frozen'
 assert sha(json.dumps(body,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())==expected,'Canonical ready hash'
 exit_receipt=load(CANON/REL/'backend-implementation-exit.json');assert exit_receipt.get('code')==0,'Author not positively exited'
 for root in (CAND,CANON):
  for n in ('ready.json','levelmini-ready.json'):assert (root/REL/n).read_bytes()==raw,'Ready aliases'
 assert run('git','branch','--show-current').decode().strip()=='zombie_only'
 assert run('git','remote','get-url','origin').decode().strip()=='https://github.com/JungGit-zard/school_survivor.git'
 assert run('git','rev-parse','HEAD').decode().strip()==BASE,'Preparation must start at author base'
 run('git','diff','--cached','--exit-code',r['candidate_git_tree'])
 staged=set(run('git','diff','--cached','--name-only',BASE).decode().splitlines());assert staged==set(r['source_hashes'])
 run('git','diff','--cached','--check')
 for n,h in r['source_hashes'].items():
  b=(CAND/n).read_bytes();assert sha(b)==h and run('git','show',':'+n)==b and b'\r\n' not in b,n
 for n,h in r['artifact_hashes'].items():assert sha((QA/n).read_bytes())==h,n
 for row in load(QA/'code-input-manifest.json'):assert sha((CAND/row['path']).read_bytes())==row['sha256'],row['path']
 for name in staged:
  patch=run('git','diff','--cached','--unified=0','--',name);added=b'\n'.join(x[1:] for x in patch.splitlines() if x.startswith(b'+') and not x.startswith(b'+++'))
  assert not re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|AIza[0-9A-Za-z_-]{35}',added),'Secret scan '+name
 roots=['Developer/r3f_prototype/src','Developer/r3f_prototype/public','Developer/r3f_prototype/scripts','Developer/r3f_prototype/test','marketing/x_daily_zombie_school_posting']
 app='Developer/r3f_prototype/'
 rootfiles=sorted(n for n in run('git','ls-files','-z','--','Developer/r3f_prototype').decode().split('\0') if n and '/' not in n[len(app):] and (CAND/n).is_file())
 # Release config is separately bound as helper, not silently added to author's runtime membership.
 files=set(rootfiles)
 for root in roots:
  for p in (CAND/root).rglob('*'):
   if p.is_file():
    assert not p.is_symlink() and not any(x in p.relative_to(CAND/root).parts for x in ('.git','node_modules','__pycache__'))
    files.add(p.relative_to(CAND).as_posix())
 def row(n):
  b=(CAND/n).read_bytes();return {'path':n,'bytes':len(b),'sha256':sha(b)}
 helpers=[(REL/n).as_posix() for n in ('release-v2.cjs','release-v2-negative.cjs','prepare-v2.py','release-v2-operations.py')]+[app+'firebase.boss-v2-20261019.json']
 for n in helpers:assert (CAND/n).is_file(),n
 old=CAND.parent/'owner-all-complete-20261018'/Path('Developer/agent_room/owner_apply_audio_matilda_vending_20261019')
 oldsource=load(old/'reviewed-source.json')
 # No old approval is used as V2 approval. Only exact owner-approved audio bytes carried forward.
 replacements=oldsource['replacementExpectedSha256'];assert len(replacements)==12
 for p,h in replacements.items():assert sha((CAND/app/'public'/p.lstrip('/')).read_bytes())==h,p
 rules=(CAND/app/'database.rules.json').read_bytes();assert rules==run('git','show',BASE+':'+app+'database.rules.json')
 oldFence=[{'path':n,'sha256':sha((old/n).read_bytes())} for n in ('release-common.cjs','reviewed-source.json','qa-approval.json','promote-expanded.cjs','resume-preview-tail.cjs')]
 m={'schemaVersion':2,'revision':r['revision'],'purpose':'V2 frozen source AND executable helper/config review inputs; not self-approval','candidateRoot':CAND.as_posix(),'authorReadyFileSha256':sha(raw),'authorReadyHashSha256':expected,'authorCandidateGitTree':r['candidate_git_tree'],'baseHeadNotFeatureCommit':BASE,'inputRoots':roots,'rootFiles':rootfiles,'files':[row(n) for n in sorted(files)],'helpers':[row(n) for n in helpers],'authorChangedPaths':sorted(staged),'rulesSha256':sha(rules),'rulesDeploymentRequired':False,'approvedAmvReplacements':replacements,'oldFenceInputs':oldFence,'productionExecutable':False,'requiredIndependentReleaseApproval':'release-qa-v2.json','requiredRootBackendBinding':'backend-go-binding-v2.json','authorExitSha256':sha((CANON/REL/'backend-implementation-exit.json').read_bytes())}
 for root in (CAND,CANON):put(root/REL/'release-input-manifest-v2.json',m)
 v={'utc':datetime.now(timezone.utc).isoformat(),'status':'V2_INPUT_HELPER_CONFIG_FROZEN_PENDING_INDEPENDENT_GO','manifestSha256':sha((CAND/REL/'release-input-manifest-v2.json').read_bytes()),'readyFileSha256':sha(raw),'files':len(files),'helpers':len(helpers),'authorExited':True,'rulesByteIdenticalA9':True,'noRulesDeployment':True,'productionWrites':False}
 for root in (CAND,CANON):put(root/REL/'preparation-verification-v2.json',v)
 print(json.dumps(v))
if __name__=='__main__':main()
