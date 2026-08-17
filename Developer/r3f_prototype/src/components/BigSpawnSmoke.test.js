// 큰 몬스터 3D 스폰 연기(2026-08-17). 빌보드를 크게 늘리면 허접해 보여서 큰 개체만
// 반투명 흰 구 뭉치로 바꿨다. 여기서 고정하는 건 두 가지다:
//   1) 어느 몬스터가 3D로 가는가 (경계가 흔들리면 같은 몬스터가 스폰마다 달라 보인다)
//   2) 어느 쪽으로 갈라지든 스폰 연출 계약(펑 선행 → 300ms 불투명 → 리빌)이 동일한가
import { describe, expect, it } from 'vitest'
import {
  BIG_SPAWN_SMOKE_MIN_VISUAL_SCALE,
  BigSpawnSmokeEffect,
  ENEMY_SIZE_MULTIPLIER,
  ENEMY_SPAWN_REVEAL_DELAY_MS,
  ENEMY_STATS,
  SPAWN_SMOKE_DURATION_MS,
  SpawnSmokeEffect,
  getSpawnSmokeOpacity,
  isBigSpawnSmoke,
} from './Enemy.jsx'

// Enemy.jsx 호출부: <SpawnSmokeEffect visualScale={cs * 0.333} />, cs = scale * ENEMY_SIZE_MULTIPLIER
const visualScaleOf = (type) => ENEMY_STATS[type].scale * ENEMY_SIZE_MULTIPLIER * 0.333

describe('큰 몬스터 스폰 연기 분기', () => {
  it('보스와 대형 잡몹만 3D 연기로 간다', () => {
    for (const type of ['B01', 'B02', 'B03', 'B04', 'E06', 'RZT']) {
      expect(isBigSpawnSmoke(visualScaleOf(type))).toBe(true)
    }
  })

  it('작은 좀비는 기존 빌보드를 그대로 쓴다', () => {
    for (const type of ['E01', 'E02', 'E03', 'E04', 'E05', 'E07', 'RZL', 'RZC', 'RZG']) {
      expect(isBigSpawnSmoke(visualScaleOf(type))).toBe(false)
    }
  })

  // 경계가 실제 몬스터 값 사이의 빈 구간에 있어야 반올림 오차로 갈라지지 않는다.
  it('임계값이 어떤 몬스터의 크기와도 겹치지 않는다', () => {
    const scales = Object.keys(ENEMY_STATS).map(visualScaleOf)
    const below = Math.max(...scales.filter((s) => s < BIG_SPAWN_SMOKE_MIN_VISUAL_SCALE))
    const above = Math.min(...scales.filter((s) => s >= BIG_SPAWN_SMOKE_MIN_VISUAL_SCALE))

    expect(BIG_SPAWN_SMOKE_MIN_VISUAL_SCALE - below).toBeGreaterThan(0.05)
    expect(above - BIG_SPAWN_SMOKE_MIN_VISUAL_SCALE).toBeGreaterThan(0.005)
  })

  it('visualScale이 없어도 빌보드로 떨어진다 (연기 없는 스폰 금지)', () => {
    expect(isBigSpawnSmoke(undefined)).toBe(false)
    expect(isBigSpawnSmoke(0)).toBe(false)
    expect(typeof SpawnSmokeEffect).toBe('function')
    expect(typeof BigSpawnSmokeEffect).toBe('function')
  })
})

describe('연출 계약은 두 구현이 공유한다', () => {
  // 3D 연기도 이 함수와 이 수명을 그대로 쓴다 — 여기가 바뀌면 양쪽이 같이 바뀐다.
  it('앞 300ms는 완전 불투명하다 (좀비를 가린 채 리빌)', () => {
    expect(ENEMY_SPAWN_REVEAL_DELAY_MS).toBe(300)
    expect(getSpawnSmokeOpacity(0)).toBe(1)
    expect(getSpawnSmokeOpacity(ENEMY_SPAWN_REVEAL_DELAY_MS)).toBe(1)
  })

  it('리빌 딜레이 이후 페이드아웃해 수명 끝에 0이 된다', () => {
    expect(getSpawnSmokeOpacity(ENEMY_SPAWN_REVEAL_DELAY_MS + 1)).toBeLessThan(1)
    expect(getSpawnSmokeOpacity(SPAWN_SMOKE_DURATION_MS)).toBe(0)
    expect(SPAWN_SMOKE_DURATION_MS).toBeGreaterThan(ENEMY_SPAWN_REVEAL_DELAY_MS)
  })
})
