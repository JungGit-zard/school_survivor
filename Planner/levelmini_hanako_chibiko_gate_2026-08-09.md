# 하나코 치비코 종속 획득 게이트 (2026-08-09)

## Scope
- Kanban: `t_e376f44f`
- 대상: gameplay data only
- 목표: 신규 힐 동행 무기 `hanako`는 치비코(`chibiko`)를 먼저 획득한 런에서만 카드로 등장한다.
- 제외 범위: visuals, Graphics Studio, HUD, locales, Game runtime wiring, sound, title, Firebase write path, port 5173.

## Runtime data rule
- Weapon id: `hanako`
- Label: `하나코`
- Start state: inactive by default (`startsActive` 없음, initial `active=false`, `level=0`)
- Healing interval: `20000 ms` (`20초`)
- Healing percent: `0.05` (`최대 HP의 5%`)
- Follow distance: `1.44 units` (`0.36 블록`, 1블록=4 units)
- Account unlock: 없음. Firebase/account cumulative unlock을 요구하지 않는다.
- Independent level gate: 없음. `acquireHanako` 자체에는 `minLevel`을 두지 않는다.
- Dependency gate: `weapons.chibiko.active === true`일 때만 `acquireHanako`가 가능하다.
- Capacity: 기존 generic owned weapon capacity `8`개 제한은 그대로 적용한다.

## Acceptance criteria
1. `WEAPON_CATALOG.hanako`가 `id: 'hanako'`, `label: '하나코'`로 등록되어 있다.
2. 하나코 base data가 `healIntervalMs: 20000`, `healPercent: 0.05`, `followDistance: 1.44 units (0.36 블록)`이다.
3. 하나코는 initial weapon build에서 inactive이며 별도 account unlock 대상이 아니다.
4. `acquireHanako`는 치비코가 비활성일 때 unavailable이다.
5. `acquireHanako`는 치비코가 활성일 때 available이다.
6. 하나코가 이미 active이면 `acquireHanako`는 unavailable이다.
7. `acquireHanako`에는 독립 `minLevel`이 없다.
8. 기존 보유 무기 capacity 제한은 우회하지 않는다.

## QA handoff for Balance_QA_Mini
- Review files:
  - `Developer/r3f_prototype/src/lib/weaponCatalog.js`
  - `Developer/r3f_prototype/src/lib/upgrades.js`
  - `Developer/r3f_prototype/src/lib/weaponCatalog.test.js`
  - `Developer/r3f_prototype/src/lib/upgrades.test.js`
  - `Developer/r3f_prototype/src/lib/weaponPermanentUpgrades.test.js`
- Focused tests:
  - `npm test -- src/lib/weaponCatalog.test.js src/lib/upgrades.test.js src/lib/weaponPermanentUpgrades.test.js`
- Regression focus:
  - 치비코 Lv.8 획득 게이트는 그대로 유지된다.
  - 하나코는 Firebase account unlock 없이 치비코 활성 상태만 본다.
  - 하나코가 active일 때 재획득 카드가 다시 뜨지 않는다.
  - HUD/locale/visual/Studio/Game runtime 파일은 이번 작업에서 수정하지 않았다.

## 2026-08-09 conflict reapply note
- Three_Mini 충돌 후 지워진 gameplay source에 동일 게이트를 재적용한다.
- `WEAPON_CATALOG.hanako.unlockConditions`는 계정 해금이 필요 없도록 기존 `STARTER` 상수를 그대로 사용한다.
- `WEAPON_CATALOG.hanako`에는 독립 `minLevelToAppear`를 두지 않는다.
- `acquireHanako`의 유일한 런타임 전제는 `weapons.chibiko.active === true`이며, 기존 8개 무기 보유 capacity는 그대로 적용한다.
