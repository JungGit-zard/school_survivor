// 임시 감사 스크립트: 실제 게임 데이터와 en/ja 사전을 대조한다.
import en from './locales/en.js'
import ja from './locales/ja.js'
import { WEAPON_CATALOG, getAllWeaponIds } from './weaponCatalog.js'
import { PASSIVE_CATALOG, getMvpPassiveIds } from './passiveCatalog.js'
import { STAGE_CONFIGS } from './stageConfig.js'
import { QUEST_DEFINITIONS } from './quests.js'
import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'
import { STUDENT_DIALOGUE_LINES } from './studentDialogueLines.js'
import { WEAPON_PERMANENT_UPGRADE_PLANS } from './weaponPermanentUpgrades.js'
import { permanentSummary, setLocale } from './i18n.js'

const problems = []
const check = (dict, name, key) => {
  if (dict[key] === undefined) problems.push(`${name}: missing ${key}`)
}
const both = (key) => { check(en, 'en', key); check(ja, 'ja', key) }

for (const id of getAllWeaponIds()) both(`weapon.${id}`)
for (const id of Object.keys(PASSIVE_CATALOG)) both(`passive.${id}`)
for (const id of getMvpPassiveIds()) both(`passive.${id}`)
for (const stage of Object.values(STAGE_CONFIGS)) {
  both(`stage.${stage.id}.title`)
  for (const milestone of stage.survivalMilestones) both(`milestone.${milestone.label}`)
}
for (const quest of QUEST_DEFINITIONS) {
  for (const suffix of ['title', 'startLine', 'objective', 'itemName', 'itemDesc', 'giver', 'target', 'completionLine']) {
    both(`quest.${quest.id}.${suffix}`)
  }
}
for (const prop of STAGE_PROP_PALETTE) both(`prop.${prop.type}`)

// 조사 대사: 두 줄짜리 배열 길이까지 확인
const objectDialogueKeys = Object.keys(en).filter((key) => key.startsWith('dialogue.obj.'))
for (const key of objectDialogueKeys) {
  if (!Array.isArray(en[key]) || en[key].length !== 2) problems.push(`en: ${key} is not a 2-line array`)
  if (!Array.isArray(ja[key]) || ja[key].length !== 2) problems.push(`ja: ${key} is not a 2-line array`)
}
for (const stageId of ['stage1', 'stage2', 'stage3', 'stage4']) both(`dialogue.student.${stageId}`)
if (en['dialogue.laid'].length !== STUDENT_DIALOGUE_LINES.length) problems.push('en: dialogue.laid length mismatch')
if (ja['dialogue.laid'].length !== STUDENT_DIALOGUE_LINES.length) problems.push('ja: dialogue.laid length mismatch')

// 영구 강화 summary 전수 검사: 모든 무기 × 모든 레벨이 번역되는가
for (const locale of ['en', 'ja']) {
  setLocale(locale)
  for (const plan of Object.values(WEAPON_PERMANENT_UPGRADE_PLANS)) {
    for (const [level, entry] of Object.entries(plan.levels)) {
      const out = permanentSummary(entry.summary)
      if (/[가-힣]/.test(out)) problems.push(`${locale}: untranslated summary ${plan.id} Lv${level} -> "${out}"`)
    }
  }
}
setLocale('ko')

// 레벨업 카드 키: HUD.jsx의 UPGRADES 테이블에서 key만 추출해 대조
const { readFileSync } = await import('node:fs')
const hud = readFileSync(new URL('../components/HUD.jsx', import.meta.url), 'utf8')
const upgradeKeys = [...hud.matchAll(/\{ key: '([A-Za-z]+)', icon:/g)].map((m) => m[1])
if (upgradeKeys.length < 55) problems.push(`upgrade key scrape looks wrong: ${upgradeKeys.length}`)
for (const key of upgradeKeys) {
  both(`up.${key}.label`)
  both(`up.${key}.desc`)
}

// weaponCatalog에는 있으나 UPGRADES에 없는 무기(=카드로 못 얻는 무기) 확인
const acquirable = new Set(upgradeKeys.filter((k) => k.startsWith('acquire')))

console.log(`upgrade cards: ${upgradeKeys.length}, acquire cards: ${acquirable.size}`)
console.log(`weapons: ${getAllWeaponIds().length}, quests: ${QUEST_DEFINITIONS.length}, props: ${STAGE_PROP_PALETTE.length}`)
console.log(`object dialogue sets: ${objectDialogueKeys.length}, laid lines: ${STUDENT_DIALOGUE_LINES.length}`)
if (problems.length === 0) console.log('\nNO PROBLEMS FOUND')
else {
  console.log(`\n${problems.length} PROBLEMS:`)
  for (const problem of problems) console.log(' -', problem)
}
