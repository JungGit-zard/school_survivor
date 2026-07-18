# 무기 해금/획득/업그레이드 구현 정렬

## 변경 목적

유저가 정의한 흐름에 맞춰 코드상의 인런 무기 선택 효과를 "해금"이 아니라 "획득"으로 분리했다.

## 구현 기준

- 해금: `weaponCatalog.unlockConditions`, `weaponUnlocks`, `evaluateUnlocks`, `newlyUnlockedWeaponIds`
- 획득: `UPGRADE_EFFECTS.*`의 `kind: 'acquire'`
- 업그레이드: `kind: 'damage'`, `kind: 'stat'`

## 변경 내용

- 인런 무기 첫 선택 효과의 `kind`를 `unlock`에서 `acquire`로 변경했다.
- `applyUpgradeToWeapon`은 `acquire` 효과를 받으면 무기를 `active: true`, `level: 1`로 만든다.
- `isUpgradeAvailable`은 계정 해금 상태를 통과한 `acquire` 카드만 선택지에 넣는다.
- HUD 레벨업 선택지의 첫 무기 선택 표기는 "해금" 대신 "획득"으로 보이게 했다.
- 결과 화면의 "새 무기 해금!"은 계정 단위 해금 알림이므로 유지했다.

## 확인 포인트

- 해금 조건을 만족하지 못한 무기는 획득 선택지에 나오지 않는다.
- 해금된 무기는 새 게임의 레벨업 선택지에서 획득 카드로 나올 수 있다.
- 획득한 무기만 업그레이드 카드가 이어서 나올 수 있다.
