import { describe, expect, it } from 'vitest'
import {
  clearPlayerArmAction,
  createPlayerArmActionState,
  getActivePlayerArmAction,
  getPlayerArmPose,
  startPlayerArmAction,
} from './playerArmAction.js'

describe('player arm action state', () => {
  it('expires box cutter arm actions instead of leaving an arm raised', () => {
    const state = createPlayerArmActionState()

    startPlayerArmAction(state, 'boxCutter', 1000, 240)

    expect(getActivePlayerArmAction(state, 1120)).toMatchObject({
      type: 'boxCutter',
      progress: 0.5,
    })
    expect(getActivePlayerArmAction(state, 1300)).toBeNull()
    expect(state.type).toBeNull()
  })

  it('returns neutral sleeve rotation after clearing an action', () => {
    const state = createPlayerArmActionState()
    startPlayerArmAction(state, 'boxCutter', 1000, 240)
    clearPlayerArmAction(state)

    const pose = getPlayerArmPose({ action: getActivePlayerArmAction(state, 1100), walkSwing: 0 })

    expect(pose.slvL).toEqual({ x: 0, y: 0, z: 0 })
    expect(pose.slvR).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('gives guided missiles a simple throw pose while the action is active', () => {
    const pose = getPlayerArmPose({
      action: { type: 'guidedMissileThrow', progress: 0.5 },
      walkSwing: 0,
    })

    expect(pose.slvR.x).toBeLessThan(-1)
    expect(pose.slvR.z).toBeLessThan(-0.1)
  })

  it('raises the right arm forward for the student flashlight animation', () => {
    const pose = getPlayerArmPose({
      action: { type: 'lanternFlashlight', progress: 0.5 },
      walkSwing: 0,
    })

    expect(pose.slvR.x).toBeLessThan(-1.2)
    expect(Math.abs(pose.slvR.z)).toBeLessThan(0.2)
  })
})
