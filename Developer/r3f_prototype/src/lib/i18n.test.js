import { afterEach, describe, expect, it } from 'vitest'
import en from './locales/en.js'
import ja from './locales/ja.js'
import ko from './locales/ko.js'
import {
  LOCALE_OPTIONS,
  getLocale,
  permanentSummary,
  setLocale,
  t,
  tList,
  useLocaleStore,
} from './i18n.js'

const HANGUL = /[가-힣]/

afterEach(() => {
  useLocaleStore.setState({ locale: 'ko' })
})

describe('i18n', () => {
  it('offers exactly the three shipped locales', () => {
    expect(LOCALE_OPTIONS.map((option) => option.id)).toEqual(['ko', 'en', 'ja'])
  })

  it('switches locale and reads from the active dictionary', () => {
    expect(t('title.start')).toBe('게임 시작')
    setLocale('en')
    expect(getLocale()).toBe('en')
    expect(t('title.start')).toBe('START GAME')
    setLocale('ja')
    expect(t('title.start')).toBe('ゲーム開始')
  })

  it('ignores unknown locales', () => {
    setLocale('fr')
    expect(getLocale()).toBe('ko')
  })

  it('interpolates {token} params', () => {
    setLocale('en')
    expect(t('hud.levelUp', { level: 7 })).toBe('LEVEL UP! Lv.7')
  })

  it('falls back to the caller fallback, then the key', () => {
    setLocale('en')
    expect(t('quest.made-up.title', null, '한국어 원문')).toBe('한국어 원문')
    expect(t('totally.missing.key')).toBe('totally.missing.key')
  })

  it('falls back from a missing translation to the Korean canonical copy', () => {
    setLocale('ja')
    // ko 사전에만 있고 ja 사전에 없는 키를 임의로 만들 수 없으므로, ko 전용 키로 검증한다.
    const koOnlyKeys = Object.keys(ko).filter((key) => ja[key] === undefined)
    for (const key of koOnlyKeys) expect(t(key)).toBe(ko[key])
  })

  it('returns localized list copy with an array fallback', () => {
    setLocale('en')
    expect(tList('dialogue.laid')).toHaveLength(52)
    expect(tList('dialogue.nope', ['a', 'b'])).toEqual(['a', 'b'])
    expect(tList('title.start')).toEqual([])
  })

  it('keeps permanent upgrade summaries untouched in Korean and translates the stat phrase elsewhere', () => {
    expect(permanentSummary('공격력 +2%')).toBe('공격력 +2%')
    setLocale('en')
    expect(permanentSummary('공격력 +2%')).toBe('Attack +2%')
    expect(permanentSummary('화학 웅덩이 지속시간 +3%')).toBe('Chemical pool duration +3%')
    setLocale('ja')
    expect(permanentSummary('치명타 확률 +4%')).toBe('クリティカル率 +4%')
    // 알 수 없는 지표는 원문 그대로 통과시킨다(로직 문자열 매칭을 깨지 않는다).
    expect(permanentSummary('없는 지표 +1%')).toBe('없는 지표 +1%')
  })

  it('translates every Korean UI-chrome key into en and ja', () => {
    const missingEn = Object.keys(ko).filter((key) => en[key] === undefined)
    const missingJa = Object.keys(ko).filter((key) => ja[key] === undefined)
    expect({ missingEn, missingJa }).toEqual({ missingEn: [], missingJa: [] })
  })

  it('leaves no Hangul in the English dictionary values', () => {
    const leaked = Object.entries(en)
      .filter(([key]) => !key.startsWith('perm.') && !key.startsWith('milestone.'))
      .filter(([, value]) => (Array.isArray(value) ? value.some((line) => HANGUL.test(line)) : HANGUL.test(String(value))))
      .map(([key]) => key)
    expect(leaked).toEqual([])
  })

  it('leaves no Hangul in the Japanese dictionary values', () => {
    const leaked = Object.entries(ja)
      .filter(([key]) => !key.startsWith('perm.') && !key.startsWith('milestone.'))
      .filter(([, value]) => (Array.isArray(value) ? value.some((line) => HANGUL.test(line)) : HANGUL.test(String(value))))
      .map(([key]) => key)
    expect(leaked).toEqual([])
  })
})
