// UI 개그 효과음 — 모든 UI 조작(탭·열기·닫기·탭 전환·토글·슬라이더·구매·거절·카드 선택·대사 넘김)의 단일 정본.
// 2026-11-14 Terry "니가 만든 개그음 중 적합한 것을 골라 모든 UI 사용 동작에 모두 접목해" (soundmini).
//
// 음원은 새로 만들지 않았다 — 오늘 합성한 좀비 개그음 21종(public/sfx/enemies/gag*.ogg) 중 성격이 맞는 것을
// 골라 rate(피치·길이)와 volume만 UI용으로 다시 잡았다. UI는 1초에 5번 연타해도 거슬리면 안 되므로
// 전부 짧고(0.08~0.48s) 작게(0.24~0.45) 잡았다. 같은 ID의 연타 간격은 sfxRegistry POLYPHONY_COOLDOWN이 건다
// (예: 슬픈 트롬본 450ms, 반짝 300ms, 뿅 160ms, 종이 착 90ms).
//
// 재생 경로: emitUiSfx → sfxEvents(emitSfx, ui: true) → SfxLayer → playSfx(…, { ui: true }).
// ui 플래그는 (1) 전투 보이스 상한에 걸려 버려지지 않게, (2) 로그인 오버레이 중에도 울리게 한다.
// 효과음 볼륨·음소거 설정은 Howler 마스터 게인을 그대로 따른다(sfxRegistry.applySfxMasterVolume).
//
// 적용 방식: 앱 루트의 위임 리스너(installUiSfxListener) 하나가 버튼·링크·탭·체크박스·슬라이더를 전부 받는다.
// 표시가 없는 버튼은 기본 'tap'이 울리므로 앞으로 추가되는 버튼도 무음이 되지 않는다.
// 기본과 다른 종류는 data-ui-sfx="kind"로 표시하고, 자기 고유음(보스 쇼타임 등)이 있는 요소는 "none"으로 뺀다.
import { emitSfx } from './sfxEvents.js'

export const UI_SFX = Object.freeze({
  // 일반 탭(표시 없는 모든 버튼) — 순간이동 '뿅'을 조금 높고 짧게.
  tap:       Object.freeze({ id: 'gagBlinkPop',      rate: 1.15, volume: 0.36 }),
  // 주 행동(시작·재개·다시하기·저장·다음 스테이지) — 우유갑 '펑'.
  confirm:   Object.freeze({ id: 'gagCartonPop',     rate: 1.15, volume: 0.42 }),
  // 패널·모달·메뉴·화면 열기 — 용수철 '뾰잉'.
  open:      Object.freeze({ id: 'gagWindup',        rate: 1.1,  volume: 0.34 }),
  // 닫기·뒤로·취소·건너뛰기·바깥 탭 — '휙'.
  close:     Object.freeze({ id: 'gagSwoosh',        rate: 1.25, volume: 0.3 }),
  // 탭 전환·필터·언어/외형/곡 고르기(aria-pressed·role=tab) — 종이 '착'.
  select:    Object.freeze({ id: 'gagCardFlick',     rate: 1.15, volume: 0.42 }),
  // 토글 켜기 — 운동화 '끽'(위로 오르는 음). 고음이라 가장 작게.
  toggleOn:  Object.freeze({ id: 'gagSneakerSqueak', rate: 1,    volume: 0.24 }),
  // 토글 끄기 — 도미노 '딱'을 낮게.
  toggleOff: Object.freeze({ id: 'gagDominoClack',   rate: 0.8,  volume: 0.4 }),
  // 슬라이더 눈금 — 도미노 '딱'을 높고 작게. 드래그 중 input마다 울리고 쿨다운(100ms)이 초당 10틱으로 묶는다.
  slider:    Object.freeze({ id: 'gagDominoClack',   rate: 1.35, volume: 0.26 }),
  // 잠긴 스테이지·코인 부족·잠긴 옷 — 슬픈 트롬본을 빠르게(0.62s → 0.48s).
  denied:    Object.freeze({ id: 'gagWahWah',        rate: 1.3,  volume: 0.3 }),
  // 구매 성공·보상 수령 — 반짝 상승 4음.
  purchase:  Object.freeze({ id: 'gagBuffSparkle',   rate: 1,    volume: 0.42 }),
  // 레벨업 카드 고르기·무기 교체 확정 — 공 '퍽-뵹'.
  cardPick:  Object.freeze({ id: 'gagBallThwack',    rate: 1.15, volume: 0.4 }),
  // 대사·인트로 넘기기 — 종이 '착'을 낮게(책장 넘김).
  advance:   Object.freeze({ id: 'gagCardFlick',     rate: 0.8,  volume: 0.34 }),
})

export const UI_SFX_KINDS = Object.freeze(Object.keys(UI_SFX))
export const UI_SFX_DEFAULT_KIND = 'tap'
export const UI_SFX_ATTR = 'data-ui-sfx'

// 위임 리스너가 UI 조작으로 보는 요소. [data-ui-sfx]는 버튼이 아닌 클릭 영역(잠긴 스테이지 카드, 바깥 탭 백드롭)용.
// 캔버스·조이스틱·대사 캐처(div)는 여기에 없으므로 게임플레이 터치는 UI 소리를 내지 않는다.
export const UI_SFX_TARGET_SELECTOR = [
  `[${UI_SFX_ATTR}]`,
  'button',
  'a[href]',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="option"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="range"]',
  'summary',
].join(', ')

const CLOSE_GLYPH = /^[×✕✖]$/

/** 종류 이름으로 UI 효과음을 낸다. 'none'·모르는 이름은 조용히 무시한다. 절대 throw하지 않는다. */
export function emitUiSfx(kind) {
  const config = UI_SFX[kind]
  if (!config) return
  emitSfx({ id: config.id, volume: config.volume, rate: config.rate, ui: true })
}

export function findUiSfxTarget(node) {
  if (!node || typeof node.closest !== 'function') return null
  return node.closest(UI_SFX_TARGET_SELECTOR)
}

function isRangeInput(el) {
  return el?.tagName === 'INPUT' && String(el.type).toLowerCase() === 'range'
}

function isNativelyDisabled(el) {
  if (el.disabled === true) return true
  try { return el.matches(':disabled') } catch { return false }
}

export function isUiSfxDisabled(el) {
  return isNativelyDisabled(el) || el.getAttribute('aria-disabled') === 'true'
}

/**
 * 요소가 낼 UI 효과음 종류. null이면 무음.
 * 우선순위: data-ui-sfx 명시 → 체크박스/스위치(바뀐 뒤 상태) → 탭·선택(aria-pressed/selected, role=tab)
 * → 펼침(aria-expanded: 열려 있으면 닫기, 닫혀 있으면 열기) → × 글자 버튼(닫기) → 기본 'tap'.
 */
export function resolveUiSfxKind(el) {
  if (!el || typeof el.getAttribute !== 'function') return null
  const explicit = el.getAttribute(UI_SFX_ATTR)
  if (explicit != null && explicit !== '') {
    if (explicit === 'none') return null
    return UI_SFX[explicit] ? explicit : UI_SFX_DEFAULT_KIND
  }
  const tag = el.tagName
  const type = String(el.getAttribute('type') || '').toLowerCase()
  // 체크박스는 click 디스패치 전에 checked가 이미 뒤집혀 있다(바뀐 뒤 상태).
  if (tag === 'INPUT' && type === 'checkbox') return el.checked ? 'toggleOn' : 'toggleOff'
  if (tag === 'INPUT' && type === 'radio') return 'select'
  if (tag === 'INPUT' && type === 'range') return 'slider'
  const role = el.getAttribute('role')
  // aria-checked는 React가 click 처리 뒤에 갱신하므로 지금 값은 바뀌기 전 상태다.
  if (role === 'switch' || role === 'checkbox') return el.getAttribute('aria-checked') === 'true' ? 'toggleOff' : 'toggleOn'
  if (role === 'tab' || role === 'option' || el.hasAttribute('aria-selected') || el.hasAttribute('aria-pressed')) return 'select'
  const expanded = el.getAttribute('aria-expanded')
  if (expanded === 'true') return 'close'
  if (expanded === 'false') return 'open'
  if (CLOSE_GLYPH.test(String(el.textContent || '').trim())) return 'close'
  return UI_SFX_DEFAULT_KIND
}

/**
 * 문서 루트에 위임 리스너를 단다. 반환값은 해제 함수.
 * - click(capture): 모든 UI 요소. 비활성 요소는 'denied'로 표시된 것만 울린다(aria-disabled는 click을 받는다).
 * - pointerup(capture): 진짜 disabled 버튼은 click을 받지 못하므로, 'denied'로 표시된 것만 여기서 울린다.
 *   손가락이 스크롤로 넘어가면 pointerup 대신 pointercancel이 오므로 스크롤 중 거절음은 나지 않는다.
 * - input(capture): 슬라이더 드래그·키보드 조작 눈금.
 * capture 단계라 React의 stopPropagation과 무관하게 모든 조작을 본다.
 */
export function installUiSfxListener(root = typeof document !== 'undefined' ? document : null) {
  if (!root || typeof root.addEventListener !== 'function') return () => {}

  const onClick = (event) => {
    try {
      const el = findUiSfxTarget(event.target)
      if (!el || isRangeInput(el)) return
      const kind = resolveUiSfxKind(el)
      if (!kind) return
      if (isUiSfxDisabled(el) && kind !== 'denied') return
      emitUiSfx(kind)
    } catch { /* UI 소리 실패가 클릭을 막으면 안 된다. */ }
  }

  const onPointerUp = (event) => {
    try {
      if (typeof event.button === 'number' && event.button > 0) return
      const el = findUiSfxTarget(event.target)
      if (!el || !isNativelyDisabled(el)) return
      if (resolveUiSfxKind(el) === 'denied') emitUiSfx('denied')
    } catch { /* noop */ }
  }

  const onInput = (event) => {
    try {
      const el = event.target
      if (!isRangeInput(el) || isNativelyDisabled(el)) return
      const kind = resolveUiSfxKind(el)
      if (kind) emitUiSfx(kind)
    } catch { /* noop */ }
  }

  root.addEventListener('click', onClick, true)
  root.addEventListener('pointerup', onPointerUp, true)
  root.addEventListener('input', onInput, true)
  return () => {
    root.removeEventListener('click', onClick, true)
    root.removeEventListener('pointerup', onPointerUp, true)
    root.removeEventListener('input', onInput, true)
  }
}
