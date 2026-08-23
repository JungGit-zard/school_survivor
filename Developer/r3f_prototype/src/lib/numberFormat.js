// 게임 내 "무한히 커지는 수치"의 표시 단일 출처.
//
// 무한 모드는 상한이 없다. 탈출구가 열린 뒤에도 안 들어가면 계속 버틸 수 있고, 점수는
// 생존 시간에 비례해 끝없이 오른다(100시간 = 360,000점대, 3년 = 94,608,000점대). 그래서
// 표시 계층에는 두 가지 요구가 있다.
//   1) 자릿수가 늘어나도 화면이 깨지지 않을 것 — 기본(평문) 표시.
//   2) 원하는 플레이어는 과학적 기수법으로 짧게 볼 수 있을 것 — 설정 토글.
//
// 적용 범위는 "런 길이에 따라 무한히 자라는 수치"로 한정한다: 점수(실시간·결과·랭킹)와
// 골드. HP·레벨·거리는 상한이 있고, 데미지 숫자는 프레임당 캔버스 텍스처를 굽는 핫패스라
// (damageNumbers.js) 표기 분기를 넣을 자리가 아니다.
//
// 시간은 기수법 대상이 아니다. 시계는 h:mm:ss가 언제나 더 읽히고, 3.6e5초라는 표기로는
// "지금 몇 시간째인지"를 판단할 수 없다 — 무한 모드의 저울질에 필요한 정보가 사라진다.
//
// 영속화는 titleSettings.js(Firebase users/{uid}.titleSettings)가 담당하고 이 모듈은
// 런타임 표시 상태만 들고 있다. i18n.js의 useLocaleStore와 같은 구조다.
import { create } from 'zustand'

// 유효숫자 상한. 3년(94,608,000초)까지 반올림 없이 그대로 적히는 최소값이다(9.4608e7).
const SCIENTIFIC_MAX_DECIMALS = 4

export const useNumberFormatStore = create((set) => ({
  scientific: false,
  setScientific: (scientific) => set({ scientific: scientific === true }),
}))

export function getScientificNotation() {
  return useNumberFormatStore.getState().scientific
}

export function setScientificNotation(scientific) {
  useNumberFormatStore.getState().setScientific(scientific)
}

// 설정이 바뀌면 리렌더가 필요한 컴포넌트용 훅.
export function useScientificNotation() {
  return useNumberFormatStore((state) => state.scientific)
}

// 표시용 정수화. NaN/Infinity/undefined가 화면에 새어 나가지 않게 막는 마지막 방어선이다.
export function toDisplayInteger(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.trunc(number)
}

// 1 → '1', 240 → '2.4e2', 360000 → '3.6e5', 94608000 → '9.4608e7'
export function formatScientific(value) {
  const integer = toDisplayInteger(value)
  if (integer === 0) return '0'
  const sign = integer < 0 ? '-' : ''
  const [mantissa, exponent] = Math.abs(integer).toExponential(SCIENTIFIC_MAX_DECIMALS).split('e')
  // 1.0000e2 처럼 의미 없는 0은 떨어뜨린다. 소수점만 남으면 그것도 지운다.
  const trimmed = mantissa.includes('.')
    ? mantissa.replace(/0+$/, '').replace(/\.$/, '')
    : mantissa
  return `${sign}${trimmed}e${Number(exponent)}`
}

// 자릿수 구분 기호는 로케일과 무관하게 en-US로 고정한다. ko/en/ja 모두 세 자리 쉼표를
// 쓰고, 로케일에 맡기면 같은 점수가 언어별로 다른 폭이 되어 레이아웃 검증이 무의미해진다.
export function formatPlainNumber(value) {
  return toDisplayInteger(value).toLocaleString('en-US')
}

export function formatGameNumber(value, scientific = getScientificNotation()) {
  return scientific ? formatScientific(value) : formatPlainNumber(value)
}

// i18n의 useT와 같은 사용법: 설정 변경 시 리렌더를 구독하고 포맷터를 돌려준다.
export function useGameNumber() {
  useScientificNotation()
  return formatGameNumber
}

// 한 시간 미만은 지금까지와 같은 mm:ss, 그 이상은 h:mm:ss. 시간 자리는 패딩하지 않고
// 자릿수 제한도 두지 않는다 — 100시간이면 100:00:00, 3년이면 26280:00:00으로 그대로 적힌다.
// (예전 mm:ss 고정 표기는 100시간을 '6000:00'으로 뭉개서 몇 시간째인지 읽을 수 없었다.)
export function formatRunClockSeconds(value) {
  const total = Math.max(0, toDisplayInteger(value))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatRunClock(milliseconds) {
  return formatRunClockSeconds(Math.floor(Math.max(0, toDisplayInteger(milliseconds)) / 1000))
}
