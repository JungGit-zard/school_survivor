// 사전 본문 바깥의 문구 — 해금 조건, 스테이지1 인트로, 동의·법적 고지 — 를 대조한다.
//
// 예전에는 i18nExtra.audit.mjs라는 수동 스크립트였고 두 군데가 썩어 있었다.
//  1) useGameStore에서 STAGE1_INTRO_LINES를 import했는데 그 export는 STAGE1_INTRO_IDS로
//     바뀌어 사라진 지 오래라 스크립트가 로드조차 되지 않았다.
//  2) 인트로 문구는 로케일 사전(intro.stage1.N)에서 대사 저장소(dialogues/*/quests.txt)로
//     이관됐는데 스크립트는 계속 사전을 들여다봤다. 지금 세 로케일 사전 모두 그 키가 0개다.
// vitest로 옮겨 npm test·prebuild 게이트에서 자동으로 돌게 한다.
import { describe, expect, it } from 'vitest'
import en from './locales/en.js'
import ja from './locales/ja.js'
import ko from './locales/ko.js'
import { WEAPON_CATALOG, getAllWeaponIds } from './weaponCatalog.js'
import { STAGE1_INTRO_IDS } from '../store/useGameStore.js'
import { getDialogueText } from '../dialogues/dialogueStore.js'

const HANGUL = /[가-힣]/

describe('사전 바깥 문구 커버리지', () => {
  it('무기 해금 조건 문구가 ko·en·ja에 있다', () => {
    const types = new Set()
    for (const id of getAllWeaponIds()) {
      const conds = WEAPON_CATALOG[id].unlockConditions
      if (Array.isArray(conds)) for (const cond of conds) types.add(cond.type)
    }
    // 조건 타입이 하나도 안 걸리면 검사가 통째로 무의미해지므로 개수부터 못 박는다.
    expect(types.size).toBeGreaterThan(0)

    const problems = []
    for (const type of types) {
      for (const [name, dict] of Object.entries({ ko, en, ja })) {
        if (dict[`cond.${type}`] === undefined) problems.push(`${name}: missing cond.${type}`)
      }
    }
    expect(problems).toEqual([])
  })

  it('스테이지1 인트로 3줄이 en·ja로 번역돼 있다', () => {
    expect(STAGE1_INTRO_IDS).toHaveLength(3)
    const problems = []
    for (const id of STAGE1_INTRO_IDS) {
      for (const locale of ['en', 'ja']) {
        // 번역이 없으면 getDialogueText가 조용히 한국어로 폴백한다 — 한글 유무로 판정해야 잡힌다.
        const text = getDialogueText(id, locale)
        if (!text || HANGUL.test(text)) problems.push(`${locale}: untranslated ${id} -> "${text}"`)
      }
    }
    expect(problems).toEqual([])
  })

  it('동의·법적 고지 문구가 en·ja에 있다', () => {
    const problems = []
    for (const id of ['terms', 'privacy']) {
      for (const key of [`consent.item.${id}`, `legal.${id}.title`, `legal.${id}.text`]) {
        for (const [name, dict] of Object.entries({ en, ja })) {
          if (dict[key] === undefined) problems.push(`${name}: missing ${key}`)
        }
      }
    }
    expect(problems).toEqual([])
  })
})
