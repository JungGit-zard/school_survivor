---
module: weapon-unlocks
tags: [firebase, weapon, unlock, qa, migration]
problem_type: implementation_plan
date: 2026-08-22
kanban: t_81c0fb65
---

# 무기 해금 체계: Firebase 정본·QA 구현 계획

## 범위와 결론

이 문서는 무기 해금 체계를 구현할 때의 Firebase 정본, 런 종료 처리, 마이그레이션, 검수 기준만 정의한다. 코드·Firebase 데이터·규칙은 이 계획 작성에서 변경하지 않았다.

권장 방향은 **카탈로그의 조건 정의 + Firebase `progress.records` 누적 사실 + Firebase `progress.weaponUnlocks`의 한 번 획득한 권리** 세 가지로 제한한다. 브라우저 저장소, OAuth 토큰 복제, 별도 로컬 해금 캐시, 조건 완료/보상 수령 이중 장부는 만들지 않는다.

## 현재 구현 추적

| 구간 | 현재 동작 | 확인 위치 |
| --- | --- | --- |
| 무기 정본 | `WEAPON_CATALOG` 20종, starter 13종과 계정 해금 7종을 보유한다. 조건 배열은 OR로 평가한다. | `src/lib/weaponCatalog.js` |
| 해금 권리 | non-starter만 `progress.weaponUnlocks[weaponId] = 1`로 저장한다. starter는 플래그 없이 항상 해금으로 취급한다. | `src/lib/weaponUnlocks.js` |
| 조건 평가 | `evaluateUnlocks()`가 누적 기록과 이번 런 값을 함께 받아 해금 가능 ID 집합을 만든다. | `src/lib/weaponCatalog.js` |
| 실제 게임 이벤트 | 일반/보스 적 사망은 `recordKill()`을, 스테이지 클리어는 `_onRunEnd('cleared')`를 거친다. | `src/components/Enemy.jsx`, `src/components/Enemies.jsx`, `src/store/useGameStore.js` |
| 런 종료 | 평가 → 새 해금 diff → `weaponUnlocks` 반영 → 누적 기록 snapshot → 저장 요청 순서다. | `src/store/useGameStore.js` |
| Firebase 저장 | 로그인된 사용자에 대해 `users/{uid}` 전체 snapshot을 write queue로 직렬 저장한다. | `src/lib/firebaseProgress.js` |
| 규칙 | 현재 `weaponUnlocks/$weaponId`는 값 `1`만 허용한다. | `database.rules.json` |

현재 해금 조건은 `runKills`, `runSurvivalSeconds`, `runGold`, `totalRuns`, `totalKills`, `stage1Clears` 등으로 이미 동작한다. 예: 오리요강은 한 판 80처치 또는 누적 200처치, 우산은 한 판 90초 생존 또는 누적 300초 생존이다.

### 저장 시점과 미hydrate 상태

- 정상 흐름은 Firebase Auth 사용자에 대한 원격 snapshot hydrate가 끝난 뒤에만 `records`와 `weaponUnlocks`를 업데이트하고 저장 요청한다.
- hydrate 전·오프라인·원격 읽기 실패 시 게임 플레이와 런 종료는 계속된다. 이번 런 조건으로 새 해금 알림은 만들 수 있지만, 영구 기록과 영구 해금은 저장하지 않는다.
- Firebase에 연결되지 않은 상태에서 브라우저 localStorage, IndexedDB, 임시 JSON으로 해금을 보관하거나 다음 실행에 복원하면 안 된다.
- 현재 write queue는 **한 브라우저 탭 안의 요청 순서만** 직렬화한다. 서로 다른 기기/탭의 전체 snapshot 저장은 마지막 write가 상대 기기 기록을 덮어쓸 수 있다.

## 권장 단일 정본 모델

`users/{uid}/progress` 안에서 다음 의미를 고정한다.

| 데이터 | Firebase 저장 | 산출/사용 원칙 |
| --- | --- | --- |
| `records` | 예 | 처치·런·생존·클리어 같은 누적 사실의 유일한 정본. 조건 평가 입력이다. |
| `weaponUnlocks` | 예 | non-starter의 영구 획득 권리. 값은 `1`만 허용하고, 한 번 생기면 자동으로 제거·재잠금하지 않는다. |
| `weaponUnlockSchemaVersion` | 예, 도입 시 | 명시적 마이그레이션 완료 버전만 기록한다. 조건값이나 카탈로그 전체를 복제하지 않는다. |
| `weaponUnlockSeen` | 선택 | 무기 도감/NEW 배지가 실제로 필요할 때만 `weaponId: 1`로 저장한다. 획득 권리와 분리하며, 기능 요구가 없으면 만들지 않는다. |
| `conditionId` | 아니오 | 카탈로그 내부의 고정 ID(예: `weapon.compassBlade.v1`)로만 둔다. 현재 사용자가 어떤 OR 조건을 만족했는지 저장하지 않는다. |
| `claimed` | 아니오 | 무기 해금은 자동 지급이다. 보상 수령형이 아니므로 claimed 장부를 만들지 않는다. |
| `newlyUnlockedWeaponIds` | 아니오 | 결과 화면용 런타임 diff다. Firebase에 저장하지 않는다. |
| Google OAuth/ID/refresh token, 비밀번호 | 절대 아니오 | Firebase Authentication만 로그인 정본으로 사용한다. |

조건의 판정은 `evaluateWeaponUnlocks(records, runSummary)`라는 순수 함수 seam으로 유지한다. 이 함수는 catalog의 `conditionId`와 OR 조건을 읽고, 반환값은 해금 ID 집합만 가진다. 영구 권리는 `weaponUnlocks`와 starter/legacy entitlement의 합집합으로 계산한다.

## 런 종료 커밋 seam

기존 `_onRunEnd()`의 역할을 다음 한 경계로 정리한다.

1. 적 사망·골드·레벨·생존·클리어 이벤트는 **현재 런 메모리 카운터**만 변경한다.
2. 런이 끝날 때 `runId = gameKey + runStartedAt + stageId`를 하나 만든다. 같은 런 종료 callback의 재호출은 같은 ID를 사용한다.
3. Firebase hydrate 상태에서만 RTDB transaction으로 최신 `records`를 읽어 이번 런을 정확히 한 번 누적한다.
4. transaction 안에서 갱신된 기록과 이번 런 요약으로 조건을 평가하고, 신규 non-starter를 `weaponUnlocks[id] = 1`로 합친다.
5. transaction 결과의 신규 diff만 결과 UI에 전달한다. 네트워크 재시도는 동일 `runId`를 만나면 no-op이다.

엄격한 재시도/다기기 중복 방지가 필요한 경우에만 `recentRunIds`(bounded 50개 이하)를 `progress`에 둔다. 이 항목은 최근 확정 런 ID만 보관하며, 같은 runId의 counter 재가산을 막는다. 단순 save queue나 클라이언트 boolean으로 대체하지 않는다.

## 기존 사용자 및 STARTER → locked 전환 보호

현재 starter는 저장 플래그가 없어도 해금이다. 따라서 미래에 기존 starter를 계정 잠금 무기로 바꾸는 작업은 단순히 `unlockConditions`만 바꾸면 기존 사용자가 무기를 잃는다.

그 변경이 명시적으로 승인될 경우에만 다음의 단방향 마이그레이션을 사용한다.

1. 기존 starter ID를 `legacyGrantedWeaponIds`라는 코드 allowlist에 고정한다.
2. 원격 progress hydrate 후 transaction에서 해당 ID의 `weaponUnlocks[id] = 1`을 추가하고 `weaponUnlockSchemaVersion`을 올린다.
3. 이미 `1`이면 그대로 두므로 반복 hydrate·재시도·다기기 실행에서도 idempotent하다.
4. 기존 `weaponUnlocks`를 비우거나, starter였다가 누락된 사용자에게 재잠금을 적용하거나, localStorage를 migration source로 사용하지 않는다.

카탈로그에 아직 없는 미래 ID는 현재처럼 Firebase 정규화 단계에서 `1` 값을 보존하되 게임 카드 풀에는 노출하지 않는다. 구버전 기기가 신버전 해금 플래그를 삭제하지 않게 하기 위함이다. 단, 구현 시 ID 길이/문자 정규식은 RTDB rules와 맞추고 잘못된 값·배열·객체는 버린다.

## 다기기·저장 실패 위험과 처리

- **현재 위험:** 전체 `users/{uid}` payload 저장은 A 기기와 B 기기의 누적 기록 병합을 보장하지 않는다.
- **필수 개선:** 무기 해금에 쓰는 `records + weaponUnlocks`는 transaction으로 커밋한다. 다른 progress 필드의 unrelated 변경을 복사·초기화하지 않는다.
- **저장 실패:** 현재 런은 계속 진행하고 결과 화면에 “저장 불가”를 표시한다. 성공처럼 해금 완료를 확정 보고하지 않는다.
- **재시도:** 동일 `runId`로만 재시도한다. 새 runId 생성이나 counter 재가산은 금지한다.
- **동시 기기:** transaction 재시도 결과에서 두 기기의 카운터는 합산되고 해금 플래그는 합집합이어야 한다.
- **원격 schema 불일치/미지 키:** 기존 원격 값을 파괴적으로 덮어쓰지 말고, 명시된 schema migration 또는 읽기 실패 상태로 처리한다.

## 실제 이벤트와 치트/테스트 경계

해금 조건에 쓰는 이벤트는 실제 게임 경로에서만 기록한다.

- 적 처치: `Enemy.jsx`와 pooled `Enemies.jsx`의 실제 사망 확정 뒤 `recordKill()`.
- 생존 시간: 런타임 elapsed time에서 런 종료 시 한 번 계산.
- 골드: 이번 런 `goldSession`의 실제 획득 합계.
- 스테이지 클리어: 포탈/클리어 경로의 `_onRunEnd('cleared')`만 사용.

현재 타이틀의 개발용 “전체 무기 해금” 버튼은 `unlockAllNonStarterWeapons()`로 같은 영구 `weaponUnlocks`를 바꿀 수 있다. 이 경로는 일반 계정 데이터와 분리되지 않아, 이후 저장 요청 때 실제 Firebase 해금으로 남을 위험이 있다. 정식 해금 체계 도입 전 반드시 다음 둘 중 하나를 사용자 결정으로 고정해야 한다.

1. 출시 빌드에서 개발 치트 UI와 호출 경로를 완전히 제외한다.
2. 개발 전용 Auth allowlist와 별도 테스트 사용자/별도 Firebase 프로젝트에서만 실행하고, production 사용자 progress에는 절대 쓰지 않는다.

테스트는 `_seedHydratedFirebaseProgressForTests` 등 메모리 fake만 사용한다. 실제 Firebase 정본을 반복·무작위·파괴적으로 테스트하지 않는다. 실제 원격 검증이 꼭 필요하면 사전 전체 snapshot(값·키·자료형·revision·시각·hash)과 종료 후 완전 복원을 증명해야 한다.

## 테스트 매트릭스 및 승인 게이트

| 구분 | 최소 검증 |
| --- | --- |
| 카탈로그 | 모든 `conditionId`, OR 조건, starter/legacy entitlement, card min level이 순수 함수 테스트에서 결정적으로 평가된다. |
| 런 이벤트 | 일반 적/pooled 적/보스의 실제 사망이 정확히 한 번 `recordKill`에 연결되고, 클리어·게임오버 모두 런 종료 평가를 한 번만 호출한다. |
| 저장 | hydrate된 progress에서 `records` 증가와 `weaponUnlocks` 추가가 같은 transaction 결과로 반영된다. |
| 중복 | 같은 `runId`의 callback·재시도는 records와 unlock toast를 중복시키지 않는다. |
| 다기기 | 충돌한 두 transaction의 records는 합산, unlock flags는 합집합이다. 전체 snapshot last-write-wins 회귀가 없다. |
| offline | 미hydrate/저장 실패에서도 플레이는 유지되고, 브라우저 영구 저장소 호출은 없다. 다음 실행 영구 복원을 주장하지 않는다. |
| migration | 구 계정의 starter 소유는 유지되고, migration 반복·중단·다기기 실행 후에도 재잠금·삭제가 없다. |
| forward compatibility | unknown valid future ID는 저장 보존, 현 버전 카드 풀 비노출, invalid raw 값은 무시한다. |
| rules | 새 progress 키·run ledger·unlock schema version을 추가하면 `database.rules.json`과 `databaseRules.test.js`를 같은 변경으로 갱신한다. |
| 치트 | production 빌드/일반 계정에서 전체 해금 실행으로 영구 progress가 바뀌지 않는다. |

릴리스 승인 전에는 focused unit tests, Firebase rules tests, localStorage/IndexedDB 금지 guard tests, scoped `git diff --check`를 통과해야 한다. 실제 Firebase를 쓰는 검증은 destructive test가 아니어야 하며, 위 snapshot/restore 법칙을 충족한 경우에만 실행한다.

## gameplay 작업자에게 줄 seam과 금지 사항

권장 seam:

- `weaponCatalog.js`: 무기 ID, label, `conditionId`, OR 조건, 카드 등장 레벨의 단일 정본.
- `weaponUnlocks.js`: 권리 조회와 idempotent unlock flag merge만 담당.
- `useGameStore.js`: 실제 런 이벤트 집계와 run-end commit 호출만 담당.
- `firebaseProgress.js`: hydrate, transaction, clone/normalize, save 결과만 담당.

절대 금지:

- HUD·레벨업 카드·TitleScreen에서 Firebase `weaponUnlocks`를 직접 고치기.
- `localStorage`, IndexedDB, URL parameter, dev config를 해금 정본·migration source로 사용하기.
- starter를 locked로 바꾸며 기존 사용자 entitlement를 삭제하기.
- unknown future unlock ID를 구버전 클라이언트가 저장 중 삭제하기.
- Firebase hydrate 실패를 이유로 게임 진입이나 무기 그래픽 표시를 막기.
- 실제 사용자 Firebase 정본을 reset하거나 반복 테스트로 오염시키기.

## 구현 후 확인 결과

- `database.rules.json`은 B01~B04 보스 패시브 키를 정확히 허용하며, 그 외 키는 계속 거부한다.
- 기본 무기는 연필·30cm 자·커터칼·텀블러 4종으로 확정했다.
- 기존 계정은 과거 기본 무기였던 6종의 권리를 Firebase 스키마 v2 이전에서 보존한다.
- `recentRunIds` ledger와 개발용 전체 해금 치트 격리는 이번 구현 범위에 포함하지 않았다.
- 2026-08-22 라이브 Realtime Database 규칙을 로컬 정본과 동일하게 배포했다.
