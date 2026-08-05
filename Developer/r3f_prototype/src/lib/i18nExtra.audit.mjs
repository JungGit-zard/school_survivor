import en from './locales/en.js'
import ja from './locales/ja.js'
import ko from './locales/ko.js'
import { WEAPON_CATALOG, getAllWeaponIds } from './weaponCatalog.js'
import { STAGE1_INTRO_LINES } from '../store/useGameStore.js'

const problems = []
// 1) weaponCatalog의 모든 해금 조건 type이 cond.* 키를 갖는가
const types = new Set()
for (const id of getAllWeaponIds()) {
  const conds = WEAPON_CATALOG[id].unlockConditions
  if (Array.isArray(conds)) for (const c of conds) types.add(c.type)
}
for (const type of types) {
  if (ko[`cond.${type}`] === undefined) problems.push(`ko missing cond.${type}`)
  if (en[`cond.${type}`] === undefined) problems.push(`en missing cond.${type}`)
  if (ja[`cond.${type}`] === undefined) problems.push(`ja missing cond.${type}`)
}
// 2) 스테이지1 인트로 줄 수만큼 번역이 있는가
for (let i = 0; i < STAGE1_INTRO_LINES.length; i += 1) {
  if (en[`intro.stage1.${i}`] === undefined) problems.push(`en missing intro.stage1.${i}`)
  if (ja[`intro.stage1.${i}`] === undefined) problems.push(`ja missing intro.stage1.${i}`)
}
// 3) consent / legal
for (const id of ['terms', 'privacy']) {
  for (const key of [`consent.item.${id}`, `legal.${id}.title`, `legal.${id}.text`]) {
    if (en[key] === undefined) problems.push(`en missing ${key}`)
    if (ja[key] === undefined) problems.push(`ja missing ${key}`)
  }
}
console.log('condition types:', [...types].join(', '))
console.log('intro lines:', STAGE1_INTRO_LINES.length)
console.log(problems.length ? `\n${problems.length} PROBLEMS:\n - ${problems.join('\n - ')}` : '\nNO PROBLEMS FOUND')
