import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const prototypeRoot = path.resolve(path.dirname(scriptPath), '..')
const repositoryRoot = path.resolve(prototypeRoot, '..', '..')
const artifactScope = process.argv.find((argument) => argument.startsWith('--artifacts='))?.split('=', 2)[1] ?? null
const oldAssetName = ['boss', '02'].join('_') + '.webp'
const oldSourceName = ['graphicsStudio', 'B02', 'Source'].join('')
const oldStudioId = ['zombie', 'b02', 'teacher'].join('-')
const oldStudioNamespace = ['zombie', 'b02'].join('-')
const oldComponentPrefix = ['B02', 'Teacher'].join('')
const oldPreviewFactor = ['BOSS', 'PREVIEW', 'MODEL', 'SCALE', 'FACTOR'].join('_')
const blockedFiles = [
  path.join('Developer', 'r3f_prototype', 'src', 'assets', 'enemies', oldAssetName),
  path.join('Developer', 'r3f_prototype', 'src', 'lib', `${oldSourceName}.js`),
]
const blockedText = [
  ['old B02 asset path', new RegExp(oldAssetName.replace('.', '\\.'))],
  ['old B02 component family', new RegExp(`\\b${oldComponentPrefix}[A-Za-z0-9_]*`)],
  ['old B02 source module', new RegExp(oldSourceName)],
  ['old B02 Studio item id', new RegExp(oldStudioId)],
  ['old B02 Studio namespace', new RegExp(`${oldStudioNamespace}(?:\\b|-)`)],
]
const ignoredNames = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'playtest-logs',
  'SESSION_MEMORY',
])
const textExtensions = new Set([
  '.cjs', '.css', '.html', '.js', '.jsx', '.json', '.md', '.mjs',
  '.ps1', '.sh', '.svg', '.ts', '.tsx', '.txt', '.yml', '.yaml',
])
const failures = []

if (!artifactScope) {
  for (const relativePath of blockedFiles) {
    if (existsSync(path.join(repositoryRoot, relativePath))) {
      failures.push(`${relativePath}: blocked legacy file exists`)
    }
  }
}

function visit(absolutePath, artifactAudit = false) {
  const name = path.basename(absolutePath)
  if ((!artifactAudit && ignoredNames.has(name)) || name === 'node_modules' || absolutePath === scriptPath) return
  if (!existsSync(absolutePath)) return
  const normalizedPath = absolutePath.replaceAll('\\', '/')
  if (!artifactAudit && normalizedPath.includes('/android/app/src/main/assets/public/')) return

  const stats = statSync(absolutePath)
  if (stats.isDirectory()) {
    for (const child of readdirSync(absolutePath)) visit(path.join(absolutePath, child), artifactAudit)
    return
  }
  if (!textExtensions.has(path.extname(absolutePath).toLowerCase())) return

  const relativePath = path.relative(repositoryRoot, absolutePath)
  const source = readFileSync(absolutePath, 'utf8')
  for (const [label, pattern] of blockedText) {
    if (pattern.test(source)) failures.push(`${relativePath}: ${label}`)
  }
  if (relativePath.replaceAll('\\', '/') === 'Developer/r3f_prototype/src/components/StageBossPreview.jsx') {
    if (new RegExp(oldPreviewFactor).test(source)) {
      failures.push(`${relativePath}: B02 preview model-scale compensation`)
    }
    if (/B02\s*:\s*0\.(?:82|95)\b/.test(source)) {
      failures.push(`${relativePath}: B02 preview numeric compensation`)
    }
  }
}

if (artifactScope === 'dist') {
  visit(path.join(prototypeRoot, 'dist'), true)
} else if (artifactScope === 'all') {
  visit(path.join(prototypeRoot, 'dist'), true)
  visit(path.join(prototypeRoot, 'android', 'app', 'src', 'main', 'assets', 'public'), true)
  visit(path.join(prototypeRoot, 'android', 'app', 'build'), true)
} else if (artifactScope) {
  console.error(`Unknown artifact audit scope: ${artifactScope}`)
  process.exit(2)
} else {
  visit(repositoryRoot)
}

if (failures.length) {
  console.error('Legacy B02 gate failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(artifactScope
  ? `Legacy B02 artifact gate passed (${artifactScope}).`
  : 'Legacy B02 source gate passed.')
