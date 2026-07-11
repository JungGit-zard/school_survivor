import { beforeEach, describe, expect, it, vi } from 'vitest'

const refs = []
let frameCallback
const emitSfx = vi.fn()

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal()),
  useMemo: (factory) => factory(),
  useRef: (initialValue) => {
    const ref = { current: initialValue }
    refs.push(ref)
    return ref
  },
  useState: () => [{ startMs: 100, facing: 0 }, vi.fn()],
}))

vi.mock('../../lib/usePlayingFrame.js', () => ({
  usePlayingFrame: (callback) => { frameCallback = callback },
}))

vi.mock('../../lib/sfxEvents.js', () => ({ emitSfx }))

vi.mock('../../store/useGameStore.js', () => ({
  useGameStore: (selector) => selector({
    weapons: {
      schoolBag: {
        active: true,
        cooldown: 1000,
        damage: 12,
        range: 0.633,
        swingMs: 420,
      },
    },
  }),
}))

vi.mock('@react-three/rapier', () => ({
  RigidBody: () => null,
  CuboidCollider: () => null,
  BallCollider: () => null,
}))

vi.mock('../StudioTunedGroup.jsx', () => ({ default: () => null }))

describe('SchoolBagSwing hit queue', () => {
  beforeEach(() => {
    refs.length = 0
    frameCallback = undefined
    emitSfx.mockClear()
  })

  it('rechecks the rigid body before damage and does not ghost-play a hit after the enemy dies', async () => {
    const { SchoolBagSwing } = await import('./SchoolBag.jsx')
    const tree = SchoolBagSwing()
    const rigidBodies = tree.props.children.filter((child) => child?.type?.name === 'RigidBody')
    const hitBody = rigidBodies.find((child) => child.props.onIntersectionEnter && !child.props.onIntersectionExit)
    const damage = vi.fn()
    const enemyBody = { _enemyId: 7, _enemyHit: damage, _enemyDead: false }

    hitBody.props.onIntersectionEnter({ other: { rigidBody: enemyBody } })
    enemyBody._enemyDead = true
    frameCallback({ clock: { elapsedTime: 0.2 } })

    expect(damage).not.toHaveBeenCalled()
    expect(emitSfx).not.toHaveBeenCalledWith({ id: 'rulerHit', volume: 0.58 })
  })

  it('applies damage and plays the hit sound together when the queued enemy is still valid', async () => {
    const { SchoolBagSwing } = await import('./SchoolBag.jsx')
    const tree = SchoolBagSwing()
    const rigidBodies = tree.props.children.filter((child) => child?.type?.name === 'RigidBody')
    const hitBody = rigidBodies.find((child) => child.props.onIntersectionEnter && !child.props.onIntersectionExit)
    const damage = vi.fn()
    const enemyBody = { _enemyId: 8, _enemyHit: damage, _enemyDead: false }

    hitBody.props.onIntersectionEnter({ other: { rigidBody: enemyBody } })
    frameCallback({ clock: { elapsedTime: 0.2 } })

    expect(damage).toHaveBeenCalledOnce()
    expect(emitSfx).toHaveBeenCalledWith({ id: 'rulerHit', volume: 0.58 })
  })
})
