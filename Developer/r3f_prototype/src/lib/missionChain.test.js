import { describe, expect, it } from 'vitest'
import {
  MISSION_BY_ID,
  MISSION_CATALOG,
  MISSION_CATALOG_VERSION,
  MISSION_CHAIN_PREREQUISITES,
  MISSION_CHAIN_START_IDS,
  MISSION_CHAIN_UNLOCKS,
} from './missionCatalog.js'
import {
  countClaimableVisibleMissions,
  createMissionProgressState,
  getVisibleMissionIds,
  isMissionVisible,
  reconcileMissionProgress,
} from './missionProgress.js'

const claimedOf = (ids) => Object.fromEntries(ids.map((id) => [id, { claimedAt: '2026-11-21T00:00:00.000Z' }]))
const progressWith = ({ counters = {}, claimed = [] } = {}) => reconcileMissionProgress(createMissionProgressState({ counters, claimed: claimedOf(claimed) }))

describe('mission chain', () => {
  it('keeps the catalog version and every chain id inside the 32-mission catalog', () => {
    expect(MISSION_CATALOG_VERSION).toBe('missions_2026_08_15_v1')
    expect(MISSION_CATALOG).toHaveLength(32)
    const ids = [...MISSION_CHAIN_START_IDS, ...Object.keys(MISSION_CHAIN_UNLOCKS), ...Object.values(MISSION_CHAIN_UNLOCKS).flat()]
    for (const id of ids) expect(MISSION_BY_ID[id], id).toBeTruthy()
  })

  it('shows only the four start missions to a fresh account', () => {
    expect(getVisibleMissionIds(progressWith())).toEqual(MISSION_CATALOG.filter((mission) => MISSION_CHAIN_START_IDS.includes(mission.id)).map((mission) => mission.id))
    expect(new Set(MISSION_CHAIN_START_IDS)).toEqual(new Set(['first_xp_textbook', 'first_levelup_choice', 'first_stage1_30_seconds', 'first_e01_kills']))
  })

  it('completing alone does not reveal; claiming reveals the next missions', () => {
    const completed = progressWith({ counters: { 'pickup.xpTextbook.count': 1 } })
    expect(isMissionVisible(completed, 'e07_recognition')).toBe(false)
    const claimed = progressWith({ counters: { 'pickup.xpTextbook.count': 1 }, claimed: ['first_xp_textbook'] })
    expect(isMissionVisible(claimed, 'e07_recognition')).toBe(true)
    expect(isMissionVisible(claimed, 'lunch_secured')).toBe(true)
    expect(isMissionVisible(claimed, 'first_gold_coin')).toBe(false)
  })

  it('opens a mission with several prerequisites when any one of them is claimed', () => {
    expect(MISSION_CHAIN_PREREQUISITES.weapon_level_five).toEqual(expect.arrayContaining(['school_bag_pushback', 'tumbler_orbit']))
    expect(isMissionVisible(progressWith({ claimed: ['tumbler_orbit'] }), 'weapon_level_five')).toBe(true)
    expect(isMissionVisible(progressWith({ claimed: ['school_bag_pushback'] }), 'weapon_level_five')).toBe(true)
  })

  it('keeps a mission claimed out of order visible', () => {
    const progress = progressWith({ claimed: ['stage4_escape'] })
    expect(isMissionVisible(progress, 'stage4_escape')).toBe(true)
    expect(isMissionVisible(progress, 'stage3_escape')).toBe(false)
  })

  it('reaches all 32 missions by claiming along the chain', () => {
    const claimed = new Set()
    let visible = new Set(getVisibleMissionIds(progressWith()))
    for (let guard = 0; guard < 40; guard += 1) {
      const next = [...visible].find((id) => !claimed.has(id))
      if (!next) break
      claimed.add(next)
      visible = new Set(getVisibleMissionIds(progressWith({ claimed: [...claimed] })))
    }
    expect(visible.size).toBe(32)
    expect(claimed.size).toBe(32)
  })

  it('chains stage4_escape -> stage5_escape -> stage6_escape', () => {
    expect(MISSION_CHAIN_PREREQUISITES.stage5_escape).toEqual(['stage4_escape'])
    expect(MISSION_CHAIN_PREREQUISITES.stage6_escape).toEqual(['stage5_escape'])
    expect(isMissionVisible(progressWith({ claimed: ['stage3_escape'] }), 'stage5_escape')).toBe(false)
    const after4 = progressWith({ claimed: ['stage3_escape', 'stage4_escape'] })
    expect(isMissionVisible(after4, 'stage5_escape')).toBe(true)
    expect(isMissionVisible(after4, 'stage6_escape')).toBe(false)
    expect(isMissionVisible(progressWith({ claimed: ['stage3_escape', 'stage4_escape', 'stage5_escape'] }), 'stage6_escape')).toBe(true)
  })

  it('counts only visible completed-unclaimed missions for the lobby badge', () => {
    // 교과서(시작) 완료 1 + 골드 코인(숨김) 완료는 세지 않는다.
    const progress = progressWith({ counters: { 'pickup.xpTextbook.count': 1, 'pickup.goldCoin.count': 1 } })
    expect(countClaimableVisibleMissions(progress)).toBe(1)
    expect(countClaimableVisibleMissions(progressWith({ counters: { 'pickup.xpTextbook.count': 1 }, claimed: ['first_xp_textbook'] }))).toBe(0)
  })
})
