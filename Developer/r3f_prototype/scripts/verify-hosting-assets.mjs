import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const valueAfter = (flag) => {
  const index = args.indexOf(flag)
  return index === -1 ? null : args[index + 1]
}
const url = valueAfter('--url')
const directory = valueAfter('--dir')

if ((url && directory) || (!url && !directory)) {
  console.error('Usage: node scripts/verify-hosting-assets.mjs --url <preview-url> | --dir <dist-directory>')
  process.exit(2)
}

const isJavaScriptContentType = (contentType) => /(?:^|\/)javascript(?:;|$)|application\/(?:ecma|x-)?javascript/i.test(contentType ?? '')
const isHtml = (body) => /^\s*(?:<!doctype\s+html|<html\b|<head\b|<body\b)/i.test(body)
const importPattern = /(?:\bimport\s*(?:\(\s*|[^'"`()]*?\bfrom\s*)|\bexport\s+[^'"`()]*?\bfrom\s*)(["'`])([^"'`]+)\1/g

function referencedJavaScriptUrls(source, parentUrl) {
  const urls = []
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[2]
    if (!specifier || /^(?:data:|https?:)?\/\//i.test(specifier) && !specifier.startsWith(new URL(parentUrl).origin)) continue
    const target = new URL(specifier, parentUrl)
    if (target.origin === new URL(parentUrl).origin && /\.m?js(?:$|[?#])/i.test(target.pathname)) urls.push(target.href)
  }
  return urls
}

function referencedLocalJavaScriptFiles(source, parentFile, root) {
  const files = []
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[2]
    if (!specifier || /^(?:data:|https?:)?\/\//i.test(specifier)) continue
    const pathname = specifier.split(/[?#]/, 1)[0]
    if (!/\.m?js$/i.test(pathname)) continue
    files.push(pathname.startsWith('/')
      ? resolve(root, `.${pathname}`)
      : resolve(dirname(parentFile), pathname))
  }
  return files
}

async function verifyRemote(baseUrl) {
  const entry = new URL('/', baseUrl).href
  const page = await fetch(entry, { redirect: 'error' })
  const pageBody = await page.text()
  if (!page.ok) throw new Error(`${entry}: HTTP ${page.status}`)
  const seeds = [...pageBody.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.m?js(?:\?[^"']*)?)["']/gi)]
    .map((match) => new URL(match[1], entry).href)
  if (!seeds.length) throw new Error(`${entry}: no JavaScript module entry found`)

  const pending = [...new Set(seeds)]
  const visited = new Set()
  while (pending.length) {
    const assetUrl = pending.shift()
    if (visited.has(assetUrl)) continue
    visited.add(assetUrl)
    const response = await fetch(assetUrl, { redirect: 'error' })
    const body = await response.text()
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok) throw new Error(`${assetUrl}: HTTP ${response.status}`)
    if (!isJavaScriptContentType(contentType)) throw new Error(`${assetUrl}: expected JavaScript MIME type, received ${contentType || '(missing)'}`)
    if (!body.trim() || isHtml(body)) throw new Error(`${assetUrl}: JavaScript asset body is HTML or empty`)
    for (const child of referencedJavaScriptUrls(body, assetUrl)) if (!visited.has(child)) pending.push(child)
  }
  return visited.size
}

function verifyLocal(root) {
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`${root}: dist directory not found`)
  const entry = resolve(root, 'index.html')
  if (!existsSync(entry)) throw new Error(`${entry}: index HTML not found`)
  const page = readFileSync(entry, 'utf8')
  const seeds = [...page.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.m?js(?:\?[^"']*)?)["']/gi)]
    .map((match) => {
      const pathname = match[1].split(/[?#]/, 1)[0]
      return pathname.startsWith('/') ? resolve(root, `.${pathname}`) : resolve(dirname(entry), pathname)
    })
  if (!seeds.length) throw new Error(`${entry}: no JavaScript module entry found`)

  const pending = [...new Set(seeds)]
  const visited = new Set()
  while (pending.length) {
    const file = pending.shift()
    if (visited.has(file)) continue
    const outsideRoot = relative(root, file).startsWith(`..${sep}`) || relative(root, file) === '..'
    if (outsideRoot) throw new Error(`${file}: JavaScript import escapes dist directory`)
    const body = readFileSync(file, 'utf8')
    if (!body.trim() || isHtml(body)) throw new Error(`${file}: JavaScript asset body is HTML or empty`)
    visited.add(file)
    for (const child of referencedLocalJavaScriptFiles(body, file, root)) if (!visited.has(child)) pending.push(child)
  }
  return visited.size
}

try {
  const checked = url ? await verifyRemote(url) : verifyLocal(resolve(directory))
  console.log(`Hosting JavaScript asset verification passed (${checked} asset${checked === 1 ? '' : 's'} checked).`)
} catch (error) {
  console.error(`Hosting JavaScript asset verification failed: ${error.message}`)
  process.exit(1)
}
