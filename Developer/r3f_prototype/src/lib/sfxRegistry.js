// SFX 레지스트리. 모든 사운드 ID → 파일 경로 매핑 + Howler 인스턴스 지연 생성.
// 파일이 없으면 onloaderror에서 _failed에 등록 → 이후 호출 무시 (무음 실패).
// 에셋 준비 전에도 코드는 정상 동작한다.

import { Howl } from 'howler'

// ── 사운드 맵 ────────────────────────────────────────────────────────────────
// 파일 위치: public/sfx/<category>/<id>.mp3
const SOUND_MAP = {
  // ── 무기 발사음 (14종) ──────────────────────────────────────────────────────
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

  // ── 무기 타격음 (14종) ──────────────────────────────────────────────────────
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

  // ── 플레이어 ─────────────────────────────────────────────────────────────────
  playerHit:      '/sfx/player/playerHit.ogg',
  playerDeath:    '/sfx/player/playerDeath.ogg',
  playerStep:     '/sfx/player/playerStep.ogg',

  // ── 적 등장/공격 그로울 ───────────────────────────────────────────────────────
  zombieGroan:        '/sfx/enemies/zombieGroan.ogg',
  zombieTankGroan:    '/sfx/enemies/zombieTankGroan.ogg',
  zombieRunnerScreech:'/sfx/enemies/zombieRunnerScreech.ogg',
  zombieRangedShoot:  '/sfx/enemies/zombieRangedShoot.ogg',
  zombieChargeRoar:   '/sfx/enemies/zombieChargeRoar.ogg',
  zombieGiantThud:    '/sfx/enemies/zombieGiantThud.ogg',
  bossRoar:           '/sfx/enemies/bossRoar.ogg',
  matildaSpawn:       '/sfx/enemies/matildaSpawn.ogg',

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

const _cache  = {}
const _failed = new Set()

// 동시 다발 사망 시 같은 사운드가 같은 프레임에 여러 번 울리는 걸 막는 쿨다운 맵.
// 한 프레임(~16ms) 안에 같은 ID가 반복 emit돼도 1회만 재생.
const _lastPlayed = {}
const POLYPHONY_COOLDOWN = {
  zombieDeath:      50,
  zombieHeavyDeath: 50,
  playerHit:        80,
  coinCollect:      40,
}

const AUTH_OVERLAY_ALLOWED_SFX = new Set([
  'buttonClick',
])

export function isSfxAllowedForAuthOverlay(id, authOverlayActive = false) {
  if (!authOverlayActive) return true
  return AUTH_OVERLAY_ALLOWED_SFX.has(id)
}

export function playSfx(id, volume = 1, options = {}) {
  if (!SOUND_MAP[id] || _failed.has(id)) return
  if (!isSfxAllowedForAuthOverlay(id, options.authOverlayActive)) return

  const cooldown = POLYPHONY_COOLDOWN[id] ?? 0
  if (cooldown > 0) {
    const now = performance.now()
    if (_lastPlayed[id] && now - _lastPlayed[id] < cooldown) return
    _lastPlayed[id] = now
  }

  if (!_cache[id]) {
    const ogg = SOUND_MAP[id]
    const mp3 = ogg.replace('.ogg', '.mp3')
    _cache[id] = new Howl({
      src: [ogg, mp3],   // OGG 우선, 미지원 브라우저는 MP3 fallback
      volume: Math.max(0, Math.min(1, volume)),
      onloaderror: () => { _failed.add(id); delete _cache[id] },
    })
  }
  const soundId = _cache[id].play()
  if (options.rate) _cache[id].rate(options.rate, soundId)
}

// 볼륨 조절 (뮤트/글로벌 볼륨 슬라이더 연동용)
export function setSfxVolume(volume) {
  Object.values(_cache).forEach((h) => h.volume(volume))
}
