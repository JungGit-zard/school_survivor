# 순차 순환 레벨업 획득 카드 로직 구현 기록

- Kanban: `t_8c3457d2`
- 범위: `upgrades.js` 순수 선택 helper, `useGameStore` 런 단위 노출 장부, 직접 테스트.
- 제외: `HUD.jsx` 렌더링/배선, 카드 UI, 타이틀·Studio·자산, 커밋·푸시.

## 선택 계약

```js
selectSequentialLevelupChoices({
  orderedKeys,                 // UPGRADES 선언 순서
  availableKeys,               // 기존 account/minLevel/선행/active/8슬롯 게이트를 통과한 key
  pendingGuaranteedKeys,       // 하나코·바이키티 등 후속 보장 key
  exposedAcquireKeys,          // 이번 런 현재 cycle에서 이미 화면에 보인 획득 카드
  choiceCount = 4,
})
// => { choiceKeys, nextExposedAcquireKeys, displayedGuaranteedKeys, cycleWrapped }
```

규칙:

1. pending guarantee가 현재 가능한 경우 가장 앞에 오며, 같은 무기 그룹은 한 화면에 하나만 둔다.
2. 남은 칸은 `orderedKeys` 순서의 **미노출 획득 카드**로 먼저 채운다.
3. 획득 카드가 4개보다 적을 때만 일반 강화 카드를 같은 안정 순서로 채운다.
4. 이미 화면에 보인 획득 카드는 노출 장부에 남는다. 앞선 카드가 선택되어 active가 돼도, 다음 화면은 아직 보이지 않은 획득 카드부터 계속한다.
5. 현재 가능한 획득 카드가 모두 한 번 보인 뒤에만 cycle을 새로 시작해 재노출한다.

`useGameStore` API:

```js
recordLevelupAcquireExposure(nextExposedAcquireKeys, levelUpChoiceSerial)
```

- 같은 serial은 한 번만 기록한다. 따라서 같은 선택창의 choices가 변하지 않는다.
- `resetGame()`은 `levelUpAcquireExposureKeys: []`, `levelUpAcquireExposureSerial: -1`로 초기화한다.

## UI 연결 완료

UI worker pass에서 `HUD.jsx`의 기존 `pickFour` random sort를 `selectSequentialLevelupChoices` 호출로 교체했다. `HUD`는 `levelUpChoiceSerial` 단위로 선택지를 고정하고, 계산된 `nextExposedAcquireKeys`를 `recordLevelupAcquireExposure(nextExposedAcquireKeys, levelUpChoiceSerial)`로 화면당 1회 기록한다. 표시된 후속 보장 카드는 기존처럼 `consumeGuaranteedUpgradeChoices`로 소진하며, 보장/노출 ledger 변경이 같은 화면 카드를 흔들지 않도록 memo dependency에서 제외했다.

## 검증

```text
npm test -- src/lib/upgrades.test.js src/store/useGameStore.levelupExposure.test.js src/components/HUD.test.jsx
```

- 3파일 107테스트 통과.
- synthetic 20개 획득 후보는 5개 선택창에서 4개씩 중복 없이 전부 1회 노출된다.
- HUD 통합 테스트에서 첫 화면 4장(`커터칼/30cm 자/텀블러/과학 플라스크`) 노출 후 커터칼 선택 다음 serial이 `바이키티 커터칼/벨/전기/오니기리`로 이어지며, `Math.random`이 호출되지 않음을 확인했다.
- active/locked 변동 뒤 다음 미노출 후보를 건너뛰지 않는 케이스, 보장 우선/중복 방지, 일반 강화 빈칸 보충, run reset을 포함한다.
