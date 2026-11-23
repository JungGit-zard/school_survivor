// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InstancedBufferGeometry, ShaderMaterial } from 'three'

const fiberMock = vi.hoisted(() => ({
  frames: [],
  size: { width: 390, height: 844 },
}))

vi.mock('@react-three/fiber', () => ({
  useThree: (selector) => selector({
    size: fiberMock.size,
    get: () => ({ size: fiberMock.size }),
  }),
  useFrame: (callback) => {
    fiberMock.frames.push(callback)
  },
}))

const {
  default: TitleSnow,
  createTitleSnow,
  drawSnowflakeAtlas,
  titleSnowCount,
  TITLE_SNOW_COUNT_PHONE,
  TITLE_SNOW_COUNT_REDUCED,
  TITLE_SNOW_COUNT_WIDE,
} = await import('./TitleSnow.jsx')

const noCanvas = () => null

describe('title snow (2026-11-24, spinning six-armed crystals)', () => {
  afterEach(() => {
    fiberMock.frames = []
    fiberMock.size = { width: 390, height: 844 }
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('keeps phone flake count in the 60-120 budget and fewer for reduced motion', () => {
    expect(titleSnowCount({ width: 390, height: 844 })).toBe(TITLE_SNOW_COUNT_PHONE)
    expect(titleSnowCount({ width: 1280, height: 800 })).toBe(TITLE_SNOW_COUNT_WIDE)
    expect(titleSnowCount({ width: 390, height: 844, reducedMotion: true })).toBe(TITLE_SNOW_COUNT_REDUCED)
    for (const count of [TITLE_SNOW_COUNT_PHONE, TITLE_SNOW_COUNT_WIDE]) {
      expect(count).toBeGreaterThanOrEqual(60)
      expect(count).toBeLessThanOrEqual(120)
    }
    expect(TITLE_SNOW_COUNT_REDUCED).toBeLessThan(TITLE_SNOW_COUNT_PHONE)
  })

  it('builds a single instanced mesh (one draw call) with per-flake motion attributes', () => {
    const snow = createTitleSnow({ count: 80, createCanvas: noCanvas })
    expect(snow.geometry).toBeInstanceOf(InstancedBufferGeometry)
    expect(snow.geometry.instanceCount).toBe(80)
    expect(snow.geometry.getAttribute('aSeed').count).toBe(80)
    expect(snow.geometry.getAttribute('aMotion').count).toBe(80)
    expect(snow.geometry.getAttribute('aSway').count).toBe(80)
    expect(snow.material).toBeInstanceOf(ShaderMaterial)
    expect(snow.material.transparent).toBe(true)
    expect(snow.material.depthWrite).toBe(false)
    expect(snow.mesh.frustumCulled).toBe(false)
    // 결정 종류 4가지, 크기·속도·자전이 제각각이다.
    const seed = snow.geometry.getAttribute('aSeed').array
    const motion = snow.geometry.getAttribute('aMotion').array
    const variants = new Set()
    const sizes = new Set()
    let clockwise = 0
    for (let i = 0; i < 80; i += 1) {
      variants.add(seed[i * 4 + 3])
      sizes.add(Math.round(motion[i * 4 + 1]))
      if (motion[i * 4 + 2] < 0) clockwise += 1
      expect(Math.abs(motion[i * 4 + 2])).toBeGreaterThan(0)
    }
    expect(variants.size).toBe(4)
    expect(sizes.size).toBeGreaterThan(8)
    expect(clockwise).toBeGreaterThan(0)
    expect(clockwise).toBeLessThan(80)
    snow.dispose()
  })

  it('drives motion through one time uniform and disposes every GPU resource', () => {
    const snow = createTitleSnow({ count: 10, createCanvas: noCanvas })
    snow.setTime(12.5)
    snow.setViewport(390, 844)
    expect(snow.material.uniforms.uTime.value).toBe(12.5)
    expect(snow.material.uniforms.uViewport.value.toArray()).toEqual([390, 844])
    const spies = [
      vi.spyOn(snow.geometry, 'dispose'),
      vi.spyOn(snow.material, 'dispose'),
      vi.spyOn(snow.texture, 'dispose'),
    ]
    snow.dispose()
    spies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1))
  })

  it('draws the crystal atlas on a 2D canvas when one is available', () => {
    const calls = { stroke: 0, rotate: 0 }
    const ctx = new Proxy({}, {
      get: (target, key) => {
        if (key in target) return target[key]
        if (key === 'stroke') return () => { calls.stroke += 1 }
        if (key === 'rotate') return () => { calls.rotate += 1 }
        return () => {}
      },
      set: (target, key, value) => { target[key] = value; return true },
    })
    const canvas = { getContext: () => ctx }
    expect(drawSnowflakeAtlas(canvas)).toBe(true)
    expect(canvas.width).toBe(256)
    expect(canvas.height).toBe(256)
    // 결정 4종 × (외곽선 + 흰 선) = 8번 긋고, 6갈래라 종류마다 회전이 6의 배수만큼 일어난다.
    expect(calls.stroke).toBe(8)
    expect(calls.rotate % 6).toBe(0)
    expect(calls.rotate).toBeGreaterThanOrEqual(48)
    expect(drawSnowflakeAtlas({ getContext: () => null })).toBe(false)
  })

  async function mountSnow(props) {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    // react-dom은 R3F의 <primitive> 태그를 모른다는 경고만 낸다 — 이 테스트에선 무시.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const disposeSpy = vi.spyOn(ShaderMaterial.prototype, 'dispose')
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(<TitleSnow {...props} />)
    })
    return { container, root, disposeSpy }
  }

  it('mounts as one primitive, animates only via useFrame, and disposes on unmount', async () => {
    const { container, root, disposeSpy } = await mountSnow({})
    expect(container.querySelectorAll('primitive')).toHaveLength(1)
    expect(fiberMock.frames.length).toBeGreaterThan(0)
    fiberMock.frames.at(-1)({ clock: { elapsedTime: 3.25 } })
    expect(disposeSpy).not.toHaveBeenCalled()
    act(() => root.unmount())
    expect(disposeSpy).toHaveBeenCalledTimes(1)
    const material = disposeSpy.mock.contexts[0]
    expect(material.uniforms.uTime.value).toBe(3.25)
    expect(material.uniforms.uViewport.value.toArray()).toEqual([390, 844])
    expect(container.querySelector('primitive')).toBeNull()
  })

  it('keeps flakes still when reduced motion is on', async () => {
    const { root, disposeSpy } = await mountSnow({ reducedMotion: true })
    fiberMock.frames.at(-1)({ clock: { elapsedTime: 9 } })
    act(() => root.unmount())
    const material = disposeSpy.mock.contexts[0]
    expect(material.uniforms.uTime.value).toBe(0)
  })
})
