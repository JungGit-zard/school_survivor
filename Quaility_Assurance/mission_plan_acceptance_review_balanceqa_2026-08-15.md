# Balance QA 미션 플랜 수용성 리뷰 — 2026-08-15

## 결론

판정: 조건부 승인(architecture skeleton은 진행 가능) / 30개 미션 전체 MVP 일괄 투입은 보류.

`Planner/mission_system_implementation_and_layout_master_2026-08-15.md`와 `Planner/new_content_missions_30_2026-08-15.md`는 큰 방향에서는 현재 프로젝트 정책과 맞는다. 특히 Firebase-only 저장, localStorage/IndexedDB/임시 JSON 금지, 타이틀 화면 비변경, 로그인/저장 실패로 게임 진입 차단 금지, 보상 수치 미확정 원칙을 명시한 점은 수용 가능하다.

다만 현재 코드 기준으로는 `progress.missions`/`claimLedger`가 Firebase 저장·정규화·보안 규칙 경로에 아직 존재하지 않고, claim transaction API도 없다. 따라서 UI/카탈로그/집계 skeleton과 읽기 전용 진행도 표시까지는 승인 가능하지만, 보상 수령/골드 지급/원격 영구 저장을 포함한 실장 완료 판정은 아래 Blocker 해결 전까지 불가하다.

## 검토 범위

- `Planner/mission_system_implementation_and_layout_master_2026-08-15.md`
- `Planner/new_content_missions_30_2026-08-15.md`
- `Developer/r3f_prototype/src/lib/firebaseProgress.js`
- `Developer/r3f_prototype/src/lib/playerRecords.js`
- `Developer/r3f_prototype/src/store/useGameStore.js`
- `Developer/r3f_prototype/database.rules.json`
- `Developer/r3f_prototype/src/lib/stageConfig.js`
- `Developer/r3f_prototype/src/components/Enemy.jsx`
- `Developer/r3f_prototype/src/components/Enemies.jsx`
- `Developer/r3f_prototype/src/lib/burstEvents.js`
- 기존 컨텍스트: `AGENTS.md`, `Bang_Rules.md`, `project_develop_policy.md`, mandatory precommand 문서, `Quaility_Assurance/google_play_version_ledger.md`, Stage 2 pencil anomaly 기록

## 실행/검증 기록

시각: 2026-08-15 12:42:56

실행한 확인:

1. mandatory precommand
   - `powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile balanceqa -Domain auto -TaskSummary "mission plan acceptance review"`
   - 결과: exit code 0로 보고됨(이전 컨텍스트에서 확인). 필수 문서들을 읽은 뒤 리뷰 진행.
2. 문서/소스 정적 검토
   - `search_files`/`read_file`로 미션 플랜, Firebase progress, playerRecords, store, rules, stage config, enemy/boss/quest 관련 경로 확인.
3. 테스트/빌드/브라우저
   - 미실행. 본 작업 지시는 document only / no test run / no build / no browser run이었으므로 정적 리뷰만 수행.
4. 스크린샷
   - 없음. 브라우저/모바일 실행을 하지 않았다.

## Blockers

### B1. `progress.missions`가 현재 Firebase runtime schema에서 저장되지 않음

현재 `firebaseProgress.js`의 `createEmptyProgress()`와 `normalizeProgress()`/`cloneProgress()`는 `goldTotal`, `records`, `weaponUnlocks`, `weaponPermanentUpgrades`, `passiveUpgrades`, `encounteredZombieTypes`, `titleSettings`만 유지한다. 플랜이 요구하는 `progress.missions.active`, `progress.missions.claimLedger`, `progress.missions.aggregates`류 필드는 현재 정규화 과정에서 유실될 수 있다.

근거:
- `Developer/r3f_prototype/src/lib/firebaseProgress.js` line 398~407: empty progress에 missions 없음.
- `Developer/r3f_prototype/src/lib/firebaseProgress.js` line 410~419: normalizeProgress에 missions 없음.
- `Developer/r3f_prototype/src/lib/firebaseProgress.js` line 524~533: cloneProgress에 missions 없음.

영향:
- 미션 진행/claimLedger를 붙여도 save payload로 안정적으로 유지된다고 판정할 수 없다.
- “Firebase-only 저장” 원칙은 맞지만, 실제 저장 경로가 아직 열려 있지 않다.

필수 수정 조건:
- missions 필드를 schema에 추가하고 normalize/clone/createEmptyProgress/test seed 전체에 반영.
- mission aggregate와 active/claimLedger의 허용 key/value shape를 명확히 제한.

### B2. Realtime Database security rules가 `progress.missions`를 거부함

현재 `database.rules.json`의 `progress` 아래 `$other`는 false다. `missions` child가 없으므로 원격 저장 시 validation 실패 가능성이 높다.

근거:
- `Developer/r3f_prototype/database.rules.json` line 19~45: progress 허용 child는 기존 필드 중심이며 `$other: false`.

필수 수정 조건:
- `progress.missions` 하위에 `active`, `claimLedger`, `aggregates` 등 실제 채택 shape를 규칙으로 추가.
- 숫자 상한, id length, boolean/string length, claimedAt 형태 제한 필요.
- 서버 규칙으로 reward amount를 신뢰하지 못하게 하거나, 최소한 클라이언트 기록값이 중복 지급 근거가 되지 않도록 설계 필요.

### B3. claim transaction API가 현재 progress client에 없음

플랜은 `claimLedger`와 `goldTotal`을 Firebase transaction으로 함께 갱신한다고 되어 있다. 하지만 현재 `createFirebaseProgressClient()`는 `update`, `remove`, `get`만 제공하고 transaction wrapper는 없다.

근거:
- `Developer/r3f_prototype/src/lib/firebaseProgress.js` line 341~349: client API는 save/remove/load뿐.
- `requestCloudProgressSave()` line 254~267: writeQueue 직렬화 + update(save) 방식이며 서버 transaction이 아니다.

영향:
- 같은 계정 멀티 탭/재시도/네트워크 지연에서 중복 수령 방지를 “검증됨”으로 볼 수 없다.
- `claimLedger` 설계 자체는 맞지만, 구현 acceptance gate는 transaction 구현과 테스트 후 통과 가능.

필수 수정 조건:
- `runTransaction(ref(users/{uid}/progress), ...)` 또는 claim 전용 노드 transaction 경로 추가.
- transaction 실패/충돌/이미 claimed/reward catalog mismatch/offline/unconfigured 케이스 단위 테스트 필요.

### B4. MVP 범위에 Stage 2~4 clear 미션이 들어가면 Stage 1 모바일 playable loop 우선순위와 충돌 가능

마스터 플랜의 MVP 표에는 Stage 2/3/4 clear 미션이 포함되어 있다. Stage 1 안정화가 현재 우선순위인 상태에서 30개 콘텐츠와 후반 스테이지 clear 조건을 첫 배치에 넣으면 QA 표면적이 커진다.

근거:
- `mission_system_implementation_and_layout_master_2026-08-15.md` line 256, 258, 259: Stage 2/3/4 clear 미션이 MVP 표에 포함.
- 현재 우선순위: Stage 1 mobile playable loop stability.

필수 수정 조건:
- 1차 배포 MVP는 Stage 1 기반/이미 누적 record 기반 미션으로 축소 권장.
- Stage 2~4 clear 미션은 카탈로그에 숨김/locked/future bucket으로 두고 활성화는 별도 QA 후 승인.

## Major observations

### M1. 모든 30개 미션은 “개념상” 구현 경로가 있으나 구현 난이도 차이를 분리해야 함

30개 미션은 current code에 이미 있는 record 기반, 기존 quest/levelup 기반, 신규 event hook 기반으로 나뉜다. 전부 구현 불가능한 항목은 발견하지 못했지만, 현재 존재하는 누적 record만으로 바로 정확히 판정 가능한 것은 일부다.

구분:

- 즉시/저위험 record 기반
  - 생존 시간, Stage clear, totalRuns, totalKills, totalGold, totalLevelUps, bossKills 일부.
  - 근거: `playerRecords.js` line 7~25에 관련 record key 존재. `_onRunEnd()` line 351~413에서 run end 누적 처리.
- 기존 기능 hook 필요
  - quest start/item/complete, student dialogue/interaction, pickup, weapon level/upgrade, boss spawn/kill type, E04 kill, special zombie kill.
  - 근거: `useGameStore.js` line 549~607 quest flow, line 632~675 student dialogue reward, `Enemy.jsx` line 726~730 kill/boss kill, `Enemies.jsx` line 1248~1249 pooled kill, `burstEvents.js` boss type helper.
- 신규 aggregate 설계 필요
  - weapon-specific kill, enemy type-specific kill, run-scoped “within one run”, newly achieved `N` counters, claim ledger.

### M2. Boss kill mission은 boss type 누락에 주의 필요

현재 `recordBossKill()`은 bossKills 누적만 증가한다. 플랜의 “B01~B04 처치”가 any boss면 기존 `bossKills`로 가능하지만, 특정 boss별 미션/telemetry 확장을 고려하면 `recordBossKill(type)` 또는 mission event payload가 필요하다.

근거:
- `useGameStore.js` line 343~346: `recordBossKill()` type 인자 없음.
- `Enemy.jsx` line 729~730: boss kill 시 type을 넘기지 않음.
- `burstEvents.js` line 12: B01~B04 boss type 판별 가능.

권고:
- MVP에서 “아무 보스 1회 처치”로 명시하면 수용 가능.
- Boss별 미션이면 `boss.{type}.killCount` aggregate를 추가해야 함.

### M3. Enemy type/weapon-specific kill은 pooled enemy와 component enemy 두 경로 모두 계측해야 함

현재 kill 처리 경로가 `Enemy.jsx`와 `Enemies.jsx` pooled hit 경로로 나뉘어 있다. E04/RZT/RZG 등 type-specific mission은 두 경로 중 하나만 instrument하면 누락될 수 있다.

근거:
- `Enemy.jsx` line 726: normal component enemy kill.
- `Enemies.jsx` line 1248~1249: pooled enemy kill.

권고:
- 단일 `recordMissionEvent('enemyKilled', { type, weaponId, stageId, runId })` 진입점을 만들고 양쪽에서 호출.
- 중복 count 방지를 위해 enemy id/generation/runId dedupe 포함.

### M4. 보상 수치 “제안” 상태를 데이터 모델에도 표현해야 함

문서에는 보상 수치 확정 금지가 있다. 그러나 예시 JSON에 `reward.amount`가 들어가면 구현자가 이를 확정값으로 오해할 수 있다.

권고:
- 카탈로그 필드는 `rewardProposal` 또는 `rewardDraft`로 명명.
- claimable 배포 전에는 UI에서 “보상 준비 중/테스트 보상” 상태와 실제 지급 disable을 분리.
- 실제 지급 활성화는 밸런스 승인 후 별도 flag로 열기.

### M5. 로그인/저장 실패 시 게임 진입 차단 금지 원칙은 플랜과 맞지만, 미션 UI copy가 중요함

현재 코드도 progress 미hydrated 상태에서는 많은 저장 기능이 false/skip 형태다. 미션 탭은 progress unavailable을 “게임 불가”가 아니라 “온라인 저장 연결 시 이용 가능” 정도로 표현해야 한다.

근거:
- `useGameStore.js` line 456, 467, 500: progress unavailable 시 false 반환 경로.
- `firebaseProgress.js` line 254~267: save 실패는 false로 흡수.

권고:
- 미션 센터는 진입 가능하되 claim button disabled + 안내 문구.
- 게임 시작 버튼/타이틀 동선은 변경하지 않음.

## 30개 미션 구현 경로 판정 요약

정확한 id/title은 source 문서 기준으로 유지하되, QA acceptance 관점의 hook 상태만 정리한다.

| 번호 범위 | 판정 | 구현 경로 |
|---|---|---|
| 생존/클리어 계열 | 조건부 수용 | `records.bestSurvivalSeconds`, `stageNClears`, `stageNBestSurvivalSec` 기반 가능. 단 Stage 2~4는 첫 MVP 활성화 보류 권장. |
| 플레이 횟수/누적 처치/누적 골드/레벨업 | 수용 | `totalRuns`, `totalKills`, `totalGold`, `totalLevelUps` 기반. Firebase mission schema 추가 후 가능. |
| 특정 적 처치/E04/RZT/RZG/Boss | 조건부 수용 | `enemyKilled` event payload 필요. boss any는 `bossKills` 가능하나 type별이면 추가 필요. |
| 무기/업그레이드/weapon-specific kill | 조건부 수용 | current weapon state는 있으나 mission aggregate hook 필요. weapon-specific kill은 hit source 전파 필요. |
| quest/interaction/dialogue | 조건부 수용 | `startQuest`, `collectQuestItem`, `completeQuest`, `open/closeStudentDialogue` 경로에 event hook 필요. |
| claim/reward | 보류 | Firebase transaction + rules + normalizer + tests 전까지 승인 불가. |

## Acceptance gate 제안

1. Schema gate
   - `firebaseProgress.js` create/normalize/clone에 `missions` 추가.
   - 기존 remote snapshot에 missions가 없어도 정상 hydrate.
   - 알 수 없는 mission id/type은 drop 또는 safe ignore.
2. Rules gate
   - `database.rules.json`에 `progress.missions` 허용 shape 추가.
   - `$other: false` 유지.
3. Transaction gate
   - claim이 `goldTotal`과 `claimLedger`를 원자적으로 갱신.
   - 이미 claimed면 gold 불변.
   - catalog reward mismatch/비활성 mission/offline/unconfigured 모두 안전 실패.
4. Gameplay non-blocking gate
   - Firebase hydrate 실패/저장 실패/claim 실패가 게임 시작, Stage 1 플레이, 결과창을 막지 않음.
5. Mobile loop gate
   - Stage 1 4분 플레이 중 mission event hook이 FPS/입력/충돌/드랍 체감에 영향을 주지 않음.
   - event write는 run 중 원격 write 남발 금지. run end aggregate save 또는 debounce.
6. Content gate
   - 1차 활성 mission은 Stage 1 + existing record 중심으로 축소.
   - Stage 2~4/특정 적/무기별/quest hook 미션은 hidden/future bucket으로 분리.

## 승인 가능한 1차 작업 범위

진행 승인:
- Mission catalog 타입/상수 파일 추가.
- Mission center UI shell 추가(타이틀 화면 변경 없이 기존 게임 내 HUD/메뉴 경로에만 추가).
- Read-only progress 계산기 추가.
- Stage 1/record 기반 일부 미션의 완료 상태 표시.
- No reward claim 또는 disabled claim UI.
- Unit tests/QA docs 추가.

아직 승인 불가:
- 실제 gold 지급 claim.
- `progress.missions` 원격 저장을 “완료”로 주장.
- 30개 전부 활성화.
- Stage 2~4 clear 미션을 MVP 완료 조건으로 묶기.
- localStorage/IndexedDB/임시 JSON fallback.

## 최종 권고

미션 플랜은 방향성은 좋고, 정책 위반 의도는 보이지 않는다. 그러나 현재 코드의 Firebase progress schema/rules/transaction 부재 때문에 “보상 수령 가능한 30개 미션 시스템”으로는 아직 수용 불가다. 구현자는 먼저 Firebase mission schema + rules + transaction + non-blocking failure tests를 열고, 그 다음 Stage 1 record 기반 소수 미션만 mobile playable loop에서 검증해야 한다.

QA 판정 문구:
- Architecture/design: 조건부 승인.
- Content 30 mission catalog: hidden/future 포함 조건부 승인.
- Full playable rewarded mission system: Blocked until B1~B3 fixed and tested.
