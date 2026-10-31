# balanceqa 검증: 하나코·이누콘·선긋기 재설계 (receipt 3a20befe)

- 대상: 0a2b5d42 / 76e358b0 / 94fbfb87 (트리 ezs-cf, HEAD 94fbfb87), 읽기 전용 검토
- 실행: `npx vitest run <지정 9파일> --testTimeout=60000 --maxWorkers=2` → **Test Files 1 failed | 8 passed (9), Tests 1 failed | 239 passed (240)**

## 판정표

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| 6 | 소크 회귀 | **FAIL** | `gameplaySoak.test.js` seed 1 frame 7065: "무기 hanako damage 비정상: undefined". 소크는 전 무기를 active로 시작해 acquire 카드가 안 뜨는데(gameplaySoak.js:180), 새 stat 카드 `hanakoUpgrade`(upgrades.js:164)가 damage 필드 없는 hanako.base(weaponCatalog.js:139)를 churn → gameplaySoak.js:201. 0a2b5d42가 원인. 수정안: hanako.base에 `damage: 0` 추가(inucon.base:149 선례). |
| 1a | 치명타 보너스 리셋 | PASS | subscribeWithSelector + `fireImmediately`(useGameStore.js 말미). resetGame이 weapons 재생성 → 0. 교체로 hanako/chibiko 비활성 → 0. 게임오버 뒤엔 남지만 phase≠playing이라 무해. |
| 1b | 테스트 격리 | PASS(잠재 RISK 낮음) | criticalHits.test는 try/finally로 0 복구. store로 hanako를 켜는 HUD.test·upgrades.test·Hanako.runtime은 같은 파일 내 1.5 가정 시 순서 의존 가능 — 현재 통과. |
| 1c | 플레이어 피격 crit | PASS | damagePlayer는 crit 헬퍼 미사용. 헬퍼는 Enemy.jsx:1163·Enemies.jsx:1544(적 피격)만. |
| 2 | 하나코 회복 | RISK(설계) | 아래 표. 풀피 근처 과회복 낭비(HP95·Lv5 → 28.5 중 23.5 버림), 저체력일수록 무력. Lv1은 HP<100 전 구간에서 구판(최대HP 10%)보다 약함. DPS 추정기는 weapon.critMultiplier 기본 1로 고정 1.5조차 미반영(기존 갭) → 플레이어 유리 방향, RISK 낮음. crit 기대배율 c=0.21 기준 1.105→1.20(+8.6%). |
| 3a | 비율 피해 흡수 | PASS(의도 범위) | B03 30%·HP100=30 → 이누콘 20 흡수·기절, 주인공 10. 가마솥 20%×100=20 → 정확히 기절·초과 0. |
| 3b | amount≤0 return | PASS | HP 불변이라 데스체크 생략 정당. 무적 해제는 Player.jsx:352-357 `invulnerable` 타이머만 의존(hitFlashToken 무관). 단 흡수분은 `logDamageTaken` 미기록 → 받는 피해 텔레메트리 과소 집계(RISK 낮음). |
| 3c | 마틸다 즉사 | PASS | `killPlayer` 별도 경로(useGameStore.js:521~). |
| 3d | 가동률 | **RISK 높음** | 아래 산식. 밀집 구간에서 "거의 항상 기절", 기절 중 1 HP/s 회복도 정지 → 구판 대비 순 너프. |
| 4 | 시계·초기화 | PASS / RISK 낮음 | 런타임 시계는 phase==='playing'에서만 전진(Game.jsx:85-88). resetGame `inucon: null`(1571), 다음 스테이지도 resetGame 경유(1539). 교체로 빠질 때 `state.inucon`이 stale로 남아 같은 런 재획득 시 이전 hp/기절 승계. |
| 5 | 선긋기 | PASS / RISK(체감) | 직격 박스 origin−dir·(L/2+0.12), range L+0.12 → 정확히 a~b(lineDraw.js:150-160). LineDraw.jsx:451-466이 같은 playerPos·회전 facing 전달. 트레일은 ax에서 +dir로 L(geometry translate len/2) → 시각 일치. 정지 시 playerFacing은 마지막 yaw 유지, 런 시작 (0,0,1)(refs.js:56). 한쪽 최대 사거리 6u→3u 반감, 측면 3u 밖 적 미절단. |

## 하나코 상쇄율 (받는 피해 15 HP/s 대비, 회복 = r·HP/20s)

| | HP100 | HP50 | HP20 |
|---|---|---|---|
| Lv1 (10%) | 0.50/s (3.3%) | 0.25/s (1.7%) | 0.10/s (0.7%) |
| Lv5 (30%) | 1.50/s (10%) | 0.75/s (5%) | 0.30/s (2%) |

## 이누콘 가동률 추정 (maxHp 100 → 이누콘 20)

- 밀집 S1(15 HP/s, 1타 8~10): 2~3타 ≈1.3s 생존 / 35s 기절 → 가동 ≈3.6%, 흡수 20/36.3s = 0.55 HP/s = **피해 감소 ≈3.7%**. S4(15/타)는 2타.
- 산발(9dmg/5s = 1.8 HP/s): 생존 ≈11~15s, 주기 ≈47s → 흡수 0.43 HP/s ≈24%.
- 구판 비교: 상시 회복 1 HP/s(2%/2s) = 밀집 6.7%. 신판 밀집 실효 ≈3.7%+α.
- 대안(구현 안 함): (A) 리스폰 12s + HP 30% → 30/14s ≈2.1 HP/s ≈14%. (B) 리스폰 15s 유지 HP 20% → 1.2 HP/s ≈8%. (C) 기절 중 회복은 유지.

## 결론

**REJECT** — 소크 게이트 FAIL 1건(1줄 수정: weaponCatalog.js:139 hanako.base `damage: 0`). 수정·소크 재통과 시 APPROVE WITH NOTES(이누콘 가동률 RISK, 하나코 저체력 무력, 선긋기 사거리 반감은 levelmini 판단 사항).
