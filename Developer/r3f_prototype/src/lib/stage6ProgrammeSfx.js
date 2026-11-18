// Stage 6 운동회 순서표 소리(2026-11-19 soundmini, 지루함 해결 기획서 2번 + 5번).
//
// Enemies.jsx가 시뮬레이션 step 직후(cueNovel2Transitions 옆) 매 고정 스텝 한 번 부른다. 그 프레임은
// 'playing'일 때만 돌므로(usePlayingFrame) 일시정지·레벨업·대화·사망·클리어 중에는 아무 소리도 내지 않는다.
// 판정은 전부 게임 시계(getRuntimeElapsedMs / 1000)의 엣지로 한다 — 벽시계·타이머 없음.
// 판 다시 시작(gameKey 변경)이나 시계 되감기면 상태를 0초부터 다시 잡는다: 첫 항목(개회식 5초)을 빠뜨리거나
// 두 번 내지 않는다. 같은 스텝에 여러 항목이 지나가면(따라잡기) 마지막 항목 안내만 한 번 낸다.
// BGM은 Howler 밖 <audio>라 이 소리들이 멈추거나 줄이지 않는다(위에 얹기만).

import { emitSfx } from './sfxEvents.js'
import { STAGE6_CELEBRATION_MOMENTS, STAGE6_PROGRAMME, STAGE6_PROGRAMME_STAGE_ID, getStage6ProgrammeEntriesStartedBetween } from './stage6Programme.js'
import { enemyTypeToCode } from './enemyEntityPool.js'

const E104_CODE = enemyTypeToCode(STAGE6_CELEBRATION_MOMENTS.chiefDown.chiefType)

// 종목 안내 방송: 같은 음원을 항목 순번으로 rate 3종 돌려 쓴다(13항목이 똑같이 들리지 않게, ±6% = 약 1반음).
export const STAGE6_ANNOUNCE_SFX = Object.freeze({ id: 'stage6ProgAnnounce', volume: 0.32, rates: Object.freeze([1, 1.06, 0.94]) })

// 축하 순간 → 겹 소리(같은 프레임에 함께 낸다). 볼륨은 개그 행동음 표(0.22~0.42)와 같은 대.
export const STAGE6_CELEBRATION_SFX = Object.freeze({
  // 한 번에 여러 마리: 스탠드 함성.
  multiKill: Object.freeze([Object.freeze({ id: 'stage6CrowdCheer', volume: 0.3, rate: 1 })]),
  // 공굴리기 대장 처치: 북 연타 + 심벌.
  chiefDown: Object.freeze([Object.freeze({ id: 'stage6DrumRollHit', volume: 0.38, rate: 1 })]),
  // 교장 처치: 보스 징글(bossClearJingle, 스토어가 낸다) 아래에 함성만 한 겹.
  bossDown: Object.freeze([Object.freeze({ id: 'stage6CrowdCheer', volume: 0.34, rate: 0.95 })]),
  // 결승 테이프: 호루라기(계주 음원 재사용, 살짝 높게) + 함성. phase 'cleared'라 이 프레임 경로 밖 — threemini 테이프 훅이 부른다.
  finishTape: Object.freeze([
    Object.freeze({ id: 'stage6RelayWhistle', volume: 0.26, rate: 1.1 }),
    Object.freeze({ id: 'stage6CrowdCheer', volume: 0.36, rate: 1.05 }),
  ]),
})

const MULTI = STAGE6_CELEBRATION_MOMENTS.multiKill

let _gameKey
let _prevSec = 0
let _active = false
let _kills = 0
let _chiefs = 0
let _bossDefeated = false
let _killTimes = []
let _cheerReadySec = 0

export function resetStage6ProgrammeSfx() {
  _gameKey = undefined
  _prevSec = 0
  _active = false
  _kills = 0
  _chiefs = 0
  _bossDefeated = false
  _killTimes = []
  _cheerReadySec = 0
}

function emitLayers(layers) {
  for (const layer of layers) emitSfx({ id: layer.id, volume: layer.volume, rate: layer.rate })
}

/** 결승 테이프 등 이 프레임 경로 밖의 축하 순간. moment = STAGE6_CELEBRATION_SFX의 키. throw하지 않는다. */
export function cueStage6Celebration(moment) {
  try {
    const layers = STAGE6_CELEBRATION_SFX[moment]
    if (!layers) return false
    emitLayers(layers)
    return true
  } catch {
    return false
  }
}

function countChiefs(pool) {
  if (!pool || !Number.isInteger(E104_CODE) || E104_CODE <= 0) return 0
  let count = 0
  const highest = Math.min(pool.highestActive ?? -1, pool.active.length - 1)
  for (let index = 0; index <= highest; index += 1) if (pool.active[index] === 1 && pool.type[index] === E104_CODE) count += 1
  return count
}

/**
 * 매 고정 스텝 1회. stageId·gameKey = stageRuntime, sec = 게임 시계(초), pool = enemyPool,
 * store = useGameStore.getState()(runKills·bossDefeated만 읽는다). 이번 스텝에 낸 안내 항목(없으면 null)을 돌려준다.
 */
export function cueStage6Programme(stageId, gameKey, sec, pool, store, programme = STAGE6_PROGRAMME) {
  try {
    if (stageId !== STAGE6_PROGRAMME_STAGE_ID || !Number.isFinite(sec)) { _active = false; return null }
    const kills = Number(store?.runKills) || 0
    const chiefs = countChiefs(pool)
    const bossDefeated = store?.bossDefeated === true
    if (!_active || gameKey !== _gameKey || sec < _prevSec) {
      // 새 판·새 스테이지 진입·시계 되감기: 0초부터 다시 센다. 처치·대장·보스 기준선은 지금 값으로(축하를 잘못 내지 않게).
      _active = true
      _gameKey = gameKey
      _prevSec = 0
      _kills = kills
      _chiefs = chiefs
      _bossDefeated = bossDefeated
      _killTimes = []
      _cheerReadySec = 0
    }
    const started = getStage6ProgrammeEntriesStartedBetween(_prevSec, sec, programme)
    _prevSec = sec
    let announced = null
    if (started.length) {
      announced = started[started.length - 1]
      const rates = STAGE6_ANNOUNCE_SFX.rates
      const rate = rates[Math.max(0, programme.indexOf(announced)) % rates.length]
      emitSfx({ id: STAGE6_ANNOUNCE_SFX.id, volume: STAGE6_ANNOUNCE_SFX.volume, rate })
    }

    if (chiefs < _chiefs) emitLayers(STAGE6_CELEBRATION_SFX.chiefDown)
    _chiefs = chiefs
    if (bossDefeated && !_bossDefeated) emitLayers(STAGE6_CELEBRATION_SFX.bossDown)
    _bossDefeated = bossDefeated

    // 한 번에 여러 마리: windowMs 안 minKills 마리 이상, cooldownMs 동안 한 번(게임 시계).
    if (kills > _kills) {
      for (let k = _kills; k < kills && _killTimes.length < 64; k += 1) _killTimes.push(sec)
      const from = sec - MULTI.windowMs / 1000
      _killTimes = _killTimes.filter((t) => t >= from)
      if (_killTimes.length >= MULTI.minKills && sec >= _cheerReadySec) {
        emitLayers(STAGE6_CELEBRATION_SFX.multiKill)
        _cheerReadySec = sec + MULTI.cooldownMs / 1000
        _killTimes = []
      }
    }
    _kills = kills
    return announced
  } catch {
    return null
  }
}
