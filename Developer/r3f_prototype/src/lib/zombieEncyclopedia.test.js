// @vitest-environment jsdom
// Track B 신규 일반 좀비 12종(E34~E45)의 도감 표시명 계약.
//
// 라벨이 비어 있으면 도감은 ID를 그대로 노출한다("미등록"). 타입 등록(enemyEntityPool의
// NOVEL_ZOMBIE_TYPE_IDS)과 표시명 등록은 서로 다른 파일이라 조용히 어긋난다 — 여기서 묶는다.
// 한국어 정본: Planner/stage_zombie_original_concepts_20261025.md의 개념명.
// en/ja는 음차가 아니라 행동을 설명하는 짧은 이름이며, 누락 시 i18n이 조용히 한국어로
// 폴백하므로 "키가 있나"가 아니라 "한글이 새어 나오나"로도 함께 판정한다.
import { describe, expect, it, beforeEach, afterAll } from 'vitest'
import ko from './locales/ko.js'
import en from './locales/en.js'
import ja from './locales/ja.js'
import { setLocale } from './i18n.js'
import { ENEMY_TYPE_NAMES, NOVEL_ZOMBIE_TYPE_IDS } from './enemyEntityPool.js'
import { ZOMBIE_ENCYCLOPEDIA_TYPES, buildZombieEncyclopediaEntries, getZombieTypeLabel, isKnownZombieType, normalizeZombieEncounterMap } from './zombieEncyclopedia.js'

const HANGUL = /[가-힣]/
const DICTS = { ko, en, ja }

// 기획 정본 그대로. 이 표를 코드에서 가져오면 검사가 무의미해지므로 손으로 못 박는다.
const EXPECTED = {
  E34: { ko: '박자접기형', en: 'Edge-On Shover', ja: '拍子折り型' },
  E35: { ko: '모서리비껴형', en: 'Swerve Clipper', ja: '角すり抜け型' },
  E36: { ko: '반걸음되짚기형', en: 'Half-Step Feinter', ja: '半歩戻り型' },
  E37: { ko: '빗금엇갈림형', en: 'Diagonal Rusher', ja: '斜め交差型' },
  E38: { ko: '빈칸반응형', en: 'Gap Reader', ja: '動き読み型' },
  E39: { ko: '선끝접기형', en: 'Folded-Arm Lunger', ja: '片腕折り型' },
  E40: { ko: '중심축비틀기형', en: 'Axis Twister', ja: '軸ひねり型' },
  E41: { ko: '쌍박자교대형', en: 'Two-Beat Striker', ja: '二拍交互型' },
  E42: { ko: '반원발맞춤형', en: 'Arc Stepper', ja: '半円歩み型' },
  E43: { ko: '엇높이교차형', en: 'High-Low Crosser', ja: '高低交差型' },
  E44: { ko: '발맞춤후퇴형', en: 'Sidestep Flanker', ja: '足並み後退型' },
  E45: { ko: '무게중심넘김형', en: 'Weight Shifter', ja: '重心移し型' },
}
const IDS = Object.keys(EXPECTED)

// 도감 카드 이름 셀 상한. 이름은 스펙 정본이라 줄이지 않고 레이아웃이 받아준다.
// 320/360/390/412px에서 WeaponModal 행 박스모델(48px 실루엣 + 태그 pill, 이름 셀 121~144px,
// fontSize 15 / weight 900)로 실측한 결과:
//   ko 최장 '반걸음되짚기형' 105px, ja 최장 '角すり抜け型' 91px → 320px에서도 한 줄로 들어간다.
//   en 최장 'Folded-Arm Lunger' 144px → 320px(셀 121px)에서는 한 줄이 잘린다.
//     ⇒ 도감 행의 이름 셀은 nowrap+ellipsis가 아니라 2줄 wrap
//        (white-space: normal / word-break: keep-all / -webkit-line-clamp: 2)이어야 한다.
//        그 조건에서 en 20자까지 2줄 안에 들어간다.
const MAX_LENGTH = { ko: 8, en: 20, ja: 8 }

beforeEach(() => setLocale('ko'))
afterAll(() => setLocale('ko'))

describe('신규 좀비 12종 도감 라벨', () => {
  it('런타임 타입 12종이 그대로 도감 타입으로 등록된다', () => {
    expect(NOVEL_ZOMBIE_TYPE_IDS).toEqual(IDS)
    for (const id of IDS) {
      expect(isKnownZombieType(id), id).toBe(true)
      expect(ZOMBIE_ENCYCLOPEDIA_TYPES, id).toContain(id)
    }
    expect(normalizeZombieEncounterMap(Object.fromEntries(IDS.map((id) => [id, 1]))))
      .toEqual(Object.fromEntries(IDS.map((id) => [id, 1])))
  })

  it('ko·en·ja 사전에 12키가 전부 있다', () => {
    const problems = []
    for (const [name, dict] of Object.entries(DICTS)) {
      for (const id of IDS) {
        const value = dict[`zombie.${id}`]
        if (typeof value !== 'string' || value.trim() === '') problems.push(`${name}: missing zombie.${id}`)
      }
    }
    expect(problems).toEqual([])
  })

  it('세 로케일 모두 기획 정본 표시명을 낸다', () => {
    for (const locale of ['ko', 'en', 'ja']) {
      setLocale(locale)
      for (const id of IDS) expect(getZombieTypeLabel(id), `${locale}/${id}`).toBe(EXPECTED[id][locale])
    }
  })

  it('en·ja가 한국어로 조용히 폴백하지 않고 서로 중복되지도 않는다', () => {
    const problems = []
    for (const locale of ['en', 'ja']) {
      setLocale(locale)
      const seen = new Set()
      for (const id of IDS) {
        const label = getZombieTypeLabel(id)
        if (label === id) problems.push(`${locale}: ${id} 미등록`)
        if (HANGUL.test(label)) problems.push(`${locale}: ${id} 한국어 폴백 -> "${label}"`)
        if (seen.has(label)) problems.push(`${locale}: ${id} 중복 표시명 "${label}"`)
        seen.add(label)
      }
    }
    expect(problems).toEqual([])
  })

  it('모바일 한 줄 상한을 넘지 않는다', () => {
    const problems = []
    for (const locale of ['ko', 'en', 'ja']) {
      for (const id of IDS) {
        const label = EXPECTED[id][locale]
        if (label.length > MAX_LENGTH[locale]) problems.push(`${locale}: ${id} ${label.length}자 > ${MAX_LENGTH[locale]}자`)
      }
    }
    expect(problems).toEqual([])
  })

  it('도감 엔트리가 12종을 ID가 아닌 표시명으로 낸다', () => {
    const entries = buildZombieEncyclopediaEntries()
    for (const id of IDS) {
      const entry = entries.find((row) => row.type === id)
      expect(entry, id).toBeDefined()
      expect(entry.label).toBe(EXPECTED[id].ko)
      expect(entry.encountered).toBe(false)
    }
  })
})

// 2026-11-08: Stage 5 보스 B10은 게임 풀 등록보다 먼저 저장 id(도감·조우 허용 목록)로 고정한다.
describe('B10 교감 좀비 도감 id', () => {
  it('is a known encyclopedia type with ko/en/ja names', () => {
    expect(ZOMBIE_ENCYCLOPEDIA_TYPES).toContain('B10')
    expect(isKnownZombieType('B10')).toBe(true)
    expect(normalizeZombieEncounterMap({ B10: 1, B11: 1 })).toEqual({ B10: 1 })
    const expected = { ko: '교감 좀비', en: 'Vice Principal Zombie', ja: '教頭ゾンビ' }
    for (const locale of ['ko', 'en', 'ja']) {
      setLocale(locale)
      expect(getZombieTypeLabel('B10'), locale).toBe(expected[locale])
    }
  })

  it('does not register an E59 mini type', () => {
    expect(isKnownZombieType('E59M')).toBe(false)
  })
})

// 2026-11-08: Stage 6 「운동장 최후의 조회」(spec56 C-4-1·C-6-1). 같은 id(E19~E21·B05)에 이름만 운동장 판으로 바꾼다.
describe('Stage 6 운동장 로스터 도감 표시명', () => {
  const EXPECTED_S6 = {
    E19: { ko: '조회 줄서기 좀비', en: 'Assembly Line Zombie', ja: '朝礼整列ゾンビ' },
    E20: { ko: '국민체조 좀비', en: 'Calisthenics Zombie', ja: 'ラジオ体操ゾンビ' },
    E21: { ko: '계주 바통 좀비', en: 'Relay Baton Zombie', ja: 'リレーバトンゾンビ' },
    B05: { ko: '교장 선생님 좀비', en: 'Principal Zombie', ja: '校長先生ゾンビ' },
  }

  it('shows the schoolyard names (not the old forbidden-library names) in all three locales', () => {
    for (const locale of ['ko', 'en', 'ja']) {
      setLocale(locale)
      for (const [id, names] of Object.entries(EXPECTED_S6)) {
        expect(isKnownZombieType(id), id).toBe(true)
        expect(getZombieTypeLabel(id), `${locale}/${id}`).toBe(names[locale])
      }
    }
  })
})

// 2026-11-07: 투사체 좀비 E46~E60이 도감에서 통째로 빠져 있었다(라벨 표가 E45에서 멈춤). 같은 일이 다시 생기지 않게
// 게임에 등록된 모든 적 코드(ENEMY_TYPE_NAMES)가 세 언어 모두 진짜 표시명을 갖는지 묶는다.
// ko는 도감 표(zombieEncyclopedia.js)가 정본이고, en/ja는 사전 키가 있어야 한다(없으면 i18n이 조용히 한국어로 폴백한다).
describe('등록된 모든 적 코드의 도감 표시명', () => {
  const ALL = ENEMY_TYPE_NAMES.filter(Boolean)

  it('모든 코드가 도감 타입이고 ko 라벨이 ID가 아니다', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(70)
    const problems = []
    setLocale('ko')
    for (const id of ALL) {
      if (!isKnownZombieType(id)) problems.push(`${id} 도감 미등록`)
      const label = getZombieTypeLabel(id)
      if (label === id || !HANGUL.test(label)) problems.push(`ko: ${id} -> "${label}"`)
      const key = ko[`zombie.${id}`]
      if (key !== undefined && key !== label) problems.push(`ko: zombie.${id} "${key}"가 도감 표 "${label}"와 다르다`)
    }
    expect(problems).toEqual([])
  })

  it('en·ja 사전에 모든 코드의 키가 있고 한국어로 폴백하지 않는다', () => {
    const problems = []
    for (const locale of ['en', 'ja']) {
      setLocale(locale)
      for (const id of ALL) {
        const value = DICTS[locale][`zombie.${id}`]
        if (typeof value !== 'string' || value.trim() === '') { problems.push(`${locale}: missing zombie.${id}`); continue }
        const label = getZombieTypeLabel(id)
        if (label !== value) problems.push(`${locale}: ${id} 표시명 "${label}" != 사전 "${value}"`)
        if (HANGUL.test(label)) problems.push(`${locale}: ${id} 한국어 폴백 -> "${label}"`)
      }
    }
    expect(problems).toEqual([])
  })

  it('로케일마다 표시명이 서로 겹치지 않는다', () => {
    const problems = []
    for (const locale of ['ko', 'en', 'ja']) {
      setLocale(locale)
      const seen = new Map()
      for (const id of ALL) {
        const label = getZombieTypeLabel(id)
        if (seen.has(label)) problems.push(`${locale}: ${id}·${seen.get(label)} 같은 표시명 "${label}"`)
        seen.set(label, id)
      }
    }
    expect(problems).toEqual([])
  })
})
