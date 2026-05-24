# Project Name Rename Review - 2026-05-17

## Purpose

This document records the full Planner document review for the project name change.

## Rename Decision

- Previous project name: legacy English project title
- New project name: `Escape! zombie school`
- Previous landing title phrase: legacy Korean landing title
- New landing title phrase: `Escape! zombie school`

## Reviewed Scope

All text planning documents under `Planner/` were read with UTF-8 decoding.

- Total reviewed files: 30 existing Planner files before this review log was added
- Included file types: `.md`, `.txt`, `.json`, `.toml`
- Included folders:
  - `Planner/`
  - `Planner/Essential_game_plan/`
  - `Planner/Index/`
  - `Planner/Major_Review_Point/`
  - `Planner/Ref_Vampire_GameDesign/`
  - `Planner/B.게임기획,밸런스 구현/B-1 캐릭터 성장,능력치 업그레이드 구조 구현/Rewards_Drops/`
  - `Planner/B.게임기획,밸런스 구현/B-3 스테이지진행과 몬스터 등장구현/Stage1_Balance/`
  - `Planner/Subagent_Workflow/`
  - `Planner/Tech_plan/`
  - `Planner/B.게임기획,밸런스 구현/B-2 무기업그레이드,해금구현/Weapons/`

## Applied Changes

- Replaced legacy English project-name text with `Escape! zombie school`.
- Replaced legacy underscored project-directory text with `Escape_zombie_school`.
- Replaced legacy Korean landing-title text with `Escape! zombie school`.
- Adjusted the title layout note in `Planner/Essential_game_plan/title_landing_screen_plan_2026-05-10.md` so the recommended line break is:

```text
Escape!
zombie school
```

## Verification

- `Planner/` old-name search result: 0 matches.
- Repository text-doc old English name search result: 0 matches.

## Notes

- `Bang_Rules.md` remains as a file name because many policy and planning documents use it as the rules document path.
- `school_survivor:*` localStorage keys were not renamed because they are technical storage identifiers, not display project names.
- `Vampire Survivors` references were not renamed because they refer to an external reference game.
