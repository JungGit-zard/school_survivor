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
//   화면 한 모서리 근처 바로 밖(여유 ≈1.08u — 차 귀퉁이 거리 + 0.11u)에서 출발해 반대편 모서리 근처 바로 밖까지 '사선'으로 지나간다.
//   직진하지 않는다: 사선 위에 불규칙한 지그재그 경유점(좌우 폭 0.5~1.8u, 간격 1.0~2.6u, 15%는 같은 쪽
//   연속)을 깔고 핸들을 꺾어 쫓아가며(초당 5.4rad), 0.33~1.07초마다 핸들이 갑자기 확 돌아가는 '발작'
//   (0.05~0.11초 동안 초당 15rad)이 끼어든다. 핸들 떨림(±0.15~0.3rad, 1.8~3Hz)도 늘 있다.
//   (11-13 속도 1.5배: 시간 기반 값을 같은 1.5배 박자로 — 거리로 잰 지그재그 모양은 11-08판 그대로. SLTERA_DRIVE_TEMPO)
//   세로 화면에서 화면 안 좌우 꺾임(0.35u 이상 되돌아옴) 중앙값 5번, 꺾임 폭 중앙값 2.1u.
//   핸들은 사선 방향에서 70°까지만 꺾이고 떨림을 얹어도 87°를 넘지 않아 늘 앞으로 나아가므로 질주는 반드시 끝난다.
//   경유점은 화면이 보는 바닥(사다리꼴) 가장자리에서 0.8u 안쪽에만 둔다 — 화면 안에서 오래 비틀거린다.
//   속도 4.2u/s(11-07판 14u/s의 3/10 = 11-08판 2.8u/s의 1.5배), 크기 7/15(11-08판 1/3의 1.4배 — 판정 길이 1.73u·
//   폭 0.89u, 비주얼도 7/15). 세로 화면(390×844)·로자리 정지·장애물 없음 기준 화면 체류 중앙값 ≈6.4초
//   (11-08판 ≈9.2초, 11-07판 가로 직진 ≈0.75초). 장애물 있는 실제 S1~S5에서 질주 중앙값 ≈5~6초.
//   사선은 출발 순간 화면에 맞춘 월드 경로라 로자리가 멀리 달아나면 그만큼 일찍 화면에서 사라진다.
//   11-13부터 차(4.2u/s)가 로자리 기본 속도(3.0u/s)보다 빠르다 — 뒤쫓기면 따라잡힐 수 있다(경로가 로자리를 쫓지는 않는다).
//   로자리를 노리지 않는다 — 사선이 화면 가운데(로자리)를 지나므로 로자리 근처 경유점은 반대쪽으로 비킨다
//   (SLTERA_ROSARI_*, 여유는 차 반폭이 커진 만큼 넓혔다). 가만히 선 로자리가 맞는 질주 ≈5%(장애물 없음) /
//   실제 S1~S5 프랍 위 ≈8~14%(11-08판 ≈7%, 2배판 ≈22% — 발작·떨림·튕김으로 맞는다).
// 치기:
//   차체 판정박스(길이 1.73u, 폭 0.89u, 차가 보는 방향으로 회전)를 이번 프레임 이동만큼 늘린 영역 안의 적마다
//   한 번만 굴림 — 65% 확률로 치어 60 피해 + 넉백, 35%는 아슬아슬하게 비켜 간다(무작위 치기).
//   보스·마틸다는 20만. 차 중심이 화면 밖(진입·이탈 여유 구간)일 때는 치지 않는다.
//   로자리와 겹치면 질주당 1회 최대 HP의 15% 피해(일반 무적 규칙을 따른다 — 무적 중이면 무시).
//   치기 쿵 소리(zombieGiantThud)는 게임 시간 150ms에 한 번만 — 무리를 쓸고 가면 연속 프레임마다 쳐서
//   쿵이 겹쳐 쌓이고 클리핑했다(보호 등급 소리라 동시 재생 캡에도 안 걸린다). claimSlteraThud 참고.
// 등장 점프(11-14 Terry: "슬테라는 점프한 뒤 옆으로 1회전하고 쿵, 바닥에 떨어져야 한다" — 등장할 때):
//   질주마다 정확히 한 번. 차 전체(판정박스 네 귀퉁이)가 화면이 보는 바닥 안에 처음 들어온 뒤, 꼭대기(떠 보이는
//   자리)와 착지점까지 화면 안인 순간에 뛴다(0.6초 기다려도 그런 자리가 안 나오면 차 전체가 화면 안이기만 하면 뛴다).
//   튕겨 밀리는 중에는 뛰지 않는다. 체공 0.8초, 높이 차 길이의 1.25배(≈2.16u) 포물선, 그동안 뛰기 직전 방향 그대로
//   주행 속도로 직진(≈3.36u)하며 진행축(차 앞뒤 축)으로 옆 1회전(2π, smoothstep). 착지 순간 쿵(치기 쿵과 같은
//   150ms 간격 제한) + 짧은 눌림. 공중에서는 장애물 충돌·튕김 없음(프랍 위를 넘어간다), 좀비 치기·로자리 피격 없음.
//   착지한 step부터 평소 판정 — 좀비·로자리 위에 떨어지면 평소처럼 맞는다(로자리는 여전히 질주당 1회).
//   착지 자리가 프랍과 겹치면 출발 때 규칙처럼 겹침이 풀릴 때까지 통과한다. 상태는 전부 pass에 있고 dt로만 진행한다.
import { getStageConfig } from './stageConfig.js'
import { isBossType } from './burstEvents.js'
import { GAME_CAMERA_BACK, GAME_CAMERA_HEIGHT, getGameplayGroundReach } from './gameCameraFraming.js'
import { isPointInOrientedBox2D } from './weaponCollision.js'

export const SLTERA_STAGE_IDS = Object.freeze(['stage1', 'stage2', 'stage3', 'stage4', 'stage5'])
export const SLTERA_FIRST_PASS_MIN_MS = 15_000
export const SLTERA_FIRST_PASS_WINDOW_MS = 10_000
export const SLTERA_REPEAT_MS = 85_000

// 크기·속도 배율. 11-07판 값을 기준으로 곱한다 — 비주얼(SlteraEvent의 그룹 scale)과 판정 사각형이 같은 배율을 쓴다.
//   11-08 Terry: 크기 1/3, 속도 1/5.  11-13 Terry: "슬테라 크기 2배, 속도 1.5배" → 크기 2/3, 속도 3/10.
//   11-13 Terry 이어서: "슬테라 크기 다시 30퍼센트 줄여" → 크기 2/3 × 0.7 = 7/15(11-08판의 1.4배), 속도는 그대로.
export const SLTERA_SIZE_SCALE = (2 / 3) * 0.7 // ≈0.467
export const SLTERA_SPEED_SCALE = 3 / 10 // 11-08판(1/5)의 1.5배
export const SLTERA_BASE_SPEED = 14 // 11-07판 직진 속도(u/s)
export const SLTERA_SPEED = SLTERA_BASE_SPEED * SLTERA_SPEED_SCALE // 4.2u/s — 실제 주행 경로를 따라 잰 속도
export const SLTERA_BASE_HALF_LENGTH = 1.85 // 11-07판 차 길이 3.7u의 절반
export const SLTERA_BASE_HALF_WIDTH = 0.95 // 11-07판 차 폭 1.9u의 절반
// 판정박스(차체 OBB, 진행 방향=차가 보는 방향으로 회전): 길이 ≈1.73u × 폭 ≈0.89u. 장애물 충돌·좀비 치기·로자리
// 피격이 모두 이 한 상자를 쓴다(getSlteraBodyBox / getSlteraSweepBox).
export const SLTERA_HALF_LENGTH = SLTERA_BASE_HALF_LENGTH * SLTERA_SIZE_SCALE // ≈0.863u(길이 1.73u)
export const SLTERA_HALF_WIDTH = SLTERA_BASE_HALF_WIDTH * SLTERA_SIZE_SCALE // ≈0.443u(폭 0.89u)
export const SLTERA_PLAYER_RADIUS = 0.3 // 로자리 몸통 판정 반경

// 차 중심→귀퉁이 거리(≈0.97u). 화면 밖 여유들은 이 값에서 뽑는다 — 크기를 바꾸면 함께 따라간다.
export const SLTERA_BODY_CORNER = Math.hypot(SLTERA_HALF_LENGTH, SLTERA_HALF_WIDTH)
// 사선 경로: 출발·도착은 화면 바로 밖 여유(u). 귀퉁이 거리보다 0.11u 커서 차 전체가 화면 밖에서 출발한다
// (≈1.08u. 2배판은 1.39+0.11 = 1.5u였다).
export const SLTERA_EDGE_MARGIN = SLTERA_BODY_CORNER + 0.11
// 끝: 도착점을 지나고 차 전체가 (출발 순간의) 화면 밖으로 나가야 사라진다 — 차 중심이 화면에서 이만큼 밖.
// 차 귀퉁이까지 거리보다 0.06u 크게(≈1.03u. 2배판 1.45u). 도착점을 4u 넘게 지나도 아직 보이면 계속 달린다.
export const SLTERA_OFFSCREEN_PAD = SLTERA_BODY_CORNER + 0.06
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
// 차 옆면과 로자리 사이 여유를 11-08판(1.3u − 반폭 0.317u)과 같게 지키도록 늘어난 반폭만큼 더한다
// (지금 ≈1.43u, 2배판 ≈1.62u). 노리지 않는다는 설계를 지키는 보정이지 크기·속도 하향이 아니다.
export const SLTERA_ROSARI_CLEARANCE = 1.3 + (SLTERA_HALF_WIDTH - SLTERA_BASE_HALF_WIDTH / 3)
export const SLTERA_ROSARI_ZONE_INSET = 0.4
// 운전 박자: 11-13 속도 1.5배에서 지그재그 경로 '모양'(꺾는 반경·떨림 파장·발작 간격을 거리로 잰 값)이 11-08판과
// 같도록 시간 기반 값(핸들 속도·떨림 주파수·발작 간격·길이)을 같은 1.5배로 빠르게 돈다. 길이 단위 경로는 그대로,
// 그 위를 1.5배 빨리 지나간다(핸들 속도만 그대로 두면 꺾는 반경이 1.5배로 넓어져 지그재그가 무뎌진다).
export const SLTERA_DRIVE_TEMPO = SLTERA_SPEED_SCALE / (1 / 5)
// 핸들: 경유점 쪽으로 꺾는 최대 속도, 사선 대비 최대 꺾임, 늘 있는 떨림.
export const SLTERA_STEER_RAD_PER_SEC = 3.6 * SLTERA_DRIVE_TEMPO // 5.4rad/s
export const SLTERA_MAX_DEVIATION_RAD = (70 * Math.PI) / 180
export const SLTERA_WOBBLE_MIN_RAD = 0.15
export const SLTERA_WOBBLE_MAX_RAD = 0.3
// 발작(갑자기 핸들이 확 돌아감): 간격·길이·방향 무작위.
export const SLTERA_JERK_RAD_PER_SEC = 10 * SLTERA_DRIVE_TEMPO // 15rad/s(한 번 꺾임 각은 11-08판과 같다)
export const SLTERA_JERK_GAP_MIN_SEC = 0.5 / SLTERA_DRIVE_TEMPO
export const SLTERA_JERK_GAP_MAX_SEC = 1.6 / SLTERA_DRIVE_TEMPO
export const SLTERA_JERK_MIN_SEC = 0.08 / SLTERA_DRIVE_TEMPO
export const SLTERA_JERK_MAX_SEC = 0.16 / SLTERA_DRIVE_TEMPO
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

// 장애물 물리(11-13 Terry: "장애물에 부딪히면 뒤로 밀리게 한다, 밀린 뒤 방향 바뀌게 한다").
// 장애물 = 그 스테이지의 프랍 OBB(getStageObjectSightObstacles — 좀비 이동·시야와 같은 목록). 새 물리 엔진 없이
// 차체 OBB 대 장애물 OBB 분리축(SAT)으로 겹침·최소 밀어내기 방향을 구한다.
//   ① 겹치면 늘 최소 침투 축으로 밀어내 차는 장애물 안에 남지 않는다.
//   ② 진행 방향이 장애물 면을 향해(법선과 내적 < -0.1) 부딪히면 '튕김': 0.4초 동안 부딪히기 전 진행의
//      반대 방향으로 3.6u/s에서 0까지 줄며 밀려난다(≈0.72u). 밀리는 시간의 앞 35%는 그대로, 나머지 동안
//      새 방향으로 차체를 돌린다.
//   ③ 새 방향 = 진행 방향을 장애물 면에 반사 + 무작위 0.2~0.6rad 비틀기, 면 법선에서 60° 안으로 제한(장애물
//      쪽을 다시 보지 않는다). 그 방향을 새 '사선'으로 삼아 화면 밖까지 지그재그 경유점을 다시 깔고 같은
//      고장 난 차 운전(핸들 추적·발작·떨림)을 이어 간다.
//   화면 밖에서 출발할 때는 차 중심이 (출발 순간의) 화면에 들어오고 어떤 장애물과도 안 겹친 뒤부터 부딪힌다 —
//   화면 밖 프랍에 튕겨 보이지도 않고 끝나는 질주를 막는다.
//   새 방향 앞 3u가 다른 프랍에 막혀 있으면 반대 비틀기·법선·법선±35°·법선±75°(좁은 통로 따라 빠지기) 중 가장
//   트인 쪽을 고른다(핀볼 방지). 고른 방향은 늘 장애물 면 바깥쪽(법선과 내적 > 0)이다.
//   화면 밖으로 나가는 중에는 화면 밖 프랍을 무시한다. 면을 비스듬히 스치면 튕기지 않고 미끄러진다.
//   끼임 안전장치(장애물 판정을 끄고 원래 운전으로 뚫고 빠져나감 — 질주는 늘 끝나고 화면 한가운데서 사라지지 않는다):
//   튕김 8번을 다 쓰고 또 들이받을 때, 면에 막혀 0.35초 넘게 거의 못 나아갈 때, 질주 20초(최종).
//   퇴장 모드: 한 번이라도 튕긴 질주는 7초가 되면 핸들 ±70° 안에서 화면을 가장 빨리 벗어나는 쪽으로 사선을 다시
//   깔고 더는 튕기지 않는다 — 세로 화면 실제 S1~S5 질주 최대가 예고 비우기 12초 안에 든다.
export const SLTERA_BOUNCE_SEC = 0.4
export const SLTERA_BOUNCE_SPEED = 3.6
export const SLTERA_BOUNCE_TURN_START = 0.35
export const SLTERA_BOUNCE_MIN_APPROACH = 0.1
export const SLTERA_BOUNCE_MAX_FROM_NORMAL_RAD = (60 * Math.PI) / 180
export const SLTERA_BOUNCE_AISLE_FROM_NORMAL_RAD = 1.3 // ≈75°
export const SLTERA_BOUNCE_JITTER_MIN_RAD = 0.2
export const SLTERA_BOUNCE_JITTER_MAX_RAD = 0.6
export const SLTERA_BOUNCE_DISTANCE = (SLTERA_BOUNCE_SPEED * SLTERA_BOUNCE_SEC) / 2 // ≈0.72u(선형 감속)
export const SLTERA_BOUNCE_CLEAR_ENOUGH = 3 // 새 방향 앞이 이만큼 트였으면 그 방향을 그대로 쓴다(u)
export const SLTERA_MAX_BOUNCES = 8
export const SLTERA_OBSTACLE_MAX_SEC = 20
export const SLTERA_EXIT_MODE_SEC = 7 // 튕긴 질주는 7초부터 가장 가까운 화면 밖으로 퇴장(더 안 튕김)
export const SLTERA_MAX_PASS_SEC = 30 // 최종 안전장치(정상 질주는 닿지 않는다)
export const SLTERA_STUCK_SEC = 0.35
// 끼임(Terry 11-13 라이브: "책상 사이에 끼어서 제자리만 맴돌다가 사라진다") 조기 감지 — 둘 중 하나면 곧바로 탈출:
//   ① 새 튕김 자리 반경 1u 안에 이전 튕김이 이미 2번 이상 → 세 번째로 튀지 않는다.
//   ② 단단한 상태로 1.2초 넘게 반경 1u 안을 못 벗어남(정상 튕김은 ≈0.7초 안에 빠진다).
// 탈출 = 장애물 판정을 끄고(뚫고 지나감) 퇴장 모드로 핸들 ±70° 안에서 화면을 가장 빨리 벗어나는 쪽으로 곧장 달려
// 나간다 — 제자리에서 돌지 않고, 화면 안에서 사라지지 않는다(끝은 늘 차 전체가 화면 밖일 때).
export const SLTERA_WEDGE_RADIUS = 1
export const SLTERA_WEDGE_BOUNCES = 2
export const SLTERA_WEDGE_SEC = 1.2
// 등장 점프(11-14). 높이는 fov 30·45° 내려다보는 카메라에서 차가 화면 위쪽으로 차 길이 1.4배쯤 떠 보이는 값.
export const SLTERA_CAR_LENGTH = SLTERA_HALF_LENGTH * 2 // ≈1.73u
export const SLTERA_JUMP_HEIGHT = SLTERA_CAR_LENGTH * 1.25 // ≈2.16u(꼭대기 차 바닥 높이)
export const SLTERA_JUMP_AIR_SEC = 0.8
export const SLTERA_JUMP_ROLL_RAD = Math.PI * 2 // 옆 1회전
export const SLTERA_JUMP_DISTANCE = SLTERA_SPEED * SLTERA_JUMP_AIR_SEC // 공중 직진 ≈3.36u
export const SLTERA_JUMP_PATIENCE_SEC = 0.6 // 차 전체가 화면 안인데 꼭대기·착지점이 화면 밖이면 이만큼까지 기다린다
export const SLTERA_JUMP_TOP = 1.1 * SLTERA_SIZE_SCALE // 차 지붕(운전자 머리) 높이(u) — 꼭대기에서 떠 보이는 자리 판정
export const SLTERA_LANDING_SQUASH = 0.25 // 착지 눌림: 세로 최대 25% 눌리고 가로는 그 절반만큼 퍼진다
export const SLTERA_LANDING_SQUASH_SEC = 0.22
export const SLTERA_JUMP_STATE = Object.freeze({ READY: 0, AIR: 1, LANDED: 2 })
const OBSTACLE_RESOLVE_ITERATIONS = 8
const OBSTACLE_SKIN = 1e-4

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
    // 장애물 물리(11-13). obstacles = 스테이지 프랍 OBB 목록(없으면 충돌 없음).
    obstacles: null,
    solid: false, // 화면에 들어와 장애물과 안 겹친 뒤부터 true — 그때부터 부딪힌다
    brokeThrough: false, // 끼임 안전장치로 장애물 판정을 끈 질주
    blockedSec: 0, // 면에 막혀 거의 못 나아간 연속 시간
    exiting: false, // 퇴장 모드(튕긴 질주 7초 이후, 또는 끼임 탈출)
    bounceAtX: new Float64Array(SLTERA_MAX_BOUNCES), // 튕긴 자리(끼임 감지)
    bounceAtZ: new Float64Array(SLTERA_MAX_BOUNCES),
    escapePending: false, // 튕기는 중에 끼임 판정 — 튕김이 끝나면 퇴장 모드로
    anchorX: 0, anchorZ: 0, anchorMs: 0, // 반경 1u 체류 감시 기준점
    bounces: 0, // 이번 질주 튕김 횟수(SLTERA_MAX_BOUNCES까지)
    bounceLeftSec: 0, // >0이면 튕겨 밀리는 중
    bounceDirX: 0, bounceDirZ: 0, // 밀리는 방향(단위벡터)
    bounceFromHeading: 0, bounceToHeading: 0,
    contactNX: 0, contactNZ: 0, // 마지막 충돌 면 법선(장애물 → 차)
    playerX: NaN, playerZ: NaN, // 최근 로자리 위치(튕긴 뒤 경유점을 다시 깔 때 로자리 비키기용)
    rngState: 0, // 튕긴 뒤 다시 깔기용 결정론 난수 상태(질주 시작 때 rand로 시드)
    rng: null,
    // 등장 점프(11-14).
    jumpState: SLTERA_JUMP_STATE.READY,
    airborne: false,
    jumps: 0, // 이번 질주에서 뛴 횟수(늘 0 또는 1)
    jumpSec: 0, // 뛴 뒤 흐른 시간(초)
    jumpProgress: 0, // 체공 진행도 0..1
    jumpHeight: 0, // 지금 차 바닥 높이(u)
    jumpRoll: 0, // 지금까지 돈 각(0 → 2π, 착지 뒤 2π 유지 = 똑바로)
    jumpRollSign: 1, // 회전 방향(±1)
    jumpWaitSec: 0, // 차 전체가 화면 안인데 꼭대기·착지점이 안 보여 기다린 시간
    jumpUrgent: false, // 차 전체가 보이는데 프랍에 막혔다 — 기다리지 않고 바로 뛴다
    jumpTakeoffMs: NaN,
    jumpTakeoffX: NaN, jumpTakeoffZ: NaN,
    landedMs: -Infinity, // 착지 시각(질주 시계 ms)
    landingThudPending: false, // 착지 쿵을 아직 안 냈다
    jumpView: null, // 뛸 자리 판정에 쓰는 화면(런타임은 지금 화면, 없으면 출발 순간 화면)
  }
}

// mulberry32 — 질주 시작 때 rand로 시드한 상태에서 튕긴 뒤 경로를 결정론적으로 다시 뽑는다.
function nextSlteraRandom(pass) {
  pass.rngState = (pass.rngState + 0x6d2b79f5) >>> 0
  let t = pass.rngState
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
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
 * 사선(entry·dir·length) 위에 지그재그 경유점을 깐다. uStart = 첫 경유점 전 여유(질주 시작은 화면 밖 여유,
 * 튕긴 뒤 다시 깔 때는 0). 로자리 위치를 알면 로자리 행 근처 경유점은 로자리 반대쪽으로 비킨다.
 */
function planSlteraZigzag(pass, bounds, uStart, playerX, playerZ, rand) {
  const entryX = pass.entryX
  const entryZ = pass.entryZ
  const length = pass.length
  const normalX = pass.dirZ
  const normalZ = -pass.dirX
  // 로자리의 사선 좌표(진행 pu, 좌우 pw). 위치를 모르면 비키기 없음.
  const hasPlayer = Number.isFinite(playerX) && Number.isFinite(playerZ)
  const pu = hasPlayer ? (playerX - entryX) * pass.dirX + (playerZ - entryZ) * pass.dirZ : NaN
  const pw = hasPlayer ? (playerX - entryX) * normalX + (playerZ - entryZ) * normalZ : 0
  const away = pw >= 0 ? -1 : 1
  let side = rand() < 0.5 ? 1 : -1
  let u = uStart + lerp(0.8, 2, rand())
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
}

/**
 * 질주 하나를 시작한다 — 예고 없이 곧장 질주 단계. pass 객체를 재사용해 할당을 질주당 0으로 유지한다.
 * bounds = 현재 화면이 보는 바닥 범위(refs.screenBounds), playerX/Z = 출발 순간 로자리 위치(근처 경유점을
 * 로자리 반대쪽으로 비키는 데만 쓴다), rand = [0,1) 난수. 무작위는 전부 여기서 소비하고
 * stepSlteraPass는 결정론적이다(같은 rand·같은 dt면 같은 경로).
 */
export function beginSlteraPass(pass, { bounds, playerX = NaN, playerZ = NaN, obstacles = null, rand = Math.random }) {
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
  planSlteraZigzag(pass, bounds, SLTERA_EDGE_MARGIN, playerX, playerZ, rand)

  // 3) 발작 일정 — 고장 난 핸들이 불규칙한 간격으로 확 돌아간다.
  let jerkAt = lerp(0.35, 1.1, rand()) / SLTERA_DRIVE_TEMPO
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
  pass.wobbleRadPerSec = Math.PI * 2 * lerp(1.2, 2, rand()) * SLTERA_DRIVE_TEMPO
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
  // 장애물 물리 상태. 시드는 맨 마지막에 뽑는다(그 앞의 rand 소비 순서는 11-08판 그대로).
  pass.obstacles = obstacles && obstacles.length > 0 ? obstacles : null
  pass.solid = false
  pass.brokeThrough = false
  pass.blockedSec = 0
  pass.exiting = false
  pass.escapePending = false
  pass.anchorX = pass.x
  pass.anchorZ = pass.z
  pass.anchorMs = 0
  pass.bounces = 0
  pass.bounceLeftSec = 0
  pass.contactNX = 0
  pass.contactNZ = 0
  pass.playerX = playerX
  pass.playerZ = playerZ
  pass.rngState = Math.floor(rand() * 4294967296) >>> 0
  if (!pass.rng) pass.rng = () => nextSlteraRandom(pass)
  // 등장 점프 상태(rand를 더 쓰지 않는다 — 기존 경로 난수 순서 그대로).
  pass.jumpState = SLTERA_JUMP_STATE.READY
  pass.airborne = false
  pass.jumps = 0
  pass.jumpSec = 0
  pass.jumpProgress = 0
  pass.jumpHeight = 0
  pass.jumpRoll = 0
  pass.jumpRollSign = 1
  pass.jumpWaitSec = 0
  pass.jumpUrgent = false
  pass.jumpTakeoffMs = NaN
  pass.jumpTakeoffX = NaN
  pass.jumpTakeoffZ = NaN
  pass.landedMs = -Infinity
  pass.landingThudPending = false
  pass.jumpView = pass.view
  return pass
}

// [-π, π)로 감는다.
function wrapAngle(angle) {
  return angle - Math.PI * 2 * Math.floor((angle + Math.PI) / (Math.PI * 2))
}

function clampAbs(value, limit) {
  return value > limit ? limit : value < -limit ? -limit : value
}

// ── 판정박스·장애물 충돌 ─────────────────────────────────────────────────────────

const obstacleCos = (o) => (o.cosY !== undefined ? o.cosY : o.rotationY ? Math.cos(o.rotationY) : 1)
const obstacleSin = (o) => (o.sinY !== undefined ? o.sinY : o.rotationY ? Math.sin(o.rotationY) : 0)
const _contact = { nx: 0, nz: 0, depth: 0 }
const _probe = { nx: 0, nz: 0, depth: 0 }

/**
 * 차체 OBB(중심 cx,cz, 보는 방향 heading)와 장애물 OBB 하나의 겹침(분리축 4개). 겹치면 최소 침투 깊이를
 * 반환하고 out.nx/nz = 장애물에서 차 쪽으로 미는 단위 법선. 안 겹치면 0.
 * 장애물 로컬 축은 enemySimulation collidesEnemyObstacle과 같다: X' = (cos, -sin), Z' = (sin, cos).
 */
function slteraObstacleOverlap(cx, cz, heading, o, out) {
  if (!o || !Number.isFinite(o.x) || !Number.isFinite(o.z) || !Number.isFinite(o.halfX) || !Number.isFinite(o.halfZ)) return 0
  const dx = cx - o.x
  const dz = cz - o.z
  const reach = SLTERA_BODY_CORNER + Math.hypot(o.halfX, o.halfZ)
  if (dx * dx + dz * dz > reach * reach) return 0
  const fx = Math.sin(heading); const fz = Math.cos(heading) // 차 앞(halfLength 축)
  const rx = fz; const rz = -fx // 차 옆(halfWidth 축)
  const oc = obstacleCos(o); const os = obstacleSin(o)
  const ax = oc; const az = -os // 장애물 X'(halfX 축)
  const bx = os; const bz = oc // 장애물 Z'(halfZ 축)
  let best = Infinity
  for (let i = 0; i < 4; i += 1) {
    const ux = i === 0 ? fx : i === 1 ? rx : i === 2 ? ax : bx
    const uz = i === 0 ? fz : i === 1 ? rz : i === 2 ? az : bz
    const carR = SLTERA_HALF_LENGTH * Math.abs(fx * ux + fz * uz) + SLTERA_HALF_WIDTH * Math.abs(rx * ux + rz * uz)
    const obsR = o.halfX * Math.abs(ax * ux + az * uz) + o.halfZ * Math.abs(bx * ux + bz * uz)
    const dist = dx * ux + dz * uz
    const overlap = carR + obsR - Math.abs(dist)
    if (overlap <= 0) return 0
    if (overlap < best) {
      best = overlap
      const sign = dist < 0 ? -1 : 1
      out.nx = ux * sign
      out.nz = uz * sign
    }
  }
  out.depth = best
  return best
}

/** 지금 차체 OBB와 가장 깊이 겹친 장애물(깊이 반환, 법선은 out에). 0이면 안 겹침. */
function findDeepestSlteraContact(pass, out) {
  const obstacles = pass.obstacles
  let deepest = 0
  let nx = 0; let nz = 0
  for (let i = 0; i < obstacles.length; i += 1) {
    const depth = slteraObstacleOverlap(pass.x, pass.z, pass.heading, obstacles[i], out)
    if (depth > deepest) { deepest = depth; nx = out.nx; nz = out.nz }
  }
  out.nx = nx
  out.nz = nz
  out.depth = deepest
  return deepest
}

/**
 * (x,z)에서 dir 방향 반직선이 화면(출발 순간 화면)을 마지막으로 벗어나는 거리(u). 화면 밖에서 시작해 화면 쪽을
 * 보면 '들어오는 거리 + 화면을 가로지르는 거리'다(balanceqa 11-13: 화면 가장자리에서 튕겨 차 중심이 화면 밖일 때
 * 0이 되어 경로가 1.5u로 잘리고, 화면 안을 보는 차가 화면에서 끝나 사라졌다). 화면과 안 만나면 0.
 */
function slteraDistanceToLeaveView(view, x, z, dirX, dirZ) {
  const STEP = 0.25
  let last = 0
  for (let d = 0; d <= 80; d += STEP) {
    if (isSlteraPointOnScreen(view, x + dirX * d, z + dirZ * d)) last = d + STEP
  }
  return last
}

const BOUNCE_CANDIDATE_OFFSETS = Object.freeze([0, 0, 0, 0.6, -0.6, 1.3, -1.3])
const CLEAR_RUN_STEP = 0.3

/** (x,z)에서 heading 방향으로 차체 OBB를 밀어 보며 프랍에 안 막히고 갈 수 있는 거리(u, 최대 CLEAR_ENOUGH). */
function slteraClearRun(pass, x, z, heading) {
  const dx = Math.sin(heading)
  const dz = Math.cos(heading)
  const obstacles = pass.obstacles
  for (let d = CLEAR_RUN_STEP; d <= SLTERA_BOUNCE_CLEAR_ENOUGH + 1e-9; d += CLEAR_RUN_STEP) {
    const cx = x + dx * d
    const cz = z + dz * d
    if (!isSlteraPointOnScreen(pass.view, cx, cz)) return SLTERA_BOUNCE_CLEAR_ENOUGH // 화면 밖이면 트인 것
    for (let i = 0; i < obstacles.length; i += 1) {
      if (slteraObstacleOverlap(cx, cz, heading, obstacles[i], _probe) > 0) return d - CLEAR_RUN_STEP
    }
  }
  return SLTERA_BOUNCE_CLEAR_ENOUGH
}

// 튕김 시작: 부딪히기 전 진행 반대쪽으로 밀리고, 끝나면 면에 반사(+비틀기)한 새 방향으로 간다.
function startSlteraBounce(pass, nx, nz) {
  const fx = Math.sin(pass.heading)
  const fz = Math.cos(pass.heading)
  // 밀리는 방향 = 진행 반대. 비스듬히 스친 경우라도 장애물에서 떨어지는 쪽이어야 한다.
  let kx = -fx; let kz = -fz
  if (kx * nx + kz * nz < 0.25) { kx = nx; kz = nz }
  const kl = Math.hypot(kx, kz) || 1
  pass.bounceDirX = kx / kl
  pass.bounceDirZ = kz / kl
  // 새 방향: 면에 반사 + 비틀기, 면 법선에서 60° 안(장애물 쪽을 다시 보지 않는다).
  const dn = fx * nx + fz * nz
  const reflected = Math.atan2(fx - 2 * dn * nx, fz - 2 * dn * nz)
  const rng = pass.rng
  const twist = (rng() < 0.5 ? -1 : 1) * lerp(SLTERA_BOUNCE_JITTER_MIN_RAD, SLTERA_BOUNCE_JITTER_MAX_RAD, rng())
  const normalHeading = Math.atan2(nx, nz)
  // 후보 방향(모두 면 법선에서 60° 안): 반사+비틀기를 먼저 보고, 그쪽이 곧바로 다른 프랍에 막히면(붙어 있는
  // 책상 섬 사이 등) 반대로 비튼 반사·법선·법선±35° 중 가장 멀리 트인 쪽으로 간다 — 핀볼처럼 갇혀 튀지 않게.
  const startX = pass.x + pass.bounceDirX * SLTERA_BOUNCE_DISTANCE
  const startZ = pass.z + pass.bounceDirZ * SLTERA_BOUNCE_DISTANCE
  let bestHeading = 0
  let bestClear = -1
  for (let i = 0; i < BOUNCE_CANDIDATE_OFFSETS.length; i += 1) {
    const offset = BOUNCE_CANDIDATE_OFFSETS[i]
    const raw = i === 0 ? reflected + twist : i === 1 ? reflected - twist : normalHeading + offset
    // 반사 후보는 법선 60° 안, 마지막 두 후보(법선 ±75°)는 좁은 통로를 따라 빠져나가기용.
    const limit = i >= 5 ? SLTERA_BOUNCE_AISLE_FROM_NORMAL_RAD : SLTERA_BOUNCE_MAX_FROM_NORMAL_RAD
    const heading = normalHeading + clampAbs(wrapAngle(raw - normalHeading), limit)
    const clear = slteraClearRun(pass, startX, startZ, heading)
    if (clear > bestClear + 1e-9) { bestClear = clear; bestHeading = heading }
    if (i === 0 && clear >= SLTERA_BOUNCE_CLEAR_ENOUGH) break // 반사 쪽이 트였으면 그대로(자연스러운 반사)
  }
  pass.bounceFromHeading = pass.heading
  pass.bounceToHeading = wrapAngle(bestHeading)
  pass.bounceLeftSec = SLTERA_BOUNCE_SEC
  if (pass.bounces < SLTERA_MAX_BOUNCES) {
    pass.bounceAtX[pass.bounces] = pass.x
    pass.bounceAtZ[pass.bounces] = pass.z
  }
  pass.bounces += 1
  pass.jerkLeftSec = 0 // 튕기는 동안 발작은 멈춘다(예정분은 튕김 뒤 이어진다)
}

// 튕김이 끝난 자리에서 새 방향을 사선으로 삼아 화면 밖까지 지그재그 경로를 다시 깐다.
function replanSlteraAfterBounce(pass) {
  const heading = pass.bounceToHeading
  const dirX = Math.sin(heading)
  const dirZ = Math.cos(heading)
  pass.entryX = pass.x
  pass.entryZ = pass.z
  pass.dirX = dirX
  pass.dirZ = dirZ
  pass.diagHeading = heading
  pass.length = slteraDistanceToLeaveView(pass.view, pass.x, pass.z, dirX, dirZ) + SLTERA_EDGE_MARGIN
  pass.exitX = pass.x + dirX * pass.length
  pass.exitZ = pass.z + dirZ * pass.length
  planSlteraZigzag(pass, pass.view, 0, pass.playerX, pass.playerZ, pass.rng)
  pass.steer = heading
  pass.progress = 0
}

// 퇴장 모드(튕긴 질주가 SLTERA_EXIT_MODE_SEC를 넘김): 지금 핸들에서 ±70° 안의 방향 중 화면을 가장 빨리 벗어나는
// 쪽을 새 사선으로 깔고, 더는 튕기지 않는다(정면으로 박으면 뚫고 지나감). 튕김이 이어져 질주가 길어져도
// 마틸다 예고 비우기(SLTERA_DEADLINE_CLEAR_MS) 안에 끝나게 한다. 핸들 제한(사선 ±70°) 안이라 차체가 확 돌지 않는다.
function startSlteraExit(pass) {
  pass.exiting = true
  let bestHeading = pass.steer
  let best = Infinity
  for (let k = -4; k <= 4; k += 1) {
    const heading = pass.steer + (k / 4) * SLTERA_MAX_DEVIATION_RAD
    const d = slteraDistanceToLeaveView(pass.view, pass.x, pass.z, Math.sin(heading), Math.cos(heading))
    if (d < best - 1e-9) { best = d; bestHeading = heading }
  }
  const dirX = Math.sin(bestHeading)
  const dirZ = Math.cos(bestHeading)
  pass.entryX = pass.x
  pass.entryZ = pass.z
  pass.dirX = dirX
  pass.dirZ = dirZ
  pass.diagHeading = wrapAngle(bestHeading)
  pass.length = best + SLTERA_EDGE_MARGIN
  pass.exitX = pass.x + dirX * pass.length
  pass.exitZ = pass.z + dirZ * pass.length
  planSlteraZigzag(pass, pass.view, 0, pass.playerX, pass.playerZ, pass.rng)
  pass.progress = 0
}

// 장애물 처리: 겹침은 늘 밀어내고, 장애물 쪽으로 달려들다 부딪혔으면 튕김을 시작한다.
// 붙어 있는 프랍 사이 틈처럼 밀어내기로 못 빠지는 자리면 이번 substep 이동을 되돌린다(before = 직전의 안 겹친 상태).
function collideSlteraWithObstacles(pass, h, beforeX, beforeZ, beforeHeading) {
  if (!pass.obstacles || pass.brokeThrough) return
  const contact = _contact
  if (pass.elapsedMs >= SLTERA_OBSTACLE_MAX_SEC * 1000) {
    breakSlteraThrough(pass) // 최종 안전장치(정상 질주는 여기까지 오지 않는다)
    return
  }
  const onScreen = isSlteraPointOnScreen(pass.view, pass.x, pass.z)
  // 등장 점프 전(11-14): 차 전체가 화면에 보이기 전에는 프랍을 통과하고(입구 옆 프랍에 튕겨 안 보이는 채 사라지지
  // 않게), 차 전체가 보인 뒤 프랍에 막히면 튕기는 대신 그 자리에서 뛰어 넘는다(jumpUrgent).
  const jumpReady = pass.jumpState === SLTERA_JUMP_STATE.READY
  const carShown = jumpReady && isSlteraCarOnScreen(pass.jumpView || pass.view, pass.x, pass.z, pass.heading)
  if (!pass.solid) {
    if (jumpReady && !carShown) return
    // 화면에 들어오고 아무것과도 안 겹친 순간부터 단단해진다(화면 밖 출발·출발 지점 프랍 겹침 대비).
    if (onScreen && findDeepestSlteraContact(pass, contact) <= 0) pass.solid = true
    else if (jumpReady) pass.jumpUrgent = true
    return
  }
  // 화면을 벗어나는 중이면 화면 밖 프랍은 무시한다 — 안 보이는 데서 튕겨 되돌아와 질주가 길어지지 않게.
  // 다시 화면에 들어올 때 프랍과 겹쳐 있으면 겹침이 풀릴 때까지 통과한다(출발 때와 같은 규칙).
  if (!onScreen) {
    pass.solid = false
    return
  }
  let hit = false
  let hitNX = 0; let hitNZ = 0
  for (let i = 0; i < OBSTACLE_RESOLVE_ITERATIONS; i += 1) {
    const depth = findDeepestSlteraContact(pass, contact)
    if (depth <= 0) break
    if (!hit) { hit = true; hitNX = contact.nx; hitNZ = contact.nz }
    pass.x += contact.nx * (depth + OBSTACLE_SKIN)
    pass.z += contact.nz * (depth + OBSTACLE_SKIN)
  }
  if (!hit) {
    pass.blockedSec = 0
    return
  }
  if (findDeepestSlteraContact(pass, contact) > 0) {
    pass.x = beforeX
    pass.z = beforeZ
    pass.heading = beforeHeading
  }
  pass.contactNX = hitNX
  pass.contactNZ = hitNZ
  if (pass.bounceLeftSec > 0) return
  const fx = Math.sin(pass.heading)
  const fz = Math.cos(pass.heading)
  const approach = fx * hitNX + fz * hitNZ
  if (approach < -SLTERA_BOUNCE_MIN_APPROACH) {
    if (carShown) { pass.jumpUrgent = true; return } // 아직 안 뛰었다 — 튕기지 않고 뛰어 넘는다
    // 튕김을 다 썼거나 퇴장 모드이거나 같은 자리에서 또 튀려 하면(끼임) 곧장 뚫고 빠져나간다.
    if (pass.bounces >= SLTERA_MAX_BOUNCES || pass.exiting || countSlteraBouncesNear(pass) >= SLTERA_WEDGE_BOUNCES) escapeSltera(pass)
    else startSlteraBounce(pass, hitNX, hitNZ)
    return
  }
  // 면을 따라 미끄러지는 중: 앞으로 거의 못 나아가는 상태가 이어지면(틈에 낌) 밀고 지나간다.
  const moved = (pass.x - beforeX) * fx + (pass.z - beforeZ) * fz
  pass.blockedSec = moved < SLTERA_SPEED * h * 0.25 ? pass.blockedSec + h : 0
  if (pass.blockedSec >= SLTERA_STUCK_SEC) escapeSltera(pass)
}

// 지금 자리 반경 SLTERA_WEDGE_RADIUS 안에서 이미 튕긴 횟수.
function countSlteraBouncesNear(pass) {
  let near = 0
  const n = Math.min(pass.bounces, SLTERA_MAX_BOUNCES)
  for (let i = 0; i < n; i += 1) {
    const dx = pass.bounceAtX[i] - pass.x
    const dz = pass.bounceAtZ[i] - pass.z
    if (dx * dx + dz * dz <= SLTERA_WEDGE_RADIUS * SLTERA_WEDGE_RADIUS) near += 1
  }
  return near
}

// 끼임 탈출: 장애물 판정을 끄고 퇴장 모드로 곧장 화면 밖으로(튕기는 중이면 튕김이 끝난 뒤).
function escapeSltera(pass) {
  breakSlteraThrough(pass)
  if (pass.bounceLeftSec > 0) pass.escapePending = true
  else startSlteraExit(pass)
}

// 반경 1u 체류 감시: 단단한 상태로 1.2초 넘게 제자리 근처면 끼임.
function watchSlteraWedge(pass) {
  const dx = pass.x - pass.anchorX
  const dz = pass.z - pass.anchorZ
  if (!pass.solid || dx * dx + dz * dz > SLTERA_WEDGE_RADIUS * SLTERA_WEDGE_RADIUS) {
    pass.anchorX = pass.x
    pass.anchorZ = pass.z
    pass.anchorMs = pass.elapsedMs
    return
  }
  if (pass.elapsedMs - pass.anchorMs > SLTERA_WEDGE_SEC * 1000) escapeSltera(pass)
}

// 끼임 안전장치: 장애물 판정을 끄고 원래 고장 난 운전대로 화면을 빠져나간다(질주는 늘 끝난다).
function breakSlteraThrough(pass) {
  pass.solid = false
  pass.brokeThrough = true
}

const smoothstep = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v))

function bounceSlteraSubstep(pass, h, t) {
  const jh = Math.min(h, pass.bounceLeftSec)
  // 밀리는 속도: 3.6u/s에서 0까지 선형으로 줄어든다(구간 중간값으로 적분).
  const speed = SLTERA_BOUNCE_SPEED * Math.max(0, pass.bounceLeftSec - jh / 2) / SLTERA_BOUNCE_SEC
  pass.x += pass.bounceDirX * speed * jh
  pass.z += pass.bounceDirZ * speed * jh
  pass.distance += speed * jh
  pass.bounceLeftSec -= jh
  const done = pass.bounceLeftSec <= 1e-9
  if (done) pass.bounceLeftSec = 0
  // 차체 돌리기: 밀리기 앞 35%는 그대로, 그 뒤 새 방향(+떨림)으로 부드럽게 돈다.
  const frac = 1 - pass.bounceLeftSec / SLTERA_BOUNCE_SEC
  const ease = smoothstep((frac - SLTERA_BOUNCE_TURN_START) / (1 - SLTERA_BOUNCE_TURN_START))
  const wobble = pass.wobbleRad * Math.sin(t * pass.wobbleRadPerSec + pass.wobblePhase)
  const target = pass.bounceToHeading + wobble
  pass.heading = pass.bounceFromHeading + wrapAngle(target - pass.bounceFromHeading) * ease
  return done
}

// ── 등장 점프(11-14) ─────────────────────────────────────────────────────────────

/** 체공 진행도 p(0..1)의 차 바닥 높이 — 포물선, 처음·끝 0, 가운데(p=0.5) 꼭대기 SLTERA_JUMP_HEIGHT. */
export function getSlteraJumpHeight(p) {
  if (!(p > 0) || p >= 1) return 0
  return 4 * SLTERA_JUMP_HEIGHT * p * (1 - p)
}

/** 체공 진행도 p(0..1)까지 돈 각 — smoothstep으로 0 → 2π(단조 증가, p=1에서 정확히 2π). */
export function getSlteraJumpRoll(p) {
  if (!(p > 0)) return 0
  if (p >= 1) return SLTERA_JUMP_ROLL_RAD
  return SLTERA_JUMP_ROLL_RAD * p * p * (3 - 2 * p)
}

/** 착지 눌림 세기(1 = 막 착지, 0 = 없음). 눌렸다가(1→0) 살짝 되튀고(음수, 작게) 가라앉는다. */
export function getSlteraLandingSquash(pass) {
  const since = (pass.elapsedMs - pass.landedMs) / 1000
  if (!(since >= 0) || since >= SLTERA_LANDING_SQUASH_SEC) return 0
  const u = since / SLTERA_LANDING_SQUASH_SEC
  return (1 - u) * (1 - u) * Math.cos(1.5 * Math.PI * u)
}

// 화면 초점(카메라가 내려다보는 바닥 점)은 보이는 바닥 세로 범위의 이 비율 자리다(줌과 무관 — 위·아래 도달 거리가 같이 준다).
const SLTERA_VIEW_FOCUS_FRACTION = (() => {
  const reach = getGameplayGroundReach(30, 1)
  return reach.reachUp / (reach.reachUp + reach.reachDown)
})()

/**
 * 높이 h(u)에 뜬 점 (x,z)가 화면에서 겹쳐 보이는 바닥 자리(out.x, out.z). 게임 카메라는 화면 초점 위 17u·뒤 17u에서
 * 내려다본다 — 뜬 물체는 화면 위쪽(먼 쪽, -z)으로 밀려 보인다(화면 가운데에서 높이만큼 남짓, 먼 가장자리에서 그 이상).
 */
export function getSlteraApparentGroundPoint(view, x, z, h, out) {
  const focusX = (view.minX + view.maxX) / 2
  const cameraZ = view.minZ + (view.maxZ - view.minZ) * SLTERA_VIEW_FOCUS_FRACTION + GAME_CAMERA_BACK
  const s = GAME_CAMERA_HEIGHT / Math.max(1e-3, GAME_CAMERA_HEIGHT - h)
  out.x = focusX + (x - focusX) * s
  out.z = cameraZ + (z - cameraZ) * s
  return out
}

/** 차 전체(판정박스 네 귀퉁이)가 view가 보는 바닥 안인가. */
export function isSlteraCarOnScreen(view, x, z, heading) {
  const fx = Math.sin(heading); const fz = Math.cos(heading)
  for (let a = -1; a <= 1; a += 2) {
    for (let b = -1; b <= 1; b += 2) {
      const cx = x + fx * SLTERA_HALF_LENGTH * a + fz * SLTERA_HALF_WIDTH * b
      const cz = z + fz * SLTERA_HALF_LENGTH * a - fx * SLTERA_HALF_WIDTH * b
      if (!isSlteraPointOnScreen(view, cx, cz)) return false
    }
  }
  return true
}

const _apparent = { x: 0, z: 0 }

// 지금 뛰면 꼭대기에서 떠 보이는 차(지붕까지)와 착지한 차가 모두 화면 안인가.
function isSlteraJumpReadable(pass, view) {
  const fx = Math.sin(pass.heading); const fz = Math.cos(pass.heading)
  const half = SLTERA_JUMP_DISTANCE / 2
  getSlteraApparentGroundPoint(view, pass.x + fx * half, pass.z + fz * half, SLTERA_JUMP_HEIGHT + SLTERA_JUMP_TOP, _apparent)
  if (!isSlteraPointOnScreen(view, _apparent.x, _apparent.z, SLTERA_BODY_CORNER)) return false
  return isSlteraCarOnScreen(view, pass.x + fx * SLTERA_JUMP_DISTANCE, pass.z + fz * SLTERA_JUMP_DISTANCE, pass.heading)
}

// 땅 위 substep 끝: 아직 안 뛰었고 차 전체가 화면 안이면 뛴다(꼭대기·착지점까지 보이는 자리를 0.6초까지 기다린다).
function tryStartSlteraJump(pass, h) {
  if (pass.jumpState !== SLTERA_JUMP_STATE.READY || pass.bounceLeftSec > 0) return false
  const view = pass.jumpView || pass.view
  if (!isSlteraCarOnScreen(view, pass.x, pass.z, pass.heading)) return false
  if (!pass.jumpUrgent && !isSlteraJumpReadable(pass, view)) {
    pass.jumpWaitSec += h
    if (pass.jumpWaitSec < SLTERA_JUMP_PATIENCE_SEC) return false
  }
  pass.jumpUrgent = false
  pass.jumpState = SLTERA_JUMP_STATE.AIR
  pass.airborne = true
  pass.jumps += 1
  pass.jumpSec = 0
  pass.jumpProgress = 0
  pass.jumpHeight = 0
  pass.jumpRoll = 0
  pass.jumpRollSign = pass.rngState & 1 ? 1 : -1 // 시드에서 뽑아 rand 순서를 건드리지 않는다
  pass.jumpTakeoffMs = pass.elapsedMs
  pass.jumpTakeoffX = pass.x
  pass.jumpTakeoffZ = pass.z
  pass.blockedSec = 0
  pass.solid = false // 공중에서는 프랍과 부딪히지 않는다(넘어간다)
  return true
}

// 공중 substep: 뛰기 직전 방향 그대로 주행 속도로 직진, 높이·회전만 진행도에 따라. 장애물·핸들·발작 없음.
function airSlteraSubstep(pass, h) {
  pass.jumpSec += h
  const p = pass.jumpSec >= SLTERA_JUMP_AIR_SEC ? 1 : pass.jumpSec / SLTERA_JUMP_AIR_SEC
  pass.x += Math.sin(pass.heading) * SLTERA_SPEED * h
  pass.z += Math.cos(pass.heading) * SLTERA_SPEED * h
  pass.distance += SLTERA_SPEED * h
  pass.jumpProgress = p
  pass.jumpHeight = getSlteraJumpHeight(p)
  pass.jumpRoll = getSlteraJumpRoll(p)
  pass.progress = (pass.x - pass.entryX) * pass.dirX + (pass.z - pass.entryZ) * pass.dirZ
  while (pass.waypoint < pass.waypointCount && pass.progress >= pass.wpU[pass.waypoint]) pass.waypoint += 1
  if (p >= 1) landSltera(pass)
}

// 착지: 똑바로(2π) 내려앉고 쿵을 걸어 둔다. 핸들 떨림·발작 일정은 체공 시간만큼 미뤄 차 방향이 착지 순간 튀지 않게 한다.
function landSltera(pass) {
  const airSec = pass.jumpSec
  pass.airborne = false
  pass.jumpState = SLTERA_JUMP_STATE.LANDED
  pass.jumpProgress = 1
  pass.jumpHeight = 0
  pass.jumpRoll = SLTERA_JUMP_ROLL_RAD
  pass.landedMs = pass.elapsedMs
  pass.landingThudPending = true
  pass.wobblePhase -= pass.wobbleRadPerSec * airSec
  for (let i = pass.jerk; i < pass.jerkCount; i += 1) pass.jerkAt[i] += airSec
  // 착지 자리가 프랍과 겹칠 수 있다 — 출발 때처럼 화면 안에서 안 겹친 뒤부터 다시 부딪힌다(solid는 뛸 때 이미 false).
  pass.anchorX = pass.x
  pass.anchorZ = pass.z
  pass.anchorMs = pass.elapsedMs
}

/**
 * 착지 쿵 소리. 착지한 뒤 한 번만 true — 치기 쿵과 같은 150ms 간격 제한(claimSlteraThud)을 거친다(막히면 다음 프레임에 다시).
 * nowMs = 런 시계(ms).
 */
export function consumeSlteraLandingThud(pass, nowMs) {
  if (!pass.landingThudPending) return false
  if (!claimSlteraThud(pass, nowMs)) return false
  pass.landingThudPending = false
  return true
}

function driveSlteraSubstep(pass, h) {
  pass.elapsedMs += h * 1000
  if (pass.airborne) {
    airSlteraSubstep(pass, h)
    return
  }
  const t = pass.elapsedMs / 1000
  const beforeX = pass.x
  const beforeZ = pass.z
  const beforeHeading = pass.heading
  if (pass.bounceLeftSec > 0) {
    const done = bounceSlteraSubstep(pass, h, t)
    collideSlteraWithObstacles(pass, h, beforeX, beforeZ, beforeHeading)
    if (done) {
      replanSlteraAfterBounce(pass)
      if (pass.escapePending) {
        pass.escapePending = false
        startSlteraExit(pass)
      }
    }
    if (!pass.brokeThrough) watchSlteraWedge(pass)
    return
  }
  if (!pass.exiting && pass.bounces > 0 && pass.elapsedMs >= SLTERA_EXIT_MODE_SEC * 1000) startSlteraExit(pass)
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
  collideSlteraWithObstacles(pass, h, beforeX, beforeZ, beforeHeading)
  if (!pass.brokeThrough) watchSlteraWedge(pass)
  if (pass.bounceLeftSec > 0) return // 방금 부딪혔다 — 끝 판정은 튕김 뒤 새 경로로
  pass.progress = (pass.x - pass.entryX) * pass.dirX + (pass.z - pass.entryZ) * pass.dirZ
  while (pass.waypoint < pass.waypointCount && pass.progress >= pass.wpU[pass.waypoint]) pass.waypoint += 1
  if (tryStartSlteraJump(pass, h)) return // 차 전체가 화면 안 — 끝날 리 없다
  // 끝: 도착점을 지났고 차 전체가 화면 밖일 때만. 도착점을 4u 넘게 지나도 아직 보이면(화면 가장자리를 따라
  // 비스듬히 가는 중) 사라지지 않고 계속 달린다 — 사선 ±87° 안으로만 가므로 결국 화면을 벗어난다.
  // 최종 안전장치 SLTERA_MAX_PASS_SEC(정상 질주는 닿지 않는다).
  const offScreen = !isSlteraPointOnScreen(pass.view, pass.x, pass.z, -SLTERA_OFFSCREEN_PAD)
  if (pass.progress >= pass.length && offScreen) pass.phase = SLTERA_PHASE.DONE
  else if (!(pass.progress < pass.length + SLTERA_EXIT_OVERRUN) && offScreen) pass.phase = SLTERA_PHASE.DONE
  else if (!(pass.elapsedMs < SLTERA_MAX_PASS_SEC * 1000)) pass.phase = SLTERA_PHASE.DONE
}

/**
 * dtMs만큼 진행. 반환 = 현재 단계. swept=true면 (prevX,prevZ)→(x,z)가 이번 step에 쓸고 간 구간이다.
 * step 끝에 차가 공중이면 swept=false — 그 step은 좀비 치기·로자리 피격이 없다(착지한 step부터 다시 판정).
 * playerX/Z(선택) = 지금 로자리 위치 — 장애물에 튕겨 경로를 다시 깔 때 로자리 근처 경유점을 비키는 데만 쓴다.
 * screen(선택) = 지금 화면이 보는 바닥 — 등장 점프를 화면에 보이는 자리에서 뛰게 한다(없으면 출발 순간 화면).
 */
export function stepSlteraPass(pass, dtMs, playerX = NaN, playerZ = NaN, screen = null) {
  pass.swept = false
  if (pass.phase === SLTERA_PHASE.DONE) return pass.phase
  if (Number.isFinite(playerX) && Number.isFinite(playerZ)) {
    pass.playerX = playerX
    pass.playerZ = playerZ
  }
  pass.jumpView = screen || pass.view
  let left = Math.max(0, Number.isFinite(dtMs) ? dtMs : 0) / 1000
  pass.prevX = pass.x
  pass.prevZ = pass.z
  while (left > 1e-9 && pass.phase !== SLTERA_PHASE.DONE) {
    const h = Math.min(left, SUBSTEP_SEC)
    left -= h
    driveSlteraSubstep(pass, h)
  }
  pass.swept = !pass.airborne
  return pass.phase
}

/** 지금 차체 판정박스(OBB). out = { centerX, centerZ, yaw, halfWidth, halfDepth } — isPointInOrientedBox2D 규약. */
export function getSlteraBodyBox(pass, out) {
  out.centerX = pass.x
  out.centerZ = pass.z
  out.yaw = pass.heading
  out.halfWidth = SLTERA_HALF_WIDTH
  out.halfDepth = SLTERA_HALF_LENGTH
  return out
}

/** 차체 판정박스가 장애물 하나와 겹치는 깊이(u, 0 = 안 겹침). 테스트·진단용. */
export function getSlteraObstacleOverlap(pass, obstacle) {
  return slteraObstacleOverlap(pass.x, pass.z, pass.heading, obstacle, _contact)
}

/**
 * 이번 프레임 쓸고 간 판정박스 — 차체 OBB(보는 방향으로 회전)를 이번 step 이동만큼 차체 축으로 늘린 상자.
 * 앞으로 달릴 땐 길이 쪽으로, 튕겨 밀리거나 비스듬히 미끄러질 땐 그만큼 폭 쪽으로도 늘어난다.
 * out = { centerX, centerZ, yaw, halfWidth, halfDepth }.
 * screen(선택) = 지금 화면 범위 — 주면 차 중심이 화면이 보는 바닥 밖일 때 false(치기 판정 생략).
 */
export function getSlteraSweepBox(pass, out, screen = null) {
  const dx = pass.x - pass.prevX
  const dz = pass.z - pass.prevZ
  const fx = Math.sin(pass.heading)
  const fz = Math.cos(pass.heading)
  out.centerX = (pass.x + pass.prevX) / 2
  out.centerZ = (pass.z + pass.prevZ) / 2
  out.yaw = pass.heading // isPointInOrientedBox2D: halfDepth 축 = (sin yaw, cos yaw)
  out.halfWidth = SLTERA_HALF_WIDTH + Math.abs(dx * fz - dz * fx) / 2
  out.halfDepth = SLTERA_HALF_LENGTH + Math.abs(dx * fx + dz * fz) / 2
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

/** 이 적을 이번 질주에서 이미 굴렸나(치기 성공·실패 모두). 다시 닿으면 밀려나기만 한다. */
export function hasSlteraRolled(pass, index, generation, special) {
  return special ? pass.rolledSpecial.has(special) : pass.rolledPool.has(index * 65536 + (generation ?? 0))
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

// ── 치여 날아가기·단단한 차체(11-14 Terry) ─────────────────────────────────────────
// "슬테라에 치인 주인공이나 좀비는 물리 먹고 치이면서 뒤로 날아가야 한다", "슬테라랑 겹치는 일 없어".
//   차체 판정박스는 단단하다: 땅 위의 차와 닿은 좀비·로자리는 같은 step에 판정박스 바깥(최소 침투 면 법선 쪽)으로
//   밀려나고(pushOutOfSlteraBody), 그 뒤 날아간다. 공중 점프 중인 차만 예외(위로 넘어간다).
//   날아가는 방향 = 차가 실제로 움직인 방향과 밀려난 면 법선을 섞은 쪽(늘 차에서 멀어지는 쪽, getSlteraLaunchDirInto).
//   거리는 그 방향으로 프랍·플레이필드·탈출구 흡입 원에 닿기 전까지로 줄인다(planSlteraLaunchDistance) — 착지점은 늘
//   플레이필드 안·프랍 밖이고, 차 박스 바깥에서 바깥쪽으로 출발하므로 지금 차 박스 안에도 안 떨어진다.
//   수평 이동은 기존 넉백 경로(풀 좀비 applyHitIndex 넉백 속도·시간, 특수 적 _enemyHit 넉백, 로자리 _applyKnockback)를
//   그대로 쓴다 — 매 step 기존 프랍·경계 충돌이 함께 막는다. 높이(포물선)는 비주얼 높이만 올린다.
//   좀비(치기 굴림 65% 성공): 3.2u를 0.55초에 날아가며 꼭대기 1.2u, 피해 60은 착지 순간에 들어간다 — 죽는 좀비도 날아간
//     뒤 착지 자리에서 부서진다. 굴림 실패(35%): 피해 없이 1u 밀쳐지며 0.25u 들썩(차가 무리를 헤치고 지나가 보이게).
//   보스: 무겁다 — 피해 20(굴림 그대로)에 0.3u만 밀리고 뜨지 않는다. 차가 보스를 장애물처럼 들이받고 튕긴다.
//   특수 적(물리 몸체가 따로 있는 적): 차가 들이받고 튕기며, 치기 성공이면 기존 넉백 경로로 좀비만큼 수평으로 밀린다.
//   로자리: 질주당 첫 접촉에 2u를 0.4초 동안 날아가며 꼭대기 0.8u — 그동안 조작 정지·차에 다시 맞지 않는다. 피해 규칙
//     그대로(최대 HP 15%, 질주당 1회, 무적이면 무시). 뒤이은 접촉은 피해·비행 없이 밀려나기만 한다.
export const SLTERA_LAUNCH_HEADING_WEIGHT = 0.6
export const SLTERA_LAUNCH_MIN_AWAY = 0.3 // 섞은 방향이 면 법선과 이만큼도 안 맞으면 법선 쪽으로 날린다
export const SLTERA_ZOMBIE_LAUNCH_DISTANCE = 3.2
export const SLTERA_ZOMBIE_LAUNCH_SEC = 0.55
export const SLTERA_ZOMBIE_LAUNCH_PEAK = 1.2
export const SLTERA_SHOVE_DISTANCE = 1
export const SLTERA_SHOVE_SEC = 0.25
export const SLTERA_SHOVE_PEAK = 0.25
export const SLTERA_BOSS_SHOVE_DISTANCE = 0.3
export const SLTERA_BOSS_SHOVE_SEC = 0.2
export const SLTERA_PLAYER_LAUNCH_DISTANCE = 2
export const SLTERA_PLAYER_LAUNCH_SEC = 0.4
export const SLTERA_PLAYER_LAUNCH_PEAK = 0.8
export const SLTERA_ZOMBIE_RADIUS = 0.28 // 풀 좀비 몸통 반경(E01 접촉 거리)
export const SLTERA_SPECIAL_RADIUS = 0.45 // 물리 몸체 특수 적
export const SLTERA_BOSS_RADIUS = 0.8
export const SLTERA_PORTAL_AVOID_RADIUS = 1.5 // 탈출구 링 반경 — 흡입 원(0.6u)보다 넉넉히 비켜 날린다
export const SLTERA_PUSH_SKIN = 0.02
const LAUNCH_PLAN_STEP = 0.1

/**
 * 원(x,z,radius)이 땅 위 차체 판정박스와 겹치면 박스 바깥(최소 침투 면, 반경+여유만큼)으로 민 자리를 out.x/z에,
 * 그 면 법선을 out.nx/nz에 넣고 true. 안 겹치면 out.x/z = 그대로, 법선 = 차에서 그 점 쪽 면, false.
 */
export function pushOutOfSlteraBody(pass, x, z, radius, out) {
  const fx = Math.sin(pass.heading); const fz = Math.cos(pass.heading)
  const rx = fz; const rz = -fx
  const dx = x - pass.x; const dz = z - pass.z
  const lw = dx * rx + dz * rz // 옆(폭) 축
  const ll = dx * fx + dz * fz // 앞뒤(길이) 축
  const ew = SLTERA_HALF_WIDTH + radius
  const el = SLTERA_HALF_LENGTH + radius
  const sideGap = ew - Math.abs(lw)
  const endGap = el - Math.abs(ll)
  const sideward = sideGap / ew < endGap / el
  const sw = lw < 0 ? -1 : 1
  const sl = ll < 0 ? -1 : 1
  out.nx = sideward ? rx * sw : fx * sl
  out.nz = sideward ? rz * sw : fz * sl
  out.x = x
  out.z = z
  if (!(sideGap > 0 && endGap > 0)) return false
  const nw = sideward ? sw * (ew + SLTERA_PUSH_SKIN) : lw
  const nl = sideward ? ll : sl * (el + SLTERA_PUSH_SKIN)
  out.x = pass.x + rx * nw + fx * nl
  out.z = pass.z + rz * nw + fz * nl
  return true
}

/** 원(x,z,radius)이 차체 판정박스와 겹치나(원-OBB 최근접점). 테스트·진단용. */
export function isCircleInSlteraBody(pass, x, z, radius) {
  const fx = Math.sin(pass.heading); const fz = Math.cos(pass.heading)
  const dx = x - pass.x; const dz = z - pass.z
  const lw = dx * fz - dz * fx
  const ll = dx * fx + dz * fz
  const cw = lw - clampAbs(lw, SLTERA_HALF_WIDTH)
  const cl = ll - clampAbs(ll, SLTERA_HALF_LENGTH)
  return cw * cw + cl * cl < radius * radius - 1e-9
}

/** 날아가는 방향(단위벡터 out.x/z): 차가 이번 step 실제로 움직인 방향(없으면 보는 방향)과 면 법선(nx,nz)을 섞는다. */
export function getSlteraLaunchDirInto(pass, nx, nz, out) {
  let mx = pass.x - pass.prevX; let mz = pass.z - pass.prevZ
  const ml = Math.hypot(mx, mz)
  if (ml > 1e-6) { mx /= ml; mz /= ml } else { mx = Math.sin(pass.heading); mz = Math.cos(pass.heading) }
  let x = mx * SLTERA_LAUNCH_HEADING_WEIGHT + nx * (1 - SLTERA_LAUNCH_HEADING_WEIGHT)
  let z = mz * SLTERA_LAUNCH_HEADING_WEIGHT + nz * (1 - SLTERA_LAUNCH_HEADING_WEIGHT)
  const l = Math.hypot(x, z)
  if (l < 1e-6 || (x * nx + z * nz) / l < SLTERA_LAUNCH_MIN_AWAY) { x = nx; z = nz } else { x /= l; z /= l }
  out.x = x
  out.z = z
  return out
}

function circleHitsObstacle(x, z, radius, o) {
  if (!o || !Number.isFinite(o.x) || !Number.isFinite(o.z)) return false
  const dx = x - o.x; const dz = z - o.z
  const c = obstacleCos(o); const s = obstacleSin(o)
  const lx = dx * c - dz * s
  const lz = dx * s + dz * c
  const px = lx - clampAbs(lx, o.halfX)
  const pz = lz - clampAbs(lz, o.halfZ)
  return px * px + pz * pz < radius * radius
}

/**
 * (x,z)에서 (dirX,dirZ)로 distance만큼 날릴 때, 반경 radius 몸이 프랍(obstacles)·플레이필드(bounds: minX..maxZ)·
 * 피할 원(avoid: {active,x,z}, SLTERA_PORTAL_AVOID_RADIUS)에 닿기 직전까지로 줄인 거리. 0.1u 단위로 걸어 본다.
 */
export function planSlteraLaunchDistance(x, z, dirX, dirZ, distance, radius, obstacles = null, bounds = null, avoid = null) {
  const avoidOn = !!avoid?.active && Number.isFinite(avoid.x) && Number.isFinite(avoid.z)
  const avoidR = SLTERA_PORTAL_AVOID_RADIUS + radius
  let ok = 0
  for (let d = LAUNCH_PLAN_STEP; d <= distance + 1e-9; d += LAUNCH_PLAN_STEP) {
    const px = x + dirX * d; const pz = z + dirZ * d
    if (bounds && (px - radius < bounds.minX || px + radius > bounds.maxX || pz - radius < bounds.minZ || pz + radius > bounds.maxZ)) break
    if (avoidOn && Math.hypot(px - avoid.x, pz - avoid.z) < avoidR) break
    let blocked = false
    if (obstacles) for (let i = 0; i < obstacles.length; i += 1) if (circleHitsObstacle(px, pz, radius, obstacles[i])) { blocked = true; break }
    if (blocked) break
    ok = d
  }
  return Math.min(ok, distance)
}

/** 날아가는 포물선 높이: 진행도 p(0..1), 꼭대기 peak. 처음·끝 0. */
export function getSlteraLaunchHeight(p, peak) {
  if (!(p > 0) || p >= 1) return 0
  return 4 * peak * p * (1 - p)
}

/** 땅 위(공중 점프 중 아님) 차체가 지금 몸을 밀어낼 수 있나. */
export function isSlteraBodySolid(pass) {
  return pass.phase !== SLTERA_PHASE.DONE && !pass.airborne
}

/**
 * 물리 몸체(보스·특수 적, 반경 radius)와 겹친 땅 위 차를 장애물처럼 밀어내고, 그 몸 쪽으로 달려들었으면 튕긴다
 * (아직 안 뛰었고 차 전체가 보이면 튕기지 않고 그 자리에서 뛰어 넘는다). 겹쳤으면 true.
 */
export function bumpSlteraOffBody(pass, bx, bz, radius) {
  if (!isSlteraBodySolid(pass)) return false
  const contact = _bodyContact
  if (!pushOutOfSlteraBody(pass, bx, bz, radius, contact)) return false
  // 몸이 아니라 차를 반대로 민다: 몸이 박스 밖 자리로 간 만큼 차가 거꾸로 물러난다.
  pass.x -= contact.x - bx
  pass.z -= contact.z - bz
  const nx = -contact.nx; const nz = -contact.nz // 몸 → 차 쪽 법선
  if (pass.bounceLeftSec > 0) return true
  const approach = Math.sin(pass.heading) * nx + Math.cos(pass.heading) * nz
  if (approach < -SLTERA_BOUNCE_MIN_APPROACH) {
    if (pass.jumpState === SLTERA_JUMP_STATE.READY && isSlteraCarOnScreen(pass.jumpView || pass.view, pass.x, pass.z, pass.heading)) {
      pass.jumpUrgent = true
    } else if (pass.obstacles && pass.bounces < SLTERA_MAX_BOUNCES && !pass.exiting && !pass.brokeThrough) {
      pass.contactNX = nx
      pass.contactNZ = nz
      startSlteraBounce(pass, nx, nz)
    }
  }
  return true
}
const _bodyContact = { x: 0, z: 0, nx: 0, nz: 0 }

// 풀 좀비 비행 표(SlteraEvent가 판마다 하나). 할당은 만들 때 한 번 — 매 프레임 0.
export const SLTERA_LAUNCH_CAPACITY = 64

export function createSlteraLaunchTable(capacity = SLTERA_LAUNCH_CAPACITY) {
  return {
    count: 0,
    index: new Int32Array(capacity),
    generation: new Int32Array(capacity),
    baseY: new Float32Array(capacity),
    elapsed: new Float32Array(capacity),
    sec: new Float32Array(capacity),
    peak: new Float32Array(capacity),
    damage: new Float32Array(capacity), // 착지 때 줄 피해(0 = 밀치기)
    height: new Float32Array(capacity), // 이번 step 높이(비주얼)
    done: new Uint8Array(capacity),
  }
}

/** 비행 하나를 건다(같은 좀비가 이미 날고 있으면 그 칸을 새로 쓴다). 표가 가득 차면 -1(호출측이 피해를 바로 준다). */
export function addSlteraLaunch(table, index, generation, baseY, sec, peak, damage) {
  let slot = -1
  for (let i = 0; i < table.count; i += 1) if (table.index[i] === index) { slot = i; break }
  if (slot < 0) {
    if (table.count >= table.index.length) return -1
    slot = table.count
    table.count += 1
  } else if (table.generation[slot] === generation) {
    baseY = table.baseY[slot] // 날던 중이면 원래 바닥 높이를 지킨다
    damage = Math.max(damage, table.damage[slot])
  }
  table.index[slot] = index
  table.generation[slot] = generation
  table.baseY[slot] = baseY
  table.elapsed[slot] = 0
  table.sec[slot] = sec
  table.peak[slot] = peak
  table.damage[slot] = damage
  table.height[slot] = 0
  table.done[slot] = 0
  return slot
}

/** 모든 비행을 dt만큼 진행: height(포물선)·done(착지)을 채운다. */
export function stepSlteraLaunchTable(table, dtSec) {
  for (let i = 0; i < table.count; i += 1) {
    table.elapsed[i] += dtSec
    const p = table.sec[i] > 0 ? table.elapsed[i] / table.sec[i] : 1
    table.height[i] = getSlteraLaunchHeight(p, table.peak[i])
    table.done[i] = p >= 1 ? 1 : 0
  }
}

/** i번째 비행을 지운다(마지막 칸을 당겨 채운다 — 뒤에서부터 돌며 지울 것). */
export function removeSlteraLaunchAt(table, i) {
  const last = table.count - 1
  if (i !== last) {
    table.index[i] = table.index[last]
    table.generation[i] = table.generation[last]
    table.baseY[i] = table.baseY[last]
    table.elapsed[i] = table.elapsed[last]
    table.sec[i] = table.sec[last]
    table.peak[i] = table.peak[last]
    table.damage[i] = table.damage[last]
    table.height[i] = table.height[last]
    table.done[i] = table.done[last]
  }
  table.count = Math.max(0, last)
}

// 로자리 비행 상태(모듈 하나 — 로자리는 한 명). SlteraEvent가 걸고, Player.jsx가 자기 고정 step에서 시간을 흘리며
// 비주얼 높이·조작 정지(넉백)를 쓴다. Player가 내려가면(판 끝) 초기화한다.
export const slteraPlayerLaunch = { active: false, elapsed: 0, sec: 0, peak: 0, vx: 0, vz: 0, body: null }

export function startSlteraPlayerLaunch(state, dirX, dirZ, distance, sec = SLTERA_PLAYER_LAUNCH_SEC, peak = SLTERA_PLAYER_LAUNCH_PEAK) {
  state.active = true
  state.elapsed = 0
  state.sec = sec
  state.peak = peak
  state.vx = sec > 0 ? (dirX * distance) / sec : 0
  state.vz = sec > 0 ? (dirZ * distance) / sec : 0
  return state
}

/** 로자리 비행 시간을 흘린다. 반환 = 지금 비주얼 높이(u). 착지하면 active=false(조작 복귀). */
export function stepSlteraPlayerLaunch(state, dtSec) {
  if (!state.active) return 0
  state.elapsed += dtSec
  const p = state.sec > 0 ? state.elapsed / state.sec : 1
  if (p >= 1) { state.active = false; return 0 }
  return getSlteraLaunchHeight(p, state.peak)
}

export function getSlteraPlayerLaunchHeight(state) {
  if (!state.active) return 0
  return getSlteraLaunchHeight(state.sec > 0 ? state.elapsed / state.sec : 1, state.peak)
}

export function resetSlteraPlayerLaunch(state) {
  state.active = false
  state.elapsed = 0
  state.sec = 0
  state.peak = 0
  state.vx = 0
  state.vz = 0
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

// 자연 질주가 탈출구·마틸다 예고(getSlteraDeadlineMs)와 겹치지 않게 비우는 간격. 세로 화면 질주 최대보다 길게:
// 11-13(크기 7/15·속도 1.5배·장애물 튕김) 실제 S1~S6 프랍 위 질주 최대 ≈9.8초(S6 운동장 프랍 포함 2,400회 프로브, 튕긴 질주는 7초부터
// 퇴장 모드 — SLTERA_EXIT_MODE_SEC). 장애물 없는 질주는 ≈8초 이하. slteraEvent.test.js가 12초 미만을 지킨다.
// balanceqa 11-08: 3번째 질주(185~195초 시작)가 205초 예고와 겹칠 수 있었다.
export const SLTERA_DEADLINE_CLEAR_MS = 12_000

/** 이 시각에 시작하는 자연 질주를 달려도 되나 — 예고 시각 앞뒤 12초 안이면 false(건너뜀). */
export function isSlteraNaturalStartAllowed(stageId, startMs) {
  const deadline = getSlteraDeadlineMs(stageId)
  return !(startMs > deadline - SLTERA_DEADLINE_CLEAR_MS && startMs < deadline + SLTERA_DEADLINE_CLEAR_MS)
}
