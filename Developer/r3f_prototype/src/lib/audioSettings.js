// Player audio volumes (2026-10-28, Terry mobile playtest: "설정에 노래 따로, 효과음 따로").
//
// Two independent 0-100 sliders:
//   music -> every streamingBgm <audio> element (base track volume x music scale)
//   sfx   -> Howler master gain (SFX_MASTER_VOLUME x sfx scale) and the dialogue
//            voice bleeps, which connect straight to the AudioContext destination
//            and so bypass Howler's master gain.
//
// Storage: this tab's memory only, for guests and signed-in players alike.
//   - localStorage is banned project-wide (lib/localStoragePolicy.test.js).
//   - users/{uid}/progress/titleSettings has `$other: false` in database.rules.json and
//     normalizeTitleSettings() drops unknown keys, so an account copy needs a Rules change
//     first. Putting these keys into saveTitleSettings() before that would make every
//     whole-progress cloud save fail validation. Keep them out of titleSettings.
// There was no earlier single volume/mute setting to migrate.
//
// Dependency-free on purpose: streamingBgm, sfxRegistry and dialogueVoice subscribe here,
// so nothing in the audio layer imports another audio module through this file.

export const AUDIO_VOLUME_MIN = 0
export const AUDIO_VOLUME_MAX = 100
export const DEFAULT_MUSIC_VOLUME = 100
export const DEFAULT_SFX_VOLUME = 100

let musicVolume = DEFAULT_MUSIC_VOLUME
let sfxVolume = DEFAULT_SFX_VOLUME
const listeners = new Set()

export function normalizeAudioVolume(value, fallback = AUDIO_VOLUME_MAX) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.round(Math.min(AUDIO_VOLUME_MAX, Math.max(AUDIO_VOLUME_MIN, number)))
}

export function getAudioVolumes() {
  return { musicVolume, sfxVolume }
}

// 0..1 multipliers for the playback layers.
export function getMusicVolumeScale() {
  return musicVolume / AUDIO_VOLUME_MAX
}

export function getSfxVolumeScale() {
  return sfxVolume / AUDIO_VOLUME_MAX
}

function notify() {
  const snapshot = getAudioVolumes()
  for (const listener of [...listeners]) {
    try { listener(snapshot) } catch { /* audio must never throw into UI */ }
  }
}

export function setMusicVolume(value) {
  const next = normalizeAudioVolume(value, musicVolume)
  if (next === musicVolume) return
  musicVolume = next
  notify()
}

export function setSfxVolume(value) {
  const next = normalizeAudioVolume(value, sfxVolume)
  if (next === sfxVolume) return
  sfxVolume = next
  notify()
}

export function onAudioVolumesChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function _resetAudioSettingsForTests() {
  musicVolume = DEFAULT_MUSIC_VOLUME
  sfxVolume = DEFAULT_SFX_VOLUME
  notify()
}
