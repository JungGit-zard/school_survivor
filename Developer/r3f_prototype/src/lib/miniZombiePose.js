// 2차 신규 좀비(E89~E106) Kenney Mini 몸체의 절차적 포즈. 2026-11-15, threemini.
//
// 블록 좀비(lib/blockyZombiePose.js)와 같은 6파트·같은 배열 앞 20칸(파트 6 × XYZ + rootRoll + bob)을 쓰고,
// 그 함수로 기본 좀비 걸음(두 팔 앞으로 뻗기·상체 숙임·비틀거림)을 먼저 채운 뒤 종별 예고·공격·회복 포즈만 덮어쓴다.
// 그래서 블록 좀비와 같은 박자·같은 "좀비 문법"으로 걷는다. Kenney 클립(32개)·믹서는 쓰지 않는다.
//
// Kenney Mini 팔은 T자(수평)로 리깅돼 있다. 지오메트리 추출(lib/miniZombieGeometry.js)이 팔을 MINI_ARM_REST_TILT만큼
// 내려 둔 자세를 0으로 삼으므로, 여기 각도의 뜻은 블록 좀비와 같다(팔·다리 X 음수 = 앞, 몸통·머리 X 양수 = 숙임).
// 덧붙인 칸: 20 rootYaw(몸 전체 제자리 회전 — 회전의자), 21 propLift(따로 그리는 소품 높이, Kenney 단위 — 드리블 공),
// 22 propSpin(소품 굴림 각), 23 lift(몸 전체 띄움, Kenney 단위 — 기마전 기수).
// 순수 함수 모듈 — three·React 의존이 없다.
import { fillBlockyZombiePose } from './blockyZombiePose.js'

export const MINI_POSE_SIZE = 24
export const MINI_POSE_ROOT_ROLL = 18
export const MINI_POSE_BOB = 19
export const MINI_POSE_ROOT_YAW = 20
export const MINI_POSE_PROP_LIFT = 21
export const MINI_POSE_PROP_SPIN = 22
export const MINI_POSE_LIFT = 23
export const MINI_POSE_OFFSET = Object.freeze({ legL: 0, legR: 3, torso: 6, armL: 9, armR: 12, head: 15 })
// Kenney Mini는 머리가 몸 절반인 2등신이라, 블록 좀비처럼 고개를 숙이면 게임 카메라(GameCanvas [0,17,17], 45°)에서
// 얼굴이 아니라 머리 꼭대기만 보인다. 모든 자세의 머리 X에서 이만큼 빼서 얼굴을 플레이어 쪽으로 든다(미믹 제외).
export const MINI_HEAD_LIFT = 0.3
// E91 미믹 깡충(초·좀비 로컬 높이). cycle·move는 lib/novelZombie2Behavior.js E91_MIMIC.hopCycleMs/hopMoveMs와 같아야 한다(테스트가 본다).
// 높이 0.32 = 미믹 몸 두께(로컬 ≈ 0.24)보다 조금 높게 — 월드 ≈ 0.12u.
export const MINI_MIMIC_HOP = Object.freeze({ cycle: 0.5, move: 0.3, height: 0.32 })

// 블록 좀비 포즈에 이미 있는 문법은 그대로 넘긴다.
const BLOCKY_STYLES = new Set(['punch', 'kick', 'slam', 'charge', 'tumble', 'throw', 'shoot', 'fan', 'whistle', 'cast', 'blink'])
export const MINI_POSE_STYLES = Object.freeze([
  'command', 'carry', 'mimic', 'whistle', 'stalk', 'mop', 'rope', 'dribble', 'vault', 'eat', 'rattle', 'cling',
  'copier', 'swivel', 'serve', 'roll', 'threeLegged', 'rider', 'horse', 'copierScan',
])

const LEG_L = 0; const LEG_R = 3; const TORSO = 6; const ARM_L = 9; const ARM_R = 12; const HEAD = 15
function set(out, part, x, y, z) { out[part] = x; out[part + 1] = y; out[part + 2] = z }

export function createMiniPose() { return new Float32Array(MINI_POSE_SIZE) }

/**
 * @param out    createMiniPose()
 * @param style  MINI_ZOMBIE_VISUALS[visualId].style (변형에 style이 있으면 그것)
 * @param phase  'normal' | 'warn' | 'charge' | 'stun' (ZombieInstanceLayer.phase — 2차 좀비 상태 8/9/10/4가 warn/charge/stun)
 * @param time   초
 * @param fast   빠른 종
 * @param seed   개체별 위상 0..1
 */
export function fillMiniZombiePose(out, style, phase, time, fast = false, seed = 0) {
  fillBlockyZombiePose(out, BLOCKY_STYLES.has(style) ? style : 'none', phase, time, fast, seed)
  out[MINI_POSE_ROOT_YAW] = 0; out[MINI_POSE_PROP_LIFT] = 0; out[MINI_POSE_PROP_SPIN] = 0; out[MINI_POSE_LIFT] = 0
  const t = time + seed * 3.7
  const warn = phase === 'warn'; const charge = phase === 'charge'; const stun = phase === 'stun'
  switch (style) {
    case 'command': // 반장: "차렷!"(예고) → 손끝으로 돌격 지시(공격) → 꾸벅 인사(회복)
      if (warn) { set(out, TORSO, -0.06, 0, 0); set(out, HEAD, -0.12, 0, 0); set(out, ARM_R, -2.55, 0, -0.75); set(out, ARM_L, 0.05, 0, 0.35); set(out, LEG_L, 0, 0, 0); set(out, LEG_R, 0, 0, 0) }
      else if (charge) { set(out, ARM_R, -1.65, 0.25, 0); set(out, ARM_L, -0.2, 0, 0.2); set(out, TORSO, 0.18, -0.25, 0); set(out, HEAD, -0.05, -0.2, 0) }
      else if (stun) { set(out, TORSO, 0.62, 0, 0); set(out, HEAD, 0.3, 0, 0); set(out, ARM_L, 0.1, 0, 0.3); set(out, ARM_R, 0.1, 0, -0.3) }
      break
    case 'carry': // 숙제 당번: 캐리어를 끌고 다닌다. 줍기(예고) = 허리 굽혀 손 뻗기, 도주(공격 상태) = 뒤돌아 뛰기 자세
      if (!warn && !charge && !stun) set(out, ARM_R, -0.25 + Math.sin(t * 7) * 0.08, 0, 0.05)
      if (warn) { set(out, TORSO, 0.75, 0, 0); set(out, HEAD, 0.2, 0, 0); set(out, ARM_R, -1.3, 0, 0); set(out, ARM_L, -1.1, 0, -0.2) }
      else if (charge) { set(out, TORSO, 0.32, 0, Math.sin(t * 10) * 0.06); set(out, ARM_L, 0.5 + Math.sin(t * 14) * 0.6, 0, 0); set(out, ARM_R, -0.2, 0, 0); set(out, LEG_L, Math.sin(t * 14) * 0.8, 0, 0); set(out, LEG_R, -Math.sin(t * 14) * 0.8, 0, 0) }
      break
    case 'mimic': { // 교과서 미믹: torso = 아래 표지+책장, head = 윗표지(뒤쪽 경첩). X 음수 = 뚜껑이 열린다.
      const peek = (t % 3) < 0.25 ? -0.14 : 0 // 3초마다 살짝 들썩(단서)
      set(out, TORSO, 0, 0, 0); set(out, HEAD, peek, 0, 0)
      out[MINI_POSE_ROOT_ROLL] = 0; out[MINI_POSE_BOB] = 0
      if (warn) { set(out, HEAD, -0.32 + Math.sin(t * 30) * 0.08, 0, 0); out[MINI_POSE_ROOT_ROLL] = Math.sin(t * 24) * 0.04 }
      else if (charge) { set(out, HEAD, -1.05, 0, 0); set(out, TORSO, -0.12, 0, 0); out[MINI_POSE_BOB] = 0.05 }
      else if (stun) {
        // 깨어난 미믹의 깡충 추격(behavior N2_STATE_AWAKE = 회복 상태 번호 → 'stun'). 행동과 같은 박자:
        // 0.5초 주기 중 앞 0.3초만 움직인다(E91_MIMIC hopCycleMs/hopMoveMs) — 그동안 뛰어오르며 뚜껑을 쩍 벌리고,
        // 나머지 0.2초는 바닥에 붙어 뚜껑을 탁 닫는다. time = 행동 시계(MiniZombieLayer가 넘긴다, seed 없이).
        const cycle = ((time % MINI_MIMIC_HOP.cycle) + MINI_MIMIC_HOP.cycle) % MINI_MIMIC_HOP.cycle
        const s = cycle < MINI_MIMIC_HOP.move ? Math.sin(Math.PI * cycle / MINI_MIMIC_HOP.move) : 0
        out[MINI_POSE_BOB] = s * MINI_MIMIC_HOP.height
        set(out, TORSO, -0.22 * s, 0, 0) // 앞(입 쪽)을 들고 뛴다
        set(out, HEAD, s > 0 ? -0.3 - 0.6 * s : -0.06, 0, 0)
        out[MINI_POSE_ROOT_ROLL] = s * 0.08 * (Math.floor(time / MINI_MIMIC_HOP.cycle) % 2 === 0 ? 1 : -1) // 깡충마다 좌우로 갸웃
      }
      break
    }
    case 'stalk': // 그림자밟기: 낮게 웅크려 걷는다(예고 없음 — 따라잡기 상태는 빠른 걸음)
      set(out, TORSO, 0.36, out[TORSO + 1], out[TORSO + 2]); set(out, HEAD, 0.28, out[HEAD + 1], 0)
      if (charge) { set(out, TORSO, 0.55, 0, 0); set(out, ARM_L, -1.6, 0, -0.15); set(out, ARM_R, -1.6, 0, 0.15) }
      break
    case 'mop': // 대걸레: 두 손으로 자루를 쥔다. 예고 = 자루를 뒤로 당김, 공격 = 앞으로 밀어 쓸기
      set(out, ARM_L, -0.95, 0, -0.45); set(out, ARM_R, -0.95, 0, 0.45)
      if (warn) { set(out, TORSO, -0.18, 0, 0); set(out, ARM_L, -0.45, 0, -0.5); set(out, ARM_R, -0.45, 0, 0.5) }
      else if (charge) { set(out, TORSO, 0.5, Math.sin(t * 9) * 0.25, 0); set(out, ARM_L, -1.45, 0, -0.45); set(out, ARM_R, -1.45, 0, 0.45) }
      break
    case 'rope': // 긴줄넘기: 한 손으로 줄 끝. 예고 = 줄을 높이 든다, 공격 = 내려친다
      if (warn) { set(out, ARM_R, -2.9, 0, -0.2); set(out, ARM_L, -2.9, 0, 0.2); set(out, TORSO, -0.12, 0, 0) }
      else if (charge) { set(out, ARM_R, -0.55, 0, 0.2); set(out, ARM_L, -0.55, 0, -0.2); set(out, TORSO, 0.42, 0, 0); set(out, HEAD, 0.25, 0, 0) }
      break
    case 'dribble': { // 드리블: 0.5초 박자로 공이 튄다(전원 같은 박 — seed 없이 time만 쓴다). 4박째 = 높이 튕기기(예고)
      const beat = Math.abs(Math.sin(time * Math.PI * 2))
      set(out, ARM_R, -0.55 - beat * 0.2, 0, 0.1)
      out[MINI_POSE_PROP_LIFT] = 0.02 + beat * 0.16
      out[MINI_POSE_PROP_SPIN] = time * 6
      if (warn) { out[MINI_POSE_PROP_LIFT] = 0.18 + beat * 0.3; set(out, ARM_R, -2.2, 0, 0.1); set(out, TORSO, -0.1, 0, 0) }
      else if (charge) { set(out, TORSO, 0.45, 0, 0); set(out, ARM_R, -1.2, 0, 0.1); out[MINI_POSE_PROP_LIFT] = 0.03 }
      break
    }
    case 'vault': // 뜀틀: 예고 = 깊게 웅크림(팔 뒤로), 공격 = 도약(두 팔 위, 다리 접기)
      if (warn) { set(out, TORSO, 0.6, 0, 0); set(out, HEAD, -0.2, 0, 0); set(out, ARM_L, 0.7, 0, -0.1); set(out, ARM_R, 0.7, 0, 0.1); set(out, LEG_L, -0.45, 0, 0); set(out, LEG_R, 0.35, 0, 0); out[MINI_POSE_BOB] = -0.05 }
      else if (charge) { set(out, TORSO, -0.15, 0, 0); set(out, ARM_L, -2.9, 0, -0.25); set(out, ARM_R, -2.9, 0, 0.25); set(out, LEG_L, -1.0, 0, 0); set(out, LEG_R, -0.8, 0, 0); out[MINI_POSE_BOB] = 0.12 }
      break
    case 'eat': // 대식가(wave 3, 2026-11-16 threemini): 예고 1.0초 = 고개를 젖혀 큰 입(gapingMouth 소품)을 카메라 쪽으로 쩍 벌리고 두 팔을 벌린다
      // (떨림이 점점 커진다 — 곧 들이마신다). 공격 0.4초 = 흡입: 고개를 앞으로 내밀고 두 팔로 끌어당기며 몸이 덜덜 떤다.
      // 회복 1.4초 = 우물우물 씹기: 숟가락을 입으로, 왼손은 배를 두드리고 몸이 씹는 박자로 들썩인다.
      if (warn) {
        set(out, HEAD, -0.62 + Math.sin(t * 22) * 0.05, 0, 0); set(out, TORSO, -0.16, 0, Math.sin(t * 17) * 0.04)
        set(out, ARM_L, -1.25, 0, 1.0); set(out, ARM_R, -1.25, 0, -1.0); set(out, LEG_L, 0.08, 0, 0.06); set(out, LEG_R, -0.08, 0, -0.06); out[MINI_POSE_BOB] = 0.02
      } else if (charge) {
        const shake = Math.sin(t * 58) * 0.07
        set(out, HEAD, 0.38, shake, 0); set(out, TORSO, 0.42, shake * 0.6, 0)
        set(out, ARM_L, -1.75 + Math.sin(t * 31) * 0.25, 0.4, -0.55); set(out, ARM_R, -1.75 - Math.sin(t * 31) * 0.25, -0.4, 0.55)
        set(out, LEG_L, -0.25, 0, 0.1); set(out, LEG_R, 0.25, 0, -0.1); out[MINI_POSE_ROOT_ROLL] = shake * 0.4
      } else if (stun) {
        const chew = Math.sin(t * 14)
        set(out, HEAD, 0.05 + chew * 0.16, 0, chew * 0.05); set(out, TORSO, 0.12, 0, 0)
        set(out, ARM_R, -2.05 + chew * 0.12, 0, -0.35); set(out, ARM_L, -0.45 + Math.abs(chew) * 0.3, 0, -0.55)
        set(out, LEG_L, 0, 0, 0); set(out, LEG_R, 0, 0, 0); out[MINI_POSE_BOB] = Math.abs(chew) * 0.03
      }
      break
    case 'rattle': // 압력밥솥: 예고(김 새는 경고) = 몸이 덜덜, 공격 상태도 같은 떨림
      if (warn || charge) { out[MINI_POSE_ROOT_ROLL] = Math.sin(t * 46) * 0.07; set(out, HEAD, 0.1 + Math.sin(t * 38) * 0.08, Math.sin(t * 29) * 0.1, 0); set(out, ARM_L, -0.6, 0, 0.5); set(out, ARM_R, -0.6, 0, -0.5) }
      break
    case 'cling': // 찹쌀떡: 예고 = 웅크림, 공격 = 두 팔 벌려 덮치기
      if (warn) { set(out, TORSO, 0.65, 0, 0); set(out, ARM_L, 0.4, 0, 0); set(out, ARM_R, 0.4, 0, 0); set(out, LEG_L, -0.3, 0, 0); set(out, LEG_R, 0.3, 0, 0); out[MINI_POSE_BOB] = -0.05 }
      else if (charge) { set(out, TORSO, 0.3, 0, 0); set(out, ARM_L, -2.3, 0, 0.6); set(out, ARM_R, -2.3, 0, -0.6); set(out, LEG_L, 0.6, 0, 0); set(out, LEG_R, 0.6, 0, 0); out[MINI_POSE_BOB] = 0.1 }
      break
    case 'copier': // 복사기: 두 손을 상자 앞에 모은 자세로 걷고, 예고·공격은 부채꼴 휘두르기(블록 'fan' 문법)
      if (!warn && !charge && !stun) { set(out, ARM_L, -1.25, 0, -0.35); set(out, ARM_R, -1.25, 0, 0.35) }
      else if (warn) { set(out, ARM_R, -1.3, 0, 1.15); set(out, TORSO, 0, -0.35, 0.12); set(out, ARM_L, -1.0, 0, -0.3) }
      else if (charge) { set(out, ARM_R, -1.3, 0, -0.9); set(out, TORSO, 0.1, 0.35, -0.15); set(out, ARM_L, -1.0, 0, -0.3) }
      else {
        // 용지 걸림(상태 4, 2.5초 제자리): 복사기 머리가 덜컹덜컹 떨리며 기울고, 상체가 고장 난 듯 처지며 두 팔이 축 늘어진다.
        // (몸 전체 빨간 오류 깜박임은 MiniZombieLayer 인스턴스 색 — lib/novelZombie2Wave3Visuals.js miniInstanceTintInto)
        const rattle = Math.sin(t * 38)
        set(out, TORSO, 0.48, 0, Math.sin(t * 9) * 0.05); set(out, HEAD, 0.32 + rattle * 0.05, Math.sin(t * 27) * 0.12, 0.22 + rattle * 0.1)
        set(out, ARM_L, 0.12, 0, -0.32); set(out, ARM_R, 0.2, 0, 0.28); set(out, LEG_L, 0.05, 0, 0); set(out, LEG_R, -0.05, 0, 0)
        out[MINI_POSE_ROOT_ROLL] = rattle * 0.045; out[MINI_POSE_BOB] = Math.abs(Math.sin(t * 19)) * 0.025
      }
      break
    case 'copierScan': // 복사기 스캔 예고(모드 1, 1.2초 노란 원 — 피해 0): 대상 쪽으로 서서 두 손으로 버튼을 누르고, 머리(스캐너)가
      // 좌우로 훑으며 기계처럼 웅웅 떤다. 부채꼴 예고(팔을 옆으로 크게 젖힘)와 한눈에 다르다.
      set(out, LEG_L, 0, 0, 0); set(out, LEG_R, 0, 0, 0); set(out, TORSO, 0.16, 0, 0)
      if (warn || charge) {
        set(out, ARM_L, -0.85 + Math.sin(t * 12) * 0.12, 0, -0.42); set(out, ARM_R, -0.85 - Math.sin(t * 12) * 0.12, 0, 0.42)
        set(out, HEAD, 0.12, Math.sin(t * 5.2) * 0.38, 0); out[MINI_POSE_ROOT_ROLL] = Math.sin(t * 50) * 0.018; out[MINI_POSE_BOB] = 0
      } else { set(out, ARM_L, -1.25, 0, -0.35); set(out, ARM_R, -1.25, 0, 0.35) }
      break
    case 'swivel': // 회전의자: 앉아 있다(다리 앞으로). 예고 = 제자리 빙글, 공격(활주) = 뒤로 젖혀 팔 벌림, 회복(표류) = 허우적
      set(out, LEG_L, -1.45, 0, 0.05); set(out, LEG_R, -1.45, 0, -0.05); set(out, TORSO, -0.08, 0, 0)
      set(out, ARM_L, -0.95, 0, -0.2); set(out, ARM_R, -0.95, 0, 0.2)
      out[MINI_POSE_BOB] = 0; out[MINI_POSE_ROOT_ROLL] = 0
      if (warn) out[MINI_POSE_ROOT_YAW] = t * 11
      else if (charge) { set(out, TORSO, -0.28, 0, 0); set(out, HEAD, -0.2, 0, 0); set(out, ARM_L, -0.6, 0, 0.9); set(out, ARM_R, -0.6, 0, -0.9) }
      else if (stun) { set(out, ARM_L, -1.2 + Math.sin(t * 12) * 0.5, 0, 0.4); set(out, ARM_R, -1.2 - Math.sin(t * 12) * 0.5, 0, -0.4); out[MINI_POSE_ROOT_YAW] = Math.sin(t * 2) * 0.4 }
      break
    case 'serve': // 커피 셔틀: 오른손에 커피포트. 예고·공격 = 아군에게 따르기
      set(out, ARM_R, -0.85, 0, 0.1)
      if (warn || charge) { set(out, ARM_R, -1.55, 0, -0.65); set(out, TORSO, 0.15, -0.3, 0.1); set(out, HEAD, 0.15, -0.25, 0) }
      break
    case 'roll': // 공굴리기 대장: 두 손으로 큰 공을 민다(공은 RollingBallLayer가 앞 1.2u에 그린다).
      // 예고 1.3초(겨눔) = 뒤로 젖혀 오른발을 뒤로 빼고 힘 모으기(점점 더 젖힌다), 공격 0.6초 = 차기: 오른발을 앞으로 힘껏 차올리고
      // 두 팔은 옆으로 벌려 균형을 잡는다(공은 이미 굴러간다).
      set(out, ARM_L, -1.45, 0, -0.3); set(out, ARM_R, -1.45, 0, 0.3)
      if (warn) {
        set(out, TORSO, -0.26, 0, Math.sin(t * 21) * 0.03); set(out, ARM_L, -0.55, 0, -0.35); set(out, ARM_R, -0.55, 0, 0.35)
        set(out, LEG_R, 0.75, 0, 0); set(out, LEG_L, -0.25, 0, 0); out[MINI_POSE_BOB] = -0.03
      } else if (charge) {
        set(out, TORSO, -0.18, 0, 0); set(out, HEAD, 0.12, 0, 0)
        set(out, LEG_R, -1.45, 0, 0); set(out, LEG_L, 0.22, 0, 0)
        set(out, ARM_L, -0.55, 0, 0.95); set(out, ARM_R, -0.55, 0, -0.95); out[MINI_POSE_BOB] = 0.04
      }
      break
    case 'threeLegged': { // 2인3각: 0.4초 걷고 0.2초 멈추는 박자(짝이 같은 박), 넘어짐(회복) = 옆으로 굴러 눕기
      const cycle = time % 0.6
      if (!warn && !charge && !stun && cycle > 0.4) { set(out, LEG_L, 0, 0, 0); set(out, LEG_R, 0, 0, 0); out[MINI_POSE_BOB] = 0 }
      if (stun) { out[MINI_POSE_ROOT_ROLL] = 1.25; set(out, LEG_L, -0.4, 0, 0); set(out, LEG_R, 0.3, 0, 0) }
      break
    }
    case 'rider': // 기마전 기수: 말 위에 앉아(다리 앞으로·몸 띄움) 모자를 노린다. 예고 = 팔 치켜들기, 공격 = 휘둘러 낚아채기
      set(out, LEG_L, -1.2, 0, -0.2); set(out, LEG_R, -1.2, 0, 0.2); out[MINI_POSE_LIFT] = 0.16; out[MINI_POSE_BOB] *= 0.5
      if (warn) { set(out, ARM_R, -2.7, 0, -0.3); set(out, TORSO, -0.1, -0.3, 0) }
      else if (charge) { set(out, ARM_R, -1.4, 0, -0.9); set(out, TORSO, 0.2, 0.4, -0.1) }
      break
    case 'horse': // 기마전 말: 두 팔을 앞으로 받쳐 기수를 든 자세로 걷는다
      set(out, ARM_L, -1.5, 0, -0.35); set(out, ARM_R, -1.5, 0, 0.35); set(out, TORSO, 0.28, out[TORSO + 1] * 0.5, 0)
      if (charge) set(out, TORSO, 0.45, 0, 0)
      break
    default:
      break
  }
  if (style !== 'mimic') out[HEAD] -= MINI_HEAD_LIFT
  return out
}
