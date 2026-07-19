// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import StudioTunedGroup from '../components/StudioTunedGroup.jsx'
import {
  DEFAULT_STUDIO_TUNING,
  getStudioZombieItemId,
  normalizeStudioTuning,
} from './graphicsStudioConfig.js'
import {
  applySubscribedFirebaseStudioSnapshot,
  buildFirebaseStudioSnapshot,
  saveFirebaseStudio,
  setFirebaseStudioUser,
} from './firebaseStudio.js'
import {
  blockFirebaseStudioRuntime,
  commitFirebaseStudioRuntime,
  getFirebaseStudioRuntimeState,
} from './studioRuntimeState.js'

const USER = { uid: 'firebase-parity-300-user' }
const ITERATIONS_PER_MODEL = 300
const MODEL_IDS = Object.freeze([
  'player',
  ...['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'B01', 'B02', 'B03', 'B04']
    .map((type) => getStudioZombieItemId(type)),
])
const EMPTY_DATASETS = Object.freeze({
  tunings: {},
  sfxTunings: {},
  stageBossPreview: {},
  decals: {},
  propPlacements: {},
})

function createRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function randomBetween(random, min, max) {
  return min + (max - min) * random()
}

function makeRandomTuning(random) {
  return normalizeStudioTuning({
    ...DEFAULT_STUDIO_TUNING,
    scale: randomBetween(random, 0.65, 1.8),
    scaleX: randomBetween(random, 0.75, 1.35),
    scaleY: randomBetween(random, 0.75, 1.35),
    scaleZ: randomBetween(random, 0.75, 1.35),
    positionX: randomBetween(random, -1, 1),
    positionY: randomBetween(random, -1, 1),
    positionZ: randomBetween(random, -1, 1),
    rotationX: randomBetween(random, -180, 180),
    rotationY: randomBetween(random, -180, 180),
    rotationZ: randomBetween(random, -180, 180),
    outlineThickness: randomBetween(random, 0, 2),
    outlineOpacity: randomBetween(random, 0.2, 1),
    saturation: randomBetween(random, 0.5, 1.5),
    brightness: randomBetween(random, 0.5, 1.5),
    emissiveIntensity: randomBetween(random, 0, 1),
  })
}

function createFirebaseTransactionClient(initialSnapshot) {
  let stored = initialSnapshot
  return {
    get stored() {
      return stored
    },
    async transaction(_path, update) {
      const next = update(stored)
      if (next === undefined) return { committed: false }
      stored = next
      return { committed: true }
    },
  }
}

function readVectorAttribute(container, consumer, name) {
  return container
    .querySelector(`[data-consumer="${consumer}"] > group`)
    .getAttribute(name)
    .split(',')
    .map(Number)
}

describe('Firebase Studio 300회 모델별 게임·타이틀 패리티', () => {
  let container
  let root

  beforeEach(() => {
    setFirebaseStudioUser(null)
    blockFirebaseStudioRuntime()
    setFirebaseStudioUser(USER)
    commitFirebaseStudioRuntime(EMPTY_DATASETS, { revision: 1 })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    setFirebaseStudioUser(null)
    blockFirebaseStudioRuntime()
  })

  MODEL_IDS.forEach((itemId, modelIndex) => {
    it(`${itemId}: Firebase 등록 후 게임·타이틀 즉시 반영 ${ITERATIONS_PER_MODEL}회`, async () => {
      const random = createRandom(0x5eed0000 + modelIndex)
      const client = createFirebaseTransactionClient(buildFirebaseStudioSnapshot(
        EMPTY_DATASETS,
        { revision: 1, now: Date.UTC(2026, 6, 19) },
      ))

      act(() => {
        root.render(
          <>
            <div data-consumer="game">
              <StudioTunedGroup itemId={itemId} materialTuning={false}><mesh /></StudioTunedGroup>
            </div>
            <div data-consumer="title">
              <StudioTunedGroup itemId={itemId} materialTuning={false}><mesh /></StudioTunedGroup>
            </div>
          </>,
        )
      })

      for (let iteration = 0; iteration < ITERATIONS_PER_MODEL; iteration += 1) {
        const previousState = getFirebaseStudioRuntimeState()
        const tuning = makeRandomTuning(random)
        const datasets = {
          ...previousState.datasets,
          tunings: {
            ...previousState.datasets.tunings,
            [itemId]: tuning,
          },
        }
        const expectedRevision = previousState.revision + 1

        const saved = await saveFirebaseStudio({
          user: USER,
          client,
          datasets,
          now: Date.UTC(2026, 6, 19, 0, 0, iteration),
        })
        expect(saved).toEqual({ status: 'saved', revision: expectedRevision })
        expect(client.stored.revision).toBe(expectedRevision)
        expect(client.stored.datasets.tunings[itemId]).toEqual(tuning)

        commitFirebaseStudioRuntime(previousState.datasets, { revision: previousState.revision })
        act(() => {
          expect(applySubscribedFirebaseStudioSnapshot(
            client.stored,
            { uid: USER.uid },
          )).toEqual({ status: 'remote-applied', revision: expectedRevision })
        })

        const expectedScale = [
          tuning.scale * tuning.scaleX,
          tuning.scale * tuning.scaleY,
          tuning.scale * tuning.scaleZ,
        ]
        const expectedPosition = [tuning.positionX, tuning.positionY, tuning.positionZ]
        const expectedRotation = [
          tuning.rotationX,
          tuning.rotationY,
          tuning.rotationZ,
        ].map((degrees) => degrees * Math.PI / 180)
        for (const consumer of ['game', 'title']) {
          const scale = readVectorAttribute(container, consumer, 'scale')
          const position = readVectorAttribute(container, consumer, 'position')
          const rotation = readVectorAttribute(container, consumer, 'rotation')
          expectedScale.forEach((value, axis) => expect(scale[axis]).toBeCloseTo(value, 10))
          expectedPosition.forEach((value, axis) => expect(position[axis]).toBeCloseTo(value, 10))
          expectedRotation.forEach((value, axis) => expect(rotation[axis]).toBeCloseTo(value, 10))
        }
        expect(getFirebaseStudioRuntimeState().revision).toBe(expectedRevision)
      }
    }, 60_000)
  })
})
