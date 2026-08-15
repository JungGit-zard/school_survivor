# 좀비 이동속도 +10% & 스테이지1·2 스폰 마릿수 +10%/종류 랜덤화 (2026-08-13)

담당: levelmini / 브랜치 `zombie_only` / 기준 커밋 `b81ebfa`
지시(원문): "폰에서 게임이 템포가 느린 느낌나고, 기본 좀비는 이속이 너무 느려, 스테이지 1.2 좀비 스폰
마릿수 종류 랜덤으로 10프로 더 늘리고 이동속도 전체다 10프로 올려, 이동속도는 모든좀비 다"

커밋하지 않았다. 검증 후 상위 세션이 직접 커밋한다.

---

## 0. 착수 전 발견 — 웨이브 타임라인은 런타임에서 죽어 있다 (가장 중요)

`Enemies.jsx` 프레임 루프(1580행 부근) 주석이 정본이다:

> 모든 일반 좀비와 보스는 명시 BURST_EVENTS/STAGE2/3/4_BURST_EVENTS에서만 발화한다.
> 20~40초 랜덤 웨이브, 중간 보강, 보스 호위 자동 웨이브는 런타임에서 발화하지 않는다.

즉 `waveTimelines.js`의 `WAVE_PHASES`/`STAGE2_WAVE_PHASES`, `waveSizeForStageAtTime`,
`STAGE1_SPAWN_MULTIPLIER`(1.15), `STAGE2_SPAWN_MULTIPLIER`(1.5)는 **실제 게임 스폰에 영향을 주지 않는다**.
이들을 소비하는 곳은 `stageBalanceProbe.js` / `gameplaySoak.js` / 어드민 웨이브 프리뷰뿐이다.

따라서 "스폰 마릿수 +10%"는 `src/lib/burstEvents.js`에서만 유효하다. 웨이브 쪽 배율을 올렸다면
플레이어에겐 아무 변화가 없고 프로브 숫자만 바뀌었을 것이다. 웨이브 계열은 **손대지 않았다**.

부수 효과 차단: `STAGE1_SPAWN_MULTIPLIER`를 올리면 `_jarmobHpAnchor`(= stage1 웨이브 base)가 올라
`STAGE_JARMOB_TOTAL_HP_FACTOR` 기준이 통째로 밀려 **스테이지3·4 목표 총 HP까지 +10% 끌려간다**.
"스3·스4는 건드리지 마라" 제약 때문에도 웨이브 배율은 건드리면 안 되는 값이었다.

---

## 1. 이동속도 ×1.1 — 전 타입 예외 없음

### 반올림 규칙
**곱한 뒤 반올림하지 않는다.** 기존 값이 전부 소수 3자리 이하라 ×1.1이 소수 4자리에서 딱 떨어진다.
임의 반올림은 parity 테스트가 강제하는 불변식 `E07.speed === E01.speed × 2`를 깨뜨린다
(0.475×1.1 = 0.5225, 0.95×1.1 = 1.045, 0.5225×2 = 1.045 — 배정도에서 정확히 성립).

### 변경 전/후 (`ENEMY_STATS` @ `src/components/Enemy.jsx` + `ENEMY_RUNTIME_SPEED` @ `src/lib/enemySimulation.js`)

| 타입 | 역할 | 전 | 후 |
|---|---|---:|---:|
| E01 | 녹색 잡몹(기본 좀비) | 0.475 | **0.5225** |
| E02 | 보라 탱커 | 0.385 | **0.4235** |
| E03 | 녹색 러너 | 1.1 | **1.21** |
| E04 | 원거리 | 0.45 | **0.495** |
| E05 | 차저 | 0.5 | **0.55** |
| E06 | 거대 | 0.6 | **0.66** |
| E07 | 웃는얼굴(E01 ×2) | 0.95 | **1.045** |
| RZL | 런크루 리더 | 2.45 | **2.695** |
| RZC | 런크루 | 2.18 | **2.398** |
| RZT | 스2 도주 좀비 | 1.275 | **1.4025** |
| RZG | 스2 경비 | 1.225 | **1.3475** |
| B01~B04 | 보스 4종 | 0.475 | **0.5225** |

### 두 벌 동기화 (parity 함정)
`ENEMY_STATS`(게임 드랍 경로)와 `ENEMY_RUNTIME_SPEED`(Float32Array, 풀 시뮬레이션·프로브)는 같은 수치의
복사본 두 벌이고 `enemySimulation.parity.test.js`가 이를 강제한다. 양쪽 다 갱신했다.

추가로 **`E04_RUNTIME_SPEED` 상수(enemySimulation.js:14)도 0.45→0.495로 올렸다.** E04의 원거리 기동
(`resolveRangedEnemyVelocityRaw`, 274~282행)은 `ENEMY_RUNTIME_SPEED[4]`가 아니라 이 별도 상수를 읽는다.
이걸 빼먹으면 E04만 옛 속도로 남는다 — parity 테스트가 못 잡는 사각지대라 코드에 주석으로 못박아 뒀다.

### 대상에서 뺀 것 (의도)
- `chargeSpeed`(E05 1.7 / 보스 1.4): 이동속도가 아니라 텔레그래프 딸린 돌진 스킬 파라미터.
  게다가 시뮬레이션(enemySimulation.js:632)에 리터럴 `1.7`이 하드코딩돼 있어 한쪽만 올리면 갈라진다.
- `rangedSpeed`(투사체 속도): 좀비 이동이 아님.
- 마틸다: `chargeSpeed: player.speed * 2.8`로 **플레이어 속도에 종속**이라 이미 상대적으로 자동 스케일된다.
  즉사 추격자라 절대속도를 올리면 회피 불가 절벽이 된다. 손대지 않았다.

---

## 2. 스테이지1·2 스폰 마릿수 +10% & 종류 랜덤

### 반올림 규칙
`newCount = Math.round(count × 1.1)`. 1~4마리짜리 "첫 등장 신호" 이벤트는 반올림으로 값이 유지되어
도입 사슬(스1 E02@60 · E03@72 · E05@120 · E06@168 / 스2 E03@24 · E02@48 · E04@72 · E05@120 · E06@168)이
그대로 보존된다. 큰 배치가 총량을 지배하므로 전체는 +10%대에 안착한다.

### 스폰 총량 집계 (보스·경비추격 크루 제외, 실측)

`node`로 `burstEvents.js`를 직접 로드해 집계. HEAD 블롭과 작업본을 각각 로드해 비교했다.

| 스테이지 | 전 | 후 | 증감 |
|---|---:|---:|---|
| stage1 | **90** | **100** | **+11.1%** |
| stage2 | **177** | **196** | **+10.7%** |
| stage3 | 48 | 48 | 0 (불변) |
| stage4 | 38 | 38 | 0 (불변) |

타입별 (전 → 후):

- stage1: E01 49→57, E07 16→18, E02 11→11, E03 2→2, E05 11→11, E06 1→1
- stage2: E01 76→85, E03 24→27, E02 45→50, E04 2→2, E05 11→11, E06 1→1, E07 18→20
- stage3/4: 완전 동일

### 개별 이벤트 변경 (`src/lib/burstEvents.js`)

stage1 `BURST_EVENTS`:

| sec | 타입 | 전 | 후 | 비고 |
|---:|---|---:|---:|---|
| 0 | E01 | 16 | 18 | |
| 24 | E01 | 8 | 9 | |
| 40 | E01 | 5 | 6 | `STAGE1_40SEC_*` 배열 |
| 40 | E07 | 3 | 3 | round(3.3)=3 |
| 60 | E01 | 5 | 6 | |
| 60 | E07 | 5 | 6 | |
| 108 | E01 | 5 | 6 | + mixedTypes |
| 150 | E07 | 5 | 6 | `STAGE1_150SEC_*` 배열 |
| 150 | E01 | 5 | 6 | + mixedTypes |
| 184 | E01 | 5 | 6 | + mixedTypes |

stage2 `STAGE2_BURST_EVENTS`:

| sec | 타입 | 전 | 후 | 비고 |
|---:|---|---:|---:|---|
| 5 | E01 | 15 | 17 | |
| 30 | E01 (swarm) | 6 | 7 | |
| 30 | E01 | 20 | 22 | + mixedTypes |
| 60 | E03 (ring) | 5 | 6 | |
| 60 | E07 | 5 | 6 | |
| 82 | E07 | 10 | 11 | |
| 90 | E01 | 20 | 22 | + mixedTypes |
| 120/150/180/210 | mixed reinforcement | 15 | 17 | 각 4건 |
| 132 | E02 (pincer) | 6 | 7 | |

**손대지 않은 것:** `ALL_STAGES_110SEC_SMILING_TANKER_REINFORCEMENT_EVENTS`(E07 3 + E02 3 @110s).
이 배열은 스3·스4에도 spread되므로 건드리면 "스3·4 불변" 제약이 깨진다.
round(3×1.1)=3이라 어차피 값이 안 바뀌는 이벤트였다.
보스 이벤트(B01/B02)와 경비추격 크루(`RZT count 7`)도 제외 — 크루 인원은 `evt.count`가 아니라
`STAGE2_GUARD_CHASE_SIZE`가 정하므로 count를 바꿔도 실스폰이 안 변한다.

### 종류 랜덤화 — `mixedTypes`

기존 메커니즘 재사용: `pickMixedReinforcementTypes(evt.mixedTypes, count, Math.random)`
(Enemies.jsx:272, 소비는 1441행 `SCHEDULE_BURST` 핸들러). 새 배선 없음.

순수 E01 대물량 러시 5건에만 `LIGHT_MOB_MIX = ['E01','E03']`을 달았다
(스1 108/150/184, 스2 30/90). 매 판 E01/E03 비율이 달라진다.

**풀을 경량대(E01 8hp · E03 10hp)로 제한한 이유:** `pickMixedReinforcementTypes`는 풀의 각 타입을
1마리씩 **보장 배치**한 뒤 균등 랜덤으로 채운다. 풀에 E02(70hp)·E05(70hp)·E06(320hp)을 넣으면
"랜덤"이 아니라 **확정 난이도 상승**이 된다 — 예: count 6 / 풀 `[E01,E02,E03]`이면 기대 HP가
48 → 176(3.7배)로 뛴다. 이번 지시의 목적은 템포 개선이지 난이도 상승이 아니라 배제했다.

**스테이지1 로스터 제약 유지 확인** (추격/돌진형만, E04 금지 —
Bang_Rules 2026-05-09 부록 / stage1_replan §3-2, `waveTimelines.js:37` 주석):
어떤 `mixedTypes`에도 E04가 없고, 새 타입을 도입하지도 않았다. 실측 타입 집합도 변경 전후 동일
(스1 = {E01,E02,E03,E05,E06,E07}). 도입 시각 사슬도 전부 보존.

**알려진 제약(기존 버그, 이번 범위 밖):** `pickMixedReinforcementTypes`의 필터는 `/^E0[1-6]$/`라
**E07은 mixedTypes 풀에 넣어도 조용히 탈락한다.** 그래서 E07 배치는 랜덤화 대상에서 뺐다.

---

## 3. HP 정규화에 미친 영향 (balanceqa 확인 요망)

버스트 count 변경은 `stageBurstJarmobBaseHp`를 통해 stage2의 √c 배율에 되먹임된다.
stage1은 앵커라 배율이 없고, stage1 앵커(`stageExpectedBaseJarmobHp('stage1')` = 웨이브 base 4379.8)는
버스트를 포함하지 않으므로 **stage3/4의 배율은 수학적으로 불변**이다.

측정값(임시 프로브로 실측, 프로브 파일은 측정 후 삭제):

| 스테이지 | m (잡몹 HP·밀도 배율) 전 | 후 | 버스트 잡몹 base HP 전 | 후 | 기대 총 HP 전 | 후 |
|---|---:|---:|---:|---:|---:|---:|
| stage1 | 1.0 (앵커) | 1.0 | 2272 | 2336 | 6651.8 | **6715.8** (+1.0%) |
| stage2 | 0.58723 | **0.567146** | 5152 | 5604 | 5299.5 | 5299.5 (불변) |
| stage3 | 0.746844 | 0.746844 | 2768 | 2768 | 5829.5 | 5829.5 |
| stage4 | 1.005484 | 1.005484 | 2182 | 2182 | 6412.4 | 6412.4 |

해석:
- **stage1**: 마릿수 +11.1%인데 총 HP는 +1.0%만 올랐다(E01이 8hp로 싸서). 정확히 원하는 그림 —
  몸은 많아지고 처치는 안 느려진다.
- **stage2**: 총 HP가 설계 불변식(앵커 ×1.21)에 고정돼 있어, 마릿수 +10.7%만큼 **마리당 HP가 −3.4%**
  자동 상쇄된다. 총량은 그대로, 몸은 더 많고 개체는 더 얇다 — 템포 측면에선 오히려 유리하다.
  다만 "스2 난이도가 미세하게 내려간 것 아니냐"는 판단은 balanceqa 몫이다.
- **stage3/4**: 완전 불변.

미세 오차: `stageBurstJarmobBaseHp`는 `evt.type`만 보고 `mixedTypes`를 무시하므로,
mixedTypes를 단 5건에서 실전달 HP가 추정치보다 약간 높다(스1 +18, 스2 +44 HP 수준). 무시 가능.

---

## 4. 실행한 검증 — 명령과 실제 출력

### 4-1. 사전 baseline (변경 전, 파일별)

```
$ npx vitest run <각 파일>
--- src/components/Enemies.test.jsx        Tests  8 failed | 87 passed (95)
--- src/lib/burstEvents.test.js            Tests  12 failed | 23 passed (35)
--- src/lib/stageConfig.test.js            Tests  14 passed (14)
--- src/lib/waveControl.test.js            Tests  9 passed (9)
--- src/lib/pooledEnemySpawnDrain.test.js  Tests  6 passed (6)
--- src/lib/waveTimelines.test.js          Tests  2 failed | 17 passed (19)
--- src/lib/enemySimulation.parity.test.js Tests  2 failed | 7 passed (9)
--- src/lib/enemySimulation.test.js        Tests  33 passed (33)
--- src/components/ZombieMesh.test.js      Tests  1 failed | 24 passed (25)
```

합계 baseline = **25 failed | 220 passed (245)**.

### 4-2. 변경 후 (동일 9개 파일 일괄)

```
$ npx vitest run src/lib/enemySimulation.test.js src/lib/enemySimulation.parity.test.js \
    src/lib/burstEvents.test.js src/lib/waveTimelines.test.js src/lib/stageConfig.test.js \
    src/lib/waveControl.test.js src/lib/pooledEnemySpawnDrain.test.js \
    src/components/Enemies.test.jsx src/components/ZombieMesh.test.js
 Test Files  5 failed | 4 passed (9)
      Tests  25 failed | 220 passed (245)
```

**baseline과 정확히 동일. 신규 실패 0건, 우연히 고쳐진 것도 0건.**

### 4-3. parity 테스트 단독 (완료 기준 2)

```
$ npx vitest run src/lib/enemySimulation.parity.test.js
 FAIL > hp가 두 테이블에서 일치한다   AssertionError: RZT.hp: expected 28 to be 140
 FAIL > scale가 두 테이블에서 일치한다 AssertionError: RZT.scale: expected 0.879... to be 1.759...
      Tests  2 failed | 7 passed (9)
```

`speed 패리티`·`E07 = E01 ×2`·`E07 슬롯 일치` 전부 **통과**.
남은 2건은 **사전존재 실패**(baseline과 동일): `ENEMY_RUNTIME_HP[13]`=28 / `ENEMY_RUNTIME_SCALE[13]`=0.88이
`ENEMY_STATS.RZT`의 hp 140 / scale 1.76과 어긋나 있다. 이번 지시 범위 밖이라 고치지 않았다.
→ **balanceqa 후속 티켓 후보**: RZT의 hp·scale 런타임 슬롯 동기화.

### 4-4. 추가로 돌린 인접 스위트

```
$ npx vitest run src/components/EnemyChefBossSightExemption.test.js \
    src/components/EnemyMathTeacherSpecial.test.js src/components/EnemyVisual.test.js \
    src/components/StageBossPreview.test.jsx src/lib/chefBossPhase.test.js src/lib/stageBalanceProbe.test.js
 Test Files  1 failed | 5 passed (6)
      Tests  1 failed | 65 passed (66)
```

유일한 실패는 `EnemyChefBossSightExemption > keeps the sight-block detour active for every other enemy` —
소스 문자열 단언이 `isStageObjectSightBlocked(...)`를 찾는데 실제 코드는
`isStageObjectEnemyTrackingBlocked(...)`(Enemy.jsx:794)다. **사전존재 드리프트**이며 내 diff는
Enemy.jsx의 `ENEMY_STATS` 숫자 리터럴과 주석 블록만 건드렸다(전체 diff 20+/15−).

### 4-5. 스폰 총량 집계 실행

```
$ node <scratchpad>/tally.mjs           # 작업본
stage1 total= 100 {"E01":57,"E07":18,"E02":11,"E03":2,"E05":11,"E06":1}
stage2 total= 196 {"E01":85,"E03":27,"E02":50,"E04":2,"E05":11,"E06":1,"E07":20}
stage3 total= 48  {"E01":12,"E03":10,"E04":1,"E05":9,"E06":4,"E07":3,"E02":9}
stage4 total= 38  {"E01":10,"E04":1,"E05":6,"E06":3,"E03":6,"E02":9,"E07":3}

$ node <scratchpad>/tally.base.mjs      # git show HEAD:... 로 뽑은 변경 전 원본
stage1 total= 90  {"E01":49,"E07":16,"E02":11,"E03":2,"E05":11,"E06":1}
stage2 total= 177 {"E01":76,"E03":24,"E02":45,"E04":2,"E05":11,"E06":1,"E07":18}
stage3 total= 48  {"E01":12,"E03":10,"E04":1,"E05":9,"E06":4,"E07":3,"E02":9}
stage4 total= 38  {"E01":10,"E04":1,"E05":6,"E06":3,"E03":6,"E02":9,"E07":3}
```

밸런스 프로브(`stageBalanceProbe`)는 같은 시드로도 결과가 갈리므로 근거로 쓰지 않았다.
위 정적 집계표가 총량의 근거다.

---

## 5. 변경 파일

정본:
- `Developer/r3f_prototype/src/components/Enemy.jsx` — `ENEMY_STATS` speed 15건 + 규칙 주석
- `Developer/r3f_prototype/src/lib/enemySimulation.js` — `ENEMY_RUNTIME_SPEED`, `E04_RUNTIME_SPEED`
- `Developer/r3f_prototype/src/lib/burstEvents.js` — 스1/스2 count + `LIGHT_MOB_MIX` mixedTypes + 규칙 주석

테스트(변경된 정본 수치를 따라간 것뿐, 단언 약화 없음):
- `src/lib/enemySimulation.test.js` — 속도 단언 8건. E04 스트레이프는 `0.495×0.75`가 배정도에서
  `0.37124999999999997`이라 `toMatchObject` → `toBeCloseTo(…, 10)`로 바꿨다.
- `src/lib/burstEvents.test.js` — count 단언 8건
- `src/components/Enemies.test.jsx` — count 단언 11건, RZL/RZC/RZT/RZG 속도 4건
- `src/components/ZombieMesh.test.js` — B01/B02 및 런크루 속도 6건

**손대지 않은 것:** `waveTimelines.js`, `stageConfig.js`, `waveControl.js`, `pooledEnemySpawnDrain.js`,
`Enemies.jsx`, 스테이지3·4 버스트, 타이틀 계열, 타 에이전트 미커밋 파일
(`App.jsx`, `firebaseStudio.js`, `stageObjectPlacements.js`, `package.json`,
`scripts/assert-studio-game-sync-contract.mjs`).

### 사고 1건 — CRLF 오염, 자체 발견·복구 완료
`burstEvents.js`에 쓴 `sed -i`(상수 rename)가 파일 전체의 CR을 날려 diff가 172+/157− 로 부풀었다.
`burstEvents.test.js`도 같은 증상(138+/135−). 두 파일 모두 HEAD 블롭이 **혼합 EOL**(be 148CR/176줄,
bet 124CR/236줄)이라 단순 일괄 변환으론 복구가 안 된다. `difflib.SequenceMatcher`로 HEAD와 매칭해
**줄 단위로 원래 종결자를 복원**했다(신규 줄은 직전 HEAD 줄의 종결자를 상속).

```
$ git diff --numstat   # 복구 후
36  21  Developer/r3f_prototype/src/lib/burstEvents.js
14  11  Developer/r3f_prototype/src/lib/burstEvents.test.js
```

`--ignore-cr-at-eol` 값과 일치 = 순수 내용 변경만 남았다. 복구 후 테스트 재실행도
**25 failed | 220 passed** 로 동일. 다른 5개 파일은 HEAD가 LF-only였고 지금도 LF-only다(오염 없음).

---

## 6. balanceqa 핸드오프

### acceptance criteria
1. **A-1** 스1/스2/스3/스4에서 모든 좀비의 체감 이동속도가 이전 대비 눈에 띄게 빠르다.
   측정: 동일 시작 지점에서 E01이 플레이어까지 도달하는 시간이 이전의 1/1.1 = **90.9%**여야 한다.
2. **A-2** `npx vitest run src/lib/enemySimulation.parity.test.js` 에서
   `speed가 두 테이블에서 일치한다` **통과** (hp/scale 2건은 사전존재 실패로 허용).
3. **A-3** 스테이지1 240초 완주 시 총 스폰 좀비 수 = **100마리**(보스 1 제외), 스테이지2 = **196마리**
   (보스 1 + 경비추격 크루 4×7=28 제외). 실측 카운터로 확인.
4. **A-4** 스테이지1에 **E04(원거리)가 단 한 마리도 등장하지 않는다** — 로스터 제약 회귀 방어.
5. **A-5** 스테이지3·4의 스폰 마릿수·구성·타이밍이 이전과 **완전히 동일**하다(48 / 38마리).
6. **A-6** 스1 108s·150s·184s, 스2 30s·90s 러시의 E01/E03 구성비가 **런마다 다르다**
   (같은 판 반복 시 동일하지 않다). 2회 이상 관찰.

### 리스크 — 우선 확인 순서
1. **[상] 모바일 회피 난이도.** E03 러너 1.21, RZL 2.695. 폰 조이스틱 최대속도 대비 러너·런크루가
   상대적으로 더 빨라졌다. 플레이어 속도는 안 올렸으므로 **카이팅 여유가 실제로 줄었다**.
   스3 RZL 대각 횡단(35/80/120/150s)과 스2 경비추격(42/88/136/216s)에서 회피 가능성 실측 필요.
   불가하면 런크루만 예외로 되돌리는 게 최소 수정이다.
2. **[중] E05 차저 접근속도 0.55 vs 돌진 1.7.** 접근만 빨라져 경고(`warnDist 4.5`, `warnDuration 700ms`)
   진입이 잦아진다. 돌진 스팸 체감 확인.
3. **[중] stage2 마리당 HP −3.4%.** 총 HP는 불변이지만 개체가 얇아졌다. 스2가 쉬워졌다는 체감이
   나오면 `STAGE_JARMOB_TOTAL_HP_FACTOR.stage2`(현재 1.21)로 조정한다 — burstEvents를 다시 만지지 말 것.
4. **[중] 동시 개체수 상한.** 스1 t=0에 18마리, 스2 t=5에 17 + t=30에 7+22=29마리가 한 번에 뜬다.
   `clampZombieSpawnRequest`/`MAX_ENEMIES` 포화와 폰 프레임 드랍 확인.
5. **[하] E06 거대 0.66.** 원래 "느려서 피할 수 있는" 정체성. 320hp가 더 빨리 붙는다.
6. **[하] 런크루 화면 체류시간 단축.** RZL/RZC가 빨라져 경계 밖 despawn까지 시간이 짧아졌다 →
   처치 가능 창이 줄어 XP 회수량이 감소할 수 있다.

### 후속 티켓 후보 (이번 범위 밖, 사전존재)
- `ENEMY_RUNTIME_HP[13]`/`ENEMY_RUNTIME_SCALE[13]`(RZT)이 `ENEMY_STATS.RZT`와 불일치 → parity 2건 상시 실패.
- `pickMixedReinforcementTypes`의 `/^E0[1-6]$/` 필터가 E07을 조용히 탈락시킨다.
- `EnemyChefBossSightExemption.test.js`가 존재하지 않는 심볼 `isStageObjectSightBlocked`를 단언.
- `waveTimelines.test.js`/`burstEvents.test.js`의 보스 시각 단언 12+2건이 실제 스케줄과 어긋남.
