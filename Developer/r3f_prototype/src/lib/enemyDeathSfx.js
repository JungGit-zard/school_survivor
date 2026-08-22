// 적 사망 효과음 디스패치 정본.
//
// Enemy.jsx의 개별 렌더 경로와 Enemies.jsx의 풀링 렌더 경로가 같은 규칙을 쓰도록
// 이 파일 하나로 합친다.
//
// Terry correction 2026-08-22:
// 일반 좀비 사망음은 좀비 종/타입별로 고정 배정하지 않는다. "죽음"이라는 행동 포인트에
// 맞는 모든 좀비 사망 발성을 하나의 풀로 두고, 매 사망 이벤트마다 무작위로 섞어 재생한다.
// 목적은 웨이브가 한꺼번에 녹을 때 같은 타입/같은 발성만 반복되지 않고 여러 음성이 섞여
// 들리게 하는 것이다. 타입별 정체성 큐가 필요한 특수 적은 별도 행동 풀/예외로만 둔다.
//
// 좀비 사망음은 "발성"이다 — 기계음이 아니라 신음/비명으로 들려야 한다.
// 8비트 시대 음성 합성 기법(TMS5220 LPC / SAM 3포먼트 / NES DPCM 열화)으로 합성했고,
// 생성기는 scripts/generate_zombie_death_voices.mjs 하나뿐이다(재현 가능, 시드 고정).

import { isBossType } from './burstEvents.js'

// 사망 발성 ID. 값은 sfxRegistry SOUND_MAP 키와 1:1이다.
// 순서는 랜덤 선택 테스트와 사람이 읽는 목록을 위해 안정적으로 유지한다.
export const ZOMBIE_DEATH_SFX_IDS = Object.freeze([
  'zombieDeathGrunt',
  'zombieDeathHeavy',
  'zombieDeathShriek',
  'zombieDeathGurgle',
  'zombieDeathBellow',
])

export const DEFAULT_ZOMBIE_DEATH_SFX = ZOMBIE_DEATH_SFX_IDS[0]

function normalizeRandomIndex(randomValue, poolLength) {
  if (!Number.isFinite(randomValue)) return 0
  const clamped = Math.min(Math.max(randomValue, 0), 0.999999999)
  return Math.floor(clamped * poolLength)
}

/**
 * 일반 좀비가 죽을 때 공유 사망음 풀에서 하나를 고른다.
 * rng는 테스트/결정적 시뮬레이션용 주입점이며 기본값은 Math.random이다.
 */
export function randomZombieDeathSfxId(rng = Math.random) {
  const randomValue = typeof rng === 'function' ? rng() : Math.random()
  return ZOMBIE_DEATH_SFX_IDS[normalizeRandomIndex(randomValue, ZOMBIE_DEATH_SFX_IDS.length)]
}

/**
 * 적 하나가 죽을 때 재생할 사운드 ID를 고른다.
 * 마틸다/보스는 특수 사망음, 일반 좀비는 타입과 무관하게 죽음 행동 포인트 풀에서 랜덤.
 */
export function deathSfxId(type, isMatilda = false, rng = Math.random) {
  if (isMatilda) return 'matildaDeath'
  if (isBossType(type)) return 'bossDeath'
  return randomZombieDeathSfxId(rng)
}
