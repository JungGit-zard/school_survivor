# Bang_Rules.md
> **이 문서는 BangBang Survivor 프로젝트의 최상위 정책 문서입니다.**
> 기획·개발·디자인 작업 시 반드시 이 문서를 먼저 참조하고, 내용에 위배되는 수치·설계를 사용하지 마십시오.

---

## 1. 단위 기준 (Unit Standard)

### 1-1. 블록(Block) 정의
- **1 블록 = 필드에서 눈에 보이는 바닥 타일 1칸**
- 엔진 내부 단위: **1 블록 = 4 units** (Three.js / Rapier 물리 좌표계 기준)
- 모든 거리·크기·범위 수치를 기획서·코드에 기재할 때는 반드시 **블록 단위**를 병기한다.
  - 예시: `range: 22 units (5.5 블록)`

### 1-2. 맵 크기
| 항목 | 블록 | units |
|------|------|-------|
| 맵 가로·세로 | **24 블록** | 96 units |
| 경계 벽 위치 | ±12 블록 | ±48 units |

### 1-3. 카메라 줌
- Orthographic zoom **60** = 화면에 가로 약 **17 블록** 가시
- 줌 수치 변경 시 이 문서에도 반영 필수

---

## 2. 물리 좌표계 (Physics Coordinate System)

- Y축 중력: **0** (위에서 내려다보는 탑다운, 중력 없음)
- 플레이어 발바닥 Y: **≈ 0.32 units** (Collider 반높이)
- 모든 충돌 판정은 **XZ 평면** 기준

---

## 3. 플레이어 기준 수치 (Player Reference Values)

| 항목 | 기본값 | 단위 |
|------|--------|------|
| 이동속도 | 3 | units/s |
| 최대 HP | 100 | — |
| 무적 시간 | 520 ms | — |
| 충돌 반경 | 0.192 units | 0.048 블록 |

---

## 4. 적 기준 수치 (Enemy Reference Values)

| ID | 이름 | 속도 (units/s) | HP | 접촉 데미지 | 접촉 거리 (units) |
|----|------|---------------|----|------------|-----------------|
| E01 | 기본 | 0.95 | 18 | 8 | 0.28 |
| E02 | 빠름 | 0.55 | 55 | 14 | 0.36 |
| E03 | 유리 | 1.1 | 10 | 6 | 0.22 |
| E04 | 원거리 | 0.45 | 35 | 8 | 3.5–5.5 유지 |
| E05 | 돌진 | 0.5 | 70 | 16 | 돌진 시 1.7 |
| E06 | 엘리트 | 0.6 | 240 | 20 | 0.42 |
| B01 | 보스 | 0.475 | 1200 | 22 | — |

**스폰 반경 기준:**
- 일반 적: 플레이어 기준 8.5–12.5 units (2.1–3.1 블록)
- E04 원거리: 11.5–15.5 units (2.9–3.9 블록)

---

## 5. 무기 기준 수치 (Weapon Reference Values)

| 무기 | 쿨다운 (ms) | 기본 데미지 | 사거리 (units) | 비고 |
|------|-----------|------------|--------------|------|
| 연필 던지기 | 900 | 9 | 22 (5.5 블록) | 최대 4발, 관통 0–3 |
| 책가방 휘두르기 | 1000 | 22 | 0.633 (근접) | 0.387 이내 적 있을 때 발동 |
| 텀블러 궤도 | 상시 | 10 | 궤도 반경 1.0 | 초당 3.5회 타격, 1–3개 |
| 과학 플라스크 | 2600 | 32 | 18 (4.5 블록) | 폭발 반경 1.6–2.4 |
| 종 충격파 | 4200 | 14 | 반경 1.7 | 8방향 레이, 넉백 4.8 |
| 스턴건 | 2800 | 22 | 체인 2–4 | 현재 잠김 |

---

## 6. 게임 타임라인 (Game Timeline)

| 구간 | 시간 | 내용 |
|------|------|------|
| 초반 | 0–60s | E01 위주, 점진 증가 |
| 중반 | 60–180s | E01~E06 모두 등장 |
| 후반 | 180–240s | 최대 밀도 |
| 보스전 | 240–300s | B01 소환, 동시 적 수 45 제한 |
| 클리어 | 300s (5분) | 스테이지 클리어 |

---

## 7. XP & 레벨업 (Progression)

- 초기 XP 임계값: **6**
- 레벨업 후 임계값: `ceil(xpToNext × 1.24 + 2)`
- 레벨업 시 랜덤 업그레이드 3종 선택 (총 16종 풀)

---

## 8. 성능 제한 (Performance Limits)

| 항목 | 제한값 |
|------|--------|
| 일반 구간 최대 동시 적 수 | 85 |
| 보스 구간 최대 동시 적 수 | 45 |
| 아이템 스폰 간격 | 5.2–7.4s |

---

## 9. 개발 정책 (Development Policy)

1. **단위 혼용 금지** — 기획서와 코드 모두 블록 단위와 units를 병기한다. units만 단독 사용 금지.
2. **수치 변경 시 이 문서 우선 수정** — 코드를 먼저 바꾸고 문서를 나중에 고치는 방식 금지.
3. **신규 적/무기 추가 시** — 이 문서의 해당 표에 먼저 등록 후 구현.
4. **맵 크기·카메라 줌 변경 금지** — 전체 수치 재조정이 필요한 근본 변경이므로, 반드시 별도 논의 후 이 문서를 개정.
5. **물리 중력 유지** — `gravity: [0, 0, 0]` 탑다운 정책 유지. 변경 시 전 시스템 검토 필요.
6. **gameKey 패턴 유지** — 게임 재시작 시 Physics 트리 전체 리마운트 방식(`gameKey` 증가)을 유지. 부분 리셋 금지.

---

## 10. 디렉터리 구조 요약 (Quick Reference)

```
BangBang_survivor/
├── Bang_Rules.md              ← 이 문서 (최우선 참조)
├── Planner/                   ← 기획 문서
├── Graphic_designer/          ← 비주얼 가이드
├── CEO/                       ← 서비스 목표
└── Developer/
    ├── git_branch_addresses_2026-04-27.md
    └── r3f_prototype/src/
        ├── store/useGameStore.js
        ├── lib/refs.js
        ├── lib/toon.js
        └── components/        ← 모든 게임 컴포넌트
```

---

*최초 작성: 2026-05-01 | 작성자: Claude (claude/fixes-and-review 브랜치)*

---

## 2026-05-03 Current Implementation Addendum

This section records the current accepted implementation values after the 2026-05-03 review.

### Stage Timing

- Boss B01 spawn timing: 240 seconds (4:00).
- Stage clear timing: 300 seconds (5:00).

### Starting Weapon Rule

- Start active weapon count: 1.
- Start active weapon: `pencilThrow`.
- `schoolBag` / 30 cm ruler and `tumbler` start inactive and are unlocked from level-up choices.

### Current Weapon Values

| Weapon key | Current role | Start active | Core values |
| --- | --- | --- | --- |
| `pencilThrow` | Basic projectile | Yes | Damage 9, cooldown 900 ms, range 22 units (5.5 blocks) |
| `schoolBag` | Close ruler swing defense | No | Damage 22, cooldown 1000 ms, range 0.633 units, trigger range 1.0 unit |
| `tumbler` | Orbiting close defense | No | Damage 10, radius 1.0 unit (0.25 blocks), 3.5 hits/sec |
| `scienceFlask` | Dense group splash | No | Damage 32, cooldown 2600 ms, target range 2 units (0.5 blocks), splash radius 1.6 units (0.4 blocks) |
| `bell` | 8-direction shockwave | No | Damage 14, cooldown 4200 ms, radius 1.7 units |
| `stunGun` | Chain attack | No | Damage 22, cooldown 2800 ms, chain count 2 |
| `guidedMissile` | Power-bank missile splash | No | Damage 16, cooldown 4000 ms, range 22 units (5.5 blocks), radius 1.6 units |
| `starlink` | Random nearby lightning | No | Damage 28, cooldown 3800 ms, strike center within 5 units (1.25 blocks), strike radius 1.2 units |
| `onigiri` | Bouncing multi-target projectile | No | Damage 18, cooldown 1800 ms, range 18 units (4.5 blocks), 4 bounces, bounce range 4.5 units |

### Notes

- Science Flask keeps the current implemented range because the current feel was accepted.
- Starlink documentation uses 5 units, not 5 blocks, because that is the current implementation.

---

## 2026-05-06 Stage 1 Re-balance Addendum

This section records the new accepted values after the 2026-05-06 full re-planning.
근거: `Planner/stage1_replan_2026-05-06.md` and `Planner/Ref_Vampire_GameDesign/`.

### Re-balance Principle

- 데미지는 절대값보다 **"몇 방에 죽는가"** 기준 (게임데미지공식기획기준).
- 후반 압박은 개별 HP 상승보다 **스폰 수와 적 조합** 으로 만든다.

### New Weapon Values (Lv.1 base)

| Weapon key | Lv.1 damage | Cooldown | Lv.5 damage |
| --- | --- | --- | --- |
| `pencilThrow` | 8 | 1100 ms | 20 |
| `schoolBag` | 12 | 1300 ms | 32 |
| `tumbler` | 4 | 0.4s tick | 12 |
| `scienceFlask` | 30 | 2800 ms | 62 |
| `bell` | 10 | 4500 ms | 26 |
| `stunGun` | 18 | 3000 ms | 38 |
| `guidedMissile` | 18 | 4200 ms | 42 |
| `starlink` | 22 | 4000 ms | 50 |
| `onigiri` | 14 | 2000 ms | 34 |

### New Enemy Values

| ID | 이름 | HP | 속도 | 접촉 데미지 | XP |
| --- | --- | --- | --- | --- | --- |
| E01 | 잡몹 | 12 | 0.95 | 8 | 1 |
| E02 | 탱커 | 70 | 0.55 | 14 | 3 |
| E03 | 러너 | 14 | 1.10 | 6 | 1 |
| E04 | 원거리 | 32 | 0.45 | 8 | 2 |
| E05 | 돌진 | 70 | 0.50 | 16 | 3 |
| E06 | 거대 | 320 | 0.60 | 20 | 12 |
| B01 | 보스 | 1400 | 0.475 | 22 | 0 |

### Weapon Slot / Level Caps

- Max owned weapons: 4
- Max weapon level: Lv.5
- Stage 1 target end-state: 2–3 weapons at Lv.5

### Weapon Unlock Gating (1st service)

- Schoolbag / Tumbler: card visible from Lv.2.
- Flask / Bell: card visible from Lv.4.
- StunGun / GuidedMissile: card visible from Lv.6.
- Starlink / Onigiri: card visible from Lv.8.
- Reserved (planned): `compass`, `umbrella`, `eraser`, `notebook`.
