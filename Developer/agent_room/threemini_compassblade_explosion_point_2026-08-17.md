# 오리요강(compassBlade) 폭발 지점·크기 검수 — threemini, 2026-08-17

브랜치 `zombie_only` / 워크트리 `school_survivor-integration` / 앱 루트 `Developer/r3f_prototype`.

**검증 근거의 성격**: 아래 판정은 전부 **코드·수치 분석과 Vitest 실행 결과** 기준이다.
브라우저에서 실제 폭발 렌더링을 눈으로 본 검증은 **하지 않았다**. 화면 실측이 필요한 항목은
그렇게 표시했다.

---

## 0. 전제 — 1 좀비미터(1 좀비타일)는 월드 유닛으로 얼마인가

| 근거 | 값 |
|---|---|
| 정본 상수 `src/lib/gameplayUnits.js:3` `ZOMBIE_METER_WORLD_UNITS` | **0.75 world units** |
| 같은 파일 주석 | "E01's 2026-07-26 ground collider footprint (~0.7467) is rounded to 1zm=0.75" |

코드에서 독립적으로 재유도(읽기 전용 확인, 수정 없음):

- `src/components/Enemy.jsx:81` `ENEMY_SIZE_MULTIPLIER = 4 / 3`
- E01 접촉 거리 0.28 (`src/lib/enemySimulation.js:56` `ENEMY_RUNTIME_CONTACT_DIST[E01] = 0.28`,
  `src/components/Enemies.jsx:164`가 `0.28 × scale × ENEMY_SIZE_MULTIPLIER`로 사용)
- → 좀비 접촉 반경 = 0.28 × 4/3 = **0.37333** → 지름 **0.74667** → 반올림 **0.75 = 1zm**
- `src/lib/pickup.js:9`도 같은 값을 명시한다("E01 접촉 판정 0.373").

참고로 물리 박스 콜라이더(`Enemy.jsx:82` `BASE_COL = [0.14, 0.26, 0.10]`, cs = 4/3)는
half-extent [0.1867, 0.3467, 0.1333] → 가로 0.373 × 세로 0.267, 높이 0.693, 중심 y = 0.24 × 4/3 = **0.32**.
박스 폭(0.373)은 접촉 원 지름(0.747)보다 좁지만, **프로젝트가 잠근 정본 단위는 접촉 footprint 기반
0.75**(`gameplayUnits.js`는 "fixed design values, not live model measurements"라고 못박는다)이므로
타일 크기는 0.75로 확정했다.

**1 좀비타일 = 1zm = 0.75 world units.**

---

## 항목 1. 폭발 좌표 — **FAIL → 수정함**

### 결함

`CompassBlade.jsx` 구 373~379행이 폭심을 **맞은 좀비의 위치**(`rb.translation()`)로 넘겼다.

```js
const t = rb.translation()
...
explode({ x: t.x, z: t.z, ... })
```

### 판정 근거 — 요강 위치가 맞다

1. **터지는 주체가 요강이다.** 폭발 후 `getCompassBladeRespawnUntilMs`로 5초간 요강이 사라진다.
   사라지는 것은 좀비가 아니라 요강이다. 즉 이 연출은 "요강이 터져 부서졌다"이지
   "좀비가 폭발했다"가 아니다.
2. **비주얼이 요강에서 나와야 인과가 읽힌다.** 플레이어가 보는 것은 궤도를 도는 요강이고,
   폭발이 좀비 몸에서 나면 무기와 폭발이 시각적으로 분리된다.
3. **정본 포즈가 이미 있다.** `getCompassBladeOrbitPose`가 요강 좌표를 만들고
   `orbitXRef`/`orbitZRef`에 프레임마다 저장돼 있다.

어긋남의 크기는 브리핑에 적힌 궤도 반경 1.15가 아니라 **최대 `hitRadius` = 0.46 world units**
(= 0.61 좀비타일)이다. 스캔이 요강 중심 0.46 안의 좀비만 잡으므로 그 이상 벌어질 수 없다.
그래도 새 폭발 반경 1.0607 기준 **57%**에 해당하는 편차이고, 방향이 매 타격마다 달라져
"폭발이 어디서 날지 모른다"는 인상을 준다.

### 수정

폭심을 **그 좀비를 때린 요강**의 좌표로 바꿨다. 스택 카운터가 요강별이 아니라 전역이라
"어느 요강이 터졌는가"가 코드상 미정이므로, 좀비에게 **가장 가까운 요강**으로 확정한다.

이 결정이 항상 유일한 정답인 근거: 요강 간 거리는
`2 × radius × sin(π/count)` = count 2에서 **2.30**, count 3에서 **1.992** world units다.
두 값 모두 `2 × hitRadius = 0.92`보다 훨씬 크므로, 스캔에 걸린 좀비 근처 0.46 안에 들어오는
요강은 **언제나 정확히 하나**다. 모호성이 없다.

---

## 항목 2. y좌표 — **PASS (주의 1건)**

| 대상 | y (world) | 출처 |
|---|---|---|
| 폭발 비주얼 그룹 | **0.14** 고정 | `CompassBlade.jsx` `<group ... position={[x, 0.14, z]}>` |
| 요강(궤도) | player.y + 0.16 ≈ **0.48** | `getCompassBladeOrbitPose`, playerPos.y ≈ 0.32 (`Player.jsx:127`, Bang_Rules §2) |
| E01 몸통 | 중심 **0.32**, 범위 약 **-0.03 ~ 0.667** | `BASE_COL[1] 0.26 × 4/3`, 중심 `0.24 × 4/3` |
| 폭발 버스트 구 중심 | 0.14 + 0.16 × 그룹스케일 ≈ **0.24** | 로컬 y 0.16 × G(1)=0.627 |

- **피해에는 y가 전혀 없다.** `applyRadialDamage` → `scanRadiusEnemiesInto`는 x/z만 비교한다.
  따라서 `explode`에 y를 넘기지 않는 것은 결함이 아니다. 시각 문제일 뿐이다.
- 폭발 링 3장은 전부 `rotation={[-Math.PI/2, 0, 0]}`인 **바닥 평면 충격파**다. 이는 프로젝트
  관행과 일치한다(EraserBomb `DustExplosion`은 y = 0.08).
- 버스트 구 중심 0.24는 E01 몸통 범위(-0.03~0.667) 안, 중심 0.32 바로 아래다. 몸통 높이와 맞는다.
- **주의**: 요강(0.48)과 충격파 평면(0.14)의 간격 0.34는 새 폭발 반경 1.0607보다 훨씬 작아
  같은 사건으로 읽힐 것으로 판단하지만, 이 "읽힘"은 **화면 실측으로 확인하지 않았다**.

---

## 항목 3. 피해 반경 = 9 좀비타일 (사용자 확정 사양) — **FAIL → 수정함**

### 확정 사양

> 폭발 지점으로부터 위·아래·좌우·대각선까지 각각 1좀비미터의 반경, 즉 **3×3 = 9 좀비타일**.

### 원(피해 판정)과 사각(타일 언어)의 불일치 — 판정

피해 판정은 `applyRadialDamage` → `scanRadiusEnemiesInto`이고, 비교식은
`(적 중심 - 폭심)² ≤ radius²` — **적의 중심점 하나**를 원으로 잰다(적의 부피는 안 본다).
따라서 "9칸을 덮는다"의 옳은 코드적 정의는 **9칸 어디에 서 있는 좀비든 그 중심이 원 안에 든다**이다.

| 후보 | world units | 판정 |
|---|---|---|
| 1 타일 = 1zm | 0.750 | **탈락**. 대각선 이웃 중심까지 √2 zm = 1.0607이라 안 닿는다. 사용자가 명시한 "대각선까지"를 정면 위반. |
| **√2 타일** | **1.06066** | **채택**. 8방향 이웃 타일 중심을 전부 포함. 2칸째(1.5)는 제외되어 9칸을 넘지도 않는다. |
| 1.5√2 타일 (3×3 정사각형 완전 포함) | 1.591 | 탈락. 상하좌우로 2.12타일까지 뻗어 두 번째 링을 침범 — 9칸보다 명백히 넘친다. |

→ **√2 zm = 1.0606601717798214 world units** 채택. Advisor 권고와 같은 결론이며,
근거는 "판정이 적 중심점 기준 원"이라는 코드 사실이다.

### 이전 값이 왜 결함이었나

- 이전 `COMPASS_BLADE_ONE_TILE_RADIUS = 0.5`는 **1 타일(0.75)에도 못 미친다**. 0.667 zm다.
- 바로 위 주석은 이미 "the player's current full visual footprint **plus its 8 neighboring
  directions**" — 3×3을 서술하고 있었다. **주석과 값이 처음부터 어긋나 있었다.**
- 타격 스캔 반경 0.46과 거의 같아, 실제로는 **맞은 좀비 한 마리만** 덮는 폭발이었다.
- 게다가 기존 테스트는 `expect(result.explosionRadius).toBe(COMPASS_BLADE_ONE_TILE_RADIUS)`처럼
  **상수를 상수 자신과 비교**하는 자기참조 단언이라, 이 불일치를 구조적으로 절대 잡을 수 없었다.

### 밸런스 영향 (levelmini/balanceqa 확인 필요)

반경 0.5 → 1.06066 = **×2.121**, 피해 면적 0.785 → 3.534 = **×4.50**.
`COMPASS_BLADE_EXPLOSION_DAMAGE = 30`, `base.damage 7`, `hitsPerSecond 2.0`은 **건드리지 않았다**.
군집 상황에서 폭발 1회가 때리는 마릿수가 크게 늘어난다 — 화력 재조정은 levelmini 몫이다.

---

## 항목 3-B. 시각 크기와 피해 반경 일치 — **FAIL → 수정함**

### 환산 (지오메트리 인자를 실제로 읽어 계산)

폭발의 시각적 가장자리는 바깥 링이다.
`<ringGeometry args={[0.48, 0.72, 64]} />` → 로컬 바깥 반경 **0.72**,
자체 스케일 `outerRingRef.scale.setScalar(0.95 + t * 1.4)` → t=1에서 **2.35**.
따라서 **월드 반경 R(t) = 0.72 × (0.95 + 1.4t) × G(t)** (G = 그룹 스케일).

**수정 전** `G(t) = 0.24 + radius × 2.9 × t`, 피해 반경 0.5 기준:

| t | 그룹 G | 링 월드 반경 | 링 불투명도 | 피해 반경(0.5) 대비 |
|---:|---:|---:|---:|---:|
| 0.25 | 0.603 | **0.564** | 0.54 | 1.13× |
| 0.50 | 0.965 | **1.147** | 0.36 | 2.29× |
| 0.75 | 1.328 | **1.912** | 0.18 | 3.82× |
| 1.00 | 1.690 | **2.859** | 0.00 | **5.72×** (면적 32.7×) |

t ≈ 0.22 이후 **보이는 링이 계속 피해 원 바깥**에 있었다. 즉 "분명 폭발에 닿았는데 안 죽는다"가
수치로 확인된다. 참고로 텀블러/기타 무기와 달리 이 폭발은 궤도 반경(1.15)보다도 크게 부풀어,
요강 궤도 전체를 덮는 것처럼 보였다.

추가 결함: `G(t)`의 상수항 0.24는 radius에 비례하지 않는다. 그래서
`permanentExplosionRadiusMultiplier = 1.1`(Lv.10 영구강화)이 붙으면 피해 반경은 정확히 +10%지만
G(1)은 1.690 → 1.835로 **+8.6%**만 커진다. **피해와 시각이 서로 다른 비율로 자란다.**

**수정 후** — `getCompassBladeExplosionVisualScale(radius, t) = (radius / 1.692) × (0.34 + 0.66t)`
(`1.692 = 0.72 × 2.35 = COMPASS_BLADE_EXPLOSION_EDGE_LOCAL_RADIUS`):

| t | 링 월드 반경 | 피해 반경 대비 |
|---:|---:|---:|
| 0.25 | 0.2795 × radius | 0.28× |
| 0.50 | 0.4700 × radius | 0.47× |
| 0.75 | 0.7327 × radius | 0.73× |
| 1.00 | **1.0000 × radius** | **1.00×** |

- **완전 확산 시점의 링이 정확히 피해 경계**다. 확산 도중에는 항상 피해 원 안쪽이므로
  "보이는데 안 죽는다"가 발생하지 않는다.
- radius에 **완전 선형**이라 영구강화 ×1.1에서 피해·시각이 같은 비율로 커진다.
- 나머지 레이어는 전부 링 안쪽이다(t=1 기준, 피해 반경 대비):
  flash 0.5×1.35 = 0.399×, 안쪽 링 0.5×1.62 = 0.479×, 버스트 구 0.22×2.0 = 0.260×,
  스파크 최대 ≈0.91 로컬 = 0.538×.
- 확산이 끝나는 t=1은 불투명도가 0이 되는 시점이기도 하다. 이는 EraserBomb
  (`getEraserExplosionVisualScale`, 불투명도 `0.5 × (1 - t)`)와 동일한 구조로,
  프로젝트의 기존 충격파 문법을 따랐다.
- **참고(다른 무기와의 관행 차이)**: EraserBomb는 `scaleEffectVisual`(= ×1/2)을 곱해
  **일부러 피해 반경의 절반 크기**로 그린다("oversized attack graphics" 축소 정책).
  이번 지시는 오리요강에 대해 "시각 = 피해"를 명시했으므로 그 값을 따랐고, EraserBomb는
  **건드리지 않았다**. 무기 간 관행을 통일할지는 balanceqa/uimini 판단 사항으로 남긴다.
- 시각 크기 축소 효과: 같은 무기의 폭발 그룹 스케일이 G(1) 1.690 → 0.627로 줄어든다.
  실제 화면에서 폭발이 "충분히 크게" 읽히는지는 **브라우저 실측으로 확인하지 않았다.**
  링 월드 지름은 2.12 units = 2.83 좀비타일 = 좀비 약 2.8마리 폭이다.

---

## 항목 4. 폭발 타이밍과 리스폰 — **PASS (주의 3건)**

- **5타째 즉시 폭발**: `resolveCompassBladeHitStack`가 `nextStack === 5`에서 `exploded: true`,
  스택 0 리셋. 같은 프레임에 `explode()` 호출. **PASS**.
- **평타와 폭발의 이중 계상**: 5타째 프레임에서 `applyEnemyHit(rb, gen, w.damage=7)`가 먼저 들어가고
  이어서 폭발 30이 같은 좀비를 덮는다 → 트리거 좀비는 **37**. **의도로 판정한다.**
  근거: 스택은 "타격이 성공했을 때만" 오르므로(`applyEnemyHit` 실패 시 `continue`) 5번째 타격은
  실재하는 타격이고, 그 타격이 요강을 터뜨리는 구조다. 폭발 쪽은 `canCrit: false`,
  `damageType: 'explosive'`로 평타와 분리 집계되어 중복 크리티컬도 없다.
- **프레임당 1회 보장**: 루프 조건 `targetIndex < targetCount && !exploded` + `exploded = true`.
  한 프레임에 두 번 터지지 않는다. **PASS**.
- 주의(a): 폭발한 프레임에는 요강 3D 모델이 **아직 보인다**. 숨김은 다음 프레임의
  `respawnUntilRef.current > nowMs` 조기 반환에서 일어난다. 최대 1프레임(≈16ms) 늦다.
  실사용상 무시 가능하다고 판단해 수정하지 않았다.
- 주의(b): 리스폰 창 동안 `count`개 요강이 **전부** `visible = false`가 되고 타격 스캔 자체를
  건너뛴다. 창이 끝나면 `lastHit` 기록을 전부 초기화한다. 로직 자체는 일관적이다. **PASS**.
- 주의(c) — **CONCERN, 미수정**: `nowMs = clock.elapsedTime × 1000`은 r3f `THREE.Clock`의
  벽시계다. `usePlayingFrame`은 콜백만 게이트할 뿐 clock을 멈추지 않으므로,
  일시정지·레벨업 카드 선택 중에도 5초 리스폰 창이 흘러간다(레벨업 창을 5초 이상 열어두면
  요강이 즉시 돌아온다). 타격 간격 `interval`도 같은 성질이다.
  이는 이 파일 고유 결함이 아니라 프레임 타이밍 관행 문제라 이번 범위에서 고치지 않았다
  (텀블러 등 다른 궤도 무기는 다른 에이전트 작업 중이라 손대지 않음).

---

## 항목 5. 다중 요강 (count 최대 3) — **CONCERN (일부 수정)**

- `hitStackRef`는 요강별이 아니라 **전역 카운터 1개**다. 요강 3개면 세 개가 하나의 충전량을 공유한다.
- **수정 전**: 폭발이 좀비 위치에서 났으므로 어느 요강과도 좌표 관계가 없었다. 3개일 때
  "누가 터진 건지" 화면상 판별 불가.
- **수정 후**: 항목 1의 최근접 요강 확정으로 **타격한 그 요강 위치**에서 터진다.
  요강 간 거리(count 3에서 1.992, count 2에서 2.30)가 `2 × hitRadius = 0.92`를 크게 넘으므로
  최근접 판별은 항상 유일하고 정확하다.
- **남은 CONCERN(미수정)**: 하나가 터졌는데 **3개 전부** 5초간 사라진다
  (`respawnUntilRef` 조기 반환이 모든 요강을 숨긴다). 전역 스택과는 일관되지만
  "요강 3개 = 폭발 3발"을 기대한 플레이어에겐 어긋난다. 이는 무기 정체성·화력에 직결되는
  **설계/밸런스 결정**이라 그래픽 검수 범위에서 임의 변경하지 않았다.
  → **levelmini 판단 필요**: (a) 현행 유지(공유 충전, 전원 리스폰) vs
  (b) 요강별 스택·요강별 리스폰.

---

## 변경 파일 (커밋하지 않음 — Advisor 승인 대기)

- `Developer/r3f_prototype/src/lib/compassBlade.js`
  - `COMPASS_BLADE_ONE_TILE_RADIUS = 0.5` → `COMPASS_BLADE_EXPLOSION_RADIUS = Math.SQRT2 × ZOMBIE_METER_WORLD_UNITS` (1.06066)
    ※ 상수를 하드코딩하지 않고 정본 zm에서 유도한다.
  - `COMPASS_BLADE_EXPLOSION_EDGE_LOCAL_RADIUS`, `getCompassBladeExplosionVisualScale()` 신설
- `Developer/r3f_prototype/src/components/Weapons/CompassBlade.jsx`
  - 폭심 = 최근접 요강 좌표
  - 폭발 그룹 스케일 = `getCompassBladeExplosionVisualScale(radius, t)`
- `Developer/r3f_prototype/src/components/Weapons/CompassBlade.test.jsx` — 회귀 가드 4종 추가

`Enemies.jsx`, `Enemy.jsx`, `stageConfig.js`, `burstEvents.test.js`, `Tumbler.jsx`,
`lib/playerDpsEstimate.js`는 **읽기만 하고 수정하지 않았다.**
`base.damage`, `hitsPerSecond`, `COMPASS_BLADE_EXPLOSION_DAMAGE`도 **변경 없음**.
`git checkout` / `git stash` / `git reset --hard` **미사용**, 커밋 **미수행**.

### 부수 처리 — 줄바꿈 오염 복구

편집 도구가 파일 전체 줄바꿈을 재작성해 `git diff`에 무관한 190여 줄이 잡혔다.
HEAD blob의 원본 줄바꿈 구성(이 저장소는 파일마다 LF/CRLF가 섞여 있다)을 기준으로
**변경하지 않은 줄의 종결자를 원본 그대로 복원**했고, 최종 diff는
`115 insertions(+), 10 deletions(-)` — 실제 변경분만 남았다. 복구에 쓴 임시 스크립트는 삭제했고
`git status`에 잔여물이 없음을 확인했다.

---

## 테스트 — 변경 전후 대조

| 시점 | 명령 | 결과 |
|---|---|---|
| 수정 후 · 테스트 갱신 전 | `npx vitest run src/components/Weapons/CompassBlade.test.jsx` | **3 failed / 6 passed** (구 상수명 참조 3건이 RED) |
| 수정 후 · 테스트 갱신 후 | `npx vitest run src/components/Weapons/CompassBlade.test.jsx src/lib/gameplayUnits.test.js src/lib/weaponPermanentUpgrades.test.js src/lib/weaponCatalog.test.js src/lib/upgrades.test.js` | **107 passed / 107** |
| 줄바꿈 복구 후 재실행 | 위와 동일 | **107 passed / 107** |
| 무기 전체 | `npx vitest run src/components/Weapons` | 19 files passed / **1 file failed** |

**정직한 한계 표기**: 변경 전(구 코드) 기준으로 새 회귀 테스트를 돌린 RED 기록은 **없다**.
구 테스트가 `explosionRadius`를 상수 자신과 비교하는 자기참조 단언이어서, 구 코드에서는
9타일·시각일치 위반을 잡아낼 수 있는 테스트가 애초에 존재하지 않았다. 위 표 1행은
"상수를 바꾸자 옛 단언이 깨졌다"는 기록이지 사양 위반 RED가 아니다. 사양 위반은
본문 표의 **수치 계산**으로 입증했다.

`src/components/Weapons` 전체 실행에서 실패한 1건은 `Hanako.test.jsx`
(`expect(source).toContain('computeHanakoHealAmount(maxHp)')` — 실제 소스는
`computeHanakoHealAmount(player.maxHp)`). **이번 작업과 무관한 기존 실패**다.
근거: `Hanako.jsx` / `Hanako.test.jsx`는 `git status`에서 미변경이고, compassBlade 모듈을
import하지 않는다.

### 추가된 회귀 가드 (`CompassBlade.test.jsx`)

1. `covers all nine zombie tiles around the blast, derived from the zombie meter`
   — 타일 크기를 하드코딩하지 않고 `ZOMBIE_METER_WORLD_UNITS`에서 유도해 3×3 아홉 칸 중심이
   전부 반경 안임을 단언하고, 2칸째는 밖임을 단언한다. **zm가 바뀌면 같이 따라간다.**
2. `expands the explosion visual to exactly the damage radius, permanent multiplier included`
   — 기본 반경과 ×1.1 반경 둘 다에서 `그룹스케일 × 링 로컬 반경 == 피해 반경`.
3. `keeps the explosion mesh geometry the visual-scale helper was derived from`
   — 헬퍼가 전제한 `ringGeometry args={[0.48, 0.72, 64]}`와 `0.95 + t * 1.4`가 JSX에 그대로
   있는지 소스 검사(이 둘이 바뀌면 헬퍼 상수가 거짓이 되므로 반드시 같이 깨져야 한다).
4. `detonates at the orbiting potty that landed the hit, not at the enemy body`
   — 폭심이 `orbitXRef`/`orbitZRef`에서 오고 좀비 좌표로 회귀하지 않았는지 소스 검사.

---

## 판정 요약

| # | 항목 | 판정 |
|---|---|---|
| 1 | 폭발 좌표 (요강 vs 좀비) | **FAIL → 수정 완료** |
| 2 | y좌표 | **PASS** (지면 충격파 관행 일치, 피해는 XZ 전용. 화면 실측 미수행) |
| 3 | 피해 반경 = 9 좀비타일 | **FAIL → 수정 완료** (0.5 → √2 zm = 1.06066) |
| 3-B | 시각 크기 = 피해 반경 | **FAIL → 수정 완료** (최대 5.72× 과대 → 1.00×, 영구강화 비례 포함) |
| 4 | 폭발 타이밍·리스폰 | **PASS** (평타+폭발 동시 적용은 의도로 판정 / 벽시계 타이머는 CONCERN, 미수정) |
| 5 | 다중 요강 | **CONCERN** (폭심은 수정 완료 / 전역 스택·전원 5초 리스폰은 levelmini 결정 대기) |

### Advisor에게 넘기는 판단 사항

1. 폭발 면적 ×4.5 증가에 따른 오리요강 화력 재조정 — levelmini/balanceqa.
2. 요강 3개일 때 전역 스택·전원 리스폰 유지 여부 — levelmini.
3. 폭발 이펙트 크기 관행 통일(EraserBomb는 의도적으로 피해 반경의 1/2로 그림) — balanceqa/uimini.
4. 실제 브라우저에서의 폭발 렌더링 육안 확인 — 이번 작업에서 미수행.
