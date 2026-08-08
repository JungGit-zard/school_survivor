import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const locales = ['ko', 'en', 'ja']
const files = ['investigation', 'quests']
const targetCounts = {
  'student.stage1': 300,
  'investigation.classroomDesk': 5,
  'investigation.classroomChair': 5,
  'investigation.corridorLockerBank': 5,
  'investigation.corridorJanitorCart': 5,
  'investigation.corridorLostFoundBoard': 5,
  'investigation.basketballHoop': 5,
  'investigation.basketballBallCart': 5,
  'investigation.basketballCluster': 5,
  'investigation.gymBench': 5,
  'investigation.gymTrainingCones': 5,
  'investigation.gymMats': 5,
  'investigation.gymScoreboard': 5,
  'investigation.gymBanner': 5,
  'investigation.gymExitDoor': 5,
  'investigation.gymEquipmentSpill': 5,
  'investigation.kitchenPrepTable': 5,
  'investigation.kitchenCookLine': 5,
  'investigation.kitchenSinkCounter': 5,
  'investigation.kitchenRefrigerator': 5,
  'investigation.kitchenTrayRack': 5,
  'investigation.kitchenShelfCart': 5,
  'investigation.kitchenTrashBins': 5,
  'investigation.kitchenCrateStack': 5,
  'investigation.kitchenClutter': 5,
}

function readEntries(locale) {
  const entries = new Map()
  for (const file of files) {
    const path = resolve('src', 'dialogues', locale, `${file}.txt`)
    const raw = readFileSync(path, 'utf8')
    if (raw.includes('\uFFFD')) throw new Error(`${path}: contains replacement character U+FFFD`)
    const rows = raw.split(/\r?\n/u).filter(Boolean)
    for (const row of rows) {
      const tab = row.indexOf('\t')
      if (tab <= 0 || !row.slice(tab + 1)) throw new Error(`${path}: invalid dialogue row`)
      const id = row.slice(0, tab)
      if (entries.has(id)) throw new Error(`${path}: duplicate dialogue ID ${id}`)
      entries.set(id, row.slice(tab + 1))
    }
  }
  return entries
}

const stores = Object.fromEntries(locales.map((locale) => [locale, readEntries(locale)]))
const requiredIds = [
  ...Array.from({ length: 8 }, (_, index) => `investigation.student.stage${Math.floor(index / 2) + 1}.${String((index % 2) + 1).padStart(3, '0')}`),
  ...['entry', 'death', 'gameover'].map((name) => `matilda.${name}`),
  'dialogue.unavailable',
]
for (const [locale, entries] of Object.entries(stores)) {
  for (const id of requiredIds) {
    if (!entries.has(id)) throw new Error(`${locale}: missing required dialogue ID ${id}`)
  }
}

if (process.argv.includes('--require-targets')) {
  for (const [locale, entries] of Object.entries(stores)) {
    for (const [poolId, expected] of Object.entries(targetCounts)) {
      const actual = [...entries.keys()].filter((id) => id.startsWith(`${poolId}.`)).length
      if (actual !== expected) throw new Error(`${locale}: ${poolId} has ${actual}; expected ${expected}`)
    }

    const ids = [...entries.keys()].sort()
    const koreanIds = [...stores.ko.keys()].sort()
    if (JSON.stringify(ids) !== JSON.stringify(koreanIds)) {
      throw new Error(`${locale}: dialogue ID set does not match Korean canonical IDs`)
    }
  }
}

console.log(`Dialogue store gate passed (${stores.ko.size} Korean IDs).`)
