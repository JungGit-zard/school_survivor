import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import koRaw from '../dialogues/ko/investigation.txt?raw'
import enRaw from '../dialogues/en/investigation.txt?raw'
import jaRaw from '../dialogues/ja/investigation.txt?raw'
import { DIALOGUE_POOL_TARGETS, getDialogueText, getPoolIds, parseRawDialogue } from '../dialogues/dialogueStore.js'
import { getInvestigationDialogue } from './investigationDialogue.js'
import { setLocale } from './i18n.js'
import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'
import { commitFirebaseStudioRuntime } from './studioRuntimeState.js'
import { getStageObjectPlacements } from '../components/StageObjects/stageObjectPlacements.js'
import { getStageObjectFootprint } from '../components/StageObjects/stageObjectColliders.js'
import { findInvestigationTargetInRange, getInvestigationTargets, OBJECT_CONTACT_MARGIN } from './studentProximity.js'

// Investigation support must not depend on whether graphics exposes the hazard in its editor.
vi.mock('./stagePropEditorGeometry.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, STAGE_PROP_PALETTE: actual.STAGE_PROP_PALETTE.filter(({ type }) => type !== 'pressureCauldron') }
})

const pool = 'investigation.pressureCauldron'
const ids = ['001', '002', '003', '004', '005'].map((suffix) => `${pool}.${suffix}`)
const expected = {
  ko: [
    '보글보글 끓는 소리에 나도 모르게 발을 멈췄어.',
    '열기가 얼굴까지 와. 난 여기서 더 다가가지 않을래.',
    '하얀 증기가 내 앞을 가려. 난 옆으로 비켜야겠어.',
    '뚜껑이 덜컹대서 난 손을 주머니에 꼭 숨겼어.',
    '뜨거운 솥과는 거리 두기. 난 구경만 하고 지나갈래.',
  ],
  en: [
    'I stopped in my tracks at that bubbling sound.',
    'I can feel the heat on my face. I am not getting any closer.',
    'I cannot see through that white steam. I should step aside.',
    'I tucked my hands into my pockets when the lid rattled.',
    'I am keeping my distance from that hot pot. Just looking, then leaving.',
  ],
  ja: [
    'ぐつぐつ煮える音に、思わず足を止めちゃった。',
    '顔まで熱気が来る。私はこれ以上近づかないよ。',
    '白い湯気で前が見えない。私は横によけよう。',
    'ふたがガタガタ鳴って、私は手をポケットに隠した。',
    '熱い釜とは距離を置こう。私は見るだけで通り過ぎるよ。',
  ],
}
const raws = { ko: koRaw, en: enRaw, ja: jaRaw }

beforeEach(() => {
  setLocale('ko')
  // Memory-only test fixture, never a Firebase SDK write.
  commitFirebaseStudioRuntime({ propPlacements: {} }, { revision: 0 })
})
afterEach(() => setLocale('ko'))

describe('pressureCauldron investigation contract', () => {
  it('maps the subject explicitly without registering an editable hazard', () => {
    expect(STAGE_PROP_PALETTE.some(({ type }) => type === 'pressureCauldron')).toBe(false)
    expect(getInvestigationDialogue('stage4', 'pressureCauldron', { random: () => 0 })).toEqual({
      subjectType: 'pressureCauldron', subjectName: '압력 가마솥', dialogueId: ids[0],
    })
    expect(getInvestigationDialogue('stage4', 'unknownHazard')).toBeNull()
  })

  it.each(['ko', 'en', 'ja'])('%s has exactly five native TAB rows, translated text and nonfallback picks at every index', (locale) => {
    setLocale(locale)
    const rows = raws[locale].split(/\r?\n/u).filter((row) => row.startsWith(`${pool}.`))
    expect(rows).toEqual(ids.map((id, index) => `${id}\t${expected[locale][index]}`))
    expect(DIALOGUE_POOL_TARGETS[pool]).toBe(5)
    expect(getPoolIds(pool, locale)).toEqual(ids)
    const native = parseRawDialogue(raws[locale])
    ids.forEach((id, index) => {
      const dialogue = getInvestigationDialogue('stage4', 'pressureCauldron', { random: () => (index + 0.5) / 5 })
      expect(dialogue?.dialogueId).toBe(id)
      expect(native.get(id)).toBe(expected[locale][index])
      expect(getDialogueText(id, locale)).toBe(expected[locale][index])
      expect(getDialogueText(id, locale)).not.toBe(getDialogueText('dialogue.unavailable', locale))
      if (locale !== 'ko') expect(getDialogueText(id, locale)).not.toBe(getDialogueText(id, 'ko'))
    })
  })

  it('includes the authored center cauldron and uses existing collider contact with once-per-run exclusion', () => {
    const placement = getStageObjectPlacements('stage4').find(({ id }) => id === 'stage4-pressure-cauldron-center')
    expect(placement?.type).toBe('pressureCauldron')
    const target = getInvestigationTargets('stage4').find(({ id }) => id === placement.id)
    expect(target).toBeDefined()
    const footprint = getStageObjectFootprint(placement)
    expect(target).toMatchObject({
      subjectType: 'pressureCauldron', position: [footprint.x, placement.position[1], footprint.z],
      halfX: footprint.halfX, halfZ: footprint.halfZ, contactMargin: OBJECT_CONTACT_MARGIN,
    })
    expect(ids).toContain(target.dialogueId)
    expect(target.halfX).toBeGreaterThan(0)
    expect(target.halfZ).toBeGreaterThan(0)
    const x = target.position[0] + target.halfX + OBJECT_CONTACT_MARGIN
    const z = target.position[2]
    expect(findInvestigationTargetInRange(x, z, [target], new Set())).toBe(target)
    expect(findInvestigationTargetInRange(x + 0.001, z, [target], new Set())).toBeNull()
    expect(findInvestigationTargetInRange(x, z, [target], new Set([target.id]))).toBeNull()
  })
})
