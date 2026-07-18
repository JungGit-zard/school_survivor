// Animalese-style dialogue voice synthesis for ESZS.
//
// This intentionally does not copy or sample Animal Crossing / Nintendo audio.
// It uses short original WebAudio oscillator bleeps scheduled per Korean grapheme,
// following soundmini's handoff: protagonist = lower/tense, Matilda = high/mocking.

const ACTIVE_TIMERS = new Set()
const ACTIVE_NODES = new Set()
let audioContext = null

export const DIALOGUE_VOICE_PROFILES = Object.freeze({
  protagonistIntro: Object.freeze({
    waveform: 'triangle',
    baseFrequency: 315,
    semitonePattern: [-2, 0, 2, 4, 0, -1],
    detuneCents: 14,
    glyphMs: 52,
    durationMs: 48,
    gain: 0.045,
    attackMs: 3,
    releaseMs: 28,
    filterType: 'lowpass',
    filterFrequency: 1900,
    highpassFrequency: 190,
    punctuationPauseMs: 135,
    sentencePauseMs: 210,
  }),
  protagonistUrgent: Object.freeze({
    waveform: 'triangle',
    baseFrequency: 360,
    semitonePattern: [0, 3, 5, 2, 7, 4],
    detuneCents: 16,
    glyphMs: 47,
    durationMs: 48,
    gain: 0.052,
    attackMs: 3,
    releaseMs: 26,
    filterType: 'lowpass',
    filterFrequency: 2150,
    highpassFrequency: 210,
    punctuationPauseMs: 115,
    sentencePauseMs: 190,
  }),
  matilda: Object.freeze({
    waveform: 'triangle',
    overtoneWaveform: 'square',
    overtoneGain: 0.18,
    baseFrequency: 720,
    semitonePattern: [7, 5, 7, 10, 3, 8, 5, 0],
    detuneCents: 28,
    glyphMs: 46,
    durationMs: 58,
    gain: 0.041,
    attackMs: 2,
    releaseMs: 24,
    filterType: 'bandpass',
    filterFrequency: 1350,
    filterQ: 1.15,
    punctuationPauseMs: 100,
    sentencePauseMs: 165,
    vibratoRate: 8.5,
    vibratoDepthCents: 20,
  }),
})

export function segmentDialogueText(text) {
  const value = String(text ?? '')
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('ko', { granularity: 'grapheme' })
    return Array.from(segmenter.segment(value), (part) => part.segment)
  }
  return Array.from(value)
}

export function isSilentDialogueGlyph(glyph) {
  return /^\s$/.test(glyph) || /^[,，.。…!！?？:;~]$/.test(glyph)
}

export function getDialogueGlyphDelay(glyph, profile) {
  if (/^[.。…!！?？]$/.test(glyph)) return profile.sentencePauseMs ?? 180
  if (/^[,，:;~]$/.test(glyph)) return profile.punctuationPauseMs ?? 110
  if (/^\s$/.test(glyph)) return Math.round((profile.glyphMs ?? 50) * 0.85)
  return profile.glyphMs ?? 50
}

export function getDialogueVoiceProfile(profileName, text = '') {
  if (profileName === 'protagonistIntro') {
    const urgent = /빠져나가야겠어|좀비학교다|!/.test(text)
    return urgent ? DIALOGUE_VOICE_PROFILES.protagonistUrgent : DIALOGUE_VOICE_PROFILES.protagonistIntro
  }
  return DIALOGUE_VOICE_PROFILES[profileName] ?? DIALOGUE_VOICE_PROFILES.protagonistIntro
}

export function playDialogueVoice(text, profileName = 'protagonistIntro', options = {}) {
  stopDialogueVoice()
  const profile = getDialogueVoiceProfile(profileName, text)
  const context = getAudioContext()
  if (!context) return () => {}
  if (context.state === 'suspended') void context.resume?.()

  const glyphs = segmentDialogueText(text)
  const volume = clamp(Number(options.volume ?? 1), 0, 1.5)
  let cursorMs = Math.max(0, Number(options.delayMs ?? 0))
  let voicedIndex = 0

  glyphs.forEach((glyph) => {
    const delayMs = getDialogueGlyphDelay(glyph, profile)
    if (!isSilentDialogueGlyph(glyph)) {
      const timer = setTimeout(() => {
        ACTIVE_TIMERS.delete(timer)
        playGlyphBleep(context, profile, glyph, voicedIndex, volume)
      }, cursorMs)
      ACTIVE_TIMERS.add(timer)
      voicedIndex += 1
    }
    cursorMs += delayMs
  })

  return stopDialogueVoice
}

export function stopDialogueVoice() {
  ACTIVE_TIMERS.forEach((timer) => clearTimeout(timer))
  ACTIVE_TIMERS.clear()
  ACTIVE_NODES.forEach((node) => {
    try { node.stop?.() } catch {}
    try { node.disconnect?.() } catch {}
  })
  ACTIVE_NODES.clear()
}

function getAudioContext() {
  if (audioContext) return audioContext
  if (typeof window === 'undefined') return null
  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContextCtor) return null
  audioContext = new AudioContextCtor()
  return audioContext
}

function playGlyphBleep(context, profile, glyph, index, volume) {
  const now = context.currentTime
  const baseFrequency = profile.baseFrequency ?? 320
  const pattern = profile.semitonePattern ?? [0]
  const semitone = pattern[index % pattern.length]
  const charBias = getGlyphPitchBias(glyph)
  const jitter = deterministicJitter(glyph, index, profile.detuneCents ?? 12) / 100
  const frequency = baseFrequency * (2 ** ((semitone + charBias + jitter) / 12))

  const duration = (profile.durationMs ?? 48) / 1000
  const attack = (profile.attackMs ?? 3) / 1000
  const release = (profile.releaseMs ?? 24) / 1000
  const gainAmount = (profile.gain ?? 0.04) * volume

  const master = context.createGain()
  const filter = context.createBiquadFilter()
  filter.type = profile.filterType ?? 'lowpass'
  filter.frequency.setValueAtTime(profile.filterFrequency ?? 1800, now)
  if (profile.filterQ) filter.Q.setValueAtTime(profile.filterQ, now)

  let output = filter
  if (profile.highpassFrequency) {
    const highpass = context.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.setValueAtTime(profile.highpassFrequency, now)
    highpass.connect(filter)
    output = highpass
  }

  const oscillator = context.createOscillator()
  oscillator.type = profile.waveform ?? 'triangle'
  oscillator.frequency.setValueAtTime(frequency, now)
  applyVibrato(context, oscillator, profile, now, duration)
  oscillator.connect(output)

  if (profile.overtoneWaveform && profile.overtoneGain > 0) {
    const overtone = context.createOscillator()
    const overtoneGain = context.createGain()
    overtone.type = profile.overtoneWaveform
    overtone.frequency.setValueAtTime(frequency * 2, now)
    overtoneGain.gain.setValueAtTime(gainAmount * profile.overtoneGain, now)
    overtone.connect(overtoneGain)
    overtoneGain.connect(output)
    startAndTrack(overtone, now, duration + release)
  }

  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainAmount), now + attack)
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration + release)

  filter.connect(master)
  master.connect(context.destination)
  startAndTrack(oscillator, now, duration + release)
  setTimeout(() => {
    try { master.disconnect() } catch {}
    try { filter.disconnect() } catch {}
    try { output.disconnect?.() } catch {}
  }, Math.ceil((duration + release) * 1000) + 40)
}

function applyVibrato(context, oscillator, profile, now, duration) {
  if (!profile.vibratoRate || !profile.vibratoDepthCents) return
  const vibrato = context.createOscillator()
  const vibratoGain = context.createGain()
  vibrato.type = 'sine'
  vibrato.frequency.setValueAtTime(profile.vibratoRate, now)
  vibratoGain.gain.setValueAtTime(profile.vibratoDepthCents, now)
  vibrato.connect(vibratoGain)
  vibratoGain.connect(oscillator.detune)
  startAndTrack(vibrato, now, duration)
}

function startAndTrack(node, now, duration) {
  ACTIVE_NODES.add(node)
  node.start(now)
  node.stop(now + duration)
  node.onended = () => {
    ACTIVE_NODES.delete(node)
    try { node.disconnect?.() } catch {}
  }
}

function getGlyphPitchBias(glyph) {
  if (/[아야여요유이]/.test(glyph)) return 1.5
  if (/[오우으]/.test(glyph)) return -1
  if (/[하호히]/.test(glyph)) return 2.5
  return 0
}

function deterministicJitter(glyph, index, cents) {
  const code = glyph.codePointAt(0) ?? 0
  const raw = ((code * 31 + index * 17) % 200) / 100 - 1
  return raw * cents
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
}
