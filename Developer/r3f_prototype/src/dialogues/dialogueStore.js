import koInvestigationRaw from './ko/investigation.txt?raw'
import koQuestRaw from './ko/quests.txt?raw'
import enInvestigationRaw from './en/investigation.txt?raw'
import enQuestRaw from './en/quests.txt?raw'
import jaInvestigationRaw from './ja/investigation.txt?raw'
import jaQuestRaw from './ja/quests.txt?raw'
import { getLocale } from '../lib/i18n.js'

export function parseRawDialogue(raw) {
  const entries = new Map()

  for (const row of String(raw).split(/\r?\n/u)) {
    const separator = row.indexOf('\t')
    if (separator <= 0) continue

    const id = row.slice(0, separator)
    const text = row.slice(separator + 1)
    if (id && text) entries.set(id, text)
  }

  return entries
}

const DIALOGUES = Object.freeze({
  ko: parseRawDialogue(`${koInvestigationRaw}\n${koQuestRaw}`),
  en: parseRawDialogue(`${enInvestigationRaw}\n${enQuestRaw}`),
  ja: parseRawDialogue(`${jaInvestigationRaw}\n${jaQuestRaw}`),
})

export const DIALOGUE_POOL_TARGETS = Object.freeze({
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
})

function resolveLocale(locale) {
  return Object.hasOwn(DIALOGUES, locale) ? locale : 'ko'
}

export function getDialogueText(dialogueId, locale = getLocale()) {
  const id = typeof dialogueId === 'string' ? dialogueId : ''
  const resolvedLocale = resolveLocale(locale)
  const fallbackId = 'dialogue.unavailable'
  if (!id) {
    return (
      DIALOGUES[resolvedLocale].get(fallbackId)
      || DIALOGUES.ko.get(fallbackId)
      || 'Dialogue unavailable.'
    )
  }

  const localized = DIALOGUES[resolvedLocale].get(id)
  if (localized) return localized

  const korean = DIALOGUES.ko.get(id)
  if (korean) return korean

  return (
    DIALOGUES[resolvedLocale].get(fallbackId)
    || DIALOGUES.ko.get(fallbackId)
    || 'Dialogue unavailable.'
  )
}

export function getPoolIds(poolId, locale = getLocale()) {
  const prefix = typeof poolId === 'string' && poolId ? `${poolId}.` : ''
  if (!prefix) return []

  const requested = DIALOGUES[resolveLocale(locale)]
  const korean = DIALOGUES.ko
  const source = [...requested.keys()].some((id) => id.startsWith(prefix)) ? requested : korean
  return [...source.keys()].filter((id) => id.startsWith(prefix))
}

export function pickDialogueId(poolId, { locale = getLocale(), random = Math.random } = {}) {
  const ids = getPoolIds(poolId, locale)
  if (!ids.length) return 'dialogue.unavailable'

  const value = Number(random?.())
  const index = Number.isFinite(value)
    ? Math.min(ids.length - 1, Math.max(0, Math.floor(value * ids.length)))
    : 0
  return ids[index]
}

export function isDialogueId(dialogueId) {
  const id = typeof dialogueId === 'string' ? dialogueId : ''
  return Boolean(id && Object.values(DIALOGUES).some((entries) => entries.has(id)))
}

export function getDialoguePoolStatus(locale = 'ko') {
  return Object.fromEntries(Object.entries(DIALOGUE_POOL_TARGETS).map(([poolId, target]) => [poolId, {
    actual: getPoolIds(poolId, locale).length,
    target,
  }]))
}
