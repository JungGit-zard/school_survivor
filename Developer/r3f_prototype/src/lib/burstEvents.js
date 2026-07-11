// 버스트(일회성) 스폰 이벤트 정본 — 순수 데이터, 3D import 없음(2026-07-10 분리).
// 어드민이 3D 체인 없이 읽고, waveTimelines/게임 로직이 보스 구간을 파생하는 단일 소스.
//
// 보스 엔티티 등장(B01/B02)도 여기 버스트로 정의된다 = 보스 등장 시각의 단일 소스.
// '보스 구간(bossPhase)'은 이 등장 시각에서 파생한다 — 어디에도 하드코딩하지 않는다.

// 보스 버스트 타입. 등장 시각 파생의 기준.
const BOSS_BURST_TYPES = ['B01', 'B02']

// 4분 타임라인. 5분 기준 sec ×0.8.
export const BURST_EVENTS = [
  { sec:   0, type: 'E01', count: 16 },  // 40초 전 단일 좀비 구간 밀도 2배
  { sec:  24, type: 'E01', count:  8 },  // 첫 phase target(24)을 burst만으로 초과하지 않게 완화
  { sec:  60, type: 'E02', count:  4 },  // 탱커 첫 등장 신호 — wave 첫 E02 phase와 정렬
  { sec:  72, type: 'E03', count:  2 },  // 러너 압박 — 6→2 (E03 전 구간 ×1/3, 2026-07-04)
  { sec: 108, type: 'E01', count:  5 },  // 90–108초 완화 구간 이후 잡몹 러시
  { sec: 108, type: 'E02', count:  3 },
  { sec: 120, type: 'E05', count:  3 },  // 돌진 첫 등장 (E04 탄환형 폐기 — 2026-05-09)
  { sec: 144, type: 'E05', count:  3 },  // 돌진 압박 강화
  { sec: 168, type: 'E06', count:  1 },  // 거대 첫 등장
  { sec: 184, type: 'E01', count:  5 },  // 마지막 러시 (보스 직전) — 과부하 완화
  { sec: 184, type: 'E02', count:  3 },
  { sec: 184, type: 'E05', count:  2 },
  { sec: 120, type: 'B01', count:  1 },  // 보스 등장 (2:00) — 보스 구간 파생 기준
  { sec: 216, type: 'E05', count:  3 },
]

// 4분 타임라인. 5분 기준 sec ×0.8.
export const STAGE2_BURST_EVENTS = [
  { sec:   0, type: 'E01', count: 10 },
  { sec:  24, type: 'E03', count:  4 },
  { sec:  48, type: 'E02', count:  3 },
  { sec:  72, type: 'E04', count:  1 },
  { sec: 120, type: 'E05', count:  2 },
  { sec: 144, type: 'E05', count:  2 },
  { sec: 168, type: 'E06', count:  1 },
  { sec: 120, type: 'B02', count:  1 },  // 보스 등장 (2:00) — 보스 구간 파생 기준
  { sec: 216, type: 'E05', count:  3 },
  { sec: 216, type: 'E04', count:  1 },
  // ── 형태(formation) 버스트 (2026-07-10) — 균일 압력을 깨는 스파이크→이완 비트.
  // 유지 루프가 총원을 target과 비교하므로 형태로 채운 만큼 자동으로 덜 스폰된다(의도).
  // E04/보스와 시각 겹치지 않게 배치. 예고 정본은 waveTimelines.STAGE2_SPAWN_TELEGRAPHS.
  { sec:  30, type: 'E01', count:  6, formation: 'swarm' },   // 초반 단조 구간 깨기
  { sec:  60, type: 'E03', count:  5, formation: 'ring' },    // 러너 포위
  { sec: 132, type: 'E02', count:  6, formation: 'pincer' },  // 탱커 협공 (120–144 위상)
  { sec: 176, type: 'E05', count:  4, formation: 'swarm' },   // 돌진 무리 (168–192 위상)
]

export function getBurstEventsForStage(stageId) {
  return stageId === 'stage2' ? STAGE2_BURST_EVENTS : BURST_EVENTS
}

// 보스(B01/B02) 등장 시각 — 없으면 Infinity. 보스 구간 파생의 단일 소스.
export function getBossSpawnSec(stageId) {
  const bossSecs = getBurstEventsForStage(stageId)
    .filter((e) => BOSS_BURST_TYPES.includes(e.type))
    .map((e) => e.sec)
  return bossSecs.length > 0 ? Math.min(...bossSecs) : Infinity
}

// 웨이브 시작 시각이 보스 등장 이후면 보스 구간. (하드코딩 시간 없음 — 순수 파생)
export function isBossPhase(startSec, stageId) {
  return startSec >= getBossSpawnSec(stageId)
}
