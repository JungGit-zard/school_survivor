// SFX 레지스트리. 모든 사운드 ID → 파일 경로 매핑 + Howler 인스턴스 지연 생성.
// 파일이 없으면 onloaderror에서 _failed에 등록 → 이후 호출 무시 (무음 실패).
// 에셋 준비 전에도 코드는 정상 동작한다.

import { Howl, Howler } from 'howler'
import {
  getFirebaseStudioRuntimeDataset,
  setFirebaseStudioRuntimeDataset,
} from './studioRuntimeState.js'
import { ZOMBIE_DEATH_SFX_IDS } from './enemyDeathSfx.js'

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

  // ── 바이키티 커터칼 (3 ID) ─────────────────────────────────────────────────
  // 8단 래칫 → 파단 → 날 교체 루프. Fire는 로직이 단수별 rate로 피치를 올린다.
  bikittyCutterFire:   '/sfx/weapons/bikittyCutterFire.ogg',
  bikittyCutterSnap:   '/sfx/weapons/bikittyCutterSnap.ogg',
  bikittyCutterReload: '/sfx/weapons/bikittyCutterReload.ogg',

  // ── 선긋기 (3 ID) ──────────────────────────────────────────────────────────
  // 긋기 → 선을 가로지른 적이 잘림 → 2초 뒤 선 소멸. 반응형이 아니라 선점형 함정이라
  // 세 소리가 무기 하나의 '상태 전이'를 알린다.
  lineDrawSlash:  '/sfx/weapons/lineDrawSlash.ogg',
  lineDrawCross:  '/sfx/weapons/lineDrawCross.ogg',
  lineDrawExpire: '/sfx/weapons/lineDrawExpire.ogg',

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
  compassQuack:   '/sfx/weapons/compassQuack.ogg',
  umbrellaHit:    '/sfx/weapons/umbrellaHit.ogg',
  eraserHit:      '/sfx/weapons/eraserHit.ogg',
  chibikoHit:     '/sfx/weapons/chibikoHit.ogg',
  sharkHit:       '/sfx/weapons/sharkHit.ogg',
  flaskTick:      '/sfx/weapons/flaskTick.ogg',
  lanternTick:    '/sfx/weapons/lanternTick.ogg',

  // ── 플레이어 ─────────────────────────────────────────────────────────────────
  playerHit:      '/sfx/player/playerHit.ogg',
  playerDeath:    '/sfx/player/playerDeath.ogg',
  playerHeal:     '/sfx/player/playerHeal.ogg',
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
  // 좀비 사망 발성 5종. 노이즈 버스트가 아니라 포먼트가 들리는 "음성"이다.
  // 8비트 음성 합성 기법(TMS5220 LPC / SAM 3포먼트 / NES DPCM 열화)으로 절차 합성했고
  // 생성기는 scripts/generate_zombie_death_voices.mjs 하나뿐이다(시드 고정 = 재현 가능).
  // Terry correction: 타입별 고정 배정 금지. 일반 좀비 죽음 행동 포인트에서 5종을 랜덤 풀로 섞는다.
  zombieDeathGrunt:   '/sfx/enemies/zombieDeathGrunt.ogg',   // "으윽"
  zombieDeathHeavy:   '/sfx/enemies/zombieDeathHeavy.ogg',   // "우어억"
  zombieDeathShriek:  '/sfx/enemies/zombieDeathShriek.ogg',  // "끼야악"
  zombieDeathGurgle:  '/sfx/enemies/zombieDeathGurgle.ogg',  // "커르륵"
  zombieDeathBellow:  '/sfx/enemies/zombieDeathBellow.ogg',  // "끄아아앙"
  bossDeath:          '/sfx/enemies/bossDeath.ogg',
  matildaDeath:       '/sfx/enemies/matildaDeath.ogg',
  dogeDeath:          '/sfx/enemies/dogeDeath.ogg',
  dogeEscape:         '/sfx/enemies/dogeEscape.ogg',
  dogeYelp:           '/sfx/enemies/dogeYelp.ogg',
  inuconBite:         '/sfx/enemies/inuconBite.ogg',
  inuconHeal:         '/sfx/enemies/inuconHeal.ogg',

  // ── UI ───────────────────────────────────────────────────────────────────────
  buttonClick:    '/sfx/ui/buttonClick.ogg',
  coinCollect:    '/sfx/ui/coinCollect.ogg',
  textbookCollect:'/sfx/ui/textbookCollect.ogg',
  levelUp:        '/sfx/ui/levelUp.ogg',
  stageClear:     '/sfx/ui/stageClear.ogg',
  gameOver:       '/sfx/ui/gameOver.ogg',

  // ── 특수 이벤트 ──────────────────────────────────────────────────────────────
  criticalHit:        '/sfx/events/criticalHit.ogg',
  bossWarning:        '/sfx/events/bossWarning.ogg',
  bossSpawn:          '/sfx/events/bossSpawn.ogg',
  portalAppear:       '/sfx/events/portalAppear.ogg',
  portalSuction:      '/sfx/events/portalSuction.ogg',
  matildaWarningTick: '/sfx/events/matildaWarningTick.ogg',
  matildaCountdownEnd:'/sfx/events/matildaCountdownEnd.ogg',
  escapePortalClear:  '/sfx/events/escapePortalClear.ogg',
  bossClearJingle:    '/sfx/events/bossClearJingle.ogg',
  milestoneGold:      '/sfx/events/milestoneGold.ogg',
  chestDrop:          '/sfx/events/chestDrop.ogg',
  chestOpen:          '/sfx/events/chestOpen.ogg',
  textbookLand:       '/sfx/events/textbookLand.ogg',
  rzlWhistle:         '/sfx/events/rzlWhistle.ogg',
  stage2GuardWhistle: '/sfx/events/stage2GuardWhistle.ogg',
}

export const DEFAULT_SFX_TUNING = {
  volume: 1,
  rate: 1,
}

export const SFX_TUNING_STORAGE_KEY = 'escape-zombie-school.sfxTunings.v1'

const _cache  = {}
const _failed = new Set()
const _activeCombatVoices = new Set()

// 위험/플레이어/UI 신호는 전역 전투 보이스 상한 때문에 버리지 않는다.
// 반복되는 무기·적·ambient 신호만 작은 상한으로 제어한다.
export const COMBAT_VOICE_CAP = 6
export const PROTECTED_DANGER_SFX = Object.freeze([
  'bossRoar',
  'bossDeath',
  'matildaSpawn',
  'matildaDash',
  'matildaLaugh',
  'matildaDeath',
  'zombieRunnerScreech',
  'zombieRangedShoot',
  'zombieChargeRoar',
  'zombieGiantThud',
])
const _protectedDangerSfx = new Set(PROTECTED_DANGER_SFX)
export const SFX_VOICE_CLASS = Object.freeze(Object.fromEntries(
  Object.entries(SOUND_MAP).map(([id, src]) => [
    id,
    _protectedDangerSfx.has(id) || (!src.includes('/weapons/') && !src.includes('/enemies/'))
      ? 'protected'
      : 'combat',
  ]),
))

export function isProtectedSfx(id) {
  return SFX_VOICE_CLASS[id] === 'protected'
}

// ── 마스터 헤드룸 ────────────────────────────────────────────────────────────
// 지금까지 Howler 마스터 게인을 아무도 건드리지 않아 기본값 1.0이었다.
// 개별 음원이 거의 풀스케일로 정규화돼 있어서(87개 중 18개가 피크 1.000,
// 26개가 0.90 이상) 두 개만 겹쳐도 합이 1.0을 넘어 destination에서 하드 클리핑한다.
//
// 값 근거 — 실측 음원 87개로 몬테카를로(300ms 창 안에 N개 임의 시점 재생, 2000회):
//   게인 1.0: N=2에서 24.3%, N=6에서 91.3% 확률로 합이 풀스케일을 넘는다
//   게인 0.8: N=2 6.0%,  N=4 36.4%, N=6 67.0%   ← 문서에 있던 권고치, 부족하다
//   게인 0.5: N=2 0.0%,  N=4  0.3%, N=6  2.7%   ← 채택
//   게인 0.4: N=6 0.2% — 더 안전하지만 -8dB는 게임이 너무 작아진다
// 0.5(-6dB)는 실제로 흔한 2~4중첩에서 클리핑을 사실상 없애고, 캡(6)이 꽉 찬
// 최악에서도 2.7%로 억제한다. 게임 SFX 버스에서 -6dB는 통상 범위다.
//
// 주의: 이건 스튜디오 사운드 튜닝(sfxTunings)과 다른 층이다.
// 스튜디오 값은 ID별 volume/rate로 playSfx 안에서 Howl 인스턴스에 적용되고,
// 이 값은 그 위의 전역 게인이다. 곱해질 뿐 이중 적용이 아니다.
export const SFX_MASTER_VOLUME = 0.5

export function applySfxMasterVolume(volume = SFX_MASTER_VOLUME) {
  Howler.volume(clamp(Number.isFinite(volume) ? volume : SFX_MASTER_VOLUME, 0, 1))
}

// ── 사망 발성 예약 슬롯 ──────────────────────────────────────────────────────
// 사망 발성은 /enemies/ 경로라 'combat' 클래스다 = 캡이 차면 조용히 버려진다.
// 그런데 타격음이 캡을 통째로 먹는다. 실측(음원 길이 / 쿨다운 = 최대 점유 슬롯):
//   starlinkHit 0.42s/90ms = 4.67 slots, stunGunHit 0.30s/55ms = 3.48 slots
//   → 이 둘만으로 8.15 slots 로 캡 6을 초과한다. 타격/틱 17종 합은 43.9 slots.
// 즉 난전에서 사망 발성이 밀려서 안 들리는 일이 실제로 일어난다.
//
// 해법으로 캡을 올리지 않았다 — 동시 재생 보이스는 모바일 CPU 비용이고,
// 클리핑 위험도 같이 커진다. 대신 총량은 그대로 두고 예약분만 뒀다:
// 사망 발성이 아닌 combat 사운드는 CAP - 2 까지만 쓰고, 두 슬롯은 항상 비워둔다.
export const DEATH_VOICE_RESERVED_SLOTS = 2
const _deathVoiceSfx = new Set(ZOMBIE_DEATH_SFX_IDS)

export function isDeathVoiceSfx(id) {
  return _deathVoiceSfx.has(id)
}

export function combatVoiceCapFor(id) {
  return isDeathVoiceSfx(id) ? COMBAT_VOICE_CAP : COMBAT_VOICE_CAP - DEATH_VOICE_RESERVED_SLOTS
}

function combatVoiceKey(id, soundId) {
  return `${id}:${soundId}`
}

function releaseCombatVoice(id, soundId) {
  _activeCombatVoices.delete(combatVoiceKey(id, soundId))
}

function releaseCombatVoicesForLogicalId(id) {
  const prefix = `${id}:`
  for (const voiceKey of _activeCombatVoices) {
    if (voiceKey.startsWith(prefix)) _activeCombatVoices.delete(voiceKey)
  }
}

// 동시 다발 사망 시 같은 사운드가 같은 프레임에 여러 번 울리는 걸 막는 쿨다운 맵.
// 한 프레임(~16ms) 안에 같은 ID가 반복 emit돼도 1회만 재생.
const _lastPlayed = {}
export const POLYPHONY_COOLDOWN = Object.freeze({
  criticalHit:     140,
  // 사망 발성 쿨다운은 "같은 프레임 중복 emit 제거"가 목적이지 연사 제한이 아니다.
  // 웨이브가 한꺼번에 녹을 때 같은 발성이 자기 위에 겹쳐 쌓이면 음량만 튀고 뭉개진다.
  // 값은 각 음원 길이보다 짧게(연속 처치가 끊겨 들리지 않게), 한 프레임(16.7ms)보다는
  // 충분히 길게 잡았다. bellow만 예외로 길다 — E06은 드물고 0.82초로 가장 길다.
  zombieDeathGrunt:  50,   // 음원 0.34s
  zombieDeathHeavy:  70,   // 음원 0.60s
  zombieDeathShriek: 45,   // 음원 0.30s, 런크루가 떼로 죽으므로 가장 짧게
  zombieDeathGurgle: 90,   // 음원 0.48s, E04는 동시 사망이 드물다
  zombieDeathBellow: 200,  // 음원 0.82s, 겹치면 가장 지저분해진다
  dogeDeath:        180,
  dogeEscape:       240,
  inuconBite:       180,
  inuconHeal:       500,
  playerHit:        80,
  playerHeal:       220,
  // 조이스틱을 톡톡 끊어 치면 출발 첫 발이 매번 즉시 울린다. 정상 보행 간격(기본 500ms,
  // 이동속도 최대 강화에도 ~385ms)보다 충분히 짧게 잡아 정상 걸음은 건드리지 않고 연타만 막는다.
  playerStep:       140,
  zombieSpawn:      110,
  matildaDash:      400,
  matildaLaugh:     700,
  coinCollect:      40,
  textbookCollect:  55,
  textbookLand:     120,
  chestDrop:        160,
  chestOpen:        320,
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
  compassQuack:     180,
  umbrellaHit:      140,
  eraserHit:        160,
  lanternTick:      120,
  rzlWhistle:       600,
  // 바이키티 커터칼. 무기 공격 간격이 2400ms라 이 값들은 재생 간격을 제한하는 게 아니라
  // 같은 프레임 중복 emit만 걸러내는 안전망이다. 8단 딸깍이 하나도 누락되면 안 된다.
  bikittyCutterFire:   40,
  bikittyCutterSnap:   220,
  bikittyCutterReload: 600,
  // 선긋기. 세 값 모두 "각 음원 길이보다 길게" 잡았다 — 쿨다운이 음원보다 짧으면
  // 같은 소리가 자기 자신 위에 겹쳐 쌓이고, 겹친 순간만 음량이 튀어 뭉개진다.
  // slash 0.48초 음원 / 실제 발사 간격 2.2초 → 120은 같은 프레임 중복만 거른다.
  lineDrawSlash:  120,
  // cross는 한 프레임에 여러 마리가 절단선을 동시에 가로지를 수 있는 유일한 신호다.
  // 34ms는 프레임(≈16.7ms) 두 개분이라 같은 프레임 다중 히트가 확실히 1회로 접히고,
  // 동시에 음원 길이(35ms)와 거의 같아 연속 재생이 겹치지 않고 이어 붙는다.
  // 이보다 길게 잡으면 밀려오는 웨이브가 선을 뚫는 '연속 서걱'이 끊겨 들린다.
  lineDrawCross:  34,
  // 소멸음은 선이 여러 개일 때 동시 만료가 가능하다. 음원 0.22초보다 긴 260ms로
  // 겹침을 원천 차단한다 — 가장 조용해야 할 소리가 겹쳐서 커지면 설계가 무너진다.
  lineDrawExpire: 260,
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
  const stored = getFirebaseStudioRuntimeDataset('sfxTunings')
  return Object.fromEntries(
    Object.keys(SOUND_MAP)
      .filter((id) => stored[id])
      .map((id) => [id, normalizeSfxTuning(stored[id])]),
  )
}

export function loadOptionalSfxTunings() {
  try {
    return loadSfxTunings()
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
  return setFirebaseStudioRuntimeDataset('sfxTunings', next)
}

export function playSfx(id, volume = 1, options = {}) {
  if (!SOUND_MAP[id] || _failed.has(id)) return
  if (!isSfxAllowedForAuthOverlay(id, options.authOverlayActive)) return
  const tuning = normalizeSfxTuning(options.tuningOverride ?? loadOptionalSfxTunings()[id])
  const tunedVolume = clamp(volume * tuning.volume, 0, 1)
  const tunedRate = clamp((options.rate ?? 1) * tuning.rate, 0.5, 2)
  const protectedSfx = isProtectedSfx(id)

  if (!protectedSfx && _activeCombatVoices.size >= combatVoiceCapFor(id)) return

  const cooldown = POLYPHONY_COOLDOWN[id] ?? 0
  if (cooldown > 0) {
    const now = performance.now()
    if (Object.hasOwn(_lastPlayed, id) && now - _lastPlayed[id] < cooldown) return
    _lastPlayed[id] = now
  }

  // Howler는 보이스별 volume을 1 이상으로 올릴 수 없다. 텀블러의 직전
  // 0.70–0.90 타격음을 다시 정확히 2배로 만들기 위해 같은 샘플을 두 보이스로
  // 동시에 재생한다. 각 보이스는 clamp 아래에 남고 합산 gain은 1.40–1.80이다.
  const playbackVoiceCount = id === 'criticalHit' || id === 'tumblerHit' ? 2 : 1

  if (!_cache[id]) {
    const ogg = SOUND_MAP[id]
    const mp3 = ogg.replace('.ogg', '.mp3')
    _cache[id] = new Howl({
      src: [ogg, mp3],   // OGG 우선, 미지원 브라우저는 MP3 fallback
      volume: tunedVolume,
      onloaderror: () => {
        releaseCombatVoicesForLogicalId(id)
        _failed.add(id)
        delete _cache[id]
      },
      onend: (soundId) => releaseCombatVoice(id, soundId),
      onstop: (soundId) => releaseCombatVoice(id, soundId),
      onplayerror: (soundId) => releaseCombatVoice(id, soundId),
    })
  }
  for (let voiceIndex = 0; voiceIndex < playbackVoiceCount; voiceIndex += 1) {
    const soundId = _cache[id].play()
    if (!protectedSfx) _activeCombatVoices.add(combatVoiceKey(id, soundId))
    _cache[id].volume?.(tunedVolume, soundId)
    // Howler retains a cached instance's prior playback rate. Apply the saved
    // value even when it is 1 so an admin reset takes effect on the next play.
    _cache[id].rate?.(tunedRate, soundId)
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
