# UI_Mini handoff — 후속 무기 카드 다음 레벨업 1회 보장

Date: 2026-08-22
Task: t_aece9b11
Profile: uimini

## Scope
- 치비코 획득 뒤 다음 레벨업 화면에 `acquireHanako`를 1회 보장.
- `boxCutter` 획득 뒤 다음 레벨업 화면에 `acquireBikittyCutter`를 1회 보장.
- 두 보장이 동시에 대기하면 4칸 레벨업 카드 안에 둘 다 표시.
- 표시된 보장 카드는 선택하지 않아도 해당 화면에서 소진.
- 이미 active 또는 8무기 슬롯 full처럼 영구 불가한 보장은 표시하지 않고 제거.
- minLevel처럼 현재 레벨에서 아직 불가하지만 나중에 가능할 수 있는 보장은 유지.
- 상태는 Zustand run-scoped 메모리에만 둔다. Firebase/localStorage 추가 없음.

## Implementation notes
- Store:
  - `pendingGuaranteedUpgradeChoiceKeys`를 run-scoped 상태로 추가.
  - `acquireChibiko` 선택 시 `acquireHanako`, `acquireBoxCutter` 선택 시 `acquireBikittyCutter`를 큐에 추가.
  - `consumeGuaranteedUpgradeChoices(keys, choiceSerial)`로 표시된 보장만 현재 레벨업 serial에서 소진.
  - `discardUnavailableGuaranteedUpgradeChoices(keys, choiceSerial)`로 영구 불가 보장만 제거.
  - `resetGame`은 보장 큐를 빈 배열로 초기화.
- HUD:
  - 레벨업 선택지를 4칸으로 유지.
  - 일반 셔플 전에 보장 eligible 카드를 앞에 배치.
  - 보장 카드가 화면에 렌더되면 effect에서 즉시 소진.
  - 보장 키는 표시 직후 소진되어도 같은 화면 카드가 흔들리지 않도록 choice memo dependency에서 제외.

## Verification
- Focused pass:
  - `npm test -- src/store/useGameStore.test.js src/components/HUD.test.jsx`
  - Result: 2 files passed, 52 tests passed.
- Full suite attempted:
  - `npm test`
  - Result: failed with 17 unrelated existing failures across CriticalScreenShakeWiring, StageObjects, GraphicsStudio/StudioTunedGroup, ZombieMesh, etc.; focused store/HUD scope remained green.

## Files touched for this task
- `Developer/r3f_prototype/src/store/useGameStore.js`
- `Developer/r3f_prototype/src/store/useGameStore.test.js`
- `Developer/r3f_prototype/src/components/HUD.jsx`
- `Developer/r3f_prototype/src/components/HUD.test.jsx`
- `Developer/r3f_prototype/src/lib/upgrades.js`
- `Developer/agent_room/uimini_followup_weapon_cards_guarantee_2026-08-22.md`

## Review notes
- No commit or push performed.
- Existing unrelated working-tree changes were present before/around this task and remain untouched except this task's files above.
