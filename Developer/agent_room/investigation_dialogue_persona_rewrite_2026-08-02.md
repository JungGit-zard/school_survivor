# Investigation dialogue persona rewrite — 2026-08-02

## Routing

- Board: `escape-zombie-school`
- Trigger: 전 스테이지 모든 소품 조사 독백 대사의 주인공 페르소나 일괄 수정
- Specialists involved: `levelmini` for protagonist persona/content tone, `balanceqa` for regression coverage
- Accepted involvement trail: this artifact under `Developer/agent_room/` records the specialist routing and verification trail.

## Persona contract

- Speaker: 17세 여학생 주인공
- 성격: 순수하고 가녀린 성격
- Tone: 겁이 나도 사물을 함부로 다루지 않고, 조심스럽고 다정하게 바라보는 1인칭 독백
- Avoided: 냉소, 과한 장난, 잔혹 묘사, 거친 말투, 어른스럽거나 무심한 관찰자 톤

## Implementation

- Rewrote every `OBJECT_LINES` entry in `src/lib/investigationDialogue.js`.
- Rewrote all stage-specific `STUDENT_LINES` entries.
- Preserved deterministic line selection by placement ID.
- Preserved subject names and reward subject type mapping.
- Added a regression assertion that every palette type returns a first-person line with soft/frail/careful emotional markers.

## Verification

```text
npm test -- src/lib/investigationDialogue.test.js src/lib/studentProximity.test.js src/components/StudentDialogueTrigger.test.jsx src/components/QuestWorldLayer.test.jsx src/store/useGameStore.studentDialogue.test.js src/lib/studentSearchRewards.test.js
6 files passed, 46 tests passed

npm run build
production build passed; branch guard, canonical title surface/BGM, and legacy B02 gates passed
```
