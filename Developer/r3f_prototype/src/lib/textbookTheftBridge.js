// 픽업 가로채기 API — E90 숙제 걷기 당번(도둑)이 바닥 교과서를 주워 가는 단일 통로. Level_Mini 소유.
//
// 교과서 필드(components/XpTextbook.jsx XpTextbookLayer, 헤드리스 프로브의 orbs 배열)는 자기 목록을 여기 등록만 한다.
// 시뮬레이션(novelZombie2Behavior)은 등록된 목록을 읽어 훔칠 책을 고르고 stealTextbook으로 표시만 한다 —
// 실제로 필드에서 지우는 일(슬롯 반납·React 목록 갱신)은 필드 쪽이 다음 프레임에 stolen 표식을 보고 한다(XP는 주지 않는다).
//
// 항목 모양: 게임 필드 = createTextbookItem(lib/xpTextbookField.js) — 좌표 item.p.{x,z}, 착지 전 item.landed false.
//           프로브 orbs = { x, z, value } — 이미 바닥에 있다.
// 순수 모듈(three·React 의존 없음). 프레임 경로에서 할당하지 않는다.

let source = null
// 플레이어 자석(흡입) 반경. lib/pickup.js setMagnetMultiplier가 갱신한다(기본 1.2u = BASE_PULL_RADIUS).
let magnetRadius = 1.2

export function setTextbookTheftMagnetRadius(radius) {
  if (Number.isFinite(radius) && radius > 0) magnetRadius = radius
}

export function getTextbookTheftMagnetRadius() {
  return magnetRadius
}

/** 필드가 자기 교과서 배열(참조)을 등록한다. null이면 해제. 같은 배열을 계속 들고 있으므로 필드가 배열을 고치면 그대로 보인다. */
export function setTextbookTheftSource(items) {
  source = Array.isArray(items) ? items : null
}

/** 등록 해제(그 배열이 지금 등록된 것일 때만 — 다른 필드가 이미 새로 등록했으면 건드리지 않는다). */
export function clearTextbookTheftSource(items) {
  if (!items || source === items) source = null
}

export function getTextbookTheftSource() {
  return source
}

function itemX(item) { return item.p ? item.p.x : item.x }
function itemZ(item) { return item.p ? item.p.z : item.z }

export function isStealableTextbook(item) {
  return Boolean(item) && item.collected !== true && item.stolen !== true && item.landed !== false
    && Number.isFinite(itemX(item)) && Number.isFinite(itemZ(item))
}

/**
 * (x, z)에서 radius 안, 플레이어에게서 minPlayerDist보다 먼(자석 범위 + 1u 밖) 가장 가까운 교과서. 없으면 null.
 * out = { x, z }에 좌표를 채운다.
 */
export function findStealableTextbookInto(out, x, z, radius, playerX, playerZ, minPlayerDist) {
  if (!source) return null
  const r2 = radius * radius
  const keep2 = minPlayerDist * minPlayerDist
  let best = null
  let bestD2 = Infinity
  for (let i = 0; i < source.length; i += 1) {
    const item = source[i]
    if (!isStealableTextbook(item)) continue
    const bx = itemX(item)
    const bz = itemZ(item)
    const pdx = bx - playerX
    const pdz = bz - playerZ
    if (pdx * pdx + pdz * pdz <= keep2) continue
    const dx = bx - x
    const dz = bz - z
    const d2 = dx * dx + dz * dz
    if (d2 <= r2 && d2 < bestD2) { bestD2 = d2; best = item }
  }
  if (best && out) { out.x = itemX(best); out.z = itemZ(best) }
  return best
}

export function textbookPositionInto(out, item) {
  out.x = itemX(item)
  out.z = itemZ(item)
  return out
}

/** 훔친다: stolen 표식을 달고 그 책의 XP 값을 돌려준다(이미 없어졌으면 0). 필드가 다음 프레임에 XP 없이 치운다. */
export function stealTextbook(item) {
  if (!isStealableTextbook(item)) return 0
  item.stolen = true
  return Number.isFinite(item.value) && item.value > 0 ? item.value : 0
}
