// SFX 레지스트리. 모든 사운드 ID → 파일 경로 매핑 + Howler 인스턴스 지연 생성.
// 파일이 없으면 onloaderror에서 _failed에 등록 → 이후 호출 무시 (무음 실패).
// 에셋 준비 전에도 코드는 정상 동작한다.

import { Howl } from 'howler'

// ── 사운드 맵 ────────────────────────────────────────────────────────────────
// 파일 위치: public/sfx/<category>/<id>.mp3
export const SOUND_MAP = {
  // ── 무기 발사음 (18 ID) ────────────────────────────────────────────────────
  pencilFire:     '/sfx/weapons/pencilFire.ogg',
  rulerFire:      '/sfx/weapons/rulerFire.ogg',
  boxCutterFire:  '/sfx/weapons/boxCutterFire.ogg',
  tumblerFire:    '/sfx/weapons/tumblerFire.ogg',
  bellFire:       '/sfx/weapons/bellFire.ogg',
  flaskFire:      '/sfx/weapons/flaskFire.ogg',
  onigiriFire:    '/sfx/weapons/onigiriFire.ogg',
  stunGunFire:    '/sfx/weapons/stunGunFire.ogg',
  missileFire:    '/sfx/weapons/missileFire.ogg',
  starlinkFire:   '/sfx/weapons/starlinkFire.ogg',
  starlinkFall:   '/sfx/weapons/starlinkFall.ogg',
  starlinkExplosion: '/sfx/weapons/starlinkExplosion.ogg',
  compassFire:    '/sfx/weapons/compassFire.ogg',
  umbrellaFire:   '/sfx/weapons/umbrellaFire.ogg',
  eraserFire:     '/sfx/weapons/eraserFire.ogg',
  chibikoFire:    '/sfx/weapons/chibikoFire.ogg',
  sharkFire:      '/sfx/weapons/sharkFire.ogg',
  lanternFire:    '/sfx/weapons/lanternFire.ogg',

  // ── 무기 타격음 (15 hit ID + 2 tick aliases) ───────────────────────────────
  pencilHit:      '/sfx/weapons/pencilHit.ogg',
  rulerHit:       '/sfx/weapons/rulerHit.ogg',
  boxCutterHit:   '/sfx/weapons/boxCutterHit.ogg',
  tumblerHit:     '/sfx/weapons/tumblerHit.ogg',
  bellHit:        '/sfx/weapons/bellHit.ogg',
  flaskHit:       '/sfx/weapons/flaskHit.ogg',
  onigiriHit:     '/sfx/weapons/onigiriHit.ogg',
  stunGunHit:     '/sfx/weapons/stunGunHit.ogg',
  missileHit:     '/sfx/weapons/missileHit.ogg',
  starlinkHit:    '/sfx/weapons/starlinkHit.ogg',
  compassHit:     '/sfx/weapons/compassHit.ogg',
  umbrellaHit:    '/sfx/weapons/umbrellaHit.ogg',
  eraserHit:      '/sfx/weapons/eraserHit.ogg',
  chibikoHit:     '/sfx/weapons/chibikoHit.ogg',
  sharkHit:       '/sfx/weapons/sharkHit.ogg',
  flaskTick:      '/sfx/weapons/chibikoHit.ogg',
  lanternTick:    '/sfx/weapons/chibikoHit.ogg',

  // ── 플레이어 ─────────────────────────────────────────────────────────────────
  playerHit:      '/sfx/player/playerHit.ogg',
  playerDeath:    '/sfx/player/playerDeath.ogg',
  playerStep:     '/sfx/player/playerStep.ogg',

  // ── 적 등장/공격 그로울 ───────────────────────────────────────────────────────
  zombieGroan:        '/sfx/enemies/zombieGroan.ogg',
  zombieSpawn:        '/sfx/enemies/zombieSpawn.ogg',
  zombieTankGroan:    '/sfx/enemies/zombieTankGroan.ogg',
  zombieRunnerScreech:'/sfx/enemies/zombieRunnerScreech.ogg',
  zombieRangedShoot:  '/sfx/enemies/zombieRangedShoot.ogg',
  zombieChargeRoar:   '/sfx/enemies/zombieChargeRoar.ogg',
  zombieGiantThud:    '/sfx/enemies/zombieGiantThud.ogg',
  bossRoar:           '/sfx/enemies/bossRoar.ogg',
  matildaSpawn:       '/sfx/enemies/matildaSpawn.ogg',
  matildaDash:        '/sfx/enemies/matildaDash.ogg',
  matildaLaugh:       '/sfx/enemies/matildaLaugh.ogg',

  // ── 적 사망음 ────────────────────────────────────────────────────────────────
  zombieDeath:        '/sfx/enemies/zombieDeath.ogg',
  zombieHeavyDeath:   '/sfx/enemies/zombieHeavyDeath.ogg',
  bossDeath:          '/sfx/enemies/bossDeath.ogg',
  matildaDeath:       '/sfx/enemies/matildaDeath.ogg',

  // ── UI ───────────────────────────────────────────────────────────────────────
  buttonClick:    '/sfx/ui/buttonClick.ogg',
  coinCollect:    '/sfx/ui/coinCollect.ogg',
  levelUp:        '/sfx/ui/levelUp.ogg',
  stageClear:     '/sfx/ui/stageClear.ogg',
  gameOver:       '/sfx/ui/gameOver.ogg',

  // ── 특수 이벤트 ──────────────────────────────────────────────────────────────
  bossWarning:        '/sfx/events/bossWarning.ogg',
  bossSpawn:          '/sfx/events/bossSpawn.ogg',
  portalAppear:       '/sfx/events/portalAppear.ogg',
  portalSuction:      '/sfx/events/portalSuction.ogg',
  matildaWarningTick: '/sfx/events/matildaWarningTick.ogg',
  matildaCountdownEnd:'/sfx/events/matildaCountdownEnd.ogg',
  escapePortalClear:  '/sfx/events/escapePortalClear.ogg',
  bossClearJingle:    '/sfx/events/bossClearJingle.ogg',
  milestoneGold:      '/sfx/events/milestoneGold.ogg',
}

export const DEFAULT_SFX_TUNING = {
  volume: 1,
  rate: 1,
}

export const SFX_TUNING_STORAGE_KEY = 'escape-zombie-school.sfxTunings.v1'

const _cache  = {}
const _failed = new Set()

// 동시 다발 사망 시 같은 사운드가 같은 프레임에 여러 번 울리는 걸 막는 쿨다운 맵.
// 한 프레임(~16ms) 안에 같은 ID가 반복 emit돼도 1회만 재생.
const _lastPlayed = {}
export const POLYPHONY_COOLDOWN = Object.freeze({
  zombieDeath:      50,
  zombieHeavyDeath: 50,
  playerHit:        80,
  zombieSpawn:      110,
  matildaDash:      400,
  matildaLaugh:     700,
  coinCollect:      40,
  pencilHit:        35,
  rulerHit:         55,
  boxCutterHit:     45,
  tumblerHit:       90,
  flaskHit:         100,
  flaskTick:        140,
  bellHit:          120,
  stunGunHit:       55,
  onigiriHit:       65,
  chibikoHit:       40,
  missileHit:       140,
  sharkHit:         180,
  starlinkHit:      90,
  starlinkFall:     500,
  starlinkExplosion: 650,
  compassFire:      110,
  compassHit:       180,
  umbrellaHit:      140,
  eraserHit:        160,
  lanternTick:      120,
})

const AUTH_OVERLAY_ALLOWED_SFX = new Set([
  'buttonClick',
])

export function isSfxAllowedForAuthOverlay(id, authOverlayActive = false) {
  if (!authOverlayActive) return true
  return AUTH_OVERLAY_ALLOWED_SFX.has(id)
}

export function getSfxCatalog() {
  return Object.entries(SOUND_MAP).map(([id, src]) => ({
    id,
    src,
    category: src.split('/')[2] ?? 'sfx',
  }))
}

export function normalizeSfxTuning(input) {
  const volume = Number(input?.volume ?? DEFAULT_SFX_TUNING.volume)
  const rate = Number(input?.rate ?? DEFAULT_SFX_TUNING.rate)
  return {
    volume: clamp(Number.isFinite(volume) ? volume : DEFAULT_SFX_TUNING.volume, 0, 2),
    rate: clamp(Number.isFinite(rate) ? rate : DEFAULT_SFX_TUNING.rate, 0.5, 2),
  }
}

export function loadSfxTunings() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SFX_TUNING_STORAGE_KEY) : null
    const parsed = raw ? JSON.parse(raw) : {}
    return Object.fromEntries(
      Object.keys(SOUND_MAP)
        .filter((id) => parsed[id])
        .map((id) => [id, normalizeSfxTuning(parsed[id])]),
    )
  } catch {
    return {}
  }
}

export function saveSfxTunings(tunings) {
  const next = Object.fromEntries(
    Object.keys(SOUND_MAP)
      .filter((id) => tunings?.[id])
      .map((id) => [id, normalizeSfxTuning(tunings[id])]),
  )
  if (typeof localStorage !== 'undefined') localStorage.setItem(SFX_TUNING_STORAGE_KEY, JSON.stringify(next))
  return next
}

export function playSfx(id, volume = 1, options = {}) {
  if (!SOUND_MAP[id] || _failed.has(id)) return
  if (!isSfxAllowedForAuthOverlay(id, options.authOverlayActive)) return
  const tuning = normalizeSfxTuning(loadSfxTunings()[id])
  const tunedVolume = clamp(volume * tuning.volume, 0, 1)
  const tunedRate = clamp((options.rate ?? 1) * tuning.rate, 0.5, 2)

  const cooldown = POLYPHONY_COOLDOWN[id] ?? 0
  if (cooldown > 0) {
    const now = performance.now()
    if (Object.hasOwn(_lastPlayed, id) && now - _lastPlayed[id] < cooldown) return
    _lastPlayed[id] = now
  }

  if (!_cache[id]) {
    const ogg = SOUND_MAP[id]
    const mp3 = ogg.replace('.ogg', '.mp3')
    _cache[id] = new Howl({
      src: [ogg, mp3],   // OGG 우선, 미지원 브라우저는 MP3 fallback
      volume: tunedVolume,
      onloaderror: () => { _failed.add(id); delete _cache[id] },
    })
  }
  const soundId = _cache[id].play()
  _cache[id].volume?.(tunedVolume, soundId)
  if (tunedRate !== 1) _cache[id].rate(tunedRate, soundId)
}

// 볼륨 조절 (뮤트/글로벌 볼륨 슬라이더 연동용)
export function setSfxVolume(volume) {
  Object.values(_cache).forEach((h) => h.volume(volume))
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
