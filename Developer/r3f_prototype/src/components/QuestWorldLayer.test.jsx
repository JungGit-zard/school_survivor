import { beforeEach, describe, expect, it } from 'vitest'
import {
  getQuestFallbackPosition,
  getQuestNoticeMarkerPosition,
  getQuestNoticeMarkers,
  getQuestSurfacePosition,
  getQuestTargetPosition,
  getQuestWorldInteraction,
  isQuestInteractionInRange,
  markQuestActionHandled,
  QUEST_ITEM_STYLE,
  resolveQuestTargetPlacement,
} from './QuestWorldLayer.jsx'
import {
  findQuestByGiverPlacementId,
  getQuestGiverInteraction,
  shouldSkipGenericInvestigationReward,
} from './StudentDialogueTrigger.jsx'
import { getStageQuestDefinitions } from '../lib/quests.js'
import { getStageBounds } from '../lib/stageConfig.js'
import { commitFirebaseStudioRuntime } from '../lib/studioRuntimeState.js'
import { getStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'

beforeEach(() => {
  commitFirebaseStudioRuntime({ propPlacements: {} }, { revision: 0 })
})

describe('quest world placement resolution', () => {
  it('finds both quest givers in every stage, including Stage 2 copy ids', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const quests = getStageQuestDefinitions(stageId)
      const students = getStageObjectPlacements(stageId)
        .filter(({ type }) => ['unconsciousStudent', 'classPresidentStudent'].includes(type))

      expect(quests).toHaveLength(2)
      for (const quest of quests) {
        expect(students.some(({ id }) => findQuestByGiverPlacementId([quest], id) === quest)).toBe(true)
      }
    }
  })

  it('resolves all eight quest items to an authored stage prop', () => {
    for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) {
      const placements = getStageObjectPlacements(stageId)
      for (const quest of getStageQuestDefinitions(stageId)) {
        const target = getQuestTargetPosition(stageId, quest.id, quest.itemTarget, placements)
        expect(target.placement, quest.id).not.toBeNull()
        expect(target.sourceId, quest.id).toBe(target.placement.id)
      }
    }
  })

  it('resolves a Stage 2 completion giver copy and preserves its raw source id', () => {
    const quest = getStageQuestDefinitions('stage2')[0]
    const placements = getStageObjectPlacements('stage2')
    const copy = placements.find(({ id }) => id.startsWith(`${quest.completion.placementId}-copy-`))

    expect(copy).toBeDefined()
    expect(resolveQuestTargetPlacement(quest.completion, placements)).toBe(copy)
    expect(getQuestTargetPosition('stage2', quest.id, quest.completion, placements).sourceId).toBe(copy.id)
  })

  it('keeps the speech book on the reachable surface of the designated middle desk', () => {
    const quest = getStageQuestDefinitions('stage1').find(({ id }) => id === 'stage1-talk-book')
    const desk = getStageObjectPlacements('stage1').find(({ id }) => id === 'stage1-desk-mid-02')
    const target = getQuestTargetPosition('stage1', quest.id, quest.itemTarget, [desk])

    expect(target.sourceId).toBe('stage1-desk-mid-02')
    expect(target.position).toEqual(getQuestSurfacePosition(desk, [0.54, 0.89, 0.24]))
    expect(target.position[1]).toBeGreaterThan(0.7)
    expect(target.rotationY).toBe(desk.rotation[1])
  })

  it('transforms surface targets by the placement yaw and scale', () => {
    const placement = { id: 'desk', position: [10, 1, 20], rotation: [0, Math.PI / 2, 0], scale: [2, 3, 4] }

    expect(getQuestSurfacePosition(placement, [1, 2, 3])).toEqual([22, 7, 18])
  })

  it('uses the layered red-book visual specification for the speech book', () => {
    expect(QUEST_ITEM_STYLE['red-book']).toEqual({ color: 0xc92f38, shape: 'red-book' })
  })


  it('places quest notice markers directly above the giver or completion target', () => {
    const [quest] = getStageQuestDefinitions('stage1')
    const placements = getStageObjectPlacements('stage1')
    const giver = placements.find(({ id }) => id === quest.giver.placementId)
    const marker = getQuestNoticeMarkerPosition('stage1', quest.id, quest.giver, placements)

    expect(marker.sourceId).toBe(giver.id)
    expect(marker.position[0]).toBe(giver.position[0])
    expect(marker.position[2]).toBe(giver.position[2])
    expect(marker.position[1]).toBeGreaterThan(giver.position[1] + 1)
  })

  it('emits blinking notice marker states for available starts and return/install targets', () => {
    const [firstQuest, secondQuest] = getStageQuestDefinitions('stage1')
    const markers = getQuestNoticeMarkers('stage1', [firstQuest, secondQuest], {
      [firstQuest.id]: { status: 'undiscovered' },
      [secondQuest.id]: { status: 'item-acquired', itemHeld: true },
    }, getStageObjectPlacements('stage1'))

    expect(markers).toHaveLength(2)
    expect(markers[0]).toMatchObject({ kind: 'available', symbol: '!' })
    expect(markers[1]).toMatchObject({ kind: 'return', symbol: '?' })
    expect(markers.every(({ target }) => target.position[1] > 1)).toBe(true)
  })

  it('uses type and fallback types when an exact Firebase placement is absent', () => {
    const placements = [
      { id: 'fallback-cart', type: 'corridorJanitorCart', position: [2, 0, 3], scale: 1 },
    ]
    const target = { placementId: 'removed-locker', type: 'corridorLockerBank', fallbackTypes: ['corridorJanitorCart'] }

    expect(resolveQuestTargetPlacement(target, placements)).toBe(placements[0])
  })

  it('keeps a missing target fallback inside the active stage bounds', () => {
    const position = getQuestFallbackPosition('stage4', 'missing-item')
    const { halfX, halfZ } = getStageBounds('stage4')

    expect(Math.abs(position[0])).toBeLessThan(halfX)
    expect(Math.abs(position[2])).toBeLessThan(halfZ)
  })
})

describe('quest world interactions', () => {
  it('includes the interaction boundary and excludes the next point outside it', () => {
    expect(isQuestInteractionInRange(0.82, 0, [0, 0, 0])).toBe(true)
    expect(isQuestInteractionInRange(0.821, 0, [0, 0, 0])).toBe(false)
  })

  it('returns collect and return/install completion actions only for their matching state', () => {
    const collectQuest = { id: 'collect', item: { visualKind: 'book' }, completion: { kind: 'return' } }
    const returnQuest = { id: 'return', item: { visualKind: 'key' }, completion: { kind: 'return' } }
    const installQuest = { id: 'install', item: { visualKind: 'fuse' }, completion: { kind: 'install' } }
    const itemTargets = [{ quest: collectQuest, target: { position: [0, 0, 0], sourceId: 'collect:prop' } }]
    const completionTargets = [
      { quest: returnQuest, target: { position: [1, 0, 0], sourceId: 'return:giver-copy' } },
      { quest: installQuest, target: { position: [2, 0, 0], sourceId: 'install:board' } },
    ]

    expect(getQuestWorldInteraction({
      playerX: 0,
      playerZ: 0,
      itemTargets,
      completionTargets,
      questProgress: { collect: { status: 'active' }, return: { status: 'active' }, install: { status: 'active' } },
    })).toMatchObject({ type: 'collect', quest: { id: 'collect' } })
    expect(getQuestWorldInteraction({
      playerX: 1,
      playerZ: 0,
      itemTargets,
      completionTargets,
      questProgress: { collect: { status: 'item-acquired' }, return: { status: 'item-acquired' }, install: { status: 'item-acquired' } },
    })).toMatchObject({ type: 'complete', quest: { id: 'return' }, target: { sourceId: 'return:giver-copy' } })
    expect(getQuestWorldInteraction({
      playerX: 2,
      playerZ: 0,
      itemTargets,
      completionTargets,
      questProgress: { collect: { status: 'item-acquired' }, return: { status: 'item-acquired' }, install: { status: 'item-acquired' } },
    })).toMatchObject({ type: 'complete', quest: { id: 'install' } })
  })

  it('marks an action handled only after a successful store action, allowing a retry', () => {
    const handledIds = new Set()

    expect(markQuestActionHandled(handledIds, 'item:book', false)).toBe(false)
    expect(handledIds.has('item:book')).toBe(false)
    expect(markQuestActionHandled(handledIds, 'item:book', true)).toBe(true)
    expect(handledIds.has('item:book')).toBe(true)
  })

  it('starts only undiscovered givers and prevents active givers from generic rewards', () => {
    const returnQuest = { id: 'return', completion: { kind: 'return' } }

    expect(getQuestGiverInteraction(returnQuest, { status: 'undiscovered' })).toMatchObject({ type: 'start' })
    expect(getQuestGiverInteraction(returnQuest, { status: 'active' })).toBeNull()
    expect(getQuestGiverInteraction(returnQuest, { status: 'item-acquired' })).toBeNull()
    expect(getQuestGiverInteraction(returnQuest, { status: 'completed' })).toBeNull()
    expect(shouldSkipGenericInvestigationReward(returnQuest)).toBe(true)
    expect(shouldSkipGenericInvestigationReward(null)).toBe(false)
  })
})
