import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const appSource = readFileSync(resolve(root, 'src/App.jsx'), 'utf8').replaceAll('\r\n', '\n')
const studioSource = readFileSync(resolve(root, 'src/components/GraphicsStudio.jsx'), 'utf8').replaceAll('\r\n', '\n')

function fail(message) {
  throw new Error(`Studio-game sync contract failed: ${message}`)
}

function requireSource(source, text, message) {
  if (!source.includes(text)) fail(message)
  return source.indexOf(text)
}

function requireOrder(source, values, message) {
  let previous = -1
  for (const value of values) {
    const index = source.indexOf(value, previous + 1)
    if (index < 0 || index < previous) fail(message)
    previous = index
  }
}

const gameHydrateEffect = /useEffect\(\(\) => \{\s*if \(isGraphicsStudioRoute \|\| isAdminRoute\) return\s*void hydrateCanonicalTitlePlayer\(\{\}\)\.catch\(\(\) => \{\}\)\s*\}, \[isGraphicsStudioRoute, isAdminRoute\]\)/s
if (!gameHydrateEffect.test(appSource)) {
  fail('normal game mount must hydrateCanonicalTitlePlayer({}) independently of login and exclude Graphics Studio/admin routes')
}

const persistStart = requireSource(studioSource, 'const persistDatasetsOnApply = async (datasets) => {', 'persistDatasetsOnApply is missing')
const persistEnd = requireSource(studioSource, '\n\n  useEffect(() => {\n    void initializeAuth()', 'persistDatasetsOnApply boundary is missing')
const persistSource = studioSource.slice(persistStart, persistEnd)
requireOrder(persistSource, [
  'const result = await saveFirebaseStudio({ user, datasets })',
  "if (result?.status !== 'saved')",
  'if (!isSavedFirebaseRevision(result.revision))',
  'applyFirebaseStudioDatasets(datasets, { revision: result.revision })',
], 'Apply must save Firebase, require saved positive revision, then apply the exact datasets with that revision')

const draftsStart = requireSource(studioSource, 'const persistAllDrafts = async (successLabel, overrides = {}) => {', 'persistAllDrafts is missing')
const draftsEnd = requireSource(studioSource, '\n\n  const applyCurrent = async () => {', 'persistAllDrafts boundary is missing')
const draftsSource = studioSource.slice(draftsStart, draftsEnd)
requireOrder(draftsSource, [
  'const result = await persistDatasetsOnApply(nextDatasets)',
  "if (result.status !== 'saved' || !isSavedFirebaseRevision(result.revision)) return result",
  'void sendGameSync({',
  'datasets: nextDatasets',
  'revision: result.revision',
], 'Apply must send the exact saved datasets and revision to the game only after Firebase save succeeds')

const sendStart = requireSource(studioSource, 'const sendGameSync = async ({ openGame = false, datasets = null, revision = null } = {}) => {', 'sendGameSync is missing')
const sendEnd = requireSource(studioSource, '\n\n  const updatePropPlacementDraft = (config) => {', 'sendGameSync boundary is missing')
const sendSource = studioSource.slice(sendStart, sendEnd)
requireOrder(sendSource, [
  'const payload = {',
  'datasets,',
  'revision,',
  'channel.postMessage(payload)',
  'const postSync = () => target.postMessage(payload, gameOriginRef.current)',
  'pendingGameSyncRef.current = {',
  'datasets,',
  'revision,',
  'postSync()',
], 'sendGameSync must post the exact datasets and revision through BroadcastChannel and the opened game window')

const messageHandlerStart = requireSource(appSource, 'export async function handleStudioGameSyncMessage(event) {', 'game sync receiver is missing')
const messageHandlerEnd = requireSource(appSource, '\n}\n\nif (typeof window', 'game sync receiver boundary is missing')
const messageHandlerSource = appSource.slice(messageHandlerStart, messageHandlerEnd)
requireOrder(messageHandlerSource, [
  'const revision = Number.isInteger(event.data.revision) && event.data.revision > 0',
  'if (!Number.isInteger(revision) || revision <= 0) return false',
  'applyFirebaseStudioDatasets(event.data.datasets, { revision })',
], 'message receiver must reject invalid revisions and apply the exact datasets')

const broadcastStart = requireSource(appSource, "const studioGameChannel = new BroadcastChannel(STUDIO_GAME_SYNC_CHANNEL)", 'BroadcastChannel sync receiver is missing')
const broadcastEnd = requireSource(appSource, '\n  }\n}\n\nexport default function App()', 'BroadcastChannel sync receiver boundary is missing')
const broadcastSource = appSource.slice(broadcastStart, broadcastEnd)
requireOrder(broadcastSource, [
  'const revision = Number.isInteger(data.revision) && data.revision > 0 ? data.revision : null',
  'if (!Number.isInteger(revision) || revision <= 0) return',
  'applyFirebaseStudioDatasets(data.datasets, { revision })',
], 'BroadcastChannel receiver must reject invalid revisions and apply the exact datasets')

console.log('Studio-game sync source contract passed.')
