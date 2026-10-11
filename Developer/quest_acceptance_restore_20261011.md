# Quest acceptance presentation restore — 2026-10-11

## Scope
- Kanban: `t_6ae3f30a`
- File scope: `Developer/r3f_prototype/src/components/HUD.jsx` and focused quest acceptance assertions only.
- User request: quest first-acceptance NPC/start presentation must keep the previous larger centered popup. Only solved/item exposure timing remains compact/top/1000ms.

## Change
- Restored `questStarted` fallback popup structure to the previous centered card shape: 76px giver portrait, title/reward row, and objective action block.
- Restored `quest-dialogue-popup` start branch to the previous centered quest dialogue layout: giver portrait on the left, dialogue line, notice, next action, and tap hint.
- Preserved current safeguards: HUD root remains `absolute`, item/completed popups keep top half-scale transient styling and 1000ms cleanup, no automatic quest bag opening, and the quest popup width remains frame-safe.
- Avoided reintroducing the old fallback duplicate notice by not rendering the generic popup text block for `questStarted`.

## Verification
- Run only focused quest-related tests per task instruction; no full suite, browser setup, build, commit, push, or deploy.
