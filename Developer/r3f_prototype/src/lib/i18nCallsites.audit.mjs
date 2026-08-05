// 임시 감사: 소스가 호출하는 모든 t('키') 를 사전과 대조한다.
// 폴백 인자가 없는 호출은 사전에 반드시 있어야 한다(없으면 raw 키가 화면에 뜬다).
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import ko from './locales/ko.js'
import en from './locales/en.js'
import ja from './locales/ja.js'
import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'

const SRC = new URL('..', import.meta.url).pathname.replace(/^\//, '')

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return files(path)
    return /\.(jsx?|mjs)$/.test(entry.name) && !/\.test\.|\.audit\./.test(entry.name) ? [path] : []
  })
}

const problems = []
const dynamic = []
// t('key'), t('key', params), t('key', params, fallback), translate(...) 모두 매칭
const CALL = /\b(?:t|translate)\(\s*(?:'([^']+)'|`([^`]*)`)\s*(,)?/g

for (const path of files(SRC)) {
  const source = readFileSync(path, 'utf8')
  const rel = relative(SRC, path).replaceAll('\\', '/')
  for (const match of source.matchAll(CALL)) {
    const literal = match[1]
    const template = match[2]
    if (template !== undefined) {
      dynamic.push(`${rel}: \`${template}\``)
      continue
    }
    // 뒤에 인자가 더 있으면 fallback이 있을 수 있으니 3번째 인자 유무를 대략 확인
    const tail = source.slice(match.index + match[0].length, match.index + match[0].length + 200)
    const hasFallback = /^[^)]*,[^)]*\S/.test(tail) && tail.split(')')[0].split(',').length >= 2
    if (ko[literal] === undefined && !hasFallback) {
      problems.push(`${rel}: t('${literal}') has no ko entry and no fallback`)
    }
    if (ko[literal] !== undefined) {
      if (en[literal] === undefined) problems.push(`en missing ${literal} (used in ${rel})`)
      if (ja[literal] === undefined) problems.push(`ja missing ${literal} (used in ${rel})`)
    }
  }
}

// 템플릿 리터럴 키 패턴을 실제 데이터로 전개해 확인
const propTypes = STAGE_PROP_PALETTE.map((entry) => entry.type)
for (const type of propTypes) {
  // propLabel(type, korean) 은 fallback이 있으므로 누락돼도 안전 — 번역 존재 여부만 본다
  if (en[`prop.${type}`] === undefined) problems.push(`en missing prop.${type}`)
  if (ja[`prop.${type}`] === undefined) problems.push(`ja missing prop.${type}`)
}

console.log(`dynamic (template) key call sites: ${dynamic.length}`)
for (const entry of dynamic) console.log('   ', entry)
if (problems.length === 0) console.log('\nNO PROBLEMS FOUND')
else {
  console.log(`\n${problems.length} PROBLEMS:`)
  for (const problem of problems) console.log(' -', problem)
}
