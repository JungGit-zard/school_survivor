// 스테이지별 좀비 웨이브 타임라인 기본값 정본.
// Enemies.jsx에서 분리(2026-07-04) — 어드민 '스테이지별 웨이브 컨트롤'이
// 3D 컴포넌트 체인 없이 기본 타임라인을 읽을 수 있게 한다.
// 기존 import 경로 호환을 위해 Enemies.jsx가 재수출한다.

const REDUCED_STAGE_ZOMBIE_WEIGHTS = Object.freeze({
  E02: 0.9, // 보라색 탱커 좀비: abb28 기준 개체수 10% 감소
  E03: 0.9, // 녹색 러너 좀비: abb28 기준 개체수 10% 감소
})

function retuneReducedStageZombieWeights(phases) {
  return phases.map((phase) => {
    const weights = phase.weights ?? {}
    let freedWeight = 0
    const nextWeights = {}

    for (const [type, weight] of Object.entries(weights)) {
      const multiplier = REDUCED_STAGE_ZOMBIE_WEIGHTS[type]
      if (Number.isFinite(multiplier)) {
        nextWeights[type] = weight * multiplier
        freedWeight += weight - nextWeights[type]
      } else {
        nextWeights[type] = weight
      }
    }

    if (freedWeight > 0) {
      // E04/E06 같은 시그니처 타입 압력은 건드리지 않고, 줄어든 E02/E03 물량은 기본 잡몹 쪽으로 돌린다.
      const fillerType = weights.E01 ? 'E01' : weights.E05 ? 'E05' : 'E01'
      nextWeights[fillerType] = (nextWeights[fillerType] ?? 0) + freedWeight
    }

    return { ...phase, weights: nextWeights }
  })
}

// 1스테이지는 추격/돌진형만 사용한다 (Bang_Rules 2026-05-09 부록 / stage1_replan §3-2).
// 기존 E04 비중은 추격 압박을 늘리도록 E02/E03/E05로 재분배.
// 4분(240초) 타임라인. 5분 기준에서 전체 ×0.8 비례 축소.
const BASE_WAVE_PHASES = [
  // 0:00–0:40 단일 좀비 구간.
  // 2026-07-26 사용자 요청: 1웨이브 수량 70%(24→17). 이전 서술("E01 밀도 2배")은 더 이상 정확하지 않다.
  { start:   0, end:  40, target: 17, weights: { E01: 1.00 } },
  // ── E03(짙은 녹색 러너) 전 구간 ×1/3 (2026-07-04): 빈 비중은 E01로 이전 ──
  // 0:40–1:00 잡몹+러너 (이동 압박 시작) — 8초→20초로 확장해 전환 체감 부여
  { start:  40, end:  60, target: 22, weights: { E01: 0.97, E03: 0.03 } },
  // 1:00–1:12 +탱커 등장
  { start:  60, end:  72, target: 26, weights: { E01: 0.80, E03: 0.10, E02: 0.10 } },
  // 1:12–1:30 압박 시작 — E02 20%→15% (초보자 첫 사망 구간 완화)
  { start:  72, end:  90, target: 34, weights: { E01: 0.75, E03: 0.10, E02: 0.15 } },
  // 1:30–1:48 완화 구간 (18초로 연장 — 6초는 체감 거의 없음)
  { start:  90, end: 108, target: 15, weights: { E01: 0.75, E03: 0.05, E02: 0.20 } },
  // 1:48–2:00 추격형 밀도 상승
  { start: 108, end: 120, target: 19, weights: { E01: 0.69, E03: 0.06, E02: 0.25 } },
  // 2:00–2:24 돌진 예고 구간 (E05 첫 등장)
  { start: 120, end: 144, target: 24, weights: { E01: 0.60, E03: 0.05, E02: 0.25, E05: 0.10 } },
  // 2:24–2:48 돌진 본격 도입
  { start: 144, end: 168, target: 29, weights: { E01: 0.50, E03: 0.05, E02: 0.30, E05: 0.15 } },
  // 2:48–3:12 +거대 등장 — E06 5%→3% (버스트 +1 포함 최대 4마리 동시 과부하 방지)
  { start: 168, end: 192, target: 34, weights: { E01: 0.47, E03: 0.05, E02: 0.28, E05: 0.17, E06: 0.03 } },
  // 3:12–3:28 후반 구성 1 (잡몹+탱커) — 보스 구간 여부는 등장 시각(2:00)에서 파생
  { start: 192, end: 208, target: 11, weights: { E01: 0.60, E02: 0.40 } },
  // 3:28–3:44 후반 구성 2 (탱커+돌진)
  { start: 208, end: 224, target: 15, weights: { E02: 0.60, E05: 0.40 } },
  // 3:44–4:00 후반 구성 3 — E05 40%→30%, E01 25%로 보스 막판 이동공간 확보
  { start: 224, end: 240, target: 17, weights: { E01: 0.25, E02: 0.45, E05: 0.30 } },
]

// 4분(240초) 타임라인 — 스테이지2 "복도 돌파". 5분 기준에서 전체 ×0.8 비례 축소.
//
// ★ 보스 등장 시각 주의: 정적 STAGE2_BURST_EVENTS의 `sec: 120`은 런타임에서 덮인다.
//   getRuntimeBurstEventsForStage(burstEvents.js)가 보스 이벤트의 sec을 rollBossSpawnSec()
//   = BOSS_SPAWN_CENTER_SEC 180 ± JITTER 10 으로 치환하므로 실제 보스는 170~190초에 나온다.
//   따라서 168~192 phase가 곧 보스 창이다. 이 구간은 bossPressure(Enemies.jsx)로 E04 발사까지
//   막히므로, 잡몹 부하를 여기서 깎으면 보스전이 스테이지에서 가장 헐거운 구간이 된다 — 깎지 말 것.
//
// 톱니 완화 재설계(2026-08-06): 이전 곡선은 저부하 골짜기와 스파이크가 번갈아 나오는 톱니였다
// (구간 HP/s 기준 2배 이상 스윙 5회: 48s ×3.08 / 96s ×4.47 / 168s ×3.62 / 192s ×0.20 / 208s ×2.20).
// 봉우리는 건드리지 않고 골짜기만 메우는 방향으로 재배분해, 인공적인 스윙 2회(96s·208s)를 없앴다.
//   - 72~96s: 7.1/4.7 → 11.7 HP/s. E02 탱커를 조금 섞어 원거리 도입 구간의 공백을 메운다.
//   - 120~168s: 10.6/18.3 → 15.1/23.4 HP/s. 가장 길었던 48초짜리 골짜기(스1 대비 0.49~0.56배)를 없앤다.
//   - 168~192s: 구조값 불변. 보스 창이라 감축 금지. 앞뒤를 올려 상대적 돌출만 ×3.6 → ×2.8로 낮춘다.
//   - 192~208s: 13.5 → 21.3 HP/s. 보스 직후 회수 구간이라 완전히 메우지는 않는다.
// 남은 2배 스윙 3회는 모두 의도된 구조다: 48s ×3.08(E02 탱커 첫 등장, 스1 60s ×2.09와 같은 역할),
// 168s ×2.84(보스 등장 스파이크), 192s ×0.32(보스 처치 후 회수 호흡 — 스1 ×0.25·스3 ×0.26과 동일 관용구).
//
// E04(원거리) weights는 전 구간 그대로 뒀다 — 동시 등장이 getE04Cap(96s 전 1기·이후 2기)으로 하드캡되어
// 비중을 올려도 초과분은 pickTypeByWeightExcluding가 같은 phase의 비-E04 가중치로 되돌리기 때문이다.
// 부하 상승은 전부 E02/E03/E05 쪽에서 만든다.
//
// 주의(정규화 모델, 2026-08-07 갱신): stageExpectedBaseJarmobHp의 30초 격자 모델은 폐기됐다.
// 이제 모든 phase가 길이만큼 반영되므로 "격자에 안 걸리는 구간"이라는 사각지대는 없다
// (72~90과 90~96을 같은 target·weights로 유지하는 건 격자 왜곡 대응이 아니라 단순 연속성 때문이다).
// 총 HP는 STAGE_JARMOB_TOTAL_HP_FACTOR(Enemies.jsx)가 단독 결정하고, 이 타임라인은 배분만 정한다.
// 회귀 방어는 Enemies.test.jsx의 20초 구간 단언("스2의 어떤 구간도 스1의 0.85배 미만이 아니다")이 맡는다.
//
// 2026-08-07 골짜기 재배분: 정규화 교정 후에도 120~168s가 스1 대비 0.77배로 남아 있었다.
// target(마릿수)은 그대로 두고 weights만 무겁게(E03 러너 → E02/E05) 바꿔 1스폰 기대HP를 올렸고,
// 그 재원은 봉우리였던 96~120s(1.7배)의 target 19→17에서 마련했다. 결과: 0~168s 최저 0.91배.
// 또한 stage2가 MID_WAVE_STAGES에 합류해 웨이브 사이 정중앙 보강이 들어온다(Enemies.jsx) —
// 같은 총량을 훨씬 촘촘히 흘리는 것이 "스2가 스1보다 쉽다"의 진짜 해법이었다.
const BASE_STAGE2_WAVE_PHASES = [
  // 0:00–0:24 온보딩 — E01 단일. t=0 웨이브는 ×3 프론트로드(rawWaveSizeForStage)로 오프닝 밀도 확보.
  { start:   0, end:  24, target: 18, weights: { E01: 1.00 } },
  // 0:24–0:48 러너 합류 — 이동 압박 시작. t=30 웨이브도 ×3 프론트로드 대상.
  { start:  24, end:  48, target: 22, weights: { E01: 0.72, E03: 0.28 } },
  // 0:48–1:12 E02 탱커 첫 등장 — 처치지연 도입. 스1 60s 탱커 비트와 같은 의도된 상승 계단.
  { start:  48, end:  72, target: 28, weights: { E01: 0.48, E02: 0.22, E03: 0.30 } },
  // 1:12–1:30 원거리 E04 도입(발사 게이트 72s) — 이전엔 E04 도입에 기대다 부하가 되레 꺼졌다.
  //           E02 0.125를 섞어 원거리 견제 아래에 처치지연 바닥을 얇게 깔아준다.
  { start:  72, end:  90, target: 30, weights: { E01: 0.52, E03: 0.28, E02: 0.125, E04: 0.075 } },
  // 1:30–1:36 위 구간과 동일 구성 — 정규화 격자 t=90 표본이 72~96 전체를 올바르게 대표하게 한다.
  { start:  90, end:  96, target: 30, weights: { E01: 0.52, E03: 0.28, E02: 0.125, E04: 0.075 } },
  // 1:36–2:00 탱커 벽 + E04 캡 2기 승격(96s). 2026-08-07: 여기는 골짜기가 아니라 스1 대비 1.7배 봉우리라
  //           target 19→17로 조금 덜어 120~168s 골짜기 쪽에 배분한다(탱커 벽 구성비는 그대로).
  { start:  96, end: 120, target: 17, weights: { E01: 0.20, E02: 0.65, E04: 0.15 } },
  // 2:00–2:24 차저 E05 도입. 2026-08-07: 스1 대비 0.77배로 남은 마지막 골짜기라 구성을 더 무겁게 했다
  //           (E05 0.22→0.25, E02 0.075→0.11). 마릿수(target)는 그대로 두고 1스폰 기대HP만 +14%.
  //           (보스는 여기가 아니라 170~190초에 나온다 — 파일 상단 주의 참조)
  { start: 120, end: 144, target: 26, weights: { E01: 0.28, E03: 0.24, E05: 0.28, E02: 0.15, E04: 0.05 } },
  // 2:24–2:48 보스 직전 빌드업 — 가벼운 러너 떼(E03)를 더 걷어내고 E05/E02로 무게를 준다.
  //           2026-08-07: 스1 140~160s 대비 0.77배였던 구간. E03 0.42→0.32, E05 0.30→0.35, E02 0.14→0.19로 +14%.
  { start: 144, end: 168, target: 28, weights: { E03: 0.26, E05: 0.38, E02: 0.22, E04: 0.14 } },
  // 2:48–3:12 ★ 보스 창(rollBossSpawnSec 170~190) + 거대 E06 = 스테이지 최대 봉우리.
  //           구조값 불변. bossPressure로 E04 발사가 막히는 구간이라 잡몹 부하를 깎으면 보스전이 헐거워진다.
  { start: 168, end: 192, target: 29, weights: { E02: 0.66, E04: 0.16, E06: 0.18 } },
  // 3:12–3:28 보스 처치 후 회수 호흡 — 급락을 20 HP/s대로 완화하되 완전히 메우지는 않는다(보상 회수 창).
  { start: 192, end: 208, target: 22, weights: { E01: 0.30, E02: 0.44, E05: 0.16, E04: 0.10 } },
  // 3:28–3:44 탱커+차저 — 포탈 개방(210s) 직후 추격 압박.
  { start: 208, end: 224, target: 21, weights: { E02: 0.55, E05: 0.35, E04: 0.10 } },
  // 3:44–4:00 탈출 스프린트 — 마릿수(target)는 불변. 2026-08-07: 스1 마지막 구간(29.8 HP/s)에 비해
  //           0.83배로 처져 있어 러너(E03) 일부를 탱커/차저로 바꿔 1스폰 기대HP만 +8% 올린다.
  { start: 224, end: 240, target: 25, weights: { E02: 0.24, E03: 0.34, E04: 0.12, E05: 0.30 } },
]

// 4분(240초) 타임라인 — 스테이지3 "총력전/혼돈".
// 상승 레버: (a) HP 완화 없음(×1.0, 스2 ×0.8 대비 실효 +25%),
//            (b) E04/E05/E06 조기 도입 + 후반 3축 겹침,
//            (c) 체육교사 B03 단일 보스(burstEvents에서 파생, 정적 135 → 런타임 170~190).
//                (더블 보스 B01+B02는 2026-07-21 폐기 — 로비 카드 광고와 불일치라 단일 B03으로 통일.)
// weights 합 = 1.00. 상승은 마릿수가 아니라 질적 요소(HP·조기도입·동시성·RZL 크루)에서 온다.
// 설계 정본: Developer/agent_room/levelmini_stage3_wave_balance_design_2026-07-11.md §2.
// 재설계(2026-07-18): 발견 C(밀도 절반) 대응 = 오프닝 프론트로드(t=0 ×2, Enemies.jsx) +
// 카이팅 차단 형태(ring/pincer) + ×1.44 실효 HP 전제 곡선. RZL@35/80/120/150 반복 스파이크로 대각 압박 리듬 강화.
// 조기 도입 사슬은 버스트 시간표 재배열 후 E04@40·E05@72·E06@110으로 맞춘다.
// 설계 정본: Planner/stage3_zombie_wave_redesign_2026-07-18.md + 2026-08-17 Stage 1 앵커 재배열 기록.
const BASE_STAGE3_WAVE_PHASES = [
  // 0:00–0:16 도입 — 온보딩 16s 압축. t=0 프론트로드 ×2로 오프닝 밀도 확립. 러너 비중↑ 이동 압박 즉시.
  { start:   0, end:  16, target: 20, weights: { E01: 0.80, E03: 0.20 } },
  // 0:16–0:34 러너 강화 + 탱커 조기 등장(처치지연 시작)
  { start:  16, end:  34, target: 24, weights: { E01: 0.60, E03: 0.22, E02: 0.18 } },
  // 0:34–0:52 원거리 E04 조기 도입(스2는 72s) — 원거리 축 또렷하게(0.14). ring E03×6@44 첫 포위
  { start:  34, end:  52, target: 26, weights: { E01: 0.48, E03: 0.20, E02: 0.18, E04: 0.14 } },
  // 0:52–1:12 차저 E05 조기 도입(스2는 120s) — 4종 동시, RZL 직전 빌드업.
  //           2026-08-07: 60~80s가 스1 대비 0.48배 dead air였다(RZL@80은 아직, @35는 지났다). target 28→32.
  { start:  52, end:  72, target: 38, weights: { E01: 0.40, E03: 0.16, E02: 0.18, E05: 0.16, E04: 0.10 } },
  // 1:12–1:32 RZL 2차 이완 창 — 차저 제거로 앰비언트 이완 → RZL×13@80 대각 횡단이 주역(웨이브가 비켜간다).
  //           2026-08-07: '이완'이 dead air가 되지 않게 E02 비중만 소폭 올린다(차저 없음 원칙은 유지).
  { start:  72, end:  92, target: 26, weights: { E01: 0.40, E03: 0.18, E02: 0.24, E04: 0.18 } },
  // 1:32–1:48 탱커 호흡 — pincer E02×6@92 앞뒤 협공. 거대 직전 리듬 전환
  { start:  92, end: 108, target: 26, weights: { E01: 0.30, E02: 0.42, E05: 0.18, E04: 0.10 } },
  // 1:48–2:12 거대 E06 조기 도입(스2는 168s) — 시그니처 3축 겹침 시작. ring E05×4@120 차저 포위.
  //           2026-08-07: 이 창은 E06@108·ring@112·RZL@120 버스트가 겹쳐 이미 스1의 2.7~3.0배다. target 30→27로 웨이브만 덜어
  //           뒤쪽(보스 구간·탈출 스프린트)에 배분한다.
  { start: 108, end: 132, target: 21, weights: { E01: 0.24, E03: 0.10, E02: 0.22, E05: 0.22, E06: 0.12, E04: 0.10 } },
  // 2:12–2:30 보스 직전 피크 — 최대 복합. E04 cap 3 승격(132). target 30→27(위와 같은 이유 + 스택 과부하 방지)
  { start: 132, end: 150, target: 21, weights: { E01: 0.20, E03: 0.10, E02: 0.20, E05: 0.24, E06: 0.14, E04: 0.12 } },
  // ── 보스: 체육교사 B03 단일(정적 135). 더블 보스 B02+B01은 2026-07-21 폐기됐다(burstEvents.js).
  //    런타임에서는 getRuntimeBurstEventsForStage가 sec을 170~190초로 치환하므로 실제 등장은 그쪽이다. ──
  // 2:30–2:52 보스 구간 1 — 원거리 견제 유지. 2026-08-07: target 16은 스테이지에서 가장 헐거운 구간을 만들었다
  //           (버스트·크루가 앞쪽에 몰려 있어 보스전 중 앰비언트가 사실상 비었다). 22로 올려 보스전 바닥을 깐다.
  { start: 150, end: 172, target: 30, weights: { E01: 0.36, E02: 0.28, E05: 0.18, E04: 0.18 } },
  // 2:52–3:16 보스 구간 2 — pincer E06×2@176 거대 앞뒤 재투입(미조우 바닥). gauntlet 폐기(개방 맵서 통로강제 소멸)
  { start: 172, end: 196, target: 24, weights: { E01: 0.32, E02: 0.34, E05: 0.22, E06: 0.06, E04: 0.06 } },
  // 3:16–3:38 마틸다 접근 — 원거리 제거(가독성) + 차저 비중↓(3중겹침 창 차저 과적 완화).
  //           2026-08-07: 196s 이후는 발화할 버스트가 E05×3@196뿐이라 웨이브가 전부다. target 18→26.
  { start: 196, end: 218, target: 32, weights: { E01: 0.46, E02: 0.34, E05: 0.20 } },
  // 3:38–4:00 탈출 스프린트 — E01 다수로 포탈까지. 차저 경량(마틸다 이미 추격 중).
  //           2026-08-07: 버스트가 전혀 없는 구간이라 스1 대비 0.24배까지 꺼져 있었다. target 22→30.
  { start: 218, end: 240, target: 36, weights: { E01: 0.46, E02: 0.28, E05: 0.18, E04: 0.08 } },
]

// 4분(240초) 타임라인 — 스테이지4 "급식실 대탈출".
// 시그니처 = 원거리 E04 "안전지대 소멸": 조기 도입(~18s) 후 전 구간 상시 고비중(보스 구간에도 유지).
// 상승은 마릿수가 아니라 (a) 원거리 지속 압박, (b) 단일 보스 B04(경고 134/등장 140) 스포트라이트에서 온다.
// 급식실 맵 12×16은 스3(18×18)의 59% 면적 — 실효 밀도가 높아 피크 target을 스3(30) 미만(≤28)으로 억제한다.
//   (참고 밀도: 스1 34/576·스2 30/576·스3 30/1296 → 스4 28/768 = 스3보다 높고 스1/2보단 낮음. 의도된 중간값.)
// 타입 지속(persistence) 원칙 계승(스3): 한 번 등장한 타입은 이후 유지, 조기 도입 사슬 E04@18·E05@30·E06@74.
// 조기 등장 자체는 STAGE4_BURST_EVENTS(E04@18·E05@30·E06@74)가 보장하고, 웨이브 weights는 지속 압박을 담당한다.
// weights 합 = 1.00. 보스@140 이후 잡몹 target 급감(16~20, 보스 집중), 215~240 탈출 스프린트는 E01 다수.
const BASE_STAGE4_WAVE_PHASES = [
  // 0:00–0:12 온보딩 압축(12s) — 러너로 이동 압박 즉시 부여
  { start:   0, end:  12, target: 18, weights: { E01: 0.80, E03: 0.20 } },
  // 0:12–0:30 원거리 E04 + 탱커 E02 합류 — "안전지대 소멸" 시작(원거리 축 또렷하게 0.14)
  { start:  12, end:  30, target: 22, weights: { E01: 0.52, E03: 0.18, E02: 0.16, E04: 0.14 } },
  // 0:30–0:52 차저 E05 조기 도입 — 4종 동시, 원거리 지속
  { start:  30, end:  52, target: 24, weights: { E01: 0.40, E03: 0.16, E02: 0.16, E05: 0.14, E04: 0.14 } },
  // 0:52–1:14 5종 빌드업 — 원거리 고비중 유지
  { start:  52, end:  74, target: 26, weights: { E01: 0.38, E03: 0.14, E02: 0.18, E05: 0.16, E04: 0.14 } },
  // 1:14–1:36 거대 E06 조기 도입 — 시그니처 복합 시작
  { start:  74, end:  96, target: 26, weights: { E01: 0.30, E03: 0.10, E02: 0.20, E05: 0.16, E06: 0.10, E04: 0.14 } },
  // 1:36–1:52 원거리 스파이크 — 러너 후퇴, E04 비중↑(피크 예열)
  { start:  96, end: 112, target: 27, weights: { E01: 0.26, E02: 0.22, E05: 0.20, E06: 0.12, E04: 0.20 } },
  // 1:52–2:08 피크 시작 — 최대 복합(6종). target 28 억제(작은 맵 밀도 상한)
  { start: 112, end: 128, target: 28, weights: { E01: 0.22, E03: 0.08, E02: 0.22, E05: 0.22, E06: 0.12, E04: 0.14 } },
  // 2:08–2:20 보스 직전 피크 정점(경고 134) — 차저 비중↑
  { start: 128, end: 140, target: 28, weights: { E01: 0.20, E03: 0.08, E02: 0.22, E05: 0.24, E06: 0.12, E04: 0.14 } },
  // ── 주방장 보스 B04@140(burstEvents). isBossPhase는 140에서 파생 ──
  // 2:20–2:40 보스 구간 1 — 잡몹 target 급감(보스 집중). 원거리 E04만 고비중 유지 = 시그니처(보스 구간 안전지대 없음)
  { start: 140, end: 160, target: 16, weights: { E01: 0.34, E02: 0.26, E05: 0.18, E04: 0.22 } },
  // 2:40–3:02 보스 구간 2 — 거대 재투입(pincer E06@178 미조우 방어)
  { start: 160, end: 182, target: 18, weights: { E01: 0.30, E02: 0.30, E05: 0.20, E06: 0.06, E04: 0.14 } },
  // 3:02–3:20 보스 구간 3 — 원거리 지속
  { start: 182, end: 200, target: 20, weights: { E01: 0.36, E02: 0.30, E05: 0.20, E04: 0.14 } },
  // 3:20–3:35 마틸다 접근(경고 205) — 원거리 감량(가독성)
  { start: 200, end: 215, target: 18, weights: { E01: 0.46, E02: 0.30, E05: 0.16, E04: 0.08 } },
  // 3:35–4:00 탈출 스프린트 — E01 다수로 포탈까지, 원거리 경량
  { start: 215, end: 240, target: 22, weights: { E01: 0.56, E02: 0.24, E05: 0.14, E04: 0.06 } },
]

export const WAVE_PHASES = retuneReducedStageZombieWeights(BASE_WAVE_PHASES)
export const STAGE2_WAVE_PHASES = retuneReducedStageZombieWeights(BASE_STAGE2_WAVE_PHASES)
export const STAGE3_WAVE_PHASES = retuneReducedStageZombieWeights(BASE_STAGE3_WAVE_PHASES)
export const STAGE4_WAVE_PHASES = retuneReducedStageZombieWeights(BASE_STAGE4_WAVE_PHASES)

export function getDefaultWavePhases(stageId = 'stage1') {
  if (stageId === 'stage2') return STAGE2_WAVE_PHASES
  if (stageId === 'stage3') return STAGE3_WAVE_PHASES
  if (stageId === 'stage4') return STAGE4_WAVE_PHASES
  return WAVE_PHASES
}

// 형태 버스트는 2026-07-11 웨이브 개편에서 stage2 런타임 발화를 중단했다.
// HUD가 실제로 발생하지 않는 공격을 예고하지 않도록 빈 목록을 유지한다.
export const STAGE2_SPAWN_TELEGRAPHS = []

// 스테이지3 형태 버스트 예고 배너 정본. stage2와 달리 stage3는 형태 버스트가 런타임에
// 실제로 발화하므로(getRuntimeBurstEventsForStage에서 되살림) 이 예고는 허위 배너가 아니다.
// sec/label은 STAGE3_BURST_EVENTS의 formation 항목과 정렬. HUD stage3 배선은 uimini 후속.
export const STAGE3_SPAWN_TELEGRAPHS = [
  { sec:  60, leadSec: 2.5, label: '사방에서 포위된다' },      // ring
  { sec: 110, leadSec: 2.5, label: '양쪽에서 조여온다' },      // pincer
  { sec: 120, leadSec: 2.5, label: '돌진 무리가 에워싼다' },   // ring (RZL@144 직전 예열)
  { sec: 184, leadSec: 2.5, label: '거대들이 앞뒤를 막는다' }, // pincer (개편: gauntlet→pincer 개방 맵 대응)
]

// 스테이지4 형태 버스트 예고 배너 정본. stage3처럼 형태 버스트가 런타임에 실제 발화하므로 허위 배너가 아니다.
// sec/label은 STAGE4_BURST_EVENTS의 formation 항목과 1:1 정렬. 급식실 테마 라벨. HUD 배선은 WP3(uimini).
export const STAGE4_SPAWN_TELEGRAPHS = [
  { sec:  40, leadSec: 2.5, label: '배식 줄이 사방을 에워싼다' },   // ring E03
  { sec:  96, leadSec: 2.5, label: '양쪽 배식구에서 조여온다' },   // pincer E02
  { sec: 120, leadSec: 2.5, label: '돌진 무리가 식탁을 넘는다' },   // ring E05 (피크 정점)
  { sec: 178, leadSec: 2.5, label: '거대들이 배식대를 막는다' },   // pincer E06 (보스 구간)
]
