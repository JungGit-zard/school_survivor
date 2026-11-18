// Stage 6 「운동장 최후의 조회」 운동회 순서표(2026-11-19, 지루함 해결 기획서 2번 + 5번).
// 순수 데이터 + 순수 함수만 둔다 — React·오디오·난수·벽시계 없음.
//
// 시계: 스테이지 타임라인과 같은 게임 시계(gameRuntimeTime.getRuntimeElapsedMs() / 1000, stage6 spawnClock
// 'gameplayElapsedSec'). 일시정지·레벨업 카드·대화 중에는 이 시계가 멈추므로 순서표도 멈춘다.
//
// 규칙: 순서표 항목은 "그 시각에 실제로 화면에 나오는 것"만 부른다. 각 항목의 source는 expansionContent.js
// stage6 블록의 실제 행을 가리키고, stage6Programme.test.js가 그 행이 그 시각에 정말 있는지 못박는다.
// 보스 소환(운동장 10바퀴 162·192초)은 보스 생존·광폭화에 따라 시각이 바뀌거나 안 나오므로 순서표에 넣지 않는다.
//
// 오디오 계약(soundmini → src/lib/stage6ProgrammeSfx.js):
//   - 항목 시작 = startSec를 게임 시계가 지나는 순간. getStage6ProgrammeEntriesStartedBetween(prevSec, nowSec)로
//     (prevSec, nowSec] 구간에 시작한 항목을 받는다(HUD 안내 배너와 같은 판정).
//   - 큐 선택은 entry.kind(STAGE6_PROGRAMME_KINDS) 또는 entry.id로 한다.
//   - 축하(함성·꽃가루) 순간 = STAGE6_CELEBRATION_MOMENTS. HUD는 같은 조건으로 꽃가루만 띄운다.
//   - BGM은 멈추거나 무음으로 줄이지 않는다(차임·함성은 위에 얹기만).

export const STAGE6_PROGRAMME_STAGE_ID = 'stage6'

export const STAGE6_PROGRAMME_KINDS = Object.freeze({
  assembly: 'assembly', // 조회 줄 입장(E19 assembly_row)
  guest: 'guest',       // 내빈 입장(E79 학부모회장)
  speech: 'speech',     // 훈화 말씀(H06 고리, 30초마다 — 첫 회차에 한 번만 부른다)
  cheer: 'cheer',       // 응원전(E83 응원단장)
  chief: 'chief',       // 공굴리기(치프 E104)
  parade: 'parade',     // 가장행렬(E73 해적 분장 · E80 축제 부채)
  relay: 'relay',       // 이어달리기(E21 계주 바통)
  boss: 'boss',         // 교장 선생님 말씀(B05)
  cavalry: 'cavalry',   // 기마전(E106)
  closing: 'closing',   // 폐회식 = 정문 개방(portalSec)
})

const K = STAGE6_PROGRAMME_KINDS

// source.kind: 'event'(stage6.events 행 — type과 sec가 같아야 한다) · 'hazard'(H06 firstSec) · 'boss'(bossSec) · 'portal'(portalSec)
const ENTRIES = [
  { id: 'opening',      startSec: 5,   titleKo: '개회식',            titleEn: 'Opening',  kind: K.assembly, source: { kind: 'event', type: 'E19' } },
  { id: 'guests',       startSec: 16,  titleKo: '내빈 입장',         titleEn: 'Guests',     kind: K.guest,    source: { kind: 'event', type: 'E79' } },
  { id: 'speech',       startSec: 30,  titleKo: '훈화 말씀',         titleEn: 'Speech', kind: K.speech,  source: { kind: 'hazard', id: 'H06' } },
  { id: 'cheer',        startSec: 44,  titleKo: '응원전',            titleEn: 'Cheer Battle',      kind: K.cheer,    source: { kind: 'event', type: 'E83' } },
  { id: 'allSchool',    startSec: 64,  titleKo: '전교생 집합',       titleEn: 'Line-up', kind: K.assembly, source: { kind: 'event', type: 'E19' } },
  { id: 'ballRoll',     startSec: 72,  titleKo: '공굴리기',          titleEn: 'Ball Roll',   kind: K.chief,    source: { kind: 'event', type: 'E104' } },
  { id: 'teamsMarch',   startSec: 96,  titleKo: '청백 입장',         titleEn: 'Team March',    kind: K.assembly, source: { kind: 'event', type: 'E19' } },
  { id: 'parade',       startSec: 108, titleKo: '가장행렬',          titleEn: 'Costume Parade',    kind: K.parade,   source: { kind: 'event', type: 'E73' } },
  { id: 'relay',        startSec: 124, titleKo: '이어달리기',        titleEn: 'Relay Race',        kind: K.relay,    source: { kind: 'event', type: 'E21' } },
  { id: 'principal',    startSec: 150, titleKo: '교장 선생님 말씀',  titleEn: 'The Principal',     kind: K.boss,     source: { kind: 'boss', type: 'B05' } },
  { id: 'relay2',       startSec: 168, titleKo: '이어달리기 2차',    titleEn: 'Relay 2',    kind: K.relay,    source: { kind: 'event', type: 'E21' } },
  { id: 'cavalry',      startSec: 192, titleKo: '기마전',            titleEn: 'Cavalry Battle',    kind: K.cavalry,  source: { kind: 'event', type: 'E106' } },
  { id: 'closing',      startSec: 210, titleKo: '폐회식 · 정문 개방', titleEn: 'Gate Opens', kind: K.closing, source: { kind: 'portal' } },
]

export const STAGE6_PROGRAMME = Object.freeze(ENTRIES.map((entry) => Object.freeze({ ...entry, source: Object.freeze({ ...entry.source }) })))

// 안내 배너(HUD)가 보이는 시간. 두 항목이 이보다 가깝게 붙으면 HUD가 줄 세워 차례로 보여 준다.
export const STAGE6_PROGRAMME_BANNER_MS = 2000

// 축하 순간(기획서 5번). HUD는 DOM 꽃가루만, soundmini는 함성을 얹는다. 결승 테이프(3D, 정문)는 threemini 몫이다.
//   multiKill: 짧은 창(windowMs) 안에 minKills 마리 이상 처치 — "한 번에 3마리 넘게"
//   chiefDown: 공굴리기 대장(E104) 처치
//   bossDown:  교장 선생님(B05) 처치
//   finishTape: 정문으로 탈출(phase 'cleared') — 3D 테이프 훅
export const STAGE6_CELEBRATION_MOMENTS = Object.freeze({
  multiKill: Object.freeze({ id: 'multiKill', minKills: 4, windowMs: 600, cooldownMs: 4000 }),
  chiefDown: Object.freeze({ id: 'chiefDown', chiefType: 'E104' }),
  bossDown: Object.freeze({ id: 'bossDown', bossType: 'B05' }),
  finishTape: Object.freeze({ id: 'finishTape' }),
})

const EMPTY = Object.freeze([])

// 게임 시계(초) → 순서표 상태. current가 null이면 첫 항목 전(0~5초).
// progress: 지금 항목 시작부터 다음 항목 시작까지 0..1(다음이 없으면 1).
export function getStage6ProgrammeState(elapsedSec, programme = STAGE6_PROGRAMME) {
  const sec = Number.isFinite(elapsedSec) && elapsedSec > 0 ? elapsedSec : 0
  let index = -1
  for (let i = 0; i < programme.length; i += 1) {
    if (programme[i].startSec <= sec) index = i
    else break
  }
  const current = index >= 0 ? programme[index] : null
  const next = programme[index + 1] ?? null
  const secondsToNext = next ? Math.max(0, next.startSec - sec) : null
  const fromSec = current ? current.startSec : 0
  const progress = next ? Math.min(1, Math.max(0, (sec - fromSec) / (next.startSec - fromSec))) : 1
  return { current, next, secondsToNext, index, progress }
}

// (prevSec, nowSec] 구간에 시작한 항목들(시간 순). 배너·오디오 큐가 같은 판정을 쓴다.
// 되감기(nowSec <= prevSec)나 비정상 값이면 빈 배열.
export function getStage6ProgrammeEntriesStartedBetween(prevSec, nowSec, programme = STAGE6_PROGRAMME) {
  if (!Number.isFinite(prevSec) || !Number.isFinite(nowSec) || nowSec <= prevSec) return EMPTY
  const started = programme.filter((entry) => prevSec < entry.startSec && entry.startSec <= nowSec)
  return started.length ? started : EMPTY
}

export function stage6ProgrammeTitle(entry, locale = 'ko') {
  if (!entry) return ''
  return locale === 'ko' ? entry.titleKo : entry.titleEn
}
