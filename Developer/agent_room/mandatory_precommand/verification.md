# Mandatory pre-command verification

- Verified: 2026-08-08 KST
- Kanban: `t_29ea82dd`, `t_bff1291f`, `t_07061f01`, `t_fa470812`
- Result: PASS

## Enforced flow

1. A subagent receives a task.
2. Before its first task command, it creates a safe short keyword summary instead of copying the raw command.
3. It runs `check-required-documents.ps1 -Profile <profile> -Domain auto -TaskSummary "<safe short keyword summary>"`.
4. The checker searches `manifest.json` `taskKeywords`, reports `matched_domains` and `match_evidence`, and emits exact `read_required` paths with SHA-256 hashes.
5. The subagent must read every emitted path before any following task command. A missing repository, manifest, document, glob match, or unknown profile exits nonzero.

The same gate is embedded in all 12 real Hermes profile `SOUL.md` files. Hermes loads profile `SOUL.md` into its stable identity prompt on each run. Claude project hooks retain the no-summary fallback for startup and tool calls where the user task text is unavailable.

## Bounded default profile results

| Profile | Domains | Documents | Receipt |
|---|---|---:|---|
| `threemini` | `common+graphics` | 13 | `6988ea834ef8465c9dbf07fc259b3f707e0f8d8b707f31ea65f0ca0d2c94991c` |
| `uimini` | `common+ui` | 11 | `911918d979b63f14a59f122e431460e8f0d09f42b0df798cf36b8cb1b828c7a4` |
| `levelmini` | `common+gameplay` | 13 | `a414be1a9d0c8c3466ee37a1293565de91e9ac1362707742833decb1e325414e` |
| `balanceqa` | `common+qa` | 11 | `2a4255f94e73e0b8434a53236894d44974fc8991a891bba8a180dd54cfbb3eeb` |
| `bizmini` | `common+corporate` | 11 | `77e5deabab6c13d89ade5c76285fe45dba09021ed74da29f63c52c5c47ea42dc` |
| `launchmini` | `common+aab` | 18 | `d6d73e0af63396a672089248fe545e3135a5df9e87ce0c53aef62b25deca03f9` |
| `backendmini` | `common+backend` | 12 | `44f5febe21074acb65ac8834a81c265cae417606bb83a2429f85c3f98983df96` |
| `englishgradmini` | `common+localization` | 12 | `bb708bed51d339b8957ec1850223ba48402c6f9ad5916933ac69b48ce2754580` |
| `madangsue` | `common+operations` | 14 | `cc065238356821feb4014a416fd7e7d6c75f99064ce1dc9b9bf883fed6083997` |
| `jabdareminder` | `common+operations` | 14 | `cc065238356821feb4014a416fd7e7d6c75f99064ce1dc9b9bf883fed6083997` |
| `soundmini` | `common+audio` | 11 | `b434afdd33349651c0fa942cfb2655442cb1054970fc1b11a5d93e2bca043733` |
| `corpopsmini` | `common+corporate` | 11 | `77e5deabab6c13d89ade5c76285fe45dba09021ed74da29f63c52c5c47ea42dc` |

All default lists contain at most 18 documents. Broad `select: all` globs were replaced by latest or explicit canonical records.

## Task-aware scenarios

| Profile / summary | Matched domains | Documents | Receipt |
|---|---|---:|---|
| `launchmini` / `AAB versionCode upload` | `aab` | 18 | `d6d73e0af63396a672089248fe545e3135a5df9e87ce0c53aef62b25deca03f9` |
| `uimini` / `weapon icon HUD` | `ui+gameplay` | 15 | `b963049b727e6539e4fdbfb59b0e9d55a938bafdab4cebfbef3b55a733469f8a` |
| `balanceqa` / `stage boss QA` | `gameplay+qa` | 14 | `cb93aa8f6e37310de6452913c7ebcab144f9fe76c2a243db62fc99ae78951604` |

`verify_tasksummary_routing.ps1` passed all three scenarios, all 12 default and safe-summary profile runs, the 20-document upper bound, and the unknown-profile fail-closed check.

## Launchmini permanence

- Both 2026-08-08 failure/reflection documents are always required for `launchmini`.
- AAB artifact identity gates are present in the canonical `Launch_Mini.toml`, runtime `launchmini/SOUL.md`, repository mirror `.claude/agents/launchmini.md`, and launchmini knowledge records.
- Runtime source verification: `agent/prompt_builder.py` loads profile-home `SOUL.md`; `agent/system_prompt.py` appends it to the stable identity prompt.
