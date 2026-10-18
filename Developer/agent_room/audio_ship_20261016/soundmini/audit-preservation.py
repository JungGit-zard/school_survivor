"""Read-only source/asset preservation audit; writes only this lane's evidence JSON."""
from pathlib import Path
import hashlib, json, re, subprocess
ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()
def baseline(p):
    return subprocess.check_output(['git', 'show', 'HEAD:' + p], cwd=ROOT)
def text(p): return (ROOT / p).read_text(encoding='utf-8')
def same_region(p, start, end):
    current=text(p); old=baseline(p).decode('utf-8')
    region=lambda s:s[s.index(start):s.index(end,s.index(start))]
    return region(current)==region(old)
registry='Developer/r3f_prototype/src/lib/sfxRegistry.js'
dialogue='Developer/r3f_prototype/src/lib/dialogueVoice.js'
checks={
 'SOUND_MAP_exact':same_region(registry,'export const SOUND_MAP =','export const DEFAULT_SFX_TUNING'),
 'tuning_functions_exact':same_region(registry,'export function normalizeSfxTuning','export function playSfx'),
 'master_volume_function_exact':same_region(registry,'export const SFX_MASTER_VOLUME','// ── 사망 발성'),
 'dialogue_profiles_exact':same_region(dialogue,'export const DIALOGUE_VOICE_PROFILES','export function segmentDialogueText'),
 'dialogue_volume_clamp_exact':text(dialogue).split('function clamp(')[1]==baseline(dialogue).decode('utf-8').split('function clamp(')[1],
}
for p in ['src/components/SfxLayer.jsx','src/lib/sfxEvents.js','src/lib/enemyDeathSfx.js','src/assets/audio/title_bgm.m4a']:
    rp='Developer/r3f_prototype/'+p
    checks[p+'_unchanged_from_HEAD']=(ROOT/rp).read_bytes()==baseline(rp)
manifest='Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json'
current=json.loads(text(manifest));old=json.loads(baseline(manifest))
changed_ids=[a['logicalId'] for a,b in zip(current['assets'],old['assets']) if a!=b]
checks['provenance_only_inuconBite']=changed_ids==['inuconBite'] and len(current['assets'])==len(old['assets'])
checks['provenance_other_top_level_exact']={k:v for k,v in current.items() if k!='assets'}=={k:v for k,v in old.items() if k!='assets'}
owned=[registry,dialogue,manifest,'Developer/r3f_prototype/src/lib/sfxRegistry.test.js','Developer/r3f_prototype/src/lib/dialogueVoice.lifecycle.test.js','Developer/r3f_prototype/scripts/generate_sfx.mjs']
owned+=['Developer/r3f_prototype/scripts/'+p for p in ['generate-audition-20261016.mjs','generate-audition-20261016.test.js','render-dialogue-audition-20261016.mjs','verify-audition-20261016.mjs']]
owned+=[p.relative_to(ROOT).as_posix() for p in sorted((ROOT/'Developer/r3f_prototype/public/sfx/audition-20261016').glob('*')) if p.is_file()]
rows=[{'path':p,'bytes':(ROOT/p).stat().st_size,'sha256':sha((ROOT/p).read_bytes())} for p in owned]
result={'checks':checks,'passed':all(checks.values()),'provenanceChangedIds':changed_ids,'deletions':[],'exactImplementationFiles':rows,'evidenceFiles':[p.name for p in OUT.iterdir() if p.is_file()], 'notes':'Audition HTML belongs to uimini and is intentionally excluded. Existing unrelated dirty paths were never reset/stashed/staged. No claim is made that concurrently edited files equal HEAD.'}
(OUT/'scope-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':result['passed'],'checks':checks,'implementationFiles':len(rows),'deletions':[]},ensure_ascii=False,indent=2))
if not result['passed']:raise SystemExit(1)
