# 베기 계열 발전형 무기 2종 기획안 (2026-08-09)

소유자 지시로 구상한 **베기(slash) 계열 발전형 무기 2종**의 기획 초안이다.
확정 사양이 아니라 구현 착수 전 검토용 안이다. 스탯 수치의 정본은 언제나
`Developer/r3f_prototype/src/lib/weaponCatalog.js`이며, 이 문서의 수치는 초안이다.

- 「바이키티 커터칼」 — **커터칼 소지 시에만** 등장 → **2026-08-09 구현 착수**
- 「재단선」 — **30cm 자 + 커터칼 둘 다 소지 시에만** 등장 → 미착수

> **개명 이력**: 「L형 커터칼」 → **「바이키티 커터칼」** (2026-08-09 소유자 확정).
> 디자인도 함께 확정 — **하얀 고양이 머리 장식이 달린 공업용 커터칼**.

---

## 0. 설계 전제 — 기존 베기 무기의 정체성

`weaponCatalog.js` 실측 기준.

| 무기 | damage | cooldown | range | 특성 |
|---|---|---|---|---|
| `schoolBag` 30cm 자 | 12 | 1300 | 0.633 (triggerRange 1.0, swingMs 260) | 짧은 호 좌우 스윙, 등박자 연타 |
| `boxCutter` 커터칼 | 24 | 3250 | 1.4 (width 0.18) | 긴 직선 단발, knockback 1.8, crit 0.25/1.5 |

단일 대상 DPS는 자 9.2, 커터칼 7.4.

발전형은 **커터칼의 축(직선·얇음·한 방·고치명)** 을 밀어야 하고,
**자의 축(짧고 일정한 연타)** 을 침범하면 안 된다.
또한 `umbrellaGuard` 우산 방어막이 이미 360° 회전 광역을 점유하고 있으므로
회전 베기 방향은 사용하지 않는다.

---

## 1. 「바이키티 커터칼」 — 커터칼 발전형

### 선행 조건

커터칼(`boxCutter`) 보유.

### 디자인 (2026-08-09 소유자 확정)

**하얀 고양이 머리 장식이 달린 공업용(L형 대형) 커터칼.**
손잡이는 커터칼(노랑 0xffc928)과 구분되는 은회색/짙은 남색 계열,
그립 엔드에 오리지널 카툰 흰 고양이 머리(둥근 흰 머리·삼각 귀 2개·점 눈·작은 코).
날은 8단계로 눈에 띄게 길어지고, 단수가 오를수록 날 끝이 붉게 달아오른다(부러지기 직전 경고).

### 컨셉

실제 커터칼의 유일한 고유 동작은 **날 밀어내기와 꺾기**다.
카탈로그 17종 중 아무도 쓰지 않는 메커니즘이라 자와 겹칠 여지가 없다.
현실 그대로 **길게 뺄수록 잘 들지만 부러진다**를 그대로 규칙으로 쓴다.

### 동작 루프

1. 벨 때마다 날이 한 칸 나온다 → **사거리·위력이 매 타 증가** (1.0 → 2.26)
2. 8단째에 **날이 부러진다** → 그 자리에서 부러진 조각이 전방 90° 부채꼴 산탄(광역 1회)
3. **날 교체 1.2초** — 이 구간은 완전 무장해제

쌓고 → 터뜨리고 → 비는 **크레셴도 리듬**이다.
자는 평탄하고 커터칼은 단발이라, 세 무기가 리듬 축에서 겹치지 않는다.
재장전 공백이 이 무기의 유일한 리스크이자 밸런스 손잡이다.

### 스탯 초안

```js
bikittyCutter: {
  id: 'bikittyCutter',
  label: '바이키티 커터칼',
  base: {
    damage: 18, cooldown: 2400, range: 1.0, width: 0.18,
    knockback: 1.8, critChance: 0.25, critMultiplier: 1.5,
    segments: 8,             // 부러지기까지 타격 수
    segmentRangeStep: 0.18,  // 단수당 사거리 +
    segmentDamageStep: 0.12, // 단수당 위력 +12% (가산)
    snapDamage: 30, snapPellets: 8, snapArcDeg: 90, snapRange: 3.2,
    reloadMs: 1200,
  },
  minLevelToAppear: 6,
}
```

### 위력 계산 (초안 검산)

- 8타 위력 배수 합 = 8 + 0.12 × (0+1+…+7) = 11.36
- 사이클 총 피해 = 18 × 11.36 + snap 30 = **234.5**
- 사이클 시간 = 8 × 2.4s + reload 1.2s = **20.4s**
- 단일 대상 DPS ≈ **11.5** (치명타 제외)

커터칼(7.4)의 1.55배, 30cm 자(9.2)의 1.25배.
최대단 사거리 1.0 + 0.18×7 = **2.26** = 커터칼 1.4의 1.6배.
발전형으로 과하지 않고, 재장전 공백이 실전 DPS를 추가로 깎는다.

### 연출 방향

- 그래픽(threemini): 날이 눈에 보이게 한 칸씩 길어지고, 8단에서 붉게 달아오르다 부러지며 조각이 튄다.
- 사운드(soundmini): 딸깍(단 증가) ×8 → 챙(부러짐) → 스륵(새 날 밀어넣기).

---

## 2. 「재단선」 — 30cm 자 + 커터칼 합성형

### 선행 조건

30cm 자(`schoolBag`) **그리고** 커터칼(`boxCutter`) 둘 다 보유.

### 컨셉

자는 *직선을 긋는 도구*, 커터칼은 *자르는 도구*다.
합치면 **자를 대고 그은 완벽한 직선 절단**이 된다.
두 무기가 없으면 성립하지 않는다는 것이 이름부터 자명하다.

### 동작

1. 전방으로 **길이 6.0의 얇은 직선**을 긋는다 — 관통 무제한, 넉백 0 (자를 대고 그었으니 밀리지 않는다)
2. 그은 자리에 **절단선이 2초 남는다**
3. 그 선을 **가로지르는 적만** 잘린다 — 선 위에 서 있는 적은 맞지 않는다

서 있는 적을 지지는 장판이 아니라 **넘어오면 잘리는 선**이다.
밀려오는 웨이브 앞에 **미리 그어두는 선점형 견제 무기**라,
반응형인 자·커터칼·L형 전부와 역할이 겹치지 않는다.
카탈로그 17종 중 **선형 지속 존은 하나도 없다** (플라스크는 원형 웅덩이).

### 스탯 초안

```js
rulerCut: {
  id: 'rulerCut',
  label: '재단선',
  base: {
    damage: 20, cooldown: 4200,
    range: 6.0, width: 0.22,
    pierce: Infinity, knockback: 0,
    critChance: 0.35, critMultiplier: 2.0,  // 커터칼 0.25/1.5 계승·강화
    lineDurationMs: 2000,      // 남는 절단선
    lineCrossDamage: 14,       // 가로지를 때만 1회
    lineCrossCooldownMs: 600,  // 같은 적 재절단 간격
  },
  minLevelToAppear: 8,
}
```

### 밸런스 성격

직격 20 + 통과당 14. 단일 대상 DPS는 낮고, **좁은 복도(스테이지2)에서 폭발적으로 오른다.**
맵 폭에 따라 실효 위력이 갈리는 것이 이 무기의 **의도된 성질**이므로,
수치는 스테이지별로 따로 검증해야 한다 (balanceqa 소관).

### 연출 방향

- 그래픽(threemini): 바닥에 남는 붉은 절단선. 적이 가로지르는 순간 그 지점만 번쩍.
- 사운드(soundmini): 스윽(긋기) → 통과 시 짧은 서걱.

---

## 3. 네 무기 역할 대비표

| | 30cm 자 | 커터칼 | 바이키티 커터칼 | 재단선 |
|---|---|---|---|---|
| 사거리 | 0.633 | 1.4 | 1.0 → 2.26 | 6.0 |
| 형태 | 짧은 호 스윙 | 고정 직선 | 가변 직선 | 긴 직선 + 잔류선 |
| 리듬 | 1.3초 등박자 | 3.25초 단발 | 8타 크레셴도 → 폭발 → 공백 | 4.2초 선점 |
| 대상 | 붙은 적 | 앞의 한 놈 | 앞의 한 놈 | 길목 전체 |
| 넉백 | 없음 | 1.8 | 1.8 | 0 (관통) |
| 타이밍 | 반응 | 반응 | 반응 | **선점** |
| 리스크 | 없음 | 없음 | **재장전 1.2초 무장해제** | 빗나가면 완전 낭비 |

---

## 4. 선행 무기 소지 조건 — 배선은 이미 존재한다

**초판에서 "배선 신설 필요"라고 적었던 것은 틀렸다.** 계정 해금 계층
(`evaluateUnlocks`)과 런 중 카드 풀 필터를 혼동한 것이다. 실제로 필요한
**런 중 소지 조건**은 `upgrades.js`에 이미 구현돼 있다.

`src/lib/upgrades.js:168` (`isUpgradeAvailable` 내부):

```js
if (effect.requiresActiveWeapon && !weapons[effect.requiresActiveWeapon]?.active) return false
```

선례는 `upgrades.js:124` 하나코(치비코 선행):

```js
acquireHanako: { weapon: 'hanako', kind: 'acquire', requiresActiveWeapon: 'chibiko', skipAccountUnlock: true },
```

→ 바이키티 커터칼도 같은 패턴으로 끝난다:

```js
acquireBikittyCutter: {
  weapon: 'bikittyCutter', kind: 'acquire', minLevel: 6,
  requiresActiveWeapon: 'boxCutter', skipAccountUnlock: true,
},
```

### 재단선(무기 2종 동시 요구)만 남는 제약

`requiresActiveWeapon`은 **단일 무기 하나만** 받는다. 재단선은
"30cm 자 **그리고** 커터칼"이라 이 필드로 표현할 수 없다.
→ `requiresActiveWeapons: ['schoolBag', 'boxCutter']`(복수형 배열) 신설이
재단선 착수 시의 **유일한** 선행 작업이다. `evaluateUnlocks`는 건드릴 필요 없다.

### 참고 — `evaluateUnlocks`(계정 해금)는 별개 계층이고 여기 쓰지 않는다

```js
const v = Number(records[cond.type])
if (Number.isFinite(v) && v >= Number(cond.value)) { out.add(id); break }
```

숫자 임계값 전용 OR 평가기라 무기 ID 조건을 표현할 수 없다
(`Number('boxCutter')` = NaN). 두 무기 모두 `skipAccountUnlock: true`로
이 계층을 우회하므로 확장할 이유가 없다.
(참고: `CEO/docs/solutions/architecture-patterns/or-condition-weapon-unlock-evaluator-2026-05-19.md`)

### 착수 순서

1. ~~해금 배선 확장~~ — 불필요. 바이키티 커터칼은 기존 `requiresActiveWeapon`으로 충분
2. 카탈로그 등록 + 컴포넌트 구현 (levelmini / threemini) — **2026-08-09 착수**
3. SFX 3종 등록 (soundmini) — `bikittyCutterFire` / `bikittyCutterSnap` / `bikittyCutterReload`
4. 스테이지별 밸런스 검증 (balanceqa)
5. 재단선 착수 시에만: `requiresActiveWeapons` 복수형 신설

---

## 5. 미확정 사항

- 「재단선」 이름 소유자 확정 대기 (바이키티 커터칼은 2026-08-09 확정)
- 모든 스탯 수치는 초안. balanceqa 검증 전까지 정본 아님
- 영구 강화(코인샵) 편입 여부 미결
