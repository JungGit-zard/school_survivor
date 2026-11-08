// Sltera(슬테라) 돌진 이벤트 — 순수 로직(3D·React 없음). 2026-11-07 Terry:
//   "Sltera가 갑자기 나타나 화면을 가로질러 달리며 지나가는 길의 좀비를 무작위로 치고,
//    로자리를 치면 로자리 HP가 깎인다. 모든 판에 나와야 한다."
// 2026-11-08 Terry 개편: "슬테라 크기는 지금의 3분의 1로 줄여, 속도는 지금의 5분의 1로 늦춰, … 슬테라는
//   지그재그 운전을 해야하며 사선으로 화면을 지나가서 화면의 체류시간을 늘려, 직선으로 운행되지 않는다.
//   '엉망진창으로 운전되는 고장난 차'임을 여실히 보여준다"
//
// 근본 원인 기록: Sltera는 10-31에 Graphics Studio 비주얼(SlteraCar.jsx)만 만들어졌고 게임 런타임
// 어디에서도 스케줄되지 않았다(무작위 확률·스테이지 게이트 문제가 아니라 배선 자체가 없었다).
// 이 파일이 런 스케줄의 정본이다. 무작위 굴림 없이 매 판 반드시 첫 질주가 잡힌다.
//
// 타임라인(런 경과 시간 기준, 일시정지 시간 제외 — 11-08 개편에서도 그대로):
//   첫 질주 시작 = 15초 + (gameKey·스테이지 해시 0..1) × 10초  → 15~25초 사이 결정론적.
//   이후 85초마다 반복: 100~110초 → 185~195초 → 270~280초 ….
//   단, 탈출구·마틸다 예고 시각 앞뒤 12초 안에 시작하는 자연 질주는 건너뛴다(예고와 겹치지 않게 —
//   예: 예고 205초면 193초 이후 시작분). consumeSlteraPassStart / isSlteraNaturalStartAllowed.
//   오너 치트 '슬테라 즉시 출현'(lib/slteraInstantSpawn.js)은 이 일정과 별개로 한 번 더 달리게 한다.
// 한 번의 질주(예고 없음 — "갑자기 나타나"):
//   화면 한 모서리 근처 바로 밖(여유 1u)에서 출발해 반대편 모서리 근처 바로 밖까지 '사선'으로 지나간다.
//   직진하지 않는다: 사선 위에 불규칙한 지그재그 경유점(좌우 폭 0.5~1.8u, 간격 1.0~2.6u, 15%는 같은 쪽
//   연속)을 깔고 핸들을 꺾어 쫓아가며(초당 3.6rad), 0.5~1.6초마다 핸들이 갑자기 확 돌아가는 '발작'
//   (0.08~0.16초 동안 초당 10rad)이 끼어든다. 핸들 떨림(±0.15~0.3rad, 1.2~2Hz)도 늘 있다.
//   세로 화면에서 화면 안 좌우 꺾임(0.35u 이상 되돌아옴) 중앙값 5번, 꺾임 폭 중앙값 2.1u.
//   핸들은 사선 방향에서 70°까지만 꺾이고 떨림을 얹어도 87°를 넘지 않아 늘 앞으로 나아가므로 질주는 반드시 끝난다.
//   경유점은 화면이 보는 바닥(사다리꼴) 가장자리에서 0.8u 안쪽에만 둔다 — 화면 안에서 오래 비틀거린다.
//   속도 2.8u/s(11-07판 14u/s의 1/5), 크기 1/3(판정 길이 1.23u·폭 0.63u, 비주얼도 1/3).
//   세로 화면(390×844, 보이는 바닥 위 8.4u·아래 4.9u × 세로 19.6u)·로자리 정지 기준 화면 체류
//   중앙값 ≈9.2초(10~90% 7.8~10.2초, 질주 전체 ≈9.5초) — 11-07판(가로 직진)은 ≈0.75초(질주 ≈1.0초).
//   사선은 출발 순간 화면에 맞춘 월드 경로라 로자리가 멀리 달아나면 그만큼 일찍 화면에서 사라진다
//   (차 2.8u/s < 로자리 기본 3.0u/s).
//   로자리를 노리지 않는다 — 사선이 화면 가운데(로자리)를 지나므로 로자리 근처 경유점은 반대쪽으로 비킨다
//   (SLTERA_ROSARI_*). 가만히 선 로자리가 맞는 질주 ≈7%(11-07판 ≈14% — 발작·떨림으로만 맞는다),
//   차가 처음 보이고 로자리 행에 닿기까지 중앙값 ≈3.6초라 보고 피할 수 있다.
// 치기:
//   차 사각형(길이 1.23u, 폭 0.63u, 진행 방향으로 회전)이 이번 프레임에 쓸고 간 영역 안의 적마다
//   한 번만 굴림 — 65% 확률로 치어 60 피해 + 넉백, 35%는 아슬아슬하게 비켜 간다(무작위 치기).
//   보스·마틸다는 20만. 차 중심이 화면 밖(진입·이탈 여유 구간)일 때는 치지 않는다.
//   로자리와 겹치면 질주당 1회 최대 HP의 15% 피해(일반 무적 규칙을 따른다 — 무적 중이면 무시).
//   치기 쿵 소리(zombieGiantThud)는 게임 시간 150ms에 한 번만 — 무리를 쓸고 가면 연속 프레임마다 쳐서
//   쿵이 겹쳐 쌓이고 클리핑했다(보호 등급 소리라 동시 재생 캡에도 안 걸린다). claimSlteraThud 참고.
import { getStageConfig } from './stageConfig.js'
import { isBossType } from './burstEvents.js'
import { getGameplayGroundReach } from './gameCameraFraming.js'
import { isPointInOrientedBox2D } from './weaponCollision.js'

export const SLTERA_STAGE_IDS = Object.freeze(['stage1', 'stage2', 'stage3', 'stage4', 'stage5'])
export const SLTERA_FIRST_PASS_MIN_MS = 15_000
export const SLTERA_FIRST_PASS_WINDOW_MS = 10_000
export const SLTERA_REPEAT_MS = 85_000

// 크기·속도 배율(Terry 11-08). 11-07판 값을 기준으로 곱한다 — 비주얼(SlteraEvent의 그룹 scale)과
// 판정 사각형이 같은 배율을 쓴다.
export const SLTERA_SIZE_SCALE = 1 / 3
export const SLTERA_SPEED_SCALE = 1 / 5
export const SLTERA_BASE_SPEED = 14 // 11-07판 직진 속도(u/s)
export const SLTERA_SPEED = SLTERA_BASE_SPEED * SLTERA_SPEED_SCALE // 2.8u/s — 실제 주행 경로를 따라 잰 속도
export const SLTERA_BASE_HALF_LENGTH = 1.85 // 11-07판 차 길이 3.7u의 절반
export const SLTERA_BASE_HALF_WIDTH = 0.95 // 11-07판 차 폭 1.9u의 절반
export const SLTERA_HALF_LENGTH = SLTERA_BASE_HALF_LENGTH * SLTERA_SIZE_SCALE // ≈0.617u(길이 1.23u)
export const SLTERA_HALF_WIDTH = SLTERA_BASE_HALF_WIDTH * SLTERA_SIZE_SCALE // ≈0.317u(폭 0.63u)
export const SLTERA_PLAYER_RADIUS = 0.3 // 로자리 몸통 판정 반경

// 사선 경로: 출발·도착은 화면 바로 밖 여유(u). 차 반길이(0.62u)보다 커서 화면 밖에서 출발한다.
export const SLTERA_EDGE_MARGIN = 1
// 끝: 도착점을 지나고 차 전체가 (출발 순간의) 화면 밖으로 나가야 사라진다 — 차 중심이 화면에서 이만큼 밖.
// 차 귀퉁이까지 거리 hypot(0.62, 0.32) ≈ 0.69u보다 크게. 도착점을 4u 넘게 지나면 무조건 끝(안전장치).
export const SLTERA_OFFSCREEN_PAD = 0.75
export const SLTERA_EXIT_OVERRUN = 4
// 모서리 근처 출발·도착점: 이 확률로 위/아래 변 바깥(나머지는 옆 변 바깥).
export const SLTERA_CORNER_END_EDGE_SHARE = 0.6
export const SLTERA_CORNER_EDGE_SLIDE = 0.35 // 위/아래 변: 모서리에서 그 변 반폭의 0~35% 안쪽
export const SLTERA_CORNER_SIDE_SLIDE = 0.12 // 옆 변: 모서리에서 화면 높이의 0~12% 안쪽
// 지그재그 경유점: 사선 진행 거리 간격·좌우 폭 모두 무작위(고르지 않게).
export const SLTERA_SWERVE_GAP_MIN = 1
export const SLTERA_SWERVE_GAP_MAX = 2.6
export const SLTERA_SWERVE_MIN = 0.5
export const SLTERA_SWERVE_MAX = 1.8
export const SLTERA_SWERVE_SAME_SIDE_CHANCE = 0.15
export const SLTERA_SWERVE_SCREEN_INSET = 0.8 // 경유점은 보이는 바닥 가장자리에서 이만큼 안쪽
export const SLTERA_MAX_WAYPOINTS = 48
// 모서리→반대 모서리 사선은 화면 가운데(=카메라가 따라가는 로자리)를 지난다. 가만히 선 로자리를 정통으로
// 겨누지 않도록, 출발 순간 로자리 행 앞뒤(사선 진행 ±3u)의 경유점은 로자리 반대쪽에서만 꺾는다 —
// 로자리에서 좌우 1.3u 선과 그보다 바깥(화면 가장자리 0.4u 안쪽까지)을 번갈아 오가며 계속 비틀거린다.
// 로자리가 움직여 차 앞으로 들어오면 그대로 맞는다(노리지도, 봐주지도 않는다).
export const SLTERA_ROSARI_SPAN = 3
export const SLTERA_ROSARI_CLEARANCE = 1.3
export const SLTERA_ROSARI_ZONE_INSET = 0.4
// 핸들: 경유점 쪽으로 꺾는 최대 속도, 사선 대비 최대 꺾임, 늘 있는 떨림.
export const SLTERA_STEER_RAD_PER_SEC = 3.6
export const SLTERA_MAX_DEVIATION_RAD = (70 * Math.PI) / 180
export const SLTERA_WOBBLE_MIN_RAD = 0.15
export const SLTERA_WOBBLE_MAX_RAD = 0.3
// 발작(갑자기 핸들이 확 돌아감): 간격·길이·방향 무작위.
export const SLTERA_JERK_RAD_PER_SEC = 10
export const SLTERA_JERK_GAP_MIN_SEC = 0.5
export const SLTERA_JERK_GAP_MAX_SEC = 1.6
export const SLTERA_JERK_MIN_SEC = 0.08
export const SLTERA_JERK_MAX_SEC = 0.16
export const SLTERA_MAX_JERKS = 96
const SUBSTEP_SEC = 1 / 120 // 낮은 프레임에서도 같은 경로가 나오게 내부를 잘게 나눠 적분

export const SLTERA_RUN_OVER_CHANCE = 0.65
export const SLTERA_RUN_OVER_DAMAGE = 60
export const SLTERA_BOSS_DAMAGE = 20
export const SLTERA_KNOCKBACK = 6
export const SLTERA_KNOCKBACK_MS = 220
export const SLTERA_IMPACT_BACK = 1.5 * SLTERA_SIZE_SCALE // 넉백 기준점: 차 뒤쪽(u)
export const SLTERA_PLAYER_DAMAGE_RATIO = 0.15
export const SLTERA_DAMAGE_SOURCE = 'sltera'
export const SLTERA_THUD_GAP_MS = 150 // 치기 쿵 소리 최소 간격(게임 시간 ms)

export const SLTERA_PHASE = Object.freeze({ DRIVE: 'drive', DONE: 'done' })

// 게임 카메라(fov 30)가 보는 바닥은 사다리꼴이다: 위(먼 쪽, minZ) 반폭 = screenBounds 반폭, 아래(가까운 쪽,
// maxZ)는 이 비율만큼 좁다(≈0.577, 화면비·줌과 무관). Enemies.jsx isInsideGroundView와 같은 모델.
export const SLTERA_VIEW_NEAR_RATIO = (() => {
  const reach = getGameplayGroundReach(30, 1)
  return reach.reachSideNear / reach.reachSideFar
})()

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

/** 화면이 보는 바닥에서 z 행의 가로 반폭(u). */
export function slteraViewHalfWidthAt(bounds, z) {
  const span = bounds.maxZ - bounds.minZ
  const t = span > 0 ? Math.min(1, Math.max(0, (z - bounds.minZ) / span)) : 0
  return ((bounds.maxX - bounds.minX) / 2) * (1 - t * (1 - SLTERA_VIEW_NEAR_RATIO))
}

/** (x, z)가 화면이 보는 바닥(사다리꼴) 안인가. inset만큼 안쪽으로 좁혀 판정할 수 있다. */
export function isSlteraPointOnScreen(bounds, x, z, inset = 0) {
  if (!(z >= bounds.minZ + inset && z <= bounds.maxZ - inset)) return false
  return Math.abs(x - (bounds.minX + bounds.maxX) / 2) <= slteraViewHalfWidthAt(bounds, z) - inset
}

/**
 * 화면 모서리(su: -1 왼쪽/+1 오른쪽, sv: -1 위(먼 쪽)/+1 아래(가까운 쪽)) 근처, 화면 바로 밖의 한 점.
 * edgeRoll < 0.6이면 위/아래 변 바깥(모서리에서 그 변 반폭의 0~35% 안쪽), 아니면 옆 변 바깥(화면 높이의 0~12% 안쪽).
 */
export function getSlteraCornerPoint(bounds, su, sv, edgeRoll, slideRoll, out = {}) {
  const cx = (bounds.minX + bounds.maxX) / 2
  const edgeZ = sv < 0 ? bounds.minZ : bounds.maxZ
  if (edgeRoll < SLTERA_CORNER_END_EDGE_SHARE) {
    out.x = cx + su * slteraViewHalfWidthAt(bounds, edgeZ) * (1 - SLTERA_CORNER_EDGE_SLIDE * slideRoll)
    out.z = edgeZ + sv * SLTERA_EDGE_MARGIN
  } else {
    const z = edgeZ - sv * (bounds.maxZ - bounds.minZ) * SLTERA_CORNER_SIDE_SLIDE * slideRoll
    out.x = cx + su * (slteraViewHalfWidthAt(bounds, z) + SLTERA_EDGE_MARGIN)
    out.z = z
  }
  return out
}

export function createSlteraPass() {
  return {
    phase: SLTERA_PHASE.DONE,
    elapsedMs: 0,
    // 사선: 출발(entry) → 도착(exit), 방향 단위벡터(dir), 길이, 사선 방향 각(diagHeading).
    entryX: 0, entryZ: 0, exitX: 0, exitZ: 0, dirX: 0, dirZ: 1, length: 0, diagHeading: 0,
    view: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 }, // 출발 순간 화면 범위(경로가 맞춰진 화면 — 끝 판정용)
    // 지그재그 경유점(사선 진행 거리 wpU 순).
    wpX: new Float64Array(SLTERA_MAX_WAYPOINTS),
    wpZ: new Float64Array(SLTERA_MAX_WAYPOINTS),
    wpU: new Float64Array(SLTERA_MAX_WAYPOINTS),
    waypointCount: 0,
    waypoint: 0,
    // 발작 일정(질주 시작부터 초), 길이(초), 방향(±1).
    jerkAt: new Float64Array(SLTERA_MAX_JERKS),
    jerkDur: new Float64Array(SLTERA_MAX_JERKS),
    jerkDir: new Int8Array(SLTERA_MAX_JERKS),
    jerkCount: 0,
    jerk: 0,
    jerkLeftSec: 0,
    jerkSign: 0,
    wobbleRad: 0,
    wobbleRadPerSec: 0,
    wobblePhase: 0,
    // 현재 상태.
    x: 0, z: 0, prevX: 0, prevZ: 0,
    steer: 0, // 핸들 방향(경유점 추적 + 발작, 사선 대비 ±70°)
    heading: 0, // 차가 보는 방향(yaw, atan2(dx, dz)) = 핸들 + 떨림 — 진행 방향과 같다
    progress: 0, // 사선 위 진행 거리(u)
    distance: 0, // 실제로 달린 거리(u)
    swept: false, // 이번 step에서 차가 실제로 움직였는가(치기·피격 판정 대상)
    playerHit: false,
    lastThudMs: -Infinity, // 마지막 치기 쿵 소리 시각(런 시계 ms). 질주마다 초기화 — 첫 쿵은 늘 즉시
    rolledPool: new Set(), // index * 65536 + generation
    rolledSpecial: new Set(),
  }
}

const _corner = { x: 0, z: 0 }
const SWERVE_FIT_FACTORS = Object.freeze([1, 0.6, 0.35, -1, -0.5])
const ZONE_FAR_FACTORS = Object.freeze([1, 0.7, 0.45])

// 경유점을 보이는 바닥 안(가장자리 inset 안쪽)에 맞춘다: 좌우 번갈이를 지키려고 같은 쪽에서 먼저 줄여 보고
// (그대로 → 60% → 35%), 그래도 안 되면 반대쪽(그대로 → 절반), 다 안 되면 사선 위.
function fitSwerveOnScreen(bounds, baseX, baseZ, normalX, normalZ, offset) {
  for (const factor of SWERVE_FIT_FACTORS) {
    const w = offset * factor
    if (isSlteraPointOnScreen(bounds, baseX + normalX * w, baseZ + normalZ * w, SLTERA_SWERVE_SCREEN_INSET)) return w
  }
  return 0
}

const lerp = (a, b, t) => a + (b - a) * t

/**
 * 질주 하나를 시작한다 — 예고 없이 곧장 질주 단계. pass 객체를 재사용해 할당을 질주당 0으로 유지한다.
 * bounds = 현재 화면이 보는 바닥 범위(refs.screenBounds), playerX/Z = 출발 순간 로자리 위치(근처 경유점을
 * 로자리 반대쪽으로 비키는 데만 쓴다), rand = [0,1) 난수. 무작위는 전부 여기서 소비하고
 * stepSlteraPass는 결정론적이다(같은 rand·같은 dt면 같은 경로).
 */
export function beginSlteraPass(pass, { bounds, playerX = NaN, playerZ = NaN, rand = Math.random }) {
  // 1) 출발 모서리(4곳 중 하나)와 반대편 도착 모서리.
  const corner = Math.min(3, Math.floor(rand() * 4))
  const su = corner & 1 ? 1 : -1
  const sv = corner & 2 ? 1 : -1
  getSlteraCornerPoint(bounds, su, sv, rand(), rand(), _corner)
  const entryX = _corner.x
  const entryZ = _corner.z
  getSlteraCornerPoint(bounds, -su, -sv, rand(), rand(), _corner)
  const dx = _corner.x - entryX
  const dz = _corner.z - entryZ
  const length = Math.hypot(dx, dz)
  pass.entryX = entryX
  pass.entryZ = entryZ
  pass.exitX = _corner.x
  pass.exitZ = _corner.z
  pass.length = length
  pass.dirX = length > 1e-9 ? dx / length : 0
  pass.dirZ = length > 1e-9 ? dz / length : 1
  pass.diagHeading = Math.atan2(pass.dirX, pass.dirZ)
  pass.view.minX = bounds.minX
  pass.view.maxX = bounds.maxX
  pass.view.minZ = bounds.minZ
  pass.view.maxZ = bounds.maxZ

  // 2) 지그재그 경유점 — 사선 진행 거리 간격·좌우 폭이 매번 다르고, 가끔 같은 쪽으로 두 번 꺾는다.
  const normalX = pass.dirZ
  const normalZ = -pass.dirX
  // 로자리의 사선 좌표(진행 pu, 좌우 pw). 위치를 모르면 비키기 없음.
  const hasPlayer = Number.isFinite(playerX) && Number.isFinite(playerZ)
  const pu = hasPlayer ? (playerX - entryX) * pass.dirX + (playerZ - entryZ) * pass.dirZ : NaN
  const pw = hasPlayer ? (playerX - entryX) * normalX + (playerZ - entryZ) * normalZ : 0
  const away = pw >= 0 ? -1 : 1
  let side = rand() < 0.5 ? 1 : -1
  let u = SLTERA_EDGE_MARGIN + lerp(0.8, 2, rand())
  const lastU = length - SLTERA_EDGE_MARGIN - 1
  let count = 0
  while (u <= lastU && count < SLTERA_MAX_WAYPOINTS) {
    if (rand() >= SLTERA_SWERVE_SAME_SIDE_CHANCE) side = -side
    const width = lerp(SLTERA_SWERVE_MIN, SLTERA_SWERVE_MAX, rand())
    const baseX = entryX + pass.dirX * u
    const baseZ = entryZ + pass.dirZ * u
    let w = fitSwerveOnScreen(bounds, baseX, baseZ, normalX, normalZ, side * width)
    if (Math.abs(u - pu) < SLTERA_ROSARI_SPAN) {
      // 로자리 근처: 로자리 반대쪽에서만 꺾는다 — 1.3u 선과 그보다 '폭'만큼 바깥(화면 가장자리 0.4u 안쪽까지
      // 줄여 맞춤)을 번갈아 오간다. 1.3u 선조차 화면 밖이면(로자리가 화면 끝) 원래 경유점을 둔다.
      const near = pw + away * SLTERA_ROSARI_CLEARANCE
      if (isSlteraPointOnScreen(bounds, baseX + normalX * near, baseZ + normalZ * near)) {
        w = near
        if (side !== away) {
          for (const factor of ZONE_FAR_FACTORS) {
            const far = near + away * width * factor
            if (isSlteraPointOnScreen(bounds, baseX + normalX * far, baseZ + normalZ * far, SLTERA_ROSARI_ZONE_INSET)) { w = far; break }
          }
        }
      }
    }
    pass.wpX[count] = baseX + normalX * w
    pass.wpZ[count] = baseZ + normalZ * w
    pass.wpU[count] = u
    count += 1
    u += lerp(SLTERA_SWERVE_GAP_MIN, SLTERA_SWERVE_GAP_MAX, rand())
  }
  pass.waypointCount = count
  pass.waypoint = 0

  // 3) 발작 일정 — 고장 난 핸들이 불규칙한 간격으로 확 돌아간다.
  let jerkAt = lerp(0.35, 1.1, rand())
  let jerks = 0
  for (; jerks < SLTERA_MAX_JERKS; jerks += 1) {
    pass.jerkAt[jerks] = jerkAt
    pass.jerkDur[jerks] = lerp(SLTERA_JERK_MIN_SEC, SLTERA_JERK_MAX_SEC, rand())
    pass.jerkDir[jerks] = rand() < 0.5 ? -1 : 1
    jerkAt += lerp(SLTERA_JERK_GAP_MIN_SEC, SLTERA_JERK_GAP_MAX_SEC, rand())
  }
  pass.jerkCount = jerks
  pass.jerk = 0
  pass.jerkLeftSec = 0
  pass.jerkSign = 0

  // 4) 늘 있는 핸들 떨림.
  pass.wobbleRad = lerp(SLTERA_WOBBLE_MIN_RAD, SLTERA_WOBBLE_MAX_RAD, rand())
  pass.wobbleRadPerSec = Math.PI * 2 * lerp(1.2, 2, rand())
  pass.wobblePhase = rand() * Math.PI * 2

  pass.phase = length > 1e-9 ? SLTERA_PHASE.DRIVE : SLTERA_PHASE.DONE
  pass.elapsedMs = 0
  pass.x = entryX
  pass.z = entryZ
  pass.prevX = entryX
  pass.prevZ = entryZ
  pass.steer = pass.diagHeading
  pass.heading = pass.diagHeading
  pass.progress = 0
  pass.distance = 0
  pass.swept = false
  pass.playerHit = false
  pass.lastThudMs = -Infinity
  pass.rolledPool.clear()
  pass.rolledSpecial.clear()
  return pass
}

// [-π, π)로 감는다.
function wrapAngle(angle) {
  return angle - Math.PI * 2 * Math.floor((angle + Math.PI) / (Math.PI * 2))
}

function clampAbs(value, limit) {
  return value > limit ? limit : value < -limit ? -limit : value
}

function driveSlteraSubstep(pass, h) {
  pass.elapsedMs += h * 1000
  const t = pass.elapsedMs / 1000
  // 다음 경유점(다 지났으면 도착점 너머)을 향해 핸들(steer)을 꺾는다.
  const k = pass.waypoint
  const beyond = SLTERA_EXIT_OVERRUN
  const targetX = k < pass.waypointCount ? pass.wpX[k] : pass.exitX + pass.dirX * beyond
  const targetZ = k < pass.waypointCount ? pass.wpZ[k] : pass.exitZ + pass.dirZ * beyond
  const desired = Math.atan2(targetX - pass.x, targetZ - pass.z)
  let steer = pass.steer + clampAbs(wrapAngle(desired - pass.steer), SLTERA_STEER_RAD_PER_SEC * h)
  // 발작: 예정 시각이 되면 짧게 한쪽으로 핸들이 확 돌아간다(조향이 뒤따라 바로잡는다).
  if (!(pass.jerkLeftSec > 0) && pass.jerk < pass.jerkCount && t >= pass.jerkAt[pass.jerk]) {
    pass.jerkLeftSec = pass.jerkDur[pass.jerk]
    pass.jerkSign = pass.jerkDir[pass.jerk]
    pass.jerk += 1
  }
  if (pass.jerkLeftSec > 0) {
    const jh = Math.min(h, pass.jerkLeftSec)
    steer += pass.jerkSign * SLTERA_JERK_RAD_PER_SEC * jh
    pass.jerkLeftSec -= jh
  }
  // 핸들은 사선에서 70° 넘게 꺾이지 않는다. 떨림(±0.3rad 이하)은 그 위에 얹혀 최대 87° — 늘 앞으로 가고
  // 질주가 반드시 끝나며, 핸들이 70°에 붙어 있어도 차는 계속 흔들린다(직선 구간 없음).
  steer = pass.diagHeading + clampAbs(wrapAngle(steer - pass.diagHeading), SLTERA_MAX_DEVIATION_RAD)
  pass.steer = steer
  const heading = steer + pass.wobbleRad * Math.sin(t * pass.wobbleRadPerSec + pass.wobblePhase)
  pass.heading = heading
  pass.x += Math.sin(heading) * SLTERA_SPEED * h
  pass.z += Math.cos(heading) * SLTERA_SPEED * h
  pass.distance += SLTERA_SPEED * h
  pass.progress = (pass.x - pass.entryX) * pass.dirX + (pass.z - pass.entryZ) * pass.dirZ
  while (pass.waypoint < pass.waypointCount && pass.progress >= pass.wpU[pass.waypoint]) pass.waypoint += 1
  if (!(pass.progress < pass.length + SLTERA_EXIT_OVERRUN)) pass.phase = SLTERA_PHASE.DONE
  else if (pass.progress >= pass.length && !isSlteraPointOnScreen(pass.view, pass.x, pass.z, -SLTERA_OFFSCREEN_PAD)) pass.phase = SLTERA_PHASE.DONE
}

/** dtMs만큼 진행. 반환 = 현재 단계. swept=true면 (prevX,prevZ)→(x,z)가 이번 step에 쓸고 간 구간이다. */
export function stepSlteraPass(pass, dtMs) {
  pass.swept = false
  if (pass.phase === SLTERA_PHASE.DONE) return pass.phase
  let left = Math.max(0, Number.isFinite(dtMs) ? dtMs : 0) / 1000
  pass.prevX = pass.x
  pass.prevZ = pass.z
  while (left > 1e-9 && pass.phase !== SLTERA_PHASE.DONE) {
    const h = Math.min(left, SUBSTEP_SEC)
    left -= h
    driveSlteraSubstep(pass, h)
  }
  pass.swept = true
  return pass.phase
}

/**
 * 이번 프레임 쓸고 간 사각형(진행 방향으로 회전). out = { centerX, centerZ, yaw, halfWidth, halfDepth }.
 * screen(선택) = 지금 화면 범위 — 주면 차 중심이 화면이 보는 바닥 밖일 때 false(치기 판정 생략).
 */
export function getSlteraSweepBox(pass, out, screen = null) {
  const dx = pass.x - pass.prevX
  const dz = pass.z - pass.prevZ
  const segment = Math.hypot(dx, dz)
  out.centerX = (pass.x + pass.prevX) / 2
  out.centerZ = (pass.z + pass.prevZ) / 2
  out.yaw = segment > 1e-9 ? Math.atan2(dx, dz) : pass.heading // isPointInOrientedBox2D: halfDepth 축 = (sin yaw, cos yaw)
  out.halfWidth = SLTERA_HALF_WIDTH
  out.halfDepth = segment / 2 + SLTERA_HALF_LENGTH
  return !screen || isSlteraPointOnScreen(screen, pass.x, pass.z)
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

const _hitBox = { centerX: 0, centerZ: 0, yaw: 0, halfWidth: 0, halfDepth: 0 }

/**
 * 로자리 피격 판정. 질주 중 이번 프레임 쓸고 간 사각형(로자리 반경만큼 넓힘)과 로자리가 겹치면 질주당
 * 1회 피해량을 반환한다. 반환 = 피해(0이면 안 맞음/이미 맞음).
 */
export function checkSlteraPlayerHit(pass, playerX, playerZ, maxHp) {
  if (!pass.swept || pass.playerHit) return 0
  const box = _hitBox
  getSlteraSweepBox(pass, box)
  const r = SLTERA_PLAYER_RADIUS
  if (!isPointInOrientedBox2D(box.centerX, box.centerZ, box.yaw, box.halfWidth + r, box.halfDepth + r, playerX, playerZ)) return 0
  pass.playerHit = true
  return Math.max(0, maxHp) * SLTERA_PLAYER_DAMAGE_RATIO
}

// ── 런 단위 스케줄 상태(SlteraEvent가 판마다 하나) ──────────────────────────────

export function createSlteraRunState() {
  return { pass: createSlteraPass(), passIndex: 0, instantRequested: false }
}

/** 오너 치트 '슬테라 즉시 출현' 요청. 이미 질주 중(또는 요청 대기 중)이면 무시하고 false. */
export function requestSlteraInstantPassOn(run) {
  if (run.pass.phase !== SLTERA_PHASE.DONE || run.instantRequested) return false
  run.instantRequested = true
  return true
}

/**
 * 지금 새 질주를 시작해야 하나. 예정 시각이 지났거나(이미 지난 예정은 건너뛰지 않고 지금 바로 한 번)
 * 즉시 출현 요청이 있으면 true. 요청은 여기서 소비되고, 즉시 출현은 자연 스케줄(passIndex)을 건드리지 않는다.
 */
export function consumeSlteraPassStart(run, stageId, gameKey, elapsedMs) {
  if (run.pass.phase !== SLTERA_PHASE.DONE) return false
  const instant = run.instantRequested
  run.instantRequested = false
  if (elapsedMs >= getSlteraPassStartMs(stageId, gameKey, run.passIndex)) {
    while (getSlteraPassStartMs(stageId, gameKey, run.passIndex + 1) <= elapsedMs) run.passIndex += 1
    const startMs = getSlteraPassStartMs(stageId, gameKey, run.passIndex)
    run.passIndex += 1
    // 마틸다 예고 앞뒤 12초에 걸리는 자연 질주는 건너뛴다(즉시 출현 요청은 그대로 받는다).
    return isSlteraNaturalStartAllowed(stageId, startMs) || instant
  }
  return instant
}

// 자연 질주가 탈출구·마틸다 예고(getSlteraDeadlineMs)와 겹치지 않게 비우는 간격. 세로 화면 질주 최대 ≈11초보다 길게.
// balanceqa 11-08: 3번째 질주(185~195초 시작)가 205초 예고와 겹칠 수 있었다.
export const SLTERA_DEADLINE_CLEAR_MS = 12_000

/** 이 시각에 시작하는 자연 질주를 달려도 되나 — 예고 시각 앞뒤 12초 안이면 false(건너뜀). */
export function isSlteraNaturalStartAllowed(stageId, startMs) {
  const deadline = getSlteraDeadlineMs(stageId)
  return !(startMs > deadline - SLTERA_DEADLINE_CLEAR_MS && startMs < deadline + SLTERA_DEADLINE_CLEAR_MS)
}
