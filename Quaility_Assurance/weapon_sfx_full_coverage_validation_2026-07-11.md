# 16종 무기 SFX 전체 연결 독립 검수

- 검수일: 2026-07-11 KST
- 역할: `balanceqa` / Balance_QA_Mini
- 대상: 현재 working tree의 무기 SFX 변경
- 기준 문서: `project_develop_policy.md`, `AGENTS.md`, `Developer/agent_room/soundmini_weapon_sfx_audit_2026-07-11.md`
- 판정: **PASS (자동 검증 범위)**
- 제한: 이 환경에서는 실제 스피커/이어폰 청음과 실기기 동시 발음·클리핑 확인을 수행할 수 없었다. 음색 적합성, 체감 음량, 보이스 과밀 여부는 수동 플레이 청음이 남아 있다.

## 1. 결론

Sound_Mini 감사 계약에서 요구한 16종 무기의 발사/활성화와 타격/틱/바운스/체인/폭발 SFX 연결이 모두 확인됐다. AOE는 적 개체별 emit이 아니라 공격 콜백 또는 `applyRadialDamage` 반환 hit 수를 기준으로 한 번만 emit한다. 직접 타격 계열은 기존 projectile/적 ID/타격 Set 또는 전역 ID별 cooldown으로 중복 재생을 제한한다.

`SOUND_MAP`의 무기 파일은 OGG 33개와 MP3 33개가 모두 짝을 이루고, `flaskTick`과 `lanternTick`은 감사 계약대로 짧은 `chibikoHit` 에셋 경로 alias를 사용한다. 무기용 `POLYPHONY_COOLDOWN` 20개 항목도 감사 문서와 일치한다.

공격력, 공격 쿨다운, 범위, 타겟팅, 그래픽, 해금 수치 변경은 발견되지 않았다. `weaponCatalog.js`, `upgrades.js`, store 파일에는 이 작업의 diff가 없다. 무기 파일의 비-SFX 구조 변경은 Chibiko 중복 타격 방지 경로 통합과 StunGun의 무대상 ghost fire 방지 및 chain pitch용 depth 전달뿐이며 기존 데미지/넉백/타겟 선택 값은 유지된다.

## 2. 16종 연결 확인표

| 무기 | 시작/발사 | 동작 결과음 | 중복/순서 검증 | 판정 |
| --- | --- | --- | --- | --- |
| 연필 | `pencilFire` volley당 1회 | 실제 관통 타격마다 `pencilHit` | projectile의 `hitEnemyIds` + 35ms cooldown | PASS |
| 30cm 자 | `rulerFire` swing당 1회 | 실제 swing 타격의 `rulerHit` | 기존 hit set + 55ms cooldown | PASS |
| 커터칼 | `boxCutterFire` 공격당 1회 | 선택된 실제 타겟의 `boxCutterHit` | 타겟 목록 + 45ms cooldown | PASS |
| 텀블러 | 활성 전환 시 `tumblerFire` 1회 | 접촉 tick의 `tumblerHit` | 적별 타격 시각 map + 90ms cooldown | PASS |
| 과학 플라스크 | `flaskFire` | 착탄 `flaskHit`, 적이 있을 때만 웅덩이 `flaskTick` | AOE 콜백당 1회, tick hit count 확인 | PASS |
| 벨 | `bellFire` | 실제 피격이 있을 때 `bellHit` | `applyRadialDamage` 반환값으로 pulse당 1회 | PASS |
| 전기 | 타겟 확정 후 `stunGunFire` | 최초/chain 타격마다 `stunGunHit`, depth별 pitch | 무타겟 fire 금지, hit set, 55ms cooldown | PASS |
| 오니기리 | `onigiriFire` | 최초 타격과 bounce마다 `onigiriHit`, 깊이별 pitch | `hitSetRef`, 65ms cooldown | PASS |
| 치비코 | `chibikoFire` | 추적/충돌 공통 성공 경로의 `chibikoHit` | 공통 `hitEnemy`, `hitRef`로 이중 콜백 차단 | PASS |
| 보조배터리 미사일 | `missileFire` | 미사일별 폭발 진입의 `missileHit` | 적 수와 무관하게 폭발당 1회, 140ms cooldown | PASS |
| 상어미사일 | `sharkFire` | 미사일별 폭발 진입의 `sharkHit` | 적별 emit 없음, 180ms cooldown | PASS |
| 고장난 스타링크 | 공격 `starlinkFire` | 실제 strike hit의 `starlinkHit`; 추락 시작 `starlinkFall`; 착지 `starlinkExplosion` | fire -> strike hit, 별도 추락은 fall -> landed explosion 순서 | PASS |
| 나침반 칼날 | active 전환 `compassFire` 1회 | 접촉 tick은 작은 `compassFire`; 5-stack 폭발은 `compassHit` | 접촉 damage/tick 후 stack 판정, 폭발 callback에서 `compassHit` 후 AOE | PASS |
| 우산 방어막 | `umbrellaFire` | 폭발 콜백의 `umbrellaHit` | 적별 emit 없음, 140ms cooldown | PASS |
| 지우개 폭탄 | `eraserFire` | 폭발 콜백의 `eraserHit` | 적별 emit 없음, 160ms cooldown | PASS |
| 학생용 랜턴 | 점등당 `lanternFire` | 적을 맞힌 tick만 `lanternTick` | `pencilHit` 오용 제거, 120ms cooldown | PASS |

감사 계약은 텀블러와 랜턴에 별도 loop/end 사운드를 추가하지 않는 YAGNI 결정을 명시하므로, end 이벤트 부재는 결함으로 판정하지 않았다.

## 3. Registry와 에셋 검증

- 무기 registry 경로: fire/start/sequence 18 ID, hit 15 ID, tick alias 2 ID.
- `public/sfx/weapons`: OGG 33개, MP3 33개.
- OGG에 대응하는 MP3 누락: 0개.
- MP3에 대응하는 OGG 누락: 0개.
- 전체 `SOUND_MAP` OGG/MP3 경로 존재 테스트: PASS.
- alias:
  - `flaskTick -> /sfx/weapons/chibikoHit.ogg`
  - `lanternTick -> /sfx/weapons/chibikoHit.ogg`
- 감사 계약의 무기 cooldown 20개 모두 registry에 존재:
  - `pencilHit`, `rulerHit`, `boxCutterHit`, `tumblerHit`, `flaskHit`, `flaskTick`, `bellHit`, `stunGunHit`, `onigiriHit`, `chibikoHit`, `missileHit`, `sharkHit`, `starlinkHit`, `starlinkFall`, `starlinkExplosion`, `compassFire`, `compassHit`, `umbrellaHit`, `eraserHit`, `lanternTick`.

## 4. 게임플레이 회귀 검토

- `weaponCatalog.js`, `upgrades.js`, store: diff 없음.
- 공격력/공격 쿨다운/범위/타겟 수/투사체 수/넉백 수치: 변경 없음.
- 그래픽/해금 데이터: 변경 없음.
- Chibiko: 추적 거리 판정과 collider 판정이 같은 `hitEnemy` 함수를 쓰도록 합쳐졌지만 기존 1회 damage/expire 동작을 유지하고, 두 경로가 같은 프레임에 들어오는 경우를 `hitRef`로 차단한다.
- StunGun: `lastFireRef` 갱신과 `stunGunFire`를 실제 `nearestId` 확인 뒤로 이동해 무대상 ghost fire를 제거했다. 체인 수, 데미지, 넉백, 타겟 선택은 유지하고 `chainDepth`는 hit pitch에만 사용한다.
- Compass: active 전환음 -> 접촉 damage와 quiet tick -> stack 계산 -> 5-stack 폭발의 `compassHit` 순서를 확인했다.
- Starlink: 일반 공격의 `starlinkFire`와 실제 damage 시 `starlinkHit`, 별도 위성 추락 연출의 `starlinkFall` 후 landed 전환에서 `starlinkExplosion` 순서를 확인했다.

## 5. 실행 명령과 결과

모든 npm 명령에서 `TEMP=D:\Temp`, `TMP=D:\Temp`를 설정했다.

### 집중 테스트

```text
npm test -- --run src/components/Weapons/AoeWeaponSfx.test.jsx src/components/Weapons/WeaponHitSfx.test.jsx src/components/Weapons/Flask.test.jsx src/components/Weapons/StudentLantern.test.jsx src/lib/sfxRegistry.test.js
```

- 결과: 5 files PASS, 28 tests PASS.

### 전체 테스트

```text
npm test -- --run
```

- 결과: 100 files 중 98 PASS / 2 FAIL, 664 tests 중 662 PASS / 2 FAIL.
- SFX 관련 테스트 실패: 0.
- 기존 Stage 2 변경에서 분리한 실패:
  1. `ClassroomFloor.test.jsx`: `STAGE2_CORRIDOR_END.positionZ` 기대값 `< -40`, 실제 `-22.575...`.
  2. `stageConfig.test.js`: Stage 2 기대 `bossWarningSec=120`, `escapePortalSec=150`; 현재 설정 `180`, `240`.
- 위 두 실패는 무기 SFX 파일·registry와 무관하며, 현재 working tree의 기존 Stage 2 복도/시간 설정 변경과 테스트 기대치 불일치다.

### 프로덕션 빌드

```text
npm run build
```

- 결과: PASS, 223 modules transformed.
- 비차단 경고: `useGameStore.js`의 dynamic/static import 혼용, 500kB 초과 chunk.

### 정적 에셋/쿨다운 확인

```text
weapon_ogg=33 weapon_mp3=33 missing_mp3_pairs=0 missing_ogg_pairs=0
cooldown_expected=20 cooldown_present=20 cooldown_missing=
```

## 6. Actionable findings와 잔여 위험

### Actionable findings

- 없음. 자동 검증 범위에서 무기 SFX 계약 위반이나 게임플레이 수치 회귀를 발견하지 못했다.

### 잔여 위험

- 실제 청음 미수행: 여러 무기가 동시에 공격할 때의 체감 음량, clipping, 피로도, 모바일 스피커에서의 식별성은 수동 플레이로 확인해야 한다.
- 새 SFX focused tests 일부는 소스 문자열/정규식 기반 계약 테스트다. 현재 배선 누락 방지에는 유효하지만, 실제 React/R3F 프레임에서 정확한 emit 횟수를 모두 계측하는 통합 테스트를 대체하지는 않는다.
- 전체 suite의 Stage 2 실패 2건은 이 작업을 막는 SFX 결함은 아니지만, 브랜치를 green으로 만들려면 별도 Stage 2 작업에서 기대값과 구현 의도를 정리해야 한다.

## 8. 코드 리뷰 후속 검증

- 30cm 자가 충돌 대기 중 이미 사망한 적에 피해 없이 타격음만 내던 경쟁 조건을 수정했다.
- `SchoolBag.test.jsx`에서 사망 대상은 피해·타격음 모두 0회, 생존 대상은 피해·타격음이 함께 1회임을 실행 검증했다.
- 무기 cooldown 20개 전부를 `t=0`, `duration-1`, `duration` 경계에서 실행 검증했다.
- `SfxLayer.test.jsx`에서 실제 이벤트 구독을 통해 id·volume·rate·auth 상태가 `playSfx`로 전달됨을 검증했다.
- 최종 집중 테스트: 7 files, 32 tests PASS.
- 최종 전체 테스트: 102 files 중 100 PASS / 2 FAIL, 671 tests 중 669 PASS / 2 FAIL. 실패 2건은 위에 기록한 기존 Stage 2 불일치와 동일하다.
- 최종 production build: PASS.

## 7. 이 검수에서 변경한 파일

- `Quaility_Assurance/weapon_sfx_full_coverage_validation_2026-07-11.md` 추가.
- 소스 코드, 사운드 에셋, 테스트 코드는 수정하지 않았다.
- commit/push하지 않았다.
