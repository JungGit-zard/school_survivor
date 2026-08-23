# stage3 B03 — HP 재스케일 + 왕복 오래달리기 필살기 개정 + 보스 구간 10초 반복 증원

- 작성: levelmini
- 날짜: 2026-08-23 착수 / 2026-08-24 사양 4회 개정 반영
- 워크트리: `D:/JungSil/2.Minigame_project/school_survivor-integration` (공유 — 커밋하지 않음)

## 0. 사양 변경 이력

지시가 순차로 5건 들어왔고, 그중 1건은 폐기됐다. 최종 반영본은 3·4·5 + 2의 나머지 항목이다.

| # | 지시 원문 요약 | 상태 |
|---|---|---|
| 1 | "스테이지 3 보스 체력 절반으로 조정" | **폐기** (3번으로 대체) |
| 2 | 필살기 전면 조정: 바닥 예상루트 깜빡임 → 달리기 애니메이션 → 평소 이동속도 5배 왕복 → 접촉 시 체력 30% 피해 | 속도만 4번으로 개정, 나머지 적용 |
| 3 | "스테이지 3 보스 hp를 2스테이지 보스보다 1.3배로 맞춰" | 적용 |
| 4 | "왕복 17초는 너무 기니까 10배로 올려" | 적용 (속도 배수 5 → 10) |
| 5 | "스테이지 3에서 보스가 출현한 뒤부터 5분 이전까지 무조건 10초에 한번씩 기본녹색좀비 10마리, 웃는좀비 3마리씩 자동 추가 스폰" | 적용 |

---

## 1. B03 HP 재스케일

### 근거 계산

목표: **스3 보스 실효 HP = 스2 보스 실효 HP × 1.3**

```
스2 보스 실효 = round(B02.hp 1150 × STAGE_HP_MULTIPLIER.stage2 1.2) = 1,380
목표 스3 실효 = 1,380 × 1.3                                        = 1,794
```

실효 HP는 `sameTypeZombieHpForStage`(`src/components/Enemies.jsx:805-808`)가
`round(base × STAGE_HP_MULTIPLIER[stageId])`로 낸다. stage3 배수 1.44로 base를 역산한다.

```
round(1246 × 1.44) = round(1794.24) = 1,794  ✅ 목표 일치
```

`ENEMY_STATS.B03.hp = 1246`은 임의값이 아니라 이 역산의 결과다.
**`STAGE_HP_MULTIPLIER.stage3`가 바뀌면 이 base도 같은 목표에서 다시 역산해야 한다.**
코드 주석에 이 조건을 명시했다. `ZombieMesh.test.js`에도 관계식 단언을 넣어 고정했다:

```js
expect(Math.round(ENEMY_STATS.B03.hp * 1.44)).toBe(Math.round(Math.round(ENEMY_STATS.B02.hp * 1.2) * 1.3))
```

### 전/후

| 항목 | 전 | 후 | 증감 |
|---|---:|---:|---:|
| `ENEMY_STATS.B03.hp` (base) | 1,150 | **1,246** | +96 |
| B03 stage3 실효 HP (×1.44) | 1,656 | **1,794** | +138 (+8.33%) |
| 스2 보스 대비 배율 | 1.200 | **1.300** | 목표 달성 |

---

## 2. 필살기(왕복 오래달리기) 전면 개정

정본 모듈 `src/lib/b03ShuttleRun.js` / 배선 `src/components/Enemy.jsx:1159~`.
고친 결함 3가지.

### (1) 달리기 애니메이션이 없었다

활성 왕복 중 `animPhase`로 `'stun'`을 내보내고 있었다 — 보스가 **기절 포즈로 미끄러지는** 상태였다.

| phase | 전 | 후 |
|---|---|---|
| telegraph | `'warn'` | `'warn'` (불변) |
| active | `'stun'` ❌ | **`'run'`** |
| stun | `'stun'` | `'stun'` (불변) |
| idle 복귀 | `'normal'` | `'normal'` (불변) |

실제 `'run'` 포즈 구현과 바닥 예상루트 깜빡임 연출은 **threemini 소관**이다. 여기서는 문자열만 낸다.
`B03_SHUTTLE_TELEGRAPH_MS`(1,250)는 깜빡임 주기 기준이라 손대지 않았다.

### (2) 속도가 사양과 무관한 고정 duration이었다

전: `B03_SHUTTLE_PASS_DURATION_MS = 1_100` — 레인 길이와 무관한 상수. 후: **거리에서 역산**.

```js
export const B03_SHUTTLE_SPEED_MULTIPLIER = 10
getB03ShuttleRunPassDurationMs(startX, endX, baseSpeed)
  = max(1, |endX - startX| / (baseSpeed × 10) × 1000)
```

`baseSpeed`는 `Enemy.jsx`가 `stats.speed`로 넘긴다. 모듈이 `ENEMY_STATS`를 import하면
`Enemy.jsx ↔ b03ShuttleRun.js` 순환 참조가 되므로 인자로 받고, `B03_SHUTTLE_BASE_SPEED = 0.5225`는
폴백으로만 남겼다. 고정 상수 `B03_SHUTTLE_PASS_DURATION_MS`는 제거했다.

#### 실측 소요시간 (stage3 실좌표)

`stageConfig.js` stage3 `mapHalfX = 7.5`, 배선 `edgeInset = 0.9` → 레인 양끝 ±6.6,
**편도 거리 13.2 units**.

> 브리프의 "halfX 12 / 편도 22.2 units"는 stage3 실값과 다르다. 실제는 7.5 / 13.2다.
> 아래는 전부 실좌표 재계산값이다.

| 항목 | 전 (고정 1,100ms) | 후 (×10 역산) |
|---|---:|---:|
| 실효 이동속도 | 12.00 u/s | **5.225 u/s** |
| 평소 속도(0.5225) 대비 | 22.97배 ❌ | **정확히 10배** ✅ |
| 편도 소요 | 1.10 s | **2.526 s** (13.2 ÷ 5.225) |
| 왕복(2패스) | 2.20 s | **5.053 s** |
| 시전 전체(예고 1.25 + 왕복 + 경직 1.2) | 4.45 s | **7.50 s** |

기존 구현이 사양보다 2.3배 빨랐기 때문에, 사양대로 맞추면 필살기는 **느려지고 길어진다**.
"왕복 17초" 우려는 halfX 12 가정에서 나온 수치이며, 실좌표에서는 5배여도 왕복 10.1초,
10배면 왕복 5.05초다.

### (3) 피해가 고정 16이었다

B01 삼각자(`src/lib/mathTeacherSpecial.js`)의 `MATH_TEACHER_PLAYER_DAMAGE_RATIO` /
`getMathTeacherPlayerDamage` 선례를 그대로 따랐다.

```js
export const B03_SHUTTLE_PLAYER_DAMAGE_RATIO = 0.3
export function getB03ShuttleRunPlayerDamage(currentHp) {
  return Math.max(0, currentHp) * B03_SHUTTLE_PLAYER_DAMAGE_RATIO
}
```

`consumeB03ShuttleRunPassHit`의 반환을 `{ state, damage }` → `{ state, hit }`로 바꿨다.
비율 피해라 수치는 판정 시점의 플레이어 HP를 읽어야 하므로 호출부가 계산한다.

| 항목 | 전 | 후 |
|---|---|---|
| 패스당 피해 | 고정 16 | 현재 HP × 0.30 |
| 시전 최대 피해 (100 HP, i-frame 무시 시) | 32 | 51 (30 + 21) |
| 판정식 | 레인 Z ±0.6 AND \|playerX − bossX\| < 0.7 | 불변 |
| 패스당 1회 제한 | `hitPasses[passIndex]` | 불변 |

#### 무적시간 정책: i-frame을 **존중**한다 (선택 근거)

B01은 `store.damagePlayer(dmg, IGNORE_INVULNERABILITY)`로 무적시간을 무시하지만,
B03은 `store.damagePlayer(dmg)`로 **무적시간을 존중**하게 했다.

- 근거 1: B03은 한 번 시전에 **왕복 2패스**가 같은 레인을 지난다. 비율 피해 2연타가 그대로
  들어가면 100 HP 기준 51% 손실 — 30%짜리 스킬이 사실상 51%짜리가 된다.
- 근거 2: B01 삼각자는 단발 스윙이라 무적 무시가 "확정 1타" 보장 장치로 기능하지만,
  B03에서 같은 처리를 하면 "확정 2타"가 되어 성격이 달라진다.
- 근거 3: 리턴 패스는 아웃바운드 직후 같은 레인을 되돌아온다. 아웃바운드에 맞아 경직된
  플레이어가 리턴을 회피할 실질 창이 좁다. i-frame이 그 구조적 불공정을 상쇄한다.

`Enemy.jsx` B03 블록 주석에 이 선택과 근거를 명시했다.

---

## 3. 보스 구간 10초 반복 증원 (2026-08-24 신규)

### 구현

기존 반복 버스트 기구(`repeatIntervalSec` / `endExclusiveSec`)를 그대로 재사용했다.
새 기구는 만들지 않았다. `src/lib/burstEvents.js`:

```js
export const STAGE3_BOSS_PHASE_REINFORCEMENT = 'stage3BossPhaseE01E07'
export const STAGE3_BOSS_PHASE_REINFORCEMENT_START_SEC = 150          // 보스 B03 등장 시각
export const STAGE3_BOSS_PHASE_REINFORCEMENT_END_EXCLUSIVE_SEC = 300  // 5분 이전(exclusive)
export const STAGE3_BOSS_PHASE_REINFORCEMENT_INTERVAL_SEC = 10

export const STAGE3_BOSS_PHASE_GREEN_SMILING_REINFORCEMENT_EVENTS = [
  { ..., type: 'E01', count: 10, ... },  // 기본 녹색좀비
  { ..., type: 'E07', count: 3,  ... },  // 웃는좀비
]
```

25초 계열과 창이 겹치지 않는다 — 그쪽은 150에서 끝나고 이쪽이 150에서 시작한다.
두 계열은 `reinforcement` 태그로 구분한다.

### 실측 전개 (테스트로 확인)

```
tick 수 = ceil((300 - 150) / 10) = 15
발화 시각 = 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290
마지막 발화 290 < 300  ✅
```

| 항목 | 실측 |
|---|---:|
| tick당 마릿수 | 13 (E01 10 + E07 3) |
| tick당 HP | **189** (E01 `round(8×1.44)`=12 ×10 + E07 `round(16×1.44)`=23 ×3) |
| 전개 총 마릿수 | **195** |
| 전개 총 HP | **2,835** |

### stage3 총 HP 실측 전/후

`burstEvents.test.js`의 `stageTotalHp`(버스트 표 = 유일한 스폰 경로, 반복 tick 전개 포함) 기준.

| 스테이지 | 작업 전 | 작업 후 | 증감 |
|---|---:|---:|---:|
| stage1 | 3,710 | **3,710** | 0 (사용자 실플레이 정본 — 불변) |
| stage2 | 4,838 | **4,838** | 0 (사용자 실플레이 정본 — 불변) |
| stage3 | 5,241 | **8,214** | **+2,973** |
| stage4 | 8,169 | **8,169** | 0 |

stage3 내역: 잡몹 3,585 + 보스 1,794 + 보스구간 증원 2,835 = 8,214.
증감 내역: B03 재스케일 +138, 반복 증원 +2,835.

stage3(8,214)가 stage4(8,169)를 45만큼 앞선다.
**2026-08-24 사용자 판정 — E01 증원은 XP 공급도 함께 늘리므로 총 HP 사다리로 stage3 난이도를
재지 않는다.** 1.3 사다리에서의 이탈은 의도된 것이며 되돌리지 않았다. 마릿수·주기·종료 시각은
지시대로 유지했다.

### MAX_ENEMIES = 150 클램프 실측

**클램프 지점**: `addEnemies`(`src/components/Enemies.jsx:1508-1528`)

```js
if (clampZombieSpawnRequest(1, totalZombieCounts()) <= 0) break
```

`clampZombieSpawnRequest`(`Enemies.jsx:382`)는
`min(요청, max(0, 150 − (pooledActive + specialActive + pooledQueued)))`를 낸다.
**소실 방식**: `continue`가 아니라 `break`다 — 천장에 닿으면 그 배치의 남은 엔트리가
**조용히 버려진다**. 재시도 큐도, 로그도, 이벤트도 없다.
E01 행과 E07 행은 별개 버스트 이벤트라 `addEnemies`도 따로 호출된다. 포화 시점에는
두 배치가 각각 독립적으로 잘린다.

**스폰 공급 곡선 실측** (`STAGE3_BURST_EVENTS` 전개, 킬 0 가정 누적):

| 시각 | 추가 | 누적 | 내역 |
|---:|---:|---:|---|
| 150 | 17 | 87 | E01×10 + E07×3 + B03×1 + E02×3 |
| 160~190 | 13/틱 | 141 | (184초 E06×2 포함 시 141) |
| **200** | 13 | **154** | ← **여기서 150 천장을 넘는다** |
| 210 | 13 | 167 | |
| 216 | 3 | 170 | E05×3 |
| 220~290 | 13/틱 | 274 | |

stage3 전체 스폰 공급은 **274마리**(작업 전 79마리 → +195).

추가 변수: stage3 오버타임은 `STAGE3_OVERTIME_REINFORCEMENT_START_SEC = 240`부터
30초마다 30마리를 더 넣는다(240, 270 두 틱 = +60). 이를 합치면 290초 누적 공급은 **334마리**다.

**판정**: 킬이 0이면 200초부터 모든 tick이 100% 소실된다(200~290 구간 10틱 × 13 = 130마리 +
오버타임 60마리). 실제 소실 여부는 필드 잔존 수에 달려 있으므로 단일 확정값을 낼 수 없다.
소실 없이 지시대로 13마리가 매번 나오려면 보스 구간에서 **10초당 13킬(= 1.3 kill/s,
잡몹 클리어 18.9 HP/s)** 이상을 유지해야 한다. 이 값이 balanceqa의 실측 기준선이다.
지시대로 유지했고 클램프는 고치지 않았다.

---

## 4. 변경 파일

| 파일 | 내용 |
|---|---|
| `src/lib/b03ShuttleRun.js` | 속도 배수 10 역산, 30% 비율 피해, `hit` 반환, 고정 duration 제거 |
| `src/lib/b03ShuttleRun.test.js` | 신규 사양 단언 4건 추가/개정 |
| `src/lib/burstEvents.js` | 보스 구간 반복 증원 상수·이벤트 2건 추가, stage3/4 총량 주석 실측 정정 |
| `src/lib/burstEvents.test.js` | `BASE_HP.B03` 1246, stage3 총량 8214, 반복 계열 2종 규칙, 증원 전용 단언 추가 |
| `src/components/Enemy.jsx` | `B03.hp` 1150→1246, `animPhase 'run'`, 비율 피해 호출, `baseSpeed` 전달 |
| `src/components/ZombieMesh.test.js` | B03 hp 1246 + "스2 보스 × 1.3" 관계 단언 |
| `src/components/StageBossPreview.jsx` | 죽은 `hp={1150}` prop 제거 |

### 테스트 예외 처리 방식 (2026-08-19 사고 재발 방지)

stage3는 1.3 사다리 ±2% 단언에서 **제외**했다. 위반 항목을 필터로 걸러 초록을 만드는 방식은
쓰지 않았다 — 제외 대상을 `LADDER_STAGES = ['stage1', 'stage2', 'stage4']` 한 줄로 명시하고
이유를 주석에 적은 뒤, stage3 총량은 별도 단언으로 정확히 고정했다.

```js
it('stage3 총 HP는 사다리 대신 실측 정본으로 고정된다', () => {
  expect(stageTotalHp('stage3')).toBe(STAGE3_MEASURED_TOTAL_HP)      // 8214
  expect(stageTotalHp('stage3')).toBeGreaterThan(stageTotalHp('stage4'))
})
```

반복 보강 규칙 단언의 옛 조항 (3) "마지막 tick이 보스 등장보다 앞선다"는 이번 지시로 폐기됐고,
계열별 발화 시각·마릿수를 `REPEATING_FAMILIES` 표로 나눠 검증하도록 바꿨다.

---

## 5. Acceptance criteria (balanceqa 핸드오프)

1. stage3 보스 HP 바 최대치가 **1,794**다(스2 보스 1,380의 정확히 1.3배).
2. B03 HP 65% / 30% 도달 시 각각 1회씩만 필살기가 발현한다.
3. 예고 표식이 **1.25초** 깜빡인 뒤 보스가 움직인다.
4. 활성 왕복 중 보스 포즈가 **기절이 아니라 달리기**다(threemini의 `'run'` 포즈 구현 후 재검증).
5. 편도 통과에 **2.5초 ±0.2초**(레인 끝 → 반대쪽 끝), 왕복 5.05초.
6. 레인 밖(중심에서 Z 0.6 units 초과)이면 피해 0.
7. 레인 안에서 맞으면 **그 순간 HP의 30%**가 깎인다 — 100→70, 70→49. 고정 16이 아니다.
8. **i-frame 검증**: 아웃바운드 피격 직후 그대로 서 있을 때 리턴 패스가 추가로 들어가는지 실측.
   들어가면 최종 49, i-frame이 막으면 70. 어느 쪽이든 "30% 배수로만 깎인다"가 불변식이다.
9. **증원 실측**: 150초부터 10초마다 녹색좀비 10 + 웃는좀비 3이 실제로 나온다. 290초가 마지막
   발화이고 300초에는 나오지 않는다.
10. **클램프 소실 실측**: 200초 이후 각 tick에서 실제 스폰된 마릿수를 세어 13 미만이면 몇 마리가
    버려졌는지 기록한다. 필드 잔존 수를 함께 남긴다(150 천장 대비).
11. 스1/스2/스4 총 HP와 클리어 체감이 변경 전과 동일하다(회귀 없음).

---

## 6. 검증 실행 결과

```
$ npx vitest run src/lib/b03ShuttleRun.test.js src/lib/burstEvents.test.js \
    src/lib/waveTimelines.test.js src/components/ZombieMesh.test.js \
    src/components/Enemies.test.jsx src/components/EnemyVisual.test.js
Test Files  1 failed | 5 passed (6)
     Tests  1 failed | 258 passed (259)
```

유일한 실패는 **이번 작업과 무관한 선존재 결함**이다(작업 착수 전 baseline에서 동일하게 실패).

```
FAIL src/components/ZombieMesh.test.js > Stage 2 security guard chase visuals
AssertionError: expected { hp: 140, ... } to match object { hp: 28, ... }
  - "hp": 28      / + "hp": 140
  - "scale": 0.88 / + "scale": 1.76
```

`ENEMY_STATS.RZT`가 hp 28·scale 0.88 → hp 140·scale 1.76(각각 5배·2배)으로 바뀌었는데
테스트가 따라가지 않았다. **balanceqa 확인 요망** — 의도된 상향인지 테스트가 stale인지 판정 필요.
스2 호위 추격조 총 HP에 직접 영향인데 `burstEvents.test.js`의 stage2 총량 4,838은 여전히
통과하므로 두 정본 중 하나가 어긋나 있을 가능성이 있다.

```
$ npm run build
✓ built
Legacy B02 artifact gate passed (dist).
Hosting JavaScript asset verification passed (59 assets checked).
```

CR 오염 없음 — `git diff --numstat`과 `git diff --numstat --ignore-cr-at-eol` 출력이 동일하다.

커밋하지 않았다(공유 워크트리, Terry가 직접 커밋).

---

## 7. 남은 작업 (다른 담당)

- **threemini**: 바닥 예상루트 깜빡임 연출(주기는 `B03_SHUTTLE_TELEGRAPH_MS` 1,250에 맞출 것),
  `animPhase === 'run'` 달리기 포즈 구현. 현재 `ZombieMesh.jsx`에 `'run'` 분기가 없어
  기본 idle/walk로 폴백한다.
- **balanceqa**: 위 acceptance criteria 11항 + RZT 선존재 결함 판정.
- **soundmini**: 필살기 예고음/질주음/충돌음, 보스 구간 증원 스폰음 미배정.
