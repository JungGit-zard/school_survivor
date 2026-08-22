// 적 사망 효과음 디스패치 정본.
//
// 예전에는 Enemy.jsx의 로컬 deathSfxId()와 Enemies.jsx의 인라인 삼항식이 같은 규칙을
// 따로 들고 있었다(둘 다 'E06/E02면 heavy, 아니면 일반'). 풀링 렌더 경로와 개별 렌더
// 경로가 서로 다른 소리를 내는 사고가 나기 딱 좋은 구조라, 이 파일 하나로 합쳤다.
//
// 좀비 사망음은 "발성"이다 — 기계음이 아니라 신음/비명으로 들려야 한다.
// 8비트 시대 음성 합성 기법(TMS5220 LPC / SAM 3포먼트 / NES DPCM 열화)으로 합성했고,
// 생성기는 scripts/generate_zombie_death_voices.mjs 하나뿐이다(재현 가능, 시드 고정).
//
// 5종 배분 기준은 "덩치와 속도" 두 축이다. 플레이어가 화면을 안 봐도 무엇이 죽었는지
// 소리만으로 구분되게 하려면 기본 피치대가 겹치면 안 된다.
//   bellow(F0 74→45) < heavy(92→56) < grunt(136→92) < gurgle(152→100) < shriek(300→238)

import { isBossType } from './burstEvents.js'

// 사망 발성 ID. 값은 sfxRegistry SOUND_MAP 키와 1:1이다.
export const ZOMBIE_DEATH_SFX_IDS = Object.freeze([
  'zombieDeathGrunt',
  'zombieDeathHeavy',
  'zombieDeathShriek',
  'zombieDeathGurgle',
  'zombieDeathBellow',
])

// 타입 → 발성. 여기 없는 좀비 타입은 기본 잡몹 신음으로 떨어진다.
export const ENEMY_DEATH_SFX_BY_TYPE = Object.freeze({
  // "으윽" — 평범한 잡몹. 짧고 건조한 신음.
  E01: 'zombieDeathGrunt',
  E07: 'zombieDeathGrunt', // 웃는얼굴 = E01의 2배 스탯이지만 체격은 동일
  RZG: 'zombieDeathGrunt', // 스테이지2 경비 좀비(scale 0.92)

  // "우어억" — 덩치·차저 계열. 낮고 길고 축 늘어진 웨블.
  E02: 'zombieDeathHeavy', // 뚱뚱이(scale 1.40)
  E05: 'zombieDeathHeavy', // 차저(hp 70, 돌진)
  RZT: 'zombieDeathHeavy', // 트렌치코트 도주 좀비(scale 1.76)

  // "끼야악" — 빠른 놈들. 높고 짧고 날카로운 비명.
  E03: 'zombieDeathShriek', // 러너(speed 1.21, scale 0.75)
  RZL: 'zombieDeathShriek', // 런좀비 크루 리더(speed 2.695)
  RZC: 'zombieDeathShriek', // 런좀비 크루원(speed 2.398, scale 0.78)

  // "커르륵" — 원거리 침 뱉는 놈. 목 가르랑거림(26Hz 진동음) + 최고 노이즈 비율.
  E04: 'zombieDeathGurgle',

  // "끄아아앙" — 거대 좀비 단독. 최저 피치 + 링모드 부화음 + 비음 받침.
  // E06에만 주는 이유: 유일하게 hp 320/scale 1.60인 준보스급이라 죽는 순간이 사건이다.
  // 여러 타입에 나눠주면 "가장 큰 놈이 죽었다"는 신호가 희석된다.
  E06: 'zombieDeathBellow',
})

export const DEFAULT_ZOMBIE_DEATH_SFX = 'zombieDeathGrunt'

/**
 * 적 하나가 죽을 때 재생할 사운드 ID를 고른다.
 * 마틸다 > 보스 > 좀비 타입별 발성 순으로 우선한다.
 */
export function deathSfxId(type, isMatilda = false) {
  if (isMatilda) return 'matildaDeath'
  if (isBossType(type)) return 'bossDeath'
  return ENEMY_DEATH_SFX_BY_TYPE[type] ?? DEFAULT_ZOMBIE_DEATH_SFX
}
