#!/usr/bin/env node
// Cloudflare Pages 배포 (2026-10-25부터 웹 호스팅 정본).
//
//   node scripts/deploy-cloudflare.mjs game  [--dry-run]   -> Pages "escape-zombie-school" (escapezombie.com, www)
//   node scripts/deploy-cloudflare.mjs media [--dry-run]   -> Pages "escape-zombie-media"  (media.escapezombie.com)
//
// game: dist/ + public/_headers + public/_redirects + hosting/{legal}.html 를 임시 스테이징 폴더로 복사하고
//       만화·X카드·마케팅 이미지·QA 페이지가 하나도 없는지 검사한 뒤 배포한다. (dist는 먼저 `npm run build`.)
// media: media-site/site/ 를 그대로 배포한다. 게임 번들(assets/)이 섞여 있으면 거부한다.
//
// Firebase Hosting(firebase.json)은 롤백용으로만 남는다. Auth/RTDB/Functions는 계속 Firebase.
import { cpSync, existsSync, mkdtempSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, relative, sep } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = resolve(import.meta.dirname, '..')
const target = process.argv[2]
const dryRun = process.argv.includes('--dry-run')

const PROJECTS = {
  game: 'escape-zombie-school',
  media: 'escape-zombie-media',
}

// 게임 사이트에 절대 들어가면 안 되는 최상위 항목 (vite.config.js GAME_DIST_PUBLIC_EXCLUDES와 같은 취지).
const GAME_FORBIDDEN = [
  'comics',
  'share',
  'blog',
  'web-comics',
  'web-landing',
  'web-side-gutters',
  'x-website-cards-manifest.json',
  'sfx-audition-20261016.html',
  '__inucon_preview.html',
  join('sfx', 'audition-20261016'),
]
const GAME_REQUIRED = [
  'index.html',
  join('.well-known', 'assetlinks.json'),
  '_headers',
  '_redirects',
  '_worker.js', // /__/auth/*, /__/firebase/* Firebase auth helper proxy (backendmini)
  '_routes.json', // Worker runs ONLY for /__/*
  'privacy.html',
  'terms.html',
  'delete-account.html',
]
const LEGAL = ['privacy.html', 'terms.html', 'delete-account.html']

function fail(message) {
  console.error(`[deploy-cloudflare] ${message}`)
  process.exit(1)
}

function countFiles(dir) {
  let n = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1
  }
  return n
}

function stageGame() {
  const dist = join(ROOT, 'dist')
  if (!existsSync(join(dist, 'index.html'))) fail('dist/index.html 없음 — 먼저 npm run build')
  const stage = mkdtempSync(join(tmpdir(), 'escape-cf-game-'))
  cpSync(dist, stage, {
    recursive: true,
    filter: (src) => {
      const rel = relative(dist, src)
      return !GAME_FORBIDDEN.some((f) => rel === f || rel.startsWith(f + sep))
    },
  })
  for (const f of ['_headers', '_redirects', '_worker.js', '_routes.json']) cpSync(join(ROOT, 'public', f), join(stage, f))
  for (const f of LEGAL) {
    const fromDist = join(dist, f)
    const fromHosting = join(ROOT, 'hosting', f)
    if (!existsSync(join(stage, f))) {
      if (!existsSync(fromHosting) && !existsSync(fromDist)) fail(`${f} 없음 — npm run build:legal`)
      cpSync(existsSync(fromDist) ? fromDist : fromHosting, join(stage, f))
    }
  }
  for (const f of GAME_FORBIDDEN) if (existsSync(join(stage, f))) fail(`게임 스테이징에 금지 항목: ${f}`)
  for (const f of GAME_REQUIRED) if (!existsSync(join(stage, f))) fail(`게임 스테이징에 필수 항목 없음: ${f}`)
  return stage
}

function stageMedia() {
  const site = join(ROOT, 'media-site', 'site')
  if (!existsSync(join(site, 'index.html'))) fail('media-site/site/index.html 없음')
  if (!existsSync(join(site, '_headers'))) fail('media-site/site/_headers 없음')
  if (existsSync(join(site, 'assets')) || existsSync(join(site, '.well-known'))) {
    fail('media-site/site 에 게임 번들(assets/ 또는 .well-known/)이 섞여 있음')
  }
  return site
}

function npmEnv() {
  const env = { ...process.env }
  // 사용자 환경변수 NPM_CONFIG_CACHE 가 사라진 D:\DevCache 를 가리키면 npx 가 깨진다.
  for (const key of ['NPM_CONFIG_CACHE', 'npm_config_cache']) {
    const value = env[key]
    if (value && /^[A-Za-z]:/.test(value) && !existsSync(value.slice(0, 3))) {
      env[key] = join(env.LOCALAPPDATA || tmpdir(), 'npm-cache')
    }
  }
  return env
}

if (!PROJECTS[target]) fail('usage: node scripts/deploy-cloudflare.mjs <game|media> [--dry-run]')
const dir = target === 'game' ? stageGame() : stageMedia()
const files = countFiles(dir)
if (files > 20000) fail(`Cloudflare Pages 무료 한도(20,000 파일) 초과: ${files}`)
for (const name of readdirSync(dir)) {
  const p = join(dir, name)
  if (statSync(p).isFile() && statSync(p).size > 25 * 1024 * 1024) fail(`25MiB 초과 파일: ${name}`)
}
console.log(`[deploy-cloudflare] ${target} -> ${PROJECTS[target]} (${files} files) from ${dir}`)
if (dryRun) process.exit(0)

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const result = spawnSync(
  npx,
  ['-y', 'wrangler@4', 'pages', 'deploy', dir, '--project-name', PROJECTS[target], '--branch', 'main', '--commit-dirty=true'],
  { stdio: 'inherit', env: npmEnv(), shell: process.platform === 'win32' },
)
process.exit(result.status ?? 1)
