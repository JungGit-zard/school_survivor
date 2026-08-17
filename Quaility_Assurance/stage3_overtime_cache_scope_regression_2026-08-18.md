# Stage 3 overtime cache-scope regression

- Date: 2026-08-18
- Owner: Level_Mini (levelmini)
- Scope: `Developer/r3f_prototype/src/components/Enemies.jsx` `usePlayingFrame` overtime scheduler

## Cause

Stage 3 시작 프레임의 overtime scheduler가 `usePlayingFrame` 실제 스코프에 없는 `cache.id`를 참조하면 `Uncaught ReferenceError`가 반복된다. 이 block 안의 현재 스테이지 정본은 `stageRuntime.id`다.

## Fix / regression coverage

- Fix: `shouldScheduleOvertimeReinforcement(overtimeTickRef.current, sec, stageRuntime.id)`만 사용한다.
- Source regression: `Enemies.test.jsx`가 `usePlayingFrame` block을 잘라 검사한다.
  - `stageRuntime.id` 호출을 요구한다.
  - 같은 block 안의 `cache.id`를 금지한다.
- Scope retained: bosses remain at 150 seconds, Matilda remains warning 205 / spawn 210 seconds, and Stage 3 overtime remains 225 seconds.
- Non-scope retained: CompassBlade, Tumbler, and `weaponCatalog` were not changed by this cache-scope fix.

## Execution evidence

RED probe:

```text
RED probe: mutated usePlayingFrame contains cache.id = True
RED probe: mutated usePlayingFrame contains stageRuntime.id call = False
exit_code = 1
```

Focused GREEN:

```text
npm test -- src/components/Enemies.test.jsx -t "all-stage overtime mixed ordinary reinforcements"
Test Files  1 passed (1)
Tests  5 passed | 88 skipped (93)
```

Scoped regression:

```text
npm test -- src/components/Enemies.test.jsx src/components/Game.runtimeTime.test.js src/lib/burstEvents.test.js src/lib/stageConfig.test.js
Test Files  4 passed (4)
Tests  163 passed (163)
```

## QA handoff — Balance_QA_Mini

1. Stage 3 225초(3분 45초) 첫 overtime 보강 시 console ReferenceError가 없는지 확인한다.
2. Stage 3 255초(4분 15초) 두 번째 cadence가 30초 간격으로 이어지는지 확인한다.
3. Stage 1·2·4는 225초에 overtime 보강이 없어야 하며 기존 300초(5분 00초)를 유지해야 한다.
4. Diff review에서 CompassBlade, Tumbler, `weaponCatalog` 변경이 이 cache-scope fix에 섞이지 않았는지 확인한다.
