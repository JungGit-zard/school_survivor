# Result Action Button Order Validation - 2026-07-04

RED/GREEN:

```bash
npm test -- src/components/HUD.test.jsx -t "ranking above title"
```

Result:
- RED: the first buttons were `타이틀로`, then `🏆 랭킹`.
- GREEN: the first buttons are now `🏆 랭킹`, then `타이틀로`.

Final verification:

```bash
npm test -- src/components/HUD.test.jsx src/components/resultCoinShopFlow.test.jsx -t "ranking above title|coin shop entry flow"
npm run build
```

Result:
- 2 test files passed, 4 tests passed.
- Production build passed. Vite reported existing large chunk/dynamic import warnings.

Follow-up vertical stack:
- RED: result actions still had no vertical `flexDirection`.
- GREEN: result actions now render as one column in the order Ranking, Title, Coin Shop, Restart.

Follow-up equal width:
- RED: result action buttons did not share the same fixed width.
- GREEN: every result action button now has the same centered `136px` width.
