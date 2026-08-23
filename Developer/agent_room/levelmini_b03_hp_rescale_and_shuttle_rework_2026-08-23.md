# B03 체육교사 — HP 재스케일 + 왕복 오래달리기 필살기 전면 개정

- 작성: levelmini
- 날짜: 2026-08-23 착수 / 2026-08-24 사양 2회 개정 반영
- 워크트리: `D:/JungSil/2.Minigame_project/school_survivor-integration` (공유 — 커밋하지 않음)

## 0. 사양 변경 이력 (지시가 두 번 바뀌었다)

| 순번 | 지시 | 상태 |
|---|---|---|
| 1 | "스테이지 3 보스 체력 절반으로 조정" | **폐기** — 3번으로 대체 |
| 2 | 필살기: 바닥 예상루트 깜빡임 → 달리기 애니메이션 → 평소 이동속도 5배 왕복 → 접촉 시 플레이어 체력 30% 피해 | 4번으로 속도만 개정 |
| 3 | "스테이지 3 보스 hp를 2스테이지 보스보다 1.3배로 맞춰" | **적용** |
| 4 | "왕복 17초는 너무 기니까 10배로 올려" | **적용** (속도 배수 5 → 10) |

최종 반영본은 3 + 4 + 2의 나머지 항목(30% 비율 피해, 달리기 포즈)이다.

## 1. HP 재스케일

### 근거 계산

목표는 "스3 보스 실효 HP = 스2 보스 실효 HP × 1.3"이다.

```
스2 보스 실효 = round(B02.hp 1150 × STAGE_HP_MULTIPLIER.stage2 1.2) = 1,380
목표 스3 실효 = 1,380 × 1.3                                        = 1,794
```

실효 HP는 `sameTypeZombieHpForStage`(`src/components/Enemies.jsx:805-808`)가
`round(base × STAGE_HP_MULTIPLIER[stageId])`로 낸다. stage3 배수는 1.44이므로 base를 역산한다.

```
round(1246 × 1.44) = round(1794.24) = 1,794  ✅ 목표 일치
```

`ENEMY_STATS.B03.hp = 1246`은 임의값이 아니라 이 역산의 결과다.
**`STAGE_HP_MULTIPLIER.stage3`가 바뀌면 이 base도 같은 목표(스2 보스 × 1.3)에서 다시 역산해야 한다.**
코드 주석에 이 조건을 명시해 두었다.

### 전/후 표

| 항목 | 전 | 후 | 증감 |
|---|---:|---:|---:|
| `ENEMY_STATS.B03.hp` (base) | 1,150 | **1,246** | +96 |
| B03 stage3 실효 HP (×1.44) | 1,656 | **1,794** | +138 (+8.33%) |
| 스2 보스 대비 배율 | 1.200 | **1.300** | 목표 달성 |

### 스테이지 총 HP 실측 전/후

`burstEvents.test.js`의 `stageTotalHp`(버스트 표 = 유일한 스폰 경로, 반복 tick 전개 포함) 기준.

| 스테이지 | 전 | 후 | 비고 |
|---|---:|---:|---|
| stage1 | 3,710 | **3,710** | 사용자 실플레이 정본 — 불변 |
| stage2 | 4,838 | **4,838** | 사용자 실플레이 정본 — 불변 |
| stage3 | 5,241 | **5,379** | 보스분 +138. 잡몹 편성 무변경 |
| stage4 | 8,169 | **8,169** | 불변 |

스3 잡몹 소계는 3,585로 그대로다(5,379 − 1,794 = 3,585). 총량 재분배는 하지 않았다.
스3 총량이 스2보다 낮아지는 역전 문제는 이번 지시로 발생하지 않는다.

### 부수 정리

- `src/lib/burstEvents.js:143` 주석의 "보스 B03 1,656 / 총 6,271"은 2026-08-19 런좀비 크루
  복원 이후 이미 stale이었다(실측은 5,241이었다). 실측 기준 5,379로 정정했다.
- `src/lib/burstEvents.js:179` 주석의 "스3 6,271 × 1.303"도 같이 정정했다.
- `src/components/StageBossPreview.jsx:160`의 `hp={1150}` 하드코딩을 제거했다.
  같은 줄에 `showHealthBar={false}`가 있어 `EnemyVisual`이 `hp`를 전혀 읽지 않는 **죽은 prop**이었고,
  보스 타입별 실제 HP(B03 1246 / B04 1500)와도 어긋나 있었다. `ENEMY_STATS[bossType].hp` 조회로
  바꾸는 대신 prop 자체를 지웠다 — 렌더에 안 쓰이는 값을 위해 조회를 추가할 이유가 없다.
  필요해지면 `ENEMY_STATS[bossType].hp`가 정본이라는 사실을 주석으로 남겼다.

## 2. 필살기(왕복 오래달리기) 전면 개정

정본 모듈: `src/lib/b03ShuttleRun.js` / 배선: `src/components/Enemy.jsx:1159~`

고친 결함 3가지.

### (1) 달리기 애니메이션이 없었다

활성 왕복 중 `queueVisualState('animPhase', ...)`가 `'stun'`을 내보내고 있었다 —
보스가 **기절 포즈로 미끄러지는** 상태였다. phase별로 분기하도록 고쳤다.

| phase | 전 | 후 |
|---|---|---|
| telegraph | `'warn'` | `'warn'` (불변) |
| active | `'stun'` ❌ | **`'run'`** |
| stun | `'stun'` | `'stun'` (불변) |
| idle 복귀 | `'normal'` | `'normal'` (불변) |

실제 `'run'` 포즈 구현과 바닥 예상루트 깜빡임 연출은 **threemini 소관**이다. 여기서는
문자열만 내보낸다. `B03_SHUTTLE_TELEGRAPH_MS`(1,250)는 깜빡임 주기 기준이므로 손대지 않았다.

### (2) 속도가 사양과 무관한 고정 duration이었다

전: `B03_SHUTTLE_PASS_DURATION_MS = 1_100` — 레인 길이와 무관한 상수.
후: **거리에서 역산**한다.

```js
export const B03_SHUTTLE_SPEED_MULTIPLIER = 10
getB03ShuttleRunPassDurationMs(startX, endX, baseSpeed)
  = max(1, |endX - startX| / (baseSpeed × 10) × 1000)
```

`baseSpeed`는 `Enemy.jsx`가 `stats.speed`로 넘긴다. 모듈이 `ENEMY_STATS`를 import하면
`Enemy.jsx ↔ b03ShuttleRun.js` 순환 참조가 되므로 인자로 받고, `B03_SHUTTLE_BASE_SPEED = 0.5225`는
폴백으로만 둔다. `B03_SHUTTLE_PASS_DURATION_MS` 상수는 제거했다.

#### 실측 소요시간 계산 (stage3 실좌표 기준)

`stageConfig.js` stage3 `mapHalfX = 7.5`, 배선의 `edgeInset = 0.9` →
레인 양끝 ±6.6, **편도 거리 13.2 units**.

> 참고: 브리프의 "halfX 12 / 편도 22.2 units"는 stage3 실값과 다르다. 실제는 7.5 / 13.2다.
> 아래 수치는 전부 실좌표로 재계산한 것이다.

| 항목 | 전 (고정 1,100ms) | 후 (×10 역산) |
|---|---:|---:|
| 실효 이동속도 | 12.00 u/s | **5.225 u/s** |
| 평소 속도(0.5225) 대비 | 22.97배 ❌ | **정확히 10배** ✅ |
| 편도 소요 | 1.10 s | **2.526 s** (13.2 ÷ 5.225) |
| 왕복(2패스) 소요 | 2.20 s | **5.053 s** |
| 시전 전체(예고 1.25 + 왕복 + 경직 1.2) | 4.45 s | **7.50 s** |

즉 이번 변경으로 필살기는 **느려지고 길어진다**(기존 구현이 사양보다 2.3배 빨랐다).
"17초 → 8.5초" 우려는 halfX 12 가정에서 나온 것으로, 실좌표에서는 5배 사양이어도 왕복 10.1초,
10배 사양이면 왕복 5.05초다. 5.05초는 이전 2.2초보다 길지만 예고 1.25초와 레인 폭 1.2를 감안하면
회피 창이 오히려 정상화되는 방향이다.

### (3) 피해가 고정 16이었다

사양은 "플레이어가 가진 체력의 30%"다. B01 삼각자(`src/lib/mathTeacherSpecial.js`)의
`MATH_TEACHER_PLAYER_DAMAGE_RATIO` / `getMathTeacherPlayerDamage` 선례를 그대로 따랐다.

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
| 시전 최대 피해 (100 HP 기준, i-frame 무시 시) | 32 | 51 (30 + 21) |
| 판정식 | 레인 Z ±0.6 AND \|playerX − bossX\| < 0.7 | 불변 |
| 패스당 1회 제한 | `hitPasses[passIndex]` | 불변 |

#### 무적시간 정책: i-frame을 **존중**한다 (선택 근거)

B01은 `store.damagePlayer(dmg, IGNORE_INVULNERABILITY)`로 무적시간을 무시하지만,
B03은 `store.damagePlayer(dmg)`로 **무적시간을 존중**하도록 했다.

- 근거 1: B03은 한 번 시전에 **왕복 2패스**가 같은 레인을 지난다. 비율 피해 2연타가 그대로
  들어가면 100 HP 기준 51% 손실이다. 30%짜리 스킬 하나가 사실상 51%짜리가 된다.
- 근거 2: B01 삼각자는 단발 스윙이라 무적 무시가 "확정 1타"를 보장하는 장치로 기능하지만,
  B03에서 같은 처리를 하면 "확정 2타"가 되어 성격이 달라진다.
- 근거 3: 리턴 패스는 아웃바운드 직후 같은 레인을 되돌아오므로, 아웃바운드에 맞아 넉백/경직
  상태인 플레이어가 리턴을 회피할 실질 창이 좁다. i-frame이 그 구조적 불공정을 상쇄한다.
- 코드 주석(`Enemy.jsx` B03 블록)에 이 선택과 근거를 명시했다.

**balanceqa 핸드오프**: i-frame 지속시간이 왕복 편도 2.526초보다 짧으면 2연타가 실제로 들어간다.
플레이어 무적시간 실값을 확인하고, 2.526초보다 짧다면 (a) 그대로 둘지 (b) 리턴 패스를 면제할지
판정이 필요하다. 아래 acceptance criteria 참조.

## 3. 변경 파일

| 파일 | 내용 |
|---|---|
| `src/lib/b03ShuttleRun.js` | 속도 배수 10 역산, 30% 비율 피해, `hit` 반환, 고정 duration 제거 |
| `src/lib/b03ShuttleRun.test.js` | 신규 사양 단언 4건 추가/개정 |
| `src/components/Enemy.jsx` | `B03.hp` 1150→1246, `animPhase 'run'`, 비율 피해 호출, `baseSpeed` 전달 |
| `src/components/ZombieMesh.test.js` | B03 hp 단언 1246 + "스2 보스 × 1.3" 관계 단언 추가 |
| `src/lib/burstEvents.js` | stage3/stage4 총량 주석 실측 정정 (주석만) |
| `src/lib/burstEvents.test.js` | `BASE_HP.B03` 1246, stage3 총량 5379 |
| `src/components/StageBossPreview.jsx` | 죽은 `hp={1150}` prop 제거 |

## 4. Acceptance criteria (balanceqa 핸드오프)

1. stage3 진입 → 보스 B03 HP 바 최대치가 **1,794**다. (스2 보스 1,380의 정확히 1.3배)
2. B03 HP 65% / 30% 도달 시 각각 1회씩만 필살기가 발현한다.
3. 예고 표식이 **1.25초** 깜빡인 뒤 보스가 움직이기 시작한다.
4. 활성 왕복 중 보스 포즈가 **기절이 아니라 달리기**다(threemini의 `'run'` 포즈 구현 후 재검증).
5. 편도 통과에 **2.5초 ±0.2초**가 걸린다(레인 끝 → 반대쪽 끝). 왕복 5.05초.
6. 레인 밖(중심에서 Z 0.6 units 초과)에 서 있으면 피해가 0이다.
7. 레인 안에서 맞으면 **그 순간 HP의 30%**가 깎인다 — 100→70, 70→49. 고정 16이 아니다.
8. **i-frame 검증**: 아웃바운드에 맞은 직후 그대로 서 있을 때 리턴 패스가 추가로 들어가는지
   실측한다. 들어간다면 100 HP 기준 최종 49가 되고, i-frame이 막으면 70에 머문다.
   어느 쪽이든 "31%가 아니라 30% 배수로만 깎인다"가 불변식이다.
9. 스1/스2/스4 총 HP와 클리어 체감이 이번 변경 전과 동일하다(회귀 없음).

## 5. 검증 실행 결과

```
$ npx vitest run src/lib/b03ShuttleRun.test.js src/lib/burstEvents.test.js \
    src/components/ZombieMesh.test.js src/components/Enemies.test.jsx src/components/EnemyVisual.test.js
Test Files  1 failed | 4 passed (5)
     Tests  1 failed | 237 passed (238)
```

유일한 실패는 **이번 작업과 무관한 선존재 결함**이다(작업 착수 전 baseline에서 동일하게 실패했다).

```
FAIL src/components/ZombieMesh.test.js > Stage 2 security guard chase visuals
AssertionError: expected { hp: 140, ... } to match object { hp: 28, ... }
  - "hp": 28   / + "hp": 140
  - "scale": 0.88 / + "scale": 1.76
```

`ENEMY_STATS.RZT`가 hp 28·scale 0.88에서 hp 140·scale 1.76(정확히 5배/2배)으로 바뀌었는데
테스트가 따라가지 않은 상태다. **balanceqa 확인 요망** — 의도된 상향인지, 테스트가 stale인지
판정이 필요하다. 스2 호위 추격조 총 HP에 직접 영향이 있는데 `burstEvents.test.js`의 stage2
총량 4,838은 여전히 통과하므로, 두 정본 중 하나가 어긋나 있을 가능성이 있다.

```
$ npm run build
✓ built in 1.36s
Legacy B02 artifact gate passed (dist).
Hosting JavaScript asset verification passed (59 assets checked).
```

CR 오염 없음 (두 출력이 동일):

```
$ git diff --numstat                      $ git diff --numstat --ignore-cr-at-eol
22  4  src/components/Enemy.jsx           22  4  src/components/Enemy.jsx
 4  1  src/components/StageBossPreview.jsx  4  1  src/components/StageBossPreview.jsx
 4  1  src/components/ZombieMesh.test.js    4  1  src/components/ZombieMesh.test.js
31  6  src/lib/b03ShuttleRun.js           31  6  src/lib/b03ShuttleRun.js
61  9  src/lib/b03ShuttleRun.test.js      61  9  src/lib/b03ShuttleRun.test.js
 7  2  src/lib/burstEvents.js              7  2  src/lib/burstEvents.js
 6  2  src/lib/burstEvents.test.js         6  2  src/lib/burstEvents.test.js
```

커밋하지 않았다(공유 워크트리, Terry가 직접 커밋).

## 6. 남은 작업 (다른 담당)

- **threemini**: 바닥 예상루트 깜빡임 연출(주기는 `B03_SHUTTLE_TELEGRAPH_MS` 1,250에 맞출 것),
  `animPhase === 'run'` 달리기 포즈 구현. 현재 `ZombieMesh.jsx`에 `'run'` 분기가 없어
  기본 idle/walk로 폴백한다.
- **balanceqa**: 위 acceptance criteria 9항 + RZT 선존재 결함 판정.
- **soundmini**: 필살기 예고음/질주음/충돌음 미배정.
