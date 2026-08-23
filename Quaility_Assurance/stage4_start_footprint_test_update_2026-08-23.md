# Stage 4 시작점 footprint 테스트 수정 QA

- Kanban: `t_8f3c8058`
- 담당: `balanceqa`
- 날짜: 2026-08-23
- 범위: `Developer/r3f_prototype/src/lib/playerStartPosition.test.js`의 Stage 4 non-overlap assertion을 현재 `getStageObjectFootprint()` 반환 shape인 `{ x, z, halfX, halfZ }` 기준으로 수정한다.
- 제품 코드 변경: 없음. 테스트 코드와 QA 기록만 변경.

## 사전 게이트

```text
powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile balanceqa -Domain auto -TaskSummary "Stage4 start footprint test update"
```

- `matched_domains`: `gameplay`, `qa`
- `match_evidence`: `stage`, `test`
- `combined_receipt_sha256`: `5c45aeccf4f302dd595b852635224d4b381b72c08040d3f9362003bc7fe040a4`
- checker exit: 0
- emitted `read_required` 문서 전체 확인. `SESSION_MEMORY.md`는 규정대로 최신 단일 엔트리만 확인.

## 변경 내용

`playerStartPosition.test.js`의 Stage 4 시작점 non-overlap 테스트에서 이전 `{ minX, maxX, minZ, maxZ }` destructuring 경로를 제거하고, 실제 footprint shape인 `{ x, z, halfX, halfZ }`로 포함 여부를 계산하도록 수정했다.

추가로 중앙 압력 가마솥 placement가 `[0,0,0]`, `scale: 1`인지 확인하고, 실제 footprint가 아래 shape로 계산되는지 고정했다.

```js
{
  x: 0.02200000000000013,
  z: 0.07200000000000006,
  halfX: 1.5779999999999998,
  halfZ: 1.448,
}
```

## 실행 명령 및 결과

### gstack / Git 상태 확인

```text
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING

git status --short --branch
```

결과:

```text
GSTACK_OK
## zombie_only...origin/zombie_only
```

주의: 작업 시작 시점에 다른 Stage 4/가마솥/그래픽/QA 관련 미커밋 변경이 이미 존재했다. 본 작업은 요청 범위 파일만 수정했다.

### focused test 1회

```text
npm test -- --run src/lib/playerStartPosition.test.js
```

결과:

```text
branch guard: ok
Legacy B02 source gate passed.
Dialogue store gate passed (451 Korean IDs).
Studio-game sync source contract passed.
✓ src/lib/playerStartPosition.test.js (3 tests) 43ms
Test Files  1 passed (1)
Tests       3 passed (3)
```

### scoped diff check

```text
git diff --check -- Developer/r3f_prototype/src/lib/playerStartPosition.test.js
```

결과: 통과(exit 0, 출력 없음).

QA 기록 작성 후 최종 scoped diff check도 재실행했다.

```text
git diff --check -- Developer/r3f_prototype/src/lib/playerStartPosition.test.js Quaility_Assurance/stage4_start_footprint_test_update_2026-08-23.md && git status --short --branch
```

결과: 통과(exit 0). `git status`에서 기존 미커밋 변경들과 함께 본 카드 변경 2건(`playerStartPosition.test.js`, 이 QA 기록)이 확인됐다.

### diff 확인

```text
git diff -- Developer/r3f_prototype/src/lib/playerStartPosition.test.js
```

확인 결과: 변경은 `playerStartPosition.test.js`의 Stage 4 non-overlap assertion에 한정됨. 제품 런타임 코드 변경 없음.

## 관찰

- Stage 4 시작점은 `[0, 0, 7]`로 유지된다.
- 중앙 압력 가마솥은 현재 `getStageObjectPlacements('stage4')`에서 `stage4-pressure-cauldron-center`, `position: [0,0,0]`, `scale: 1`, `blocking: true`로 확인된다.
- `getStageObjectFootprint()`의 실제 반환 shape는 `{ x, z, halfX, halfZ }`이며, 테스트가 이 shape를 직접 사용하도록 맞춰졌다.

## 블로커

- 없음.

## 미확인 / 범위 밖

- 브라우저/모바일 실플레이는 수행하지 않았다. 이번 카드는 테스트 assertion 수정과 focused test 1회가 수용조건이다.
- 기존 작업트리의 다수 미커밋 변경은 본 카드 범위 밖이며 수정하지 않았다.
