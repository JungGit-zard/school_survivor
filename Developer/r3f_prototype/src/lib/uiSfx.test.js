// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { subscribeSfx } from './sfxEvents.js'
import { POLYPHONY_COOLDOWN, SOUND_MAP } from './sfxRegistry.js'
import {
  UI_SFX,
  UI_SFX_KINDS,
  emitUiSfx,
  installUiSfxListener,
  resolveUiSfxKind,
} from './uiSfx.js'

describe('UI gag sound map', () => {
  it('maps every kind to a registered gag sound with a quiet, valid rate/volume and a cooldown', () => {
    expect(UI_SFX_KINDS.length).toBeGreaterThanOrEqual(12)
    for (const kind of UI_SFX_KINDS) {
      const { id, rate, volume } = UI_SFX[kind]
      expect(SOUND_MAP[id], `${kind} → ${id} registered`).toBeTruthy()
      expect(id.startsWith('gag'), `${kind} uses a gag sound`).toBe(true)
      expect(rate, `${kind} rate`).toBeGreaterThanOrEqual(0.5)
      expect(rate, `${kind} rate`).toBeLessThanOrEqual(2)
      // 연타해도 거슬리지 않게 UI는 전부 0.5 이하.
      expect(volume, `${kind} volume`).toBeGreaterThan(0)
      expect(volume, `${kind} volume`).toBeLessThanOrEqual(0.5)
      expect(POLYPHONY_COOLDOWN[id], `${kind} → ${id} has a cooldown`).toBeGreaterThan(0)
    }
  })

  it('covers the required UI action kinds', () => {
    for (const kind of ['tap', 'confirm', 'open', 'close', 'select', 'toggleOn', 'toggleOff', 'slider', 'denied', 'purchase', 'cardPick', 'advance']) {
      expect(UI_SFX_KINDS).toContain(kind)
    }
    expect(UI_SFX.denied.id).toBe('gagWahWah')
    expect(UI_SFX.purchase.id).toBe('gagBuffSparkle')
  })

  it('emits the mapped sound with the ui flag and ignores none/unknown kinds', () => {
    const events = []
    const off = subscribeSfx((event) => events.push(event))
    try {
      emitUiSfx('open')
      emitUiSfx('none')
      emitUiSfx('nope')
    } finally { off() }
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ id: UI_SFX.open.id, rate: UI_SFX.open.rate, volume: UI_SFX.open.volume, ui: true })
  })
})

describe('resolveUiSfxKind', () => {
  const el = (html) => {
    const host = document.createElement('div')
    host.innerHTML = html
    return host.firstElementChild
  }

  it('infers kinds from standard attributes', () => {
    expect(resolveUiSfxKind(el('<button>Go</button>'))).toBe('tap')
    expect(resolveUiSfxKind(el('<button aria-pressed="false">A</button>'))).toBe('select')
    expect(resolveUiSfxKind(el('<button role="tab">A</button>'))).toBe('select')
    expect(resolveUiSfxKind(el('<button aria-expanded="false">menu</button>'))).toBe('open')
    expect(resolveUiSfxKind(el('<button aria-expanded="true">menu</button>'))).toBe('close')
    expect(resolveUiSfxKind(el('<button>×</button>'))).toBe('close')
    expect(resolveUiSfxKind(el('<button role="switch" aria-checked="false">x</button>'))).toBe('toggleOn')
    expect(resolveUiSfxKind(el('<button role="switch" aria-checked="true">x</button>'))).toBe('toggleOff')
    expect(resolveUiSfxKind(el('<input type="range" />'))).toBe('slider')
    expect(resolveUiSfxKind(el('<button data-ui-sfx="purchase">buy</button>'))).toBe('purchase')
    expect(resolveUiSfxKind(el('<button data-ui-sfx="none">start</button>'))).toBeNull()
    expect(resolveUiSfxKind(el('<button data-ui-sfx="bogus">x</button>'))).toBe('tap')
  })
})

describe('installUiSfxListener (delegated root listener)', () => {
  let host
  let events
  let off
  let uninstall

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    events = []
    off = subscribeSfx((event) => events.push(event))
    uninstall = installUiSfxListener(document)
  })

  afterEach(() => {
    uninstall()
    off()
    host.remove()
  })

  const ids = () => events.map((event) => event.id)
  const click = (node) => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  const pointerUp = (node) => {
    const event = new Event('pointerup', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'button', { value: 0 })
    node.dispatchEvent(event)
  }

  it('plays the default tap for an un-annotated button, even when the click lands on a child', () => {
    host.innerHTML = '<button type="button"><span id="inner">Start</span></button>'
    click(host.querySelector('#inner'))
    expect(ids()).toEqual([UI_SFX.tap.id])
    expect(events[0].ui).toBe(true)
  })

  it('honours a data-ui-sfx override', () => {
    host.innerHTML = '<button type="button" data-ui-sfx="close">Back</button>'
    click(host.querySelector('button'))
    expect(ids()).toEqual([UI_SFX.close.id])
    expect(events[0].rate).toBe(UI_SFX.close.rate)
  })

  it('plays nothing for data-ui-sfx="none" (elements with their own special sound)', () => {
    host.innerHTML = '<section data-ui-sfx="none"><div id="card">card</div><button type="button" data-ui-sfx="none">Enter</button></section>'
    click(host.querySelector('#card'))
    click(host.querySelector('button'))
    expect(ids()).toEqual([])
  })

  it('plays nothing for a disabled control that is not marked denied', () => {
    host.innerHTML = '<button type="button" disabled>MAX</button><button type="button" aria-disabled="true">busy</button>'
    for (const button of host.querySelectorAll('button')) {
      click(button)
      pointerUp(button)
    }
    expect(ids()).toEqual([])
  })

  it('plays the denied trombone for disabled controls marked denied (locked card / not enough coins)', () => {
    host.innerHTML = '<button type="button" disabled data-ui-sfx="denied">Locked</button>'
    // A real disabled button never receives click; the pointerup path carries the denied sound.
    pointerUp(host.querySelector('button'))
    expect(ids()).toEqual([UI_SFX.denied.id])
  })

  it('plays denied on click for aria-disabled denied elements and for the locked card area', () => {
    host.innerHTML = '<button type="button" aria-disabled="true" data-ui-sfx="denied">locked outfit</button>'
      + '<section data-ui-sfx="denied"><div id="lock-art">lock</div></section>'
    click(host.querySelector('button'))
    expect(ids()).toEqual([UI_SFX.denied.id])
    events.length = 0
    // gagWahWah has a 450ms registry cooldown, but the event bus itself always emits.
    click(host.querySelector('#lock-art'))
    expect(ids()).toEqual([UI_SFX.denied.id])
  })

  it('does not play denied from pointerup on enabled elements (click already covers them)', () => {
    host.innerHTML = '<button type="button" data-ui-sfx="denied">x</button>'
    pointerUp(host.querySelector('button'))
    expect(ids()).toEqual([])
  })

  it('reports toggle direction for checkboxes and ticks for range sliders', () => {
    host.innerHTML = '<input id="cb" type="checkbox" /><input id="vol" type="range" min="0" max="100" value="50" />'
    const checkbox = host.querySelector('#cb')
    checkbox.click() // jsdom flips checked before dispatching click, like browsers
    checkbox.click()
    const range = host.querySelector('#vol')
    range.value = '55'
    range.dispatchEvent(new Event('input', { bubbles: true }))
    click(range)
    expect(ids()).toEqual([UI_SFX.toggleOn.id, UI_SFX.toggleOff.id, UI_SFX.slider.id])
    expect(events[0].rate).toBe(UI_SFX.toggleOn.rate)
    expect(events[2].rate).toBe(UI_SFX.slider.rate)
  })

  it('ignores non-UI surfaces like the game canvas / joystick layer', () => {
    host.innerHTML = '<canvas id="game"></canvas><div id="joystick"></div>'
    click(host.querySelector('#game'))
    click(host.querySelector('#joystick'))
    pointerUp(host.querySelector('#game'))
    expect(ids()).toEqual([])
  })

  it('stops listening after uninstall', () => {
    uninstall()
    host.innerHTML = '<button type="button">x</button>'
    click(host.querySelector('button'))
    expect(ids()).toEqual([])
    uninstall = () => {}
  })
})
