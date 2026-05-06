# Vampire Survivors — 데미지 공식 & 레벨업 메카닉 정리

> ※ 원본 Reddit 포스트(r/VampireSurvivors/comments/164e9zp) 직접 접근 불가.  
> 공식 Wiki 및 커뮤니티 문서에서 동일 내용 수집. 조사일: 2026-05-05

---

## 1. 데미지 계산 공식

### 기본 구조

```
최종 데미지 = 무기 기본 데미지 × (totalMight / 100)
```

- **Might**(공격력) 기본값: **100%** (패널엔 차이값 표시 → 패널 `+30%` = 실제 130%)
- 모든 Might 소스(캐릭터 보너스, PowerUp, 아이템, Arcana)는 **가산 합산**
- **상한선: 총 1000%** (패널 기준 +900%)

**예시:**  
무기 기본 30 데미지, Might 패널 +70% (실제 170%) → `30 × 1.7 = 51`

### 특수 상호작용

| 조건 | 효과 |
|---|---|
| SpellStrike 무기 | Might에 추가 **×1.25** 곱연산 적용 |
| Stanley 캐릭터 | Might +10%마다 Armor +1 |
| Dracula 캐릭터 | Curse 1%당 Might +1% 연동 |

---

## 2. 방어 (Armor) 공식

```
실제 받는 피해 = 입력 데미지 - Armor 포인트
최솟값: 항상 1 이상 (무적 불가)
```

- Armor 1포인트 = 피해 **-1** (단순 감산)
- **반격 데미지 보너스**: Armor 1포인트당 +10%, **최대 +500% (Armor 50포인트 캡)**

---

## 3. 레벨업 XP 공식

### 3단계 증가 구조

| 구간 | 레벨 간 XP 증가량 | 비고 |
|---|---|---|
| Phase 1: Lv 1→20 | **+10 XP/레벨** | 첫 레벨(1→2)만 5 XP |
| Phase 2: Lv 21→40 | **+13 XP/레벨** | |
| Phase 3: Lv 41+ | **+16 XP/레벨** | |

### 각 레벨 구간 XP 필요량

```
Phase 1: Lv n → n+1 필요량 = 10n - 5   (n = 1~19)
  예) Lv 1→2: 5 XP, Lv 2→3: 15 XP, Lv 3→4: 25 XP ...

Phase 2: 전 레벨 대비 +13씩 증가
Phase 3: 전 레벨 대비 +16씩 증가
```

### 누적 XP 주요 체크포인트

| 레벨 | 누적 필요 XP |
|---|---|
| 2 | 5 |
| 3 | 20 |
| 5 | 80 |
| 10 | 405 |
| 15 | 980 |
| 20 | 1,805 |
| **21** | **2,600** ← 점프 (+600 페널티) |
| 30 | 5,466.5 |
| 40 | 9,886.5 |
| **41** | **12,800** ← 점프 (+2400 페널티) |
| 60 | 27,848 |

### 레벨 20 / 40 특수 처리

- Lv 20→21: 추가 **+600 XP** 요구
- Lv 40→41: 추가 **+2400 XP** 요구
- 보상: 해당 레벨에서 **일시적 Growth +100%** 부여 → 다음 레벨 도달 시 −100% 환수

---

## 4. Growth (경험치 배율) 공식

```
실제 획득 XP = 젬 기본 XP × (totalGrowth / 100)
```

- 기본값: **100%** (패널은 차이값 표시)
- 모든 소스 **가산 합산**
- 상한선 없음

**최대 Growth 조합 예시:**  
Gains Boros(+2%/레벨) + PowerUp 5랭크(+15%) + Crown Lv5(+40%) = `+(2 × 플레이어레벨 + 55)%`

---

## 5. Curse (적 강화) 공식

```
스폰 주기:  effectiveSpawnInterval = spawnInterval / totalCurse
적 체력:    적 기본 HP × (totalCurse / 100)
적 이동속도: 기본 속도 × (totalCurse / 100)
```

- 기본값: **100%**, 패널은 차이값 표시
- 같은 종류의 배율끼리 **승산 합산**
- 체력 배율은 **즉시 적용** (새로 스폰되는 적부터), 나머지는 다음 분 시작 시 적용

---

## 6. 레벨업 시 4번째 선택지 확률

```
chanceFourth = 1 − (1 / totalLuck)
```

Luck이 높을수록 레벨업 선택지가 4개가 될 확률 상승.

---

## 핵심 요약

```
데미지   = 무기BaseDmg × (Might합계/100)
받는피해  = 입력데미지 - Armor  (최소 1)
XP필요량  = Phase별 점증 (10→13→16 증가), Lv20/40에 큰 점프
실효XP   = 젬XP × (Growth/100)
적체력   = 기본HP × (Curse/100)
스폰속도  = 기본주기 / (Curse/100)
```

---

## Sources

- [Level up — Vampire Survivors Wiki](https://vampire.survivors.wiki/w/Level_up)
- [Might — Vampire Survivors Wiki](https://vampire.survivors.wiki/w/Might)
- [Armor (stat) — Vampire Survivors Wiki](https://vampire.survivors.wiki/w/Armor_(stat))
- [Growth — Vampire Survivors Wiki](https://vampire.survivors.wiki/w/Growth)
- [Curse — Vampire Survivors Wiki](https://vampire.survivors.wiki/w/Curse)
- [Player stats — Vampire Survivors Wiki (Fandom)](https://vampire-survivors.fandom.com/wiki/Player_stats)
