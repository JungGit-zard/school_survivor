# CEO Review - Passive Upgrade Catalog / Planner Index - 2026-05-17

## Review Scope

- `Planner/Essential_game_plan/passive_upgrade_catalog_plan_2026-05-17.md`
- `Planner/Index/planner_documents_by_field_2026-05-14.md`

Review style: g-stack CEO review.  
Primary lens: product direction, first-service scope, player retention, monetization readiness, and implementation priority.

---

## CEO Decision

The passive upgrade direction is **approved for MVP planning**, with one scope limit:

```text
MVP coin shop should launch with 5 passives, capped at Lv.3.
Full 8-passive / Lv.5 economy should remain a 2nd-phase expansion until playtest data confirms coin income and difficulty.
```

Approved MVP passives:

1. `magnet`
2. `moveSpeed`
3. `maxHp`
4. `might`
5. `growth`

Hold for 2nd phase:

- `armor`
- `cooldown`
- `greed`

---

## Findings

### High - Full 8-passive Lv.5 catalog may be too large for first service

The proposed single-stat full cost is 575 base coins before price multipliers. With 8 passives, the full catalog becomes a long grind. At 28-34 coins per good 5-minute run, full completion can exceed 100 successful runs once multipliers are included.

CEO judgment: this is fine as a long-term economy, but too broad as the first implementation target. The first service needs a fast and obvious improvement loop.

Action taken: added an MVP scope note to the passive upgrade document: 5 passives, Lv.3 cap first.

### Medium - Greed can distort the economy if released too early

`greed` increases coin gain. This is useful long term, but it changes the pace of every later upgrade. If it applies to time coins, milestone coins, elite coins, and boss coins at once, the economy can drift upward quickly.

CEO judgment: hold `greed` for phase 2 or apply it only after coin-income QA. If implemented later, define rounding and whether it affects milestone rewards.

### Medium - Cooldown is a strong hidden combat multiplier

`cooldown` feels simple, but it can outperform flat attack because every weapon fires more often. Together with `might`, it can make the opening too easy.

CEO judgment: hold `cooldown` until the base 5-minute loop and MVP passives are verified.

### Low - Planner index had stale XP currency naming

The index still used a legacy XP-food label, while the current implemented currency is "교과서".

Action taken: changed the Planner index wording to "교과서 XP".

---

## Product Rationale

The strongest part of the plan is the first-five-run experience:

- Run 1: buy `magnet`.
- Run 2: buy `moveSpeed` or `maxHp`.
- Run 3-5: add `growth`, `might`, and another survival stat.

This is a good mobile loop because the player can feel permanent progress without needing a long session.

The coin target also fits the current 5-minute design:

- Weak run: 3-12 coins.
- Normal clear: 25-29 coins.
- Strong clear: 30-34 coins.

That means a full clear usually buys one early upgrade immediately. This is the right psychological rhythm for a commuter-friendly game.

---

## CEO Implementation Priority

### Phase 1 - MVP Coin Shop

Implement:

- passive storage key: `school_survivor:passiveUpgrades`
- `magnet` Lv.1-Lv.3
- `moveSpeed` Lv.1-Lv.3
- `maxHp` Lv.1-Lv.3
- `might` Lv.1-Lv.3
- `growth` Lv.1-Lv.3
- simple purchase UI
- disabled state for insufficient coins
- max-level state

Do not implement yet:

- `greed`
- `cooldown`
- `armor`
- `amount`
- `luck`
- `revive`
- `reroll`

### Phase 2 - Economy Expansion

Open after QA confirms 5-minute coin income:

- `armor`
- `cooldown`
- `greed`
- Lv.4-Lv.5 caps
- optional unlock notification polish

---

## Required QA Before Shipping

- 3 full clears: average earned coins should be 28-34.
- 3 early deaths around 2-3 minutes: earned coins should still feel worth keeping.
- `magnet` Lv.1 must visibly reduce missed textbooks/coins.
- `moveSpeed` Lv.1 must help escape without making control slippery.
- `maxHp` Lv.1 must let a beginner survive one more small mistake.
- `might` Lv.1 must improve kill tempo without deleting the opening pressure.
- `growth` Lv.1 must make level-up pacing feel better, not chaotic.

---

## Final CEO Call

Proceed with the passive upgrade concept, but ship the smallest useful version first.

The core business goal is not "finish a big meta system"; it is:

```text
After one or two runs, the player should clearly feel:
"My next run will be easier because I earned something."
```

That goal is best served by the 5-passive Lv.3 MVP.
