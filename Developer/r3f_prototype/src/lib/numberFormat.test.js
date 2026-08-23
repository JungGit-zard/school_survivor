import { beforeEach, describe, expect, it } from 'vitest'
import {
  formatGameNumber,
  formatPlainNumber,
  formatRunClock,
  formatRunClockSeconds,
  formatScientific,
  getScientificNotation,
  setScientificNotation,
  toDisplayInteger,
} from './numberFormat.js'

// 무한 모드는 런 길이에 상한이 없다. 여기서 지키는 건 "얼마나 커져도 화면에 온전히 적힌다"는
// 계약이다 - 기록은 남는데 표시가 깨지면 요구가 지켜진 게 아니다.
const HUNDRED_HOURS_SEC = 360_000
const THREE_YEARS_SEC = 94_608_000

describe('numberFormat', () => {
  beforeEach(() => {
    setScientificNotation(false)
  })

  it('keeps NaN, Infinity and undefined off the screen', () => {
    expect(toDisplayInteger(undefined)).toBe(0)
    expect(toDisplayInteger(Number.NaN)).toBe(0)
    expect(toDisplayInteger(Number.POSITIVE_INFINITY)).toBe(0)
    expect(toDisplayInteger('240')).toBe(240)
    expect(toDisplayInteger(240.9)).toBe(240)
  })

  it('writes plain numbers with three-digit separators', () => {
    expect(formatPlainNumber(0)).toBe('0')
    expect(formatPlainNumber(240)).toBe('240')
    expect(formatPlainNumber(HUNDRED_HOURS_SEC)).toBe('360,000')
    expect(formatPlainNumber(THREE_YEARS_SEC)).toBe('94,608,000')
  })

  it('writes scientific notation without trailing zeros', () => {
    expect(formatScientific(0)).toBe('0')
    // 작은 수도 지수를 달고 나온다(1e0). 켠 사람이 원한 건 일관된 표기이므로
    // 자릿수에 따라 표기가 바뀌는 예외를 두지 않는다. 0만 '0'이다.
    expect(formatScientific(1)).toBe('1e0')
    expect(formatScientific(240)).toBe('2.4e2')
    expect(formatScientific(HUNDRED_HOURS_SEC)).toBe('3.6e5')
    // 3년까지는 반올림 없이 그대로 적힌다 - 유효숫자를 줄이면 기록이 소리 없이 뭉개진다.
    expect(formatScientific(THREE_YEARS_SEC)).toBe('9.4608e7')
  })

  it('switches every game number when the setting is toggled', () => {
    expect(getScientificNotation()).toBe(false)
    expect(formatGameNumber(THREE_YEARS_SEC)).toBe('94,608,000')

    setScientificNotation(true)
    expect(getScientificNotation()).toBe(true)
    expect(formatGameNumber(THREE_YEARS_SEC)).toBe('9.4608e7')

    setScientificNotation(false)
    expect(formatGameNumber(THREE_YEARS_SEC)).toBe('94,608,000')
  })

  it('grows the run clock into hours instead of overflowing minutes', () => {
    expect(formatRunClockSeconds(0)).toBe('00:00')
    expect(formatRunClockSeconds(210)).toBe('03:30')
    expect(formatRunClockSeconds(3599)).toBe('59:59')
    // 예전 mm:ss 고정 표기는 100시간을 '6000:00'으로 뭉개 몇 시간째인지 못 읽게 했다.
    expect(formatRunClockSeconds(3600)).toBe('1:00:00')
    expect(formatRunClockSeconds(HUNDRED_HOURS_SEC)).toBe('100:00:00')
    expect(formatRunClockSeconds(THREE_YEARS_SEC)).toBe('26280:00:00')
  })

  it('reads the run clock from milliseconds', () => {
    expect(formatRunClock(210_000)).toBe('03:30')
    expect(formatRunClock(HUNDRED_HOURS_SEC * 1000)).toBe('100:00:00')
    expect(formatRunClock(-5)).toBe('00:00')
  })

  it('never falls back to exponent form while the setting is off', () => {
    // toLocaleString과 달리 String(1e21)은 '1e+21'을 뱉는다. 설정이 꺼져 있는데
    // 지수 표기가 새어 나오면 토글이 거짓말이 된다.
    setScientificNotation(false)
    expect(formatGameNumber(1e21)).not.toMatch(/e\+?\d/i)
  })
})
