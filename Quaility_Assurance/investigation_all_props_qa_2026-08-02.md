# 전 스테이지 전체 소품 조사 통합 QA — 2026-08-02

## 검토 범위와 판정

- 검토 대상: 현재 미커밋 상태의 `investigationDialogue.js`, `studentProximity.js/.test.js`, `StudentDialogueTrigger.jsx`, `QuestWorldLayer.jsx`, 퀘스트 정의·배치·보상·대화 상태 연동
- 구현 파일은 수정하지 않았으며 이 QA 기록만 작성했다.
- 최종 재검토 판정: **Pass**
- Critical: 0건
- 미해결 High: 0건
- 해결된 High: 1건
- 비차단 Medium: 1건(대사 톤 자동 회귀 테스트 공백)

## Critical / High

### [해결됨][기존 High] 진행 중 퀘스트 대상 위에서 일반 조사 대화·보상이 퀘스트보다 먼저 실행될 수 있었다

수정 전 근거:

1. `studentProximity.js:28-50`은 이제 모든 런타임 배치를 일반 조사 대상으로 만든다.
2. `findInvestigationTargetInRange()`(`studentProximity.js:54-70`)은 범위 안의 첫 대상 하나를 배치 순서대로 반환하며 퀘스트 대상 우선순위를 모른다.
3. `StudentDialogueTrigger.jsx:52-68`은 선택된 대상이 **퀘스트 제공자(giver)** 인지만 검사한다. 진행 중 퀘스트의 `itemTarget` 또는 설치형 `completion` 대상은 일반 조사에서 제외하지 않는다.
4. `Game.jsx:203-204`에서 `StudentDialogueTrigger`가 `QuestWorldLayer`보다 먼저 마운트된다. 같은 프레임에 두 상호작용이 가능하면 일반 조사 콜백이 먼저 대화를 열어 `phase`를 `paused`로 만들 수 있고, 뒤의 퀘스트 콜백은 `usePlayingFrame` 게이트에서 실행되지 않는다.
5. 기본 Firebase Studio 런타임을 빈 prop override로 hydrate한 뒤 현재 배치/충돌체/퀘스트 헬퍼를 번들한 읽기 전용 런타임 probe 결과:

```text
stageId=stage1
questId=stage1-talk-book
itemSource=stage1-desk-mid-02
genericAtItem=stage1-student-ne-01
worldItemAction=collect
```

즉, 수정 전에는 말빨기술책의 실제 표면 위치에서 일반 조사기가 비퀘스트 학생을 선택하고, 동시에 퀘스트 월드는 `collect`를 반환했다.

해결 확인:

- `StudentDialogueTrigger.jsx:21-35`의 `shouldDeferGenericInvestigation()`이 `QuestWorldLayer`와 동일한 `getQuestWorldInteraction()`으로 현재 collect/complete 가능 여부를 먼저 판정한다.
- `StudentDialogueTrigger.jsx:37-54`의 `nextDeferredInvestigationSuppressionId()`가 해당 위치의 일반 조사 target ID를 저장하고, 퀘스트 action 뒤에도 플레이어가 그 target 접촉 범위를 벗어날 때까지 억제를 유지한다.
- `StudentDialogueTrigger.jsx:95-112`는 퀘스트 상호작용 또는 보류 target이 있으면 일반 대사 선택·보상 추첨 전에 반환한다. 따라서 먼저 마운트된 일반 조사 콜백도 퀘스트 프레임을 소비하지 않는다.
- Stage 1 말빨책 겹침, Stage 2 `-copy-` 반환 giver, collect 다음 프레임 억제, 이탈 후 재접근을 순수 회귀 테스트가 직접 검증한다.

재검토 순수 probe 결과:

```json
{
  "active": true,
  "suppressedAtCollect": "stage1-student-ne-01",
  "afterCollectActive": false,
  "heldAfterCollect": "stage1-student-ne-01",
  "genericRunsNextFrame": false,
  "afterExit": null,
  "onReentry": null,
  "reenteredTarget": "stage1-student-ne-01",
  "genericRunsOnReentry": true
}
```

판정: 퀘스트 collect 프레임과 바로 다음 프레임의 일반 대사/보상 노출은 차단되며, target 접촉 범위에서 이탈하면 억제가 해제되어 재접근 조사는 정상 허용된다. 기존 High는 해결됐다.

## Medium

### [비차단 Medium] 대사 톤 계약은 아직 수동 검토 의존도가 높다

- 기존 퀘스트 우선순위 테스트 공백은 `StudentDialogueTrigger.test.jsx`의 Stage 1 실제 겹침, Stage 2 copy giver, suppress-until-exit/re-entry 테스트로 해결됐다.
- `investigationDialogue.test.js`는 소품 대사에 대해 이름/길이만 검사한다. 학생 대사만 `/나|내/`를 확인하므로, 17세 여학생 1인칭·비잔혹 코미디·좀비 학생/교사 세계관은 향후 문구 변경 시 자동 회귀 보호가 없다.
- 현재 56문장 수동 전수 검토는 통과했으므로 이번 승인을 막지는 않는다.

## 통과 항목

| 항목 | 판정 | 증거 |
|---|---|---|
| Stage 1~4 현재 placement 전부 targetable | 통과 | `studentProximity.test.js`가 각 stage의 target ID 배열과 `getStageObjectPlacements(stageId)` ID 배열의 완전 일치를 검증한다. Firebase override도 팔레트의 유효 타입 전부를 target으로 변환한다. |
| 결정적 대사 선택 | 통과 | `pickDeterministicLine()`은 placement ID 해시만 사용한다. 동일 입력 동등성 테스트 통과. |
| 17세 여학생 POV·선한 유머 | 수동 통과 | 24개 소품 타입 48문장과 stage별 학생 8문장을 전수 읽기 검토했다. 1인칭 관찰/독백이며 잔혹·성적·냉소적 문구는 발견하지 않았다. |
| 좀비 학생/교사 학교 설정 | 수동 통과 | 각 stage 대사군에 좀비 학생/교사, 탈출·생존 상황과 교실/복도/체육관/급식실 생활 소재가 반영돼 있다. |
| 퀘스트 giver/item/completion 우선순위 | 통과 | giver exact/Stage 2 copy ID 처리에 더해 `getQuestWorldInteraction()`과 동일한 collect/complete 판정을 일반 조사보다 먼저 적용한다. 실제 Stage 1 겹침과 Stage 2 copy 반환 테스트 통과. |
| suppress-until-exit 후 재접근 | 통과 | collect 후 quest 상태가 바뀌어도 보류 target ID가 접촉 범위 이탈까지 유지되고, 이탈 후 null로 해제되며 재접근 시 일반 target이 다시 선택됨을 테스트와 probe로 확인했다. |
| 런당 1회 | 통과 | generic target은 대화 호출 전에 `talkedRef`에 추가되고 `gameKey` 변경 때만 Set이 초기화된다. |
| pause/resume 및 보상 1회 지급 | 통과 | `usePlayingFrame`의 playing 게이트, dialogue pauseSource, close 시 단일 gold/upgrade 지급 테스트 통과. |
| 보상 타입·확률 | 통과 | locker 100% upgrade, student 50%, 기타 10%, 성공 시 upgrade/gold 10의 50:50 분기 유지. 기존 `studentSearchRewards.js` 변경 없음. |
| 접촉 footprint | 통과 | 학생 반경 `0.5`, 소품 collider AABB + margin `0.25`, collider 없음 시 scale 기반 fallback 유지. 경계/조사 완료 제외 테스트 통과. |

## 직접 실행한 검증

```text
npx vitest run src/lib/investigationDialogue.test.js src/lib/studentProximity.test.js src/components/StudentDialogueTrigger.test.jsx src/components/QuestWorldLayer.test.jsx src/store/useGameStore.studentDialogue.test.js src/lib/studentSearchRewards.test.js

Test Files  6 passed (6)
Tests       46 passed (46)
Duration    2.31s
```

추가 읽기 전용 런타임 probe:

- Stage 1~4 퀘스트 giver 8개를 실제 배치 중심에서 조사했을 때 모두 해당 giver가 첫 target으로 선택됨을 확인했다.
- Stage 1 말빨책 위치에서 active 퀘스트 상호작용이 일반 target `stage1-student-ne-01`을 억제하는지 확인했다.
- collect 후 `item-acquired` 상태에서는 퀘스트 상호작용이 사라져도 같은 target 억제가 유지되어 다음 프레임 일반 조사 실행이 false임을 확인했다.
- target에서 이탈하면 억제가 null로 해제되고, 같은 위치에 재접근하면 `stage1-student-ne-01`이 다시 조사 가능함을 확인했다.
- probe는 메모리 안에서 번들·실행했으며 소스·Firebase·브라우저 저장소를 변경하지 않았다.

## Blocker

- 없음. 기존 High는 현재 미커밋 `StudentDialogueTrigger` 우선 판정과 suppress-until-exit 회귀 테스트로 해결됐다.

## Subagent mandatory routing

- Board: `escape-zombie-school`
- Trigger: 전 스테이지 조사 시스템 통합 QA 및 회귀 위험 검토
- Specialist involved: `balanceqa`
- Trail: 이 문서와 `Developer/agent_room/investigation_all_props_implementation_2026-08-02.md`
- Remaining blocker: 없음
