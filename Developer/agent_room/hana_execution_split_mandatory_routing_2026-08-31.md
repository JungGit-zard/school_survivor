# Hana Execution Split Mandatory Routing

Date: 2026-08-31
Project: Escape Zombie School
Canonical repo: `D:/JungSil/2.Minigame_project/school_survivor-integration`
Branch baseline: `zombie_only`

## Terry Directive
When Terry gives an implementation, commit, push, AAB, or game-development instruction, do not stop the task to explain. Start the concrete work immediately, split the work, and report while it is running.

## Mandatory Execution Split

### 1. Hana / Orchestrator
- Uses the main model only for orchestration, judgment, decomposition, final decisions, and user-facing reports.
- Must not waste the main model on repeated mechanical worker loops.
- Must keep the fixed canonical repo route unless Terry explicitly changes it: `D:/JungSil/2.Minigame_project/school_survivor-integration`.
- Must preserve the voice prompt normalizer route and hook. Do not delete or unregister `Developer/voice_input/prompt_normalizer.py`, `Developer/voice_input/escape_zombie_school_voice_lexicon.json`, or `.claude/hooks/normalize-voice-prompt.sh` while doing execution-split, routing, AAB, or Git-hygiene work.
- Must stage/commit only explicit task files; never `git add .`, `git add -A`, broad directory staging, or mixed unrelated dirty files.

### 2. Terra Worker
Use Terra for:
- straightforward implementation passes,
- repetitive code edits,
- test-failure repair loops,
- mechanical migration/refactor steps,
- collecting status/diff evidence.

### 3. Spark Worker
Use Spark for:
- simpler repetitive checks,
- file enumeration,
- grep-like evidence collection,
- smoke checks,
- checklist verification,
- report scaffolding.

### 4. Specialist Workers
Create 3 or 4 workers as needed per task. Default split:
- Implementer: code patching.
- QA: focused tests and regression checks.
- Recorder: docs, handoff, skill/rule updates.
- Release/Build worker: version/AAB/build steps when requested.

## Mandatory Behavior
1. On Terry command, switch to canonical repo first:
   `D:/JungSil/2.Minigame_project/school_survivor-integration`
2. Split task immediately into worker responsibilities.
3. Start concrete action before long explanation.
4. Keep working while reporting.
5. If cwd drift occurs after subagent lounge/routing work, correct silently to canonical repo and report the correction.
6. Do not say or imply that the repo is lost just because a Hermes/Orca/Kanban workspace is dirty.
7. Preserve existing dirty work: inspect target status and diff before writing.

## Current Application to Weapon/Passive Patch
- Implementer: weapon cap 10, 4-card fill fallback, passive card guarantee, passive nerf.
- QA: focused Vitest set passed: `src/lib/upgrades.test.js`, `src/store/useGameStore.test.js`, `src/store/useGameStore.passives.test.js` — 104 tests passed.
- Recorder: this routing document and Hana skill memory updated.

## Completion Gate
Before final report or commit:
- show target diff stat,
- run focused tests,
- preserve voice prompt normalizer files and registrations,
- stage explicit paths only; never use broad staging commands,
- ensure unrelated dirty files are not included.
