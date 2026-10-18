import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let context, oscillators
const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: param(), detune: param(), gain: param(), Q: param() })
async function load(state = 'running') {
  oscillators = []
  context = { state, currentTime: 0, destination: {}, resume: vi.fn(() => Promise.resolve().then(() => { context.state = 'running' })),
    createGain: () => node(), createBiquadFilter: () => node(), createOscillator: () => { const n = node(); oscillators.push(n); return n } }
  vi.stubGlobal('window', { AudioContext: function () { return context } })
  return import('./dialogueVoice.js')
}
beforeEach(() => { vi.resetModules(); vi.useFakeTimers() })
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('dialogue voice lifecycle', () => {
  it('captures each voiced glyph index, preserving the per-glyph pitch contour', async () => {
    const { playDialogueVoice } = await load()
    playDialogueVoice('가가가')
    await vi.runAllTimersAsync()
    const frequencies = oscillators.map(n => n.frequency.setValueAtTime.mock.calls[0][0])
    expect(new Set(frequencies).size).toBe(3)
  })
  it('does not let an old disposer cancel a newer utterance', async () => {
    const { playDialogueVoice } = await load()
    const oldStop = playDialogueVoice('가')
    playDialogueVoice('나나')
    oldStop()
    await vi.runAllTimersAsync()
    expect(oscillators).toHaveLength(2)
  })
  it('waits for asynchronous unlock instead of dropping elapsed glyphs', async () => {
    const { playDialogueVoice } = await load('suspended')
    let unlock
    context.resume.mockImplementation(() => new Promise(resolve => { unlock = () => { context.state = 'running'; resolve() } }))
    playDialogueVoice('가나')
    await vi.advanceTimersByTimeAsync(300)
    expect(oscillators).toHaveLength(0)
    unlock()
    await vi.runAllTimersAsync()
    expect(oscillators).toHaveLength(2)
  })
  it('contains unlock rejection and allows a later utterance retry', async () => {
    const { playDialogueVoice } = await load('suspended')
    context.resume.mockRejectedValueOnce(new Error('autoplay denied'))
    playDialogueVoice('가')
    await vi.runAllTimersAsync()
    expect(oscillators).toHaveLength(0)
    playDialogueVoice('나')
    await vi.runAllTimersAsync()
    expect(oscillators).toHaveLength(1)
  })
  it('cannot resurrect a cancelled utterance after unlock resolves', async () => {
    const { playDialogueVoice } = await load('suspended')
    let unlock
    context.resume.mockImplementation(() => new Promise(resolve => { unlock = () => { context.state = 'running'; resolve() } }))
    const stop = playDialogueVoice('가나')
    stop(); unlock()
    await vi.runAllTimersAsync()
    expect(oscillators).toHaveLength(0)
  })
  it('treats constructor and oscillator failures as optional silent feedback', async () => {
    const { playDialogueVoice } = await load()
    context.createOscillator = () => { throw new Error('device lost') }
    playDialogueVoice('가')
    await expect(vi.runAllTimersAsync()).resolves.not.toThrow()
  })
})
