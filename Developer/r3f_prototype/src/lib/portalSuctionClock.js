import {
  createGameplayFixedStepClock,
  runGameplayFixedSteps,
} from './gameplayFrameTime.js'

export const PORTAL_SUCTION_DURATION = 1

// Portal completion is gameplay state, so it advances on the same 60 Hz,
// 0.5-second-capped clock as Rapier and the other gameplay timers.
export function createPortalSuctionClock() {
  return {
    elapsed: 0,
    complete: false,
    frameClock: createGameplayFixedStepClock(),
  }
}

export function resetPortalSuctionClock(clock) {
  clock.elapsed = 0
  clock.complete = false
  clock.frameClock = createGameplayFixedStepClock()
}

export function advancePortalSuctionClock(clock, rawDelta) {
  if (clock.complete) return { elapsed: clock.elapsed, completedNow: false }
  runGameplayFixedSteps(clock.frameClock, rawDelta, (fixedDelta) => {
    clock.elapsed = Math.min(PORTAL_SUCTION_DURATION, clock.elapsed + fixedDelta)
  })
  const completedNow = clock.elapsed >= PORTAL_SUCTION_DURATION
  clock.complete = completedNow
  return { elapsed: clock.elapsed, completedNow }
}
