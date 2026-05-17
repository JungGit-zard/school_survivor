# Current Game Rules

Last updated: 2026-05-16

## 1. 게임 정체성

BangBang Survivor는 학교 콘셉트의 5분 생존형 미니게임이다.

현재 목표는 장식적인 구조보다 플레이 가능한 1스테이지 루프를 안정화하는 것이다.

## 2. 현재 Stage 1 기준

- 플레이 시간: 5분
- 300초 도달 시 클리어
- HP 0 도달 시 게임오버
- 현재 초기 상태는 별도 `start` 없이 바로 `playing`
- 일시정지는 키보드 `p` 기준으로 동작
- 모바일 pause/resume UI는 HUD 버튼으로 제공한다.

## 3. 적 구성

현재 Stage 1 스폰 기준:
- E01
- E02
- E03
- E05
- E06
- B01

현재 Stage 1 제외 기준:
- E04는 웨이브/버스트 테이블에서 제외
- 단, 코드에는 E04 원거리/투사체 실행 경로가 남아 있으므로 회귀 방지 필요

## 4. 보스 기준

- B01은 240초에 1회 등장한다.
- 현재 B01은 추격/돌진 중심이다.
- Stage 1에서는 B01 부채꼴 투사체 패턴을 쓰지 않는 방향이다.
- B01 기본 `xp`는 0이지만 보너스 교과서는 별도 XP 값을 사용한다.

## 5. 성장과 보상

- XP는 교과서 형태로 드랍된다.
- 일반 적 교과서 드랍 확률은 30% 기준이다.
- 골드는 시간 기반 코인과 엘리트/보스 처치 보상으로 획득한다.
- 골드 누적은 `localStorage`의 `school_survivor:goldTotal` 키를 사용한다.

현재 위험:
- 시간 기반 골드 코인은 최악 분포에서 5분 8개만 나올 수 있다.

## 6. 무기 기준

### 1차 서비스 무기 총수 (2026-05-17 확정)

1차 서비스 무기 카탈로그는 **총 9종**이다. 7종은 플레이어 레벨 카드 게이트로 즉시 접근 가능하며, 2종은 계정 누적 조건이 충족된 계정에서 추가 해금되어 동일한 카드 풀에 진입한다.

### 카드 게이트 (정본: `Planner/Weapons/weapon_upgrade_flow_and_unlock_plan_2026-05-14.md` §2)

| 무기 | 카드 등장 조건 | 비고 |
|---|---|---|
| `pencilThrow` / 연필 | 시작 지급 | 기본 활성 |
| `schoolBag` / 30cm 자 | Lv.2 이상 | – |
| `tumbler` / 텀블러 궤도 | Lv.2 이상 | – |
| `scienceFlask` / 과학 플라스크 | Lv.4 이상 | – |
| `bell` / 종 충격파 | Lv.4 이상 | – |
| `stunGun` / 전기 스턴건 | Lv.6 이상 | – |
| `onigiri` / 오니기리 팡팡 | Lv.8 이상 | 2026-05-17 정정 (Bang_Rules 임시 Lv.6 표기 폐기) |
| `guidedMissile` / 보조배터리 미사일 | 계정 누적 해금 후 Lv.6 이상(1차안) | 메타프로그레션 도입 시 확정 |
| `starlink` / 고장난 스타링크 | 계정 누적 해금 후 Lv.8 이상(1차안) | 메타프로그레션 도입 시 확정 |

### 누적 플레이 해금 (`guidedMissile`, `starlink`)

다음 무기는 **누적 플레이 횟수 / 누적 조건이 충족된 계정에서 해금되어 카드 풀에 진입**한다. 일시 코드 제거 상태이며, 메타프로그레션이 도입되는 시점에 복귀한다.

| 무기 | 한글명 | 해금 트리거 (잠정) | 코드 상태 |
|---|---|---|---|
| `guidedMissile` | 보조배터리 미사일 | 누적 플레이 N회 후 (TBD: 5–10회 권장) 또는 별도 도전 조건 | 코드 일시 제거 (`Weapons/Missile.jsx`, `UPGRADE_EFFECTS`의 `unlockMissile/missileDamage/missileCount`) — 복원 필요 |
| `starlink` | 고장난 스타링크 | 누적 플레이 N회 후 (TBD: 10–20회 권장) 또는 누적 처치 5000마리 | 코드 일시 제거 (`Weapons/Starlink.jsx`, `UPGRADE_EFFECTS`의 `unlockStarlink/starlinkDamage/starlinkCount`) — 복원 필요 |

### 메타 해금 처리 원칙

- 1차 서비스 9종 무기 풀 중 본 계정의 누적 조건이 충족된 무기(`guidedMissile`, `starlink`)는 1스테이지 `levelup` 카드 후보에 포함된다.
- 해금된 무기는 4-보유 상한과 Lv.5 상한 룰을 동일하게 따른다.
- 누적 플레이 횟수 카운터(가칭 `runCount`)와 누적 처치 수(가칭 `kills`)는 `localStorage`에 영구 저장된다.
- 정확한 트리거 수치, UI(해금 알림), 카탈로그 표시 등은 `Planner/Essential_game_plan/`에 별도 메타프로그레션 기획 문서가 작성된 이후 확정한다.
- 신규 무기 10종(`compassBlade` 외)의 해금 조건은 **OR 원칙**(실력 조건 ∨ 누적 조건)으로 작성한다. 정본은 `Planner/Weapons/weapon_expansion_unlock_plan_2026-05-10.md` §7.

> 작업 우선순위 메모: 단일 런 밸런스 검증과 출근길 친화 작업이 1차 완료된 뒤, 메타프로그레션 기획 → 본 절의 해금 무기 복원 → 코인상점 패시브 카탈로그(`commuter_friendly_implementation_request_2026-05-17.md` §7) 순서로 진행한다.

구현 구조:
- 기존 `Weapons.jsx` 단일 파일은 삭제됐다.
- 현재는 `Developer/r3f_prototype/src/components/Weapons/` 아래 무기별 파일과 `index.js` barrel 구조를 쓴다.
- 누적 해금 무기 복원 시 동일 폴더에 `Missile.jsx` / `Starlink.jsx`를 다시 추가하고, `index.js` barrel에 re-export 라인을 복원한다.

## 7. 다음 규칙 판단 시 주의

- 새 기획은 반드시 `Planner/`에 먼저 기록한다.
- 5분 생존 루프를 흔드는 변경은 QA 기준을 먼저 만든다.
- 모바일 조작이 빠진 기능은 완료로 보지 않는다.
- 검증하지 않은 기능을 검증 완료로 기록하지 않는다.
