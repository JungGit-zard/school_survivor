// 2026-11-14 Terry: "너무 너무 저음이거나 무거운 좀비 목소리 다 바꿔".
// 좀비/보스 발성이 다시 공포영화식 저음 그르렁으로 돌아가지 않게 지킨다.
// 마틸다는 별도 생성기(generate_matilda_girl_voice.mjs) 소관이라 여기서 보지 않는다.
import { describe, expect, it } from 'vitest'
import { VOICE_SFX, VOICE_PITCH_SCALE } from './generate_voice_sfx.mjs'
import {
  VOICES,
  ZOMBIE_DEATH_PITCH_SCALE,
  ZOMBIE_VOICE_RULES,
  synthVoice,
} from './generate_zombie_death_voices.mjs'
import { sounds } from './generate_sfx.mjs'

const SR = 22050

const ZOMBIE_VOICE_IDS = [
  'zombieSpawn', 'zombieGroan', 'zombieTankGroan', 'zombieRunnerScreech', 'zombieRangedShoot', 'zombieChargeRoar',
  'bossSpawn', 'bossRoar', 'bossDeath',
]

const specs = [
  ...Object.entries(VOICE_SFX)
    .filter(([, entry]) => entry.zombieVoice)
    .map(([id, entry]) => ({ id, spec: entry.spec, scale: entry.spec.pitchScale ?? VOICE_PITCH_SCALE })),
  ...Object.entries(VOICES).map(([id, spec]) => ({ id, spec, scale: spec.pitchScale ?? ZOMBIE_DEATH_PITCH_SCALE })),
]

function minEffectiveF0({ spec, scale }) {
  const lowest = Math.min(...spec.f0.map(([, hz]) => hz))
  return lowest * scale * (1 - (spec.vib?.depth ?? 0)) * (1 - (spec.jitter ?? 0))
}

// 4차 버터워스 저역통과(120Hz, biquad 2단)로 150Hz 아래 에너지 비율을 근사한다.
function subBassShare(samples) {
  const w = 2 * Math.PI * 120 / SR
  const alpha = Math.sin(w) / (2 * Math.SQRT1_2)
  const cw = Math.cos(w)
  const a0 = 1 + alpha
  const b0 = (1 - cw) / 2 / a0
  const b1 = (1 - cw) / a0
  const a1 = -2 * cw / a0
  const a2 = (1 - alpha) / a0
  let x = Float64Array.from(samples)
  for (let pass = 0; pass < 2; pass++) {
    const y = new Float64Array(x.length)
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0
    for (let i = 0; i < x.length; i++) {
      y[i] = b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2
      x2 = x1; x1 = x[i]; y2 = y1; y1 = y[i]
    }
    x = y
  }
  let low = 0, total = 0
  for (let i = 0; i < samples.length; i++) { low += x[i] * x[i]; total += samples[i] * samples[i] }
  return total > 0 ? low / total : 0
}

describe('좀비/보스 발성 저음·무거움 금지 규칙', () => {
  it('좀비/보스 발성은 전부 규칙 검사 대상으로 등록돼 있다', () => {
    const ids = specs.map((s) => s.id)
    for (const id of ZOMBIE_VOICE_IDS) expect(ids).toContain(id)
    for (const id of Object.keys(VOICES)) expect(ids).toContain(id)
    // zombie*/boss* 이름의 발성을 zombieVoice() 밖에서 추가하면 규칙을 우회하게 된다.
    for (const [id, entry] of Object.entries(VOICE_SFX)) {
      if (/^(zombie|boss)/.test(id)) expect(entry.zombieVoice, id).toBe(true)
    }
    expect(ids.some((id) => /matilda/i.test(id))).toBe(false)
  })

  it.each(specs)('$id: 실효 F0 바닥과 무거운 질감 상한을 지킨다', (entry) => {
    const { spec } = entry
    const R = ZOMBIE_VOICE_RULES
    const floor = minEffectiveF0(entry)
    expect(floor).toBeGreaterThanOrEqual(R.minF0Hz)
    expect(spec.drive ?? 1.6).toBeLessThanOrEqual(R.maxDrive)
    expect(spec.ring?.depth ?? 0).toBeLessThanOrEqual(R.maxRingDepth)
    expect(spec.hold ?? 1).toBeLessThanOrEqual(R.maxHold)
    expect(spec.bits ?? 8).toBeGreaterThanOrEqual(R.minBits)
    // 이미 충분히 높은 비명(러너/쉬리크)만 저역 컷 없이 둔다.
    if (floor < 250) expect(spec.hpHz ?? 0).toBeGreaterThanOrEqual(R.minHpHz)
  })

  it.each(specs)('$id: 합성 결과에 서브베이스(<150Hz)가 5% 이하다', ({ spec, scale }) => {
    const samples = synthVoice({ ...spec, pitchScale: scale })
    expect(subBassShare(samples)).toBeLessThan(0.05)
  })

  it('generate_sfx.mjs에 옛 저음 좀비/보스 발성 프리셋이 되살아나지 않았다', () => {
    for (const id of ZOMBIE_VOICE_IDS) {
      const dir = id === 'bossSpawn' ? 'events' : 'enemies'
      expect(sounds[`${dir}/${id}`], id).toBeUndefined()
    }
  })
})
