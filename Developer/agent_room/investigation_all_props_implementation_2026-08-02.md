# 퀘스트 아이템 배치 및 전 스테이지 소품 조사 구현 기록 — 2026-08-02

## 라우팅

- Board: `escape-zombie-school`
- Trigger: Stage 1 말빨기술책 위치/시각 개선, 전 스테이지 배치 소품 조사, 스테이지 콘셉트에 맞는 주인공 독백 추가
- Specialist relevance: `threemini`(R3F 퀘스트 아이템 표면 배치/시각), `levelmini`(스테이지별 게임플레이 흐름·퀘스트 우선순위), `uimini`(조사 대화 흐름), `balanceqa`(보상 확률·런당 1회 조사·접촉 판정 회귀 확인)
- Accepted involvement trail: this artifact under `Developer/agent_room/` is written for the relevant specialists and records the routing/verification trail.

## 구현

- Stage 1 `stage1-talk-book`의 아이템을 `red-book` 시각 타입으로 바꾸고, `stage1-desk-mid-02` 책상 표면 local 좌표에 배치했다.
- `QuestWorldLayer`는 `surface.localPosition`이 있는 퀘스트 타깃을 배치 yaw/scale을 반영해 월드 좌표로 변환한다.
- 표면 배치 아이템은 책상 위에 고정하고, ring/diamond marker만 부드럽게 움직이도록 분리했다.
- `getInvestigationTargets(stageId)`는 이제 런타임에서 보이는 해당 스테이지의 모든 배치를 조사 대상으로 반환한다.
- 소품은 기존 콜라이더 footprint와 접촉 margin 판정을 계속 사용하고, 학생은 기존 발밑 반경 판정을 유지한다.
- `investigationDialogue.js`가 팔레트의 모든 소품 타입과 스테이지별 좀비 학생 독백을 소유한다. 배치 ID로 문장을 결정적으로 선택하므로 같은 런에서 재현 가능하다.
- 교실·복도·체육관·급식실에 맞춘 부드럽고 우스운 17세 여학생 주인공의 1인칭 관찰문을 제공한다. 학생과 선생님이 좀비가 된 상황은 가볍고 비잔혹적으로만 다룬다.
- 퀘스트 지급 학생은 `StudentDialogueTrigger`의 기존 우선 처리로 먼저 퀘스트 대사를 출력한다. 일반 조사 보상 타입·확률, 일시정지, 런당 1회 처리는 변경하지 않았다.
- 모든 생성 target이 `line`을 보장하므로 레거시 speaking-student 무작위 fallback은 제거했다.
- 활성 퀘스트 아이템 또는 아이템 획득 뒤 반납·설치 지점에 플레이어가 닿으면, 동일 프레임의 일반 조사를 먼저 양보한다. `QuestWorldLayer`의 위치·상호작용 해석을 그대로 재사용하므로 아이템 수집·반납이 대사/보상/런당 조사 소비에 가로막히지 않는다.
- 양보로 겹친 일반 조사 대상은 플레이어가 접촉 범위를 벗어날 때까지만 임시 억제한다. 퀘스트 처리 다음 프레임의 중복 보상은 막고, 재접근하면 해당 소품·학생을 정상 조사할 수 있다.

## 변경 파일

- `Developer/r3f_prototype/src/components/QuestWorldLayer.jsx`
- `Developer/r3f_prototype/src/components/QuestWorldLayer.test.jsx`
- `Developer/r3f_prototype/src/components/StudentDialogueTrigger.jsx`
- `Developer/r3f_prototype/src/lib/quests.js`
- `Developer/r3f_prototype/src/lib/quests.test.js`
- `Developer/r3f_prototype/src/lib/investigationDialogue.js`
- `Developer/r3f_prototype/src/lib/investigationDialogue.test.js`
- `Developer/r3f_prototype/src/lib/studentProximity.js`
- `Developer/r3f_prototype/src/lib/studentProximity.test.js`
- `Planner/game_contents/investigation_system_plan_2026-07-24.md`

## 검증

```text
npm test -- src/lib/investigationDialogue.test.js src/lib/studentProximity.test.js src/lib/quests.test.js src/components/QuestWorldLayer.test.jsx src/store/useGameStore.quests.test.js
5 files, 39 tests passed

npm run build
production build passed; branch guard, canonical title surface/BGM, and legacy B02 artifact gates passed

git -c core.whitespace=cr-at-eol diff --check
passed; only expected Windows LF-to-CRLF working-copy warnings were printed

npx vitest run src/lib/studentProximity.test.js src/lib/investigationDialogue.test.js src/components/StudentDialogueTrigger.test.jsx src/components/QuestWorldLayer.test.jsx src/store/useGameStore.quests.test.js src/store/useGameStore.studentDialogue.test.js src/lib/studentSearchRewards.test.js
7 files, 52 tests passed
```

## Blockers

- 브라우저 시각 클릭 검증은 생략했다. 테스트와 빌드 기반으로 완료 처리한다.
