// SFX 레지스트리. 모든 사운드 ID → 파일 경로 매핑 + Howler 인스턴스 지연 생성.
// 파일이 없으면 onloaderror에서 _failed에 등록 → 이후 호출 무시 (무음 실패).
// 에셋 준비 전에도 코드는 정상 동작한다.

import { Howl } from 'howler'

// ── 사운드 맵 ────────────────────────────────────────────────────────────────
// 파일 위치: public/sfx/<category>/<id>.mp3
const SOUND_MAP = {
  // ── 무기 발사음 (14종) ──────────────────────────────────────────────────────
  pencilFire:     '/sfx/weapons/pencilFire.mp3',
  rulerFire:      '/sfx/weapons/rulerFire.mp3',
  boxCutterFire:  '/sfx/weapons/boxCutterFire.mp3',
  tumblerFire:    '/sfx/weapons/tumblerFire.mp3',
  bellFire:       '/sfx/weapons/bellFire.mp3',
  flaskFire:      '/sfx/weapons/flaskFire.mp3',
  onigiriFire:    '/sfx/weapons/onigiriFire.mp3',
  stunGunFire:    '/sfx/weapons/stunGunFire.mp3',
  missileFire:    '/sfx/weapons/missileFire.mp3',
  starlinkFire:   '/sfx/weapons/starlinkFire.mp3',
  compassFire:    '/sfx/weapons/compassFire.mp3',
  umbrellaFire:   '/sfx/weapons/umbrellaFire.mp3',
  eraserFire:     '/sfx/weapons/eraserFire.mp3',
  chibikoFire:    '/sfx/weapons/chibikoFire.mp3',
  sharkFire:      '/sfx/weapons/sharkFire.mp3',

  // ── 무기 타격음 (14종) ──────────────────────────────────────────────────────
  pencilHit:      '/sfx/weapons/pencilHit.mp3',
  rulerHit:       '/sfx/weapons/rulerHit.mp3',
  boxCutterHit:   '/sfx/weapons/boxCutterHit.mp3',
  tumblerHit:     '/sfx/weapons/tumblerHit.mp3',
  bellHit:        '/sfx/weapons/bellHit.mp3',
  flaskHit:       '/sfx/weapons/flaskHit.mp3',
  onigiriHit:     '/sfx/weapons/onigiriHit.mp3',
  stunGunHit:     '/sfx/weapons/stunGunHit.mp3',
  missileHit:     '/sfx/weapons/missileHit.mp3',
  starlinkHit:    '/sfx/weapons/starlinkHit.mp3',
  compassHit:     '/sfx/weapons/compassHit.mp3',
  umbrellaHit:    '/sfx/weapons/umbrellaHit.mp3',
  eraserHit:      '/sfx/weapons/eraserHit.mp3',
  chibikoHit:     '/sfx/weapons/chibikoHit.mp3',
  sharkHit:       '/sfx/weapons/sharkHit.mp3',

  // ── 플레이어 ─────────────────────────────────────────────────────────────────
  playerHit:      '/sfx/player/playerHit.mp3',
  playerDeath:    '/sfx/player/playerDeath.mp3',
  playerStep:     '/sfx/player/playerStep.mp3',

  // ── 적 등장/공격 그로울 ───────────────────────────────────────────────────────
  zombieGroan:        '/sfx/enemies/zombieGroan.mp3',
  zombieTankGroan:    '/sfx/enemies/zombieTankGroan.mp3',
  zombieRunnerScreech:'/sfx/enemies/zombieRunnerScreech.mp3',
  zombieRangedShoot:  '/sfx/enemies/zombieRangedShoot.mp3',
  zombieChargeRoar:   '/sfx/enemies/zombieChargeRoar.mp3',
  zombieGiantThud:    '/sfx/enemies/zombieGiantThud.mp3',
  bossRoar:           '/sfx/enemies/bossRoar.mp3',
  matildaSpawn:       '/sfx/enemies/matildaSpawn.mp3',

  // ── 적 사망음 ────────────────────────────────────────────────────────────────
  zombieDeath:        '/sfx/enemies/zombieDeath.mp3',
  zombieHeavyDeath:   '/sfx/enemies/zombieHeavyDeath.mp3',
  bossDeath:          '/sfx/enemies/bossDeath.mp3',
  matildaDeath:       '/sfx/enemies/matildaDeath.mp3',

  // ── UI ───────────────────────────────────────────────────────────────────────
  buttonClick:    '/sfx/ui/buttonClick.mp3',
  coinCollect:    '/sfx/ui/coinCollect.mp3',
  levelUp:        '/sfx/ui/levelUp.mp3',
  stageClear:     '/sfx/ui/stageClear.mp3',
  gameOver:       '/sfx/ui/gameOver.mp3',

  // ── 특수 이벤트 ──────────────────────────────────────────────────────────────
  bossWarning:        '/sfx/events/bossWarning.mp3',
  bossSpawn:          '/sfx/events/bossSpawn.mp3',
  portalAppear:       '/sfx/events/portalAppear.mp3',
  portalSuction:      '/sfx/events/portalSuction.mp3',
  matildaWarningTick: '/sfx/events/matildaWarningTick.mp3',
  matildaCountdownEnd:'/sfx/events/matildaCountdownEnd.mp3',
  escapePortalClear:  '/sfx/events/escapePortalClear.mp3',
  bossClearJingle:    '/sfx/events/bossClearJingle.mp3',
  milestoneGold:      '/sfx/events/milestoneGold.mp3',
}

const _cache  = {}
const _failed = new Set()

export function playSfx(id, volume = 1) {
  if (!SOUND_MAP[id] || _failed.has(id)) return
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
