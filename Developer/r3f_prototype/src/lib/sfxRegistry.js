// SFX 레지스트리. 모든 사운드 ID → 파일 경로 매핑 + Howler 인스턴스 지연 생성.
// 파일이 없으면 onloaderror에서 _failed에 등록 → 이후 호출 무시 (무음 실패).
// 에셋 준비 전에도 코드는 정상 동작한다.

import { Howl } from 'howler'

// ── 사운드 맵 ────────────────────────────────────────────────────────────────
// 파일 위치: public/sfx/<category>/<id>.mp3
const SOUND_MAP = {
  // ── 무기 발사음 (14종) ──────────────────────────────────────────────────────
  pencilFire:     '/sfx/weapons/pencilFire.wav',
  rulerFire:      '/sfx/weapons/rulerFire.wav',
  boxCutterFire:  '/sfx/weapons/boxCutterFire.wav',
  tumblerFire:    '/sfx/weapons/tumblerFire.wav',
  bellFire:       '/sfx/weapons/bellFire.wav',
  flaskFire:      '/sfx/weapons/flaskFire.wav',
  onigiriFire:    '/sfx/weapons/onigiriFire.wav',
  stunGunFire:    '/sfx/weapons/stunGunFire.wav',
  missileFire:    '/sfx/weapons/missileFire.wav',
  starlinkFire:   '/sfx/weapons/starlinkFire.wav',
  compassFire:    '/sfx/weapons/compassFire.wav',
  umbrellaFire:   '/sfx/weapons/umbrellaFire.wav',
  eraserFire:     '/sfx/weapons/eraserFire.wav',
  chibikoFire:    '/sfx/weapons/chibikoFire.wav',
  sharkFire:      '/sfx/weapons/sharkFire.wav',

  // ── 무기 타격음 (14종) ──────────────────────────────────────────────────────
  pencilHit:      '/sfx/weapons/pencilHit.wav',
  rulerHit:       '/sfx/weapons/rulerHit.wav',
  boxCutterHit:   '/sfx/weapons/boxCutterHit.wav',
  tumblerHit:     '/sfx/weapons/tumblerHit.wav',
  bellHit:        '/sfx/weapons/bellHit.wav',
  flaskHit:       '/sfx/weapons/flaskHit.wav',
  onigiriHit:     '/sfx/weapons/onigiriHit.wav',
  stunGunHit:     '/sfx/weapons/stunGunHit.wav',
  missileHit:     '/sfx/weapons/missileHit.wav',
  starlinkHit:    '/sfx/weapons/starlinkHit.wav',
  compassHit:     '/sfx/weapons/compassHit.wav',
  umbrellaHit:    '/sfx/weapons/umbrellaHit.wav',
  eraserHit:      '/sfx/weapons/eraserHit.wav',
  chibikoHit:     '/sfx/weapons/chibikoHit.wav',
  sharkHit:       '/sfx/weapons/sharkHit.wav',

  // ── 플레이어 ─────────────────────────────────────────────────────────────────
  playerHit:      '/sfx/player/playerHit.wav',
  playerDeath:    '/sfx/player/playerDeath.wav',
  playerStep:     '/sfx/player/playerStep.wav',

  // ── 적 등장/공격 그로울 ───────────────────────────────────────────────────────
  zombieGroan:        '/sfx/enemies/zombieGroan.wav',
  zombieTankGroan:    '/sfx/enemies/zombieTankGroan.wav',
  zombieRunnerScreech:'/sfx/enemies/zombieRunnerScreech.wav',
  zombieRangedShoot:  '/sfx/enemies/zombieRangedShoot.wav',
  zombieChargeRoar:   '/sfx/enemies/zombieChargeRoar.wav',
  zombieGiantThud:    '/sfx/enemies/zombieGiantThud.wav',
  bossRoar:           '/sfx/enemies/bossRoar.wav',
  matildaSpawn:       '/sfx/enemies/matildaSpawn.wav',

  // ── 적 사망음 ────────────────────────────────────────────────────────────────
  zombieDeath:        '/sfx/enemies/zombieDeath.wav',
  zombieHeavyDeath:   '/sfx/enemies/zombieHeavyDeath.wav',
  bossDeath:          '/sfx/enemies/bossDeath.wav',
  matildaDeath:       '/sfx/enemies/matildaDeath.wav',

  // ── UI ───────────────────────────────────────────────────────────────────────
  buttonClick:    '/sfx/ui/buttonClick.wav',
  coinCollect:    '/sfx/ui/coinCollect.wav',
  levelUp:        '/sfx/ui/levelUp.wav',
  stageClear:     '/sfx/ui/stageClear.wav',
  gameOver:       '/sfx/ui/gameOver.wav',

  // ── 특수 이벤트 ──────────────────────────────────────────────────────────────
  bossWarning:        '/sfx/events/bossWarning.wav',
  bossSpawn:          '/sfx/events/bossSpawn.wav',
  portalAppear:       '/sfx/events/portalAppear.wav',
  portalSuction:      '/sfx/events/portalSuction.wav',
  matildaWarningTick: '/sfx/events/matildaWarningTick.wav',
  matildaCountdownEnd:'/sfx/events/matildaCountdownEnd.wav',
  escapePortalClear:  '/sfx/events/escapePortalClear.wav',
  bossClearJingle:    '/sfx/events/bossClearJingle.wav',
  milestoneGold:      '/sfx/events/milestoneGold.wav',
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

export function playSfx(id, volume = 1) {
  if (!SOUND_MAP[id] || _failed.has(id)) return

  const cooldown = POLYPHONY_COOLDOWN[id] ?? 0
  if (cooldown > 0) {
    const now = performance.now()
    if (_lastPlayed[id] && now - _lastPlayed[id] < cooldown) return
    _lastPlayed[id] = now
  }

  if (!_cache[id]) {
    _cache[id] = new Howl({
      src: [SOUND_MAP[id]],
      volume: Math.max(0, Math.min(1, volume)),
      onloaderror: () => { _failed.add(id); delete _cache[id] },
    })
  }
  _cache[id].play()
}

// 볼륨 조절 (뮤트/글로벌 볼륨 슬라이더 연동용)
export function setSfxVolume(volume) {
  Object.values(_cache).forEach((h) => h.volume(volume))
}
