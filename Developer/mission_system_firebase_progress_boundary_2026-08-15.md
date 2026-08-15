# 미션 시스템 Firebase progress boundary 기록 — 2026-08-15

## 작업 목적

Kanban `t_cd0d03e4` 범위의 Mission Ticket 4/5 백엔드 경계 작업이다. 실제 미션 UI/카탈로그/게임플레이 hook 구현이 아니라, 후속 미션 구현자가 Firebase-only 저장 경계 위에서 작업할 수 있도록 `progress.missions` 런타임 schema, strict Realtime Database rules, claim transaction helper를 최소 단위로 추가했다.

## Precommand / 필수 문서 확인

실행 명령:

```text
powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile backendmini -Domain auto -TaskSummary "mission-firebase-progress-boundary"
```

결과 요약:

- exit code: 0
- resolved_domains: `common`, `backend`, `firebase`
- matched_domains: `backend`, `firebase`
- match_evidence: `backend` keyword `firebase`; `firebase` keyword `firebase`
- combined_receipt_sha256: `c5cef448660ab5b894e02eeaa0f19101643877788b794c2b3a2db185e15e8f8b`

확인한 READ_REQUIRED/read_required 문서:

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
- `SESSION_MEMORY.md` 최신 단일 entry

추가로 현재 우선순위 문서 `CEO/current_product_priorities.md`, 미션 마스터 플랜, Firebase architecture 문서, Balance QA 미션 리뷰 2건을 확인했다.

GSTACK 확인:

```text
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
```

결과:

```text
GSTACK_OK
```

## 변경 파일

- `Developer/r3f_prototype/src/lib/firebaseProgress.js`
- `Developer/r3f_prototype/database.rules.json`
- `Developer/mission_system_firebase_progress_boundary_2026-08-15.md`

## Firebase runtime schema 결정

`progress.missions`는 기존 `progress` 하위에만 추가했다. 새 localStorage/IndexedDB/임시 JSON fallback은 만들지 않았다.

런타임 normalizer/clone/createEmptyProgress가 유지하는 shape:

```text
progress.missions = {
  schemaVersion: 1,
  catalogVersion: 'missions_2026_08_15_v1',
  updatedAt: '',
  counters: {},
  active: {},
  completed: {},
  claimed: {},
  pinnedMissionIds: [],
  claimLedger: {},
}
```

제한 원칙:

- mission id: lowercase/number/underscore, 최대 64자
- catalogVersion: `missions_YYYY_MM_DD_vN` 형식
- counter key: 영문/숫자/underscore/dot/dash, 최대 96자
- counter/target: non-negative 또는 positive integer, 상한 1,000,000
- pinnedMissionIds: 최대 2개 (UI/master contract와 동일하게 2-slot만 저장/규칙 허용)
- reward: `{ type: 'gold', amount }`만 허용, amount 1..1,000,000
- legacy 입력의 `missionCatalogVersion`/`pinnedIds`는 normalize 시 `catalogVersion`/`pinnedMissionIds`로 흡수한다.

## Helper API 결정

`firebaseProgress.js`에 미션 전용 최소 helper를 추가했다.

- `readFirebaseMissionProgress()`
  - hydrated 전이면 throw하지 않고 `{ ok: false, reason: 'progress-not-hydrated', missions: empty }` 반환.
- `updateFirebaseMissionProgress(mutator)`
  - in-memory normalized `progress.missions`만 갱신한다.
  - mutator 오류는 별도 catch하지 않으므로 호출자 코드 버그는 숨기지 않는다.
- `saveFirebaseMissionProgress(user)`
  - 기존 `requestCloudProgressSave()` 래퍼.
  - save 실패/미준비는 throw 대신 `{ ok, saved, reason }` 반환.
- `claimFirebaseMissionReward({ user, missionId, catalogVersion, rewardAllowlist })`
  - Firebase `runTransaction(ref(users/{uid}/progress), ...)` 기반.
  - `goldTotal`과 `missions.claimLedger`/`missions.claimed`/`missions.active[missionId].claimedAt`를 같은 progress transaction 안에서 갱신한다.
  - claim transaction 자체를 기존 `writeQueue`에 넣어 일반 저장과 직렬화한다. 또한 `requestCloudProgressSave()`는 queued callback 안에서 payload를 생성하므로, claim 뒤에 실행되는 일반 저장은 반드시 claim 이후 런타임 스냅샷을 저장한다.
  - 불변식: stale pre-claim normal save가 claim transaction과 동시에 실행되거나 claim 뒤에 실행되어 `goldTotal`/`claimLedger`/`claimedAt`를 지우면 안 된다.
  - 이미 claimed 또는 미완료 상태는 transaction mutator에서 `undefined`를 반환해 no-op write commit을 피하고, 호출자는 throw 없이 `already-claimed`/`not-completed` reason을 받는다.
  - reward amount는 함수 인자로 받은 `rewardAllowlist[missionId]`만 사용한다. 클라이언트에 저장된 progress reward 값은 지급 근거로 쓰지 않는다.
  - unauthenticated/unconfigured/not hydrated/invalid allowlist/transaction unavailable/save failure는 throw하지 않고 `{ ok: false, committed: false, reason }`을 반환한다.

## Rules 결정

`database.rules.json`의 `users/{uid}/progress` 아래에 다음을 추가했다.

- `progress.missions` strict child rules
- mission id/counter key/claim id/catalogVersion 형식 제한
- numeric upper bounds
- reward type/amount allow shape
- `$other: false` 유지

기존 progress payload가 이미 내보내는 `encounteredZombieTypes`도 rules에 명시했다. 기존 default titleSettings의 `language: null` 경로를 막지 않도록 `language` rule은 null 또는 `ko/en/ja`로 허용했다.

## 범위 밖 / 후속 gate

이번 작업은 boundary skeleton이다. 아래는 아직 완료 주장 금지:

- 실제 Mission catalog 파일/30개 미션 활성화
- 미션 UI/미션 센터
- gameplay hook instrumentation
- Stage 2~4 clear mission 활성화
- 실제 gold claim UI enabled 처리
- Firebase rules deploy
- 모바일 실행 검증

후속 구현자는 먼저 Stage 1 중심 first active slice와 pure reducer를 붙인 뒤, claim UI는 Balance QA 승인 전 disabled 상태를 유지해야 한다.

## 검증 기록

사용자 지시상 테스트/빌드/브라우저 실행은 하지 않았다. 검증은 직접 코드 읽기와 diff 확인으로 제한했다.

실행하지 않은 것:

- `npm test` / vitest
- `npm run build`
- browser/mobile run
- Firebase deploy/emulator

패치 도구의 구문/lint 확인은 `firebaseProgress.js`와 `database.rules.json` 모두 `ok`로 보고됐다.
