# 레벨업 같은 무기 강화 카드 회전 수정 (levelmini, 2026-10-31, receipt 5bcfc83f)

## 버그
- `HUD.jsx` `pickFour`가 `limitDuplicateWeaponUpgradeOptions(available)`를 난수 없이 불렀다. 기본값 `() => 0`이라 무기마다 항상 첫 강화 카드만 나왔다.
  - 예: 연필은 `pencilDamage`(+1.2)만 나오고 개수·관통·치명타 카드는 끝까지 안 나온다(데미지 카드에 상한이 없어서).
- 출처: c53e1c57 "rotate level-up weapon choices fairly". 이 커밋이 기본값을 `Math.random` → `() => 0`으로 바꾸고 `Math.random` 미호출을 테스트로 못박았다. 획득 카드 순서를 결정적으로 만들려던 변경인데, 같은 무기 안의 강화 카드 선택까지 고정돼 버렸다.

## 변경
- `src/components/HUD.jsx:476` → `limitDuplicateWeaponUpgradeOptions(available, Math.random)` (메인 세션이 수정).
- `src/components/HUD.test.jsx`
  - fullCapReplacement 테스트: `Math.random`을 0으로 고정하고 끝나면 복원한다. 기대값은 그대로다.
  - "reserves one owned-weapon upgrade…" 테스트: spy를 `.mockReturnValue(0)`으로 바꿨다. `expect(random).not.toHaveBeenCalled()`는 `toHaveBeenCalledTimes(1)`로 바꿨다(연필 그룹에서 1회만 뽑는다). 4장 순서와 획득 카드 노출이 난수 없이 순차라는 계약은 그대로 둔다.
  - 회귀 테스트를 추가했다: HUD.jsx 소스에 `limitDuplicateWeaponUpgradeOptions(available, Math.random)`가 있는지 확인한다.

## 남은 위험 (balanceqa 확인 요망)
- `levelupSelection` useMemo는 의존성에 `weapons`가 있다. 같은 serial 안에서 `weapons` 객체가 바뀌면 다시 계산되고, 그때 강화 카드를 새로 뽑아 화면 카드가 바뀔 수 있다. 프로브에서 실제로 연필 데미지가 연필 치명타로 바뀌었다. 획득 카드도 노출 장부가 이미 진행된 탓에 같이 바뀌는데, 이건 이번 수정 전부터 있던 문제다.
- 대안: 결정적 회전을 쓴다. 예: `group[(weapon.level - 1) % group.length]`로 고르거나 serial을 시드로 쓴다. 이미 있는 치비코 짝·홀 처리를 일반화하는 방식이다. 이러면 `Math.random`이 불리지 않는다는 원래 계약도 지킬 수 있다.

## 테스트
- HUD.jsx를 import하는 테스트 20개 + upgrades.test.js + useGameStore.levelupExposure.test.js(22파일): 406 통과, 2 실패, 1 skip.
- 실패 2건은 HUD 변경을 stash해도 그대로 실패한다(a4547e9f에서 원래 실패). `App.virtualJoystick` 9:16 프레임 테스트와 `i18nCoverage` 레벨업 카드 en·ja 테스트다.
- HUD.test.jsx만 돌리면 64/64 통과한다.

## 최종 설계 (코디네이터 결정 반영 — 위 Math.random 안 폐기)
- 이유: 레벨업 화면 도중 `weapons`가 바뀌면 카드가 다시 섞이는 UX 버그가 생긴다(프로브로 확인). 그래서 Math.random은 쓰지 않는다.
- `limitDuplicateWeaponUpgradeOptions(options, weapons = {})`: `weapon:` 그룹은 `group[(max(1, weapons[weaponId].level ?? 1) - 1) % group.length]`를 고른다. 그룹 순서는 UPGRADES 선언 순서다. 무기가 아닌 카드는 그대로 둔다. `random` 파라미터는 없앴다.
  - 강화 1회마다 `bumpLevel`로 무기 레벨이 1 오르므로 다음 레벨업에서 다음 카드가 나온다. 한 화면 안에서는 레벨이 바뀌지 않으니 카드도 바뀌지 않는다.
- `pickFour`는 `limitDuplicateWeaponUpgradeOptions(available, weapons)`를 부른다.
- 치비코 짝·홀 예외 4줄은 삭제했다. UPGRADES 순서가 [chibikoDamage, chibikoCrit]이라 새 규칙에서도 홀수 레벨은 Damage, 짝수 레벨은 Crit으로 같다. 기존 "chibikoCrit shows the critical card at Chibiko level 2" 테스트가 그대로 통과한다.
- 테스트
  - `expect(random).not.toHaveBeenCalled()`를 원래대로 복원했다.
  - Math.random 고정은 모두 제거했다.
  - 소스 문자열 검사 테스트는 동작 테스트로 바꿨다: 연필 [Damage, Count, Pierce, Crit]에서 Lv1은 Damage, Lv2는 Count, Lv5는 Damage가 나와야 한다.
  - umbrella/onigiri 테스트는 Lv2 기준으로 [umbrellaRadius, onigiiriBounce, maxHealth]가 나오는지 확인한다.
- 결과
  - HUD.test.jsx, HUD.questInventory.test.jsx, upgrades.test.js, useGameStore.levelupExposure.test.js: 4파일 156/156 통과.
  - HUD를 import하는 테스트 전체(19파일): 262 통과, 2 실패, 1 skip. 실패 2건은 a4547e9f에서부터 실패하던 App.virtualJoystick 9:16, i18nCoverage en·ja다.
