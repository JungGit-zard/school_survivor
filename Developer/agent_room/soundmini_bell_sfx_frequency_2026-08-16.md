# 벨 쿨다운 단축(4500→3200ms)에 따른 효과음 발동 빈도 검수

- 담당: soundmini
- 일자: 2026-08-16
- 대상 커밋: `ad54c4f` (`weaponCatalog.js` `bell.base.cooldown` 4500 → 3200)
- 워크트리: `D:/JungSil/2.Minigame_project/school_survivor-integration`

## 판정: CONCERN → 오디오측 1줄 수정으로 해소

빈도 증가 자체(+40%)는 **문제 없다.** 그러나 빈도 증가가 **기존에 있던 믹스 결함의 노출 빈도를 40% 끌어올렸다.**
결함은 밸런스 값이 아니라 오디오측에 있었고, `Bell.jsx` 한 줄로 잡았다.

> **검증 근거 고지:** 실제 청감 테스트는 하지 않았다. 아래는 전부 **코드 경로 추적 + 음원 파일 실측 길이 + 생성기 스크립트의 진폭 정규화 로직 분석** 기준이다.
> 음원 피크 레벨(dBFS/LUFS)은 이 환경에 ffmpeg/sox/ogg 디코더가 없어 **직접 측정하지 못했고**, `scripts/generate_sfx.mjs`의 `mix()` 정규화 코드로부터 역산했다.

---

## 1. bellHit 빈도가 청감상 과한가 → **아니다 (PASS)**

| 항목 | 이전 | 이후 |
|---|---|---|
| 쿨다운 | 4500ms | 3200ms |
| 발동/초 | 0.222 | 0.3125 |
| 발동/분 | 13.3 | 18.75 |
| `bellHit` 음원 길이 (실측) | 0.360s | 0.360s |
| `bellHit` 듀티 사이클 | 8.0% | 11.25% |

3.2초 간격은 반복이 리듬으로 인지되기 시작하는 구간(대략 1초 이하)에서 한참 위다.
4.5초와 3.2초는 둘 다 "가끔 울리는 랜드마크 사운드"로 들리는 대역이라, 이 변화만으로 연사감이 생기지 않는다.
듀티 11.25%면 벨 소리가 안 나는 시간이 여전히 89%다.

**쿨다운 단축의 추가 여지도 없음을 확인했다** — 벨은 레벨업 카드(`upgrades.js` bellDamage/bellPower/bellCrit)와
영구강화(`weaponPermanentUpgrades.js` bell = 피해/치명타)가 전부 쿨다운을 건드리지 않는다.
유일한 감소원은 치비코 전체버프(`CHIBIKO_BASE_ALL_WEAPON_BOOST` 0.1, 영구 6렙 이상 0.12)로,
**최악값도 3200 × 0.88 = 2816ms (0.355회/초)**. 이 역시 문제 대역이 아니다.

---

## 2. 진짜 문제 — 벨은 발사음과 타격음이 **같은 프레임**에 나가는 유일한 무기다

`Bell.jsx`는 한 펄스에서 `bellFire`와 `bellHit`을 **같은 프레임에 연속 emit**한다(204행 / 214행 사이에
`applyRadialDamage`만 있고 지연이 없다). 전 무기를 확인한 결과 이런 무기는 벨뿐이다.

- `stunGun`, `chibiko`, `pencil`, `missile`, `shark` → 투사체 비행시간만큼 분리
- `flask`, `eraserBomb` → 투척과 폭발이 분리
- `schoolBag`(ruler) → 스윙 시작과 판정이 분리
- `starlink` → 타격이 `STRIKE_DURATION_MS * 0.3` 지점으로 오프셋 (`Starlink.jsx:195`)
- `compass` → 활성화 시 1회만

### 합산 레벨이 풀스케일을 넘고 있었다

`scripts/generate_sfx.mjs`의 `mix()`는 다음과 같다:

```js
const peak = Math.max(...Array.from(out).map(Math.abs)) || 1
return out.map(v => v / Math.max(peak, 1))
```

즉 **raw 피크가 1을 넘으면 정확히 1.0으로 정규화**한다(1 미만이면 그대로 둔다).

- `bellFire` = mix(vol 0.7 + 배음 0.4/0.2, vol 0.3) → raw 피크 1을 확실히 초과 → **파일 피크 1.0**
- `bellHit` = mix(vol 0.6 + 배음 0.3, 노이즈 0.3) → raw 피크 1을 초과 → **파일 피크 1.0**

두 파일 모두 풀스케일이다. 그런데 재생 게인이 `bellFire` = 1.0(기본값), `bellHit` = 0.45였다.

```
순간 합 = 1.00 + 0.45 = 1.45 linear  (풀스케일 대비 +3.2 dB)
```

그리고 **마스터 리미터나 헤드룸이 이 파이프라인에 전혀 없다**:

- `sfxRegistry.js:332` `setSfxVolume()` 는 **어디서도 호출되지 않는 dead code** (전체 검색으로 확인)
- `Howler.volume` 전역 설정 호출 없음 → 마스터 1.0
- `playSfx`의 `clamp(volume * tuning.volume, 0, 1)` 는 **사운드 개별 클램프**라, 서로 다른 Howl 인스턴스 두 개의 합은 못 막는다

두 레이어는 어택이 각각 0.002s / 0.001s로 t=0에 정확히 겹치고, 기음이 880Hz와 600Hz라
맥놀이 280Hz — 즉 0.36초 중첩 구간 동안 위상이 초당 280회 정렬된다. 합이 1.0을 넘는 순간이 산발이 아니라 상시다.

**이 결함은 커밋 `ad54c4f` 이전부터 있었다. 쿨다운 단축이 만든 게 아니라, 노출 빈도를 분당 13.3회 → 18.75회로 40% 올렸다.**

---

## 3. 동시 발음 수 / 채널 한계 → 벨 단독으로는 안전, 다만 벨이 가장 긴 슬롯을 점유

`sfxRegistry.js`의 게이트는 2단이다.

**(a) `COMBAT_VOICE_CAP = 6`** — `/weapons/`·`/enemies/` 경로 사운드(= `bellFire`, `bellHit` 둘 다 해당)는
활성 6개를 넘으면 `playSfx`가 조기 return하며 **버려진다**. `PROTECTED_DANGER_SFX`만 면제.

`bellFire` 0.800s는 **게임 내 상시 반복 무기음 중 최장**이다(실측 전체 목록 기준, 이보다 긴 건
starlinkFall 1.20s / bikittyCutterReload 0.95s / starlinkExplosion 0.85s 뿐이고 전부 저빈도).

| 항목 | 이전(4500ms) | 이후(3200ms) |
|---|---|---|
| `bellFire` 보이스 슬롯 점유율 | 17.8% | **25.0%** |
| 벨 전체 평균 동시 보이스 (fire+hit) | 0.258 | **0.363** |

평균 0.363 보이스는 6슬롯 캡의 약 6%다. **벨 단독으로는 캡을 위협하지 않는다.**

다만 캡은 실제로 도달한다. 후반 8무기 로드아웃 기준 평균 동시 보이스 개산:

| 무기 | 쿨다운 | fire+hit 길이 | 평균 보이스 |
|---|---|---|---|
| pencilThrow | 550 | 0.180+0.105 | 0.518 |
| schoolBag | 1300 | 0.220+0.155 | 0.288 |
| bell | 3200 | 0.800+0.360 | 0.363 |
| stunGun | 3000 | 0.300+0.180 | 0.160 |
| missile | 4000 | 0.350+0.380 | 0.183 |
| chibiko | 1100 | 0.120+0.100 | 0.200 |
| boxCutter | 3250 | 0.150+0.130 | 0.086 |
| **tumbler** | hit만, 게이트 90ms | 0.205 | **최대 2.28** |

무기 합계만 최대 약 4.1 보이스. 여기에 `zombieDeath`(게이트 50ms), `zombieGroan`, `zombieSpawn`(110ms)
같은 `/enemies/` 계열이 얹히면 밀집 구간에서 6 캡은 확실히 닿는다.
캡을 실질적으로 먹는 주범은 **tumblerHit(90ms 게이트)** 이지 벨이 아니다 — 다만 벨이 가장 긴 단일 슬롯을
가장 자주 잡게 된 것은 맞고, 이번 변경으로 그 점유가 17.8% → 25.0%로 늘었다.

> **별건 관찰(이번 범위 밖, 조치 안 함):** `tumblerHit`이 90ms 게이트로 단독 2.28 보이스까지 갈 수 있어
> 밀집 전투에서 다른 무기음을 캡으로 밀어낼 여지가 있다. 벨과 무관한 선재 이슈라 기록만 남긴다.

**(b) `POLYPHONY_COOLDOWN`** — 아래 3번 항목에서 다룬다.

---

## 4. `emitSfx` 경로의 쓰로틀·디바운스·쿨다운 게이트 → **있다. 그러나 이번 변경과 무관하게 inert**

경로: `emitSfx()` (`lib/sfxEvents.js`) → `subscribeSfx` (`components/SfxLayer.jsx`) → `playSfx()` (`lib/sfxRegistry.js`)

- `emitSfx` 자체에는 게이트가 **없다**. 순수 pub/sub이며 모든 이벤트를 그대로 흘린다.
- 게이트는 `playSfx` 안에만 있다: `COMBAT_VOICE_CAP` 검사 → `POLYPHONY_COOLDOWN` 검사.
- `POLYPHONY_COOLDOWN.bellHit = 120ms`. **3200ms는 이 게이트 근처에도 못 간다** (26배 여유).
  이 값은 원래 레이트 리미터가 아니라 *같은 프레임 중복 emit 제거용 안전망*이므로 (파일 주석에도 명시됨),
  설계대로 동작 중이고 이번 변경에 영향받지 않는다.
- `bellFire`는 `POLYPHONY_COOLDOWN`에 **항목이 아예 없다** (→ 쿨다운 0). 다른 대부분의 `*Fire` ID와 동일하며,
  3.2초 간격에서는 문제되지 않는다.

**판정: 추가 쓰로틀은 불필요하다.** 3200ms 간격에 쓰로틀을 넣으면 절대 발화하지 않는 dead code가 된다.
넣지 않는 것이 옳다.

---

## 5. `volume: 0.45`가 새 빈도에 적정한가 → **적정. 건드리면 안 된다**

프로젝트의 기존 타격음 볼륨 사다리:

```
chibikoHit 0.42 < bellHit 0.45 < boxCutterHit 0.52 < rulerHit 0.58
  < umbrellaHit 0.62 < flaskHit 0.65 < eraserHit 0.66 < missileHit 0.70 < sharkHit 0.72
```

`bellHit` 0.45는 이미 사다리 최하단 근처다. 광역기지만 데미지 10(하위권)에 맞춰 낮게 잡힌 값으로 일관적이다.
빈도가 늘었다고 여기를 더 내리면 **사다리가 깨지고**, 정작 클리핑의 주 원인인 `bellFire` 1.0은 그대로 남는다.
**볼륨을 내려야 할 쪽은 `bellHit`이 아니라 `bellFire`다.**

---

## 적용한 수정

### 수정 1 — `src/components/Weapons/Bell.jsx` (실제 조치)

`bellFire` 재생 게인을 암묵적 1.0 → 명시적 **0.55**.

```js
emitSfx({ id: 'bellFire', volume: 0.55 })
```

근거:

- `0.55 + 0.45 = 1.00` — 같은 프레임 합이 정확히 풀스케일에 닿고 넘지 않는다. 클리핑 제거.
- 벨이 3.2초마다 공용 버스에서 뺏어가던 헤드룸이 45% 줄어, 빈도 증가분(+40%)을 상쇄하고도 남는다.
- 부수 효과가 오히려 설계적으로 옳다: **헛친 펄스는 0.55 링만, 명중한 펄스는 1.00**으로 울린다.
  이전엔 허공을 쳐도 풀스케일 1.0이 나가서 명중/빗나감이 소리로 구분되지 않았다.
- `bellFire`는 0.8초 지속 톤이라, 0.18초짜리 단발 틱들과 달리 레벨을 줄여도 지속시간으로 존재감이 유지된다.
- 밸런스 값 `cooldown: 3200` 그대로. 신규 오디오 파일 없음. 기존 자산만 사용.

전 무기 `*Fire`가 볼륨 미지정(=1.0)인 관례에서 벗어나지만, **자기 타격음과 같은 프레임에 겹치는 무기는
벨 하나뿐**이므로 이 예외는 벨에만 정당하다.

### 수정 2 — `src/components/Weapons/AoeWeaponSfx.test.jsx` (선재 red 테스트 복구 + 회귀 방지)

**이 테스트는 내 수정 전부터 이미 실패 상태였다.** 커밋 `b7518b1`(미션 시스템)이 `hitCount > 0` 블록 안에
`recordMissionEvent`를 끼워 넣으면서, `if (hitCount > 0) emitSfx(...)` 인접 매칭을 요구하던 정규식이 깨졌다.
벨 사운드 회귀를 검증할 수 없는 상태였으므로 복구했다.

- 기존 케이스: 정규식을 블록 형태(`if (hitCount > 0) { ... emitSfx }`)에 맞춰 **순서만** 강제하도록 수정.
- 신규 케이스 추가: `bellFire + bellHit ≤ 1.0` 을 소스에서 파싱해 검사 — 이번 믹스 결정을 고정해
  누군가 나중에 `bellFire` 볼륨을 되돌리면 즉시 red가 되게 했다.

---

## 검증 (실제 실행함)

```
npx vitest run src/components/Weapons/AoeWeaponSfx.test.jsx \
               src/lib/sfxRegistry.test.js \
               src/components/Weapons/WeaponHitSfx.test.jsx
→ Test Files  3 passed (3) / Tests  39 passed (39)

npx vitest run src/components/Weapons/Bell.test.js \
               src/lib/bell.test.js \
               src/components/HUD.test.jsx
→ Test Files  3 passed (3) / Tests  42 passed (42)
```

수정 전 baseline: `AoeWeaponSfx.test.jsx` **1 failed** (위 서술한 선재 결함).

### 음원 실측 길이 (Ogg Vorbis granulepos ÷ 44100, 직접 계산)

| 파일 | 길이 | 비고 |
|---|---|---|
| `bellFire.ogg` | **0.800s** | 상시 반복 무기음 중 최장 |
| `bellHit.ogg` | 0.360s | |
| `pencilFire.ogg` | 0.180s | 최단빈도 비교군 |
| `missileHit.ogg` | 0.380s | |
| `tumblerHit.ogg` | 0.205s | 90ms 게이트 |

파일 용량 변화 없음 (수정은 재생 게인만, 자산 무변경):
`bellFire.ogg` 7,293B / `bellFire.mp3` 4,181B / `bellHit.ogg` 7,037B / `bellHit.mp3` 4,225B.

## 라이선스

변경 없음. `bellFire`/`bellHit` 모두 `scripts/generate_sfx.mjs`로 프로젝트가 직접 합성한 자산이며,
외부 음원 도입·복제 없음. 출시 후보 조건(직접 합성) 충족.

## 제약 준수

- `Enemies.jsx` / `Enemy.jsx` / `stageConfig.js` / `burstEvents.test.js` — **열지도 수정하지도 않음**
- `weaponCatalog.js` `bell.base.cooldown: 3200` — **무변경**
- `git checkout` / `git stash` / `git reset --hard` — **미실행**
- 커밋 — **안 함.** Advisor 검토 대기
- 신규 오디오 파일 — **없음**

## 변경 파일

- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/src/components/Weapons/Bell.jsx`
- `D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/r3f_prototype/src/components/Weapons/AoeWeaponSfx.test.jsx`

## 남은 권고 (이번에 조치 안 함)

1. **마스터 리미터/헤드룸 부재** — `setSfxVolume()`은 dead code고 `Howler.volume`도 미설정이라
   전체 믹스가 마스터 1.0에 무방비다. 벨은 막았지만 6보이스가 동시에 터지는 구간의 합산 클리핑은 남아 있다.
   `Howler.volume(0.8)` 정도의 전역 헤드룸 확보를 별건으로 검토 권고.
2. **`tumblerHit` 90ms 게이트** — 단독 최대 2.28 보이스로 6캡의 38%를 먹는다. 밀집 전투에서 다른 무기음
   드롭의 주 원인일 가능성. 벨과 무관한 선재 이슈.
