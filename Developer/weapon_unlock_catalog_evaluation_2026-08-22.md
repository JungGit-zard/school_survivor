# 무기 해금 카탈로그·순수 판정 구현 기록

- Kanban: `t_387e03ce`
- 범위: `weaponCatalog.js`, `weaponUnlocks.js`, 순수 migration helper와 직접 관련 단위 테스트.
- 제외: `useGameStore.js`, `firebaseProgress.js`, HUD, Title, Studio, 자산, 실제 Firebase migration 실행.

## 적용 내용

- 계정 기본군을 연필·30cm 자·커터칼·텀블러 4종으로 고정했다.
- 마스터 기획의 나머지 13개 계정 조건을 `evaluateUnlocks(records)`가 판정한다.
- 하나코·바이키티 커터칼·선긋기는 `RUNTIME_COMBINATION_WEAPON_IDS`로 분리했다. 이 3종은 계정 unlock 후보·저장 flag·legacy entitlement 대상이 아니다.
- `getAccountUnlockableWeaponIds()`, `isAccountUnlockable(id)`, `isRuntimeCombinationWeapon(id)`를 카탈로그의 안정 API로 제공한다.
- 순수 migration 계약은 `weaponUnlockMigration.js`에 분리했다. Firebase 모듈 의존이 없어 `firebaseProgress → weaponUnlocks → firebaseProgress` 순환을 만들지 않는다.

## Backend 계약

```js
import {
  WEAPON_UNLOCK_SCHEMA_VERSION,
  LEGACY_ACCOUNT_ENTITLEMENT_IDS,
  getLegacyAccountEntitlementIds,
  mergeLegacyAccountEntitlements,
} from './weaponUnlockMigration.js'
```

- `WEAPON_UNLOCK_SCHEMA_VERSION`은 `2`다.
- `LEGACY_ACCOUNT_ENTITLEMENT_IDS`는 `scienceFlask`, `bell`, `stunGun`, `onigiri`, `chibiko`, `inucon` 6종뿐이다.
- Backend는 **기존 계정으로 식별되고 schema version이 2 미만일 때만** transaction 안에서 `mergeLegacyAccountEntitlements(raw)`를 호출한 뒤 version을 2로 기록한다.
- 신규 계정은 최초 생성부터 version 2를 기록하고 merge하지 않는다.
- helper는 Firebase 읽기/쓰기를 하지 않고 raw unlock map의 기존·미래 키를 보존하는 합집합만 반환한다.

## 검증

```text
npm.cmd exec -- vitest run src/lib/weaponCatalog.test.js src/lib/weaponUnlocks.test.js src/lib/weaponUnlockMigration.test.js src/lib/upgrades.test.js src/store/useGameStore.guidedMissileUnlock.test.js src/store/useGameStore.sharkMissileUnlock.test.js --maxWorkers=1 --no-file-parallelism
```

- 6 파일, 97 테스트 통과.
- 20종의 계정 조건·런 레벨을 ID 단위로 고정한 테스트를 포함한다.
- 커밋·푸시는 하지 않았다.
