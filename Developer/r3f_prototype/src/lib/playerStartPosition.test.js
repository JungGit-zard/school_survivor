import { describe, expect, it } from 'vitest'
import { getPlayerStartPosition } from './playerStartPosition.js'
import { getStageObjectFootprint } from '../components/StageObjects/stageObjectColliders.js'
import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'
import { playerPos } from './refs.js'
import { useGameStore } from '../store/useGameStore.js'

describe('stage player start positions', () => {
  it('keeps stages 1–3 at their existing origin while Stage 4 starts south of the center cauldron', () => {
    expect(getPlayerStartPosition('stage1')).toEqual([0, 0, 0])
    expect(getPlayerStartPosition('stage2')).toEqual([0, 0, 0])
    expect(getPlayerStartPosition('stage3')).toEqual([0, 0, 0])
    expect(getPlayerStartPosition('stage4')).toEqual([0, 0, 7])
  })

  it('does not start the Stage 4 player inside any solid obstacle', () => {
    const [x, , z] = getPlayerStartPosition('stage4')
    const solidPlacements = getStageObjectPlacements('stage4')
      .filter(({ blocking }) => blocking !== false)
    const cauldron = solidPlacements.find(({ id }) => id === 'stage4-pressure-cauldron-center')
    expect(cauldron).toMatchObject({ position: [0, 0, 0], scale: 1 })

    const cauldronFootprint = getStageObjectFootprint(cauldron)
    expect(cauldronFootprint).toEqual({
      x: 0.02200000000000013,
      z: 0.07200000000000006,
      halfX: 1.5779999999999998,
      halfZ: 1.448,
    })

    const footprints = solidPlacements
      .map(getStageObjectFootprint)
      .filter(Boolean)

    expect(footprints.some(({ x: footprintX, z: footprintZ, halfX, halfZ }) => (
      x >= footprintX - halfX
      && x <= footprintX + halfX
      && z >= footprintZ - halfZ
      && z <= footprintZ + halfZ
    ))).toBe(false)
  })

  it('sets the Stage 4 runtime reference to the safe start when the game resets', () => {
    useGameStore.getState().resetGame('stage4')
    expect(playerPos.toArray()).toEqual([0, 0, 7])
    useGameStore.getState().resetGame('stage1')
    expect(playerPos.toArray()).toEqual([0, 0, 0])
  })
})
