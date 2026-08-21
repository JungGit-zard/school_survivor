// 실제 게임 데이터와 en/ja 번역을 대조한다.
//
// 예전에는 i18nCoverage.audit.mjs라는 수동 스크립트였고, 두 가지 이유로 아무도 못 돌렸다.
//  1) dialogueStore가 '.txt?raw'를 쓰는데 그건 vite 전용 문법이라 bare node에서는
//     ERR_UNKNOWN_FILE_EXTENSION으로 즉사했다.
//  2) 대사가 로케일 사전에서 대사 저장소(src/dialogues/*.txt)로 이관됐는데 스크립트는
//     옛 위치(dialogue.laid, quest.*.startLine 등)를 계속 들여다봤다.
// 그 사이 weapon.bikittyCutter / weapon.lineDraw 이름 누락이 그대로 릴리스에 실렸다.
// vitest는 vite 파이프라인을 그대로 타므로 import가 정상 동작하고, npm test·prebuild 게이트에
// 자동으로 걸려 같은 누락이 두 번 통과하지 못한다.
//
// 문구가 사는 곳은 두 군데다. 검사도 각각 그 자리에서 한다.
//   - 로케일 사전(lib/locales/*.js): UI 라벨, 무기·패시브·프롭 이름, 퀘스트 정적 필드
//   - 대사 저장소(dialogues/*/*.txt): 실제 대사 — 퀘스트 start/completion, 인트로, 조사·학생 풀
import { describe, expect, it } from 'vitest'
import en from './locales/en.js'
import ja from './locales/ja.js'
import { getAllWeaponIds } from './weaponCatalog.js'
import { PASSIVE_CATALOG, getMvpPassiveIds } from './passiveCatalog.js'
import { STAGE_CONFIGS } from './stageConfig.js'
import { QUEST_DEFINITIONS } from './quests.js'
import { STAGE_PROP_PALETTE } from './stagePropEditorGeometry.js'
import { WEAPON_PERMANENT_UPGRADE_PLANS } from './weaponPermanentUpgrades.js'
import { permanentSummary, setLocale } from './i18n.js'
import { DIALOGUE_POOL_TARGETS, getDialogueText, getPoolIds } from '../dialogues/dialogueStore.js'

const DICTS = { en, ja }
const HANGUL = /[가-힣]/

function missingKeys(keys) {
  const problems = []
  for (const key of keys) {
    for (const [name, dict] of Object.entries(DICTS)) {
      if (dict[key] === undefined) problems.push(`${name}: missing ${key}`)
    }
  }
  return problems
}

// getDialogueText는 번역이 없으면 조용히 한국어로 폴백한다. 그래서 "값이 있나"로는 부족하고
// 한글이 새어 나오는지로 판정해야 실제 누락이 잡힌다.
function untranslatedDialogue(ids) {
  const problems = []
  for (const id of ids) {
    for (const locale of ['en', 'ja']) {
      const text = getDialogueText(id, locale)
      if (!text || HANGUL.test(text)) problems.push(`${locale}: untranslated dialogue ${id} -> "${text}"`)
    }
  }
  return problems
}

describe('로케일 사전이 게임 데이터를 전부 덮는가', () => {
  it('무기 20종 이름이 en·ja에 있다', () => {
    // 이 검사가 못 돌던 동안 최신 무기 2종(bikittyCutter, lineDraw)의 이름 키가 빠져 있었다.
    expect(missingKeys(getAllWeaponIds().map((id) => `weapon.${id}`))).toEqual([])
  })

  it('패시브 이름이 en·ja에 있다', () => {
    const ids = new Set([...Object.keys(PASSIVE_CATALOG), ...getMvpPassiveIds()])
    expect(missingKeys([...ids].map((id) => `passive.${id}`))).toEqual([])
  })

  it('스테이지 제목과 생존 마일스톤이 en·ja에 있다', () => {
    const keys = []
    for (const stage of Object.values(STAGE_CONFIGS)) {
      keys.push(`stage.${stage.id}.title`)
      for (const milestone of stage.survivalMilestones) keys.push(`milestone.${milestone.label}`)
    }
    expect(missingKeys(keys)).toEqual([])
  })

  it('퀘스트 정적 필드가 en·ja에 있다', () => {
    // start/completion 대사는 사전이 아니라 대사 저장소에 있다 — 아래 별도 테스트에서 본다.
    const suffixes = ['title', 'objective', 'itemName', 'itemDesc', 'giver', 'target']
    const keys = QUEST_DEFINITIONS.flatMap((quest) => suffixes.map((s) => `quest.${quest.id}.${s}`))
    expect(missingKeys(keys)).toEqual([])
  })

  it('스테이지 프롭 이름이 en·ja에 있다', () => {
    expect(missingKeys(STAGE_PROP_PALETTE.map((prop) => `prop.${prop.type}`))).toEqual([])
  })

  it('레벨업 카드 문구가 en·ja에 있다', async () => {
    const { readFileSync } = await import('node:fs')
    const hud = readFileSync(new URL('../components/HUD.jsx', import.meta.url), 'utf8')
    const upgradeKeys = [...hud.matchAll(/\{ key: '([A-Za-z]+)', icon:/g)].map((m) => m[1])
    // 스크레이프가 깨지면 0건 통과로 위장되므로 개수 자체를 먼저 못 박는다.
    expect(upgradeKeys.length).toBeGreaterThanOrEqual(55)
    expect(missingKeys(upgradeKeys.flatMap((k) => [`up.${k}.label`, `up.${k}.desc`]))).toEqual([])
  })

  it('영구 강화 요약이 모든 무기·레벨에서 번역된다', () => {
    const problems = []
    for (const locale of ['en', 'ja']) {
      setLocale(locale)
      for (const plan of Object.values(WEAPON_PERMANENT_UPGRADE_PLANS)) {
        for (const [level, entry] of Object.entries(plan.levels)) {
          const out = permanentSummary(entry.summary)
          if (HANGUL.test(out)) problems.push(`${locale}: untranslated summary ${plan.id} Lv${level} -> "${out}"`)
        }
      }
    }
    setLocale('ko')
    expect(problems).toEqual([])
  })
})

describe('대사 저장소가 en·ja로 전부 번역돼 있는가', () => {
  it('퀘스트 시작·완료 대사가 번역돼 있다', () => {
    const ids = QUEST_DEFINITIONS.flatMap((quest) => [`quest.${quest.id}.start`, `quest.${quest.id}.completion`])
    expect(untranslatedDialogue(ids)).toEqual([])
  })

  it('대사 풀 크기가 세 로케일에서 정본 목표치와 같다', () => {
    const problems = []
    for (const [poolId, target] of Object.entries(DIALOGUE_POOL_TARGETS)) {
      for (const locale of ['ko', 'en', 'ja']) {
        const size = getPoolIds(poolId, locale).length
        if (size !== target) problems.push(`${locale}: pool ${poolId} has ${size}, expected ${target}`)
      }
    }
    expect(problems).toEqual([])
  })

  it('조사·학생 대사 풀에 한국어가 새어 나오지 않는다', () => {
    const ids = Object.keys(DIALOGUE_POOL_TARGETS).flatMap((poolId) => getPoolIds(poolId, 'ko'))
    expect(untranslatedDialogue(ids)).toEqual([])
  })
})
