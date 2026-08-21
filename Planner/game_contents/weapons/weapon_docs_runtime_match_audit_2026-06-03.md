# Weapon Docs Runtime Match Audit

Date: 2026-06-03
Scope: weapon planning documents vs current runtime implementation
Reviewer: Codex + documentation specialist subagent Mendel

## 1. 검수 기준

이번 검수는 아래 구현 파일을 현재 런타임 기준으로 본다.

- `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- `Developer/r3f_prototype/src/lib/upgrades.js`
- `Developer/r3f_prototype/src/lib/weaponUnlocks.js`
- `Developer/r3f_prototype/src/components/HUD.jsx`
- `Developer/r3f_prototype/src/components/Weapons/index.js`
- `Developer/r3f_prototype/src/store/useGameStore.js`

문서 기준 파일은 아래 4개다.

- `Planner/game_contents/weapons/weapon_expansion_unlock_plan_2026-05-10.md`
- `Planner/game_contents/weapons/weapon_list.md`
- `Planner/game_contents/weapons/weapon_upgrade_flow_and_unlock_plan_2026-05-14.md`
- `Planner/game_contents/weapons/Weapons_modify.md`

## 2. 현재 구현 무기 요약

현재 `WEAPON_CATALOG` 기준 구현 무기는 13종이다. 시작 해금 무기는 8종이고, 누적 조건으로 열리는 무기는 5종이다.

| ID | 구현 상태 | 해금 분류 | 카드 노출 레벨 | 문서 매칭 상태 |
| --- | --- | --- | ---: | --- |
| `pencilThrow` | 구현됨 | 시작 해금, 시작 지급 | 1 | 대체로 일치 |
| `schoolBag` | 구현됨 | 시작 해금 | 2 | 대체로 일치 |
| `boxCutter` | 구현됨 | 시작 해금 | 2 | `weapon_list.md` 표에서 누락 |
| `tumbler` | 구현됨 | 시작 해금 | 2 | 대체로 일치 |
| `scienceFlask` | 구현됨 | 시작 해금 | 4 | 대체로 일치 |
| `bell` | 구현됨 | 시작 해금 | 4 | 대체로 일치 |
| `stunGun` | 구현됨 | 시작 해금 | 6 | 대체로 일치 |
| `onigiri` | 구현됨 | 시작 해금 | 8 in catalog, 6 in upgrade card | 내부 코드와 문서 모두 재정렬 필요 |
| `guidedMissile` | 구현됨 | 누적 플레이 5회 | 4 | 문서는 Lv.6 또는 미확정으로 남아 있음 |
| `starlink` | 구현됨 | 누적 플레이 10회 또는 누적 처치 5000 | 8 | 대체로 일치하나 문서가 10-20회로 넓게 적힘 |
| `compassBlade` | 구현됨 | 한 판 처치 80 또는 누적 처치 200 | 3 | 최종 표와 일치, 초기 표와 불일치 |
| `umbrellaGuard` | 구현됨 | 한 판 생존 90초 또는 누적 생존 300초 | 3 | 최종 표와 대체로 일치, 스탯은 구현값 우선 |
| `eraserBomb` | 구현됨 | 한 판 골드 80 또는 누적 골드 200 | 4 | 최종 표와 일치, 초기 표와 불일치 |

## 3. 문서별 판정

| 문서 | 현재 판정 | 이유 |
| --- | --- | --- |
| `weapon_list.md` | 현재 정본 후보이나 수정 필요 | 구현 기준 파일을 참조하지만 13종 중 `boxCutter`가 표와 컴포넌트 맵에 빠져 있다. 날짜도 2026-05-24라 현재 구현과 다시 맞춰야 한다. |
| `weapon_upgrade_flow_and_unlock_plan_2026-05-14.md` | 일부 과거 기준 | 1차 서비스 9종, 기본 7종 기준으로 작성되어 현재 13종/시작 8종과 다르다. 5분 흐름 설명은 참고 가능하지만 현재 카탈로그 정본으로 쓰면 안 된다. |
| `weapon_expansion_unlock_plan_2026-05-10.md` | 확장 로드맵/히스토리 | 10종 확장안 중 `compassBlade`, `umbrellaGuard`, `eraserBomb`만 현재 구현되었다. 나머지는 미래 후보이며, 문서 내 초기 조건과 후반 최종 표가 서로 다른 곳이 있다. |
| `Weapons_modify.md` | 손상된 레퍼런스 | 본문 인코딩이 깨져 현재 사양 문서로 쓰기 어렵다. 읽히는 ID 기준으로는 광역 무기 필요성, `scienceFlask`, `guidedMissile`, `eraserBomb` 등의 논의 흔적이 있다. |

## 4. 주요 불일치

### 4-1. 구현 무기 수

- 구현: 13종
- `weapon_list.md`: 12종
- `weapon_upgrade_flow_and_unlock_plan_2026-05-14.md`: 1차 서비스 9종, 기본 7종
- `weapon_expansion_unlock_plan_2026-05-10.md`: 본문 말미에 1차 서비스 9종 표가 남아 있음

정리: 현재 구현 기준 문서에는 13종을 적어야 한다.

### 4-2. `boxCutter` 누락

`boxCutter`는 현재 구현에서 시작 해금 무기이며 `Weapons/index.js`에도 `BoxCutterWeapon`으로 export되어 있다. `upgrades.js`에도 획득 카드와 강화 카드가 있다.

하지만 `weapon_list.md`의 구현 무기 표와 컴포넌트 맵에는 빠져 있다. 이 문서를 정본으로 쓰려면 `boxCutter`를 3번 또는 별도 순번으로 추가해야 한다.

### 4-3. 시작 무기 수

- 구현 시작 해금: `pencilThrow`, `schoolBag`, `boxCutter`, `tumbler`, `scienceFlask`, `bell`, `stunGun`, `onigiri`
- 구현 시작 지급: `pencilThrow`
- 과거 문서: 기본 7종 중심으로 설명

정리: 시작 해금은 8종, 실제 런 시작 지급은 `pencilThrow` 1종으로 분리해서 적어야 한다.

### 4-4. 최대 보유 무기 슬롯

`upgrades.js`의 현재 값은 `MAX_OWNED_WEAPONS = 8`이다. 과거 문서에 4개 제한 또는 9종 카탈로그 흐름이 남아 있으면 현재 런타임과 맞지 않는다.

정리: 현재 규칙 문서에는 한 판 최대 보유 무기 8개를 명시해야 한다.

### 4-5. `onigiri` 카드 노출 레벨

- `weaponCatalog.js`: `minLevelToAppear: 8`
- `upgrades.js`: `acquireOnigiri.minLevel: 6`
- `weapon_upgrade_flow_and_unlock_plan_2026-05-14.md`: Lv.8 이상
- `weapon_expansion_unlock_plan_2026-05-10.md`: Lv.8 이상

정리: 코드 내부가 서로 다르다. 실제 카드 노출은 `upgrades.js`의 `isUpgradeAvailable`이 사용되므로 Lv.6에 열릴 가능성이 크다. 기획 의도가 Lv.8이면 `upgrades.js`를 고쳐야 하고, 현재 체감을 유지하려면 문서를 Lv.6으로 고쳐야 한다.

### 4-6. `onigiri` 쿨다운

- 구현: 5000ms
- `weapon_upgrade_flow_and_unlock_plan_2026-05-14.md`: 2000ms

정리: 현재 구현 기준으로는 5000ms가 맞다.

### 4-7. `guidedMissile`

- 구현 해금: 누적 플레이 5회
- 구현 카드 노출: Lv.4
- 과거 문서: 누적 플레이 5-10회 또는 별도 도전 조건, Lv.6 이상

정리: 현재 운영 기준은 누적 플레이 5회 + Lv.4로 봐야 한다.

### 4-8. `starlink`

- 구현 해금: 누적 플레이 10회 또는 누적 처치 5000
- 구현 카드 노출: Lv.8
- 과거 문서: 누적 플레이 10-20회 또는 누적 처치 5000

정리: 현재 운영 기준은 누적 플레이 10회 또는 누적 처치 5000이다.

### 4-9. 신규 3종 구현 반영

`compassBlade`, `umbrellaGuard`, `eraserBomb`는 더 이상 단순 제안이 아니라 구현 완료 무기다.

| ID | 현재 구현 조건 | 문서 주의점 |
| --- | --- | --- |
| `compassBlade` | 한 판 처치 80 또는 누적 처치 200 | 초기 표의 누적 처치 100은 과거안으로 봐야 한다. |
| `umbrellaGuard` | 한 판 생존 90초 또는 누적 생존 300초 | 초기 표의 최고 생존 2분은 과거안으로 봐야 한다. 구현 스탯은 피해 12, 쿨다운 3600ms, 반경 1.25다. |
| `eraserBomb` | 한 판 골드 80 또는 누적 골드 200 | 초기 표의 누적 골드 100은 과거안으로 봐야 한다. |

### 4-10. 문서에만 있는 미래 후보

아래 항목은 현재 `WEAPON_CATALOG`에 없다. 구현 무기가 아니라 확장 후보로 분리해야 한다.

- `notebookBoomerang`
- `chalkLine`
- `deskPush`
- `lockerDoor`
- `cleaningMop`
- `broadcastSpeaker`
- `fireExtinguisher`

## 5. 권장 정리 방식

1. `weapon_list.md`를 현재 무기 카탈로그 정본으로 승격한다.
2. `weapon_list.md`에 `boxCutter`를 추가하고 총 13종, 시작 해금 8종, 누적 해금 5종을 명시한다.
3. `weapon_upgrade_flow_and_unlock_plan_2026-05-14.md`는 5분 성장 흐름 참고 문서로 유지하되, 상단에 "현재 구현과 일부 다름" 표시를 붙인다.
4. `weapon_expansion_unlock_plan_2026-05-10.md`는 확장 로드맵/히스토리 문서로 유지하고, 구현 완료 3종과 미래 후보 7종을 분리한다.
5. `Weapons_modify.md`는 인코딩 복구 전까지 현재 사양 근거로 쓰지 않는다.
6. `onigiri`의 Lv.6/Lv.8 불일치는 코드 또는 문서 중 하나를 선택해 맞춘다.
7. `weaponCatalog.test.js`의 주석/테스트명도 12종, starter 7종 같은 과거 문구가 남아 있으므로 13종, starter 8종으로 정리한다.

## 6. 결론

현재 구현과 가장 가까운 문서는 `weapon_list.md`지만, `boxCutter` 누락 때문에 그대로 정본으로 쓰기에는 위험하다.

현 시점의 정확한 기준은 다음과 같다.

- 전체 구현 무기: 13종
- 시작 해금 무기: 8종
- 시작 지급 무기: `pencilThrow` 1종
- 누적 해금 무기: `guidedMissile`, `starlink`, `compassBlade`, `umbrellaGuard`, `eraserBomb`
- 한 판 최대 보유 무기: 8개
- 가장 먼저 고칠 정합성 문제: `weapon_list.md`의 `boxCutter` 누락, `onigiri` Lv.6/Lv.8 불일치
