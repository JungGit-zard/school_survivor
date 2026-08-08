import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const channel = process.argv[2]
if (!channel || !/^[a-z0-9-]{1,63}$/i.test(channel)) {
  console.error('Usage: npm run deploy:hosting:safe -- <preview-channel>')
  process.exit(2)
}

const prototypeRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const firebase = process.platform === 'win32' ? 'firebase.cmd' : 'firebase'
const promotionNonce = randomUUID()
const run = (arguments_) => spawnSync(firebase, arguments_, {
  cwd: prototypeRoot,
  encoding: 'utf8',
  shell: process.platform === 'win32',
  env: { ...process.env, ESCAPE_HOSTING_PROMOTION_NONCE: promotionNonce },
})
const reauthenticationMessage = Buffer.from('Firebase \uc778\uc99d\uc774 \ub9cc\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc778\uc99d\ud574 \uc8fc\uc138\uc694.', 'utf8')
function stopForFirebaseFailure(result, fallbackMessage) {
  if (!result.error && result.status === 0) return false
  const detail = result.error?.message ?? fallbackMessage
  if (/auth|reauth|login|token|credential|401/i.test(`${result.stdout}\n${result.stderr}\n${detail}`)) {
    process.stderr.write(reauthenticationMessage)
    process.stderr.write('\n')
  }
  process.exit(result.status || 1)
}

const deploy = run(['hosting:channel:deploy', channel, '--json'])
process.stdout.write(deploy.stdout ?? '')
process.stderr.write(deploy.stderr ?? '')
stopForFirebaseFailure(deploy, 'Firebase preview deployment failed')

const urls = [...(`${deploy.stdout}\n${deploy.stderr}`).matchAll(/https:\/\/[^\s"']+/g)].map((match) => match[0].replace(/[),.]+$/, ''))
const previewUrl = urls.find((candidate) => /web\.app|firebaseapp\.com|--/.test(candidate))
if (!previewUrl) {
  console.error('Preview URL was not found in Firebase CLI output; live promotion was not run.')
  process.exit(1)
}

const verification = spawnSync(process.execPath, ['scripts/verify-hosting-assets.mjs', '--url', previewUrl], { cwd: prototypeRoot, encoding: 'utf8' })
process.stdout.write(verification.stdout ?? '')
process.stderr.write(verification.stderr ?? '')
if (verification.status !== 0) {
  console.error('Preview asset verification failed; live promotion was not run.')
  process.exit(verification.status || 1)
}

const clone = run(['hosting:clone', `escape-zombie-school:${channel}`, 'escape-zombie-school:live'])
process.stdout.write(clone.stdout ?? '')
process.stderr.write(clone.stderr ?? '')
stopForFirebaseFailure(clone, 'Firebase live promotion failed')
console.log(`Preview channel ${channel} verified and promoted to live.`)
