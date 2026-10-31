# levelmini 밸런스 후속 적용 (2026-10-31, base 74f8a557)

receipt 5bcfc83f. 근거: `balanceqa_weapon_balance_remeasure_2026-10-31.md` §3, §4-③, §4-④. 커밋하지 않음.

## 변경
1. **카드 순서** — `src/components/HUD.jsx` `UPGRADES`에서 기존 항목만 자리 이동(라벨·설명 그대로).
   - 텀블러: tumblerDamage, tumblerCount, tumblerPower, tumblerCrit
   - 오니기리: onigiiriDamage, onigiiriBounce, onigiiriPower, onigiiriCrit
   - 꼬마 로자리: miniRosariDamage, miniRosariBounce, miniRosariPower, miniRosariCrit
   - 효과: 첫 레벨업이 항상 피해 카드다. 4장 그룹이라 Lv5 최종값은 그대로고 Lv2~4 곡선만 바뀐다.
     오니기리·로자리 Lv1→Lv2가 +0%에서 피해 카드만큼 오른다.
   - 옛 순서를 고정한 테스트는 없었다(HUD.test.jsx 회전 테스트는 자체 옵션 배열 사용, 나머지는 멤버십 루프).
2. **스타링크 cooldown 6500 → 5000** — `src/lib/weaponCatalog.js`, 주석 1줄 추가.
   `weaponCatalog.test.js`의 고정값 2곳(line 19 toMatchObject, line 138)을 5000으로 갱신.
   balanceqa 수치: Lv1 4.46→5.80, 4장 8.36→10.87(중앙값 11.28 근처), 군중 65.2.
3. **오리요강 추정기 사이클 분기** — `src/lib/playerDpsEstimate.js`.
   - `compassBladeCycleDps`: 사이클 = 3스택 / hitsPerSecond + 리스폰 3초 = 4.5초,
     DPS = (3 × d × 기대치명 + 폭발 30) / 4.5. 폭발은 치명타 없음(런타임 explode에 crit 미전달과 일치).
     상수는 `lib/compassBlade.js`(STACKS_TO_EXPLODE, RESPAWN_MS, EXPLOSION_DAMAGE)에서 import.
     count는 단일 대상에 곱하지 않는다(기존 추정기 원칙과 balanceqa 실 사이클식 그대로).
   - 런타임 무기 객체에 id가 없어서 `estimateWeaponDps(weapon, weaponId = weapon?.id)`로 두 번째 인자를 받고,
     `estimatePlayerDps`가 맵 키를 넘긴다. 인자 하나로 부르는 기존 호출은 동작이 같다.
   - 결과: Lv1 10.25→10.08, 4장 23.18→14.39. 오리요강 몫의 마틸다 HP 과대계상(1.61배)이 사라진다.
     플레이어에게 유리한 방향이다.
   - 회귀 테스트 1건 추가: `src/lib/matildaSpec.test.js` (Lv1 10.08, Lv5 14.39, HP = DPS×1800).

## 테스트
- 지정 6파일(HUD, HUD.questInventory, useGameStore.levelupExposure, upgrades, weaponCatalog, matildaSpec): **191 passed / 191**
- 인접 포함 14파일(+ tumblerDurability, CompassBlade, Starlink, starlinkCrash, weaponPermanentUpgrades,
  useGameStore, useGameStore.unlocks, Enemies): **476 passed / 476**
- 전체 스위트: 4098 passed / 8 failed / 33 skipped (400 파일). 8건 모두 이번 변경과 무관하다.
  - 단독 재실행 시 통과(부하 타임아웃): Enemies.lowDensityAllStages ×2, Enemies.stage5, MiniRosari, Lobby 10,000회 루프.
  - 단독 재실행해도 실패(기존 결함): i18nCoverage(`up.hanakoUpgrade` en·ja 누락), generate-audition(SOUND_MAP 91개 vs 90),
    App.virtualJoystick(.webp 프레임 자산 빈 문자열). 이번 변경 파일과 무관하다.

## balanceqa 핸드오프
- 확인 요청: 스타링크 5000에서 실기 체감(2500킬 보상이 중앙값 수준인지), 오리요강 빌드 마틸다 HP 하락폭.
- 미적용(문서상 Terry 결정/보류): ② 보조배터리 미사일, ⑤ 치비코, ⑥ 커터칼 배수, 연필 카드 순서 선택안.
