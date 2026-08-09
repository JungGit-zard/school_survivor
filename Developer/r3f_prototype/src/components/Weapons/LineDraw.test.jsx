import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  buildLineDrawTrailGeometry,
  LINE_DRAW_TRAIL_LENGTH,
  LINE_DRAW_TRAIL_WIDTH,
} from './LineDraw.jsx'

// 모델 함수 본문만 잘라낸다. 이펙트의 depthWrite:false는 정상이므로 함께 검사하면 안 된다.
function readLineDrawSource() {
  return readFileSync(new URL('./LineDraw.jsx', import.meta.url), 'utf8')
}

function sliceModelSource(source) {
  const start = source.indexOf('export function LineDrawModel')
  const end = source.indexOf('// ─── 절단선 이펙트')
  return { start, end, body: source.slice(start, end) }
}

describe('LineDrawModel source', () => {
  it('never disables depth on the weapon body materials', () => {
    const source = readLineDrawSource()
    const { start, end, body } = sliceModelSource(source)

    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(body).toContain('<StudioTunedGroup itemId="weapon-line-draw">')
    // depth를 끄면 파트별 머티리얼 정렬이 z까지 가지 않아 JSX 선언 순서가 가림을
    // 결정하고 모델이 깨진다(2026-08-09 주인공 깨짐 회귀).
    expect(body).not.toContain('depthTest')
    expect(body).not.toContain('depthWrite')
    // 아웃라인 메시는 inflateScale로 감싼 inverted hull이어야 한다.
    expect(body).toContain('material={outMat}')
    expect(body).toContain('inflateScale(')
  })

  it('keeps the additive effect materials depth-write free (BoxCutter 정본 패턴)', () => {
    const source = readLineDrawSource()
    const effect = source.slice(source.indexOf('// ─── 절단선 이펙트'))

    expect(effect).toContain('THREE.AdditiveBlending')
    expect(effect).toContain('depthWrite: false')
    expect(effect).toContain('flashAt(')
  })
})

describe('LineDraw cut-line trail geometry', () => {
  it('rebuilds the trail geometry length from the prop', () => {
    const base = buildLineDrawTrailGeometry()
    expect(base.parameters.height).toBeCloseTo(LINE_DRAW_TRAIL_LENGTH, 6)
    expect(base.parameters.height).toBeCloseTo(6, 6)
    expect(base.parameters.width).toBeCloseTo(LINE_DRAW_TRAIL_WIDTH, 6)

    const short = buildLineDrawTrailGeometry(2.5, 0.3)
    expect(short.parameters.height).toBeCloseTo(2.5, 6)
    expect(short.parameters.width).toBeCloseTo(0.3, 6)
    expect(short.parameters.height).toBeLessThan(base.parameters.height)

    const long = buildLineDrawTrailGeometry(9)
    expect(long.parameters.height).toBeCloseTo(9, 6)
    expect(long.parameters.height).toBeGreaterThan(base.parameters.height)
  })

  it('extends forward from the origin and clamps degenerate lengths', () => {
    const geo = buildLineDrawTrailGeometry(6, 0.16)
    geo.computeBoundingBox()
    const box = geo.boundingBox
    // 원점(플레이어)에서 로컬 +z로 6만큼 뻗고, 바닥에 눕는다.
    expect(box.min.z).toBeCloseTo(0, 5)
    expect(box.max.z).toBeCloseTo(6, 5)
    expect(box.max.y - box.min.y).toBeCloseTo(0, 5)

    expect(buildLineDrawTrailGeometry(0).parameters.height).toBe(0.01)
    expect(buildLineDrawTrailGeometry(-4).parameters.height).toBe(0.01)
  })
})
