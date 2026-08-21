# B01~B04 보스 패시브 구현 존재성 검증

- Kanban: `t_6aaefc9f`
- 결론: **구현됨(PASS)**. 결함 없음.

## End-to-end 추적

`Enemy.jsx:1050`의 보스 사망 경로가 `recordBossKill(type)`을 호출한다. `useGameStore.js:394-425`는 B01~B04를 각각 `b01SetSquare`/`b02CorridorPass`/`b03GymWhistle`/`b04ServingLadle`로 해금하고, 현재 런 무기·player에 즉시 적용하며 hydrate된 Firebase에만 save request를 낸다. `bossPassiveItems.js:35-88`은 네 ID만 normalize하고 marker로 중첩을 막는다. `firebaseProgress.js:567`은 snapshot을 정규화하고, reset/reload는 `useGameStore.js:77-86, 682-705`의 초기 player/weapon 재구성으로 재적용한다. `HUD.jsx:32-36,736`은 슬롯 1~4 아이콘과 8-slot 가방을 연결한다.

| 보상 | 확인된 효과 |
|---|---|
| B01 | `boxCutter`, `schoolBag`, `bikittyCutter` damage ×1.05 |
| B02 | `pencilThrow`, `bell`, `onigiri` damage ×1.05 |
| B03 | 최종 speed ×1.05, `baseSpeed ×1.8` cap 및 marker 유지 |
| B04 | 최종 maxHp ×1.05, 현재 HP 비율 보존 및 marker 유지 |

재처치/중복 callback은 unlock 및 각 marker로 비중첩이며, B01~B04 동시 unlock은 normalize·catalogue가 함께 보존한다. 비hydrate Firebase에서는 현재 런 효과가 적용된 뒤 저장만 건너뛴다. 이 경로에 browser localStorage 호출은 없다.

## 집중 검증

`bossPassiveItems`, `useGameStore.bossPassiveItems`, `firebaseProgress`, `HUD.questInventory`:

**4개 파일, 41개 테스트 통과.** 실제 browser/Firebase data/5173은 사용하지 않았다.
