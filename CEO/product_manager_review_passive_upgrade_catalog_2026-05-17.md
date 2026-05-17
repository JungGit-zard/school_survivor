# Product Manager Review - Passive Upgrade Catalog - 2026-05-17

## Review Context

- Requested agent: `/product-manager`
- Applied role file: `.codex/agents/product-manager.toml`
- Review target:
  - `CEO/ceo_review_passive_upgrade_catalog_2026-05-17.md`
  - `Planner/Essential_game_plan/passive_upgrade_catalog_plan_2026-05-17.md`
  - `Planner/Index/planner_documents_by_field_2026-05-14.md`

This review records product framing, MVP scope, priority, acceptance criteria, success signals, risks, and unresolved decisions.

---

## Product Manager Verdict

The current passive upgrade direction is approved as a focused MVP if the launch scope remains:

```text
MVP = 5 passive upgrades, capped at Lv.3.
```

MVP passives:

1. `magnet`
2. `moveSpeed`
3. `maxHp`
4. `might`
5. `growth`

Phase 2 passives:

- `armor`
- `cooldown`
- `greed`
- Lv.4-Lv.5 expansion

The main product goal is not to ship a large meta system first. The first goal is:

```text
After 1-2 runs, the player clearly feels:
"I earned coins, bought something, and my next run got better."
```

---

## Document Review

### 1. CEO Review Document

The CEO decision is product-appropriate. Reducing the first release to 5 passives and Lv.3 lowers beginner confusion, implementation load, and balance risk.

The decision to delay `greed` and `cooldown` is especially strong. `greed` can distort the economy, and `cooldown` is a hidden combat multiplier that can quietly outperform flat attack upgrades.

One caution: the CEO document includes implementation details such as storage key, UI states, and specific purchase behavior. These are useful direction notes, but the project policy says CEO records should not alone finalize execution details. Final implementation rules should still be confirmed in Planner and Developer records.

### 2. Passive Upgrade Planner Document

The core player problem is clear: a short-session player needs permanent progress even after a failed run.

The coin design is also aligned with the commuter target because rewards are tied more to survival time than pure kill count.

Product issues to resolve:

- The reward gap between 5-minute boss survival and boss kill needs a clearer validation target.
- The phrase "first required 8 passives" can confuse MVP scope. Use "full candidate 8 passives" and "MVP launch 5 passives" instead.
- QA checks are useful, but product success metrics need more numeric targets.

### 3. Planner Index Document

The index correctly places the passive upgrade plan under rewards, drops, and long-term growth with very high priority.

Recommended improvement:

```text
Use the CEO review for product direction and launch scope.
Use the Planner document for detailed game rules and balance values.
```

The remaining coin unit question is important:

```text
Is 1 coin equal to goldTotal 1, or is there a separate conversion unit?
```

This must be decided before MVP implementation because it affects shop prices, result UI, and save data.

---

## Now / Next / Later

### Now

- Ship `magnet`, `moveSpeed`, `maxHp`, `might`, `growth`.
- Cap each MVP passive at Lv.3.
- Let a normal clear buy at least one early upgrade.
- Preserve earned coins on death or clear.
- Show disabled purchase state when coins are insufficient.
- Show max-level state.

### Next

- Add `armor`.
- Add `cooldown`.
- Add `greed`.
- Expand passive caps to Lv.4-Lv.5 only after coin-income QA.

### Later

- Add `amount`.
- Add `luck`.
- Add `revive`.
- Add `reroll`.
- Add unlock presentation or shop polish.

---

## Acceptance Criteria

- A player can buy at least 1 passive after the first full clear or within 2 plays.
- Three 5-minute clears average 28-34 earned coins.
- A 2-3 minute failed run earns around 8-12 coins.
- `magnet` Lv.1 visibly reduces missed textbooks and coins.
- `moveSpeed` Lv.1 helps escape without making movement slippery.
- `maxHp` Lv.1 lets a beginner survive one extra small mistake.
- `might` Lv.1 improves early kill tempo without removing 0-60 second pressure.
- `growth` Lv.1 improves level-up pacing without interrupting the run too often.

---

## Product Success Signals

- Shop entry rate after one run.
- Average runs needed before first passive purchase.
- Second-run restart rate.
- Average number of passive purchases within five runs.
- Coin satisfaction for players who die before 5 minutes.
- First-purchase rate for `magnet`.
- Survival-time increase after passive purchase.

---

## Key Risks

### Economy Balance Risk

The plan assumes a normal 5-minute clear earns around 28-34 coins. If actual playtest income differs, the whole price curve may need adjustment.

Mitigation:

- Validate weak, normal, and strong runs before locking prices.
- Keep MVP cap at Lv.3 until data is stable.

### Combat Growth Risk

`might` and `growth` can create indirect synergy. More damage can produce more kills, and more XP can accelerate weapon growth.

Mitigation:

- Test 0-60 second pressure after `might` Lv.1 and `growth` Lv.1.
- Do not add `cooldown` in MVP.

### Scope Confusion Risk

Planner has an 8-passive full structure, while CEO approved 5-passive MVP scope.

Mitigation:

- Mark 8 passives as full candidate catalog.
- Mark 5 passives as MVP launch scope.
- Carry the MVP scope into Developer implementation notes before coding.

---

## Unresolved Decisions

- Decide whether `coin 1 = goldTotal 1`.
- Decide which rewards `greed` affects in phase 2.
- Decide the reward gap between boss survival and boss kill.
- Decide whether passive shop opens from the title screen, result screen, or both.
- Decide whether `armor` is hidden in MVP or shown as locked.

---

## Final Product Recommendation

Proceed with the 5-passive Lv.3 MVP.

Do not expand the catalog before the first coin-income QA pass. The next best product step is to prove the first loop:

```text
Play -> earn coins -> buy one upgrade -> feel stronger next run.
```

