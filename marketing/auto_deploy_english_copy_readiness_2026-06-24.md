# English Store Copy / Localization Readiness Pass — 2026-06-24

Project: Escape! zombie school  
Role: English_Grad_Mini / 영문미니  
Scope: cautious Google Play / store-introduction English copy review and readiness note.  
Status: Draft-ready for human review; not a final publishing checklist.

---

## 1. Grounding rules used

This note only uses claims found in the project documents or current source files. It intentionally avoids promising features that are marked as postponed, local-only, unconfigured, prototype-only, or not yet server-validated.

Important caution:
- Do not market this as a full online competitive ranking game yet.
- Do not claim multiplayer, global leaderboard, live-service events, or server-secured rewards.
- Do not present Stage 2 as the main launch promise while product priority still says Stage 1 loop stability comes first.
- Do not describe Google login/cloud save as fully live unless Firebase production configuration and QA are confirmed.
- Do not use heavy horror/gore wording; the product direction is readable cartoon action, not realistic horror.

---

## 2. Evidence snapshot

### Current safe product facts

- Game name: `Escape! zombie school`.
- Genre / shape: mobile vertical survivor-like / survival action minigame.
- Core fantasy: a student survivor tries to last through a zombie-infected school.
- Current Stage 1: classroom survival.
- Current run duration in code: 240 seconds / 4 minutes.
- Main controls: direct movement; attacks are automatic.
- Player progression: collect XP textbooks, level up, choose upgrade cards.
- Current visible title copy in code: `감염된 학교에서 4분만 버티면, 교문이 열린다`.
- Current UI has Google login panel, nickname setting, coin shop, user ranking, settings/help, and optional development cheat menu.
- Ranking currently loads local ranking entries; server-validated competition is not confirmed.
- Firebase progress save code exists, but depends on Firebase Auth and Database env configuration.

### Features to treat as caution / not final store claims

| Area | Cautious interpretation |
|---|---|
| Google login | May be described only if production Firebase config and login QA are confirmed. Until then: “account connection support is being prepared,” not “cloud save fully supported.” |
| Ranking | Current evidence supports local/best-score ranking UI. Do not claim fair global leaderboard or official competitive rewards. |
| Stage 2 | Code/docs exist, but CEO/product priority previously says Stage 2 is held until Stage 1 stability. Do not make it a headline store promise yet. |
| Admin/season rewards | Local operations/prototype scope; do not claim live ranked seasons or reward payout. |
| Weapon count | Source currently shows 14 catalog entries, while older planning docs still mention 9 first-service weapons. For store copy, avoid exact weapon count until product owner locks launch roster. |
| Session length | Use 4 minutes based on current code and Stage Balance Summary. Older 5-minute documents should be read through the 2026-06-11 5→4 minute update note. |

---

## 3. Recommended English positioning

### Store-safe one-line positioning

A bite-sized cartoon survival action game where a student tries to escape a zombie-infected school.

### Slightly stronger one-line positioning

Survive four frantic minutes in a zombie-infected school with auto-attacks, upgrade choices, and cartoon action.

### Avoid for now

- “Compete worldwide on global leaderboards.”
- “Play online with friends.”
- “Cloud save across all devices.”
- “Dozens of stages.”
- “Official ranked seasons and rewards.”
- “Realistic horror zombie experience.”
- “Fully polished release version.”

---

## 4. Draft English store copy options

### App name

Current project name is already English-friendly:

Escape! zombie school

Optional capitalization cleanup for store polish, if Terry wants a more standard title later:

Escape! Zombie School

Note: changing capitalization is a branding choice, not a translation requirement.

### Short description options

Google Play short descriptions are typically tight. These are cautious and do not overpromise.

1. Survive four minutes in a zombie-infected school.
2. Auto-attack, level up, and escape the zombie school.
3. A quick cartoon survival game set in a zombie school.
4. Dodge, upgrade, and survive the infected classroom.
5. Can you last four minutes in a zombie-filled school?

Best current pick:

Survive four minutes in a zombie-infected school.

Reason: accurate, concise, and aligned with the current 240-second Stage 1 loop.

### Long description draft

Escape! zombie school is a quick cartoon survival action game set inside a zombie-infected school.

Move your student survivor, avoid the infected crowd, and let your weapons attack automatically. Collect XP textbooks, level up, and choose upgrades that change how you survive each run.

Current core features:
- Short 4-minute survival runs
- Simple movement-focused controls
- Automatic attacks and level-up upgrade choices
- Classroom survival against infected students
- School-themed weapons and items
- Cartoon-style action designed for mobile readability
- Coins and upgrade progression for repeat play

This is not a realistic horror game. The focus is quick survival, readable action, and the feeling of getting stronger during a short run.

Can you hold out until the school gate opens?

### Very cautious early-test version

Escape! zombie school is a short cartoon survival action game currently focused on a 4-minute classroom survival loop.

Move, dodge, collect XP textbooks, and pick upgrades while automatic weapons fight off infected students. The goal is simple: survive long enough to escape the infected school.

The game is built for quick mobile sessions with clear controls, readable characters, and school-themed survival action.

---

## 5. Localization tone guide

### Recommended tone

- Clear, simple, mobile-friendly English.
- Slightly tense but not grim.
- “Cartoon survival action” rather than “horror survival.”
- School objects and student-survivor language should feel playful and understandable.

### Korean → English term suggestions

| Korean / project term | Suggested English | Notes |
|---|---|---|
| 감염된 학교 | zombie-infected school / infected school | “Zombie-infected” is clearer for store users. |
| 교실 생존 | Classroom Survival | Good Stage 1 label. |
| 복도 투사체 시험 | Corridor Projectile Trial / Corridor Survival | Avoid making Stage 2 a launch headline yet. |
| 교문이 열린다 | the school gate opens | Natural and readable. |
| 교과서 XP | XP textbooks | Distinctive school flavor. |
| 황금 코인 | gold coins | Standard mobile-game term. |
| 유저랭킹 | Rankings / Player Rankings | Use “Rankings” unless official online competition is confirmed. |
| 코인상점 | Coin Shop | Standard. |
| 닉네임 | Nickname | Standard. |
| 연출 줄이기 | Reduced Effects | Accessibility-friendly term. |
| 30cm 자 | ruler / 30 cm ruler | “Ruler” is clearer in English store copy. |
| 과학 플라스크 | science flask | Good school-themed weapon term. |
| 비상벨 / 벨 | school bell / bell shockwave | Use “school bell” for flavor. |

---

## 6. Claim readiness checklist

| Store claim | Readiness | Note |
|---|---:|---|
| 4-minute survival runs | Ready | Current code uses `STAGE_DURATION_SEC = 240`. |
| Zombie-infected school setting | Ready | Repeated across CEO/product docs and title copy. |
| Mobile-friendly simple controls | Mostly ready | Product docs state movement-focused controls; check final mobile joystick QA before publishing as a strong claim. |
| Automatic attacks | Ready | Core design and current weapon system support this. |
| Level-up upgrade choices | Ready | Supported by design docs and source structure. |
| Coins / progression | Ready with caution | Coin shop and passive progression exist; avoid deep economy claims without final QA. |
| Google login | Conditional | UI/code exists, but store claim depends on live Firebase config and tested auth flow. |
| Cloud save | Conditional / not recommended yet | Firebase save code exists; do not claim until production env and restore behavior are tested. |
| Player rankings | Conditional wording only | Say “rankings” or “track your best score”; do not claim global online leaderboard. |
| Stage 2 | Not recommended as headline | Existing product priority says Stage 2 expansion should wait until Stage 1 stability. |
| Many weapons / exact weapon count | Hold | Source/planning mismatch around launch roster; avoid exact counts. |

---

## 7. Suggested store-listing structure

1. Hook: survive four minutes in a zombie-infected school.
2. Core loop: move, auto-attack, collect XP textbooks, choose upgrades.
3. Setting: classroom, school items, infected students, school gate escape.
4. Tone: cartoon survival action, quick mobile sessions.
5. Feature bullets: only claims verified for launch build.
6. Closing question: “Can you hold out until the school gate opens?”

---

## 8. Pre-publish localization QA notes

Before using this copy in Google Play, confirm:

1. Launch build duration is still 240 seconds.
2. Stage 1 is the main exposed experience.
3. Any development cheat menu is hidden from external testers or production users.
4. Google login status is either fully configured/tested or removed from store claims.
5. Ranking copy matches actual behavior: local/best-score vs official online leaderboard.
6. Data safety and privacy policy match any Google login, Firebase Auth, Realtime Database, nickname, email, photo URL, progress, and ranking data actually collected.
7. Screenshots do not show debug/admin/cheat UI unless intentionally part of a test-only build.
8. Any “cloud save,” “ranking,” or “season reward” phrasing is approved by product/QA after real build verification.

---

## 9. Files read / checked

Required startup and policy files:
- `project_develop_policy.md`
- `Bang_Rules.md`
- `AGENTS.md`
- `SESSION_CONTINUITY.md`
- `CLAUDE.md`
- `SESSION_MEMORY.md` recent-entry context

Role-relevant product / planning / source files:
- `CEO/Game_service_purpose_target.md`
- `CEO/current_product_priorities.md`
- `CEO/admin_operations_control_scope_2026-06-21.md`
- `Planner/current_game_rules.md`
- `Planner/B. GAME_DESIGN/Stage_balance_summary.md`
- `Developer/r3f_prototype/src/lib/stageConfig.js`
- `Developer/r3f_prototype/src/components/TitleScreen.jsx`
- `Developer/r3f_prototype/src/components/GoogleAccountPanel.jsx`
- `Developer/r3f_prototype/src/components/UserRanking.jsx`
- `Developer/r3f_prototype/src/lib/userRanking.js`
- `Developer/r3f_prototype/src/lib/firebaseProgress.js`
- `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- `Developer/r3f_prototype/package.json`

Skill loaded:
- `google-play-console-release`

---

## 10. Commands / checks run

- `pwd && test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING && git status --short --branch`
  - Result: profile `$HOME` gstack check returned `GSTACK_MISSING`; git tree has many existing uncommitted changes.
- `test -d /c/Users/admin/.claude/skills/gstack/bin && echo GSTACK_OK_USERPROFILE || echo GSTACK_MISSING_USERPROFILE; ls -la /c/Users/admin/.claude/skills/gstack ...`
  - Result: canonical Windows user gstack path exists: `GSTACK_OK_USERPROFILE`.
- File searches for marketing/store/localization material.
- Direct source/document reads listed above.

No npm tests or build were run because this task produced a documentation/copy readiness artifact and did not change game code.

---

## 11. Files changed by this task

Created:
- `marketing/auto_deploy_english_copy_readiness_2026-06-24.md`

No code files changed.
No commit or push performed.

---

## 12. Blockers / handoff notes

No blocker for producing this readiness artifact.

Handoff cautions:
- The previous strict gstack check using Hermes profile `$HOME` reports missing, but the actual Windows user install exists at `/c/Users/admin/.claude/skills/gstack/bin`. Future Hermes workers should use the canonical Windows user path when validating this project rule.
- Current git tree already contained many uncommitted changes before this artifact was written. This task only adds the marketing note above.
- If this copy is promoted into an actual Play Console listing, run a final build/UI QA pass and align Data safety/privacy-policy claims with the live Firebase/login configuration.
