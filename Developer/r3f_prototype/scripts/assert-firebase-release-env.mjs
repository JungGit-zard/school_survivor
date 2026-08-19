import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root = process.cwd()
const envPath = path.join(root, '.env')
const googleServicesPath = path.join(root, 'android', 'app', 'google-services.json')

const requiredEnvKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
]

const expectedProjectId = 'escape-zombie-school'
const expectedAuthDomain = 'escape-zombie-school.firebaseapp.com'
const expectedDatabaseHost = 'escape-zombie-school-default-rtdb.asia-southeast1.firebasedatabase.app'
const expectedPackageName = 'com.jungyoon.zombieschool'
const requiredReleaseSha1 = '6f06ba579d08baa098af26a53c499b540a057651'

function fail(message, details = []) {
  console.error('\n[FIREBASE_RELEASE_ENV_GATE] FAIL')
  console.error(message)
  for (const detail of details) console.error(`- ${detail}`)
  console.error('\nRelease build is blocked. Fix .env/google-services.json first, then rerun npm run build.')
  process.exit(1)
}

function parseDotEnv(text) {
  const env = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[match[1]] = value
  }
  return env
}

if (!fs.existsSync(envPath)) {
  fail('Missing .env in r3f_prototype root.', [
    'This exact class of failure already produced broken AABs: the web bundle is built without VITE_FIREBASE_* values, so Google/Firebase login becomes unconfigured in release.',
    `Expected path: ${envPath}`,
  ])
}

const envText = fs.readFileSync(envPath, 'utf8')
const env = parseDotEnv(envText)
const missing = requiredEnvKeys.filter((key) => !env[key] || env[key].trim().length === 0)
if (missing.length > 0) {
  fail('Required VITE_FIREBASE_* keys are missing or empty.', missing)
}

const mismatches = []
if (env.VITE_FIREBASE_PROJECT_ID !== expectedProjectId) {
  mismatches.push(`VITE_FIREBASE_PROJECT_ID must be ${expectedProjectId}`)
}
if (env.VITE_FIREBASE_AUTH_DOMAIN !== expectedAuthDomain) {
  mismatches.push(`VITE_FIREBASE_AUTH_DOMAIN must be ${expectedAuthDomain}`)
}
if (env.VITE_FIREBASE_DATABASE_URL && !env.VITE_FIREBASE_DATABASE_URL.includes(expectedDatabaseHost)) {
  mismatches.push(`VITE_FIREBASE_DATABASE_URL must target ${expectedDatabaseHost}`)
}
if (mismatches.length > 0) fail('Firebase env points at the wrong project/domain.', mismatches)

if (!fs.existsSync(googleServicesPath)) {
  fail('Missing android/app/google-services.json.', [`Expected path: ${googleServicesPath}`])
}

let googleServices
try {
  googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'))
} catch (error) {
  fail('android/app/google-services.json is not valid JSON.', [error.message])
}

const projectId = googleServices?.project_info?.project_id
const clients = Array.isArray(googleServices?.client) ? googleServices.client : []
const androidClients = []
for (const client of clients) {
  const pkg = client?.client_info?.android_client_info?.package_name
  const oauthClients = Array.isArray(client?.oauth_client) ? client.oauth_client : []
  const certs = oauthClients
    .map((oauth) => oauth?.android_info)
    .filter(Boolean)
    .map((info) => ({ packageName: info.package_name, sha1: String(info.certificate_hash ?? '').toLowerCase() }))
  androidClients.push({ pkg, certs })
}

const hasPackage = androidClients.some((client) => client.pkg === expectedPackageName)
const hasReleaseSha = androidClients.some((client) => client.certs.some((cert) => cert.packageName === expectedPackageName && cert.sha1 === requiredReleaseSha1))
const googleProblems = []
if (projectId !== expectedProjectId) googleProblems.push(`google-services project_id must be ${expectedProjectId}`)
if (!hasPackage) googleProblems.push(`google-services must contain Android package ${expectedPackageName}`)
if (!hasReleaseSha) googleProblems.push(`google-services must contain release SHA-1 ${requiredReleaseSha1}`)
if (googleProblems.length > 0) fail('google-services.json does not match the release Android Firebase app.', googleProblems)

const fingerprint = crypto.createHash('sha256').update(requiredEnvKeys.map((key) => `${key}=present`).join('\n')).digest('hex').slice(0, 12)
console.log('[FIREBASE_RELEASE_ENV_GATE] PASS')
console.log(`env: ${path.relative(root, envPath)} required keys present (${requiredEnvKeys.length}), fingerprint=${fingerprint}`)
console.log(`firebase: ${expectedProjectId}, ${expectedAuthDomain}`)
console.log(`android: ${expectedPackageName}, release SHA-1 registered`)
