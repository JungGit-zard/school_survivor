# 미션 시스템 Firebase 저장 구조 기획

작성일: 2026-08-15
작성자: Backend_Mini
범위: 백엔드 아키텍처 문서만 작성. 코드·테스트·Firebase 데이터·Rules 배포·Studio·타이틀·오디오·Git 변경 없음.

## 0. 필수 게이트 확인

- precommand checker 실행 요약: `mission Firebase progress planning`
- profile: `backendmini`
- resolved_domains: `common`, `backend`
- matched_domains: `backend`
- match_evidence: `firebase`
- combined_receipt_sha256: `3faedf2be139a0cb4e3e1313adbfe7ab90941392080d3bf42bd5a14ee91b5991`
- gstack: `GSTACK_OK`
- 읽은 필수 문서:
  - `AGENTS.md`
  - `Bang_Rules.md`
  - `CLAUDE.md`
  - `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
  - `Developer/agent_room/mandatory_precommand/manifest.json`
  - `Developer/agent_room/mandatory_precommand/README.md`
  - `Developer/auto_deploy_backend_boundary_2026-06-24.md`
  - `Developer/firebase_google_login_realtime_database_integration_2026-06-20.md`
  - `docs/solutions/integration-issues/capacitor-android-firebase-google-login-aab.md`
  - `project_develop_policy.md`
  - `SESSION_CONTINUITY.md`
  - `SESSION_MEMORY.md` 최신 단일 엔트리만
- 추가로 읽은 작업 관련 문서:
  - `Planner/new_content_missions_30_2026-08-15.md`
  - `CEO/current_product_priorities.md`
  - `Developer/r3f_prototype/src/lib/firebaseProgress.js` 읽기 전용 참고

## 1. 현재 우선순위와 문서 경계

`CEO/current_product_priorities.md` 기준 현재 최우선은 Stage 1 모바일 플레이 루프 안정화다. 백엔드 도입, 리더보드, 계정 시스템, 멀티플레이는 Stage 1 루프 안정화 뒤 판단하는 항목이다.

따라서 이 문서는 “지금 바로 대규모 백엔드 기능을 구현한다”가 아니라, 미션 30종을 나중에 붙일 때 기존 Firebase 개인 진행도 구조를 크게 망가뜨리지 않도록 좁은 저장 경계와 데이터 계약을 제안한다.

중요한 최신 정책:

1. 브라우저 `localStorage`는 미션 진행도 저장 fallback으로 절대 사용하지 않는다.
2. Firebase Authentication이 유일한 로그인 정본이다.
3. Google OAuth 토큰, Firebase ID 토큰, refresh token, 비밀번호를 Realtime Database나 로컬 저장소에 복제하지 않는다.
4. 로그인·저장 실패는 기존 게임 진입과 플레이 루프를 막지 않는다.
5. 미로그인 플레이어는 미션 진행을 영구 저장하지 않는다.
6. Cloud Functions는 MVP 범위가 아니다. 필요하면 미래 선택지로만 둔다.

이 문서의 제안은 기존 `users/{uid}` 개인 진행도 하위에 미션 진행도만 좁게 추가하는 방식이다. 공식 경쟁 랭킹, 서버 권위 경제, 멀티플레이 권위 판정은 범위 밖이다.

## 2. 저장소 선택과 최상위 경로

현재 프로젝트의 클라우드 개인 진행도는 Firebase Realtime Database `users/{uid}`를 사용한다. 미션 진행도도 같은 사용자 개인 저장소 아래의 좁은 child path로 둔다.

권장 경로:

```text
users/{uid}/progress/missions
```

이유:

- 이미 `users/{uid}/progress`가 개인 진행도 컨테이너다.
- 미션 데이터는 공개 랭킹이 아니라 개인 진행도다.
- 자기 UID 권한 규칙을 그대로 확장할 수 있다.
- `progress.goldTotal`, `progress.records`, `progress.weaponUnlocks`와 같은 기존 개인 진행도와 의미상 같은 계층이다.
- 별도 `missions/{uid}` 루트보다 Rules와 계정 삭제 경계가 단순하다.

대체 후보였던 `users/{uid}/missions`는 기능별 분리는 명확하지만, 기존 progress snapshot 정규화·계정 삭제·백업 흐름과 떨어질 수 있어 MVP에서는 추천하지 않는다.

## 3. 정적 미션 정의와 Firebase 사용자 진행도 분리

### 3.1 Source-controlled static mission definitions

미션 카탈로그는 소스 관리 대상 정적 정의로 둔다. Firebase 사용자 데이터에 미션명, 설명, 전체 보상 테이블을 반복 저장하지 않는다.

정적 정의 후보 위치는 향후 구현 시 예를 들면 다음과 같다.

```text
Developer/r3f_prototype/src/lib/missionCatalog.js
```

정적 정의가 담당할 항목:

```js
{
  missionCatalogVersion: 'missions_2026_08_15_v1',
  missions: {
    first_xp_textbook: {
      id: 'first_xp_textbook',
      titleKey: 'mission.first_xp_textbook.title',
      descriptionKey: 'mission.first_xp_textbook.description',
      tier: 1,
      counterKey: 'pickup.xpTextbook.count',
      target: 1,
      reward: { type: 'gold', amount: 5 },
      repeatable: false,
      enabled: true
    }
  }
}
```

정적 정의에 둘 것:

- mission id
- 표시용 i18n key
- tier/category
- 조건 타입과 target
- 제안 보상 타입/수량
- 활성화 여부
- 카탈로그 버전
- backward-compatible optional field 기본값

Firebase 사용자 진행도에 두지 않을 것:

- 전체 미션 설명문
- 긴 i18n 문구
- 보상 정책 전체 복사본
- Google/Firebase token
- 클라이언트 비밀값
- 보안 판단용 공식 서버 승인값

### 3.2 Firebase user progress

Firebase에는 사용자별 진행 상태와 보상 수령 멱등성 데이터만 저장한다.

권장 shape:

```json
{
  "users": {
    "<uid>": {
      "schemaVersion": 1,
      "updatedAt": "2026-08-15T00:00:00.000Z",
      "profile": {
        "uid": "<uid>",
        "displayName": "정실장",
        "nickname": ""
      },
      "progress": {
        "goldTotal": 205,
        "records": {},
        "weaponUnlocks": {},
        "weaponPermanentUpgrades": {},
        "passiveUpgrades": {},
        "encounteredZombieTypes": {},
        "titleSettings": {},
        "missions": {
          "schemaVersion": 1,
          "missionCatalogVersion": "missions_2026_08_15_v1",
          "updatedAt": "2026-08-15T00:00:00.000Z",
          "active": {
            "first_xp_textbook": {
              "counter": 1,
              "target": 1,
              "completedAt": "2026-08-15T00:00:00.000Z",
              "claimedAt": "2026-08-15T00:00:05.000Z",
              "claimId": "first_xp_textbook:missions_2026_08_15_v1",
              "reward": {
                "type": "gold",
                "amount": 5
              }
            }
          },
          "counters": {
            "pickup.xpTextbook.count": 1,
            "pickup.goldCoin.count": 3,
            "stage.stage1.bestSurvivalSec": 68,
            "stage.stage1.clearCount": 0,
            "weapon.pencilThrow.killCount": 12
          },
          "claimLedger": {
            "first_xp_textbook:missions_2026_08_15_v1": {
              "missionId": "first_xp_textbook",
              "catalogVersion": "missions_2026_08_15_v1",
              "claimedAt": "2026-08-15T00:00:05.000Z",
              "reward": {
                "type": "gold",
                "amount": 5
              }
            }
          }
        }
      }
    }
  }
}
```

MVP에서는 `active`와 `claimLedger`만으로도 충분하다. `counters`는 누적 카운터를 미션별 중복 없이 공유하기 위한 선택지다. 저장량을 줄이려면 `active.{missionId}.counter` 중심으로 시작하고, 여러 미션이 같은 이벤트를 공유할 때만 `counters`를 추가한다.

## 4. 필드 정의

### 4.1 missions root

```json
{
  "schemaVersion": 1,
  "missionCatalogVersion": "missions_2026_08_15_v1",
  "updatedAt": "ISO-8601 string",
  "active": {},
  "counters": {},
  "claimLedger": {}
}
```

- `schemaVersion`: Firebase에 저장된 미션 진행도 shape 버전. 숫자 정수.
- `missionCatalogVersion`: 클라이언트 정적 미션 정의 버전. 사용자가 어떤 카탈로그 기준으로 진행했는지 표시한다.
- `updatedAt`: 미션 progress 마지막 저장 시각.
- `active`: missionId별 진행·완료·수령 상태.
- `counters`: 여러 미션이 공유하는 누적 카운터. MVP optional.
- `claimLedger`: 보상 중복 지급 방지를 위한 멱등 ledger.

### 4.2 active mission entry

```json
{
  "counter": 3,
  "target": 10,
  "completedAt": null,
  "claimedAt": null,
  "claimId": null,
  "reward": null,
  "lastEventAt": "2026-08-15T00:00:00.000Z"
}
```

- `counter`: 현재 진행량. 음수 금지, 정수 권장.
- `target`: 당시 카탈로그의 목표값 snapshot. 카탈로그 변경 후 UI 표시 안정성을 위해 저장 가능. 없으면 정적 카탈로그에서 읽는다.
- `completedAt`: 완료 시각. 미완료면 없음 또는 null.
- `claimedAt`: 보상 수령 시각. 미수령이면 없음 또는 null.
- `claimId`: `missionId:missionCatalogVersion` 형태의 멱등 key.
- `reward`: 실제 지급된 보상 snapshot. 보상 정책 변경 뒤에도 이미 지급된 내용을 설명하기 위한 optional field.
- `lastEventAt`: 마지막 진행 이벤트 시각. 디버깅용 optional field.

### 4.3 claimLedger entry

```json
{
  "missionId": "first_xp_textbook",
  "catalogVersion": "missions_2026_08_15_v1",
  "claimedAt": "2026-08-15T00:00:05.000Z",
  "reward": {
    "type": "gold",
    "amount": 5
  }
}
```

`claimLedger/{claimId}`가 이미 존재하면 같은 보상은 다시 지급하지 않는다.

## 5. 이벤트-to-counter 계약

미션 시스템은 게임플레이 루프에 큰 의존성을 만들지 않고, 런 중 발생하는 작은 이벤트를 in-memory aggregator가 받아 카운터로 변환한다.

이벤트 DTO 후보:

```ts
type MissionEvent = {
  type: string
  stageId?: 'stage1' | 'stage2' | 'stage3' | 'stage4'
  enemyType?: string
  weaponKey?: string
  itemType?: string
  bossId?: string
  questId?: string
  companionId?: string
  value?: number
  occurredAtMs: number
  runId: string
}
```

기본 계약:

| 게임 이벤트 | counterKey 예시 | 관련 미션 |
|---|---|---|
| XP 교과서 pickup | `pickup.xpTextbook.count += 1` | 첫 교과서 줍기 |
| 골드 코인 pickup | `pickup.goldCoin.count += 1` | 첫 골드 코인 |
| 레벨업 선택 확정 | `upgrade.choice.count += 1` | 첫 레벨업 선택 |
| 적 처치 | `enemy.{enemyType}.killCount += 1` | E01/E02/E07 등 처치 미션 |
| 무기 last-hit 처치 | `weapon.{weaponKey}.killCount += 1` | 연필·책가방·플라스크 미션 |
| 무기 hit | `weapon.{weaponKey}.hitCount += 1` | 텀블러·bell hit 미션 |
| 런 생존 시간 갱신 | `stage.{stageId}.bestSurvivalSec = max()` | 30초/60초 생존 |
| 스테이지 클리어 | `stage.{stageId}.clearCount += 1` | Stage 탈출 미션 |
| 조사 trigger | `interaction.trigger.count += 1` | 첫 조사 상호작용 |
| 퀘스트 완료 | `quest.{questId}.completeCount += 1` | 퀘스트 첫 완료 |
| 동료 heal | `companion.{companionId}.healCount += 1` | 하나코의 응원 |
| 보스 처치 | `boss.{bossId}.killCount += 1` | 보스 사냥꾼 |

계약 원칙:

1. 미션 시스템은 적 스탯, 스폰, 보상 수치, 전투 결과를 바꾸지 않는다.
2. 이미 존재하는 이벤트가 있으면 재사용한다.
3. 없는 경우에도 “최소 신규 이벤트”만 추가한다.
4. 이벤트는 런 중 메모리에서 먼저 합산하고 Firebase write는 batch한다.
5. 이벤트 raw log를 Firebase에 영구 저장하지 않는다. 개인정보·비용·용량을 줄이기 위함이다.

## 6. 인메모리 per-run aggregation

런 중에는 매 pickup/kill/hit마다 Firebase에 쓰지 않는다.

권장 구조:

```js
const runMissionAggregate = {
  runId,
  uid,
  startedAt,
  countersDelta: {
    'pickup.xpTextbook.count': 1,
    'enemy.E01.killCount': 10,
    'stage.stage1.bestSurvivalSec': 68
  },
  completedMissionIds: ['first_xp_textbook'],
  dirty: true
}
```

처리 흐름:

1. 게임 이벤트 발생.
2. mission aggregator가 이벤트를 counter delta로 변환.
3. 메모리 상태에서 현재 미션 완료 여부만 즉시 계산해 UI badge를 보여줄 수 있다.
4. Firebase 저장은 아래 시점에 낮은 빈도로 수행한다.
   - 런 종료
   - 결과 화면 진입
   - 앱 background/pause 직전 가능하면 1회
   - 보상 claim 버튼 클릭 시 transaction 즉시 수행

이 방식은 Stage 1 모바일 루프 성능과 Firebase write 비용을 보호한다.

## 7. 저빈도 write batching

권장 write frequency:

- pickup/kill/hit마다 write 금지.
- 런 중 자동 저장은 MVP에서 생략 가능.
- 런 종료 시 1회 progress merge 저장.
- 보상 claim은 중복 방지 때문에 transaction으로 즉시 처리.
- 앱이 background로 갈 때 best-effort 저장 1회는 optional.

런 종료 batch merge 의사코드:

```js
async function flushMissionProgress({ uid, aggregate, currentRemoteMissions, catalog }) {
  if (!uid) return { saved: false, reason: 'unsigned' }

  const next = clone(currentRemoteMissions ?? createEmptyMissions())
  next.schemaVersion = 1
  next.missionCatalogVersion = catalog.version
  next.updatedAt = new Date().toISOString()

  for (const [counterKey, deltaOrValue] of Object.entries(aggregate.countersDelta)) {
    if (isBestValueCounter(counterKey)) {
      next.counters[counterKey] = Math.max(readInt(next.counters[counterKey]), deltaOrValue)
    } else {
      next.counters[counterKey] = readInt(next.counters[counterKey]) + readInt(deltaOrValue)
    }
  }

  for (const mission of catalog.enabledMissions) {
    const counter = evaluateMissionCounter(mission, next.counters)
    const entry = next.active[mission.id] ?? {}
    entry.counter = Math.max(readInt(entry.counter), counter)
    entry.target = mission.target
    if (!entry.completedAt && entry.counter >= mission.target) {
      entry.completedAt = new Date().toISOString()
    }
    next.active[mission.id] = entry
  }

  await update(ref(db, `users/${uid}/progress/missions`), next)
  return { saved: true }
}
```

주의: Realtime Database `update()`는 patch merge에는 유용하지만, 동시 기기에서 같은 카운터를 동시에 올리면 lost update가 생길 수 있다. MVP는 “한 계정 한 기기 플레이”를 기본으로 보고 batch update를 허용하되, 보상 claim만 transaction으로 강제한다.

## 8. 즉시 claim transaction과 중복 수령 방지

보상 지급은 단순 update가 아니라 transaction으로 처리해야 한다. 이유는 사용자가 버튼을 두 번 누르거나 네트워크 재시도로 같은 보상이 중복 지급될 수 있기 때문이다.

권장 claimId:

```text
{missionId}:{missionCatalogVersion}
```

보상 claim transaction 의사코드:

```js
async function claimMissionReward({ uid, missionId, catalog }) {
  if (!uid) return { ok: false, reason: 'unauthenticated' }

  const mission = catalog.missions[missionId]
  if (!mission || !mission.enabled) return { ok: false, reason: 'unknown-mission' }

  const claimId = `${missionId}:${catalog.version}`
  const userRef = ref(db, `users/${uid}`)

  const result = await runTransaction(userRef, (user) => {
    if (!user || typeof user !== 'object') return user

    const missions = user.progress?.missions ?? createEmptyMissions()
    const entry = missions.active?.[missionId]
    const alreadyClaimed = missions.claimLedger?.[claimId] || entry?.claimedAt

    if (alreadyClaimed) {
      return user
    }

    if (!entry?.completedAt || readInt(entry.counter) < mission.target) {
      return user
    }

    const now = new Date().toISOString()
    const reward = { type: 'gold', amount: mission.reward.amount }

    user.progress = user.progress ?? {}
    user.progress.goldTotal = readInt(user.progress.goldTotal) + reward.amount
    user.progress.missions = missions
    user.progress.missions.active = missions.active ?? {}
    user.progress.missions.claimLedger = missions.claimLedger ?? {}
    user.progress.missions.active[missionId] = {
      ...entry,
      target: mission.target,
      claimedAt: now,
      claimId,
      reward
    }
    user.progress.missions.claimLedger[claimId] = {
      missionId,
      catalogVersion: catalog.version,
      claimedAt: now,
      reward
    }
    user.progress.missions.updatedAt = now
    user.updatedAt = now
    return user
  })

  return interpretClaimResult(result)
}
```

MVP transaction 범위는 `users/{uid}` 전체 또는 `users/{uid}/progress`가 안전하다. `goldTotal`과 `missions.claimLedger`를 같은 원자적 변경으로 묶어야 하기 때문이다.

중복 방지 규칙:

1. `claimLedger/{claimId}`가 있으면 보상 지급 금지.
2. `active/{missionId}/claimedAt`이 있어도 보상 지급 금지.
3. transaction이 네트워크 실패로 재시도되어도 같은 claimId는 한 번만 적용된다.
4. 클라이언트 UI는 optimistic으로 골드를 올리지 않는다. transaction 성공 후 반영한다.
5. transaction 실패는 보상 버튼만 실패 표시하고 게임 진입은 막지 않는다.

## 9. retry와 idempotency

### 9.1 진행도 저장 retry

런 종료 batch 저장은 best-effort다.

- 성공: Firebase progress에 반영.
- 실패: 결과 화면과 게임 진입은 유지.
- 재시도: 같은 런의 aggregate를 메모리에 들고 있는 동안만 1~2회 재시도 가능.
- 앱 종료 후 미로그인/저장 실패분을 localStorage에 남겨 다음 실행 때 복구하지 않는다.

로컬 내구 저장 fallback은 금지다. 이 때문에 오프라인 또는 저장 실패 시 “이번 미션 진행은 클라우드에 저장되지 않을 수 있음”을 조용하고 짧게 표시하는 정도가 안전하다.

### 9.2 보상 claim retry

보상 claim은 transaction의 claimId로 멱등성을 확보한다.

- 사용자가 같은 버튼을 두 번 눌러도 claimLedger 때문에 한 번만 지급된다.
- 네트워크 timeout 후 클라이언트가 성공 여부를 모르면 remote reload 후 `claimedAt`과 `claimLedger`를 다시 확인한다.
- 이미 claim된 상태면 UI는 “수령 완료”로 전환하고 추가 지급하지 않는다.

## 10. Firebase Rules validation 방향

현재 구조가 Firebase Realtime Database 기반이므로 RTDB Rules 기준으로 쓴다. 실제 배포는 이 문서 범위가 아니다.

최소 read/write 경계:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

미션 하위 validate 방향 예시:

```json
{
  "rules": {
    "users": {
      "$uid": {
        "progress": {
          "missions": {
            "schemaVersion": {
              ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 5"
            },
            "missionCatalogVersion": {
              ".validate": "newData.isString() && newData.val().matches(/^missions_[0-9]{4}_[0-9]{2}_[0-9]{2}_v[0-9]+$/)"
            },
            "updatedAt": {
              ".validate": "newData.isString() && newData.val().length <= 40"
            },
            "active": {
              "$missionId": {
                ".validate": "$missionId.matches(/^[a-z0-9_]{1,64}$/)",
                "counter": {
                  ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000"
                },
                "target": {
                  ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 1000000"
                },
                "completedAt": {
                  ".validate": "newData.val() == null || (newData.isString() && newData.val().length <= 40)"
                },
                "claimedAt": {
                  ".validate": "newData.val() == null || (newData.isString() && newData.val().length <= 40)"
                },
                "claimId": {
                  ".validate": "newData.val() == null || (newData.isString() && newData.val().length <= 140)"
                }
              }
            },
            "counters": {
              "$counterKey": {
                ".validate": "$counterKey.matches(/^[A-Za-z0-9_.-]{1,96}$/) && newData.isNumber() && newData.val() >= 0 && newData.val() <= 1000000"
              }
            },
            "claimLedger": {
              "$claimId": {
                ".validate": "$claimId.matches(/^[a-z0-9_:-]{1,140}$/)"
              }
            }
          }
        }
      }
    }
  }
}
```

Rules 한계:

- 클라이언트가 쓰는 개인 진행도는 근본적으로 조작 가능하다.
- Rules는 타입·범위·자기 uid 경계만 줄 수 있다.
- 공식 경쟁, 유료 재화, 서버 권위 보상은 이 구조만으로 승인하면 안 된다.
- 보상 claim 중복 방지는 transaction과 claimLedger로 줄이되, 클라이언트 권위 경제라는 한계는 남는다.

미래에 공식 경제/랭킹으로 승격할 때만 Cloud Functions 또는 서버 검증을 도입한다.

## 11. backward-compatible optional fields

필드 추가는 optional-first 원칙으로 한다.

허용되는 추가 예:

```json
{
  "displayState": "new|seen|pinned",
  "lastEventAt": "ISO string",
  "completedRunId": "short-run-id",
  "debugSource": "run-end-flush"
}
```

규칙:

1. `schemaVersion` 1 reader는 모르는 optional field를 무시한다.
2. 필드 삭제·이름 변경은 하지 않는다.
3. mission id는 한 번 배포하면 의미를 재사용하지 않는다.
4. 보상 수량이 바뀌어도 이미 claim된 reward snapshot은 유지한다.
5. 카탈로그를 크게 바꾸면 `missionCatalogVersion`을 올린다.

## 12. 계정 전환 동작

Firebase Authentication이 로그인 정본이다.

계정 전환 시 원칙:

1. `auth.uid`가 바뀌면 현재 in-memory mission aggregate를 즉시 폐기한다.
2. 이전 uid의 미저장 mission delta를 새 uid에 합치지 않는다.
3. 새 uid의 `users/{uid}/progress/missions`를 hydrate한다.
4. hydrate가 늦어도 로그인 성공 자체를 취소하지 않는다.
5. 기존 로비/게임 진입은 막지 않고, 미션 UI만 “동기화 중” 또는 “미션 저장 불가” 상태로 둔다.
6. 로그아웃하면 미션 원격 진행도 runtime을 비우고, 미션 영구 저장을 중지한다.

절대 금지:

- A 계정의 미션 진행도를 B 계정에 복사.
- uid 없이 진행한 guest 미션을 로그인 후 자동 병합.
- localStorage에 progressOwnerUid 같은 fallback을 만들어 계정 전환을 복구.

## 13. 로그인/save failure 동작

로그인 실패:

- 게임 시작, Stage 1 플레이, 결과 화면 진입을 막지 않는다.
- 미션 진행도 영구 저장은 비활성화한다.
- UI는 필요하면 “로그인하면 미션 진행 저장” 정도로 안내한다.

hydrate 실패:

- 로그인은 유지한다.
- 기존 게임 진입은 유지한다.
- 미션 UI는 remote snapshot이 올 때까지 비활성 또는 재시도 상태로 둔다.
- 빈 progress로 원격을 덮어쓰지 않는다.

런 종료 mission save 실패:

- 결과 화면 표시를 막지 않는다.
- 골드/런 결과 기존 흐름을 막지 않는다.
- retry는 메모리 안에서만 제한적으로 수행한다.
- localStorage fallback은 없다.

claim transaction 실패:

- 보상 지급을 성공으로 표시하지 않는다.
- remote reload 후 이미 `claimedAt`이면 수령 완료로 표시한다.
- 계속 실패하면 버튼에 재시도 가능 상태만 남긴다.
- 게임 진입과 플레이는 막지 않는다.

## 14. 미로그인 플레이어 동작

미로그인 플레이어는 기존 게임 루프를 플레이할 수 있다. 단, 미션 영구 진행도는 저장하지 않는다.

정책:

1. 런 중 미션 조건 달성 toast는 MVP에서 보여주지 않는 편이 안전하다. 저장되지 않을 성취를 영구 완료처럼 보이면 혼동된다.
2. 보여준다면 “로그인 필요” 또는 “이번 세션 한정”으로 명확히 구분한다.
3. 브라우저 localStorage, IndexedDB, Realtime Database 익명 token copy 같은 대체 영구 저장을 만들지 않는다.
4. 로그인 후 guest 진행도를 자동 이전하지 않는다. 이전이 필요하면 미래에 명시 UX와 서버 정책이 필요하다.

명시적 결론:

- no localStorage fallback.
- no IndexedDB fallback.
- no Realtime Database token copy.
- Firebase Authentication uid가 없으면 Firebase mission progress write는 없다.

## 15. write 비용과 성능 고려

미션 30종을 naive하게 구현해 kill/hit마다 write하면 Firebase 비용과 모바일 성능에 나쁘다.

권장 MVP 비용 모델:

- 런 시작: 미션 catalog는 번들에서 읽음. Firebase write 없음.
- 런 중: in-memory aggregation. Firebase write 없음.
- 런 종료: mission progress 1회 update.
- claim: transaction 1회.
- 계정 hydrate: 로그인 후 read 1회.

예상 write 수:

```text
1판 플레이 후 미션 저장만: 1 write
완료 미션 2개 claim: transaction 2회
총: 3회 수준
```

피해야 할 것:

```text
E01 100마리 처치 = 100 writes
텀블러 hit 300회 = 300 writes
생존 초마다 bestSurvivalSec write = 240 writes
```

대신 런 종료 때 합산 값만 저장한다.

## 16. 개인정보·보안 리스크

### 16.1 개인정보 최소화

미션 진행도에는 이메일, photoURL, OAuth token, Firebase ID token, refresh token, IP 주소, 기기 식별자를 저장하지 않는다.

필요한 식별자는 Firebase Authentication의 `uid` 경로뿐이다.

### 16.2 치트와 조작 가능성

클라이언트가 미션 counter를 계산해 쓰는 구조는 조작 가능하다. MVP에서는 개인 진행도와 작은 골드 보상 수준으로만 사용한다.

방어선:

- Rules로 자기 uid만 접근.
- 타입·범위 validate.
- claimLedger + transaction으로 중복 수령 방지.
- 비정상적으로 큰 counter는 클램프.
- 공식 랭킹/유료 재화/이벤트 보상 근거로 사용하지 않음.

### 16.3 토큰 저장 금지

Realtime Database에 다음을 저장하지 않는다.

- Google OAuth access token
- Google OAuth refresh token
- Firebase ID token
- Firebase refresh token
- 비밀번호
- 로그인 세션 복구용 임의 token copy

Firebase Auth SDK의 현재 로그인 상태만 사용한다. 프로젝트 정책상 브라우저 로컬 로그인 캐시도 만들지 않는 방향을 유지한다.

## 17. rollback과 migration 경계

### 17.1 MVP rollback

미션 시스템을 끄는 가장 안전한 rollback은 클라이언트 정적 카탈로그에서 `enabled=false` 또는 미션 UI 숨김이다.

Firebase에 이미 저장된 `progress.missions`는 삭제하지 않아도 된다. 삭제는 계정 삭제 또는 명시 migration 때만 한다.

### 17.2 카탈로그 변경

- 새 미션 추가: 새 missionId 추가, 기존 데이터 영향 없음.
- 보상 변경: 카탈로그 버전 증가. 이미 claim된 reward snapshot은 유지.
- 목표값 변경: 카탈로그 버전 증가. 기존 active target은 표시 안정성을 위해 보존 가능.
- 미션 제거: `enabled=false`로 숨기고 데이터는 유지.
- missionId 재사용 금지.

### 17.3 schema migration

`schemaVersion: 1`에서는 optional field 추가만 한다. 구조를 바꿔야 할 때는 `schemaVersion: 2` reader를 먼저 배포하고, 오래된 shape를 읽어서 새 shape로 normalize한 뒤 저장한다.

마이그레이션 금지:

- 브라우저 localStorage에서 미션 진행도 import.
- guest progress를 로그인 계정에 자동 합치기.
- Firebase token 또는 credential을 progress에 복제.

## 18. Phased MVP

### Phase 0 — 문서와 경계 고정

- 이 문서로 Firebase path, no-localStorage, no-token-copy, claim transaction 경계 확정.
- 코드·Rules·데이터 배포 없음.

### Phase 1 — 정적 catalog + in-memory aggregator

- 미션 30종 중 기존 카운터 기반 쉬운 10개부터 catalog 작성.
- Firebase write 없이 런 중 메모리에서 완료 여부 계산.
- 미로그인/저장 실패 UX 문구 확정.

추천 첫 10개는 `Planner/new_content_missions_30_2026-08-15.md`의 implementation priority를 따른다.

1. 첫 Stage 1 탈출
2. Stage 2 탈출
3. Stage 3 탈출
4. Stage 4 탈출
5. 첫 30초 버티기
6. Stage 1 1분 생존
7. 첫 골드 코인
8. 첫 교과서 줍기
9. 첫 레벨업 선택
10. 무기 하나 Lv.5

단, Stage 1 모바일 루프 안정화 우선순위 때문에 실제 구현 순서는 Stage 1 관련 미션을 먼저 좁혀도 된다.

### Phase 2 — Firebase progress 저장

- 로그인된 uid에서만 `users/{uid}/progress/missions` hydrate/save.
- 런 종료 batch update 1회.
- 저장 실패는 게임 진입을 막지 않음.
- localStorage fallback 없음.

### Phase 3 — Claim transaction

- 완료 미션 보상 claim 버튼 추가.
- `claimLedger`와 `claimedAt` transaction으로 중복 지급 방지.
- claim 실패 시 재시도/remote reload.

### Phase 4 — Rules validation과 QA

- RTDB Rules 타입·범위 validate 초안 작성.
- 실제 배포 전 별도 QA 카드에서 emulator 또는 test project로 검증.
- 공식 서버 권위 보상은 아직 도입하지 않음.

### Future optional — 서버 검증

Cloud Functions 또는 custom backend는 미래 선택지다. 다음 조건이 생기기 전에는 YAGNI다.

- 미션 보상이 유료 재화와 연결된다.
- 공식 이벤트/랭킹 보상으로 승격된다.
- 치트 대응이 제품 핵심 문제가 된다.
- 여러 기기 동시 플레이 merge가 중요한 요구가 된다.

## 19. 최종 명시 결론

1. 미션 진행도 권장 경로는 `users/{uid}/progress/missions`다.
2. 미션 정의는 source-controlled static catalog에 두고, Firebase에는 사용자별 진행도·완료·수령 ledger만 둔다.
3. 런 중에는 in-memory aggregation을 사용하고, Firebase write는 런 종료 batch와 claim transaction 중심으로 낮춘다.
4. 보상 수령은 `claimLedger`와 `claimedAt`를 같은 transaction에서 갱신해 중복 수령을 막는다.
5. Firebase Authentication uid가 유일한 로그인 정본이다.
6. 브라우저 `localStorage` fallback은 없다.
7. Realtime Database에 Google/Firebase token copy는 없다.
8. 미로그인 플레이어는 기존 게임 진입과 플레이가 가능하지만 미션 영구 진행도는 저장하지 않는다.
9. 로그인·hydrate·save 실패는 기존 게임 진입을 막지 않는다.
10. Cloud Functions는 MVP가 아니며, 미래 공식 보상/랭킹/경제 검증이 필요할 때만 optional로 검토한다.

## 20. 검증

문서 검증 방식: document inspection only.

확인 항목:

- 이 산출물은 `Developer/mission_system_firebase_architecture_2026-08-15.md` 단일 신규 문서다.
- 코드, 테스트, Firebase 데이터, Rules 배포, Studio, 타이틀, 오디오, Git 변경은 수행하지 않는다.
- `Planner/new_content_missions_30_2026-08-15.md`의 미션 30종과 implementation priority를 반영했다.
- `CEO/current_product_priorities.md`의 Stage 1 모바일 루프 우선과 백엔드/계정/리더보드/멀티플레이 defer 경계를 반영했다.
- obsolete localStorage/guest persistence 권고와 충돌할 때는 최신 정책을 우선해 no localStorage fallback을 명시했다.
- no Realtime Database token copy를 명시했다.
