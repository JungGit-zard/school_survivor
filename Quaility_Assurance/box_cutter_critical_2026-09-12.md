# 커터칼 치명타 피해 진단 기록 (2026-09-12)

## 재현

- 실제 런타임 경로: `WEAPON_CATALOG.boxCutter.base.damage` 72 → 피해 카드 `boxCutterDamage`/`boxCutterPower` 각각 +24.6 → `Enemies.jsx`의 `resolveCriticalHitInto` → 데미지 숫자 이벤트.
- 피해 카드 4회 선택 상태의 치명타는 `(72 + 24.6 × 4) × 1.5 = 255.6`이며, 표시기는 반올림하여 `256`을 표시한다. 신고된 200~300 범위를 재현한다.

## 원인 판정

- `e9efcd0f`(2026-09-06)는 사용자 확정으로 기본 피해 48→72와 두 피해 카드 16.4→24.6을 함께 변경했다.
- `182de860` 이후 `criticalHits.js`는 모든 치명타에 1.5를 정확히 한 번 적용한다. 무기·카드의 별도 배율은 피격 계산에서 무시된다.
- 영구 강화는 커터칼 피해를 올리지 않는다. B01 패시브는 1.05를 한 번만 적용하도록 표식으로 중복을 막는다. `DamageNumbersLayer`는 각 적중의 계산 결과를 합산 없이 표시한다.
- 따라서 재현값은 중복 치명타나 HUD 합산 오류가 아니라, 최신 확정 기본 피해와 피해 카드 수치의 결과다.

## 검증

`npm test -- --run src/lib/criticalHits.test.js src/lib/upgrades.test.js src/lib/weaponCatalog.test.js src/lib/weaponPermanentUpgrades.test.js src/components/Weapons/BoxCutter.test.jsx src/lib/boxCutter.test.js`

- 6개 테스트 파일, 130개 테스트 통과.
- 코드·게임 밸런스 값은 변경하지 않았다. 최신 사용자 확정 수치와 충돌하지 않는 대체 피해 수치가 지정되지 않았기 때문이다.

## 후속 확정: 피해 카드 15% (2026-09-12)

- 사용자 지정값: 커터칼과 바이키티 커터칼의 피해 강화 카드(`Damage`, `Power`)는 한 번마다 현재 피해의 정확히 15%를 적용한다.
- 네 카드는 고정 `dmg`를 쓰지 않고 `damageMultiplier: 1.15`를 사용한다. 기본 피해(커터칼 72, 바이키티 54)와 치명타 150% 규칙은 변경하지 않았다.
- 커터칼 검증: `72 → 82.8 → 95.22 → 109.503 → 125.92845`; 첫 강화 치명타는 `82.8 × 1.5 = 124.2`다.
- 치비코와 B01 패시브가 적용된 런타임에서도 현재 피해에 1회만 15%를 적용한다. 다른 무기 피해 카드는 기존 고정 증가를 유지한다.
- 카드 표시는 두 무기 모두 `+15%`로 표시하도록 검증했다.

검증 명령:

`npm test -- --run src/components/HUD.test.jsx src/lib/upgrades.test.js src/lib/criticalHits.test.js src/lib/bossPassiveItems.test.js src/lib/weaponCatalog.test.js`

- 5개 테스트 파일, 165개 테스트 통과.

## 최종 재검증: B01·치비코 스토어 경로 (2026-09-12)

- `useGameStore.applyUpgrade`가 `damageMultiplier` 카드에 평면 `dmg` 보스 배율을 만들지 않도록 확인했다. 따라서 `undefined * 1.05`에서 비롯되는 `NaN`이 생성되지 않는다.
- B01 1.05배와 치비코 1.1배가 적용된 커터칼에서 Damage/Power 별칭을 네 번 선택해도, 매 선택 뒤 피해는 직전 피해의 정확히 `1.15`배다. 치비코 제거·재적용 반올림 경로는 비율 카드에 사용하지 않는다.
- `npm test -- --run src/lib/upgrades.test.js src/store/useGameStore.test.js src/lib/criticalHits.test.js src/lib/bossPassiveItems.test.js src/lib/weaponCatalog.test.js`: 5개 파일, 139개 통과.
- HUD의 실제 네 카드 라벨 검사는 별도로 통과했다. 전체 HUD 파일 병렬 실행은 다른 작업자의 보유무기 순환 테스트가 두 번째 화면의 기존 기대순서를 아직 갱신하지 않아 1개 실패했으며, 15% 라벨 검사는 통과했다.
