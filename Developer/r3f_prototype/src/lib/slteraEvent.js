// Sltera(슬테라) 돌진 이벤트 — 순수 로직(3D·React 없음). 2026-11-07 Terry:
//   "Sltera가 갑자기 나타나 화면을 가로질러 달리며 지나가는 길의 좀비를 무작위로 치고,
//    로자리를 치면 로자리 HP가 깎인다. 모든 판에 나와야 한다."
//
// 근본 원인 기록: Sltera는 10-31에 Graphics Studio 비주얼(SlteraCar.jsx)만 만들어졌고 게임 런타임
// 어디에서도 스케줄되지 않았다(무작위 확률·스테이지 게이트 문제가 아니라 배선 자체가 없었다).
// 이 파일이 런 스케줄의 정본이다. 무작위 굴림 없이 매 판 반드시 첫 질주가 잡힌다.
//
// 타임라인(런 경과 시간 기준, 일시정지 시간 제외):
//   첫 질주 시작 = 15초 + (gameKey·스테이지 해시 0..1) × 10초  → 15~25초 사이 결정론적.
//   (balanceqa 튜닝: 일찍 죽는 판도 거의 다 보도록 첫 질주를 15~25초로 앞당겼다.)
//   이후 85초마다 반복: 100~110초 → 185~195초(S1~S5 탈출구·마틸다 예고 205~210초 전) → 270~280초 ….
//   그래서 탈출구·마틸다 예고 전에 질주가 최소 세 번 나온다.
// 한 번의 질주(예고 없음 — Terry 스펙 "갑자기 나타나"):
//   예정 시각이 되면 화면 한쪽 가장자리 바로 밖(여유 3u)에서 곧장 14u/s로 출발해 반대편 밖까지 직진한다.
//   경고 띠·헤드램프 맥동 같은 사전 예고는 두지 않는다. 차 앞코가 화면에 들어오기까지 ≈0.08초.
//   세로 화면 기준 보이는 바닥 폭은 5~8u라 화면을 건너는 데 ≈1초.
//   차선 = 지금 화면에 보이는 바닥 행(z) 중 무작위(위아래 가장자리 1.5u 제외), 방향도 무작위.
//   로자리를 노리지 않는다 — 예고가 없으니 로자리 행을 겨누면 사실상 못 피하는 고정 피해가 된다.
//   그래서 로자리는 "차선이 우연히 로자리 행에 걸릴 때만" 맞는다(가만히 서 있을 때 질주당 ≈15%,
//   세로 화면 보이는 행 ≈19.6u − 3u 중 판정 폭 2.5u).
// 치기:
//   차 사각형(길이 3.7u, 폭 1.9u)이 이번 프레임에 쓸고 간 영역 중 화면에 보이는 부분 안의 적마다
//   한 번만 굴림 — 65% 확률로 치어 60 피해 + 넉백, 35%는 아슬아슬하게 비켜 간다(무작위 치기).
//   보스·마틸다는 20만. 화면 밖(진입·이탈 여유 구간)의 적은 치지 않는다.
//   로자리와 겹치면 질주당 1회 최대 HP의 15% 피해(일반 무적 규칙을 따른다 — 무적 중이면 무시).
//   치기 쿵 소리(zombieGiantThud)는 게임 시간 150ms에 한 번만 — 무리를 쓸고 가면 연속 프레임마다 쳐서
//   쿵이 겹쳐 쌓이고 클리핑했다(보호 등급 소리라 동시 재생 캡에도 안 걸린다). claimSlteraThud 참고.
import { getStageConfig } from './stageConfig.js'
import { isBossType } from './burstEvents.js'

export const SLTERA_STAGE_IDS = Object.freeze(['stage1', 'stage2', 'stage3', 'stage4', 'stage5'])
export const SLTERA_FIRST_PASS_MIN_MS = 15_000
export const SLTERA_FIRST_PASS_WINDOW_MS = 10_000
export const SLTERA_REPEAT_MS = 85_000
export const SLTERA_SPEED = 14 // u/s
export const SLTERA_EDGE_MARGIN = 3 // 화면 가장자리 밖 출발·도착 여유(u)
export const SLTERA_LANE_EDGE_MARGIN = 1.5 // 차선은 화면 위아래 가장자리에서 이만큼 안쪽 행에서만 고른다(u)
export const SLTERA_HALF_LENGTH = 1.85 // 차 길이 3.7u의 절반(진행 방향)
export const SLTERA_HALF_WIDTH = 0.95 // 차 폭 1.9u의 절반
export const SLTERA_PLAYER_RADIUS = 0.3 // 로자리 몸통 판정 반경
export const SLTERA_RUN_OVER_CHANCE = 0.65
export const SLTERA_RUN_OVER_DAMAGE = 60
export const SLTERA_BOSS_DAMAGE = 20
export const SLTERA_KNOCKBACK = 6
export const SLTERA_KNOCKBACK_MS = 220
export const SLTERA_PLAYER_DAMAGE_RATIO = 0.15
export const SLTERA_DAMAGE_SOURCE = 'sltera'
export const SLTERA_THUD_GAP_MS = 150 // 치기 쿵 소리 최소 간격(게임 시간 ms)

export const SLTERA_PHASE = Object.freeze({ DRIVE: 'drive', DONE: 'done' })

export function isSlteraStage(stageId) {
  return SLTERA_STAGE_IDS.includes(stageId)
}

// gameKey·스테이지 → [0,1) 결정론적 해시(FNV-1a). 같은 판은 같은 시각, 판마다 다른 시각.
export function slteraRunSeed(gameKey, stageId) {
  const text = `${stageId}:${Number.isFinite(gameKey) ? gameKey : 0}`
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h / 0x100000000
}

/** passIndex번째(0부터) 질주의 시작 시각(ms). 비대상 스테이지는 Infinity. */
export function getSlteraPassStartMs(stageId, gameKey, passIndex = 0) {
  if (!isSlteraStage(stageId)) return Infinity
  const first = SLTERA_FIRST_PASS_MIN_MS + Math.floor(slteraRunSeed(gameKey, stageId) * SLTERA_FIRST_PASS_WINDOW_MS)
  return first + Math.max(0, Math.floor(passIndex)) * SLTERA_REPEAT_MS
}

/** untilMs 전에 시작하는 모든 질주 시각(테스트·진단용). */
export function getSlteraPassTimesMs(stageId, gameKey, untilMs) {
  const out = []
  for (let i = 0; ; i += 1) {
    const t = getSlteraPassStartMs(stageId, gameKey, i)
    if (!(t < untilMs)) return out
    out.push(t)
  }
}

/** 스테이지의 탈출구·마틸다 예고 중 이른 시각(ms). 첫 질주는 반드시 이보다 먼저 끝난다. */
export function getSlteraDeadlineMs(stageId) {
  const cfg = getStageConfig(stageId)
  return Math.min(cfg.escapePortalSec, cfg.matildaWarningSec) * 1000
}

export function createSlteraPass() {
  return {
    phase: SLTERA_PHASE.DONE,
    elapsedMs: 0,
    dir: 1,
    laneZ: 0,
    startX: 0,
    endX: 0,
    x: 0,
    prevX: 0,
    swept: false, // 이번 step에서 차가 실제로 화면을 쓸고 지나갔는가(치기·피격 판정 대상)
    playerHit: false,
    lastThudMs: -Infinity, // 마지막 치기 쿵 소리 시각(런 시계 ms). 질주마다 초기화 — 첫 쿵은 늘 즉시
    rolledPool: new Set(), // index * 65536 + generation
    rolledSpecial: new Set(),
  }
}

/** 화면에 보이는 바닥 행 중 무작위 차선 z. 화면 범위가 너무 좁거나 아직 없으면 로자리 행. */
export function pickSlteraLaneZ(bounds, playerZ, rand = Math.random) {
  const lo = bounds.minZ + SLTERA_LANE_EDGE_MARGIN
  const hi = bounds.maxZ - SLTERA_LANE_EDGE_MARGIN
  if (!(hi > lo)) return playerZ
  return lo + rand() * (hi - lo)
}

/**
 * 질주 하나를 시작한다 — 예고 없이 곧장 질주 단계. pass 객체를 재사용해 할당을 질주당 0으로 유지한다.
 * bounds = 현재 화면이 보는 바닥 범위(refs.screenBounds), rand = [0,1) 난수(방향 → 차선 순서로 소비).
 */
export function beginSlteraPass(pass, { playerX, playerZ, bounds, rand = Math.random }) {
  const dir = rand() < 0.5 ? 1 : -1
  const left = bounds.minX - SLTERA_EDGE_MARGIN
  const right = bounds.maxX + SLTERA_EDGE_MARGIN
  pass.phase = SLTERA_PHASE.DRIVE
  pass.elapsedMs = 0
  pass.dir = dir
  pass.laneZ = pickSlteraLaneZ(bounds, playerZ, rand)
  pass.startX = dir > 0 ? Math.min(left, playerX - SLTERA_EDGE_MARGIN) : Math.max(right, playerX + SLTERA_EDGE_MARGIN)
  pass.endX = dir > 0 ? Math.max(right, playerX + SLTERA_EDGE_MARGIN) : Math.min(left, playerX - SLTERA_EDGE_MARGIN)
  pass.x = pass.startX
  pass.prevX = pass.startX
  pass.swept = false
  pass.playerHit = false
  pass.lastThudMs = -Infinity
  pass.rolledPool.clear()
  pass.rolledSpecial.clear()
  return pass
}

/** dtMs만큼 진행. 반환 = 현재 단계. swept=true면 prevX→x가 이번 step에 쓸고 간 구간이다. */
export function stepSlteraPass(pass, dtMs) {
  pass.swept = false
  if (pass.phase === SLTERA_PHASE.DONE) return pass.phase
  const dt = Math.max(0, Number.isFinite(dtMs) ? dtMs : 0)
  pass.prevX = pass.x
  pass.elapsedMs += dt
  pass.x += pass.dir * SLTERA_SPEED * (dt / 1000)
  pass.swept = true
  if ((pass.dir > 0 && pass.x >= pass.endX) || (pass.dir < 0 && pass.x <= pass.endX)) {
    pass.x = pass.endX
    pass.phase = SLTERA_PHASE.DONE
  }
  return pass.phase
}

/**
 * 이번 프레임 쓸고 간 사각형(축 정렬: 진행축 X). out = { centerX, centerZ, yaw, halfWidth, halfDepth }.
 * screen(선택) = 지금 화면 범위 — 주면 사각형을 화면에 보이는 X 구간으로 자른다(화면 밖 적은 안 친다).
 * 반환 = 자른 뒤 남는 구간이 있으면 true, 차가 아직/이미 화면 밖이면 false(치기 판정 생략).
 */
export function getSlteraSweepBox(pass, out, screen = null) {
  let minX = Math.min(pass.prevX, pass.x) - SLTERA_HALF_LENGTH
  let maxX = Math.max(pass.prevX, pass.x) + SLTERA_HALF_LENGTH
  if (screen) {
    minX = Math.max(minX, screen.minX)
    maxX = Math.min(maxX, screen.maxX)
  }
  out.centerX = (minX + maxX) / 2
  out.centerZ = pass.laneZ
  out.yaw = Math.PI / 2 // isPointInOrientedBox2D: yaw π/2면 halfDepth가 월드 X 축
  out.halfWidth = SLTERA_HALF_WIDTH
  out.halfDepth = Math.max(0, (maxX - minX) / 2)
  return maxX > minX
}

/**
 * 적 하나에 대한 치기 판정(질주당 적마다 1회만 굴린다). 반환 = 줄 피해(0이면 비켜 감 또는 이미 굴림).
 * index/generation = 풀 적, special = 보스·특수 적 rb(있으면 index 무시). type = 적 타입 코드.
 */
export function rollSlteraRunOver(pass, index, generation, special, type, rand = Math.random) {
  if (special) {
    if (pass.rolledSpecial.has(special)) return 0
    pass.rolledSpecial.add(special)
  } else {
    const key = index * 65536 + (generation ?? 0)
    if (pass.rolledPool.has(key)) return 0
    pass.rolledPool.add(key)
  }
  if (!(rand() < SLTERA_RUN_OVER_CHANCE)) return 0
  return isBossType(type) ? SLTERA_BOSS_DAMAGE : SLTERA_RUN_OVER_DAMAGE
}

/**
 * 치기 쿵 소리 간격 제한. 직전 쿵에서 SLTERA_THUD_GAP_MS 이상 지났으면 이번 시각을 기록하고 true.
 * nowMs = 게임 시간(런 시계, 일시정지 제외 — 벽시계 아님). 같은 시각에 다시 물으면 false.
 */
export function claimSlteraThud(pass, nowMs) {
  if (nowMs - pass.lastThudMs < SLTERA_THUD_GAP_MS) return false
  pass.lastThudMs = nowMs
  return true
}

/**
 * 로자리 피격 판정. 질주 중 이번 프레임 쓸고 간 사각형과 로자리 원이 겹치면 질주당 1회 피해량을 반환한다.
 * 반환 = 피해(0이면 안 맞음/이미 맞음).
 */
export function checkSlteraPlayerHit(pass, playerX, playerZ, maxHp) {
  if (!pass.swept || pass.playerHit) return 0
  const minX = Math.min(pass.prevX, pass.x) - SLTERA_HALF_LENGTH - SLTERA_PLAYER_RADIUS
  const maxX = Math.max(pass.prevX, pass.x) + SLTERA_HALF_LENGTH + SLTERA_PLAYER_RADIUS
  if (playerX < minX || playerX > maxX) return 0
  if (Math.abs(playerZ - pass.laneZ) > SLTERA_HALF_WIDTH + SLTERA_PLAYER_RADIUS) return 0
  pass.playerHit = true
  return Math.max(0, maxHp) * SLTERA_PLAYER_DAMAGE_RATIO
}
