// 게임 전체 문구의 단일 번역 계층. 한국어(ko) 정본 + 영어(en) + 일본어(ja).
//
// 두 가지 문구 출처를 구분한다:
//  1) UI 크롬(버튼·라벨·안내문) — ko.js/en.js/ja.js 사전에 키로 정리한다.
//  2) 게임 데이터(무기 카탈로그, 퀘스트, 조사 대사, 법적 문서, 스테이지 프롭 …)
//     — 한국어 원문을 데이터 파일에 그대로 두고 t(key, params, fallback)의
//       fallback으로 넘긴다. 이유:
//       · weaponPermanentUpgrades.js 처럼 게임 로직이 한국어 문자열을 매칭에 쓴다.
//       · 한국어 정본을 두 곳에 복제하면 반드시 어긋난다.
//     en/ja 사전만 해당 키를 채우면 번역이 붙는다.
//
// 선택한 언어는 다른 게임 환경 설정과 같이 Firebase users/{uid}.titleSettings에 저장한다
// (localStorage 저장 금지 정책 — lib/localStoragePolicy.test.js). 이 모듈은 런타임 상태만
// 들고 있고, 영속화는 titleSettings.js가 담당한다. 로그인 전에는 브라우저 언어를 쓴다.
import { create } from 'zustand'
import ko from './locales/ko.js'
import en from './locales/en.js'
import ja from './locales/ja.js'

export const LOCALE_OPTIONS = Object.freeze([
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語' },
])

const DICTS = { ko, en, ja }

export function isSupportedLocale(locale) {
  return Object.prototype.hasOwnProperty.call(DICTS, locale)
}

// 로그인 전(=저장된 언어를 읽을 수 없는 시점)의 기본 언어.
export function detectInitialLocale() {
  const tags = typeof navigator === 'undefined'
    ? []
    : [navigator.language, ...(navigator.languages ?? [])].filter(Boolean)
  for (const tag of tags) {
    const lower = String(tag).toLowerCase()
    if (lower.startsWith('ko')) return 'ko'
    if (lower.startsWith('ja')) return 'ja'
    if (lower.startsWith('en')) return 'en'
  }
  return 'ko'
}

export const useLocaleStore = create((set) => ({
  locale: detectInitialLocale(),
  // 런타임 표시 언어만 바꾼다. 저장은 titleSettings.applyLanguage/saveTitleSettings 경로.
  setLocale: (locale) => {
    if (!DICTS[locale]) return
    if (typeof document !== 'undefined') document.documentElement.lang = locale
    set({ locale })
  },
}))

export function getLocale() {
  return useLocaleStore.getState().locale
}

export function setLocale(locale) {
  useLocaleStore.getState().setLocale(locale)
}

function lookup(key, fallback) {
  const locale = getLocale()
  const value = DICTS[locale]?.[key]
  if (value !== undefined) return value
  if (locale !== 'ko') {
    // 번역 누락 → 한국어 정본으로 폴백(빈 화면보다 낫다).
    const korean = DICTS.ko[key]
    if (korean !== undefined) return korean
  } else {
    const korean = DICTS.ko[key]
    if (korean !== undefined) return korean
  }
  return fallback !== undefined ? fallback : key
}

function interpolate(raw, params) {
  if (typeof raw !== 'string' || !params) return raw
  return raw.replace(/\{(\w+)\}/g, (match, name) => (params[name] ?? match))
}

// t('key'), t('key', { name: '값' }), t('key', null, '한국어 원문')
export function t(key, params, fallback) {
  return interpolate(lookup(key, fallback), params)
}

// 배열 문구(대사 풀 등). fallback은 한국어 원본 배열.
export function tList(key, fallback) {
  const raw = lookup(key, fallback)
  return Array.isArray(raw) ? raw : []
}

// 로케일 변경 시 리렌더가 필요한 컴포넌트용 훅.
export function useT() {
  useLocaleStore((state) => state.locale)
  return t
}

export function useLocale() {
  return useLocaleStore((state) => state.locale)
}

// ─── 도메인 헬퍼 (게임 데이터 id → 표시 문구) ───
export const weaponLabel = (id, fallback) => t(`weapon.${id}`, null, fallback)
export const passiveLabel = (id, fallback) => t(`passive.${id}`, null, fallback)
export const propLabel = (type, fallback) => t(`prop.${type}`, null, fallback)
export const stageTitle = (id, fallback) => t(`stage.${id}.title`, null, fallback)
export const milestoneLabel = (korean) => t(`milestone.${korean}`, null, korean)

// 영구 강화 summary는 makePlan이 "<지표> <수치>"로 조립한다(수치는 언어 중립).
// 알려진 지표 문구를 긴 것부터 치환해 번역한다.
const PERMANENT_SUMMARY_PHRASES = [
  '폭발 후 짧은 둔화 장판 생성', '일정 확률로 추가 절단 1회', '빛에 맞은 적 둔화 확률',
  '추가 소형 낙하 타격 확률', '휘두르기 판정 유지시간', '화학 웅덩이 지속시간',
  '웅덩이 지속시간 추가', '모든 무기 능력 보너스', '바운스 횟수 추가', '기본 투사체 수',
  '기본 궤도체 수', '스택 폭발 범위', '짧은 경직 확률', '귀소 전환 시간', '치비코 투척체',
  '동료 공격 주기', '파동 도달거리', '유도 회전력', '웅덩이 범위', '바운스 횟수',
  '밀어내기 범위', '투사체 속도', '치명타 확률', '빛 콘 길이', '빛 콘 각도', '펄스 쿨타임', '펄스 범위',
  '타격 반경', '타격 피해', '폭발 범위', '폭발 피해', '동료 피해', '칼날 피해',
  '접촉 피해', '회전 속도', '파동 크기', '공격 범위', '귀소 속도', '체인 수',
  '회복량', '공격력', '쿨타임', '넉백', '피해',
]

export function permanentSummary(summary) {
  if (typeof summary !== 'string') return ''
  if (getLocale() === 'ko') return summary
  for (const phrase of PERMANENT_SUMMARY_PHRASES) {
    if (!summary.startsWith(phrase)) continue
    return `${t(`perm.${phrase}`, null, phrase)}${summary.slice(phrase.length)}`
  }
  return summary
}
