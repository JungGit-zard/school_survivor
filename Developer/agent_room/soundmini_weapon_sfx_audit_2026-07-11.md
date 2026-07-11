# Sound_Mini 16종 무기 동작 SFX 전수 감사

작성: 2026-07-11 KST  
역할: `soundmini` / Sound_Mini  
범위: 런타임 호출, `SOUND_MAP`, `public/sfx`, 이벤트 맥락, cooldown/polyphony, 라이선스  
제약: 이 감사 단계에서는 런타임 소스·사운드 파일을 수정하지 않음

## 1. 결론

- 카탈로그의 무기는 16종이다. 15종은 최소한 fire/start 호출이 있고, `compassBlade`만 등록된 `compassFire`가 런타임에서 호출되지 않는다. `tumbler`는 상시 공전형이라 활성화 시 한 번만 시작음을 낸다.
- 가장 큰 결함은 **타격 에셋은 등록돼 있지만 실제 타격 코드에서 거의 호출되지 않는 것**이다. `SOUND_MAP`의 무기 hit ID 15개 중 현재 런타임에서 직접 호출되는 것은 `compassHit` 하나뿐이다.
- `studentLantern`의 틱은 `pencilHit`를 300ms마다 호출한다. 작고 짧은 소리라는 성능 의도는 이해되지만 빛 피해를 연필 충돌음으로 표현해 맥락이 틀리고, 적이 몰리면 0.1초 파일이 계속 반복된다.
- `starlink`는 `starlinkFire`, `starlinkFall`, `starlinkExplosion`은 연결되어 있지만 실제 번개 피해 순간의 `starlinkHit`은 빠져 있다. 낙하·폭발은 일정 공격 횟수마다 나오는 별도 추락 연출이지 매 공격의 hit 대체가 아니다.
- `POLYPHONY_COOLDOWN`에는 무기 SFX가 하나도 없다. 다중 투사체, 관통, 체인, 공전, 광역 타격을 연결하는 순간 같은 프레임 중첩이 발생한다.
- `public/sfx/weapons`는 66파일, 33개 OGG/MP3 완전한 페어, 총 347,375 bytes다. `ffprobe`로 66파일 모두 디코딩 가능한 duration을 확인했고 누락 페어는 없다.
- 새 외부 음원을 찾을 필요는 없다. 기존 33개 무기 에셋을 우선 연결하고, 랜턴 틱과 플라스크 웅덩이 틱만 기존 짧은 에셋의 **경로 alias**로 의미 있는 새 이벤트 ID를 만드는 것이 가장 작은 안전한 변경이다.

## 2. 현재 오디오 경로와 공통 위험

경로는 `emitSfx(event)` → `SfxLayer` → `playSfx(id, volume, { rate, authOverlayActive })` → Howler 순서다. `playSfx`는 OGG 우선, MP3 fallback, lazy `Howl`, load 실패 후 무음 skip을 사용한다. 인증 오버레이에서는 `buttonClick`만 허용하는 현재 정책을 유지해야 한다.

현재 `POLYPHONY_COOLDOWN`은 `zombieDeath=50`, `zombieHeavyDeath=50`, `playerHit=80`, `coinCollect=40ms`뿐이다. Howler 인스턴스의 동시 voice 상한이나 우선순위/steal 정책은 없다. 같은 ID의 짧은 이벤트가 여러 번 오면 모두 재생된다. 따라서 hit 연결과 동시에 아래 weapon cooldown을 추가하지 않으면 안 된다.

`Enemy.jsx`의 `_enemyHit(dmg, impact)`는 `impact.sfxId`가 있으면 적 한 마리마다 emit한다. 단일·관통 투사체에는 이 경로가 적합하지만, 광역 공격은 `applyRadialDamage`가 적 수만큼 `_enemyHit`을 호출하므로 `sfxId`를 각 impact에 넣지 말고 **광역 함수 반환 hit 수를 확인한 뒤 폭발 콜백에서 한 번만 emit**해야 한다.

## 3. 무기별 감사 및 정확한 후속 구현 명세

| 무기 | 현재 호출 | 누락·오류·스팸 위험 | 후속 구현 지점과 이벤트 ID |
| --- | --- | --- | --- |
| 연필 `pencilThrow` | `Pencil.jsx:145`에서 한 volley당 `pencilFire` 1회 | `Pencil.jsx:59` 실제 적중은 무음. 개수·관통 증가 시 같은 프레임 다중 hit 가능 | `Pencil.jsx:59`의 `_enemyHit` impact에 `sfxId:'pencilHit'`. `pencilHit` 35ms cooldown, volume 0.48~0.60, rate 0.94~1.08. fire는 개별 투사체가 아니라 현재처럼 volley 1회 유지 |
| 30cm 자 `schoolBag` | `SchoolBag.jsx:75` swing 시작 `rulerFire` | `SchoolBag.jsx:139` 지연 적용되는 실제 타격 무음. 한 swing으로 여러 적 타격 가능 | `SchoolBag.jsx:139` impact에 `sfxId:'rulerHit'`. `rulerHit` 55ms cooldown, volume 0.58. 적별 hit는 허용하되 cooldown으로 한 swing의 군집을 1~2회로 축약 |
| 커터칼 `boxCutter` | `BoxCutter.jsx:228` 공격 시작 `boxCutterFire` | `BoxCutter.jsx:231` 전방 다중 타격 무음 | `_enemyHit` impact에 `sfxId:'boxCutterHit'`. `boxCutterHit` 45ms cooldown, volume 0.52, rate 1.00~1.10 |
| 텀블러 `tumbler` | `Tumbler.jsx:84` 활성화 시 `tumblerFire` 1회 | `Tumbler.jsx:75` 접촉 tick 무음. 초당 2.5회×최대 3개×다수 적이라 직접 연결 시 폭주 | `_enemyHit` impact에 `sfxId:'tumblerHit'`; `tumblerHit` 90ms cooldown, volume 0.35~0.45, rate 0.90~1.05. 활성화 시작음은 현행 유지. 상시 공전에는 loop/end를 추가하지 않음 |
| 과학 플라스크 `scienceFlask` | `Flask.jsx:235` 투척 `flaskFire` | `Flask.jsx:208~217` 착탄 폭발 무음, `:134~136` 1초 웅덩이 tick 무음. 중첩 웅덩이 스팸 가능 | `explode`에서 `applyRadialDamage`와 무관하게 착탄 1회 `flaskHit` volume 0.65. 웅덩이 tick은 반환 hit>0일 때 `flaskTick` volume 0.18. `flaskTick`은 새 파일 없이 `/sfx/weapons/chibikoHit.ogg` alias, 140ms cooldown. `flaskHit` 100ms |
| 벨 `bell` | `Bell.jsx:203` 충격파 시작 `bellFire` | `Bell.jsx:206` 광역 hit 무음. `bellFire`가 0.8초라 hit와 겹칠 수 있음 | `applyRadialDamage` 반환 hit>0일 때 `bellHit` 1회, volume 0.45, rate 0.96~1.04. `bellHit` 120ms cooldown. 적별 emit 금지 |
| 전기 `stunGun` | `StunGun.jsx:190` 최초 볼트 `stunGunFire` | `StunGun.jsx:120` 각 적중/chain 무음 | `_enemyHit` impact에 `sfxId:'stunGunHit'`. chain 단계별 event `rate`를 1.00, 1.06, 1.12처럼 올리려면 `onBoltHit` 직전 직접 emit하는 편이 단순하다. 둘 중 한 경로만 사용. 55ms cooldown, volume 0.55 |
| 오니기리 `onigiri` | `Onigiri.jsx:230` 발사 `onigiriFire` | `Onigiri.jsx:158` 최초 hit와 bounce 모두 무음 | `_enemyHit` impact에 `sfxId:'onigiriHit'`. bounce마다 rate 0.96→1.02→1.08 변화를 주려면 직접 emit 후 impact에는 ID를 넣지 않는다. 65ms cooldown, volume 0.50 |
| 치비코 `chibiko` | `Chibiko.jsx:274` 연필 발사 `chibikoFire` | 추적 도착 `:168`, collider fallback `:197` 모두 무음 | 두 hit 경로 모두 동일하게 `chibikoHit` 1회가 되도록 공통 hit 함수로 묶거나 각각 impact/direct emit. `hitRef`가 중복을 이미 차단. 40ms cooldown, volume 0.42 |
| 보조배터리 미사일 `guidedMissile` | `Missile.jsx:279` 발사 `missileFire` | `Missile.jsx:253~262` 폭발·광역 hit 무음. 업그레이드로 미사일 2개면 근접 폭발 중첩 | `onExplode` 진입에서 미사일당 `missileHit` 1회, 적 수와 무관. 140ms cooldown, volume 0.70, rate 0.92~1.04 |
| 상어미사일 `sharkMissile` | `SharkMissile.jsx:307` 발사 `sharkFire` | `SharkMissile.jsx:267~281` 폭발 무음 | `explode` 진입에서 `sharkHit` 1회. 180ms cooldown, volume 0.72. 0.55초 파일이라 동시 발사 수가 늘어도 적별 emit 금지 |
| 고장난 스타링크 `starlink` | `Starlink.jsx:185` 공격 시작, `StarlinkSatellite.jsx:328/335` 추락·착지 | `Starlink.jsx:138` 실제 번개 타격 무음. `starlinkHit` 에셋은 미사용. 추락음 1.2초·폭발음 0.85초라 별도 cooldown 필요 | `StrikeWrapper`가 damage를 적용하는 `Starlink.jsx:136~139`에서 strike당 `starlinkHit` 1회. `starlinkHit` 90ms. `starlinkFall` 500ms, `starlinkExplosion` 650ms cooldown. 기존 fire/fall/explosion 순서 유지 |
| 나침반 칼날 `compassBlade` | 5스택 폭발 때만 `CompassBlade.jsx:220` `compassHit` | `compassFire`는 등록·파일 존재하지만 미사용. `:290` 공전 접촉 tick은 무음. `compassHit` 0.5초는 매 tick에 부적합 | 텀블러처럼 무기 active 전환 시 `compassFire` 1회. 접촉 tick은 `compassFire`를 volume 0.18로 재사용하되 110ms cooldown; 5스택 폭발의 `compassHit`는 현행 유지하며 180ms cooldown. 별도 새 파일 불필요 |
| 우산 방어막 `umbrellaGuard` | `UmbrellaGuard.jsx:216` 펼침 `umbrellaFire` | 1.2초 회전 뒤 `:196~205` 폭발·넉백 무음 | `explode` 진입에서 `umbrellaHit` 1회, volume 0.62. 140ms cooldown. 적별 emit 금지 |
| 지우개 폭탄 `eraserBomb` | `EraserBomb.jsx:156` 투척 `eraserFire` | `EraserBomb.jsx:125~134` 착탄 먼지 폭발 무음 | `explode` 진입에서 `eraserHit` 1회, volume 0.66. 160ms cooldown. 적별 emit 금지 |
| 학생용 랜턴 `studentLantern` | `StudentLantern.jsx:138` 점등 `lanternFire`; `:171` 피해 tick마다 `pencilHit` | `pencilHit`은 맥락 오류. 300ms 주기이며 빛 안 적이 하나라도 있으면 계속 재생. beam 3~7초인데 loop/end 개념 없음 | `pencilHit` 호출을 `lanternTick`으로 교체. 새 파일 없이 `/sfx/weapons/chibikoHit.ogg` alias, volume 0.20~0.25, rate 0.82~0.94, 120ms cooldown. `lanternFire`는 점등 1회 유지. loop/end 추가는 현재 작은 예산에서는 YAGNI |

## 4. 권장 `POLYPHONY_COOLDOWN` 최소안

```js
pencilHit: 35,
rulerHit: 55,
boxCutterHit: 45,
tumblerHit: 90,
flaskHit: 100,
flaskTick: 140,
bellHit: 120,
stunGunHit: 55,
onigiriHit: 65,
chibikoHit: 40,
missileHit: 140,
sharkHit: 180,
starlinkHit: 90,
starlinkFall: 500,
starlinkExplosion: 650,
compassFire: 110,
compassHit: 180,
umbrellaHit: 140,
eraserHit: 160,
lanternTick: 120,
```

이는 “최대 voice 수”가 아니라 동일 ID 재호출을 거르는 최소 안전망이다. 우선순위 mixer나 전역 voice stealing은 이번 기능을 위해 새로 만들 필요가 없다. fire cooldown은 각 무기의 gameplay cooldown이 이미 보장하므로 별도 registry cooldown이 꼭 필요하지 않다.

## 5. SOUND_MAP / 에셋 감사

- 무기 registry: fire/start/sequence 18 ID + hit 15 ID = 33 ID.
- 무기 파일: 33 OGG + 33 MP3, 누락 페어 0, 총 347,375 bytes.
- 전체 `public/sfx`: 124파일 = 62 OGG/MP3 페어, 총 763,782 bytes, 누락 페어 0.
- 무기 duration 범위: 0.08초(`chibikoHit`)~1.2초(`starlinkFall`). 긴 파일인 `starlinkFall`, `starlinkExplosion`, `bellFire`, `sharkHit`은 반드시 이벤트당 1회 및 cooldown 대상이다.
- `SOUND_MAP` 주석의 “무기 발사음 14종/타격음 14종”은 실제 18/15 ID와 불일치한다. 기능에는 영향 없으나 후속 수정 시 숫자 주석을 고친다.
- `flaskTick`과 `lanternTick`은 새 음원 파일을 만들지 않고 짧은 `chibikoHit` 경로를 alias하는 안이다. 이렇게 하면 호출부 의미는 정확해지고 다운로드 크기는 늘지 않는다.

## 6. 라이선스와 provenance 한계

- `Developer/r3f_prototype/scripts/generate_sfx.mjs`는 외부 샘플 없이 Node 내장 기능으로 파형을 직접 합성하는 57개 정의를 보유한다. 이 스크립트로 만들어진 자산은 타 게임 음원 복제보다 안전한 프로젝트 자체 절차합성 근거가 있다.
- 다만 현재 저장소에는 각 OGG/MP3가 어느 스크립트 revision, seed, WAV, ffmpeg 명령으로 만들어졌는지 연결하는 자산별 manifest/hash가 없다. `Math.random()` noise 때문에 같은 명령도 bit-identical 재생성을 보장하지 않는다.
- `starlinkFall`, `starlinkExplosion`은 개발 기록에 “generated”라고만 적혀 있고 해당 생성 preset/명령이 현재 생성기에는 없다. `lanternFire`도 전용 파일 추가 기록은 있으나 생성법·라이선스 문구가 없다. 따라서 **코드상 자체 생성 추정은 가능하지만 출시용 provenance 완료로 선언할 수 없다.**
- 외부 CC0/CC-BY 자산을 이번 구현에 추가하지 않는다. CC-BY는 크레딧 의무 기록 전 사용 금지, NC/GPL/SA/불명확 라이선스는 출시 후보에서 제외한다.
- 후속으로 `public/sfx/ASSET_PROVENANCE.md` 또는 JSON manifest에 ID, 제작 방식, 생성 스크립트/명령, 작성자, 날짜, 라이선스, source hash를 남겨야 한다.

## 7. 구현 검증 게이트

1. `sfxRegistry.test.js`: 모든 `SOUND_MAP` 경로의 OGG/MP3 존재를 순회 검증하고 weapon cooldown을 fake timer로 검증.
2. 무기별 소스 테스트 또는 동작 테스트: fire와 hit/explosion이 정확한 lifecycle 지점에서 각각 한 번 호출되는지 확인.
3. 광역 무기는 적 0명/1명/10명에서 폭발음 횟수가 적 수와 무관하게 1회인지 확인.
4. 연필 다중 발사·관통, 전기 chain, 오니기리 bounce, 텀블러/나침반 다중 overlap에서 cooldown으로 한 프레임 중첩이 제한되는지 확인.
5. 랜턴 테스트의 `pencilHit` 기대를 `lanternTick`으로 교체하고, 적이 없으면 tick 음이 나지 않는 규칙 유지.
6. `npm test -- --run`의 관련 테스트와 `npm run build` 통과 후 실제 모바일 또는 브라우저 청음으로 clipping, 피로, 보스 경고 마스킹을 확인. 자동 테스트만으로 청음 완료를 주장하지 않는다.

## 8. 이번 감사의 검증 근거

- 필독 정책/역할 문서 9개 전체 확인.
- `weaponCatalog.js`의 16종과 `Weapons/*.jsx` 실제 공격 lifecycle 대조.
- 전체 `emitSfx`, `_enemyHit`, `applyRadialDamage`, `applyForwardConeDamage`, `SOUND_MAP`, `POLYPHONY_COOLDOWN` 정적 검색.
- `ffprobe 8.1.1`로 무기 OGG/MP3 66파일 duration 파싱 성공.
- PowerShell 파일 집계로 전체 124파일/62페어 및 누락 페어 0 확인.
- 런타임 소스, registry, 에셋은 수정하지 않았고 이 감사 문서만 추가했다.
