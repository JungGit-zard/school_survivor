# 미션 시스템 내부 자동 테스트 3회 결과 분류 — 2026-08-16

- 담당: balanceqa
- 대상 커밋: `b7518b1 Add Firebase mission system` 요청 범위
- 범위: `Developer/r3f_prototype` 내부 자동 테스트 3회 결과의 pass/fail 요약 및 실패 분류
- 제한: 브라우저/E2E/5173/Firebase 실제 데이터 쓰기 금지, 코드 수정/커밋/푸시 금지
- 이번 재시도에서 추가 테스트 실행 없음. 이전 시도에서 수집된 로그를 읽어 분류만 수행했다.

## 1. 사전 게이트

명령:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile balanceqa -Domain auto -TaskSummary 'mission system QA classify prior test results'
```

결과:

- exit code: 0
- `matched_domains`: `qa`
- `match_evidence`: `[{"domain":"qa","keyword":"qa"}]`
- `resolved_domains`: `common`, `qa`
- `combined_receipt_sha256`: `e8b0e3666c31a4c4072afc9b56b8ecd0a5c69536d41ac3f11dacc9dbcbe509a0`
- READ_REQUIRED 전부 확인했고 `SESSION_MEMORY.md`는 최신 1개 엔트리만 확인했다.
- gstack 게이트: `GSTACK_OK`

## 2. 원본 로그 위치

이전 시도에서 생성된 원본 로그:

- `Developer/r3f_prototype/Quaility_Assurance/mission_system_internal_test_logs_2026-08-16/npm_test_run1.log`
- `Developer/r3f_prototype/Quaility_Assurance/mission_system_internal_test_logs_2026-08-16/npm_test_run1_quiet.log`
- `Developer/r3f_prototype/Quaility_Assurance/mission_system_internal_test_logs_2026-08-16/npm_test_run2.log`
- `Developer/r3f_prototype/Quaility_Assurance/mission_system_internal_test_logs_2026-08-16/npm_test_run2_quiet.log`
- `Developer/r3f_prototype/Quaility_Assurance/mission_system_internal_test_logs_2026-08-16/npm_test_run3.log`
- `Developer/r3f_prototype/Quaility_Assurance/mission_system_internal_test_logs_2026-08-16/npm_test_run3_quiet.log`

주의: 위 로그 폴더는 이전 시도 산출물이며, 이번 재시도에서는 advisor 지시대로 새 QA 기록만 프로젝트 루트 `Quaility_Assurance/` 아래에 작성했다. 기존 dirty 파일과 기존 로그는 이동/수정하지 않았다.

## 3. 3회 실행 요약

동일 조건의 내부 자동 테스트 전체 실행 결과는 3회 모두 FAIL이다.

| 회차 | 결과 | Test Files | Tests | Duration | 원본 로그 |
|---:|---|---:|---:|---:|---|
| 1 | FAIL | 31 failed / 189 passed / 220 total | 71 failed / 1891 passed / 20 skipped / 1982 total | 691.47s | `npm_test_run1.log` |
| 2 | FAIL | 34 failed / 186 passed / 220 total | 72 failed / 1890 passed / 20 skipped / 1982 total | 577.69s | `npm_test_run2.log` |
| 3 | FAIL | 32 failed / 187 passed / 219 total | 69 failed / 1893 passed / 20 skipped / 1982 total | 532.07s | `npm_test_run3.log` |

공통 선행 게이트 출력:

- `Legacy B02 source gate passed.`
- `Dialogue store gate passed (451 Korean IDs).`
- `Studio-game sync source contract passed.`
- quiet 로그에는 공통으로 `Error: lazy route failed` 4회가 기록됐다.

## 4. 미션 직접 관련 실패 / 검증 차단

### 4-1. `firebaseProgress` 직렬 저장 회귀 — 실제 코드 결함 가능성 높음

실패:

- `src/lib/firebaseProgress.test.js > firebase-only player progress runtime > serializes debounced writes and uses the latest runtime values without lost updates`

관찰:

```text
AssertionError: expected [ 99, 99 ] to deeply equal [ 42, 99 ]
```

분류:

- 미션 직접 관련: 높음
- 실제 코드 결함 가능성: 높음
- 이유: 미션 저장/보상 claim은 `users/{uid}/progress/missions`와 Firebase progress runtime에 연결되어 있다. 기존 진행도 직렬 저장 테스트가 `[42, 99]` 순차 저장을 기대하지만 실제 저장 배열이 `[99, 99]`로 나와 첫 번째 쓰기가 최신값으로 덮이는 lost-update 계열 위험을 보여준다.
- 영향: 미션 이벤트 누적, 런 종료 배치 저장, 보상 transaction 이후 진행도 반영의 순서 보존을 별도 수정 전까지 검증 완료로 볼 수 없다.

### 4-2. `useGameStore.cloudProgress.test.js` 7건 mock export 누락 — 테스트 하네스 파손 + 저장 경계 검증 차단

실패 7건:

- `requests a cloud save after total gold changes`
- `requests a cloud save after milestone gold changes`
- `requests a cloud save after spending gold`
- `requests a cloud save after buying a passive upgrade`
- `requests a cloud save after resetting passive upgrades`
- `requests a cloud save after a run result is written to Firebase runtime records`
- `records and saves a minimal activity record when a stage starts`

공통 오류:

```text
No "isFirebaseProgressHydrated" export is defined on the "../lib/firebaseProgress.js" mock.
```

분류:

- 미션 직접 관련: 중간~높음
- 실제 런타임 결함으로 단정: 불가
- 테스트 결함/하네스 파손: 확정
- 이유: 미션 구현 과정에서 `useGameStore.js`가 `isFirebaseProgressHydrated()`를 호출하도록 바뀐 상태인데, 기존 `vi.mock('../lib/firebaseProgress.js')`가 해당 export를 제공하지 않아 테스트가 실행 전 예외로 중단된다.
- 영향: 골드/패시브/런 결과/스테이지 시작 저장 경계가 자동 테스트로 검증되지 않는다. 미션 보상은 골드 지급과 progress 저장을 함께 건드리므로 이 계열 테스트가 red인 동안 보상 저장 안정성을 검증 완료로 표시하면 안 된다.

### 4-3. 명시적 `Mission*.test` 실패는 없음

관찰:

- 3회 로그의 `FAIL` 라인 중 `Mission`/`mission`을 포함한 테스트명은 0건이었다.
- 즉 `MissionCenter.jsx`, `MissionTracker.jsx`, `missionCatalog.js`, `missionProgress.js` 이름의 직접 실패는 이번 전체 로그에는 나타나지 않았다.

분류:

- “미션 UI/카탈로그가 통과했다”는 뜻은 아니다. 별도 직접 테스트가 없거나 실패명이 다른 경로로 나타났을 수 있다.
- 검증된 사실은 “3회 로그 기준, 실패 테스트명에 Mission/misson 명시 실패가 없다”까지만이다.

## 5. 미션 간접 관련 또는 실제 코드 결함 후보

반복적으로 실패한 항목 중 실제 코드/계약 불일치 가능성이 보이는 항목:

- `src/store/useGameStore.quests.test.js > collects and returns an active quest item once, awarding exactly two gold`
  - `completeQuest(...)`가 기대 `true` 대신 `false`를 반환.
  - 퀘스트 골드 지급과 미션 이벤트 집계가 같은 진행도/보상 축에 얽힐 수 있어 간접 관련.
- `src/lib/projectAdminRules.test.js > keeps root denied and grants owner-or-verified-Google-master access only to user and Studio paths`
  - Firebase 보안 규칙 계약 실패. 미션 progress/claim 경로가 rules에 새로 추가되었는지 별도 확인 필요.
- `src/lib/enemySimulation.parity.test.js` hp/scale parity 2건
  - 런타임 전투 이벤트 집계의 기반 수치와 시뮬레이션 테이블 불일치. 미션 kill/event 집계 자체 결함으로 단정은 불가하나 전투 이벤트 기반 미션 신뢰도에 간접 리스크.
- `src/components/Enemies.test.jsx` 중 `queues regular wave entries...`, `keeps Matilda out...`, stage2 window failure
  - 이벤트 발생/스폰/타이밍 관련 결함 후보. 미션 이벤트가 스폰·kill 이벤트를 소비하므로 간접 리스크.

## 6. 기존/무관 실패로 분류한 묶음

아래는 이번 “Firebase 미션 30개/이벤트 집계/HUD·미션센터/보상 transaction” 구현과 직접 실패명 기준으로는 무관하거나 기존 red 가능성이 큰 묶음이다. 단, 별도 담당 카드에서는 각각 실제 결함일 수 있다.

- 보스/웨이브/마틸다/스테이지 타이밍:
  - `src/lib/burstEvents.test.js` 12건
  - `src/lib/waveTimelines.test.js` 2건
  - `src/lib/stageConfig.test.js` 3건
  - `src/components/Enemies.test.jsx`의 보스·escort·Matilda·stage2 부하 관련 실패
- Graphics Studio / Firebase-only fail-closed / Studio preview:
  - `src/lib/firebaseStudio.test.js` 2건
  - `src/lib/graphicsStudioConfig.test.js` 2건
  - `src/components/StudioTunedGroup.test.jsx` 1건
  - `src/components/GraphicsStudio.test.jsx` 1건
  - `src/components/GraphicsStudioPreview.test.js` 1건
  - `src/lib/stagePropPlacements.test.js` 1건
- Stage object / 배치 / 학생 조사:
  - `src/components/StageObjects/stageObjectAssets.test.jsx` 1건
  - `src/components/StageObjects/stageObjectPlacements.test.js` 6건
  - `src/components/StagePropPlacementEditor.questGivers.test.jsx` 1건
  - `src/lib/studentProximity.test.js` 2건
  - `src/components/StudentDialogueTrigger.test.jsx` 2건
- UI/로비/기타 기능:
  - `src/components/Lobby.test.jsx` 2~3건
  - `src/components/LobbySettingsModal.test.jsx` 1건
  - `src/components/resultCoinShopFlow.test.jsx` 1건
  - `src/components/AdminPage.test.jsx` 2건
- 오디오/무기/동료/피격 연출:
  - `src/components/HUD.dialogueVoice.test.js` 1건
  - `src/components/Weapons/AoeWeaponSfx.test.jsx` 1건
  - `src/components/Weapons/Hanako.test.jsx` 1건
  - `src/components/CriticalScreenShakeWiring.test.js` 1건
  - `src/components/EnemyChefBossSightExemption.test.js` 1건
- run2/run3에서만 보인 추가/변동 실패:
  - `src/components/GraphicsStudio.undo.test.jsx` 2건(run2)
  - `src/store/useGameStore.passives.test.js` 1건(run2/run3)
  - `src/lib/matildaSpec.test.js` 1건(run2)

## 7. 최종 판정

- 전체 내부 자동 테스트 3회 모두 FAIL.
- 미션 시스템을 “검증 완료”로 표시할 수 없다.
- 가장 직접적인 미션 리스크는 Firebase progress 직렬 저장 회귀(`[42, 99]` 기대 대비 `[99, 99]`)와 `isFirebaseProgressHydrated` mock 누락으로 인한 cloud progress 저장 테스트 7건 검증 차단이다.
- MissionCenter/MissionTracker/missionCatalog/missionProgress 이름의 직접 실패는 3회 로그에서 확인되지 않았지만, 이는 직접 통과 증명이 아니다.
- 브라우저/E2E/5173/Firebase 실제 쓰기는 수행하지 않았다.
- 코드 수정/커밋/푸시 없음.

## 8. 재현/확인 명령

이번 재시도에서 실제 실행한 확인 명령:

```bash
# 사전 게이트
powershell -NoProfile -ExecutionPolicy Bypass -File 'D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1' -Profile balanceqa -Domain auto -TaskSummary 'mission system QA classify prior test results'

# gstack/워크스페이스 확인
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
printf 'TASK=%s\nWORKSPACE=%s\n' "$HERMES_KANBAN_TASK" "$HERMES_KANBAN_WORKSPACE"
cd "$HERMES_KANBAN_WORKSPACE" && pwd

# 저장소 상태 및 로그 존재 확인
cd 'D:/JungSil/2.Minigame_project/school_survivor-integration' && git status --short --branch
find Developer/r3f_prototype -maxdepth 3 -type f \( -iname '*test-results*' -o -iname '*vitest*' -o -iname '*mission*qa*' -o -iname '*.log' \) | head -200

# 로그 요약/실패명 추출
python - <<'PY'
from pathlib import Path
import re
base=Path('Developer/r3f_prototype/Quaility_Assurance/mission_system_internal_test_logs_2026-08-16')
for p in sorted(base.glob('npm_test_run[123].log')):
    txt=p.read_text(encoding='utf-8', errors='replace')
    print(p.name)
    for pat in [r'Test Files\s+.*', r'Tests\s+.*', r'Duration\s+.*']:
        m=list(re.finditer(pat, txt))
        print(m[-1].group(0) if m else 'NO '+pat)
PY
```
