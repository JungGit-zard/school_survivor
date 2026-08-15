# 미션 시스템 게임플레이 코어 구현 기록 — 2026-08-15

범위: 카탈로그·순수 진행 reducer·store/Firebase 저장 경계만 구현했다. 컴포넌트 이벤트 훅, UI, 타이틀, Studio, 오디오, 스테이지·적 수치와 스폰은 변경하지 않았다.

변경 파일:

- `Developer/r3f_prototype/src/lib/missionCatalog.js`
  - 안정적인 소문자/underscore id 30개, 한국어 제목·설명·목표와 기획 문서의 골드 제안을 정의한다.
  - `rollout`, `future`, `hidden` 메타를 두지 않아 30개 미션 모두를 카탈로그에서 노출 가능한 상태로 둔다. 자연스러운 스테이지 완료 조건만 각 미션의 목표로 유지한다.
  - `MISSION_REWARD_APPROVED = false`가 유일한 명시 보상 승인 seam이다. proposal 금액은 이 상태에서 실제 claim allowlist로 변환되지 않는다.
- `Developer/r3f_prototype/src/lib/missionProgress.js`
  - `reduceMissionEvent`, `reconcileMissionProgress`, `getMissionStatus` 순수 API로 이벤트를 메모리 counter/완료 상태로만 집계한다.
- `Developer/r3f_prototype/src/store/useGameStore.js`

## 런타임 비전투 이벤트 연결 (2026-08-15)

변경 파일:

- `Developer/r3f_prototype/src/components/XpTextbook.jsx`
- `Developer/r3f_prototype/src/components/GoldCoin.jsx`
- `Developer/r3f_prototype/src/components/LunchItems.jsx`
- `Developer/r3f_prototype/src/components/StudentDialogueTrigger.jsx`
- `Developer/r3f_prototype/src/components/QuestWorldLayer.jsx`
- `Developer/r3f_prototype/src/components/Weapons/Hanako.jsx`
- `Developer/r3f_prototype/src/components/Enemies.jsx`

모든 아래 이벤트는 `recordMissionEvent`로 런타임 메모리에만 집계한다. 픽업·프레임·상호작용 경로에서 Firebase 저장을 호출하지 않으며, 저장 시도는 기존 `_onRunEnd`의 1회 배치만 유지한다.

- #1: `XpTextbook.jsx` 실제 `collected` 뒤 `pickup_collected/xpTextbook`.
- #2, #7: `_onRunEnd`의 기존 `survival_updated` 유지.
- #5: `GoldCoin.jsx` 실제 `collected`·`gainGold` 뒤 `pickup_collected/goldCoin`.
- #6: `applyUpgrade` 유효 선택 확정 뒤 `upgrade_selected`.
- #10: 실제 버스트 E03 생성 시각을 `gameKey + stageId` 런 메모리에 기록하고 종료 시 `special_enemy_survival` 최대 초로 합산.
- #11, #17, #19, #20: `_onRunEnd`의 기존 `stage_cleared` 유지.
- #12: `LunchItems.jsx` 접촉·회복·실제 제거 성공 뒤 `pickup_collected/lunch`.
- #13: `resetGame`으로 새 런을 만들 때만 `stage_started`; 새 `gameKey`마다 한 번.
- #15: RZT/RZG 실제 버스트 생성 시각 기록과 종료 최대 생존 초 합산.
- #16: 현행 burst event의 실제 B02 배치가 생성된 경우에만 `boss_spawned/B02`; legacy 경로는 사용하지 않음.
- #18: RZL/RZC 실제 버스트 생성 시각 기록과 종료 최대 생존 초 합산.
- #25, #26: `applyUpgrade` 완료 뒤 실제 선택 무기 레벨과 active weapon 수로 `weapon_state`.
- #27: `StudentDialogueTrigger`와 `QuestWorldLayer`의 확정 상호작용 뒤 `interaction_triggered`; `gameKey + stageId + 대상` 키로 같은 런의 중복을 차단.
- #28: `completeQuest` 성공 뒤 `quest_completed`.
- #29: `Hanako.jsx` 20초 간격에서 실제 HP 회복 가능 시 `healPlayer` 호출 뒤 `companion_heal/hanako`.

범위 밖인 #3, #4, #8, #9, #14, #21~#24, #30의 처치·타격·마지막 타격 이벤트는 변경하지 않았다. Stage 1 E04 제외, 240초 스테이지 길이, 스폰·보스·마틸다·무기 피해·타이틀·Studio·오디오·인증 설정은 변경하지 않았다.
  - `hydrateMissionProgress`, `recordMissionEvent`, `saveMissionProgress`, `claimMissionReward`를 추가했다.
  - `setPinnedMissionIds`, `togglePinnedMission`은 catalog id만 받아 중복 없이 최대 2개를 메모리에 고정하며, action 자체는 Firebase write를 호출하지 않는다.
  - hydrate/save/claim은 기존 `firebaseProgress.js` mission helper를 사용하며, run end에서만 batch 저장을 시도한다. 이벤트마다 Firebase write를 하지 않는다.
  - uid가 없거나 저장에 실패해도 메모리 진행과 게임 플레이는 유지한다. localStorage/IndexedDB/임시 JSON은 사용하지 않는다.

정적 확인만 수행했으며, 사용자 지시에 따라 테스트·빌드·브라우저 실행은 하지 않았다.

## Final 30-mission event mapping (2026-08-15)

| # | Runtime event |
|---:|---|
| 1 | `pickup_collected/xpTextbook` |
| 2 | `survival_updated/stage1` |
| 3 | `enemy_killed/E01` |
| 4 | `enemy_killed/pencilThrow` |
| 5 | `pickup_collected/goldCoin` |
| 6 | `upgrade_selected` |
| 7 | `survival_updated/stage1` |
| 8 | `enemy_killed/E07` |
| 9 | `enemy_killed/E02` |
| 10 | `special_enemy_survival/E03` |
| 11 | `stage_cleared/stage1` |
| 12 | `pickup_collected/lunch` |
| 13 | `stage_started/stage2` |
| 14 | `enemy_killed/E04 stage2+` |
| 15 | `special_enemy_survival/RZT,RZG` |
| 16 | `boss_spawned/B02` |
| 17 | `stage_cleared/stage2` |
| 18 | `special_enemy_survival/RZL,RZC` |
| 19 | `stage_cleared/stage3` |
| 20 | `stage_cleared/stage4` |
| 21 | `enemy_killed/schoolBag` |
| 22 | `weapon_hit/tumbler` |
| 23 | `enemy_killed/scienceFlask` |
| 24 | `weapon_hit/bell` |
| 25 | `weapon_state levelFive` |
| 26 | `weapon_state activeCount` |
| 27 | `interaction_triggered` |
| 28 | `quest_completed` |
| 29 | `companion_heal/hanako` |
| 30 | `boss_killed/B01~B04` |
