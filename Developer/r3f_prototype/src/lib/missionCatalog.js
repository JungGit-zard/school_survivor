export const MISSION_CATALOG_VERSION = 'missions_2026_08_15_v1'

// 사용자가 30개 미션 골드 보상을 승인했다. 모든 claim은 Firebase 원자 트랜잭션을 통해서만 처리한다.
export const MISSION_REWARD_APPROVED = true

const proposal = (amount) => ({ type: 'gold', amount, status: 'proposal' })
const counter = (counterKey, target) => ({ type: 'counter', counterKey, target })
const anyCounter = (counterKeys, target) => ({ type: 'any-counter', counterKeys, target })

export const MISSION_CATALOG = Object.freeze([
  { id: 'first_xp_textbook', sourceNumber: 1, title: '첫 교과서 줍기', description: '교과서 XP 아이템을 처음 주워 레벨업 흐름을 익힌다.', objective: '한 판에서 교과서 XP 아이템 1회 획득', completion: counter('pickup.xpTextbook.count', 1), rewardProposal: proposal(5) },
  { id: 'first_stage1_30_seconds', sourceNumber: 2, title: '첫 30초 버티기', description: 'Stage 1 초반 이동과 자동 공격에 익숙해질 때까지 버틴다.', objective: 'Stage 1에서 30초 이상 생존', completion: counter('stage.stage1.bestSurvivalSec', 30), rewardProposal: proposal(5) },
  { id: 'first_e01_kills', sourceNumber: 3, title: '녹색좀비 첫 처치', description: '기본 좀비 E01을 처치해 자동 공격과 처치 보상을 이해한다.', objective: 'E01 10마리 처치', completion: counter('enemy.E01.killCount', 10), rewardProposal: proposal(8) },
  { id: 'pencil_throw_training', sourceNumber: 4, title: '연필 적응 훈련', description: '시작 무기 연필 던지기로 초반 적을 꾸준히 처치한다.', objective: 'pencilThrow 마지막 타격 처치 15회', completion: counter('weapon.pencilThrow.killCount', 15), rewardProposal: proposal(8) },
  { id: 'first_gold_coin', sourceNumber: 5, title: '첫 골드 코인', description: '전투 중 나온 황금 코인을 주워 영구 보상 구조를 익힌다.', objective: 'goldCoin 픽업 1회 획득', completion: counter('pickup.goldCoin.count', 1), rewardProposal: proposal(5) },
  { id: 'first_levelup_choice', sourceNumber: 6, title: '첫 레벨업 선택', description: '교과서를 모아 레벨업 카드 선택을 완료한다.', objective: '레벨업 선택 1회 확정', completion: counter('upgrade.choice.count', 1), rewardProposal: proposal(8) },
  { id: 'stage1_one_minute', sourceNumber: 7, title: 'Stage 1 1분 생존', description: 'Stage 1에서 초반 60초를 넘기며 기본 조작을 안정화한다.', objective: 'Stage 1에서 60초 이상 생존', completion: counter('stage.stage1.bestSurvivalSec', 60), rewardProposal: proposal(10) },
  { id: 'e07_recognition', sourceNumber: 8, title: '웃는좀비 알아보기', description: 'Stage 1에 등장하는 웃는좀비 E07을 보고 대응한다.', objective: 'E07 3마리 처치', completion: counter('enemy.E07.killCount', 3), rewardProposal: proposal(10) },
  { id: 'e02_tanker_practice', sourceNumber: 9, title: '탱커 상대 연습', description: '체력이 높은 탱커 E02를 상대하며 거리 유지와 화력 집중을 익힌다.', objective: 'E02 3마리 처치', completion: counter('enemy.E02.killCount', 3), rewardProposal: proposal(12) },
  { id: 'e03_runner_survival', sourceNumber: 10, title: '러너 피하기', description: '빠른 러너 E03 압박을 맞지 않고 버티는 감각을 익힌다.', objective: 'E03 등장 뒤 20초 이상 생존', completion: counter('special.E03.survivedAfterSpawnSec', 20), rewardProposal: proposal(12) },
  { id: 'first_stage1_escape', sourceNumber: 11, title: '첫 Stage 1 탈출', description: 'Stage 1에서 끝까지 생존하고 탈출 포탈로 클리어한다.', objective: 'Stage 1 클리어 1회', completion: counter('stage.stage1.clearCount', 1), rewardProposal: proposal(20) },
  { id: 'lunch_secured', sourceNumber: 12, title: '점심 확보', description: '전투 중 런치 아이템을 획득해 회복과 보급 피드백을 경험한다.', objective: 'lunch 계열 드롭 아이템 1회 획득', completion: counter('pickup.lunch.count', 1), rewardProposal: proposal(10) },
  { id: 'first_stage2_start', sourceNumber: 13, title: 'Stage 2 첫 등교', description: 'Stage 2에 진입해 새 적 조합과 이벤트를 경험한다.', objective: 'Stage 2 플레이 시작 1회', completion: counter('stage.stage2.startCount', 1), rewardProposal: proposal(10) },
  { id: 'stage2_e04_response', sourceNumber: 14, title: '원거리좀비 첫 대응', description: 'Stage 2 이후 등장 가능한 E04 원거리 좀비를 처치한다.', objective: 'Stage 2 이상에서 E04 1마리 처치', completion: anyCounter(['stage.stage2.enemy.E04.killCount', 'stage.stage3.enemy.E04.killCount', 'stage.stage4.enemy.E04.killCount'], 1), rewardProposal: proposal(12) },
  { id: 'stage2_guard_chase', sourceNumber: 15, title: '경비 추격 살아남기', description: 'Stage 2의 RZT/RZG 추격 이벤트를 겪고 도망치는 흐름을 익힌다.', objective: 'RZT 또는 RZG 등장 뒤 30초 이상 생존', completion: anyCounter(['special.RZT.survivedAfterSpawnSec', 'special.RZG.survivedAfterSpawnSec'], 30), rewardProposal: proposal(15) },
  { id: 'stage2_b02_encounter', sourceNumber: 16, title: 'Stage 2 보스 조우', description: 'Stage 2의 B02 보스 등장 구간까지 버틴다.', objective: 'B02 등장 1회 확인', completion: counter('boss.B02.spawnCount', 1), rewardProposal: proposal(18) },
  { id: 'stage2_escape', sourceNumber: 17, title: 'Stage 2 탈출', description: 'Stage 2를 끝까지 버티고 클리어한다.', objective: 'Stage 2 클리어 1회', completion: counter('stage.stage2.clearCount', 1), rewardProposal: proposal(25) },
  { id: 'stage3_runner_crew', sourceNumber: 18, title: 'Stage 3 달리기 구간 적응', description: 'Stage 3의 RZL/RZC 달리기 크루 압박을 경험하고 버틴다.', objective: 'RZL 또는 RZC 등장 뒤 30초 이상 생존', completion: anyCounter(['special.RZL.survivedAfterSpawnSec', 'special.RZC.survivedAfterSpawnSec'], 30), rewardProposal: proposal(18) },
  { id: 'stage3_escape', sourceNumber: 19, title: 'Stage 3 탈출', description: 'Stage 3를 클리어해 후반 스테이지 접근을 연다.', objective: 'Stage 3 클리어 1회', completion: counter('stage.stage3.clearCount', 1), rewardProposal: proposal(30) },
  { id: 'stage4_escape', sourceNumber: 20, title: 'Stage 4 탈출', description: '현행 플레이어블 스테이지의 마지막 Stage 4를 클리어한다.', objective: 'Stage 4 클리어 1회', completion: counter('stage.stage4.clearCount', 1), rewardProposal: proposal(40) },
  { id: 'school_bag_pushback', sourceNumber: 21, title: '책가방으로 밀어내기', description: '근접 방어 무기 책가방으로 몰린 적을 처리한다.', objective: 'schoolBag 마지막 타격 처치 10회', completion: counter('weapon.schoolBag.killCount', 10), rewardProposal: proposal(15) },
  { id: 'tumbler_orbit', sourceNumber: 22, title: '텀블러 궤도 익히기', description: '텀블러로 근접한 적을 자동 타격한다.', objective: 'tumbler 적중 50회', completion: counter('weapon.tumbler.hitCount', 50), rewardProposal: proposal(15) },
  { id: 'science_flask_experiment', sourceNumber: 23, title: '과학 플라스크 폭발 실험', description: 'scienceFlask 폭발로 밀집한 적을 처리한다.', objective: 'scienceFlask 마지막 타격 처치 8회', completion: counter('weapon.scienceFlask.killCount', 8), rewardProposal: proposal(18) },
  { id: 'bell_shockwave', sourceNumber: 24, title: '종소리 충격파', description: 'bell 충격파로 사방 압박을 줄인다.', objective: 'bell 적중 20회', completion: counter('weapon.bell.hitCount', 20), rewardProposal: proposal(18) },
  { id: 'weapon_level_five', sourceNumber: 25, title: '무기 하나 Lv.5', description: '한 무기를 끝까지 강화해 성장 체감을 경험한다.', objective: '임의 무기 1종 Lv.5 달성', completion: counter('weapon.any.levelFiveCount', 1), rewardProposal: proposal(20) },
  { id: 'four_active_weapons', sourceNumber: 26, title: '무기 4종 운용', description: '서로 다른 무기를 조합해 자동 전투 빌드를 만든다.', objective: 'active weapon 4종 이상 보유', completion: counter('weapon.active.count', 4), rewardProposal: proposal(20) },
  { id: 'first_investigation', sourceNumber: 27, title: '첫 조사 상호작용', description: '학교 기물이나 NPC에 접근해 조사 또는 대사를 발생시킨다.', objective: '조사 또는 대사 상호작용 1회', completion: counter('interaction.trigger.count', 1), rewardProposal: proposal(10) },
  { id: 'first_quest_complete', sourceNumber: 28, title: '퀘스트 첫 완료', description: 'NPC 또는 기물 기반 퀘스트를 하나 완료한다.', objective: '퀘스트 완료 이벤트 1회', completion: counter('quest.any.completeCount', 1), rewardProposal: proposal(20) },
  { id: 'hanako_cheer', sourceNumber: 29, title: '하나코의 응원', description: '하나코 동료와 함께 생존하며 회복 지원을 경험한다.', objective: 'Hanako 회복 1회 발생', completion: counter('companion.hanako.healCount', 1), rewardProposal: proposal(20) },
  { id: 'boss_hunter', sourceNumber: 30, title: '보스 사냥꾼', description: '현재 플레이어블 스테이지 보스 중 하나를 직접 처치한다.', objective: 'B01~B04 중 임의 보스 1체 처치', completion: anyCounter(['boss.B01.killCount', 'boss.B02.killCount', 'boss.B03.killCount', 'boss.B04.killCount'], 1), rewardProposal: proposal(35) },
])

export const MISSION_BY_ID = Object.freeze(Object.fromEntries(MISSION_CATALOG.map((mission) => [mission.id, mission])))

export function getApprovedMissionRewardAllowlist() {
  if (!MISSION_REWARD_APPROVED) return Object.freeze({})
  return Object.freeze(Object.fromEntries(MISSION_CATALOG.map((mission) => [mission.id, {
    type: mission.rewardProposal.type,
    amount: mission.rewardProposal.amount,
  }])))
}
