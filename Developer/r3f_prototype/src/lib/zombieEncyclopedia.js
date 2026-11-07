// Zombie encyclopedia progress layer.
// Encounter persistence lives only in Firebase users/{uid}.progress.encounteredZombieTypes.
import { ENEMY_TYPE_NAMES } from './enemyEntityPool.js'
import { isFirebaseProgressHydrated, readFirebasePlayerProgress, requestCloudProgressSave, updateFirebasePlayerProgress } from './firebaseProgress.js'
import { t } from './i18n.js'

export const ZOMBIE_ENCOUNTER_STORAGE_KEY = 'school_survivor:zombieEncounters'

const ZOMBIE_TYPE_LABELS = Object.freeze({
  E01: '초록 좀비',
  E02: '덩치 좀비',
  E03: '달리기 좀비',
  E04: '투척 좀비',
  E05: '돌진 좀비',
  E06: '거대 좀비',
  RZL: '런좀비 리더',
  RZC: '런좀비',
  RZT: '트렌치코트 좀비',
  RZG: '경비 좀비',
  E07: '웃는얼굴 좀비',
  E08: '코인 몬스터',
  B01: '수학 선생님 좀비',
  B02: '보스 좀비 B02',
  B03: '보스 좀비 B03',
  B04: '주방장 좀비',
  E19: '서가운반 좀비',
  E20: '색인질주 좀비',
  E21: '반납투척 좀비',
  E22: '배양액 좀비',
  E23: '자석실험 좀비',
  E24: '보안경돌격 좀비',
  E25: '분무정원 좀비',
  E26: '덩굴견인 좀비',
  E27: '종자도약 좀비',
  E28: '조명기사 좀비',
  E29: '리본무용 좀비',
  E30: '북채행진 좀비',
  E31: '전선수리 좀비',
  E32: '풍향계질주 좀비',
  E33: '축전지운반 좀비',
  B05: '금서관장',
  B06: '융합과학교사',
  B07: '온실관리장',
  B08: '가면지휘자',
  B09: '폭풍교장',
  // Track B 신규 일반 좀비 12종(typeCode 37~48). 한국어 정본은
  // Planner/stage_zombie_original_concepts_20261025.md의 개념명이다.
  // en/ja 표시명은 locales/{en,ja}.js의 zombie.<ID> 키가 덮어쓴다.
  E34: '박자접기형',
  E35: '모서리비껴형',
  E36: '반걸음되짚기형',
  E37: '빗금엇갈림형',
  E38: '빈칸반응형',
  E39: '선끝접기형',
  E40: '중심축비틀기형',
  E41: '쌍박자교대형',
  E42: '반원발맞춤형',
  E43: '엇높이교차형',
  E44: '발맞춤후퇴형',
  E45: '무게중심넘김형',
  // 투사체 좀비 1차 15종(E46~E60, typeCode 49~63)과 2차 10종(E61~E70, typeCode 65~74).
  // 한국어 정본은 lib/projectileZombieVisuals.js의 label이다. en/ja는 locales의 zombie.<ID>.
  // 이 표에 넣으면 도감·조우 기록 대상이 된다 — database.rules.json의 encounteredZombieTypes 허용 목록과 반드시 같이 바꾼다.
  E46: '지우개튕김 좀비',
  E47: '종이비행기 좀비',
  E48: '부메랑자 좀비',
  E49: '양동이청소 좀비',
  E50: '배구스파이크 좀비',
  E51: '합창지휘 좀비',
  E52: '플라스크분열 좀비',
  E53: '물감뿌림 좀비',
  E54: '확성기방송 좀비',
  E55: '강속구 야구부 좀비',
  E56: '보건실 좀비',
  E57: '출석부 생활지도 좀비',
  E58: '줄넘기 매복 좀비',
  E59: '우유당번 좀비',
  E60: '배수구잠복 좀비',
  E61: '급식판 좀비',
  E62: '셔틀런 좀비',
  E63: '마이크줄 좀비',
  E64: '분필가루 좀비',
  E65: '시험감독 좀비',
  E66: '플라나리아 좀비',
  E67: '학생회방패 좀비',
  E68: '지구본 좀비',
  E69: '도미노 좀비',
  E70: '술래 좀비',
})

export const ZOMBIE_ENCYCLOPEDIA_TYPES = Object.freeze(
  // Persistence IDs are stable even before the gameplay pool registration lands.
  [...new Set([...ENEMY_TYPE_NAMES, 'E19', 'E20', 'E21', 'E22', 'E23', 'E24', 'E25', 'E26', 'E27', 'E28', 'E29', 'E30', 'E31', 'E32', 'E33', 'B05', 'B06', 'B07', 'B08', 'B09'])]
    .filter((type) => type && ZOMBIE_TYPE_LABELS[type]),
)

const ZOMBIE_TYPE_SET = new Set(ZOMBIE_ENCYCLOPEDIA_TYPES)

export function isKnownZombieType(type) {
  return ZOMBIE_TYPE_SET.has(type)
}

// 한국어 정본은 위 표, en/ja는 로케일 사전의 zombie.<ID> 키. 번역이 없으면 한국어로 폴백한다.
export function getZombieTypeLabel(type) {
  const korean = ZOMBIE_TYPE_LABELS[type]
  if (korean === undefined) return type
  return t(`zombie.${type}`, null, korean)
}

export function normalizeZombieEncounterMap(value) {
  const out = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  for (const type of ZOMBIE_ENCYCLOPEDIA_TYPES) {
    if (value[type] === 1 || value[type] === true) out[type] = 1
  }
  return out
}

export function readEncounteredZombieTypes() {
  if (!isFirebaseProgressHydrated()) return new Set()
  const raw = readFirebasePlayerProgress().encounteredZombieTypes ?? {}
  return new Set(Object.keys(normalizeZombieEncounterMap(raw)))
}

export function buildZombieEncyclopediaEntries() {
  const encountered = readEncounteredZombieTypes()
  return ZOMBIE_ENCYCLOPEDIA_TYPES.map((type) => ({
    type,
    label: getZombieTypeLabel(type),
    encountered: encountered.has(type),
  }))
}

export function recordZombieEncounter(type) {
  if (!isKnownZombieType(type) || !isFirebaseProgressHydrated()) return false
  let changed = false
  updateFirebasePlayerProgress((progress) => {
    const encountered = normalizeZombieEncounterMap(progress.encounteredZombieTypes)
    if (encountered[type] === 1) return progress
    encountered[type] = 1
    progress.encounteredZombieTypes = encountered
    changed = true
    return progress
  })
  if (changed) void requestCloudProgressSave()
  return changed
}
