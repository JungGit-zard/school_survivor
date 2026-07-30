import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const expectedPaths = [
  'src/components/TitleScreen.jsx',
  'src/components/TitleSceneCanvas.jsx',
  'src/components/TitleScene3D.jsx',
  'src/lib/titleSettings.js',
  'src/components/TitleScreen.bgm.test.jsx',
  'src/components/TitleScreen.settings.test.jsx',
  'src/components/TitleScene3D.test.jsx',
  'src/assets/audio/title_bgm.m4a',
]
const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const rootArgumentIndex = process.argv.indexOf('--root')
const prototypeRoot = rootArgumentIndex >= 0 && process.argv[rootArgumentIndex + 1]
  ? resolve(process.cwd(), process.argv[rootArgumentIndex + 1])
  : resolve(scriptDirectory, '..')
const manifestArgumentIndex = process.argv.indexOf('--manifest')
const manifestPath = manifestArgumentIndex >= 0 && process.argv[manifestArgumentIndex + 1]
  ? resolve(process.cwd(), process.argv[manifestArgumentIndex + 1])
  : resolve(scriptDirectory, 'title-surface-canonical.json')
const failures = []

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

let manifest
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
} catch (error) {
  failures.push(`manifest unavailable: ${error.message}`)
}

if (manifest) {
  if (typeof manifest.note !== 'string' || !manifest.note.includes('변경 금지')) {
    failures.push('manifest policy note missing')
  }
  if (!Array.isArray(manifest.files)) {
    failures.push('manifest files must be an array')
  } else {
    const paths = manifest.files.map((entry) => entry?.path)
    if (new Set(paths).size !== paths.length) failures.push('manifest contains duplicate paths')
    if (paths.length !== expectedPaths.length || JSON.stringify(paths) !== JSON.stringify(expectedPaths)) {
      failures.push('manifest path list differs from the locked title surface')
    }
    for (const entry of manifest.files) {
      if (!entry?.path || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')) {
        failures.push(`invalid manifest entry: ${entry?.path ?? '<unknown>'}`)
        continue
      }
      const filePath = resolve(prototypeRoot, entry.path)
      if (!existsSync(filePath)) failures.push(`missing locked title surface file: ${entry.path}`)
      else if (sha256(filePath) !== entry.sha256) failures.push(`SHA-256 mismatch: ${entry.path}`)
    }
  }
}

if (failures.length) {
  console.error('Title surface canonical gate failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log('Title surface canonical gate passed.')
}
