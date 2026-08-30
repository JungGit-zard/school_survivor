import { useEffect, useState, useMemo, useRef } from 'react'
import '../assets/fonts/nanumMyeongjo.css'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore, STAGE1_INTRO_IDS } from '../store/useGameStore.js'
import { useAuthStore } from '../store/useAuthStore.js'
import { enemyHandleScratch, enemyPool, joystickDir, playerPos, portalTarget } from '../lib/refs.js'
import { ENEMY_SIZE_MULTIPLIER, ENEMY_STATS } from './Enemy.jsx'
import { getPortalObjective } from '../lib/portalObjective.js'
import { UPGRADE_EFFECTS, isUpgradeAvailable, selectSequentialLevelupChoices } from '../lib/upgrades.js'
import { getAccountUnlockableWeaponIds, WEAPON_CATALOG } from '../lib/weaponCatalog.js'
import { isUnlocked as isWeaponUnlocked } from '../lib/weaponUnlocks.js'
import { buildPlaytestSummary } from '../lib/playtestLogger.js'
import { emitSfx } from '../lib/sfxEvents.js'
import { playDialogueVoice, stopDialogueVoice } from '../lib/dialogueVoice.js'
import { getNextStageId, getStageConfig } from '../lib/stageConfig.js'
import { STAGE2_SPAWN_TELEGRAPHS, STAGE3_SPAWN_TELEGRAPHS, STAGE4_SPAWN_TELEGRAPHS } from '../lib/waveTimelines.js'
import { getAdminOperationsConfig } from '../lib/adminConfig.js'
import { getRankingScore } from '../lib/rankingScorePolicy.js'
import { formatRunClock, useGameNumber } from '../lib/numberFormat.js'
import { CRITICAL_SHAKE_NORMAL_DURATION_MS, emitCriticalHitScreenShake, isCriticalScreenShakeReduced } from '../lib/criticalScreenShake.js'
import { MATILDA_DIALOGUE_MS } from '../lib/matildaEntryGrace.js'
import { BOSS_TELEGRAPH_LEAD_SEC, getSpawnCatchUpOffsetSec } from '../lib/spawnCatchUp.js'
import { getDialogueText } from '../dialogues/dialogueStore.js'
import { getQuestDefinition, getStageQuestDefinitions } from '../lib/quests.js'
import { BOSS_PASSIVE_ITEM_UI_CAPACITY, BOSS_PASSIVE_ITEMS, isBossPassiveItemUnlocked } from '../lib/bossPassiveItems.js'
import {
  DEFAULT_STUDIO_TUNING,
  GRAPHICS_STUDIO_TUNING_EVENT,
  loadStudioTunings,
} from '../lib/graphicsStudioConfig.js'
import {
  FIREBASE_STUDIO_RUNTIME_EVENT,
  isFirebaseStudioRuntimeReady,
} from '../lib/studioRuntimeState.js'

const BOSS_PASSIVE_ITEM_ICONS = Object.freeze({
  b01SetSquare: '📐',
  b02CorridorPass: '🎫',
  b03GymWhistle: '📣',
  b04ServingLadle: '🥄',
})
import { isProjectMaster } from '../lib/projectAdmin.js'
import { schoolButton, schoolPanel, uiBorders, uiPalette, uiShadows, uiType } from '../lib/uiStyle.js'
import { getMissionStatus } from '../lib/missionProgress.js'
import { MISSION_BY_ID } from '../lib/missionCatalog.js'
import MissionTracker from './MissionTracker.jsx'
import { milestoneLabel, t as translate, useT, weaponLabel } from '../lib/i18n.js'
import { dispatchStarlinkCheatCrash } from './Weapons/Starlink.jsx'
import pencilIconSrc from '../assets/weapon_icon/01_wea_pencil.png.webp'
import rulerIconSrc from '../assets/weapon_icon/02_wea_30ruller.png.webp'
import boxCutterIconSrc from '../assets/weapon_icon/13_wea_boxcutter.svg'
import tumblerIconSrc from '../assets/weapon_icon/03_wea_tumbler.png.webp'
import flaskIconSrc from '../assets/weapon_icon/04_wea_science.png.webp'
import bellIconSrc from '../assets/weapon_icon/05_wea_bell.png.webp'
import stunIconSrc from '../assets/weapon_icon/06_wea_stungun.png.webp'
import onigiriIconSrc from '../assets/weapon_icon/07_wea_onigiri.png.webp'
import missileIconSrc from '../assets/weapon_icon/08_wea_extrabattery.png.webp'
import starlinkIconSrc from '../assets/weapon_icon/09_wea_starlink.png.webp'
import compassBladeIconSrc from '../assets/weapon_icon/10_wea_compass.png.webp'
import umbrellaIconSrc from '../assets/weapon_icon/11_wea_umb.png.webp'
import eraserIconSrc from '../assets/weapon_icon/12_wea_eraser.png.webp'
import chibikoIconSrc from '../assets/weapon_icon/14_wea_chibiko.svg'
import hanakoIconSrc from '../assets/weapon_icon/15_wea_hanako.svg'
import inuconIconSrc from '../assets/weapon_icon/19_wea_inucon.svg'
import bikittyCutterIconSrc from '../assets/weapon_icon/17_wea_bikitty_cutter.svg'
import lineDrawIconSrc from '../assets/weapon_icon/18_wea_line_draw.svg'
import sharkMissileIconSrc from '../assets/weapon_icon/14_wea_shark_missile.svg'
import lanternIconSrc from '../assets/weapon_icon/16_wea_lantern.webp'

import laidManPortraitSrc from '../assets/character/laid_man.webp'
import matildaConversationPortraitSrc from '../assets/character/matilda_conversation.webp'

const GAMEOVER_TRANSITION_MS = 1000
const MATILDA_COUNTDOWN_SECONDS = 5
const MATILDA_DIALOGUE_NAME = '마틸다'

// 마틸다 접촉 사망 연출 타임라인 (2026-08-16 사용자 지시: "맞닿은 지점에서 화면이
// 정지 → 효과음과 함께 크리티컬처럼 흔들기 → 그걸 보여주고 흑백 → 게임오버 ui").
//   0ms   즉사 판정은 접촉 프레임 그대로(Enemy.jsx → killPlayer). phase가 gameover가
//         되면 <Physics paused>로 월드가 그 자리에 멈춘다(GameCanvas.jsx). 화면에는
//         아직 아무 후처리도 걸지 않아 부딪힌 그림이 컬러로 정지해 보인다.
// 200ms   임팩트: 효과음 + 크리티컬 히트와 동일한 화면 흔들림(90ms).
// 320ms   흑백 페이드 시작(480ms) → 800ms에 완전 흑백.
// 1000ms  결과창(GAMEOVER_TRANSITION_MS, 일반 사망과 동일).
// 접촉~결과창 총합은 1000ms로 1.5초 상한 안에 있다.
const MATILDA_DEATH_IMPACT_HOLD_MS = 200
// 흑백은 흔들림이 "끝난 뒤에" 시작한다("그걸 보여주고 흑백으로 바꿔"). 홀드에서 파생시켜
// 두면 홀드를 나중에 튜닝해도 흔들림이 흑백에 잘려 들어가지 않는다. 30ms는 사이 여백.
const MATILDA_DEATH_GRAYSCALE_DELAY_MS = MATILDA_DEATH_IMPACT_HOLD_MS + CRITICAL_SHAKE_NORMAL_DURATION_MS + 30
const MATILDA_DEATH_GRAYSCALE_FADE_MS = 480
// 새 오디오를 만들지 않는다. matildaDeath는 레지스트리의 마틸다 전용 사망 스팅인데
// 마틸다가 죽지 않는 적이라(2026-08-13 즉사 추격자 확정) 실제로는 한 번도 울리지 않는
// 자산이다. 추격 내내 반복되는 matildaDash/matildaLaugh와 달리 이 순간에만 들리므로
// 충돌 임팩트음으로 겹치지 않는다.
const MATILDA_DEATH_IMPACT_SFX = Object.freeze({ id: 'matildaDeath', volume: 0.95 })
const DEV_CHEATS_ENABLED = import.meta.env.DEV


function summonCoinJingleZombieCheat() {
  const stats = ENEMY_STATS.E08
  const dirX = joystickDir.active ? joystickDir.x : 0
  const dirZ = joystickDir.active ? joystickDir.z : 1
  const len = Math.hypot(dirX, dirZ) || 1
  const nx = dirX / len
  const nz = dirZ / len
  const spawned = enemyPool.spawnInto(enemyHandleScratch, {
    type: 'E08',
    x: playerPos.x + nx * 2.2,
    y: 0.42 * stats.scale * ENEMY_SIZE_MULTIPLIER,
    z: playerPos.z + nz * 2.2,
    hp: stats.hp,
    maxHp: stats.hp,
    visualScale: stats.scale * ENEMY_SIZE_MULTIPLIER,
    yaw: Math.atan2(nx, nz) + Math.PI,
  })
  if (spawned) emitSfx({ id: 'buttonClick' })
  return spawned
}


// 한국어 라벨은 그대로 폴백으로 남기고, 번역은 업그레이드 키(up.<key>.label)로 찾는다.
const damageLabel = (name, weaponKey, upgradeKey) => (w) => {
  const amount = UPGRADE_EFFECTS[upgradeKey].dmg
  const level = (w[weaponKey].level ?? 1) + 1
  return translate(`up.${upgradeKey}.label`, { amount, level }, `${name} +${amount} (Lv${level})`)
}

const UPGRADES = [
  { key: 'acquireBoxCutter', icon: 'boxCutter', label: '커터칼 해금', desc: '전방 좁은 범위를 찌르고 옆으로 베어냄' },
  { key: 'boxCutterDamage', icon: 'boxCutter', labelFn: damageLabel('커터칼 피해', 'boxCutter', 'boxCutterDamage'), desc: '찌르기 피해 증가' },
  { key: 'boxCutterPower', icon: 'boxCutter', labelFn: damageLabel('커터칼 위력', 'boxCutter', 'boxCutterPower'), desc: '날을 갈아 베기 위력 증가' },
  { key: 'boxCutterRange', icon: 'boxCutter', label: '커터칼 사거리 +', desc: '전방 찌르기 사거리 증가' },
  { key: 'boxCutterCrit', icon: 'boxCutter', label: '커터칼 치명타 강화', desc: '치명타 확률 +4%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'pencilDamage', icon: 'pencil', labelFn: damageLabel('연필 데미지', 'pencilThrow', 'pencilDamage'), desc: '투척 연필의 공격력 증가' },
  { key: 'pencilPower', icon: 'pencil', labelFn: damageLabel('연필 위력', 'pencilThrow', 'pencilPower'), desc: '심을 뾰족하게 깎아 위력 증가' },
  { key: 'pencilCount', icon: 'pencil', label: '연필 발사 수 +1', desc: '동시에 날리는 연필 수 증가 (최대 4)' },
  { key: 'pencilPierce', icon: 'pencil', label: '연필 관통 +1', desc: '연필이 적을 관통 (최대 3회)' },
  { key: 'pencilCrit', icon: 'pencil', label: '연필 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'acquireBag', icon: 'ruler', label: '30cm 자 해금', desc: '가까운 적을 자 휘두르기로 방어' },
  { key: 'bagDamage', icon: 'ruler', labelFn: damageLabel('30cm 자 피해', 'schoolBag', 'bagDamage'), desc: '자 휘두르기 타격 피해 증가' },
  { key: 'bagPower', icon: 'ruler', labelFn: damageLabel('30cm 자 위력', 'schoolBag', 'bagPower'), desc: '더 세게 휘둘러 타격 위력 증가' },
  { key: 'bagRadius', icon: 'ruler', label: '30cm 자 사거리 +', desc: '자 휘두르기 타격 범위 증가' },
  { key: 'bagCrit', icon: 'ruler', label: '30cm 자 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'acquireTumbler', icon: 'tumbler', label: '텀블러 해금', desc: '플레이어 주변을 회전하는 방어 무기' },
  { key: 'tumblerCount', icon: 'tumbler', label: '텀블러 개수 +1', desc: '회전 텀블러 개수 증가 (최대 3개)' },
  { key: 'tumblerDamage', icon: 'tumbler', labelFn: damageLabel('텀블러 피해', 'tumbler', 'tumblerDamage'), desc: '회전 텀블러 접촉 피해 증가' },
  { key: 'tumblerPower', icon: 'tumbler', labelFn: damageLabel('텀블러 위력', 'tumbler', 'tumblerPower'), desc: '텀블러를 가득 채워 접촉 위력 증가' },
  { key: 'tumblerCrit', icon: 'tumbler', label: '텀블러 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'acquireFlask', icon: 'flask', label: '플라스크 해금', desc: '밀집한 적에게 광역 폭발 투척' },
  { key: 'flaskDamage', icon: 'flask', labelFn: damageLabel('플라스크 피해', 'scienceFlask', 'flaskDamage'), desc: '폭발 피해 증가' },
  { key: 'flaskPower', icon: 'flask', labelFn: damageLabel('플라스크 위력', 'scienceFlask', 'flaskPower'), desc: '약품 농도를 올려 폭발 위력 증가, 웅덩이 지속 +1초' },
  { key: 'flaskRadius', icon: 'flask', label: '플라스크 범위 +', desc: '폭발 반경 증가' },
  { key: 'flaskCrit', icon: 'flask', label: '플라스크 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배), 웅덩이 지속 +1초' },
  { key: 'acquireBell', icon: 'bell', label: '벨 해금', desc: '8방향 충격파 스킬 해금' },
  { key: 'bellDamage', icon: 'bell', labelFn: damageLabel('벨 데미지', 'bell', 'bellDamage'), desc: '충격파 공격력 증가' },
  { key: 'bellPower', icon: 'bell', labelFn: damageLabel('벨 위력', 'bell', 'bellPower'), desc: '더 크게 울려 충격파 위력 증가' },
  { key: 'bellCrit', icon: 'bell', label: '벨 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'acquireStun', icon: 'stun', label: '전기충격 해금', desc: '체인 스턴건 스킬 해금' },
  { key: 'stunDamage', icon: 'stun', labelFn: damageLabel('전기 데미지', 'stunGun', 'stunDamage'), desc: '체인 스턴 데미지 증가' },
  { key: 'stunPower', icon: 'stun', labelFn: damageLabel('전기 위력', 'stunGun', 'stunPower'), desc: '전압을 올려 방전 위력 증가' },
  { key: 'stunChain', icon: 'stun', label: '전기 연쇄 +1', desc: '연쇄 대상 수 증가 (최대 4)' },
  { key: 'stunCrit', icon: 'stun', label: '전기 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'acquireOnigiri', icon: 'onigiri', label: '오니기리 해금', desc: '적 사이를 튕기며 공격하는 주먹밥' },
  { key: 'onigiiriBounce', icon: 'onigiri', label: '오니기리 바운스 +1', desc: '튕기는 횟수 증가 (최대 10회)' },
  { key: 'onigiiriDamage', icon: 'onigiri', labelFn: damageLabel('오니기리 피해', 'onigiri', 'onigiiriDamage'), desc: '충돌 피해 증가' },
  { key: 'onigiiriPower', icon: 'onigiri', labelFn: damageLabel('오니기리 위력', 'onigiri', 'onigiiriPower'), desc: '더 단단하게 뭉쳐 충돌 위력 증가' },
  { key: 'onigiiriCrit', icon: 'onigiri', label: '오니기리 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'acquireMissile', icon: 'missile', label: '보조배터리 미사일 해금', desc: '먼 적 무리를 호밍 폭발로 처리' },
  { key: 'missileDamage', icon: 'missile', labelFn: damageLabel('미사일 피해', 'guidedMissile', 'missileDamage'), desc: '폭발 피해 증가' },
  { key: 'missilePower', icon: 'missile', labelFn: damageLabel('미사일 위력', 'guidedMissile', 'missilePower'), desc: '충전 용량을 키워 폭발 위력 증가' },
  { key: 'missileRadius', icon: 'missile', label: '미사일 반경 +', desc: '폭발 반경 증가 (최대 2.2)' },
  { key: 'acquireStarlink', icon: 'starlink', label: '고장난 스타링크 해금', desc: '주변에 무작위 낙뢰 발생' },
  { key: 'starlinkDamage', icon: 'starlink', labelFn: damageLabel('낙뢰 피해', 'starlink', 'starlinkDamage'), desc: '낙뢰 한 발 피해 증가' },
  { key: 'starlinkPower', icon: 'starlink', labelFn: damageLabel('낙뢰 위력', 'starlink', 'starlinkPower'), desc: '출력을 끌어올려 낙뢰 위력 증가' },
  { key: 'starlinkCount', icon: 'starlink', label: '낙뢰 개수 +1', desc: '동시 낙뢰 수 증가 (최대 3)' },
  { key: 'starlinkCrit', icon: 'starlink', label: '낙뢰 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'acquireCompassBlade', icon: 'compassBlade', label: '오리요강 해금', desc: '플레이어를 도는 오리요강' },
  { key: 'compassBladeDamage', icon: 'compassBlade', labelFn: damageLabel('오리요강 피해', 'compassBlade', 'compassBladeDamage'), desc: '회전 오리요강 피해 증가' },
  { key: 'compassBladePower', icon: 'compassBlade', labelFn: damageLabel('오리요강 위력', 'compassBlade', 'compassBladePower'), desc: '더 묵직하게 돌려 접촉 위력 증가' },
  { key: 'compassBladeCount', icon: 'compassBlade', label: '오리요강 개수 +1', desc: '회전 오리요강 수 증가 (최대 3)' },
  { key: 'compassBladeCrit', icon: 'compassBlade', label: '오리요강 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'acquireUmbrellaGuard', icon: 'umbrella', label: '우산 방어막 해금', desc: '주기적 펄스로 근접 적 밀어냄' },
  { key: 'umbrellaDamage', icon: 'umbrella', labelFn: damageLabel('방어막 피해', 'umbrellaGuard', 'umbrellaDamage'), desc: '펄스 한 회 피해 증가' },
  { key: 'umbrellaPower', icon: 'umbrella', labelFn: damageLabel('방어막 위력', 'umbrellaGuard', 'umbrellaPower'), desc: '살대를 보강해 펄스 위력 증가' },
  { key: 'umbrellaRadius', icon: 'umbrella', label: '방어막 반경 +', desc: '펄스 반경 증가' },
  { key: 'acquireEraserBomb', icon: 'eraser', label: '지우개 폭탄 해금', desc: '느린 한 방 광역 폭발' },
  { key: 'eraserDamage', icon: 'eraser', labelFn: damageLabel('폭탄 피해', 'eraserBomb', 'eraserDamage'), desc: '폭발 피해 증가' },
  { key: 'eraserPower', icon: 'eraser', labelFn: damageLabel('폭탄 위력', 'eraserBomb', 'eraserPower'), desc: '장약을 더 채워 폭발 위력 증가' },
  { key: 'eraserRadius', icon: 'eraser', label: '폭탄 반경 +', desc: '폭발 반경 증가' },
  { key: 'acquireLantern', icon: 'lantern', label: '학생용 랜턴 해금', desc: '전방을 빛으로 비춰 빛 안의 적을 연타' },
  { key: 'lanternDamage', icon: 'lantern', labelFn: damageLabel('랜턴 위력', 'studentLantern', 'lanternDamage'), desc: '빛을 밝게 해 빛 안 적이 받는 피해 증가' },
  { key: 'lanternDuration', icon: 'lantern', label: '랜턴 지속 +1초', desc: '점등 시간과 타격 횟수 증가' },
  { key: 'lanternCrit', icon: 'lantern', label: '랜턴 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'acquireChibiko', icon: 'chibiko', label: '치비코 해금', desc: '레벨1 연필 투척 · 보유 무기 능력 10% 강화' },
  { key: 'acquireHanako', icon: 'hanako', label: '하나코 해금', desc: '치비코를 획득해야 등장; 20초마다 주인공 최대 체력의 5% 회복' },
  { key: 'acquireInucon', icon: 'inucon', label: '이누콘 해금', desc: '주인공 뒤를 따라다니며 붙은 좀비를 밀어내고 10초마다 최대 HP 10% 회복' },
  { key: 'inuconHeal', icon: 'inucon', label: '이누콘 회복 +2%', desc: '10초마다 회복하는 최대 HP 비율 증가' },
  { key: 'inuconPushRadius', icon: 'inucon', label: '이누콘 밀어내기 반경 +', desc: '붙은 좀비를 밀어내는 판정 반경 증가' },
  { key: 'inuconKnockback', icon: 'inucon', label: '이누콘 밀치기 강화', desc: '좀비를 더 멀리, 더 오래 밀어냄' },
  { key: 'chibikoDamage', icon: 'chibiko', labelFn: damageLabel('치비코 위력', 'chibiko', 'chibikoDamage'), desc: '치비코가 던지는 연필의 위력 증가' },
  { key: 'chibikoCrit', icon: 'chibiko', label: '치비코 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'acquireBikittyCutter', icon: 'bikittyCutter', label: '바이키티 커터칼 해금', desc: '커터칼을 획득해야 등장; 벨 때마다 날이 길어지고 8단째에 부러지며 전방 산탄' },
  { key: 'bikittyCutterDamage', icon: 'bikittyCutter', labelFn: damageLabel('바이키티 피해', 'bikittyCutter', 'bikittyCutterDamage'), desc: '단수별 베기 피해 증가' },
  { key: 'bikittyCutterPower', icon: 'bikittyCutter', labelFn: damageLabel('바이키티 위력', 'bikittyCutter', 'bikittyCutterPower'), desc: '날을 벼려 단수별 베기 위력 증가' },
  { key: 'bikittyCutterRange', icon: 'bikittyCutter', label: '바이키티 단수 사거리 +', desc: '날이 한 칸 나올 때마다 늘어나는 사거리 증가' },
  { key: 'bikittyCutterCrit', icon: 'bikittyCutter', label: '바이키티 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'acquireLineDraw', icon: 'lineDraw', label: '선긋기 해금', desc: '30cm 자와 커터칼을 둘 다 보유해야 등장; 전방 6.0 직선을 긋고 그 자리에 2초간 남는 절단선을 가로지르는 적을 벤다' },
  { key: 'lineDrawDamage', icon: 'lineDraw', labelFn: damageLabel('선긋기 피해', 'lineDraw', 'lineDrawDamage'), desc: '긋는 순간의 직격 피해와 절단선 피해 증가' },
  { key: 'lineDrawPower', icon: 'lineDraw', labelFn: damageLabel('선긋기 위력', 'lineDraw', 'lineDrawPower'), desc: '깊게 그어 직격 피해와 절단선 피해 증가' },
  { key: 'lineDrawDuration', icon: 'lineDraw', label: '선긋기 절단선 지속 +', desc: '그은 절단선이 바닥에 남는 시간 +0.4초 (최대 4초)' },
  { key: 'lineDrawCrit', icon: 'lineDraw', label: '선긋기 치명타 강화', desc: '치명타 확률 +2%, 치명타 피해 배율 +0.75배 (최대 4.5배)' },
  { key: 'acquireSharkMissile', icon: 'sharkMissile', label: '상어미사일 해금', desc: '가장 빽빽한 좀비 무리로 호밍 폭발' },
  { key: 'sharkMissileDamage', icon: 'sharkMissile', labelFn: damageLabel('상어미사일 피해', 'sharkMissile', 'sharkMissileDamage'), desc: '폭발 피해 증가' },
  { key: 'sharkMissilePower', icon: 'sharkMissile', labelFn: damageLabel('상어미사일 위력', 'sharkMissile', 'sharkMissilePower'), desc: '탄두를 키워 폭발 위력 증가' },
  { key: 'sharkMissileRadius', icon: 'sharkMissile', label: '상어미사일 반경 +', desc: '폭발 반경 증가' },
  { key: 'moveSpeed', icon: 'speed', label: '이동속도 +10%', desc: '플레이어 이동속도 증가' },
  { key: 'maxHealth', icon: 'health', label: '최대 체력 +20', desc: '최대 HP 및 현재 HP 증가' },
]

const UMBRELLA_UPGRADE_COPY = {
  acquireUmbrellaGuard: { label: '우산 방어막 해금', desc: '펼쳐진 우산이 회전 후 폭발' },
  umbrellaDamage: { labelFn: damageLabel('우산 폭발 피해', 'umbrellaGuard', 'umbrellaDamage'), desc: '마지막 폭발 피해 증가' },
  umbrellaRadius: { label: '우산 폭발 범위 +', desc: '폭발 범위 증가' },
}

for (const upgrade of UPGRADES) {
  if (UMBRELLA_UPGRADE_COPY[upgrade.key]) Object.assign(upgrade, UMBRELLA_UPGRADE_COPY[upgrade.key])
}

const PENCIL_UPGRADE_KEYS = new Set(['pencilDamage', 'pencilCount', 'pencilPierce', 'pencilCrit'])

const WEAPON_UPGRADE_ICON_SRC = {
  pencil: pencilIconSrc,
  ruler: rulerIconSrc,
  boxCutter: boxCutterIconSrc,
  tumbler: tumblerIconSrc,
  flask: flaskIconSrc,
  bell: bellIconSrc,
  stun: stunIconSrc,
  onigiri: onigiriIconSrc,
  missile: missileIconSrc,
  starlink: starlinkIconSrc,
  compassBlade: compassBladeIconSrc,
  umbrella: umbrellaIconSrc,
  eraser: eraserIconSrc,
  chibiko: chibikoIconSrc,
  hanako: hanakoIconSrc,
  inucon: inuconIconSrc,
  sharkMissile: sharkMissileIconSrc,
  lantern: lanternIconSrc,
  bikittyCutter: bikittyCutterIconSrc,
  lineDraw: lineDrawIconSrc,
}

const WEAPON_KEY_TO_ICON = {
  pencilThrow:   'pencil',
  schoolBag:     'ruler',
  boxCutter:     'boxCutter',
  tumbler:       'tumbler',
  scienceFlask:  'flask',
  bell:          'bell',
  stunGun:       'stun',
  onigiri:       'onigiri',
  guidedMissile: 'missile',
  starlink:      'starlink',
  compassBlade:  'compassBlade',
  umbrellaGuard: 'umbrella',
  eraserBomb:    'eraser',
  chibiko:       'chibiko',
  hanako:        'hanako',
  inucon:        'inucon',
  sharkMissile:  'sharkMissile',
  studentLantern: 'lantern',
  bikittyCutter: 'bikittyCutter',
  lineDraw:      'lineDraw',
}

const WEAPON_ICON_STUDIO_ITEMS = {
  missile: 'weapon-extra-battery',
}

function resolveAssetSrc(src, depth = 0) {
  if (!src) return null
  if (typeof src === 'string') return src
  if (depth > 4) return String(src)
  if (typeof src.default === 'string') return src.default
  if (typeof src.src === 'string') return src.src
  return resolveAssetSrc(src.default ?? src.src ?? src.href, depth + 1)
}

export function getWeaponUpgradeIconSrc(type) {
  const src = WEAPON_UPGRADE_ICON_SRC[type]
  if (!src) return null
  return resolveAssetSrc(src)
}

function hexToRgba(hex, opacity) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : '050209'
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function loadDomStudioTuning(itemId) {
  if (!itemId || !isFirebaseStudioRuntimeReady()) return null
  return loadStudioTunings()[itemId] ?? null
}

function useDomStudioTuning(itemId) {
  const [tuning, setTuning] = useState(() => loadDomStudioTuning(itemId))

  useEffect(() => {
    if (!itemId || typeof window === 'undefined') return undefined
    const update = () => setTuning(loadDomStudioTuning(itemId))
    window.addEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
    window.addEventListener(FIREBASE_STUDIO_RUNTIME_EVENT, update)
    return () => {
      window.removeEventListener(GRAPHICS_STUDIO_TUNING_EVENT, update)
      window.removeEventListener(FIREBASE_STUDIO_RUNTIME_EVENT, update)
    }
  }, [itemId])

  return tuning
}

function getDomStudioTuningStyle(tuning) {
  const scaleX = Number((tuning.scale * tuning.scaleX).toFixed(2))
  const scaleY = Number((tuning.scale * tuning.scaleY).toFixed(2))
  const outlineSize = Math.max(0, tuning.outlineThickness - 1) * 2
  return {
    transform: `scale(${scaleX}, ${scaleY}) rotateX(${tuning.rotationX}deg) rotateY(${tuning.rotationY}deg) rotateZ(${tuning.rotationZ}deg)`,
    transformOrigin: 'center',
    filter: [
      `drop-shadow(0 2px 2px rgba(0,0,0,0.5))`,
      `drop-shadow(0 0 ${outlineSize}px ${hexToRgba(tuning.outlineColor, tuning.outlineOpacity)})`,
      `saturate(${tuning.saturation})`,
      `brightness(${tuning.brightness})`,
    ].join(' '),
  }
}

export function limitPencilUpgradeOptions(options, random = () => 0) {
  const pencilOptions = options.filter((option) => PENCIL_UPGRADE_KEYS.has(option.key))
  if (pencilOptions.length <= 1) return options

  const selectedPencil = pencilOptions[Math.floor(random() * pencilOptions.length)]
  return [
    ...options.filter((option) => !PENCIL_UPGRADE_KEYS.has(option.key)),
    selectedPencil,
  ]
}

function getUpgradeChoiceGroupKey(option) {
  const effect = UPGRADE_EFFECTS[option.key]
  if (effect?.weapon) return `weapon:${effect.weapon}`
  return `nonWeapon:${option.key}`
}

export function limitDuplicateWeaponUpgradeOptions(options, random = () => 0) {
  const groups = new Map()
  for (const option of options) {
    const groupKey = getUpgradeChoiceGroupKey(option)
    const group = groups.get(groupKey)
    if (group) group.push(option)
    else groups.set(groupKey, [option])
  }

  const limited = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      limited.push(group[0])
      continue
    }
    limited.push(group[Math.floor(random() * group.length)])
  }
  return limited
}

function introLine(index) {
  return getDialogueText(STAGE1_INTRO_IDS[index])
}

export function getUpgradeChoiceLabel(option, weapons = {}) {
  const effect = UPGRADE_EFFECTS[option.key]
  if (effect?.kind === 'acquire') {
    const koreanName = WEAPON_CATALOG[effect.weapon]?.label ?? weapons[effect.weapon]?.label ?? effect.weapon
    return translate('up.acquireLabel', { weapon: weaponLabel(effect.weapon, koreanName) }, `${koreanName} 획득`)
  }
  return option.labelFn ? option.labelFn(weapons) : translate(`up.${option.key}.label`, null, option.label)
}

export function getUpgradeChoiceDesc(option) {
  const effect = UPGRADE_EFFECTS[option.key]
  const desc = translate(`up.${option.key}.desc`, null, option.desc)
  if (effect?.kind !== 'acquire') return desc
  const unlockWord = translate('up.unlockWord', null, '해금')
  const acquireWord = translate('up.acquireWord', null, '획득')
  return desc?.replaceAll(unlockWord, acquireWord) ?? ''
}

function pickFour(level, weapons, player, pendingGuaranteedUpgradeChoiceKeys = [], exposedAcquireKeys = [], weaponCycleIds = [], rotationWeaponIds = []) {
  const available = UPGRADES.filter((u) => isUpgradeAvailable(UPGRADE_EFFECTS[u.key], level, weapons, player))
  const limited = limitDuplicateWeaponUpgradeOptions(available)
  const chibikoKey = (weapons.chibiko?.level ?? 1) % 2 === 0 ? 'chibikoCrit' : 'chibikoDamage'
  const chibikoOption = available.find((option) => option.key === chibikoKey)
  const chibikoIndex = limited.findIndex((option) => UPGRADE_EFFECTS[option.key]?.weapon === 'chibiko')
  if (chibikoOption && chibikoIndex >= 0) limited[chibikoIndex] = chibikoOption
  const selection = selectSequentialLevelupChoices({
    orderedKeys: UPGRADES.map((upgrade) => upgrade.key),
    availableKeys: limited.map((upgrade) => upgrade.key),
    pendingGuaranteedKeys: pendingGuaranteedUpgradeChoiceKeys,
    exposedAcquireKeys,
    weaponCycleIds,
    rotationWeaponIds,
    choiceCount: 4,
    isAcquireKey: (key) => UPGRADE_EFFECTS[key]?.kind === 'acquire',
    getChoiceGroupKey: (key) => getUpgradeChoiceGroupKey({ key }),
  })
  return {
    ...selection,
    choices: selection.choiceKeys.map((key) => UPGRADES.find((upgrade) => upgrade.key === key)).filter(Boolean),
  }
}

function isGuaranteedFollowupPermanentlyUnavailable(key, weapons) {
  const effect = UPGRADE_EFFECTS[key]
  return !effect?.weapon
    || weapons[effect.weapon]?.active
}

export function getNextUnlockPreview(phase, weapons) {
  if (phase !== 'gameover' && phase !== 'cleared') return null
  const candidates = Object.entries(UPGRADE_EFFECTS)
    .filter(([, eff]) => eff.kind === 'acquire' && !weapons[eff.weapon]?.active && isWeaponUnlocked(eff.weapon))
    .map(([key, eff]) => ({ key, weapon: eff.weapon, minLevel: eff.minLevel ?? 0 }))
    .sort((a, b) => a.minLevel - b.minLevel)
  if (candidates.length === 0) return null
  const top = candidates[0]
  const entry = UPGRADES.find((u) => u.key === top.key)
  return { ...top, icon: entry?.icon, label: weapons[top.weapon]?.label ?? WEAPON_CATALOG[top.weapon]?.label ?? top.weapon }
}

function WeaponMiniIcon({ src }) {
  const [failed, setFailed] = useState(false)
  return (
    <div style={styles.weaponMiniIcon}>
      {!failed && (
        <img src={src} alt="" draggable={false} style={styles.weaponMiniImg} onError={() => setFailed(true)} />
      )}
    </div>
  )
}

function QuestBagIcon({ size = 28 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M10 10V8.5A6 6 0 0 1 22 8.5V10" fill="none" stroke="#ffb4d2" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M7 11.5h18v15H7z" fill="#ff79b1" stroke="#5f173c" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 17h12v7H10z" fill="#c83272" stroke="#5f173c" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8.5 13.5 5.5 18M23.5 13.5l3 4.5" fill="none" stroke="#ffb4d2" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="20.5" r="1.15" fill="#ffe9f3" />
    </svg>
  )
}

function QuestItemPictureIcon({ visualKind, size = 62.4 }) {
  const kind = visualKind ?? 'book'
  const svgSize = Number((size * 0.875).toFixed(1))
  const frameRadius = Number((size * 0.208).toFixed(1))
  return (
    <span
      style={{
        ...styles.questItemPictureFrame,
        flex: `0 0 ${size}px`,
        width: size,
        height: size,
        borderRadius: frameRadius,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width={svgSize} height={svgSize} focusable="false" style={styles.questItemPictureSvg}>
        <rect x="3" y="3" width="58" height="58" rx="13" fill="#fff7d8" stroke="#1d1007" strokeWidth="4" />
        {(kind === 'red-book' || kind === 'book') && (
          <g transform="rotate(-9 32 32)">
            <rect x="20" y="13" width="29" height="38" rx="4" fill={kind === 'red-book' ? '#c91f31' : '#e85c9b'} stroke="#250706" strokeWidth="4" />
            <path d="M25 16v32" stroke="#ffe39f" strokeWidth="4" strokeLinecap="round" />
            <path d="M31 22h11M31 29h10" stroke="#fff5ca" strokeWidth="3" strokeLinecap="round" />
            <path d="M45 13v38" stroke="#7e151d" strokeWidth="3" />
          </g>
        )}
        {kind === 'attendance-sheet' && (
          <g transform="rotate(5 32 32)">
            <rect x="18" y="10" width="31" height="43" rx="3" fill="#fff3c6" stroke="#241606" strokeWidth="4" />
            <path d="M25 19h18M25 28h18M25 37h18M25 46h13" stroke="#38250f" strokeWidth="3" strokeLinecap="round" />
            <path d="M18 17h31" stroke="#ef7c28" strokeWidth="4" />
            <circle cx="22" cy="19" r="3.2" fill="#e02235" stroke="#241606" strokeWidth="2" />
            <circle cx="22" cy="28" r="3.2" fill="#31a24c" stroke="#241606" strokeWidth="2" />
            <circle cx="22" cy="37" r="3.2" fill="#e02235" stroke="#241606" strokeWidth="2" />
          </g>
        )}
        {kind === 'bandage' && (
          <g transform="rotate(-14 32 32)">
            <rect x="9" y="23" width="46" height="18" rx="9" fill="#ffe8bd" stroke="#2d1708" strokeWidth="4" />
            <rect x="24" y="22" width="16" height="20" rx="4" fill="#fffaf0" stroke="#9c6b46" strokeWidth="3" />
            <circle cx="29" cy="28" r="1.9" fill="#c98054" />
            <circle cx="36" cy="28" r="1.9" fill="#c98054" />
            <circle cx="29" cy="36" r="1.9" fill="#c98054" />
            <circle cx="36" cy="36" r="1.9" fill="#c98054" />
          </g>
        )}
        {kind === 'key' && (
          <g transform="rotate(-27 32 32)" fill="#f5c84d" stroke="#2b1705" strokeWidth="4" strokeLinejoin="round">
            <circle cx="23" cy="30" r="11" fill="none" />
            <circle cx="23" cy="30" r="4" fill="#fff2a8" strokeWidth="3" />
            <path d="M34 30h23" strokeLinecap="round" />
            <path d="M47 30v9M54 30v6" strokeLinecap="round" />
          </g>
        )}
        {kind === 'whistle' && (
          <g transform="rotate(-10 32 32)">
            <path d="M12 34c0-11 8-18 22-18h15v28H30c-10 0-18-4-18-10Z" fill="#e02a3a" stroke="#2a090c" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="31" cy="32" r="7" fill="#ffd4d8" stroke="#2a090c" strokeWidth="3" />
            <path d="M49 22h7v10h-7" fill="#ffb03d" stroke="#2a090c" strokeWidth="4" strokeLinejoin="round" />
            <path d="M18 21c6-5 16-7 24-4" stroke="#fff3f3" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
        {kind === 'fuse' && (
          <g transform="rotate(-14 32 32)">
            <path d="M9 32h10M45 32h10" stroke="#241004" strokeWidth="6" strokeLinecap="round" />
            <rect x="18" y="21" width="28" height="22" rx="7" fill="#ff9f1f" stroke="#241004" strokeWidth="4" />
            <path d="M25 25h14" stroke="#fff1a6" strokeWidth="3" strokeLinecap="round" />
            <path d="M17 18l6 6M47 18l-6 6" stroke="#ffdf65" strokeWidth="4" strokeLinecap="round" />
            <path d="M13 15l-3-5M51 15l3-5" stroke="#ff3e3e" strokeWidth="4" strokeLinecap="round" />
          </g>
        )}
        {kind === 'list' && (
          <g transform="rotate(-4 32 32)">
            <rect x="17" y="10" width="32" height="44" rx="4" fill="#8fd7e8" stroke="#09252d" strokeWidth="4" />
            <path d="M24 21l4 4 8-9M24 33l4 4 8-9M24 45l4 4 8-9" fill="none" stroke="#0f6d4a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M38 24h7M38 36h7M38 48h5" stroke="#f4ffff" strokeWidth="3" strokeLinecap="round" />
            <path d="M23 12c5-5 14-5 19 0" stroke="#eaffff" strokeWidth="3" fill="none" />
          </g>
        )}
        {kind === 'valve' && (
          <g transform="rotate(18 32 32)" fill="#d92f2b" stroke="#250706" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="32" cy="32" r="16" fill="none" />
            <path d="M32 14v36M14 32h36M20 20l24 24M44 20 20 44" />
            <circle cx="32" cy="32" r="7" fill="#ffb59d" />
            <circle cx="32" cy="32" r="3" fill="#250706" stroke="none" />
          </g>
        )}
      </svg>
    </span>
  )
}

export function UpgradeIcon({ type }) {
  const imageSrc = getWeaponUpgradeIconSrc(type)
  const studioItemId = WEAPON_ICON_STUDIO_ITEMS[type]
  const studioTuning = useDomStudioTuning(studioItemId)
  const studioStyle = studioItemId && studioTuning ? getDomStudioTuningStyle(studioTuning) : null
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [imageSrc])

  return (
    <div style={styles.iconBox}>
      {imageSrc && !imageFailed && (
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{ ...styles.weaponIconImage, ...studioStyle }}
          onError={() => setImageFailed(true)}
        />
      )}
      {(!imageSrc || imageFailed) && (
        <span data-upgrade-fallback-icon={type} style={styles.fallbackIconWrap}>
      {type === 'pencil' && (
        <div style={styles.pencilIcon}>
          <span style={styles.pencilLead} />
          <span style={styles.pencilBody} />
          <span style={styles.pencilEraser} />
        </div>
      )}
      {type === 'ruler' && (
        <div style={styles.rulerIcon}>
          <span style={styles.rulerEdge} />
          <span style={styles.rulerMarkA} />
          <span style={styles.rulerMarkB} />
          <span style={styles.rulerMarkC} />
        </div>
      )}
      {type === 'boxCutter' && (
        <div style={styles.boxCutterIcon}>
          <span style={styles.boxCutterBlade} />
          <span style={styles.boxCutterBody} />
          <span style={styles.boxCutterGrip} />
        </div>
      )}
      {type === 'flask' && (
        <div style={styles.flaskIcon}>
          <span style={styles.flaskNeck} />
          <span style={styles.flaskLiquid} />
        </div>
      )}
      {type === 'tumbler' && (
        <div style={styles.tumblerIcon}>
          <span style={styles.tumblerCap} />
        </div>
      )}
      {type === 'bell' && (
        <div style={styles.bellIcon}>
          <span style={styles.bellKnob} />
          <span style={styles.bellClapper} />
        </div>
      )}
      {type === 'stun' && (
        <div style={styles.stunIcon}>
          <span style={styles.stunBolt} />
        </div>
      )}
      {type === 'missile' && (
        <div style={styles.missileIcon}>
          <span style={styles.missileBody} />
          <span style={styles.missileNose} />
          <span style={styles.missileFlame} />
        </div>
      )}
      {type === 'starlink' && (
        <div style={styles.starlinkIcon}>
          <span style={styles.starlinkBolt} />
          <span style={styles.starlinkRingA} />
          <span style={styles.starlinkRingB} />
        </div>
      )}
      {type === 'compassBlade' && (
        <div style={styles.compassBladeIcon}>
          <span style={styles.compassBladeBlade} />
          <span style={styles.compassBladeHandle} />
        </div>
      )}
      {type === 'umbrella' && (
        <div style={styles.umbrellaIcon}>
          <span style={styles.umbrellaCanopy} />
          <span style={styles.umbrellaHandle} />
        </div>
      )}
      {type === 'eraser' && (
        <div style={styles.eraserIcon}>
          <span style={styles.eraserBody} />
          <span style={styles.eraserBand} />
        </div>
      )}
      {type === 'onigiri' && (
        <svg width="50" height="46" viewBox="0 0 50 46" style={{ display: 'block', margin: '0 auto' }}>
          {/* 두꺼운 검은 외곽선 */}
          <path d="M25 1 C20 8 2 30 2 37 Q2 45 10 45 H40 Q48 45 48 37 C48 30 30 8 25 1 Z" fill="#111" />
          {/* 흰 쌀 본체 */}
          <path d="M25 5 C20 12 6 31 6 37 Q6 43 11 43 H39 Q44 43 44 37 C44 31 30 12 25 5 Z" fill="#f8f7f0" />
          {/* 쌀알 타원 질감 — 크고 둥글게 */}
          <ellipse cx="25" cy="9"  rx="5.5" ry="3.8" fill="#e8e6d6" />
          <ellipse cx="17" cy="16" rx="5.8" ry="4.0" fill="#e8e6d6" />
          <ellipse cx="33" cy="15" rx="5.5" ry="3.8" fill="#e8e6d6" />
          <ellipse cx="12" cy="25" rx="5.2" ry="3.8" fill="#e8e6d6" />
          <ellipse cx="25" cy="23" rx="6.0" ry="4.2" fill="#e8e6d6" />
          <ellipse cx="38" cy="24" rx="4.8" ry="3.5" fill="#e8e6d6" />
          <ellipse cx="9"  cy="33" rx="4.0" ry="2.9" fill="#e8e6d6" />
          <ellipse cx="21" cy="30" rx="5.0" ry="3.6" fill="#e8e6d6" />
          <ellipse cx="33" cy="30" rx="4.8" ry="3.4" fill="#e8e6d6" />
          <ellipse cx="41" cy="33" rx="3.8" ry="2.8" fill="#e8e6d6" />
          {/* 김 조각 — 아래 중앙에만 붙임 */}
          <rect x="15" y="29" width="20" height="14" rx="2.5" fill="#111" />
          <rect x="17" y="31" width="16" height="11" rx="2" fill="#192e13" />
          {/* 김 질감 */}
          <line x1="19" y1="34" x2="31" y2="32" stroke="#36542c" strokeWidth="1.2" />
          <line x1="20" y1="39" x2="31" y2="37" stroke="#36542c" strokeWidth="1.0" />
        </svg>
      )}
      {type === 'speed' && (
        <div style={styles.speedIcon}>
          <span style={styles.speedLine1} />
          <span style={styles.speedLine2} />
          <span style={styles.speedLine3} />
        </div>
      )}
      {type === 'health' && (
        <div style={styles.healthIcon}>
          <span style={styles.healthH} />
          <span style={styles.healthV} />
        </div>
      )}
        </span>
      )}
    </div>
  )
}

export default function HUD({
  onOpenCoinShop,
  onGoToTitle,
  onGoToLobby,
  onGoToRanking,
  onOpenMissionCenter,
  onOpenWeaponEncyclopedia,
  devCheatsVisible = false,
  showGameoverResultImmediately = false,
}) {
  const t = useT()
  // 과학적 기수법 설정을 구독한다 - 토글하면 즉시 표기가 바뀐다.
  const gameNumber = useGameNumber()
  const authUser = useAuthStore((state) => state.user)
  const devToolsVisible = DEV_CHEATS_ENABLED && devCheatsVisible
  const showMasterRoleBadge = isProjectMaster(authUser)
  const questBagButtonRef = useRef(null)
  const questCloseButtonRef = useRef(null)
  const wasQuestInventoryOpenRef = useRef(false)
  const {
    player, weapons, phase, pauseSource,
    elapsed, currentStageId, bossSpawned, bossSpawnSec,
    goldSession, goldTotal, recentMilestone,
    newlyUnlockedWeaponIds, levelUpChoiceSerial, levelUpAcquireExposureKeys, levelUpWeaponCycleIds, pendingGuaranteedUpgradeChoiceKeys, pendingWeaponReplacement,
    escapePortalActive, matildaSpawned, deathCause, bossBonus,
    studentDialogue, introDialogue,
    questProgress, questToast, newQuestItemIds, bossPassiveUnlocks,
    clearMilestone, applyUpgrade, recordLevelupAcquireExposure, recordLevelupWeaponCycle, consumeGuaranteedUpgradeChoices, discardUnavailableGuaranteedUpgradeChoices,
    confirmWeaponReplacement, cancelWeaponReplacement, discardPendingWeapon,
    cheatAcquireWeapon, resumeFromLevelup,
    resetGame, togglePause, resumeGame, quitPausedRun, spawnMatilda,
    closeStudentDialogue, advanceIntro, toggleQuestInventory, closeQuestInventory,
    clearQuestToast, markQuestInventorySeen,
    missionProgress,
  } = useGameStore(useShallow((s) => ({
    player:               s.player,
    weapons:              s.weapons,
    phase:                s.phase,
    pauseSource:          s.pauseSource,
    elapsed:              s.elapsedMs,
    currentStageId:       s.currentStageId,
    bossSpawned:          s.bossSpawned,
    bossSpawnSec:         s.bossSpawnSec,
    goldSession:          s.goldSession,
    goldTotal:            s.goldTotal,
    recentMilestone:      s.recentMilestone,
    newlyUnlockedWeaponIds: s.newlyUnlockedWeaponIds,
    levelUpChoiceSerial:  s.levelUpChoiceSerial,
    levelUpAcquireExposureKeys: s.levelUpAcquireExposureKeys,
    levelUpWeaponCycleIds: s.levelUpWeaponCycleIds,
    pendingGuaranteedUpgradeChoiceKeys: s.pendingGuaranteedUpgradeChoiceKeys,
    pendingWeaponReplacement: s.pendingWeaponReplacement,
    escapePortalActive:   s.escapePortalActive,
    matildaSpawned:       s.matildaSpawned,
    deathCause:           s.deathCause,
    bossBonus:            s.bossBonus,
    studentDialogue:      s.studentDialogue,
    introDialogue:        s.introDialogue,
    questProgress:        s.questProgress,
    questToast:           s.questToast,
    newQuestItemIds:      s.newQuestItemIds,
    bossPassiveUnlocks:   s.bossPassiveUnlocks,
    clearMilestone:       s.clearMilestone,
    applyUpgrade:         s.applyUpgrade,
    recordLevelupAcquireExposure: s.recordLevelupAcquireExposure,
    recordLevelupWeaponCycle: s.recordLevelupWeaponCycle,
    consumeGuaranteedUpgradeChoices: s.consumeGuaranteedUpgradeChoices,
    discardUnavailableGuaranteedUpgradeChoices: s.discardUnavailableGuaranteedUpgradeChoices,
    confirmWeaponReplacement: s.confirmWeaponReplacement,
    cancelWeaponReplacement: s.cancelWeaponReplacement,
    discardPendingWeapon: s.discardPendingWeapon,
    cheatAcquireWeapon:   s.cheatAcquireWeapon,
    resumeFromLevelup:    s.resumeFromLevelup,
    resetGame:            s.resetGame,
    togglePause:          s.togglePause,
    resumeGame:           s.resumeGame,
    quitPausedRun:        s.quitPausedRun,
    spawnMatilda:         s.spawnMatilda,
    closeStudentDialogue: s.closeStudentDialogue,
    advanceIntro:         s.advanceIntro,
    toggleQuestInventory: s.toggleQuestInventory,
    closeQuestInventory:  s.closeQuestInventory,
    clearQuestToast:      s.clearQuestToast,
    markQuestInventorySeen: s.markQuestInventorySeen,
    missionProgress: s.missionProgress,
  })))

  // 무한 모드는 런 길이에 상한이 없다. mm:ss 고정 표기는 100시간을 '6000:00'으로 뭉개
  // 몇 시간째인지 못 읽게 만든다 - 한 시간을 넘기면 h:mm:ss로 자란다.
  const runClock = formatRunClock(elapsed)
  // 실시간 점수. 탈출구가 열린 뒤 "더 버틸까 / 지금 나갈까"를 저울질하려면 지금 점수가 보여야 한다.
  // 점수식은 복제하지 않고 랭킹과 같은 getRankingScore를 쓴다. 런 중에는 아직 미클리어다.
  const liveScore = getRankingScore({
    stageId: currentStageId,
    survivalSeconds: Math.floor(elapsed / 1000),
    cleared: false,
  })
  const stageConfig = getStageConfig(currentStageId)
  const nextStageId = getNextStageId(currentStageId)
  const showResultDevTools = devToolsVisible && getAdminOperationsConfig().cheatMenuButtonVisible && (phase === 'gameover' || phase === 'cleared')
  const questInventoryOpen = phase === 'paused' && pauseSource === 'quest'
  const stageQuests = useMemo(() => getStageQuestDefinitions(currentStageId), [currentStageId])
  const bossPassiveSlots = useMemo(() => {
    const passiveItems = Object.values(BOSS_PASSIVE_ITEMS)
    return Array.from({ length: BOSS_PASSIVE_ITEM_UI_CAPACITY }, (_, index) => {
      const item = passiveItems[index]
      return item && isBossPassiveItemUnlocked(bossPassiveUnlocks, item.id)
        ? { ...item, icon: BOSS_PASSIVE_ITEM_ICONS[item.id] ?? '◆' }
        : null
    })
  }, [bossPassiveUnlocks])
  const visibleQuests = useMemo(
    () => stageQuests.filter((quest) => ['active', 'item-acquired', 'completed'].includes(questProgress?.[quest.id]?.status)).slice(0, 2),
    [questProgress, stageQuests],
  )
  const activeQuestCount = useMemo(
    () => stageQuests.filter((quest) => ['active', 'item-acquired'].includes(questProgress?.[quest.id]?.status)).length,
    [questProgress, stageQuests],
  )
  const heldQuestItems = useMemo(
    () => stageQuests.filter((quest) => {
      const progress = questProgress?.[quest.id]
      return progress?.itemHeld || progress?.status === 'item-acquired'
    }),
    [questProgress, stageQuests],
  )
  const questToastMessage = useMemo(() => {
    if (!questToast) return null
    if (typeof questToast === 'string') return questToast
    const quest = getQuestDefinition(questToast.questId)
    if (!quest) return null
    const title = translate(`quest.${quest.id}.title`, null, quest.title)
    if (questToast.type === 'item') {
      const item = translate(`quest.${quest.id}.itemName`, null, quest.item.name)
      return translate('hud.questToastItem', { item })
    }
    if (questToast.type === 'completed') return translate('hud.questToastDone', { title, gold: quest.rewardGold })
    return translate('hud.questToastStart', { title })
  }, [questToast])
  const questStarted = typeof questToast === 'object' && questToast?.type === 'started'
  const questItemReceived = typeof questToast === 'object' && questToast?.type === 'item'
  const questCompleted = typeof questToast === 'object' && questToast?.type === 'completed'
  const questToastQuest = useMemo(() => {
    if (typeof questToast !== 'object' || !questToast?.questId) return null
    return getQuestDefinition(questToast.questId)
  }, [questToast])
  const questPopupNextAction = useMemo(() => {
    if (!questToastQuest) return null
    if (questStarted) {
      return translate('hud.questToastNextObjective', {
        objective: translate(`quest.${questToastQuest.id}.objective`, null, questToastQuest.objective),
      })
    }
    if (questCompleted) {
      return translate('hud.questToastRewardReceived', { gold: questToastQuest.rewardGold })
    }
    if (!questItemReceived) return null
    const isInstall = questToastQuest.completion.kind === 'install'
    const targetKey = isInstall ? 'target' : 'giver'
    const target = translate(`quest.${questToastQuest.id}.${targetKey}`, null, questToastQuest.completion.name)
    const actionKey = isInstall
      ? 'hud.questToastNextInstall'
      : 'hud.questToastNextReturn'
    return translate(actionKey, { target })
  }, [questCompleted, questItemReceived, questStarted, questToastQuest])
  const questDialoguePopup = Boolean(
    studentDialogue
    && studentDialogue.subjectType === 'quest'
    && questToastQuest
    && (
      (questStarted && studentDialogue.dialogueId === questToastQuest.startDialogueId)
      || (questCompleted && studentDialogue.dialogueId === questToastQuest.completionDialogueId)
    )
  )
  const activeWeapons = useMemo(
    () => Object.entries(weapons).filter(([, w]) => w.active),
    [weapons],
  )
  const missionSummary = useMemo(() => {
    const statuses = Object.values(MISSION_BY_ID).map((mission) => ({ mission, ...getMissionStatus(missionProgress, mission) }))
    const completed = statuses.filter((entry) => entry.state === 'completed_unclaimed')
    const progressed = statuses.filter((entry) => entry.counter > 0 && entry.state === 'active')
    return { completed, progressed }
  }, [missionProgress])

  // phase가 'levelup'으로 바뀌는 순간 한 번만 선택지를 고정한다.
  // 보장/노출 ledger는 표시 직후 effect에서 바뀌므로, 같은 화면의 카드가 바뀌지 않게 의존성에서 제외한다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const levelupSelection = useMemo(
    () => phase === 'levelup'
      ? pickFour(
        player.level,
        weapons,
        player,
        pendingGuaranteedUpgradeChoiceKeys,
        levelUpAcquireExposureKeys,
        levelUpWeaponCycleIds,
        getAccountUnlockableWeaponIds().filter((weaponId) => isWeaponUnlocked(weaponId)),
      )
      : { choices: [], nextExposedAcquireKeys: [], nextWeaponCycleIds: [], displayedGuaranteedKeys: [] },
    [phase, player.level, weapons, levelUpChoiceSerial],
  )
  const { choices, nextExposedAcquireKeys, nextWeaponCycleIds, displayedGuaranteedKeys } = levelupSelection
  useEffect(() => {
    if (phase !== 'levelup') return
    recordLevelupAcquireExposure(nextExposedAcquireKeys, levelUpChoiceSerial)
    recordLevelupWeaponCycle(nextWeaponCycleIds, levelUpChoiceSerial)
    if (displayedGuaranteedKeys.length > 0) {
      consumeGuaranteedUpgradeChoices(displayedGuaranteedKeys, levelUpChoiceSerial)
      return
    }
    const permanentlyUnavailable = pendingGuaranteedUpgradeChoiceKeys
      .filter((key) => isGuaranteedFollowupPermanentlyUnavailable(key, weapons))
    if (permanentlyUnavailable.length > 0) {
      discardUnavailableGuaranteedUpgradeChoices(permanentlyUnavailable, levelUpChoiceSerial)
    }
  }, [
    choices,
    consumeGuaranteedUpgradeChoices,
    discardUnavailableGuaranteedUpgradeChoices,
    displayedGuaranteedKeys,
    levelUpChoiceSerial,
    nextExposedAcquireKeys,
    nextWeaponCycleIds,
    pendingGuaranteedUpgradeChoiceKeys,
    phase,
    recordLevelupAcquireExposure,
    recordLevelupWeaponCycle,
    weapons,
  ])
  const [levelupChoicesReadySerial, setLevelupChoicesReadySerial] = useState(null)
  const levelupChoicesReady = phase === 'levelup' && levelupChoicesReadySerial === levelUpChoiceSerial
  const handleLevelupChoiceAnimationEnd = (event, index) => {
    if (index !== choices.length - 1) return
    if (event.target !== event.currentTarget) return
    const animationName = event.animationName ?? event.nativeEvent?.animationName
    if (animationName !== 'levelupCardPop') return
    setLevelupChoicesReadySerial(levelUpChoiceSerial)
  }
  const lowHp   = player.hp / player.maxHp < 0.3
  const isGameover = phase === 'gameover'
  const isMatildaGameover = isGameover && deathCause === 'matilda'
  const [gameoverModalReady, setGameoverModalReady] = useState(
    () => showGameoverResultImmediately && isGameover,
  )
  const immediateGameoverConsumedRef = useRef(false)
  const immediateGameoverMountRef = useRef(showGameoverResultImmediately && isGameover)
  const [isTitleReturnConfirmOpen, setIsTitleReturnConfirmOpen] = useState(false)
  const [weaponCheatOpen, setWeaponCheatOpen] = useState(false)
  const [matildaDialogueVisible, setMatildaDialogueVisible] = useState(false)
  // 'idle' → 'impact'(충돌 프레임 노출) → 'shake'(효과음+흔들림) → 'grayscale'(흑백)
  const [matildaDeathStage, setMatildaDeathStage] = useState('idle')
  const [portalObjective, setPortalObjective] = useState(null)
  const previousMatildaSpawnedRef = useRef(matildaSpawned)
  const weaponCheatItems = useMemo(
    () => Object.entries(WEAPON_CATALOG).map(([id, entry]) => ({ id, label: entry.label, icon: WEAPON_KEY_TO_ICON[id] })),
    [],
  )

  // 종료 화면 "다음 해금 가능 무기" 미리보기 — minLevel이 가장 낮은 미해금 무기 1개.
  const nextUnlock = useMemo(() => getNextUnlockPreview(phase, weapons), [phase, weapons])

  // 플레이테스트 로그 복사는 개발용 치트 도구다. 결과 CTA와 섞지 않는다.
  const [copyStatus, setCopyStatus] = useState('idle')
  const copyPlaytestLog = async () => {
    try {
      const summary = buildPlaytestSummary()
      await navigator.clipboard.writeText(JSON.stringify(summary, null, 2))
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }
  const resultDevTools = showResultDevTools ? (
    <div data-testid="result-dev-tools" style={styles.resultDevTools}>
      <button type="button" style={styles.devCopyBtn} onClick={copyPlaytestLog}>
        {copyStatus === 'copied' ? translate('hud.copyLogDone') : copyStatus === 'error' ? translate('hud.copyLogFail') : translate('hud.copyLog')}
      </button>
    </div>
  ) : null

  const bossWarning = useMemo(() => {
    if (bossSpawned || phase !== 'playing') return null
    const elapsedSec = elapsed / 1000
    // 보스 등장은 스폰 시계(캐치업 오프셋만큼 앞당겨진 시각)에서 발화한다.
    // 경고도 같은 만큼 당겨야 "3초 전 카운트다운"이 실제 등장과 어긋나지 않는다.
    const tableWarningSec = bossSpawnSec ?? stageConfig.bossWarningSec ?? 180
    const warningSec = tableWarningSec - getSpawnCatchUpOffsetSec()
    if (elapsedSec < warningSec - BOSS_TELEGRAPH_LEAD_SEC || elapsedSec >= warningSec) return null
    return Math.max(1, Math.ceil(warningSec - elapsedSec))
  }, [bossSpawnSec, bossSpawned, elapsed, phase, stageConfig.bossWarningSec])

  // stage2/stage4는 e04IntroSec가 E04 실발사 게이트와 일치하므로 허위 경고가 아니다.
  // stage3은 e04IntroSec(34)이 HUD 힌트용이라 실발사(72)와 어긋나 여기서 제외한다.
  const e04IntroWarning = useMemo(() => {
    if ((currentStageId !== 'stage2' && currentStageId !== 'stage4') || phase !== 'playing') return null
    const introSec = stageConfig.e04IntroSec ?? 90
    const elapsedSec = elapsed / 1000
    if (elapsedSec < introSec - 3 || elapsedSec >= introSec) return null
    return Math.max(1, Math.ceil(introSec - elapsedSec))
  }, [currentStageId, elapsed, phase, stageConfig.e04IntroSec])

  // 대형(형태) 버스트 스폰 예고 배너 라벨. stage2는 현재 빈 정본([]),
  // stage3는 개방 아레나 포위 편대(STAGE3_SPAWN_TELEGRAPHS),
  // stage4는 급식실 편대(STAGE4_SPAWN_TELEGRAPHS)를 예고한다.
  const formationWarning = useMemo(() => {
    if (phase !== 'playing') return null
    const telegraphs = currentStageId === 'stage4'
      ? (STAGE4_SPAWN_TELEGRAPHS ?? [])
      : currentStageId === 'stage3'
        ? (STAGE3_SPAWN_TELEGRAPHS ?? [])
        : currentStageId === 'stage2'
          ? (STAGE2_SPAWN_TELEGRAPHS ?? [])
          : []
    if (telegraphs.length === 0) return null
    const elapsedSec = elapsed / 1000
    const hit = telegraphs.find(
      (t) => elapsedSec >= t.sec - t.leadSec && elapsedSec < t.sec,
    )
    return hit ? hit.label : null
  }, [currentStageId, elapsed, phase])

  // 마틸다 등장 전 카운트다운
  const matildaWarning = useMemo(() => {
    if (phase !== 'playing') return null
    const elapsedSec = elapsed / 1000
    const spawnSec = stageConfig.matildaSec ?? 420
    const warnSec = Math.max(0, spawnSec - MATILDA_COUNTDOWN_SECONDS)
    if (elapsedSec < warnSec || elapsedSec >= spawnSec) return null
    return Math.max(1, Math.ceil(spawnSec - elapsedSec))
  }, [elapsed, phase, stageConfig.matildaSec])

  // 보스/마틸다 경고 카운트가 바뀔 때마다 틱 사운드 1회
  useEffect(() => { if (bossWarning != null) emitSfx({ id: 'bossWarning', volume: 0.5 }) }, [bossWarning])
  useEffect(() => {
    if (matildaWarning == null) return
    emitSfx({ id: matildaWarning === 1 ? 'matildaCountdownEnd' : 'matildaWarningTick', volume: 0.7 })
  }, [matildaWarning])
  // 대형 스폰 예고 라벨이 새로 뜰 때(null→label 또는 label 변경) 경고음 1회
  useEffect(() => {
    if (formationWarning == null) return
    emitSfx({ id: 'bossWarning', volume: 0.6 })
  }, [formationWarning])

  // 탈출구 등장 알림: 등장 직후 3초간 표시
  const portalFlash = useMemo(() => {
    if (!escapePortalActive || phase !== 'playing') return false
    const portalMs = (stageConfig.escapePortalSec ?? 240) * 1000
    return elapsed < portalMs + 3000
  }, [escapePortalActive, elapsed, phase, stageConfig.escapePortalSec])

  useEffect(() => {
    if (!escapePortalActive || phase !== 'playing') {
      setPortalObjective(null)
      return undefined
    }

    const refreshPortalObjective = () => setPortalObjective(getPortalObjective(playerPos, portalTarget))
    refreshPortalObjective()
    const interval = setInterval(refreshPortalObjective, 250)
    return () => clearInterval(interval)
  }, [escapePortalActive, phase])

  useEffect(() => {
    if (!recentMilestone) return undefined
    const timer = setTimeout(clearMilestone, 2000)
    return () => clearTimeout(timer)
  }, [clearMilestone, recentMilestone])

  useEffect(() => {
    if (!isGameover) {
      setGameoverModalReady(false)
      immediateGameoverConsumedRef.current = showGameoverResultImmediately
      immediateGameoverMountRef.current = false
      return undefined
    }

    if (showGameoverResultImmediately && !immediateGameoverConsumedRef.current) {
      immediateGameoverConsumedRef.current = true
      setGameoverModalReady(true)
      return undefined
    }

    if (showGameoverResultImmediately && immediateGameoverMountRef.current) return undefined

    // 마틸다 사망도 다른 사망과 같은 대기시간을 쓴다. 예전에는 MATILDA_DIALOGUE_MS(5000)를
    // 더해 결과창이 6초 뒤에야 떴다 — 즉사인데 화면이 6초간 멈춘 것처럼 보였다.
    // 마틸다 대사는 흑백 페이드 동안 그대로 나온다(showMatildaDialogue). 2026-08-14 사용자 지시.
    setGameoverModalReady(false)
    const timer = setTimeout(() => setGameoverModalReady(true), GAMEOVER_TRANSITION_MS)
    return () => clearTimeout(timer)
  }, [isGameover, isMatildaGameover, showGameoverResultImmediately])

  // 마틸다 접촉 사망 연출: 정지(충돌 프레임 노출) → 효과음 → 흑백.
  // 즉사 판정 자체는 접촉 프레임에 이미 끝났고(store가 phase를 gameover로 바꾼 뒤),
  // 여기서는 그 뒤에 붙는 연출 순서만 잡는다.
  useEffect(() => {
    if (!isMatildaGameover || showGameoverResultImmediately) {
      setMatildaDeathStage('idle')
      return undefined
    }

    setMatildaDeathStage('impact')
    const impactTimer = setTimeout(() => {
      setMatildaDeathStage('sting')
      emitSfx(MATILDA_DEATH_IMPACT_SFX)
      // 크리티컬 히트와 똑같은 흔들림(strong 아님 = 90ms, 일반 크리 진폭)을 쓴다.
      // 접근성 설정(reducedEffects / prefers-reduced-motion / 히트 카메라 흔들림 끔)
      // 에서는 내보내지 않는다 — 전체화면 구독자(GameplayScreen)는 자체 게이트가 없다.
      if (!isCriticalScreenShakeReduced()) emitCriticalHitScreenShake(0, 0)
    }, MATILDA_DEATH_IMPACT_HOLD_MS)
    const grayscaleTimer = setTimeout(
      () => setMatildaDeathStage('grayscale'),
      MATILDA_DEATH_GRAYSCALE_DELAY_MS,
    )

    return () => {
      clearTimeout(impactTimer)
      clearTimeout(grayscaleTimer)
    }
  }, [isMatildaGameover, showGameoverResultImmediately])

  useEffect(() => {
    if (phase !== 'paused') setIsTitleReturnConfirmOpen(false)
  }, [phase])

  useEffect(() => {
    if (!matildaSpawned) {
      previousMatildaSpawnedRef.current = false
      setMatildaDialogueVisible(false)
      return undefined
    }

    if (previousMatildaSpawnedRef.current) return undefined

    previousMatildaSpawnedRef.current = true
    setMatildaDialogueVisible(true)
    const timer = setTimeout(() => setMatildaDialogueVisible(false), MATILDA_DIALOGUE_MS)
    return () => clearTimeout(timer)
  }, [matildaSpawned])

  useEffect(() => {
    if (!introDialogue) {
      stopDialogueVoice()
      return undefined
    }
    const line = introLine(introDialogue.index)
    playDialogueVoice(line, 'protagonistIntro', { volume: 1 })
    return () => stopDialogueVoice()
  }, [introDialogue])

  const showMatildaDialogue = matildaDialogueVisible || (isMatildaGameover && !gameoverModalReady)
  const matildaDialogueLine = getDialogueText(isMatildaGameover ? 'matilda.death' : 'matilda.entry')

  useEffect(() => {
    if (!showMatildaDialogue) return undefined
    const stop = playDialogueVoice(matildaDialogueLine, 'matilda', { delayMs: 180, volume: 0.92 })
    return () => stop()
  }, [matildaDialogueLine, showMatildaDialogue])

  const confirmLobbyReturn = () => {
    if (!quitPausedRun()) return
    if (onGoToLobby) onGoToLobby()
    else onGoToTitle?.()
  }

  const handleCheatAcquireWeapon = (id) => {
    if (cheatAcquireWeapon(id)) emitSfx({ id: 'buttonClick' })
  }

  // CSS 키프레임 주입. 최초 1회만 추가한다.
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'hud-keyframes'
    style.textContent = `
      @keyframes hpBlink { 0%,100%{opacity:1} 50%{opacity:0.25} }
      @keyframes vignettePulse { 0%,100%{opacity:0.40} 50%{opacity:0.65} }
      @keyframes milestonePop { 0%{transform:translate(-50%,-8px);opacity:0} 16%,82%{transform:translate(-50%,0);opacity:1} 100%{transform:translate(-50%,-8px);opacity:0} }
      @keyframes bossPulse { 0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.95} 50%{transform:translate(-50%,-50%) scale(1.06);opacity:1} }
      @keyframes gameoverGrayscaleFade {
        0%{opacity:0;backdrop-filter:grayscale(0);-webkit-backdrop-filter:grayscale(0)}
        100%{opacity:1;backdrop-filter:grayscale(1);-webkit-backdrop-filter:grayscale(1)}
      }
      @keyframes studentDialoguePop { 0%{transform:scale(0);opacity:0.4} 70%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
      @keyframes matildaDialoguePop { 0%{transform:translateX(-50%) scale(0.92);opacity:0.4} 70%{transform:translateX(-50%) scale(1.03)} 100%{transform:translateX(-50%) scale(1);opacity:1} }
      @keyframes levelupCardPop { 0%{opacity:0;transform:translateY(14px) scale(0.92)} 100%{opacity:1;transform:translateY(0) scale(1)} }
      .hud-pause-button:focus-visible,
      .hud-quest-bag-button:focus-visible,
      .levelup-upgrade-choice:focus-visible { outline:3px solid #fff8e8; outline-offset:3px; }
      @media (max-width:360px) {
        .levelup-upgrade-choice { min-height:126px !important; padding:7px 4px 8px !important; gap:3px !important; }
        .levelup-upgrade-choice .levelup-choice-label { font-size:12px !important; line-height:1.12 !important; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
        .levelup-upgrade-choice .levelup-choice-desc { font-size:11px !important; line-height:1.2 !important; }
      }
      @media (max-width:600px) {
        .quest-inventory-panel { top:auto !important; bottom:12px; left:12px !important; width:calc(100% - 24px) !important; max-height:72dvh !important; }
      }
    `
    // StrictMode에서 cleanup이 먼저 실행돼 style이 제거될 수 있으므로
    // 항상 교체(remove → append) 방식으로 주입한다.
    document.getElementById('hud-keyframes')?.remove()
    document.head.appendChild(style)
    return () => { if (document.getElementById('hud-keyframes') === style) style.remove() }
  }, [])

  useEffect(() => {
    if (questInventoryOpen) {
      markQuestInventorySeen()
      questCloseButtonRef.current?.focus()
    } else if (wasQuestInventoryOpenRef.current) {
      questBagButtonRef.current?.focus()
    }
    wasQuestInventoryOpenRef.current = questInventoryOpen
  }, [markQuestInventorySeen, questInventoryOpen])

  useEffect(() => {
    if (!questToast || questDialoguePopup) return undefined
    const timer = setTimeout(clearQuestToast, 2000)
    return () => clearTimeout(timer)
  }, [clearQuestToast, questDialoguePopup, questToast])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && questInventoryOpen) {
        closeQuestInventory()
        return
      }
      if ((event.code !== 'KeyP' && event.key !== 'Escape') || event.repeat) return
      togglePause()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeQuestInventory, questInventoryOpen, togglePause])

  return (
    <div style={styles.root}>
      {/* 저체력 비네트 */}
      {lowHp && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(200,0,0,0.55) 100%)',
          animation: 'vignettePulse 0.8s ease-in-out infinite',
        }} />
      )}
      {recentMilestone && (
        <div style={styles.milestoneToast}>
          <span style={styles.milestoneLabel}>{milestoneLabel(recentMilestone.label)}</span>
          <span style={styles.milestoneGold}>{t('hud.milestoneGold', { gold: recentMilestone.gold })}</span>
        </div>
      )}
      {bossWarning != null && (
        <div style={styles.bossWarning}>
          <div style={styles.bossWarningLabel}>{t('hud.bossWarning')}</div>
          <div style={styles.bossWarningCount}>{bossWarning}</div>
        </div>
      )}
      {e04IntroWarning != null && (
        <div style={styles.projectileWarning}>
          <div style={styles.projectileWarningLabel}>{t('hud.projectileWarning')}</div>
          <div style={styles.projectileWarningCount}>{e04IntroWarning}</div>
        </div>
      )}
      {matildaWarning != null && (
        <div data-testid="matilda-warning" style={styles.matildaWarning}>
          <div style={styles.matildaWarningLabel}>{t('hud.matildaWarning')}</div>
          <div data-testid="matilda-warning-count" style={styles.matildaWarningCount}>{matildaWarning}</div>
        </div>
      )}
      {showMatildaDialogue && (
        <div
          data-testid="matilda-dialogue"
          style={styles.matildaDialogueBox}
          role="dialog"
          aria-label={t('hud.matildaDialogueAria')}
          aria-live="assertive"
        >
          <div style={styles.matildaDialoguePortraitFrame}>
            <img
              src={matildaConversationPortraitSrc}
              alt={t('hud.matildaPortraitAlt')}
              draggable={false}
              style={styles.matildaDialoguePortrait}
            />
          </div>
          <div style={styles.matildaDialogueTextCol}>
            <div style={styles.matildaDialogueName}>{t('hud.matildaName', null, MATILDA_DIALOGUE_NAME)}</div>
            <div style={styles.matildaDialogueLine}>{matildaDialogueLine}</div>
          </div>
        </div>
      )}
      {formationWarning != null && (
        <div style={styles.formationWarning} role="alert" aria-live="assertive">
          <div style={styles.formationWarningLabel}>⚠ {formationWarning}</div>
        </div>
      )}
      {portalFlash && (
        <div style={styles.portalFlash}>
          {t('hud.portalAppeared')}
        </div>
      )}
      {portalObjective && (
        <>
          <div data-testid="portal-objective" style={styles.portalObjective} aria-hidden="true">
            {t('hud.portalDistance', { arrow: portalObjective.arrow, distance: portalObjective.distanceZm })}
          </div>
          <div role="status" aria-label={t('hud.portalMoveAria')} style={styles.screenReaderOnly}>{t('hud.portalMoveAria')}</div>
        </>
      )}
      {/* Top bar — 스테이지 번호 + 시간만 한 줄 */}
      <div style={styles.topBar}>
        <span style={styles.stageChip}>{stageConfig.label}</span>
        <span style={styles.timer}>{runClock}</span>
      </div>

      {/* 좌하단 실시간 점수 */}
      <div style={styles.liveScore} aria-label={t('hud.scoreAria', { score: liveScore })} role="status">
        <span style={styles.liveScoreLabel}>{t('hud.score')}</span>
        <span style={styles.liveScoreValue}>{gameNumber(liveScore)}</span>
      </div>

      {/* HP bar */}
      <div style={styles.hpRow}>
        <span style={styles.hpLabel}>HP</span>
        <div style={styles.barBg}>
          <div style={{
            ...styles.barFill,
            width: `${(player.hp / player.maxHp) * 100}%`,
            background: lowHp ? '#ff2030' : '#e03040',
            animation: lowHp ? 'hpBlink 0.6s ease-in-out infinite' : 'none',
          }} />
        </div>
        <span style={styles.hpNum}>{player.hp}/{player.maxHp}</span>
      </div>

      {/* XP bar — 화면 최상단 전체 폭 얇은 스트립 */}
      <div data-testid="player-xp-bar" style={styles.xpRow}>
        <div style={{ ...styles.xpFill, width: `${(player.xp / player.xpToNext) * 100}%` }} />
      </div>

      {/* Active weapon icons — HP바 위 가로 나열 */}
      <div style={styles.weaponIconBar}>
        {activeWeapons.map(([k]) => {
          const src = getWeaponUpgradeIconSrc(WEAPON_KEY_TO_ICON[k])
          if (!src) return null
          return <WeaponMiniIcon key={k} src={src} />
        })}
      </div>

      {/* Modals */}
      <div data-testid="gold-chip" style={styles.goldChip}>
        <span style={styles.goldDot} />
        <span data-testid="player-level-label" aria-label={`Lv.${player.level}`} style={styles.playerLevelLabel}>Lv.{player.level}</span>
        <span data-testid="gold-amount" style={styles.goldNum}>{goldSession}</span>
      </div>

      {(phase === 'playing' || (phase === 'paused' && pauseSource !== 'dialogue' && pauseSource !== 'intro')) && (
        <>
          <div data-testid="top-left-controls" style={styles.topLeftControls}>
            {phase === 'playing' && showMasterRoleBadge && <span style={styles.masterRoleBadge}>{t('account.master')}</span>}
            <button
              type="button"
              className="hud-quest-bag-button"
              aria-label={questInventoryOpen ? t('hud.questBagCloseAria') : t('hud.questBagOpenAria')}
              aria-expanded={questInventoryOpen}
              aria-controls="quest-inventory-panel"
              ref={questBagButtonRef}
              style={styles.questBagButton}
              onClick={() => { emitSfx({ id: 'buttonClick' }); toggleQuestInventory() }}
            >
              <QuestBagIcon />
              {newQuestItemIds?.length > 0 && <span aria-label={t('hud.newQuestItemAria')} style={styles.questNewBadge}>!</span>}
            </button>
            {devToolsVisible && (
              <>
                <button type="button" style={styles.quickRestartButton} onClick={() => resetGame(currentStageId)} aria-label="Restart" title="Restart">
                  R
                </button>
                <button type="button" style={styles.matildaBtn} onClick={() => { joystickDir.x = 0; joystickDir.z = 0; joystickDir.active = false; spawnMatilda() }} title={t('hud.summonMatilda')}>
                  M
                </button>
                <button type="button" style={styles.weaponCheatToggleBtn} onClick={() => setWeaponCheatOpen((open) => !open)} aria-label={t('hud.weaponCheat')} title={t('hud.weaponCheat')}>
                  W
                </button>
                <button type="button" style={styles.weaponCheatToggleBtn} onClick={() => { emitSfx({ id: 'buttonClick' }); dispatchStarlinkCheatCrash() }} aria-label={t('hud.starlinkCheatAria')} title={t('hud.starlinkCheatTitle')}>
                  S
                </button>
                <button type="button" style={styles.weaponCheatToggleBtn} onClick={() => { summonCoinJingleZombieCheat() }} aria-label="동전 짤랑 좀비 소환" title="동전 짤랑 좀비 소환">
                  C
                </button>
              </>
            )}
          </div>
          <button data-testid="bottom-right-pause" type="button" className="hud-pause-button" aria-label={phase === 'paused' ? t('hud.resumeAria') : t('hud.pauseAria')} style={styles.pauseButton} onClick={() => { emitSfx({ id: 'buttonClick' }); togglePause() }}>
            {phase === 'paused' ? '▶' : 'Ⅱ'}
          </button>
        </>
      )}

      <MissionTracker
        missionProgress={missionProgress}
        hidden={phase !== 'playing' || bossWarning != null || e04IntroWarning != null || matildaWarning != null || formationWarning != null || questInventoryOpen}
      />

      {devToolsVisible && weaponCheatOpen && (phase === 'playing' || phase === 'paused') && (
        <div data-testid="weapon-cheat-panel" style={styles.weaponCheatPanel}>
          <div style={styles.weaponCheatTitle}>{t('hud.allWeapons')}</div>
          <div style={styles.weaponCheatGrid}>
            {weaponCheatItems.map(({ id, label, icon }) => {
              const active = !!weapons[id]?.active
              return (
                <button
                  key={id}
                  type="button"
                  style={{ ...styles.weaponCheatItem, opacity: active ? 0.58 : 1 }}
                  onClick={() => handleCheatAcquireWeapon(id)}
                  disabled={active}
                >
                  <UpgradeIcon type={icon} />
                  <span style={styles.weaponCheatLabel}>{weaponLabel(id, label)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {phase === 'levelup' && (
        <div data-testid="levelup-upgrade-overlay" style={styles.levelupOverlay}>
          <div data-testid="levelup-upgrade-panel" style={styles.levelupPanel}>
            <h2 style={styles.levelupTitle}>{t('hud.levelUp', { level: player.level })}</h2>
            <div data-testid="levelup-upgrade-choices" style={styles.levelupChoices}>
              {choices.map((c, i) => (
                <button
                  key={`${levelUpChoiceSerial}-${c.key}`}
                  data-testid="levelup-upgrade-choice"
                  className="levelup-upgrade-choice"
                  aria-label={`${getUpgradeChoiceLabel(c, weapons)}: ${getUpgradeChoiceDesc(c) ?? ''}`}
                  style={{
                    ...styles.levelupChoiceBtn,
                    animation: 'levelupCardPop 0.15s ease-out both',
                    animationDelay: `${i * 90}ms`,
                  }}
                  onClick={() => {
                    if (levelupChoicesReady) applyUpgrade(c.key)
                  }}
                  onAnimationEnd={(event) => handleLevelupChoiceAnimationEnd(event, i)}
                  disabled={!levelupChoicesReady || !!pendingWeaponReplacement}
                >
                  <UpgradeIcon type={c.icon} />
                  <div className="levelup-choice-label" style={styles.choiceLabel}>{getUpgradeChoiceLabel(c, weapons)}</div>
                  <div className="levelup-choice-desc" style={styles.choiceDesc}>{getUpgradeChoiceDesc(c)}</div>
                </button>
              ))}
            </div>
            {pendingWeaponReplacement && (
              <div data-testid="weapon-replacement-prompt">
              <div data-testid="weapon-replacement-dialog" role="dialog" aria-modal="true" style={styles.levelupReplacementDialog}>
                <p style={styles.levelupReplacementTitle}>
                  무기 {activeWeapons.length}/{MAX_OWNED_WEAPONS} — {weaponLabel(
                    pendingWeaponReplacement.weaponId,
                    WEAPON_CATALOG[pendingWeaponReplacement.weaponId]?.label
                      ?? weapons[pendingWeaponReplacement.weaponId]?.label
                      ?? pendingWeaponReplacement.weaponId,
                  )}을(를) 얻으려면 현재 무기 하나를 교체해야 합니다.
                </p>
                <div style={styles.levelupReplacementOptions}>
                  {activeWeapons.map(([id, weapon]) => (
                    <button
                      key={id}
                      type="button"
                      data-testid={`weapon-replacement-discard-${id}`}
                      data-replacement-choice="true"
                      style={styles.levelupReplacementOption}
                      onClick={() => confirmWeaponReplacement(id)}
                    >
                      {weaponLabel(id, weapon.label ?? id)} 버리고 교체
                    </button>
                  ))}
                </div>
                <button type="button" data-testid="weapon-replacement-discard-new" style={styles.levelupReplacementCancel} onClick={discardPendingWeapon}>새 무기 버리기</button>
                <button type="button" data-testid="weapon-replacement-cancel" style={styles.levelupReplacementCancel} onClick={cancelWeaponReplacement}>취소</button>
              </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 마틸다 사망은 홀드 구간 동안 흑백 레이어를 아예 걸지 않는다. 부딪힌 프레임이
          컬러로 그대로 보여야 하기 때문이다. 'grayscale' 단계에서 페이드로 들어온다. */}
      {isGameover && (!isMatildaGameover || matildaDeathStage === 'grayscale') && (
        <div
          data-testid="gameover-grayscale-transition"
          aria-hidden="true"
          style={isMatildaGameover
            ? styles.matildaGameoverGrayscaleTransition
            : styles.gameoverGrayscaleTransition}
        />
      )}

      {isGameover && gameoverModalReady && (
        <div data-testid="gameover-result-overlay" style={styles.overlay}>
          <div style={styles.modal}>
            {/* 최종 점수 한 줄이 늘어난 만큼 제목 아래 여백을 줄여, 세로로 이미 긴 모달이
                작은 뷰포트에서 더 밀려나지 않게 한다(사망 대사 여백도 같이 맞춰 간격 유지). */}
            <h2 style={{ ...styles.modalTitle, color: '#ff4060', marginBottom: 14 }}>GAME OVER</h2>
            {isMatildaGameover && <p data-testid="gameover-death-line" style={styles.gameoverDeathLine}>{getDialogueText('matilda.gameover')}</p>}
            <p style={{ color: '#ccc', marginBottom: 2 }}>{t('hud.survivalTime', { time: runClock })}</p>
            {/* 결과창 점수는 랭킹에 실제로 올라가는 점수와 같아야 한다. 게임오버는 미클리어라
                랭킹 제출과 인자가 동일(stageId / floor(elapsedMs/1000) / cleared:false)한
                liveScore가 곧 최종 점수다 — 여기서 점수식을 다시 만들지 않는다. */}
            <p data-testid="gameover-final-score" style={styles.gameoverFinalScore}>{t('hud.finalScore', { score: gameNumber(liveScore) })}</p>
            <p style={{ color: '#ffd040', marginBottom: (newlyUnlockedWeaponIds?.length > 0) ? 12 : 20 }}>{t('hud.goldEarned', { session: goldSession, total: goldTotal })}</p>
            <MissionResultSummary summary={missionSummary} onOpenMissionCenter={onOpenMissionCenter} />
            {newlyUnlockedWeaponIds?.length > 0 && (
              <div style={styles.newlyUnlocked}>
                <span style={styles.newlyUnlockedLabel}>{t('hud.newWeaponUnlocked')}</span>
                {newlyUnlockedWeaponIds.map((id) => (
                  <div key={id} style={styles.newlyUnlockedItem}>
                    {weaponLabel(id, WEAPON_CATALOG[id]?.label ?? id)}
                  </div>
                ))}
                <div style={styles.newlyUnlockedHint}>{t('hud.newWeaponHint')}</div>
                {onOpenWeaponEncyclopedia && (
                  <button type="button" style={styles.weaponEncyclopediaBtn} onClick={() => onOpenWeaponEncyclopedia(newlyUnlockedWeaponIds[0])}>
                    {t('hud.weaponEncyclopedia', null, '무기 도감 보기')}
                  </button>
                )}
              </div>
            )}
            <div data-testid="result-primary-actions" style={styles.resultButtons}>
              <button style={{ ...styles.restartBtn, ...styles.resultActionBtn }} onClick={() => resetGame(currentStageId)}>{t('hud.restart')}</button>
              <button style={{ ...styles.titleBtn, ...styles.resultActionBtn }} onClick={onGoToTitle}>{t('hud.toTitle')}</button>
              <button style={{ ...styles.shopBtn, ...styles.resultActionBtn }} onClick={onOpenCoinShop}>{t('hud.coinShop')}</button>
              {onGoToRanking && <button style={{ ...styles.rankingBtn, ...styles.resultActionBtn }} onClick={onGoToRanking}>{t('hud.ranking')}</button>}
            </div>
          </div>
          {resultDevTools}
        </div>
      )}

      {questToastMessage && !questDialoguePopup && (
        <div
          role="status"
          aria-live={questStarted || questCompleted ? 'assertive' : 'polite'}
          data-testid={questStarted ? 'quest-start-popup' : questCompleted ? 'quest-complete-popup' : 'quest-toast'}
          style={{
            ...styles.questToast,
            ...(questStarted || questCompleted ? styles.questPopupCenter : null),
            ...(questItemReceived ? styles.questItemToastWide : null),
          }}
        >
          {questItemReceived && questToastQuest?.item
            ? <QuestItemPictureIcon visualKind={questToastQuest.item.visualKind} />
            : questCompleted && questToastQuest?.item
              ? <QuestItemPictureIcon visualKind={questToastQuest.item.visualKind} size={96} />
              : <QuestBagIcon size={questStarted || questCompleted ? 96 : 28} />}
          <span style={{ ...styles.questPopupText, ...(questStarted || questCompleted ? styles.questPopupCenterText : null), ...(questItemReceived ? styles.questItemToastText : null) }}>
            <strong>{questToastMessage}</strong>
            {questPopupNextAction && (
              <small style={{ ...styles.questPopupNextAction, ...(questItemReceived ? styles.questItemNextAction : null) }}>
                {questPopupNextAction}
              </small>
            )}
          </span>
        </div>
      )}

      {questInventoryOpen && (
        <aside id="quest-inventory-panel" className="quest-inventory-panel" role="dialog" aria-modal="true" aria-labelledby="quest-inventory-title" style={styles.questInventoryPanel}>
          <div style={styles.questPanelHeader}>
            <div>
              <h2 id="quest-inventory-title" style={styles.questPanelTitle}>{t('hud.questBagTitle')}</h2>
              <div style={styles.questSummary}>{t('hud.questSummary', { active: activeQuestCount, items: heldQuestItems.length })}</div>
            </div>
            <button ref={questCloseButtonRef} type="button" aria-label={t('hud.questBagCloseLabel')} style={styles.questCloseButton} onClick={closeQuestInventory}>×</button>
          </div>
          {visibleQuests.length === 0 ? (
            <p style={styles.questEmpty}>{t('hud.questEmpty')}<br />{t('hud.questEmptyHint')}</p>
          ) : (
            <div style={styles.questCardList}>
              {visibleQuests.map((quest) => {
                const progress = questProgress?.[quest.id]
                const completed = progress?.status === 'completed'
                const statusLabel = completed
                  ? t('hud.questCompleted')
                  : progress?.status === 'active'
                    ? t('hud.questFindItem')
                    : quest.completion.kind === 'install' ? t('hud.questInstall') : t('hud.questReturn')
                return (
                  <article key={quest.id} style={styles.questCard}>
                    <div style={styles.questCardTitle}>{completed && <span aria-label={t('hud.questCompleteMark')} style={styles.questCompleteMark}>✓</span>}{t(`quest.${quest.id}.title`, null, quest.title)}</div>
                    <p style={styles.questObjective}>{t(`quest.${quest.id}.objective`, null, quest.objective)}</p>
                    <div style={styles.questCardFooter}><span>{statusLabel}</span><span>{t('hud.questReward', { gold: quest.rewardGold })}</span></div>
                  </article>
                )
              })}
            </div>
          )}
          {heldQuestItems.length > 0 && (
            <section aria-label={t('hud.questItemsAria')} style={styles.questItemSection}>
              <h3 style={styles.questItemHeading}>{t('hud.questItemHeading')}</h3>
              {heldQuestItems.map((quest) => (
                <div key={quest.item.id} style={styles.questItem}>
                  <QuestBagIcon />
                  <div><strong>{t(`quest.${quest.id}.itemName`, null, quest.item.name)}</strong><p>{t(`quest.${quest.id}.itemDesc`, null, quest.item.description)}</p></div>
                </div>
              ))}
            </section>
          )}
          <section aria-label="보스 패시브 아이템" style={styles.bossPassiveSection}>
            <h3 style={styles.questItemHeading}>보스 패시브 아이템</h3>
            <div role="list" style={styles.bossPassiveGrid}>
              {bossPassiveSlots.map((item, index) => (
                <div
                  key={item?.id ?? `empty-boss-passive-slot-${index}`}
                  role="listitem"
                  aria-label={item ? `${item.name} — ${item.description}` : '빈 보스 패시브 슬롯'}
                  style={{ ...styles.bossPassiveSlot, ...(item ? styles.bossPassiveSlotUnlocked : null) }}
                >
                  {item ? (
                    <>
                      <span aria-hidden="true" style={styles.bossPassiveIcon}>{item.icon}</span>
                      <strong style={styles.bossPassiveName}>{item.name}</strong>
                      <small style={styles.bossPassiveDescription}>{item.description}</small>
                    </>
                  ) : <span aria-hidden="true" style={styles.bossPassiveEmptyMark}>+</span>}
                </div>
              ))}
            </div>
          </section>
        </aside>
      )}

      {phase === 'paused' && pauseSource !== 'dialogue' && pauseSource !== 'intro' && pauseSource !== 'quest' && (
        <div style={styles.overlay}>
          <div
            style={styles.pausePanel}
            role="dialog"
            aria-modal="true"
            aria-label={isTitleReturnConfirmOpen ? t('hud.confirmLobbyAria') : t('hud.pauseTitleAria')}
          >
            {isTitleReturnConfirmOpen ? (
              <>
                <h2 style={styles.modalTitle}>{t('hud.confirmLobbyHeading')}</h2>
                <p style={styles.pauseMessage}>{t('hud.confirmLobbyBody')}</p>
                <div style={styles.modalButtons}>
                  <button style={styles.pauseCancelBtn} onClick={() => setIsTitleReturnConfirmOpen(false)}>
                    {t('common.cancel')}
                  </button>
                  <button style={styles.pauseTitleReturnBtn} onClick={confirmLobbyReturn}>
                    {t('hud.goBack')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 style={styles.modalTitle}>
                  {pauseSource === 'auto' ? t('hud.awayTitle') : t('hud.pausedTitle')}
                </h2>
                {pauseSource === 'auto' && (
                  <p style={styles.pauseMessage}>{t('hud.awayBody')}</p>
                )}
                <div style={styles.pauseActions}>
                  <button style={styles.restartBtn} onClick={resumeGame}>
                    {pauseSource === 'auto' ? t('hud.resumeAway') : t('hud.resume')}
                  </button>
                  <button style={styles.titleBtn} onClick={() => setIsTitleReturnConfirmOpen(true)}>
                    {t('hud.backToLobby')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {phase === 'cleared' && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={{ ...styles.modalTitle, color: '#ffd040' }}>{currentStageId === 'stage2' ? 'STAGE 2 CLEAR!' : 'STAGE CLEAR!'}</h2>
            <p style={{ color: '#ccc', marginBottom: 8 }}>{t('hud.clearTime', { time: runClock })}</p>
            {bossBonus > 0 && (
              <p style={{ color: '#ff88ff', marginBottom: 6, fontSize: 14 }}>
                {t('hud.bossBonus')}<strong>{t('hud.bossBonusPoints', { points: bossBonus })}</strong>
              </p>
            )}
            <p style={{ color: '#ffd040', marginBottom: nextUnlock || (newlyUnlockedWeaponIds?.length > 0) ? 12 : 20 }}>{t('hud.goldEarned', { session: goldSession, total: goldTotal })}</p>
            <MissionResultSummary summary={missionSummary} onOpenMissionCenter={onOpenMissionCenter} />
            {newlyUnlockedWeaponIds?.length > 0 && (
              <div style={styles.newlyUnlocked}>
                <span style={styles.newlyUnlockedLabel}>{t('hud.newWeaponUnlocked')}</span>
                {newlyUnlockedWeaponIds.map((id) => (
                  <div key={id} style={styles.newlyUnlockedItem}>
                    {weaponLabel(id, WEAPON_CATALOG[id]?.label ?? id)}
                  </div>
                ))}
                <div style={styles.newlyUnlockedHint}>{t('hud.newWeaponHint')}</div>
                {onOpenWeaponEncyclopedia && (
                  <button type="button" style={styles.weaponEncyclopediaBtn} onClick={() => onOpenWeaponEncyclopedia(newlyUnlockedWeaponIds[0])}>
                    {t('hud.weaponEncyclopedia', null, '무기 도감 보기')}
                  </button>
                )}
              </div>
            )}
            {nextUnlock && (
              <div style={styles.nextUnlock}>
                <span style={styles.nextUnlockLabel}>{t('hud.nextUnlockLabel')}</span>
                <div style={styles.nextUnlockBody}>
                  <div style={styles.nextUnlockSilhouette}>
                    <UpgradeIcon type={nextUnlock.icon} />
                  </div>
                  <div style={styles.nextUnlockText}>
                    <div style={styles.nextUnlockName}>???</div>
                    <div style={styles.nextUnlockHint}>{t('hud.nextUnlockHint', { level: nextUnlock.minLevel })}</div>
                  </div>
                </div>
              </div>
            )}
            <div data-testid="result-primary-actions" style={styles.resultButtons}>
              {nextStageId && (
                <button style={styles.nextStageBtn} onClick={() => resetGame(nextStageId)}>
                  {t('hud.nextStage')}
                </button>
              )}
              {onGoToRanking && <button style={{ ...styles.rankingBtn, ...styles.resultActionBtn }} onClick={onGoToRanking}>{t('hud.rankingTrophy')}</button>}
              <button style={{ ...styles.titleBtn, ...styles.resultActionBtn }} onClick={onGoToTitle}>{t('hud.toTitle')}</button>
              <button style={{ ...styles.shopBtn, ...styles.resultActionBtn }} onClick={onOpenCoinShop}>{t('hud.coinShop')}</button>
              <button style={{ ...styles.restartBtn, ...styles.resultActionBtn }} onClick={() => resetGame(currentStageId)}>{t('hud.restartSpaced')}</button>
            </div>
          </div>
          {resultDevTools}
        </div>
      )}

      {/* 쓰러진 학생 대화창 — 화면 아무 곳이나 탭하면 닫고 게임 재개 */}
      {studentDialogue && (
        <div
          data-testid="student-dialogue-catcher"
          style={questDialoguePopup
            ? { ...styles.dialogueCatcher, ...styles.questDialogueCatcher }
            : styles.dialogueCatcher}
          onPointerDown={() => {
            emitSfx({ id: 'buttonClick' })
            if (questDialoguePopup) clearQuestToast()
            closeStudentDialogue()
          }}
        >
          {questDialoguePopup ? (
            <div
              data-testid="quest-dialogue-popup"
              style={{ ...styles.questToast, ...styles.questPopupCenter, ...styles.questDialoguePopup }}
              role="dialog"
              aria-label={t('hud.investigateAria', { name: studentDialogue.subjectName ?? t('hud.defaultSubject') })}
            >
              <QuestBagIcon size={82} />
              <div style={styles.questDialogueContent}>
                <div style={styles.questDialogueName}>[{studentDialogue.subjectName ?? t('hud.tiredStudent')}]</div>
                <div style={styles.questDialogueLine} aria-live="polite">{getDialogueText(studentDialogue.dialogueId)}</div>
                <div style={styles.questDialogueDivider} />
                <strong style={styles.questDialogueNotice}>{questToastMessage}</strong>
                {questPopupNextAction && <small style={styles.questPopupNextAction}>{questPopupNextAction}</small>}
                <div style={styles.questDialogueHint}>{t('hud.tapToContinue')}</div>
              </div>
            </div>
          ) : (
            <div style={styles.dialogueBox} role="dialog" aria-label={t('hud.investigateAria', { name: studentDialogue.subjectName ?? t('hud.defaultSubject') })}>
              {(studentDialogue.subjectType ?? 'student') === 'student' && (
                <div style={styles.dialoguePortraitFrame}>
                  <img
                    src={laidManPortraitSrc}
                    alt={t('hud.laidStudentAlt')}
                    draggable={false}
                    style={styles.dialoguePortrait}
                  />
                </div>
              )}
              <div style={styles.dialogueTextCol}>
                <div style={styles.dialogueName}>[{studentDialogue.subjectName ?? t('hud.tiredStudent')}]</div>
                <div style={styles.dialogueLine} aria-live="polite">{getDialogueText(studentDialogue.dialogueId)}</div>
                {studentDialogue.reward && (
                  <div style={styles.dialogueReward}>
                    {studentDialogue.reward.type === 'gold'
                      ? t('hud.rewardGold', { amount: studentDialogue.reward.amount })
                      : t('hud.rewardUpgrade')}
                  </div>
                )}
                <div style={styles.dialogueHint}>{t('hud.tapToContinue')}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 스테이지1 스토리 인트로 — 딤 처리된 화면 위 내레이션. 탭할 때마다 다음 대사, 마지막 탭에 게임 시작 */}
      {introDialogue && (
        <div
          data-testid="stage-intro-catcher"
          style={styles.introCatcher}
          onPointerDown={() => { emitSfx({ id: 'buttonClick' }); advanceIntro() }}
        >
          <div style={styles.introBox} role="dialog" aria-label={t('hud.introAria')}>
            <div style={styles.dialogueLine} aria-live="polite">
              {introLine(introDialogue.index)}
            </div>
            <div style={styles.dialogueHint}>
              {introDialogue.index < STAGE1_INTRO_IDS.length - 1 ? t('hud.tapToContinue') : t('hud.tapToStart')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MissionResultSummary({ summary, onOpenMissionCenter }) {
  const representative = summary.completed[0] ?? summary.progressed[0]
  if (!representative && !onOpenMissionCenter) return null
  return (
    <section style={styles.missionResultSummary} aria-label="미션 진행 요약">
      <strong>미션 진행</strong>
      <span>{representative ? `${representative.mission.title} ${representative.counter}/${representative.target}` : '미션 센터에서 30개 목표를 확인하세요.'}</span>
      {summary.completed.length > 0 && <span>완료 {summary.completed.length}개 · 보상 확정 대기</span>}
      {onOpenMissionCenter && <button type="button" style={styles.missionCenterBtn} onClick={onOpenMissionCenter}>미션 센터</button>}
    </section>
  )
}

const styles = {
  root: {
    position: 'fixed', inset: 0, pointerEvents: 'none',
    zIndex: 10,
    fontFamily: uiType.family, userSelect: 'none',
  },
  missionResultSummary: {
    display: 'grid', gap: 4, margin: '0 0 12px', padding: '9px 10px', border: uiBorders.hairline,
    borderRadius: 8, background: 'rgba(255,248,232,0.12)', color: '#f8f0de', fontSize: 12, lineHeight: 1.3,
  },
  missionCenterBtn: {
    ...schoolButton('paper'), minHeight: 44, marginTop: 3, fontSize: 13,
  },
  topBar: {
    position: 'absolute', top: 'var(--hud-safe-top)', '--hud-safe-top': 'max(14px, env(safe-area-inset-top, 0px))', left: '50%', transform: 'translateX(-50%)',
    display: 'flex', gap: 10, alignItems: 'center',
    pointerEvents: 'auto',
  },
  milestoneToast: {
    position: 'absolute',
    top: 58,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: uiPalette.paper,
    border: uiBorders.strong,
    borderRadius: 8,
    padding: '7px 12px',
    boxShadow: uiShadows.pressSmall,
    animation: 'milestonePop 2s ease-in-out forwards',
    pointerEvents: 'auto',
  },
  milestoneLabel: {
    color: uiPalette.ink,
    fontSize: 13,
    fontWeight: 800,
  },
  milestoneGold: {
    color: uiPalette.rewardDeep,
    fontSize: 13,
    fontWeight: 900,
  },
  bossWarning: {
    position: 'absolute',
    left: '50%',
    top: 72,
    transform: 'translateX(-50%)',
    minWidth: 158,
    textAlign: 'center',
    background: 'rgba(132, 32, 44, 0.9)',
    border: uiBorders.strong,
    borderRadius: 10,
    padding: '14px 18px',
    boxShadow: `${uiShadows.press}, ${uiShadows.glowDanger}`,
    animation: 'bossPulse 0.8s ease-in-out infinite',
    pointerEvents: 'auto',
  },
  bossWarningLabel: {
    color: '#ffd8d8',
    fontSize: 16,
    fontWeight: 900,
  },
  bossWarningCount: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: 900,
    lineHeight: 1,
    marginTop: 4,
  },
  projectileWarning: {
    position: 'absolute',
    left: '50%',
    top: 72,
    transform: 'translateX(-50%)',
    minWidth: 170,
    textAlign: 'center',
    background: 'rgba(24, 55, 47, 0.9)',
    border: uiBorders.strong,
    borderRadius: 10,
    padding: '11px 16px',
    boxShadow: `${uiShadows.press}, 0 0 20px rgba(84, 224, 200, 0.35)`,
    animation: 'bossPulse 0.8s ease-in-out infinite',
    pointerEvents: 'auto',
  },
  projectileWarningLabel: {
    color: '#d8fffa',
    fontSize: 15,
    fontWeight: 900,
  },
  projectileWarningCount: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: 900,
    lineHeight: 1,
    marginTop: 3,
  },
  matildaWarning: {
    position: 'absolute',
    left: '50%',
    top: 72,
    transform: 'translateX(-50%)',
    minWidth: 200,
    textAlign: 'center',
    background: 'rgba(60, 0, 80, 0.95)',
    border: '2px solid #cc44ff',
    borderRadius: 10,
    padding: '14px 18px',
    boxShadow: `${uiShadows.press}, 0 0 24px rgba(180, 0, 255, 0.5)`,
    animation: 'bossPulse 0.5s ease-in-out infinite',
    pointerEvents: 'auto',
  },
  matildaWarningLabel: {
    color: '#f0aaff',
    fontSize: 15,
    fontWeight: 900,
  },
  matildaWarningCount: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: 900,
    lineHeight: 1,
    marginTop: 4,
  },
  matildaDialogueBox: {
    position: 'absolute',
    left: '50%',
    bottom: 'max(env(safe-area-inset-bottom), 18px)',
    transform: 'translateX(-50%)',
    zIndex: 35,
    width: 'min(660px, calc(100vw - 24px))',
    minHeight: 112,
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateColumns: '96px 1fr',
    alignItems: 'center',
    gap: 14,
    padding: '12px 16px',
    border: '3px solid #211404',
    borderRadius: 14,
    background: 'linear-gradient(180deg, rgba(255, 247, 220, 0.98), rgba(236, 215, 165, 0.98))',
    color: '#211404',
    boxShadow: '0 7px 0 #050209, 0 16px 24px rgba(0,0,0,0.42)',
    animation: 'matildaDialoguePop 150ms ease-out',
    transformOrigin: 'center bottom',
    pointerEvents: 'none',
  },
  matildaDialoguePortraitFrame: {
    width: 88,
    height: 88,
    borderRadius: 10,
    border: '3px solid #211404',
    background: 'linear-gradient(180deg, #352044, #15101f)',
    boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.16), 0 4px 0 rgba(0,0,0,0.45)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matildaDialoguePortrait: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    userSelect: 'none',
  },
  matildaDialogueTextCol: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  matildaDialogueName: {
    width: 'fit-content',
    padding: '3px 12px',
    borderRadius: 999,
    border: '2px solid #211404',
    background: '#6b2a82',
    color: '#fff0ff',
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 0.5,
    boxShadow: '0 3px 0 rgba(0,0,0,0.35)',
  },
  matildaDialogueLine: {
    color: '#211404',
    fontSize: 'clamp(16px, 3.7vw, 22px)',
    fontWeight: 900,
    lineHeight: 1.32,
    wordBreak: 'keep-all',
    overflowWrap: 'anywhere',
    textShadow: '0 1px 0 rgba(255,255,255,0.75)',
  },
  formationWarning: {
    position: 'absolute',
    left: '50%',
    // 보스/마틸다/탄환 경고(top:72)와 세로로 겹치지 않게 아래에 배치
    top: 140,
    transform: 'translateX(-50%)',
    maxWidth: 'min(88vw, 320px)',
    textAlign: 'center',
    background: 'rgba(70, 38, 8, 0.92)',
    border: '2px solid #ffb340',
    borderRadius: 10,
    padding: '11px 18px',
    boxShadow: `${uiShadows.press}, 0 0 22px rgba(255, 168, 48, 0.45)`,
    animation: 'bossPulse 0.7s ease-in-out infinite',
    pointerEvents: 'auto',
  },
  formationWarningLabel: {
    color: '#ffe6bf',
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1.25,
  },
  portalFlash: {
    position: 'absolute',
    left: '50%',
    top: '38%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 255, 200, 0.15)',
    border: '2px solid #00ffcc',
    borderRadius: 12,
    padding: '12px 24px',
    color: '#00ffee',
    fontSize: 20,
    fontWeight: 900,
    textAlign: 'center',
    boxShadow: '0 0 28px rgba(0, 255, 200, 0.45)',
    animation: 'bossPulse 0.8s ease-in-out infinite',
    pointerEvents: 'none',
  },
  portalObjective: {
    position: 'absolute',
    left: '50%',
    bottom: 102,
    transform: 'translateX(-50%)',
    minWidth: 148,
    padding: '7px 12px',
    border: '2px solid #00d9b5',
    borderRadius: 9,
    background: 'rgba(7, 44, 43, 0.94)',
    color: '#d8fff7',
    fontSize: 15,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1.2,
    textAlign: 'center',
    boxShadow: '0 2px 0 rgba(0,0,0,0.35)',
    pointerEvents: 'none',
  },
  screenReaderOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
  stageChip: {
    color: uiPalette.reward,
    fontSize: 15,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    textShadow: '0 1px 3px rgba(0,0,0,0.85)',
  },
  // 좌하단. 모바일 조이스틱은 화면 하단을 터치로 쓰므로 pointerEvents를 끄고 얹는다 -
  // 점수판이 조이스틱 입력을 삼키면 이동이 막힌다.
  liveScore: {
    position: 'absolute',
    left: 'max(14px, env(safe-area-inset-left, 0px))',
    bottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 1,
    pointerEvents: 'none',
    userSelect: 'none',
  },
  liveScoreLabel: {
    color: uiPalette.paperLight,
    fontFamily: uiType.numeric,
    fontSize: 10,
    fontWeight: uiType.weightHeavy,
    letterSpacing: 1,
    opacity: 0.78,
    textShadow: '0 1px 3px rgba(0,0,0,0.85)',
  },
  liveScoreValue: {
    color: uiPalette.paperLight,
    fontFamily: uiType.numeric,
    fontSize: 20,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1,
    // 자릿수가 늘어나도 줄바꿈으로 무너지지 않게 한 줄로 두고, 화면 밖으로 나가지 않게 자른다.
    whiteSpace: 'nowrap',
    maxWidth: 'calc(100vw - 32px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textShadow: '0 1px 3px rgba(0,0,0,0.85)',
  },
  timer: {
    color: uiPalette.paperLight,
    fontFamily: uiType.numeric,
    fontSize: 22,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    textShadow: '0 1px 3px rgba(0,0,0,0.85)',
  },
  goldChip: {
    position: 'absolute',
    top: 'var(--hud-safe-top)', '--hud-safe-top': 'max(14px, env(safe-area-inset-top, 0px))', right: 14,
    display: 'flex', alignItems: 'center', gap: 5,
    pointerEvents: 'auto',
  },
  goldDot: {
    width: 13, height: 13, borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 35%, #fff5b0 0%, #ffd23c 55%, #aa7000 100%)',
    border: '1px solid rgba(5,2,9,0.6)',
    flexShrink: 0,
  },
  goldNum: {
    color: uiPalette.reward,
    fontSize: 15,
    fontWeight: uiType.weightHeavy,
    textShadow: '0 1px 3px rgba(0,0,0,0.85)',
  },
  hpRow: {
    position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: 8,
    width: 'calc(100% - 48px)', maxWidth: 320,
    boxSizing: 'border-box',
    pointerEvents: 'auto',
  },
  hpLabel: { color: uiPalette.paperLight, fontSize: 13, fontWeight: uiType.weightHeavy, width: 22, textShadow: `0 1px 2px ${uiPalette.ink}` },
  hpNum:   { color: uiPalette.paperLight, fontSize: 12, fontWeight: 800, width: 60, textAlign: 'right', textShadow: `0 1px 2px ${uiPalette.ink}` },
  xpRow: {
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: 9,
    background: 'rgba(10,8,14,0.78)',
    boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.18)',
    pointerEvents: 'none',
    zIndex: 5,
  },
  xpFill: {
    height: '100%',
    background: 'linear-gradient(180deg, #8af07e 0%, #4cc44c 100%)',
    boxShadow: '0 0 6px rgba(96,224,96,0.8)',
    transition: 'width 0.15s',
  },
  playerLevelLabel: {
    minWidth: 42, padding: '3px 6px', border: `1.5px solid ${uiPalette.ink}`, borderRadius: 999,
    background: 'rgba(18, 49, 28, 0.94)', color: '#dfffdc', fontFamily: uiType.numeric,
    fontSize: 14, fontWeight: uiType.weightHeavy, lineHeight: 1.1, textAlign: 'center', whiteSpace: 'nowrap',
    textShadow: '0 1px 2px rgba(0,0,0,0.85)', pointerEvents: 'none',
  },
  barBg: {
    flex: 1,
    height: 10,
    background: '#2d2832',
    border: `1.5px solid ${uiPalette.ink}`,
    borderRadius: 999,
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  barFill: { height: '100%', borderRadius: 5, transition: 'width 0.15s' },
  weaponIconBar: {
    position: 'absolute', bottom: 64, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', flexDirection: 'row', gap: 4, alignItems: 'center',
    pointerEvents: 'auto',
  },
  weaponMiniIcon: {
    width: 28, height: 28,
    background: 'rgba(24,55,47,0.86)',
    border: uiBorders.chalk,
    borderRadius: 5,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
  weaponMiniImg: {
    width: 22, height: 22,
    objectFit: 'contain',
    display: 'block',
    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
    userSelect: 'none',
  },
  overlay: {
    position: 'absolute', inset: 0, background: 'rgba(5,2,9,0.62)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'auto',
  },
  gameoverGrayscaleTransition: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(8, 8, 10, 0.08)',
    backdropFilter: 'grayscale(1)',
    WebkitBackdropFilter: 'grayscale(1)',
    animation: `gameoverGrayscaleFade ${GAMEOVER_TRANSITION_MS}ms ease forwards`,
    pointerEvents: 'none',
  },
  // 마틸다 사망은 홀드 뒤에 늦게 마운트되므로 남은 시간에 맞춰 더 짧게 페이드한다.
  matildaGameoverGrayscaleTransition: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(8, 8, 10, 0.08)',
    backdropFilter: 'grayscale(1)',
    WebkitBackdropFilter: 'grayscale(1)',
    animation: `gameoverGrayscaleFade ${MATILDA_DEATH_GRAYSCALE_FADE_MS}ms ease forwards`,
    pointerEvents: 'none',
  },
  modal: {
    ...schoolPanel('dark'),
    padding: '18px 12px', textAlign: 'center',
    width: 'min(220px, calc(100% - 28px))', maxWidth: 220, boxSizing: 'border-box',
  },
  modalTitle: {
    color: uiPalette.paperLight,
    margin: '0 0 24px',
    fontSize: 26,
    fontWeight: uiType.weightHeavy,
    textShadow: `0 2px 0 ${uiPalette.ink}`,
  },
  gameoverDeathLine: {
    color: '#ffe9f3',
    // 제목 아래 여백을 24 -> 14로 줄였으므로 당김값도 -12 -> -2로 맞춰 실제 간격 12px를 유지한다.
    margin: '-2px 0 12px',
    fontSize: 14,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1.35,
    wordBreak: 'keep-all',
  },
  // "크고 굵게" — 생존 시간/획득 골드(본문 크기)보다 확실히 크되 GAME OVER 제목(26)보다는
  // 작게 둬서 제목과 경쟁하지 않게 한다. 자릿수가 폭발해도 잘라내지 않고 줄바꿈으로 흘린다.
  gameoverFinalScore: {
    color: uiPalette.paperLight,
    fontFamily: uiType.numeric,
    margin: '0 0 8px',
    fontSize: 22,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1.15,
    letterSpacing: 0.5,
    wordBreak: 'keep-all',
    textShadow: `0 2px 0 ${uiPalette.ink}`,
  },
  pausePanel: {
    ...schoolPanel('dark'),
    padding: '28px 34px', textAlign: 'center',
    width: 'calc(100% - 56px)',
    maxWidth: 340,
    boxSizing: 'border-box',
  },
  pauseMessage: {
    color: uiPalette.mutedChalk,
    fontSize: 14,
    lineHeight: 1.5,
    margin: '-12px 0 20px',
    maxWidth: 220,
  },
  pauseActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    alignItems: 'stretch',
  },
  pauseCancelBtn: {
    ...schoolButton('paper'),
    fontSize: 15,
    padding: '11px 20px',
    boxShadow: uiShadows.pressSmall,
  },
  pauseTitleReturnBtn: {
    ...schoolButton('primary'),
    fontSize: 15,
    padding: '11px 20px',
  },
  levelupOverlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(760px, calc(100% - 24px))',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  levelupPanel: {
    ...schoolPanel('dark'),
    width: '100%',
    padding: '12px',
    boxSizing: 'border-box',
    textAlign: 'center',
    pointerEvents: 'auto',
  },
  levelupTitle: {
    color: uiPalette.paperLight,
    margin: '0 0 10px',
    fontSize: 20,
    fontWeight: uiType.weightHeavy,
    textShadow: `0 2px 0 ${uiPalette.ink}`,
  },
  levelupChoices: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 8,
    alignItems: 'stretch',
  },
  levelupChoiceBtn: {
    ...schoolButton('paper'),
    color: uiPalette.ink,
    width: '100%',
    minWidth: 0,
    minHeight: 132,
    padding: '8px 6px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    textAlign: 'center',
    overflow: 'hidden',
    transition: 'background 0.15s, transform 0.15s',
  },
  levelupReplacementDialog: {
    ...schoolPanel('paper'),
    marginTop: 12,
    padding: 12,
    color: uiPalette.ink,
  },
  levelupReplacementTitle: {
    margin: '0 0 8px',
    fontWeight: uiType.weightHeavy,
  },
  levelupReplacementOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 6,
  },
  levelupReplacementOption: {
    ...schoolButton('paper'),
    color: uiPalette.ink,
    padding: '7px 8px',
    fontSize: 12,
  },
  levelupReplacementCancel: {
    ...schoolButton('danger'),
    marginTop: 8,
    padding: '7px 18px',
    fontSize: 12,
  },
  topLeftControls: {
    position: 'absolute',
    top: 'var(--hud-safe-top)', '--hud-safe-top': 'max(14px, env(safe-area-inset-top, 0px))',
    left: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'auto',
  },
  masterRoleBadge: {
    display: 'inline-block',
    marginTop: 1,
    padding: '1px 4px',
    borderRadius: 4,
    border: uiBorders.strong,
    background: '#5e2ca5',
    color: '#fff9d9',
    fontSize: 9,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1.2,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
  pauseButton: {
    position: 'absolute', right: 'var(--hud-safe-right)', '--hud-safe-right': 'max(14px, env(safe-area-inset-right, 0px))',
    bottom: 'var(--hud-pause-bottom)', '--hud-pause-bottom': 'calc(100px + env(safe-area-inset-bottom, 0px))',
    width: 44,
    height: 44,
    borderRadius: 8,
    border: uiBorders.strong,
    background: uiPalette.chalkboard,
    color: uiPalette.paperLight,
    fontSize: 18,
    fontWeight: uiType.weightHeavy,
    lineHeight: '40px',
    textAlign: 'center',
    pointerEvents: 'auto',
    cursor: 'pointer',
    boxShadow: uiShadows.pressSmall,
  },
  questBagButton: {
    position: 'relative',
    width: 44,
    height: 44,
    padding: 0,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 8,
    border: uiBorders.strong,
    background: uiPalette.chalkboard,
    cursor: 'pointer',
    boxShadow: uiShadows.pressSmall,
  },
  questNewBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: uiBorders.strong,
    background: uiPalette.reward,
    color: uiPalette.ink,
    fontSize: 13,
    fontWeight: uiType.weightHeavy,
    lineHeight: '16px',
  },
  questToast: {
    position: 'absolute',
    top: 66,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 12px',
    border: uiBorders.strong,
    borderRadius: 8,
    background: uiPalette.paper,
    color: uiPalette.ink,
    boxShadow: uiShadows.pressSmall,
    fontSize: 13,
    fontWeight: uiType.weightStrong,
    pointerEvents: 'none',
  },
  questPopupCenter: {
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 30,
    width: 'min(88vw, 480px)',
    maxWidth: 'min(88vw, 480px)',
    boxSizing: 'border-box',
    justifyContent: 'flex-start',
    gap: 18,
    padding: '8px 11px',
    borderWidth: 2,
    borderRadius: 8,
    background: uiPalette.paper,
    boxShadow: '0 4px 0 rgba(22, 19, 16, 0.36), 0 0 0 3px rgba(255, 232, 135, 0.32)',
    fontSize: 19,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1.15,
    textAlign: 'left',
  },
  questPopupText: { display: 'grid', gap: 3 },
  questPopupCenterText: { flex: 1, minWidth: 0, textAlign: 'center' },
  questItemToastWide: {
    top: 66,
    width: 'min(calc(100vw - 24px), 546px)',
    maxWidth: 'calc(100vw - 24px)',
    minHeight: 75.4,
    boxSizing: 'border-box',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 13,
    padding: '10.4px 15.6px 10.4px 10.4px',
    borderRadius: 10.4,
    textAlign: 'left',
  },
  questItemPictureFrame: {
    flex: '0 0 62.4px',
    width: 62.4,
    height: 62.4,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 13,
    background: 'linear-gradient(180deg, rgba(255,246,218,0.96), rgba(233,209,153,0.96))',
    boxShadow: 'inset 0 0 0 2.6px rgba(255,255,255,0.46), 0 2.6px 0 rgba(42,23,9,0.28)',
  },
  questItemPictureSvg: {
    display: 'block',
    filter: 'drop-shadow(0 1.3px 1.3px rgba(0,0,0,0.35))',
  },
  questItemToastText: {
    minWidth: 0,
    lineHeight: 1.24,
    fontSize: 16.9,
    gap: 3.9,
  },
  questPopupNextAction: {
    display: 'block',
    fontSize: 12,
    lineHeight: 1.25,
    fontFamily: "'Nanum Myeongjo', serif",
    fontWeight: 800,
    color: '#fff',
    WebkitTextStroke: '1.2px #000',
    paintOrder: 'stroke fill',
    textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 0 #000',
  },
  questItemNextAction: { fontSize: 15.6, lineHeight: 1.25 },
  questDialogueCatcher: {
    alignItems: 'center',
    paddingBottom: '12vh',
  },
  questDialoguePopup: {
    alignItems: 'center',
    pointerEvents: 'none',
  },
  questDialogueContent: {
    flex: 1,
    minWidth: 0,
    display: 'grid',
    gap: 5,
    textAlign: 'left',
  },
  questDialogueName: {
    color: '#8a4b16',
    fontSize: 13,
    fontWeight: uiType.weightHeavy,
  },
  questDialogueLine: {
    color: uiPalette.ink,
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1.35,
    wordBreak: 'keep-all',
    overflowWrap: 'anywhere',
  },
  questDialogueDivider: {
    height: 1,
    margin: '2px 0',
    background: 'rgba(5, 2, 9, 0.32)',
  },
  questDialogueNotice: {
    fontSize: 18,
    lineHeight: 1.2,
    textAlign: 'center',
  },
  questDialogueHint: {
    color: '#6b6259',
    fontSize: 10,
    fontWeight: 700,
    textAlign: 'center',
    opacity: 0.85,
  },
  questInventoryPanel: {
    ...schoolPanel('paper'),
    position: 'absolute',
    top: 66,
    left: 14,
    width: 'min(360px, calc(100% - 28px))',
    maxHeight: 'calc(100dvh - 84px)',
    overflowY: 'auto',
    boxSizing: 'border-box',
    padding: 16,
    pointerEvents: 'auto',
  },
  questPanelHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    borderBottom: uiBorders.hairline,
    paddingBottom: 10,
  },
  questPanelTitle: { margin: 0, fontSize: 22, fontWeight: uiType.weightHeavy },
  questSummary: { marginTop: 3, color: '#5d554e', fontSize: 13, fontWeight: uiType.weightStrong },
  questCloseButton: {
    ...schoolButton('chalk'),
    minHeight: 36,
    width: 36,
    padding: 0,
    fontSize: 25,
    lineHeight: 1,
  },
  questEmpty: { margin: '26px 0 12px', textAlign: 'center', lineHeight: 1.6, fontSize: 14, fontWeight: uiType.weightStrong },
  questCardList: { display: 'grid', gap: 9, marginTop: 12 },
  questCard: { border: uiBorders.hairline, borderRadius: 8, padding: '10px 11px', background: uiPalette.paperLight },
  questCardTitle: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 15, fontWeight: uiType.weightHeavy },
  questCompleteMark: { color: '#247a45', fontSize: 18 },
  questObjective: { margin: '6px 0 8px', fontSize: 13, lineHeight: 1.4 },
  questCardFooter: { display: 'flex', justifyContent: 'space-between', gap: 8, color: '#5d554e', fontSize: 12, fontWeight: uiType.weightStrong },
  questItemSection: { marginTop: 14, paddingTop: 11, borderTop: uiBorders.hairline },
  questItemHeading: { margin: '0 0 8px', fontSize: 15, fontWeight: uiType.weightHeavy },
  questItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' },
  bossPassiveSection: { marginTop: 14, paddingTop: 11, borderTop: uiBorders.hairline },
  bossPassiveGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 7 },
  bossPassiveSlot: {
    minHeight: 76,
    boxSizing: 'border-box',
    border: '2px dashed #b8afa3',
    borderRadius: 8,
    background: '#eee9df',
    color: '#8b8378',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: '5px 3px',
    textAlign: 'center',
  },
  bossPassiveSlotUnlocked: { border: '2px solid #b88419', background: '#fff3c4', color: '#412d06', boxShadow: 'inset 0 0 0 1px #fffbe6' },
  bossPassiveIcon: { fontSize: 24, lineHeight: 1 },
  bossPassiveName: { fontSize: 12, lineHeight: 1.1 },
  bossPassiveDescription: { fontSize: 9, lineHeight: 1.25, fontWeight: uiType.weightStrong },
  bossPassiveEmptyMark: { fontSize: 20, lineHeight: 1, opacity: 0.65 },
  quickRestartButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: uiBorders.strong,
    background: uiPalette.paper,
    color: uiPalette.ink,
    fontSize: 20,
    fontWeight: uiType.weightHeavy,
    lineHeight: '36px',
    textAlign: 'center',
    pointerEvents: 'auto',
    cursor: 'pointer',
    boxShadow: uiShadows.pressSmall,
  },
  iconBox: {
    position: 'relative', width: 62, height: 54, margin: '0 auto 10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  fallbackIconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  weaponIconImage: {
    width: 54,
    height: 54,
    objectFit: 'contain',
    display: 'block',
    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))',
    userSelect: 'none',
  },
  pencilIcon: { position: 'relative', width: 46, height: 12, transform: 'rotate(-22deg)' },
  pencilLead: {
    position: 'absolute', left: 0, top: 1, width: 0, height: 0,
    borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '10px solid #1c1c22',
  },
  pencilBody: {
    position: 'absolute', left: 9, top: 1, width: 27, height: 10,
    background: '#ffcf24', border: '2px solid #111', boxSizing: 'border-box',
  },
  pencilEraser: {
    position: 'absolute', right: 0, top: 1, width: 10, height: 10,
    background: '#f05a78', border: '2px solid #111', boxSizing: 'border-box',
  },
  rulerIcon: {
    position: 'relative', width: 12, height: 46, background: '#f6dd59',
    border: '3px solid #111', borderRadius: 2, transform: 'rotate(-34deg)',
  },
  rulerEdge: {
    position: 'absolute', right: 1, top: 4, width: 2, height: 34, background: '#fff2a3',
  },
  rulerMarkA: {
    position: 'absolute', left: 0, top: 8, width: 8, height: 2, background: '#111',
  },
  rulerMarkB: {
    position: 'absolute', left: 0, top: 20, width: 6, height: 2, background: '#111',
  },
  rulerMarkC: {
    position: 'absolute', left: 0, top: 32, width: 8, height: 2, background: '#111',
  },
  boxCutterIcon: { position: 'relative', width: 42, height: 32, transform: 'rotate(-28deg)' },
  boxCutterBlade: {
    position: 'absolute', right: 0, top: 4,
    display: 'block', width: 20, height: 9,
    background: '#dce6ee', border: '2px solid #111', boxSizing: 'border-box',
  },
  boxCutterBody: {
    position: 'absolute', left: 0, top: 12,
    display: 'block', width: 32, height: 14,
    background: '#ffc928', border: '2px solid #111', borderRadius: 3, boxSizing: 'border-box',
  },
  boxCutterGrip: {
    position: 'absolute', left: 6, top: 16,
    display: 'block', width: 20, height: 4, background: '#2e3747',
  },
  flaskIcon: {
    position: 'relative', width: 34, height: 31, background: '#9be9ff',
    border: '3px solid #111', clipPath: 'polygon(38% 0, 62% 0, 62% 34%, 92% 100%, 8% 100%, 38% 34%)',
  },
  flaskNeck: {
    position: 'absolute', left: 13, top: 0, width: 8, height: 14, background: '#9be9ff',
  },
  flaskLiquid: {
    position: 'absolute', left: 5, right: 5, bottom: 4, height: 10, background: '#62e676',
  },
  tumblerIcon: {
    position: 'relative', width: 19, height: 42, background: '#ff7a3d',
    border: '3px solid #111', borderRadius: '7px 7px 9px 9px', transform: 'rotate(-24deg)',
  },
  tumblerCap: {
    position: 'absolute', left: -2, top: -6, width: 23, height: 8,
    background: '#f4f4f4', border: '3px solid #111', borderRadius: 5,
  },
  bellIcon: {
    width: 34, height: 30, background: '#ffd040', border: '3px solid #111',
    borderRadius: '50% 50% 8px 8px', position: 'relative', marginTop: 6,
  },
  bellKnob: {
    position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
    width: 9, height: 9, background: '#ffd040', border: '3px solid #111', borderRadius: '50%',
    display: 'block',
  },
  bellClapper: {
    position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
    width: 8, height: 8, background: '#111', borderRadius: '50%', display: 'block',
  },
  stunIcon: {
    position: 'relative', width: 22, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  stunBolt: {
    display: 'block', width: 22, height: 38,
    background: '#ffe65c', border: '2.5px solid #111',
    clipPath: 'polygon(65% 0%, 100% 0%, 38% 50%, 82% 50%, 8% 100%, 28% 52%, 0% 52%)',
  },
  speedIcon: {
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5,
    width: 38, height: 38,
  },
  speedLine1: {
    display: 'block', width: 36, height: 5,
    background: '#8df0ff', border: '2px solid #111', borderRadius: 3,
  },
  speedLine2: {
    display: 'block', width: 26, height: 5, marginLeft: 10,
    background: '#8df0ff', border: '2px solid #111', borderRadius: 3,
  },
  speedLine3: {
    display: 'block', width: 16, height: 5, marginLeft: 20,
    background: '#8df0ff', border: '2px solid #111', borderRadius: 3,
  },
  healthIcon: {
    position: 'relative', width: 34, height: 34,
  },
  healthH: {
    position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)',
    display: 'block', width: 34, height: 12,
    background: '#e03040', border: '2.5px solid #111', borderRadius: 2, boxSizing: 'border-box',
  },
  healthV: {
    position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
    display: 'block', width: 12, height: 34,
    background: '#e03040', border: '2.5px solid #111', borderRadius: 2, boxSizing: 'border-box',
  },
  missileIcon: { position: 'relative', width: 36, height: 36 },
  missileBody: {
    position: 'absolute', left: '50%', top: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    display: 'block', width: 8, height: 22,
    background: '#8a90b8', border: '2px solid #111', borderRadius: 3, boxSizing: 'border-box',
  },
  missileNose: {
    position: 'absolute', left: '50%', top: 3,
    transform: 'translateX(-50%) rotate(-45deg)',
    display: 'block', width: 0, height: 0,
    borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
    borderBottom: '9px solid #d0d8f0',
  },
  missileFlame: {
    position: 'absolute', left: '50%', bottom: 3,
    transform: 'translateX(-50%) rotate(-45deg)',
    display: 'block', width: 0, height: 0,
    borderLeft: '4px solid transparent', borderRight: '4px solid transparent',
    borderTop: '8px solid #ff7020',
  },
  starlinkIcon: { position: 'relative', width: 36, height: 36 },
  starlinkBolt: {
    position: 'absolute', left: '50%', top: 2,
    transform: 'translateX(-50%)',
    display: 'block', width: 5, height: 28,
    background: 'linear-gradient(to bottom, #88eeff 0%, #ffffff 40%, #44aaff 100%)',
    border: '1.5px solid #111',
    borderRadius: 2, boxSizing: 'border-box',
    boxShadow: '0 0 5px #44eeff',
  },
  starlinkRingA: {
    position: 'absolute', left: '50%', bottom: 5,
    transform: 'translateX(-50%)',
    display: 'block', width: 18, height: 18,
    borderRadius: '50%',
    border: '2px solid #44eeff',
    opacity: 0.7,
    boxSizing: 'border-box',
  },
  starlinkRingB: {
    position: 'absolute', left: '50%', bottom: 2,
    transform: 'translateX(-50%)',
    display: 'block', width: 28, height: 28,
    borderRadius: '50%',
    border: '1.5px solid #226688',
    opacity: 0.45,
    boxSizing: 'border-box',
  },
  // ── compassBlade icon (회전 칼날) ──
  compassBladeIcon: { position: 'relative', width: 36, height: 36 },
  compassBladeBlade: {
    position: 'absolute', left: '50%', top: '50%',
    transform: 'translate(-50%, -50%) rotate(35deg)',
    display: 'block', width: 28, height: 5,
    background: 'linear-gradient(to right, #b7c0c7 0%, #f0f3f5 50%, #b7c0c7 100%)',
    border: '1.5px solid #111',
    borderRadius: 2, boxSizing: 'border-box',
  },
  compassBladeHandle: {
    position: 'absolute', left: '50%', top: '50%',
    transform: 'translate(-50%, -50%) rotate(35deg) translateX(-9px)',
    display: 'block', width: 7, height: 7,
    background: '#71353f',
    border: '1.5px solid #111',
    borderRadius: 2, boxSizing: 'border-box',
  },
  // ── umbrella icon (우산 방어막) ──
  umbrellaIcon: { position: 'relative', width: 36, height: 36 },
  umbrellaCanopy: {
    position: 'absolute', left: 4, top: 5,
    display: 'block', width: 28, height: 14,
    background: '#351740',
    borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
    border: '1.5px solid #111',
    boxSizing: 'border-box',
  },
  umbrellaHandle: {
    position: 'absolute', left: '50%', top: 18,
    transform: 'translateX(-50%)',
    display: 'block', width: 3, height: 14,
    background: '#4b2933',
    border: '1.5px solid #111',
    borderRadius: '0 0 4px 4px',
    boxSizing: 'border-box',
  },
  // ── newly-unlocked weapon alert (gameover/cleared modal) ──
  newlyUnlocked: {
    marginBottom: 14,
    padding: '10px 12px',
    background: 'rgba(247, 209, 126, 0.16)',
    border: `1.5px solid ${uiPalette.reward}`,
    borderRadius: 8,
    textAlign: 'center',
  },
  newlyUnlockedLabel: {
    display: 'block',
    color: uiPalette.reward,
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 6,
  },
  newlyUnlockedItem: {
    color: uiPalette.paperLight,
    fontSize: 14,
    fontWeight: 800,
    margin: '2px 0',
  },
  newlyUnlockedHint: {
    color: uiPalette.mutedChalk,
    fontSize: 11,
    marginTop: 6,
  },
  weaponEncyclopediaBtn: {
    ...schoolButton('paper'),
    minHeight: 34,
    marginTop: 8,
    padding: '6px 10px',
    fontSize: 12,
  },
  // ── eraser icon (지우개 폭탄) ──
  eraserIcon: { position: 'relative', width: 36, height: 36 },
  eraserBody: {
    position: 'absolute', left: 3, top: 11,
    display: 'block', width: 30, height: 14,
    background: '#cea19d',
    border: '1.5px solid #111',
    borderRadius: 3, boxSizing: 'border-box',
  },
  eraserBand: {
    position: 'absolute', left: 3, top: 16,
    display: 'block', width: 30, height: 4,
    background: '#4f1b30',
    boxSizing: 'border-box',
  },
  choiceLabel: {
    fontSize: 13,
    fontWeight: uiType.weightHeavy,
    marginBottom: 2,
    lineHeight: 1.15,
    wordBreak: 'keep-all',
    overflowWrap: 'anywhere',
  },
  choiceDesc: {
    fontSize: 11,
    color: '#493f4d',
    lineHeight: 1.28,
    fontWeight: 700,
    wordBreak: 'keep-all',
    overflowWrap: 'anywhere',
  },
  restartBtn: {
    ...schoolButton('primary'),
    fontSize: 16,
    padding: '12px 32px',
  },
  matildaBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: uiBorders.strong,
    background: `linear-gradient(180deg, #ffe066 0%, ${uiPalette.reward} 100%)`,
    color: uiPalette.ink,
    fontSize: 18,
    fontWeight: uiType.weightHeavy,
    lineHeight: '36px',
    textAlign: 'center',
    pointerEvents: 'auto',
    cursor: 'pointer',
    boxShadow: uiShadows.pressSmall,
  },
  weaponCheatToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: uiBorders.strong,
    background: uiPalette.paper,
    color: uiPalette.ink,
    fontSize: 18,
    fontWeight: uiType.weightHeavy,
    lineHeight: '36px',
    textAlign: 'center',
    pointerEvents: 'auto',
    cursor: 'pointer',
    boxShadow: uiShadows.pressSmall,
  },
  weaponCheatPanel: {
    position: 'absolute',
    top: 62,
    left: 14,
    width: 302,
    maxHeight: '64vh',
    padding: 10,
    overflowY: 'auto',
    background: 'rgba(30, 24, 38, 0.96)',
    border: uiBorders.strong,
    borderRadius: 8,
    boxShadow: uiShadows.press,
    pointerEvents: 'auto',
    zIndex: 20,
  },
  weaponCheatTitle: {
    color: uiPalette.paperLight,
    fontSize: 14,
    fontWeight: uiType.weightHeavy,
    marginBottom: 8,
    textAlign: 'center',
  },
  weaponCheatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 8,
  },
  weaponCheatItem: {
    ...schoolButton('paper'),
    minWidth: 0,
    minHeight: 96,
    padding: '7px 4px',
    color: uiPalette.ink,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    cursor: 'pointer',
  },
  weaponCheatLabel: {
    fontSize: 10,
    fontWeight: uiType.weightHeavy,
    lineHeight: 1.15,
    wordBreak: 'keep-all',
    overflowWrap: 'anywhere',
  },
  nextStageBtn: {
    ...schoolButton('primary'),
    fontSize: 18,
    padding: '14px 34px',
    minWidth: 190,
  },
  titleBtn: {
    ...schoolButton('chalk'),
    fontSize: 15,
    padding: '11px 20px',
    boxShadow: uiShadows.pressSmall,
  },
  rankingBtn: {
    ...schoolButton('paper'),
    fontSize: 15,
    padding: '11px 20px',
    boxShadow: uiShadows.pressSmall,
  },
  shopBtn: {
    ...schoolButton('reward'),
    fontSize: 16,
    padding: '12px 22px',
  },
  modalButtons: {
    display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center',
    flexWrap: 'wrap',
  },
  resultButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultActionBtn: {
    width: 136,
    textAlign: 'center',
  },
  resultDevTools: {
    position: 'absolute',
    top: 72,
    right: 12,
    pointerEvents: 'auto',
  },
  devCopyBtn: {
    ...schoolButton('chalk'),
    fontSize: 12,
    padding: '8px 12px',
    boxShadow: uiShadows.pressSmall,
  },
  nextUnlock: {
    background: 'rgba(24,55,47,0.52)',
    border: `1.5px dashed ${uiPalette.reward}`,
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  nextUnlockLabel: {
    color: uiPalette.reward,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  nextUnlockBody: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  nextUnlockSilhouette: {
    filter: 'brightness(0.15) contrast(2)',
    opacity: 0.85,
  },
  nextUnlockText: {
    textAlign: 'left',
  },
  nextUnlockName: {
    color: uiPalette.paperLight,
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 2,
  },
  nextUnlockHint: {
    color: uiPalette.mutedChalk,
    fontSize: 12,
    marginTop: 2,
  },
  // ── 쓰러진 학생 대화창 ──
  dialogueCatcher: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '0 12px',
    paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
    pointerEvents: 'auto',
    cursor: 'pointer',
    zIndex: 30,
  },
  dialogueBox: {
    ...schoolPanel('dark'),
    width: '100%',
    maxWidth: 460,
    boxSizing: 'border-box',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'stretch',
    gap: 12,
    animation: 'studentDialoguePop 150ms ease-out',
    transformOrigin: 'center bottom',
  },
  dialoguePortraitFrame: {
    flexShrink: 0,
    width: 72,
    height: 72,
    borderRadius: 8,
    border: uiBorders.strong,
    background: 'rgba(24,55,47,0.92)',
    boxShadow: uiShadows.pressSmall,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  dialoguePortrait: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
    userSelect: 'none',
    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
  },
  dialogueTextCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 5,
  },
  dialogueName: {
    color: uiPalette.reward,
    fontSize: 13,
    fontWeight: uiType.weightHeavy,
    textShadow: `0 2px 0 ${uiPalette.ink}`,
  },
  dialogueLine: {
    color: uiPalette.paperLight,
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1.4,
    wordBreak: 'keep-all',
    overflowWrap: 'anywhere',
  },
  dialogueReward: {
    color: uiPalette.reward,
    fontSize: 12,
    fontWeight: uiType.weightHeavy,
  },
  dialogueHint: {
    color: uiPalette.mutedChalk,
    fontSize: 11,
    fontWeight: 700,
    marginTop: 2,
    opacity: 0.85,
  },
  // 인트로 전용 — 전체화면 딤 백드롭 + 중앙 정렬 내레이션 박스. 게임 화면을 확실히 가린다.
  introCatcher: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 16px',
    background: 'rgba(6,10,14,0.82)',
    pointerEvents: 'auto',
    cursor: 'pointer',
    zIndex: 40,
  },
  introBox: {
    ...schoolPanel('dark'),
    width: '100%',
    maxWidth: 460,
    boxSizing: 'border-box',
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    textAlign: 'center',
    animation: 'studentDialoguePop 150ms ease-out',
    transformOrigin: 'center',
  },
}
