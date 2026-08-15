# 미션 시스템 구현·레이아웃 통합 마스터 기획서

작성일: 2026-08-15
작성자: Level_Mini
산출물 범위: 통합 기획 문서 1개에 QA 보강 수정만 수행. 코드·테스트·Firebase 데이터·Rules 배포·Studio·타이틀·오디오·Git 변경 없음.
대상 파일: `Planner/mission_system_implementation_and_layout_master_2026-08-15.md`

## 0. 필수 게이트와 통합 근거

- precommand checker 실행 요약: `mission plan QA correction`
- profile: `levelmini`
- resolved_domains: `common`, `qa`, `gameplay`
- matched_domains: `qa`
- match_evidence:
  - `qa` / keyword `qa`
- combined_receipt_sha256: `655a71887f2b8829f66ab1ea1225805c7865bbee1d528e26de5bba54c38c2243`
- gstack: `GSTACK_OK`
- 정책 우선순위: 충돌 시 `project_develop_policy.md`를 먼저 따른다.
- 핵심 금지: 브라우저 `localStorage` 미션 저장 금지, 타이틀 화면 변경 금지, 로그인·저장 실패로 게임 진입 차단 금지, 보상 수치 확정 금지.
- QA 보강 반영: 현재 코드에는 `progress.missions` 정규화, RTDB missions 규칙, claim transaction이 아직 없다. 아래 저장·수령 설계는 present feature가 아니라 구현 prerequisite이다.

읽고 통합한 전문 산출물:

1. `Planner/new_content_missions_30_2026-08-15.md`
2. `Planner/mission_system_gameplay_implementation_plan_2026-08-15.md`
3. `Graphic_designer/mission_system_ui_layout_2026-08-15.md`
4. `Developer/mission_system_firebase_architecture_2026-08-15.md`

이 문서는 위 4개 산출물을 초보자도 구현 순서를 이해할 수 있게 하나의 실행 지도처럼 합친다. 30개 미션의 전체 설명문을 반복하지 않고, 기존 미션 카탈로그 문서를 정본으로 참조한다.

---

## 1. Design goals and non-goals

### 1-1. 목표

1. 30개 미션을 현재 게임에 “관찰형 진행 레이어”로 붙인다.
   - 관찰형이란 적 스탯, 스폰, 무기 피해, 보스 타이밍을 바꾸지 않고 이미 일어난 플레이 이벤트만 세는 방식이다.
2. 현재 최우선인 Stage 1 모바일 240초 = 4분 플레이 루프를 흔들지 않는다.
3. 초보 플레이어가 다음 목표를 알 수 있게 한다.
   - 예: “첫 교과서 줍기”, “첫 30초 버티기”, “첫 Stage 1 탈출”.
4. 로그인한 사용자의 미션 진행도만 Firebase Realtime Database에 영구 저장한다.
5. 저장 실패가 나도 게임 시작, 플레이, 결과 화면, 로비 복귀는 계속 가능해야 한다.
6. 모바일에서 먼저 읽히고 터치 가능한 UI를 만든다.
7. 구현은 작은 세로 조각으로 나누어, 각 조각이 카탈로그 + 저장 + UI + 검증까지 끝나도록 한다.

### 1-2. 비목표

1. 타이틀 화면에 미션 버튼, 배지, 문구, 그래픽, BGM, 효과음을 추가하지 않는다.
2. Stage 1에 E04 원거리/투사체 좀비를 추가하지 않는다.
3. Stage duration, boss timing, Matilda timing, enemy HP, weapon damage, spawn table을 미션 때문에 바꾸지 않는다.
4. 브라우저 `localStorage`, IndexedDB, 임시 JSON, 로컬 파일을 미션 영구 저장소로 쓰지 않는다.
5. Firebase에 Google OAuth token, Firebase ID token, refresh token, password를 저장하지 않는다.
6. Cloud Functions, 공식 랭킹, 서버 권위 보상, 멀티플레이는 MVP가 아니다.
7. 보상 골드량은 아직 확정하지 않는다. 모든 reward는 Balance_QA_Mini 검토 전까지 proposal이다.
8. 기존 `quests.js` 퀘스트 시스템을 삭제하거나 미션으로 대체하지 않는다.

---

## 2. End-to-end player flow

### 2-1. 로그인한 플레이어

1. 앱을 켠다.
2. 타이틀은 기존 그대로 표시된다. 미션 UI를 타이틀에 넣지 않는다.
3. 로비에 들어오면 하단 nav의 `미션` 버튼에서 받을 보상 수 또는 새 진행 표시를 볼 수 있다.
4. `미션` 버튼을 누르면 미션 센터가 열린다.
5. 플레이어는 추천 미션, 진행중 미션, 완료 미션을 본다.
6. 플레이어가 Stage 1을 시작한다.
7. 게임 중 HUD 왼쪽 상단에는 접힌 미션 tracker가 최대 1~2개 목표만 보여준다.
8. 런 중 pickup, survival, clear, level-up 같은 이벤트가 in-memory aggregator에 쌓인다.
9. 구현 prerequisite 통과 후에만 런 종료 또는 결과 화면 진입 시 미션 진행도가 Firebase `users/{uid}/progress/missions`에 낮은 빈도로 저장된다.
10. 완료된 미션은 `completed_unclaimed` 상태가 된다.
11. 보상 수령 UI는 기본 disabled다. 미션 센터에서 `받기`를 활성화하려면 Firebase transaction이 goldTotal과 claimLedger를 함께 갱신하는 gate를 먼저 통과해야 한다.
12. transaction 성공 후에만 골드 UI와 미션 상태가 `claimed`로 바뀐다.

### 2-2. 미로그인 플레이어

1. 게임 시작과 플레이는 가능하다.
2. 미션 영구 진행도는 저장하지 않는다.
3. MVP에서는 저장되지 않는 완료 toast를 과하게 보여주지 않는 편이 안전하며, 보상 수령 UI는 disabled로 유지한다.
4. 안내가 필요하면 “로그인하면 미션 진행 저장”처럼 짧게 보여준다.
5. 로그인 후 guest 진행도를 자동 병합하지 않는다.

### 2-3. 로그인 또는 저장 실패 상황

1. Google/Firebase 로그인 실패: 게임 진입 차단 없음.
2. mission hydrate 실패: 로비와 게임은 유지, 미션 UI만 “동기화 중” 또는 “불러오기 실패” 상태.
3. run-end save 실패: 결과 화면 유지, 재시도는 메모리에 aggregate가 남아 있을 때만 제한적으로.
4. claim 실패: 보상 성공으로 표시하지 않고 버튼에 재시도 상태 표시. 단, claim transaction gate 전에는 버튼 자체를 disabled로 둔다.
5. 어떤 실패도 신이 세팅한 그래픽, 타이틀, 캐릭터, 기존 게임 화면 표시 조건이 되면 안 된다.

---

## 3. Mission state machine

```text
locked -> available -> active -> completed_unclaimed -> claimed
                  \-> tracked/pinned (표시 상태, 본질 상태 아님)
```

상태 설명:

- `locked`: 선행 조건 미충족. 예: Stage 2 관련 미션은 Stage 1 클리어 전에는 잠금.
- `available`: 진행 가능. MVP에서는 수동 시작 없이 자동 진행된다.
- `active`: 현재 이벤트 집계 대상. MVP에서는 available과 거의 같다.
- `tracked` 또는 `pinned`: HUD에 보여주도록 사용자가 고정한 표시 상태다. 미션의 완료 상태와 분리한다.
- `completed_unclaimed`: 목표 달성, 보상 수령 전.
- `claimed`: 보상 수령 완료. 같은 catalog version에서 재수령 불가.

런 관련 reset 규칙:

1. `gameKey`가 바뀌면 run-scope counter를 초기화한다.
2. account-scope counter는 Firebase hydrate된 원격 진행도에서만 누적한다.
3. stale `stageId` 또는 stale `gameKey` 이벤트는 폐기한다.
4. `gameover`여도 이미 달성한 run-scope 미션은 완료 가능하다.
5. `clear`는 생존/클리어 미션을 같은 run-end 평가에서 확정한다.

---

## 4. Source module/file map

아래는 구현할 때 손댈 가능성이 있는 파일 지도다. 이 문서는 파일을 만들거나 수정하지 않는다.

### 4-1. 신규 순수 로직 후보

- `Developer/r3f_prototype/src/lib/missionCatalog.js`
  - 30개 미션 정적 정의.
  - id, sourceNumber, titleKey, scope, objective, unlock, rewardProposal, rollout.
- `Developer/r3f_prototype/src/lib/missionEvents.js`
  - 표준 이벤트 type과 payload 정규화.
- `Developer/r3f_prototype/src/lib/missionProgress.js`
  - reducer, selector, state machine, claim 가능 판정.
- `Developer/r3f_prototype/src/lib/missionProgress.test.js`
  - run reset, locked, completed, claimed, no duplicate claim 순수 테스트.

### 4-2. 기존 runtime 연결 후보

- `Developer/r3f_prototype/src/store/useGameStore.js`
  - `recordMissionEvent(event)` 진입점.
  - resetGame, run end, clear, level-up, weapon state 관찰.
- `Developer/r3f_prototype/src/components/XpTextbook.jsx`
  - `pickup_collected { itemType: 'xpTextbook' }`.
- `Developer/r3f_prototype/src/components/GoldCoin.jsx`
  - `pickup_collected { itemType: 'goldCoin' }`.
- `Developer/r3f_prototype/src/components/Enemies.jsx`
  - Phase 2+에서 `enemy_killed`, `enemy_type_spawned`, `boss_spawned`, `boss_killed`.
- `Developer/r3f_prototype/src/components/Weapons/*`
  - Phase 4에서 `weapon_hit`, last-hit 처치 연결.
- `Developer/r3f_prototype/src/components/QuestWorldLayer.jsx`
  - `quest_completed`, `interaction_triggered`.
- `Developer/r3f_prototype/src/components/StudentDialogueTrigger.jsx`
  - 첫 조사/대사 상호작용.
- `Developer/r3f_prototype/src/lib/hanako.js` 또는 관련 companion 경로
  - `companion_heal { companionId: 'hanako' }`.

### 4-3. Firebase 저장 후보

- `Developer/r3f_prototype/src/lib/firebaseProgress.js`
  - `progress.missions` normalization/hydrate/save.
  - `pinnedMissionIds`를 저장한다면 같은 progress 아래에 둔다.
- Firebase path:
  - `users/{uid}/progress/missions`
- claim transaction 범위:
  - `users/{uid}` 또는 `users/{uid}/progress`
  - 이유: `progress.goldTotal`과 `progress.missions.claimLedger`를 원자적으로 함께 바꿔야 한다.

### 4-4. UI 후보

- `Developer/r3f_prototype/src/components/Lobby.jsx`
  - 하단 nav 4번째 슬롯에 `미션` 버튼.
- `Developer/r3f_prototype/src/components/MissionCenter.jsx`
  - 미션 목록, 탭, 상세, 받기.
- `Developer/r3f_prototype/src/components/MissionTracker.jsx`
  - 인게임 HUD 접힘 tracker.
- `Developer/r3f_prototype/src/components/HUD.jsx`
  - tracker 배치, overlay 우선순위.
- `Developer/r3f_prototype/src/components/GameplayScreen.jsx`
  - HUD에 pinned mission 상태 전달.
- 결과 모달 관련 컴포넌트
  - 미션 진행 1줄 요약.

---

## 5. Event/counter contract and 30-mission mapping

### 5-1. 표준 MissionEvent DTO

```ts
type MissionEvent = {
  type: string
  stageId?: 'stage1' | 'stage2' | 'stage3' | 'stage4'
  enemyType?: 'E01' | 'E02' | 'E03' | 'E04' | 'E05' | 'E06' | 'E07' | string
  enemyId?: string
  enemyGeneration?: number | string
  weaponKey?: string
  itemType?: string
  bossId?: string
  questId?: string
  companionId?: string
  value?: number
  occurredAtMs: number
  runId: string
  gameKey: number | string
}
```

계약 원칙:

1. 이벤트는 게임 결과를 바꾸지 않는다.
2. 이벤트는 실제 확정 지점에서 한 번만 발행한다.
3. hit 이벤트는 프레임마다 남발하지 않고 실제 피해 확정 지점에서만 카운트한다.
4. enemy-type kill과 weapon last-hit kill은 pooled enemy 경로와 component enemy 경로 양쪽에서 동일한 `recordMissionEvent('enemyKilled', ...)` 진입점으로 들어와야 한다.
5. kill 계열 이벤트는 `enemyId + enemyGeneration + runId` dedupe key를 사용해 같은 적 사망이 두 번 세지지 않게 한다.
6. Firebase에는 raw log를 저장하지 않는다.
7. 런 중에는 메모리 집계, 런 종료에 batch 저장한다.

### 5-2. counterKey 표준

| 이벤트 | counterKey 예시 | 설명 |
|---|---|---|
| XP 교과서 pickup | `pickup.xpTextbook.count` | 교과서 획득 수 |
| 골드 코인 pickup | `pickup.goldCoin.count` | 코인 획득 수 |
| 점심 pickup | `pickup.lunch.count` | lunch 계열 획득 수 |
| 생존 시간 | `stage.stage1.bestSurvivalSec` | best value는 max 처리 |
| 스테이지 클리어 | `stage.stage1.clearCount` | account 누적 |
| 레벨업 선택 | `upgrade.choice.count` | 선택 확정 기준 |
| enemy kill | `enemy.E01.killCount` | enemyType 기준 |
| weapon last-hit | `weapon.pencilThrow.killCount` | 마지막 타격 무기 기준 |
| weapon hit | `weapon.tumbler.hitCount` | 실제 hit 기준 |
| special spawn 후 생존 | `special.RZT.survivedAfterSpawnSec` | 등장 이후 생존 시간 |
| boss spawned | `boss.B02.spawnCount` | 보스 조우 |
| boss killed | `boss.B01.killCount` | 보스 처치 |
| interaction | `interaction.trigger.count` | prop/student 조사 |
| quest completed | `quest.any.completeCount` | 퀘스트 완료 |
| companion heal | `companion.hanako.healCount` | 하나코 회복 |

### 5-3. 30개 미션 mapping 요약

전체 설명은 `Planner/new_content_missions_30_2026-08-15.md`를 정본으로 본다. 여기서는 구현 연결만 요약한다.

| # | 구현 그룹 | 대표 counter/event | rollout |
|---:|---|---|---|
| 1 | pickup | `pickup.xpTextbook.count >= 1` | MVP |
| 2 | survival | `stage.stage1.bestSurvivalSec >= 30` | MVP |
| 3 | enemy kill | `enemy.E01.killCount >= 10` | Phase 2 |
| 4 | weapon last-hit | `weapon.pencilThrow.killCount >= 15` | Phase 2 |
| 5 | pickup | `pickup.goldCoin.count >= 1` | MVP |
| 6 | upgrade | `upgrade.choice.count >= 1` | MVP |
| 7 | survival | `stage.stage1.bestSurvivalSec >= 60` | MVP |
| 8 | enemy kill | `enemy.E07.killCount >= 3` | Phase 2 |
| 9 | enemy kill | `enemy.E02.killCount >= 3` | Phase 2 |
| 10 | spawn+survival | E03 등장 뒤 20초 생존 | Phase 2 |
| 11 | clear | `stage.stage1.clearCount >= 1` | MVP |
| 12 | pickup | `pickup.lunch.count >= 1` | Phase 3 |
| 13 | stage start | `stage.stage2.startCount >= 1` | Phase 2 |
| 14 | enemy kill | Stage 2+ `enemy.E04.killCount >= 1` | Phase 2 |
| 15 | special+survival | RZT/RZG 등장 뒤 30초 생존 | Phase 3 |
| 16 | boss spawned | `boss.B02.spawnCount >= 1` | Phase 3 |
| 17 | clear | `stage.stage2.clearCount >= 1` | MVP catalog / hidden first activation |
| 18 | special+survival | RZL/RZC 등장 뒤 30초 생존 | Phase 3 |
| 19 | clear | `stage.stage3.clearCount >= 1` | MVP catalog / hidden first activation |
| 20 | clear | `stage.stage4.clearCount >= 1` | MVP catalog / hidden first activation |
| 21 | weapon last-hit | `weapon.schoolBag.killCount >= 10` | Phase 4 |
| 22 | weapon hit | `weapon.tumbler.hitCount >= 50` | Phase 4 |
| 23 | weapon last-hit | `weapon.scienceFlask.killCount >= 8` | Phase 4 |
| 24 | weapon hit | `weapon.bell.hitCount >= 20` | Phase 4 |
| 25 | weapon state | any weapon level >= 5 | MVP |
| 26 | weapon state | active weapon count >= 4 | Phase 2 |
| 27 | interaction | `interaction.trigger.count >= 1` | Phase 3 |
| 28 | quest | `quest.any.completeCount >= 1` | Phase 3 |
| 29 | companion | `companion.hanako.healCount >= 1` | Phase 4 |
| 30 | boss killed | any boss: aggregate `bossKills >= 1`; boss-type expansions need `bossId` payload | Phase 3 |

Stage 1 E04 주의: #14는 반드시 Stage 2 이상 조건을 가진다. Stage 1에는 E04 요구를 넣지 않는다.

---

## 6. Firebase data model and save/claim flow

### 6-1. 저장 경로

현재 코드 상태:

- `firebaseProgress.js`의 create/normalize/clone 경로에는 아직 `progress.missions`가 없다.
- `database.rules.json`의 `progress` 하위 `$other: false` 규칙은 현재 `missions` child를 허용하지 않는다.
- 현재 progress client에는 goldTotal과 claimLedger를 함께 갱신하는 claim transaction API가 없다.
- 따라서 이 절의 저장/수령 흐름은 이미 구현된 기능이 아니라, 구현 전 반드시 통과해야 할 prerequisite이다.

의존성 순서:

1. schema/normalize/clone에 `progress.missions` shape 추가.
2. strict database rules에 `progress.missions` 허용 shape 추가, `$other: false` 유지.
3. transaction/claim ledger 구현으로 double claim과 retry 중복 지급 차단.
4. 위 3개 gate와 Balance QA 승인 통과 후에만 rewarded UI enablement.

저장 경로

```text
users/{uid}/progress/missions
```

정적 미션 정의는 소스 파일에 둔다. Firebase 사용자 데이터에는 미션 이름/긴 설명/전체 보상표를 반복 저장하지 않는다.

### 6-2. 권장 shape

```json
{
  "schemaVersion": 1,
  "missionCatalogVersion": "missions_2026_08_15_v1",
  "updatedAt": "ISO-8601",
  "active": {
    "first_xp_textbook": {
      "counter": 1,
      "target": 1,
      "completedAt": "ISO-8601 or null",
      "claimedAt": "ISO-8601 or null",
      "claimId": "first_xp_textbook:missions_2026_08_15_v1",
      "rewardProposal": { "type": "gold", "amount": 5, "status": "non_final_until_balance_qa" }
    }
  },
  "counters": {
    "pickup.xpTextbook.count": 1,
    "stage.stage1.bestSurvivalSec": 68
  },
  "claimLedger": {
    "first_xp_textbook:missions_2026_08_15_v1": {
      "missionId": "first_xp_textbook",
      "catalogVersion": "missions_2026_08_15_v1",
      "claimedAt": "ISO-8601",
      "rewardProposal": { "type": "gold", "amount": 5, "status": "non_final_until_balance_qa" }
    }
  }
}
```

### 6-3. run-end save flow

1. 런 중 `runMissionAggregate`에 counter delta를 모은다.
2. pickup/kill/hit마다 Firebase write 하지 않는다.
3. 런 종료 또는 결과 화면 진입 때 1회 merge 저장한다.
4. best survival 같은 값은 `max()`로 합친다.
5. count 값은 기존 값 + delta로 합친다.
6. 완료 조건을 충족하면 `completedAt`을 설정한다.
7. 저장 실패 시 결과 화면은 계속 보여준다.
8. 실패분을 localStorage에 저장해 다음 실행 때 복구하지 않는다.

### 6-4. reward claim flow

1. 플레이어가 `받기`를 누른다.
2. uid가 없으면 claim 불가. 게임 진입은 계속 가능.
3. catalog에서 mission과 rewardProposal을 읽는다.
4. `claimId = missionId:missionCatalogVersion`을 만든다.
5. Balance QA 승인 전 모든 `rewardProposal.amount`는 non-final이며 실제 지급 활성화에 사용할 수 없다.
6. Firebase transaction으로 아래를 한 번에 확인/갱신한다.
   - 이미 `claimLedger/{claimId}`가 있으면 지급 금지.
   - `active/{missionId}/claimedAt`이 있으면 지급 금지.
   - 완료되지 않았으면 지급 금지.
   - 성공 시 `progress.goldTotal += approvedReward.amount`.
   - `active/{missionId}.claimedAt`, `claimId`, `approvedReward` 저장.
   - `claimLedger/{claimId}` 저장.
7. 성공 후에만 UI에서 골드와 상태를 갱신한다.
8. 실패 시 “다시 시도” 또는 “저장 실패”로 표시하고 게임은 유지한다.

---

## 7. Failure and login behavior

### 7-1. 로그인 실패

- 플레이 가능.
- 미션 영구 저장 불가.
- 로비/게임 진입을 막지 않는다.
- 안내 문구 예: `로그인하면 미션 진행이 저장됩니다.`

### 7-2. hydrate 실패

- 로그인 성공 자체를 취소하지 않는다.
- 빈 progress로 원격을 덮어쓰지 않는다.
- 미션 센터는 `불러오지 못했습니다 / 다시 시도` 상태.
- 게임 시작 버튼은 유지한다.

### 7-3. save 실패

- 결과 화면 표시를 막지 않는다.
- 런 결과, 기존 골드 흐름, 로비 복귀를 막지 않는다.
- 메모리에 aggregate가 남아 있을 때만 짧게 재시도한다.
- localStorage fallback 없음.

### 7-4. claim 실패

- 보상을 성공으로 표시하지 않는다.
- 골드를 optimistic update 하지 않는다.
- remote reload 후 이미 claimed면 `받음`으로 표시한다.
- 계속 실패하면 `다시 시도` 버튼 상태를 유지한다.

### 7-5. 계정 전환

- auth.uid가 바뀌면 이전 uid의 in-memory aggregate를 폐기한다.
- A 계정 progress를 B 계정으로 복사하지 않는다.
- guest progress를 로그인 계정에 자동 합치지 않는다.

---

## 8. Mobile-first screen inventory

MVP 화면 조각은 6개다.

1. Lobby mission button
   - 위치: 로비 하단 nav 4개 슬롯 중 2번째 추천.
   - 순서: 무기 / 미션 / 랭킹 / 상점.
   - 최소 터치: 48x48px.
2. Mission center list
   - 추천/진행중/완료/전체 탭.
   - 모바일에서는 거의 전체 화면 모달.
3. Mission detail
   - 목록 카드 선택 시 내부 detail view 또는 bottom sheet.
4. Gameplay HUD tracker
   - 왼쪽 상단 pause/quest bag 아래.
   - 접힘 기본, 최대 1~2개만 노출.
5. Result summary
   - 결과 모달 안에 1~2줄 요약.
   - 보상 전부 수령은 미션 센터로 유도.
6. Desktop mission center
   - 720px 이상에서 2열 가능.

---

## 9. ASCII wireframes

### 9-1. Lobby

```text
┌────────────────────────────┐
│ 플레이어명             🪙  │
│ [시즌] 여름방학 D-3        │
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ Stage 1 보스 프리뷰     │ │
│ │ 최고기록 02:10          │ │
│ │              [입장하기] │ │
│ │ [기록]                  │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ Stage 2 ...             │ │
│ └────────────────────────┘ │
├────────────────────────────┤
│ [무기] [미션●2] [랭킹] [상점] │
└────────────────────────────┘
```

### 9-2. Mission center

```text
┌────────────────────────────┐
│ 미션 센터              [×] │
│ 오늘의 목표와 진행 보상     │
├────────────────────────────┤
│ [추천] [진행중] [완료] [전체]│
├────────────────────────────┤
│ 받을 보상 2개        [모두받기]│
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ ★ 첫 Stage 1 탈출       │ │
│ │ Stage 1 클리어 1회      │ │
│ │ ███████░░░ 0/1          │ │
│ │ 보상 제안 20골드  [받기 비활성] │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ 핀  첫 30초 버티기      │ │
│ │ Stage 1 30초 생존       │ │
│ │ █████░░░░░ 21/30초      │ │
│ │ 보상 제안 5골드  [고정] │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ 🔒 Stage 2 탈출         │ │
│ │ Stage 2 진입 후 공개    │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

### 9-3. Mission detail

```text
┌────────────────────────────┐
│ [←] 첫 Stage 1 탈출        │
├────────────────────────────┤
│ 목표                         │
│ Stage 1에서 240초까지 생존하고│
│ 탈출 포탈을 통해 클리어한다.  │
│                              │
│ 진행                         │
│ ███████░░░ 0/1               │
│                              │
│ 보상                         │
│ 🪙 20 골드 제안              │
│ Balance QA 전까지 비활성     │
│                              │
│ 도움말                       │
│ 먼저 Stage 1에서 1분 생존을  │
│ 목표로 움직여 보세요.        │
├────────────────────────────┤
│ [고정하기]             [닫기] │
│ 완료 시:              [받기] │
└────────────────────────────┘
```

### 9-4. HUD tracker

```text
접힘
┌──────────────┐
│ 미션 1/3  ▾  │
│ 7/10 녹색좀비 │
└──────────────┘

펼침
┌──────────────────┐
│ 고정 미션      ▴ │
│ 녹색좀비 7/10    │
│ 첫 30초 21/30초  │
└──────────────────┘
```

권장 위치: `top: safe-area + 52~60px`, `left: 14px`. 폭은 `min(220px, calc(100vw - 28px))`.

거리 병기: 현행 퀘스트 월드 상호작용 반경은 `0.82 units = 0.205 블록`이다. 미션 tracker는 이 반경, 오브젝트 배치, 충돌 범위를 변경하지 않는다.

### 9-5. Result summary

```text
┌──────────────────────┐
│ STAGE CLEAR!          │
│ 클리어 타임 04:00     │
│ 획득 골드 20 / 총 120 │
│ ───────────────────  │
│ 미션 진행             │
│ ✓ 첫 Stage 1 탈출     │
│ 받을 보상 1개          │
│ [미션 센터에서 받기]   │
│ ───────────────────  │
│ [다음] [랭킹] [로비]   │
└──────────────────────┘
```

### 9-6. Desktop

```text
┌──────────────────────────────────────────────┐
│ Lobby / Gameplay background                   │
│                                              │
│      ┌────────────────────────────────┐      │
│      │ 미션 센터                  [×] │      │
│      ├──────────────┬─────────────────┤      │
│      │ 추천/진행/완료 │ 상세 또는 목록     │      │
│      │ 미션 카드 목록 │ 선택 미션 상세     │      │
│      │              │                 │      │
│      └──────────────┴─────────────────┘      │
└──────────────────────────────────────────────┘
```

---

## 10. Responsive/touch/accessibility rules

### 10-1. 모바일 반응형

- Mission center width: `min(100vw - 24px, 560px)`.
- Mission center height: `calc(100dvh - safe-area - 24px)`.
- Header height: 56~64px.
- Tab button height: 최소 44px.
- Card min-height: 96px.
- Main CTA height: 최소 44px, 권장 48px.
- Card gap: 9~12px.
- 좌우 padding: 12px.

### 10-2. 데스크톱 반응형

- 720px 이상: 2열 가능.
- 왼쪽 목록: 약 320px.
- 오른쪽 상세: 360px 이상.
- Modal max-width: 760px.
- Modal max-height: `min(82dvh, 720px)`.
- hover는 보조 효과만 사용한다.

### 10-3. 터치/키보드

- 모든 버튼 최소 44px, 주요 CTA 48px 권장.
- `Esc`: 상세 -> 목록 -> 닫기.
- `Tab`: 닫기, 탭, 카드, CTA 순서.
- `Enter/Space`: 선택 또는 수령.
- 배경 클릭 닫기는 모바일 실수 때문에 MVP 비추천.
- 전투 중 핀 편집은 MVP 제외.

### 10-4. 접근성

- 색상만으로 상태를 구분하지 않는다.
- 상태 칩 텍스트: `진행`, `완료`, `받음`, `잠김`, `저장 대기`.
- 진행 bar에는 숫자도 함께 표시한다.
- 완료 toast만 `aria-live="polite"` 사용.
- 매 프레임 바뀌는 진행 수치는 스크린리더가 계속 읽지 않게 한다.
- 한국어 줄바꿈은 `word-break: keep-all`, `overflow-wrap: anywhere`를 사용한다.
- disabled 버튼은 회색뿐 아니라 텍스트 이유를 표시한다.

---

## 11. Phased implementation order with catalog MVP 10 and first activation slice

### Phase 0 — 문서/정책 고정

- 이 문서와 기존 전문 산출물을 정본으로 삼는다.
- no localStorage, no title change, no gameplay blocking, reward proposal 상태를 고정한다.

### Phase 1A — catalog MVP 10, 기존 카운터 우선

카탈로그/계산기에는 MVP 후보 10개를 계획 상태로 둘 수 있다. 단, 이것은 첫 활성 배포 범위가 아니다.

MVP 10개 catalog 후보:

1. #11 첫 Stage 1 탈출
2. #17 Stage 2 탈출
3. #19 Stage 3 탈출
4. #20 Stage 4 탈출
5. #2 첫 30초 버티기
6. #7 Stage 1 1분 생존
7. #5 첫 골드 코인
8. #1 첫 교과서 줍기
9. #6 첫 레벨업 선택
10. #25 무기 하나 Lv.5

### Phase 1B — first activated release slice, Stage 1 중심

첫 활성 배포는 Stage 1 mobile playable loop 안정화를 우선해 아래 7개만 연다.

- #1 첫 교과서 줍기
- #2 첫 30초 버티기
- #5 첫 골드 코인
- #6 첫 레벨업 선택
- #7 Stage 1 1분 생존
- #11 첫 Stage 1 탈출
- #25 무기 하나 Lv.5

Stage 2~4 clear 미션 #17/#19/#20은 catalog에는 둘 수 있지만 첫 활성 release slice에서는 hidden/locked/future bucket으로 유지한다. 별도 Stage 2~4 QA가 끝나기 전에는 완료 조건, 보상 claim, UI 추천 노출에 포함하지 않는다.

### Phase 2 — enemy type / weapon last-hit / Stage 2 입장

- `enemy_killed.enemyType`, `enemy_killed.weaponKey`, `stage_started`를 연결한다.
- #3, #4, #8, #9, #10, #13, #14, #26 활성화.
- Stage 1 E04 제외 회귀 검증 필수.

### Phase 3 — special / boss / quest / interaction

- `pickup_collected.lunch`, `special_enemy_spawned`, `boss_spawned`, `boss_killed`, `interaction_triggered`, `quest_completed` 연결.
- #12, #15, #16, #18, #27, #28, #30 활성화.
- Stage 2 B02는 v2/no-legacy gate만 인정한다.

### Phase 4 — weapon hit / companion heal

- `weapon_hit`와 `companion_heal`을 실제 확정 지점에서만 발행한다.
- #21, #22, #23, #24, #29 활성화.
- 성능, 중복 이벤트, 배터리 위험을 Balance_QA_Mini가 확인한다.

---

## 12. Implementation tickets in tiny vertical slices

각 ticket은 “작지만 실제 동작하는 세로 조각”이어야 한다.

### Ticket 1 — static catalog skeleton

- 목표: `missionCatalog.js`에 30개 id/sourceNumber/scope/objective/rewardProposal 선언.
- 포함: reward는 반드시 `proposal` 표시.
- 검증: 30개 id 중복 없음, sourceNumber 1~30 연속, localStorage 문자열 없음.

### Ticket 2 — mission progress pure reducer

- 목표: 이벤트를 counter와 state로 바꾸는 순수 함수 작성.
- 포함: locked, available, completed_unclaimed, claimed 판정.
- 검증: run reset, stale gameKey 폐기, claimed 재수령 불가.

### Ticket 3 — catalog MVP 10 in-memory aggregation + first active 7

- 목표: Firebase write 없이 런 중 메모리에서 catalog MVP 10개 진행도를 계산하되, 첫 활성 표시는 Stage 1 중심 7개(#1/#2/#5/#6/#7/#11/#25)로 제한한다.
- 포함: 생존, clear, pickup, level-up, weapon Lv.5.
- 검증: 게임 수치 변화 없음, Stage 1 240초 루프 유지, #17/#19/#20은 hidden/locked 유지.

### Ticket 4 — Firebase mission hydrate/save normalization

- 목표: `users/{uid}/progress/missions`를 읽고 쓰는 normalization 추가.
- 포함: uid 없으면 write 없음, hydrate 실패 시 빈 값으로 overwrite 금지.
- 검증: no localStorage fallback, save 실패가 game start를 막지 않음.

### Ticket 4B — tiny Rules gate

- 목표: `database.rules.json`에 `progress.missions` 하위 허용 shape를 strict하게 추가한다.
- 포함: `active`, `claimLedger`, `counters/aggregates` 중 실제 채택 shape만 허용하고 `$other: false`를 유지한다.
- 검증: missions 없는 기존 snapshot hydrate 통과, 잘못된 mission id/value/drop 후보는 reject 또는 safe ignore 정책 확인.
- 순서: Ticket 4 schema/normalize/clone 통과 뒤, Ticket 5 claim transaction 전.

### Ticket 5 — claim transaction

- 목표: claimLedger 기반 중복 수령 방지.
- 포함: goldTotal과 claimedAt/claimLedger를 transaction으로 함께 갱신.
- 검증: double click, retry, already claimed에서 중복 지급 없음.
- 주의: Ticket 4, Ticket 4B, Ticket 5와 Balance QA gate 통과 전까지 reward claim UI는 disabled이며 `rewardProposal.amount`는 non-final이다.

### Ticket 6 — lobby mission button + mission center MVP

- 목표: 로비 하단 nav에 미션 버튼, 미션 센터 목록 표시.
- 포함: 추천/진행중/완료/전체 탭, 상태 칩, 받기 버튼.
- 검증: 타이틀 화면 변경 없음, 44~48px touch target 유지.

### Ticket 7 — HUD tracker + result summary

- 목표: 인게임 접힘 tracker와 결과 1줄 요약.
- 포함: 보스/마틸다/레벨업/일시정지 overlay 우선순위 준수.
- 검증: tracker가 전투 시야를 가리지 않고 결과 버튼 영역을 축소하지 않음.

### Ticket 8 — Phase 2 enemy/weapon event expansion

- 목표: enemyType, weaponKey last-hit 이벤트를 확정 지점에 연결.
- 포함: #3/#4/#8/#9/#14 등.
- 포함: pooled enemy kill 경로와 component `Enemy.jsx` kill 경로 양쪽에서 동일 event DTO를 발행.
- 검증: Stage 1 E04 제외, kill 1회당 event 1회, `enemyId + enemyGeneration + runId` dedupe로 중복 count 없음.

### Ticket 9 — Phase 3 special/boss/quest event expansion

- 목표: special spawn, boss spawn/kill, quest, interaction 연결.
- 포함: B02 v2/no-legacy gate 확인.
- 포함: #30이 “아무 보스 1회 처치”라면 기존 aggregate `bossKills`를 사용할 수 있다. B01/B02/B03/B04별 확장 미션은 `bossId` payload와 `boss.{bossId}.killCount` counter가 필요하다.
- 검증: legacy B02 경로/fallback 없음.

### Ticket 10 — Phase 4 hit/heal event expansion

- 목표: weapon_hit, companion_heal 연결.
- 포함: 프레임별 spam 방지.
- 검증: 성능/중복/배터리 위험 QA.

---

## 13. Acceptance criteria

### 13-1. 문서/범위 acceptance

- 이 작업은 `Planner/mission_system_implementation_and_layout_master_2026-08-15.md`만 생성/수정한다.
- 코드, 테스트, Firebase 데이터, Rules 배포, Studio, 타이틀, 오디오, Git commit/push 변경 없음.
- 필요한 전문 산출물 4개를 모두 통합했다.
- required sections와 6개 ASCII wireframe이 문서 안에 존재한다.

### 13-2. 구현 acceptance

- 30개 미션 모두가 catalog에 있으며 id가 중복되지 않는다.
- catalog MVP 10개는 기존 카운터 또는 최소 관찰 이벤트만 사용한다.
- 첫 활성 release slice는 Stage 1 중심 #1/#2/#5/#6/#7/#11/#25만 포함한다.
- Stage 2~4 clear 미션 #17/#19/#20은 별도 QA 전까지 hidden/locked/future bucket으로 유지한다.
- 미션 추가로 Stage 1 240초 = 4분 루프, Stage 1 E04 제외, B01/B02 보스 타이밍, Matilda 타이밍, 무기 피해, 적 HP가 바뀌지 않는다.
- 모든 거리/범위 표기는 units와 블록을 함께 쓴다. 예: 상호작용 반경 `0.82 units = 0.205 블록`, 연필 사거리 `22 units = 5.5 블록`.
- 런 중 Firebase write는 pickup/kill/hit마다 발생하지 않는다.
- 런 종료 mission save는 1회 batch 중심이다.
- claim은 transaction + claimLedger로 중복 지급을 막는다.
- `progress.missions` create/normalize/clone, strict RTDB rules, claim transaction이 모두 구현·검증되기 전에는 rewarded UI를 enabled 처리하지 않는다.
- uid가 없으면 mission progress write 없음.
- 로그인/hydrate/save/claim 실패가 게임 진입과 플레이를 막지 않는다.
- localStorage, IndexedDB, 임시 JSON, token copy fallback이 없다.
- 타이틀 화면은 UI, 문구, 버튼, 그래픽, 오디오 모두 변경하지 않는다.
- reward amount는 Balance_QA_Mini 승인 전 proposal로 표시한다.

### 13-3. UI acceptance

- 로비 미션 버튼은 하단 nav 안에 있고 최소 48x48px 터치 영역을 가진다.
- 미션 센터는 모바일에서 `min(100vw - 24px, 560px)` 폭 규칙을 따른다.
- 탭/버튼은 44px 이상, 주요 CTA는 48px 권장이다.
- HUD tracker는 기본 접힘이며 보스/마틸다/레벨업/일시정지/대화/결과 overlay보다 우선하지 않는다.
- 결과 요약은 1~2줄만 보여주며 기존 결과 CTA를 작게 만들지 않는다.
- 색상만으로 상태를 구분하지 않는다.
- 진행 bar와 숫자를 함께 제공한다.

---

## 14. Risks and decisions needing user approval

1. 보상 골드량 확정
   - 현재 모든 보상은 proposal이다.
   - Balance_QA_Mini가 240초 모바일 Stage 1 루프 기준으로 경제 영향을 검토해야 한다.
2. 미로그인 플레이어에게 런 중 미션 toast를 보여줄지
   - 보여주면 저장되지 않는 성취로 혼동될 수 있다.
   - MVP 기본안은 미로그인 영구 완료 toast를 최소화한다.
3. guest progress를 로그인 후 이전할지
   - 현재 기본안은 자동 이전 금지다.
   - 필요하면 별도 UX와 서버 정책 결정이 필요하다.
4. Stage 2~4 진행 미션을 MVP UI에 바로 노출할지
   - 전문 산출물은 MVP 10개에 Stage 2~4 clear를 포함했다.
   - 제품 우선순위상 첫 릴리스는 Stage 1 관련 미션만 좁혀도 된다.
5. `counters` 공유 저장을 MVP에 포함할지
   - 단순하게 `active.{missionId}.counter`만으로 시작할 수 있다.
   - 여러 미션이 같은 이벤트를 공유하기 시작하면 `counters`가 유리하다.
6. Rules validation 배포 시점
   - 문서상 초안은 있지만 실제 Rules 배포는 별도 QA가 필요하다.
7. 모두받기 버튼 MVP 포함 여부
   - UI 문서에는 optional claim strip이 있다.
   - MVP 1차에서는 개별 받기만 두는 것이 더 안전하다.
8. Phase 4 `weapon_hit` 카운터
   - hit 수는 성능과 중복 이벤트 위험이 크다.
   - 구현 전 Balance_QA_Mini 성능/중복 기준 확정이 필요하다.

---

## 15. Balance_QA_Mini QA handoff notes

Balance_QA_Mini는 구현 wave마다 아래를 확인한다.

1. Stage 1 240초 = 4분 루프가 유지되는가.
2. Stage 1 E04 제외가 유지되는가.
3. 미션 이벤트가 적 스탯, 스폰, 피해, 회복 수치를 바꾸지 않는가.
4. pickup/kill/hit마다 Firebase write가 발생하지 않는가.
5. claim double click과 retry에서 골드가 중복 지급되지 않는가.
6. 로그인 실패, hydrate 실패, save 실패, claim 실패에서 게임 진입이 막히지 않는가.
7. localStorage/IndexedDB/임시 JSON/token copy fallback이 없는가.
8. HUD tracker가 보스/마틸다/투사체/대형 스폰 경고를 가리지 않는가.
9. 모바일 터치 타깃 44~48px가 지켜지는가.
10. rewardProposal이 확정 보상처럼 과장 노출되지 않는가.

---

## 16. Final integration summary

가장 안전한 첫 구현은 “정적 catalog + 순수 reducer + Stage 1 중심 첫 활성 slice(#1/#2/#5/#6/#7/#11/#25) + Firebase schema/normalize/clone prerequisite + strict Rules gate + claim transaction gate + disabled reward UI + 로비 미션 버튼 + 단일 열 미션 센터 + 접힘 HUD tracker + 결과 1줄 요약”이다.

이 방식은 30개 미션 catalog를 현재 게임에 넣되, Stage 1 모바일 playable loop, 타이틀 잠금, Firebase-only 저장 정책, no localStorage, 로그인 실패 시 게임 계속 가능 원칙을 동시에 지킨다. Stage 2~4 clear 미션은 별도 QA 전까지 hidden/locked로 둔다.
