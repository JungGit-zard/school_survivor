export const FIREBASE_STUDIO_RUNTIME_DATASET_KEYS = Object.freeze([
  'tunings',
  'sfxTunings',
  'stageBossPreview',
  'decals',
  'propPlacements',
])

let runtimeState = {
  status: 'blocked',
  revision: null,
  datasets: null,
  generation: 0,
}

export class FirebaseStudioNotHydratedError extends Error {
  constructor(operation = 'read') {
    super(`Firebase Graphics Studio hydrate is required before Studio ${operation}.`)
    this.name = 'FirebaseStudioNotHydratedError'
  }
}

export function blockFirebaseStudioRuntime() {
  runtimeState = {
    status: 'blocked',
    revision: null,
    datasets: null,
    generation: runtimeState.generation + 1,
  }
}

export function commitFirebaseStudioRuntime(datasets, { revision = null } = {}) {
  const source = isObject(datasets) ? datasets : {}
  runtimeState = {
    status: 'ready',
    revision: Number.isInteger(revision) && revision >= 0 ? revision : null,
    generation: runtimeState.generation + 1,
    datasets: Object.fromEntries(FIREBASE_STUDIO_RUNTIME_DATASET_KEYS.map((key) => [
      key,
      isObject(source[key]) ? source[key] : {},
    ])),
  }
  return runtimeState
}

export function isFirebaseStudioRuntimeReady() {
  return runtimeState.status === 'ready' && runtimeState.datasets !== null
}

export function getFirebaseStudioRuntimeState() {
  return runtimeState
}

export function getFirebaseStudioRuntimeGeneration() {
  return runtimeState.generation
}

export function getFirebaseStudioRuntimeDataset(key) {
  assertFirebaseStudioRuntimeReady('read')
  return runtimeState.datasets[key] ?? {}
}

export function setFirebaseStudioRuntimeDataset(key, value) {
  assertFirebaseStudioRuntimeReady('write')
  if (!FIREBASE_STUDIO_RUNTIME_DATASET_KEYS.includes(key)) {
    throw new TypeError(`Unknown Firebase Graphics Studio dataset: ${key}`)
  }
  runtimeState = {
    ...runtimeState,
    datasets: {
      ...runtimeState.datasets,
      [key]: isObject(value) ? value : {},
    },
  }
  return runtimeState.datasets[key]
}

export function assertFirebaseStudioRuntimeReady(operation = 'read') {
  if (!isFirebaseStudioRuntimeReady()) {
    throw new FirebaseStudioNotHydratedError(operation)
  }
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
