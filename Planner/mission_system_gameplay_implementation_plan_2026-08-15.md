# 미션 시스템 게임플레이 구현 기획

> **For Hermes:** 구현 단계가 열리면 `subagent-driven-development` 또는 Kanban 하위 카드로 `backendmini`(Firebase), `uimini`(HUD/핀/보상 UI), `levelmini`(게임플레이 이벤트), `balanceqa`(보상·회귀 검증)를 분리한다. 이 문서는 PLANNING ONLY 산출물이며 코드·테스트·Firebase·Studio·타이틀·오디오·Git 변경을 하지 않는다.

**Goal:** `Planner/new_content_missions_30_2026-08-15.md`의 30개 미션을 현재 240초 생존 루프에 안전하게 붙이는 게임플레이 아키텍처를 정의한다.

**Architecture:** 미션은 새 전투 수치나 스폰을 만들지 않고, 기존 런타임 이벤트를 관찰해 진행도를 누적하는 얇은 메타 진행 레이어로 둔다. 런 중 진행은 `useGameStore`의 런타임 상태와 이벤트 집계기가 처리하고, 영구 진행·보상 수령 상태는 Firebase `users/{uid}` 진행 스냅샷에만 저장한다. 기존 `quests.js`의 스테이지 퀘스트는 “월드 상호작용 콘텐츠”로 보존하고, 신규 `missions`는 계정/런 목표와 보상 수령을 관리하는 별도 카탈로그로 둔다.

**Tech Stack:** React/R3F, Zustand `useGameStore`, Firebase Realtime Database progress runtime, Vitest. 브라우저 `localStorage`/로컬 파일/임시 JSON은 영구 진행 저장에 사용하지 않는다.

---

## 0. 필수 게이트 확인

- precommand checker 결과:
  - profile: `levelmini`
  - resolved_domains: `common`, `gameplay`
  - matched_domains: `gameplay`
  - match_evidence: keyword `gameplay`
  - combined_receipt_sha256: `1ceacff77cd4b9b432dfebb2ccf59622f163871bd552a03f3089ec688ca4c9be`
- `GSTACK_OK` 확인 완료.
- 읽은 필수 문서: `AGENTS.md`, `project_develop_policy.md`, `Bang_Rules.md`, `CLAUDE.md`, `SESSION_CONTINUITY.md`, `SESSION_MEMORY.md` 최신 단일 엔트리, mandatory precommand README/manifest, `stage2-boss-v2-no-legacy-gate.md`, 최신 gameplay/QA/levelmini 기록, `Planner/new_content_missions_30_2026-08-15.md`, `Planner/current_game_rules.md`.

---

## 1. 반드시 보존할 현재 게임 규칙

1. Stage 1 모바일/플레이 가능 루프 안정화가 최우선이다. 미션은 현재 루프를 관찰·보상할 뿐 스폰, HP, 무기, 카메라, 맵 크기, 타이틀을 바꾸지 않는다.
2. Stage 기본 생존 루프는 240초 = 4분이다. `stageConfig.js`와 현재 게임 규칙 기준을 유지한다.
3. Stage 1은 `E04` 원거리/투사체 적을 제외한다. Stage 1 미션은 `E04` 처치/조우를 요구하지 않는다.
4. 보스 처치와 스테이지 클리어는 분리한다. 보스 처치는 보상/기록/미션 이벤트일 수 있지만, Stage clear는 현재처럼 탈출/clear path에서만 발생한다.
5. `Game` interval 기반 런타임 시간 발행과 `gameKey` 리셋 패턴을 유지한다. 미션 시간 체크가 `useFrame` 남발이나 stale run 이벤트를 만들면 안 된다.
6. 타이틀 화면, 타이틀 BGM, Graphics Studio, Firebase Studio 값은 변경 대상이 아니다.
7. 로그인/저장 실패가 게임플레이 진입과 그래픽 표시를 막으면 안 된다. 단, 영구 미션 저장·보상 수령은 Firebase 진행 스냅샷이 준비된 경우에만 확정한다.
8. 영구 진행 저장은 Firebase `users/{uid}`만 사용한다. `localStorage`, 브라우저 캐시, 로컬 파일, 임시 JSON 저장 금지.

---

## 2. 용어와 범위

- “미션”: 계정 또는 한 판 플레이 목표. 진행도, 완료 상태, 보상 수령 상태를 가진다.
- “퀘스트”: 기존 `quests.js`의 스테이지 월드 상호작용 콘텐츠. NPC/기물/아이템 왕복 흐름이다.
- “런 미션”: 한 판 안에서만 목표치를 달성해야 하는 미션. 예: 교과서 1회 줍기, E01 10마리 처치.
- “누적 미션”: 여러 판/계정 기록으로 달성 가능한 미션. 예: Stage 2~4 클리어, 보스 처치 1회. 단, 카탈로그가 `scope: run`/`scope: account`를 명확히 가진다.
- “핀/트랙”: 플레이 중 HUD에 추적할 미션을 최대 N개 노출하는 UX. 본 문서는 권장 동작만 정의하고 UI 구현은 만들지 않는다.

---

## 3. 미션 생명주기와 상태 머신

### 3-1. 상태 정의

```text
locked -> available -> active/tracked -> completed_unclaimed -> claimed
                  \-> hidden_completed(optional, MVP에서는 사용 안 함)
```

- `locked`: 선행 미션/스테이지/카탈로그 조건 미충족. 진행 이벤트를 받아도 보상 상태로 전환하지 않는다.
- `available`: 조건 충족, 자동 진행 가능. MVP에서는 미션을 수동 시작하지 않아도 진행된다.
- `active`: 현재 런에서 진행 집계 대상. MVP에서는 `available`과 동일하게 자동 active 처리한다.
- `tracked`: 플레이어가 HUD에 핀한 active 미션. 상태 자체라기보다 `pinnedMissionIds` 배열에 가깝다.
- `completed_unclaimed`: 완료 조건 충족, 보상 수령 전. Firebase 저장이 가능하면 영구 완료로 확정한다.
- `claimed`: 보상 수령 완료. 재수령 불가.

### 3-2. 런 시작/종료 규칙

- 런 시작(`resetGame`) 시:
  - `runMissionCounters`를 0으로 초기화한다.
  - 현재 `stageId`, 새 `gameKey`, `runStartedAt`을 기준으로 이벤트 집계 세션을 만든다.
  - Firebase progress가 아직 hydrate되지 않아도 게임은 시작 가능하다.
  - hydrate 전에는 영구 mission progress를 쓰지 않고, 런타임 미션 토스트도 “저장 대기/오프라인 진행은 확정 전” 정책을 따라야 한다.
- 런 중:
  - 기존 authoritative event path에서만 미션 이벤트를 발행한다.
  - stale `stageId`/`gameKey` 이벤트는 폐기한다.
- 런 종료(`_onRunEnd`, `clearStage`, gameover) 시:
  - 생존 시간, clear 여부, 런 카운터를 최종 평가한다.
  - per-run 미션은 목표 달성 여부만 확정하고, 미달성 런 카운터는 다음 런으로 이월하지 않는다.
  - account/cumulative 미션은 Firebase hydrated 상태에서만 영구 누적값을 반영한다.

### 3-3. 보상 수령 흐름

1. 완료 조건 달성.
2. `completed_unclaimed` 표시.
3. 플레이어가 “받기” 선택.
4. Firebase progress hydrated면 transaction/update로 `missionProgress[missionId].claimed = true`와 gold 증가를 함께 저장한다.
5. 저장 성공 후 골드 UI 반영 및 `claimed` 전환.
6. 저장 실패 시 게임플레이는 유지하고 “저장 실패, 다시 시도” 상태를 표시한다. 보상을 로컬에 확정 저장하지 않는다.

보상 수치는 전부 제안이며 Balance_QA_Mini 검토 전 확정값이 아니다.

---

## 4. 추천 카탈로그 shape

### 4-1. 파일 책임(계획만, 생성하지 않음)

- `Developer/r3f_prototype/src/lib/missionCatalog.js`
  - 30개 미션 정본 정의.
  - id/title/tier/scope/objective/rewardProposal/unlock/conditions/event needs/qa notes.
- `Developer/r3f_prototype/src/lib/missionEvents.js`
  - 표준 이벤트 타입 enum, payload 정규화, event -> counter reducer.
  - 기존 이벤트와 최소 신규 이벤트의 경계 정의.
- `Developer/r3f_prototype/src/lib/missionProgress.js`
  - mission progress 기본 shape, normalization, selector helpers.
  - locked/available/completed/claimed 판정 순수 함수.
- `Developer/r3f_prototype/src/store/useGameStore.js`
  - 직접 복잡한 조건식을 넣지 않고 `recordMissionEvent(event)`만 호출.
  - 런 시작/종료에서 mission runtime reset/evaluation 호출.
- `Developer/r3f_prototype/src/lib/firebaseProgress.js`
  - `missionProgress`와 `pinnedMissionIds`를 Firebase progress schema에 포함.
  - hydrate 전 영구 쓰기 금지, schema normalization만 담당.
- `Developer/r3f_prototype/src/components/MissionTracker.jsx` 또는 UI 카드(추후 `uimini`)
  - 핀한 미션, 완료/보상 수령 UI 표시.
- `Developer/r3f_prototype/src/lib/__tests__/mission*.test.js`
  - 순수 reducer, unlock, claim, no-localStorage, no-prehydrate-write 테스트.

### 4-2. 예시 shape

```js
{
  id: 'm001_first_xp_textbook',
  sourceNumber: 1,
  tier: 'onboarding',
  title: '첫 교과서 줍기',
  scope: 'run', // 'run' | 'account'
  unlock: { type: 'always' },
  objective: { event: 'pickup_collected', filters: { itemType: 'xpTextbook' }, target: 1 },
  rewardProposal: { gold: 5, balanceStatus: 'proposal' },
  track: { defaultPinned: true, priority: 10 },
  eventNeed: 'existing_or_minimal_pickup',
  qaNotes: ['Stage 1 루프 수치 변경 없음']
}
```

---

## 5. 표준 이벤트와 카운터 집계

### 5-1. 기존 이벤트/상태에서 바로 쓸 수 있는 것

- 런/스테이지: `currentStageId`, `gameKey`, `phase`, `_onRunEnd`, `clearStage`, `clearStageAndStartNext`, `resetGame`.
- 생존 시간: runtime elapsed ms/seconds, `_onRunEnd`의 `runSurvivalSeconds`, `checkSurvivalMilestone`.
- 클리어 기록: `stage1Clears`, `stage2Clears`, `stage3Clears`, `stage4Clears`.
- 골드 획득: `gainGold`, 골드 코인 collect 경로.
- 교과서 XP: `XpTextbook` collect -> `gainXp(value)`.
- 레벨업: `gainXp`의 level-up 처리, `runLevelUps`.
- 무기 레벨/보유: store `weapons` state, upgrade selection result.
- 퀘스트: `startQuest`, `collectQuestItem`, `completeQuest`.
- 보스: `spawnBoss`, `recordBossDefeat`, `recordBossKill`.
- 적 encounter: `recordZombieEncounter`는 spawn/encounter에는 쓸 수 있으나 kill type 집계와는 별개다.

### 5-2. 최소 신규 이벤트가 필요한 것

- enemyType별 처치: `enemy_killed { enemyType, stageId, weaponKey? }`
- weapon last-hit 처치: `enemy_killed.weaponKey`
- weapon hit 횟수: `weapon_hit { weaponKey, enemyType?, damageType? }`
- enemy/special spawn 이후 생존: `enemy_type_spawned`, `special_enemy_spawned`, `boss_spawned { bossId }`
- lunch pickup: `pickup_collected { itemType: 'lunch' }`
- investigation/prop/student dialogue: `interaction_triggered { subjectType, targetId }`
- companion heal: `companion_heal { companionId: 'hanako', amount }`

신규 이벤트는 모두 “관찰”이어야 하며 스폰/피해/회복/보상 수치를 바꾸면 안 된다.

---

## 6. 30개 미션 이벤트/카운터 매트릭스

| # | 미션 | scope | 완료 판정 | 기존 카운터/이벤트 | 최소 신규 이벤트 | rollout |
|---:|---|---|---|---|---|---|
| 1 | 첫 교과서 줍기 | run | `xpTextbook` 픽업 1회 | `XpTextbook` collect -> `gainXp` | `pickup_collected.itemType='xpTextbook'` 표준화 | MVP |
| 2 | 첫 30초 버티기 | run | Stage 1 survival >= 30초 | runtime elapsed / `_onRunEnd` | 없음 | MVP |
| 3 | 녹색좀비 첫 처치 | run | E01 kill >= 10 | `recordKill` 총합만 있음 | `enemy_killed.enemyType` | Phase 2 |
| 4 | 연필 적응 훈련 | run | `pencilThrow` last-hit kill >= 15 | weapon state 있음, last-hit 없음 | `enemy_killed.weaponKey` | Phase 2 |
| 5 | 첫 골드 코인 | run | `goldCoin` 픽업 1회 | `GoldCoin` collect -> `gainGold` | `pickup_collected.itemType='goldCoin'` 표준화 | MVP |
| 6 | 첫 레벨업 선택 | run | level-up 선택 확정 1회 | `gainXp`, `runLevelUps`, upgrade confirm path | 필요 시 `upgrade_selected` | MVP |
| 7 | Stage 1 1분 생존 | run | Stage 1 survival >= 60초 | runtime elapsed / `_onRunEnd` | 없음 | MVP |
| 8 | 웃는좀비 알아보기 | run | Stage 1 E07 kill >= 3 | encounter/spawn은 있음 | `enemy_killed.enemyType` | Phase 2 |
| 9 | 탱커 상대 연습 | run | E02 kill >= 3 | 총 kill만 있음 | `enemy_killed.enemyType` | Phase 2 |
| 10 | 러너 피하기 | run | E03 등장 후 20초 생존 | spawn table만 있음 | `enemy_type_spawned` + survival delta | Phase 2 |
| 11 | 첫 Stage 1 탈출 | account | Stage 1 clear 1회 | `stage1Clears`, clear path | 없음 | MVP |
| 12 | 점심 확보 | run | lunch pickup 1회 | `LunchItems` 존재 | `pickup_collected.itemType='lunch'` | Phase 3 |
| 13 | Stage 2 첫 등교 | account | Stage 2 start 1회 | `resetGame(stage2)`, play activity | 필요 시 `stage_started` | Phase 2 |
| 14 | 원거리좀비 첫 대응 | run/account | Stage 2+ E04 kill 1회 | Stage 1 E04 제외 정본 | `enemy_killed.enemyType + stageId` | Phase 2 |
| 15 | 경비 추격 살아남기 | run | Stage 2 RZT/RZG 등장 후 30초 생존 | special spawn 경로 있음 | `special_enemy_spawned` | Phase 3 |
| 16 | Stage 2 보스 조우 | run/account | Stage 2 B02 spawn 확인 | `spawnBoss`, boss type config | `boss_spawned.bossId` | Phase 3 |
| 17 | Stage 2 탈출 | account | Stage 2 clear 1회 | `stage2Clears` | 없음 | MVP |
| 18 | Stage 3 달리기 구간 적응 | run | RZL/RZC 등장 후 30초 생존 | special spawn 경로 있음 | `special_enemy_spawned` | Phase 3 |
| 19 | Stage 3 탈출 | account | Stage 3 clear 1회 | `stage3Clears` | 없음 | MVP |
| 20 | Stage 4 탈출 | account | Stage 4 clear 1회 | `stage4Clears` | 없음 | MVP |
| 21 | 책가방으로 밀어내기 | run | `schoolBag` last-hit kill >= 10 | weapon exists | `enemy_killed.weaponKey` | Phase 4 |
| 22 | 텀블러 궤도 익히기 | run | `tumbler` hit >= 50 | component hit path | `weapon_hit.weaponKey` | Phase 4 |
| 23 | 과학 플라스크 폭발 실험 | run | `scienceFlask` last-hit kill >= 8 | weapon exists | `enemy_killed.weaponKey` | Phase 4 |
| 24 | 종소리 충격파 | run | `bell` hit >= 20 | component hit path | `weapon_hit.weaponKey` | Phase 4 |
| 25 | 무기 하나 Lv.5 | run | any weapon level >= 5 | store `weapons` + upgrade path | 필요 시 `weapon_level_changed` | MVP |
| 26 | 무기 4종 운용 | run | active weapons >= 4 | store `weapons` | 필요 시 `weapon_acquired` | Phase 2 |
| 27 | 첫 조사 상호작용 | run/account | prop/student dialogue trigger 1회 | `StudentDialogueTrigger`, investigation reward | `interaction_triggered` | Phase 3 |
| 28 | 퀘스트 첫 완료 | account | `completeQuest` 1회 | existing quest completion path | `quest_completed` 표준화 | Phase 3 |
| 29 | 하나코의 응원 | run/account | Hanako heal 1회 후 생존 | Hanako heal behavior | `companion_heal` | Phase 4 |
| 30 | 보스 사냥꾼 | account | B01-B04 boss kill 1회 | `recordBossDefeat`, `recordBossKill` | `boss_killed.bossId` | Phase 3 |

---

## 7. “기존 카운터 우선” MVP 10개

`Planner/new_content_missions_30_2026-08-15.md`의 implementation priority를 그대로 따른다.

1. #11 첫 Stage 1 탈출 — `stage1Clears`
2. #17 Stage 2 탈출 — `stage2Clears`
3. #19 Stage 3 탈출 — `stage3Clears`
4. #20 Stage 4 탈출 — `stage4Clears`
5. #2 첫 30초 버티기 — run survival seconds
6. #7 Stage 1 1분 생존 — run survival seconds
7. #5 첫 골드 코인 — gold pickup/gainGold path
8. #1 첫 교과서 줍기 — XP textbook pickup/gainXp path
9. #6 첫 레벨업 선택 — `runLevelUps`/upgrade selected
10. #25 무기 하나 Lv.5 — current run weapon state

MVP 원칙:
- 새 적 타입별 kill, weapon hit, special spawn 이벤트 없이도 완성 가능한 범위만 먼저 낸다.
- 보상은 “제안” 라벨을 유지하고 Balance_QA_Mini 승인 전 확정 지급량으로 문구화하지 않는다.
- UI는 간단한 미션 목록/완료/받기만 허용하고 타이틀·Studio·오디오를 건드리지 않는다.

---

## 8. 단계별 rollout

### Phase 1 — MVP 10개, 기존 카운터 우선

- 미션 catalog/normalizer/reducer 순수 함수.
- Firebase progress shape에 `missions` 추가.
- `stage clears`, survival, pickups, level-up, weapon level 관찰만 연결.
- 최소 UI: 목록, 진행률, 완료, 보상 받기, 1~3개 핀.
- QA: localStorage 미사용, hydrate 전 영구 쓰기 금지, gameplay availability 유지.

### Phase 2 — 적 타입/무기 last-hit/Stage 2 입장

- `enemy_killed` 표준 이벤트에 `enemyType`, `weaponKey`, `stageId`, `gameKey` 포함.
- #3, #4, #8, #9, #10, #13, #14, #26 활성화.
- Stage 1 E04 제외 회귀 테스트를 반드시 포함한다.

### Phase 3 — 특수 이벤트/퀘스트/상호작용/보스

- `special_enemy_spawned`, `boss_spawned`, `boss_killed`, `pickup_collected.lunch`, `interaction_triggered`, `quest_completed` 연결.
- #12, #15, #16, #18, #27, #28, #30 활성화.
- Stage 2 B02는 v2/no-legacy gate만 인정한다.

### Phase 4 — 무기 hit/동료 heal 고급 트래킹

- `weapon_hit` 샘플링/중복 방지 설계 후 #21~#24, #29 활성화.
- `weapon_hit`는 프레임마다 과도하게 쓰지 말고 컴포넌트 hit 처리의 실제 피해 확정 지점에서 카운트한다.
- Balance_QA가 성능/스팸/배터리 위험을 확인한다.

---

## 9. unlock sequencing

권장 해금 순서:

- 기본 always available: #1, #2, #5, #6, #7, #11.
- Stage 1 안정화 후: #3, #4, #8, #9, #10, #12.
- `stage1Clears >= 1`: #13, #14, #15, #16, #17, #26, #27, #28, #30.
- `stage2Clears >= 1`: #18, #19.
- `stage3Clears >= 1`: #20.
- 무기 보유/카드 조건: #21~#25는 해당 무기를 런 중 획득 가능해지는 시점부터 표시한다.
- Hanako 관련 #29는 Hanako가 획득/해금 가능하거나 active companion인 상태에서 표시한다.

MVP에서는 locked 미션을 전부 숨기기보다 “나중에 열림” 그룹으로 보여도 되지만, Stage 1 신규 유저 화면에는 6개 이하만 우선 노출한다.

---

## 10. pin/track behavior

- 권장 핀 슬롯: 3개 이하. 모바일 HUD 가독성을 위해 기본 2개, 최대 3개를 권장한다.
- 첫 실행 기본 핀: #1 첫 교과서 줍기, #2 첫 30초 버티기, #5 첫 골드 코인 중 현재 달성 안 된 2개.
- 진행 중 자동 핀 교체:
  - 완료된 핀은 `completed_unclaimed` 토스트 후 다음 available onboarding 미션으로 제안한다.
  - 자동 교체가 싫은 경우 설정 가능하게 하되, MVP에서는 단순 자동 추천만 둔다.
- 핀 저장:
  - `pinnedMissionIds`는 Firebase progress에 저장한다.
  - 저장 실패 시 현재 세션 UI 상태로만 유지하고 영구 저장된 것처럼 보고하지 않는다.
- HUD 거리/범위 주의:
  - 현행 퀘스트 월드 상호작용 반경은 `0.82 units = 0.205 블록`이다. 미션 핀은 이 반경이나 오브젝트 접근 거리를 바꾸지 않는다.

---

## 11. 실패/reset 규칙

- Gameover:
  - run scope 미션은 달성된 것만 확정한다.
  - “N초 생존”은 죽어도 해당 초 이상 도달했으면 완료다.
  - “등장 후 N초 생존”은 등장 시각부터 death/clear 전까지 실제 생존 시간이 조건을 넘겨야 한다.
- Clear:
  - clear 관련 미션과 survival 미션을 같은 `_onRunEnd('cleared')` 평가에서 확정한다.
- Reset/new run:
  - `gameKey`가 바뀌면 run counters, seen enemy spawn timestamps, run weapon hit counters 초기화.
  - `preserveQuestJourney`는 기존 quest journey만 보존하고 run mission counters를 보존하지 않는다.
- Firebase hydrate 실패:
  - 플레이는 가능해야 한다.
  - 영구 claim/save는 막고 재시도 UX를 둔다.
  - localStorage fallback 금지.
- 중복 이벤트:
  - `gameKey`, event id, source id를 이용해 한 frame/한 collision에서 중복 집계하지 않는다.

---

## 12. 구현 작업 단위 제안(추후 카드화용)

### Task 1: mission catalog 작성

**Objective:** 30개 미션의 id/scope/unlock/objective/rewardProposal을 한 파일에 선언한다.

**Files:**
- Create: `Developer/r3f_prototype/src/lib/missionCatalog.js`
- Test: `Developer/r3f_prototype/src/lib/missionCatalog.test.js`

**Verification:** 30개 id 중복 없음, sourceNumber 1~30 연속, reward status가 전부 `proposal`.

### Task 2: mission progress 순수 reducer 작성

**Objective:** event를 counter/progress로 줄이는 순수 함수를 만든다.

**Files:**
- Create: `Developer/r3f_prototype/src/lib/missionProgress.js`
- Test: `Developer/r3f_prototype/src/lib/missionProgress.test.js`

**Verification:** run reset, account progress 유지, locked 미션 미완료, claimed 재수령 불가.

### Task 3: Firebase progress schema 확장

**Objective:** `missionProgress`와 `pinnedMissionIds`를 `users/{uid}` progress에만 저장하도록 normalization을 추가한다.

**Files:**
- Modify: `Developer/r3f_prototype/src/lib/firebaseProgress.js`
- Test: existing firebase progress tests + new mission normalization cases

**Verification:** hydrate 전 쓰기 금지, localStorage 문자열 없음, 저장 실패가 game start를 막지 않음.

### Task 4: MVP 이벤트 연결

**Objective:** Stage clear/survival/pickup/level-up/weapon Lv.5 이벤트만 store에 연결한다.

**Files:**
- Modify: `Developer/r3f_prototype/src/store/useGameStore.js`
- Modify: `Developer/r3f_prototype/src/components/XpTextbook.jsx`
- Modify: `Developer/r3f_prototype/src/components/GoldCoin.jsx`

**Verification:** #1/#2/#5/#6/#7/#11/#17/#19/#20/#25만 진행된다. Stage values unchanged.

### Task 5: UI 핀/보상 MVP

**Objective:** 모바일 HUD에 1~3개 미션 진행과 보상 받기를 표시한다.

**Files:**
- Create/Modify: UI components under `Developer/r3f_prototype/src/components/`

**Verification:** 모바일 화면에서 타이틀/Studio/오디오 변경 없이 playing HUD에만 표시된다.

### Task 6: Phase 2+ 이벤트 확장

**Objective:** enemy kill, weapon last-hit, special spawn, boss, interaction, companion heal 이벤트를 단계적으로 추가한다.

**Verification:** 각 phase마다 해당 미션만 unlock/complete되고 성능·중복 이벤트 테스트를 통과한다.

---

## 13. Acceptance criteria

1. 이 계획 문서는 `Planner/mission_system_gameplay_implementation_plan_2026-08-15.md`에만 생성된다.
2. 코드·테스트·Firebase·Studio·타이틀·오디오·Git은 변경하지 않는다.
3. 30개 미션 모두에 대해 scope, 완료 판정, 기존 카운터/이벤트, 최소 신규 이벤트, rollout 단계가 정의되어 있다.
4. 기존 카운터 우선 MVP 10개가 명시되어 있다.
5. Stage 1 240초 = 4분 루프, Stage 1 E04 제외, 보스 처치/clear 분리, `gameKey` reset, Firebase-only durable progress, 로그인/저장 실패 시 gameplay availability를 보존한다.
6. 보상은 제안으로만 표기하고 Balance_QA_Mini 승인 전 확정하지 않는다.
7. 거리/범위가 언급된 경우 units와 블록을 병기한다. 본 문서의 상호작용 예시는 `0.82 units = 0.205 블록`으로 병기했다.
8. 구현 파일 경계와 책임이 정확한 경로로 적혀 있고, 실제 파일은 생성하지 않는다.
9. 검증은 생성된 문서를 다시 읽어 위 항목 포함 여부를 확인하는 것으로 한정한다.

---

## 14. Out of scope

- 코드 구현, 테스트 작성/수정, Firebase schema 실제 변경.
- 보상 골드 확정 및 밸런스 수치 변경.
- Stage duration, boss timing, portal timing, Matilda timing, wave/spawn/HP/weapon damage 변경.
- Stage 1에 E04를 추가하는 모든 설계.
- 타이틀 화면, Graphics Studio, 모델, 오디오/BGM/SFX 변경.
- localStorage 또는 로컬 파일 기반 진행 저장.
- AAB/Google Play/release 작업.
- 기존 `quests.js`를 미션 시스템으로 대체하거나 삭제하는 작업.

---

## 15. Balance_QA_Mini handoff

- MVP 10개는 “관찰형 미션”이라 게임 수치를 바꾸지 않는지 먼저 검수한다.
- rewardProposal은 240초 모바일 Stage 1 루프의 골드 경제를 기준으로 별도 승인해야 한다.
- Phase 2부터는 enemyType/weaponKey 이벤트가 실제 kill 확정 시점에만 1회 기록되는지 확인한다.
- Phase 4 `weapon_hit`는 프레임별 스팸 위험이 있으므로 성능 예산과 중복 방지 테스트가 필요하다.
- Stage 1 E04 제외, Stage 2 B02 v2/no-legacy gate, 보스 처치와 clear 분리 회귀 테스트를 acceptance에 넣는다.
