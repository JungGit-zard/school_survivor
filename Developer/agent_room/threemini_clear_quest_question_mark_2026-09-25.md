# Three_Mini clear quest question mark record — 2026-09-25

- Task: `t_28576aad`
- Scope: world-space Quest notice `?` marker clarity only.
- Source changed:
  - `Developer/r3f_prototype/src/components/QuestWorldLayer.jsx`
  - `Developer/r3f_prototype/src/components/QuestWorldLayer.test.jsx`
- Explicitly not changed: Firebase/Studio transforms, quest catalog/progress/rewards, title/3D/BGM assets, unrelated UI, commits, pushes, physical Android artifacts.

## Implementation

Replaced the fragmented question marker made from a partial torus plus angled capsules with a single continuous `CatmullRomCurve3` tube silhouette and a separated sphere dot. The marker still uses the existing `QuestNoticeSymbolMaterial`, `Billboard`, glow, status mapping, color mapping, placement, and animation path. No text, font texture, black backing disc, or texture fallback was added.

## Test evidence

Command run from `Developer/r3f_prototype`:

```text
npm test -- src/components/QuestWorldLayer.test.jsx --run
```

Result:

```text
Test Files  1 passed (1)
Tests  17 passed (17)
```

The focused test now includes a geometry/source guard for one continuous curve, connected stem, separated dot, no torus/capsule fragments inside the question-mark symbol, and no old black backing/text/ring/circle regressions.

## Browser evidence

Existing dev server check:

```text
curl -I --max-time 5 http://localhost:5173/
HTTP/1.1 200 OK
```

Browser guard before opening:

```text
npm run browser:reserve
GAME_BROWSER_INSTANCES=1 LIMIT=3 MODE=reserve
```

Browser result: `http://localhost:5173/` loaded the title screen successfully. The current browser view did not reach an in-game quest marker before this handoff, so no quest-marker visual pass is claimed from browser evidence.

## Android/device evidence

No physical Android or AAB claim was made.
