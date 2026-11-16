// 신규 좀비 2차(novel2) 공격형의 행동 신호음 — 컴포넌트 층 전용(2026-11-17 soundmini).
//
// Enemies.jsx가 시뮬레이션 step + 이벤트 소비 직후, drainBallHits 전에 한 번 부른다.
// 풀과 novel2 런타임을 읽기만 하고 아무것도 쓰지 않는다 — 시뮬레이션·행동 라이브러리는 소리를 모른다
// (헤드리스 프로브·패리티 테스트 결과가 이 모듈과 무관하다). 슬롯마다 직전 상태만 기억하고,
// 상태가 바뀐 프레임(엣지)에만 낸다. 소리 선택·간격·창 예산·거리 감쇠는 enemyAbilitySfx.js가 소유한다.
// 스테이지 7~10용 종은 다루지 않는다(이 표의 종은 전부 스테이지 1~6).

import { MAX_ENEMIES } from './enemyEntityPool.js'
import {
  E89_CODE, E90_CODE, E91_CODE, E92_CODE, E95_CODE, E98_CODE, E100_CODE, E101_CODE, E102_CODE, E104_CODE, E106_CODE,
  N2_STATE_ATTACK, N2_STATE_RECOVER, N2_STATE_TELEGRAPH,
} from './novelZombie2Behavior.js'
import { cueNovel2AbilitySfx } from './enemyAbilitySfx.js'

const ID_BY_CODE = new Map([
  [E89_CODE, 'E89'], [E90_CODE, 'E90'], [E91_CODE, 'E91'], [E92_CODE, 'E92'], [E95_CODE, 'E95'], [E98_CODE, 'E98'],
  [E100_CODE, 'E100'], [E101_CODE, 'E101'], [E102_CODE, 'E102'], [E104_CODE, 'E104'], [E106_CODE, 'E106'],
])

// 슬롯별 직전 관측: 세대(-1 = 처음 본다), 상태, 종별 보조값(가방 권수·먹은 수·떡 단계·공 단계).
const _gen = new Int32Array(MAX_ENEMIES).fill(-1)
const _state = new Uint8Array(MAX_ENEMIES)
const _aux = new Uint8Array(MAX_ENEMIES)
let _pool = null

export function resetNovel2Sfx() {
  _gen.fill(-1)
  _state.fill(0)
  _aux.fill(0)
  _pool = null
}

function auxOf(type, rt, index, valid) {
  if (!valid) return 0
  if (type === E90_CODE) return rt.bagBooks[index]
  if (type === E98_CODE) return rt.eatCount[index]
  if (type === E100_CODE) return rt.mochiPhase[index]
  if (type === E104_CODE) return rt.ballPhase[index]
  return 0
}

/**
 * 이번 스텝의 novel2 상태 엣지를 소리로 바꾼다. rt = enemySimulationRuntime.novel2.
 * 같은 상태가 이어지는 프레임에는 아무것도 내지 않는다. throw하지 않는다(소리는 선택 사항).
 */
export function cueNovel2Transitions(pool, rt, playerX, playerZ) {
  try {
    if (!pool || !rt) return
    if (_pool !== pool) { resetNovel2Sfx(); _pool = pool }
    const highest = Math.min(pool.highestActive, MAX_ENEMIES - 1)
    for (let index = 0; index <= highest; index += 1) {
      if (pool.active[index] !== 1) continue
      const generation = pool.generation[index]
      const valid = rt.slotGen?.[index] === generation
      const firstSight = _gen[index] !== generation
      const type = pool.type[index]
      const id = ID_BY_CODE.get(type)
      if (firstSight) {
        _gen[index] = generation
        _state[index] = pool.state[index]
        _aux[index] = id ? auxOf(type, rt, index, valid) : 0
        // 복사기(E101)가 막 찍어 낸 복사본: 새 슬롯이 복사본이면 그 자리에서 '뿅'.
        if (valid && rt.copyOwner?.[index] >= 0) cueNovel2AbilitySfx('E101', 'copy', pool.posX[index], pool.posZ[index], playerX, playerZ)
        continue
      }
      if (!id) continue
      const prev = _state[index]
      const state = pool.state[index]
      const prevAux = _aux[index]
      const aux = auxOf(type, rt, index, valid)
      _state[index] = state
      _aux[index] = aux
      if (prev === state && prevAux === aux) continue
      const x = pool.posX[index]
      const z = pool.posZ[index]
      const enteredTelegraph = state === N2_STATE_TELEGRAPH && prev !== N2_STATE_TELEGRAPH
      const struck = state === N2_STATE_ATTACK && prev === N2_STATE_TELEGRAPH
      if (type === E90_CODE) {
        if (aux > prevAux) cueNovel2AbilitySfx(id, 'pickup', x, z, playerX, playerZ)
      } else if (type === E89_CODE) {
        if (enteredTelegraph) cueNovel2AbilitySfx(id, 'telegraph', x, z, playerX, playerZ)
        else if (state === N2_STATE_RECOVER && prev === N2_STATE_TELEGRAPH) cueNovel2AbilitySfx(id, 'hit', x, z, playerX, playerZ)
      } else if (type === E100_CODE) {
        if (aux !== prevAux) {
          if (aux === 1) cueNovel2AbilitySfx(id, 'telegraph', x, z, playerX, playerZ)
          else if (aux === 2) cueNovel2AbilitySfx(id, 'leap', x, z, playerX, playerZ)
          else if (aux === 3) cueNovel2AbilitySfx(id, 'cling', x, z, playerX, playerZ)
        }
      } else if (type === E104_CODE) {
        if (enteredTelegraph) cueNovel2AbilitySfx(id, 'telegraph', x, z, playerX, playerZ)
        if (aux !== prevAux) {
          if (aux === 2) cueNovel2AbilitySfx(id, 'roll', rt.ballX[index], rt.ballZ[index], playerX, playerZ)
          else if (aux === 3 && prevAux === 2) cueNovel2AbilitySfx(id, 'impact', rt.ballX[index], rt.ballZ[index], playerX, playerZ)
        }
      } else if (type === E101_CODE) {
        if (enteredTelegraph) cueNovel2AbilitySfx(id, valid && rt.copierMode[index] === 1 ? 'scan' : 'telegraph', x, z, playerX, playerZ)
        else if (struck) cueNovel2AbilitySfx(id, 'hit', x, z, playerX, playerZ)
      } else if (type === E102_CODE) {
        if (enteredTelegraph) cueNovel2AbilitySfx(id, 'telegraph', x, z, playerX, playerZ)
        else if (struck) cueNovel2AbilitySfx(id, 'glide', x, z, playerX, playerZ)
      } else {
        // E91·E92·E95·E98·E106: 예고 진입 / 예고 → 판정.
        // E106은 기수만(말 셋은 기수 상태를 따라 해 같은 엣지가 넷이 된다), 낙마한 기수는 공격하지 않는다.
        if (type === E106_CODE && !(valid && rt.cavRole[index] === 1 && !rt.cavSolo[index])) continue
        if (enteredTelegraph) cueNovel2AbilitySfx(id, 'telegraph', x, z, playerX, playerZ)
        else if (struck) cueNovel2AbilitySfx(id, 'hit', x, z, playerX, playerZ)
        if (type === E98_CODE && aux > prevAux) cueNovel2AbilitySfx(id, 'gulp', x, z, playerX, playerZ)
      }
    }
    // E104 공이 이번 스텝에 친 좀비([index, generation, damage, x, z] 다섯 개씩, drainBallHits 전에 읽는다): 첫 타만 낸다.
    const hits = rt.ballHits
    if (hits && hits.length >= 5) cueNovel2AbilitySfx('E104', 'impact', hits[3], hits[4], playerX, playerZ)
  } catch {
    // 소리 때문에 프레임이 끊기면 안 된다.
  }
}
