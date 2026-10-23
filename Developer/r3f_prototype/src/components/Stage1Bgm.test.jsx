// @vitest-environment jsdom
import React, { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import Stage1Bgm from './Stage1Bgm.jsx'

const mocks = vi.hoisted(() => ({ Howl: vi.fn(), instances: [] }))
vi.mock('howler', () => ({ Howl: mocks.Howl }))
let root, container
let props
function render(next = {}, strict = false) {
  props = { ...props, ...next }
  if (!root) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  }
  act(() => root.render(strict ? <StrictMode><Stage1Bgm {...props} /></StrictMode> : <Stage1Bgm {...props} />))
  return mocks.instances.at(-1)
}
function gesture() { act(() => window.dispatchEvent(new Event('pointerdown'))) }
function visibility(value) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value })
  act(() => document.dispatchEvent(new Event('visibilitychange')))
}
beforeEach(() => {
  props = { stageId: 'stage1', phase: 'playing', gameKey: 1 }
  mocks.instances.length = 0
  mocks.Howl.mockReset()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  mocks.Howl.mockImplementation(function (config) {
    const audio = { config, play: vi.fn(() => 7), pause: vi.fn(), stop: vi.fn(), unload: vi.fn(), state: vi.fn(() => 'loaded'), load: vi.fn() }
    mocks.instances.push(audio)
    return audio
  })
})
afterEach(() => {
  if (root) act(() => root.unmount())
  root = null
  container?.remove()
  vi.restoreAllMocks()
})
describe('owner Stage1 gameplay CDN BGM', () => {
  it('streams the exact owner-selected CDN asset, without client audio imports', () => {
    const audio = render()
    expect(audio.config).toMatchObject({ src: ['https://music.escapezombie.com/zombie_3rd.mp3'], format: ['mp3'], html5: true, loop: true, volume: 0.5 })
    expect(audio.play).toHaveBeenCalledOnce()
  })
  it('streams the second owner attachment only for Stage2', () => {
    const audio = render({ stageId: 'stage2' })
    expect(audio.config).toMatchObject({ src: ['https://music.escapezombie.com/zombie_2nd.mp3'], format: ['mp3'], html5: true, loop: true, volume: 0.5 })
    expect(audio.play).toHaveBeenCalledOnce()
  })
  it('unloads and replaces the stream when moving directly between Stage1 and Stage2', () => {
    const first = render()
    act(() => first.config.onplay(7))
    const second = render({ stageId: 'stage2' })
    expect(first.stop).toHaveBeenCalledOnce()
    expect(first.unload).toHaveBeenCalledOnce()
    expect(second).not.toBe(first)
    expect(second.config.src).toEqual(['https://music.escapezombie.com/zombie_2nd.mp3'])
    const third = render({ stageId: 'stage1' })
    expect(second.unload).toHaveBeenCalledOnce()
    expect(third.config.src).toEqual(['https://music.escapezombie.com/zombie_3rd.mp3'])
  })
  it.each(['stage3','stage4','stage5','stage6','stage7','stage8','stage9','stage10',undefined])('creates no audio for %s', stageId => {
    render({ stageId })
    expect(mocks.Howl).not.toHaveBeenCalled()
  })
  it('does not duplicate pending or playing voices on gestures', () => {
    const audio = render()
    gesture(); gesture()
    expect(audio.play).toHaveBeenCalledOnce()
    act(() => audio.config.onplay(7))
    gesture()
    expect(audio.play).toHaveBeenCalledOnce()
  })
  it.each(['paused','levelup'])('pauses for %s and resumes the same voice without recreation', phase => {
    const audio = render()
    act(() => audio.config.onplay(7))
    render({ phase }); gesture()
    expect(audio.pause).toHaveBeenCalled()
    expect(audio.play).toHaveBeenCalledOnce()
    render({ phase: 'playing' })
    expect(mocks.Howl).toHaveBeenCalledOnce()
    expect(audio.play).toHaveBeenLastCalledWith(7)
  })
  it('does not start during an initial pause', () => {
    const audio = render({ phase: 'paused' })
    gesture()
    expect(audio.play).not.toHaveBeenCalled()
    render({ phase: 'playing' })
    expect(audio.play).toHaveBeenCalledOnce()
  })
  it.each(['gameover','cleared'])('stops and unloads on %s with no gesture restart', phase => {
    const audio = render()
    render({ phase }); gesture()
    expect(audio.stop).toHaveBeenCalledOnce()
    expect(audio.unload).toHaveBeenCalledOnce()
    expect(audio.play).toHaveBeenCalledOnce()
  })
  it('releases the Stage1 song on stage change and resets on a fresh run', () => {
    const first = render()
    render({ gameKey: 2 })
    expect(first.unload).toHaveBeenCalledOnce()
    const second = mocks.instances.at(-1)
    render({ stageId: 'stage3' })
    expect(second.unload).toHaveBeenCalledOnce()
    expect(mocks.instances).toHaveLength(2)
  })
  it('pauses when hidden, resumes only if playing, and prevents late playback while paused', () => {
    const audio = render()
    visibility('hidden'); gesture()
    expect(audio.pause).toHaveBeenCalled()
    expect(audio.play).toHaveBeenCalledOnce()
    visibility('visible')
    expect(audio.play).toHaveBeenCalledTimes(2)
    render({ phase: 'paused' })
    audio.pause.mockClear()
    act(() => audio.config.onplay(7))
    expect(audio.pause).toHaveBeenCalledOnce()
    visibility('hidden'); visibility('visible'); gesture()
    expect(audio.play).toHaveBeenCalledTimes(2)
  })
  it('retries autoplay/load errors only on a later gesture and never blocks gameplay', () => {
    const audio = render()
    act(() => audio.config.onplayerror())
    gesture()
    expect(audio.play).toHaveBeenCalledTimes(2)
    audio.state.mockReturnValue('unloaded')
    act(() => audio.config.onloaderror())
    gesture()
    expect(audio.load).toHaveBeenCalledOnce()
    expect(audio.play).toHaveBeenCalledTimes(3)
  })
  it('tolerates construction/play failure without throwing', () => {
    mocks.Howl.mockImplementationOnce(function () { throw new Error('unavailable') })
    expect(() => render()).not.toThrow()
  })
  it('releases handlers and ignores stale callbacks after unmount', () => {
    const audio = render()
    act(() => root.unmount()); root = null
    gesture(); visibility('visible'); audio.config.onplay(7); audio.config.onplayerror()
    expect(audio.stop).toHaveBeenCalledOnce()
    expect(audio.unload).toHaveBeenCalledOnce()
    expect(audio.play).toHaveBeenCalledOnce()
  })
  it('cleans the StrictMode rehearsal instance', () => {
    render({}, true)
    expect(mocks.instances).toHaveLength(2)
    expect(mocks.instances[0].unload).toHaveBeenCalledOnce()
    expect(mocks.instances[1].unload).not.toHaveBeenCalled()
  })
  it('is connected only within the gameplay screen using the live stage/phase/run', () => {
    const source = readFileSync(new NodeURL('./GameplayScreen.jsx', import.meta.url), 'utf8')
    expect(source).toContain("import Stage1Bgm from './Stage1Bgm.jsx'")
    expect(source).toContain('<Stage1Bgm stageId={currentStageId} phase={phase} gameKey={gameKey} />')
  })
})
