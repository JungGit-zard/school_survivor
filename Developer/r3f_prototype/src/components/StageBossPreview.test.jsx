// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import * as THREE from 'three'
import StageBossPreview, {
  resolveBossPreviewBaseY,
  resolveBossPreviewZoom,
  FACE_LOCAL_Y,
  ENEMY_VISUAL_SCALE,
} from './StageBossPreview.jsx'
import { DEFAULT_STAGE_BOSS_PREVIEW } from '../lib/graphicsStudioConfig.js'

const invalidate = vi.fn()

const SIZE_MULT = 4 / 3 // ENEMY_SIZE_MULTIPLIER (mock)
const BOSS_SCALE = 2 // B01/B02 ENEMY_STATS.scale (mock)
// ?쇱씠釉??ㅼ륫(?ㅽ뒠?붿삤 ?꾨━酉곕? 144px濡?媛뺤젣??釉뚮씪?곗? 罹≪쿂) 湲곗? 湲곕낯 zoom.
const DEFAULT_BASE_ZOOM = 110 // = graphicsStudioConfig.DEFAULT_STAGE_BOSS_PREVIEW.zoom

function previewScale() {
  return BOSS_SCALE * SIZE_MULT * ENEMY_VISUAL_SCALE
}

// ?꾨━酉?洹몃９ ???쇨뎬(癒몃━ 洹몃９ ?먯젏)???붾뱶 Y.
function faceWorldY(bossType, panY = 0) {
  return resolveBossPreviewBaseY(bossType) + panY + FACE_LOCAL_Y[bossType] * previewScale()
}

// ?ㅼ젣 ?꾨━酉곗? ?숈씪??ortho 移대찓??lookAt origin)濡??쇨뎬???ъ쁺???붾㈃ ?몃줈 醫뚰몴(NDC.y).
// R3F 8.x 湲곕낯 移대찓?쇰뒗 rotation 誘몄?????lookAt(0,0,0)???곸슜?섎?濡??숈씪 議곌굔.
function faceNdcY({ bossType, panY = 0, zoom = 100, width = 220, height = 144 }) {
  const cam = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 1000)
  cam.position.set(0, 2.2, 5.5)
  cam.zoom = zoom
  cam.lookAt(0, 0, 0)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()
  return new THREE.Vector3(0, faceWorldY(bossType, panY), 0).project(cam).y
}

// Canvas???먯떇???뚮뜑?섏? ?딅뒗 鍮?div濡?mock ??ReactiveBoss??R3F ?낆? ?ㅽ뻾?섏? ?딅뒗??
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="stage-boss-preview-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: (selector) => selector({ invalidate }),
}))

vi.mock('./Enemy.jsx', () => ({
  EnemyVisual: ({ staticPose }) => <div data-testid="stage-boss-preview-enemy" data-static-pose={String(staticPose)} />,
  ENEMY_STATS: { B01: { scale: 2 }, B02: { scale: 2 }, B03: { scale: 2 } },
  ENEMY_SIZE_MULTIPLIER: 4 / 3,
}))

let container = null

afterEach(() => {
  if (container) {
    document.body.removeChild(container)
    container = null
  }
})

function render(ui) {
  container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(ui)
  })
  return container
}

describe('StageBossPreview ?⑤뵒留⑤뱶 紐⑥뀡', () => {
  it('鍮꾩씤?곕옓?곕툕 ?꾨━酉곗쓽 pointerdown? throw?섏? ?딄퀬 framing ?띿꽦??諛섏쁺?쒕떎', () => {
    const el = render(<StageBossPreview framing={{ zoom: 60, panX: 0.2, panY: -0.1 }} />)
    const preview = el.querySelector('[data-testid="stage-boss-preview"]')
    expect(preview).toBeTruthy()
    expect(preview.getAttribute('data-zoom')).toBeTruthy()

    expect(() => {
      act(() => {
        preview.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      })
    }).not.toThrow()
  })

  it('keeps the lobby boss preview motion inactive until an entry motion token is requested', () => {
    const el = render(<StageBossPreview />)
    expect(el.querySelector('[data-testid="stage-boss-preview"]').dataset.motionActive).toBe('false')
  })

  it('activates the lobby boss preview motion while an entry motion token is active', () => {
    const el = render(<StageBossPreview motionToken={1} />)
    expect(el.querySelector('[data-testid="stage-boss-preview"]').dataset.motionActive).toBe('true')
  })

  it('forwards staticPose to the nested boss mesh while the lobby preview motion is inactive', () => {
    const el = render(<StageBossPreview />)
    expect(el.querySelector('[data-testid="stage-boss-preview-enemy"]').dataset.staticPose).toBe('true')
  })

  it('keeps the nested boss mesh static during the short entry motion', () => {
    const el = render(<StageBossPreview motionToken={1} />)
    expect(el.querySelector('[data-testid="stage-boss-preview-enemy"]').dataset.staticPose).toBe('true')
  })

  it('keeps the interactive Graphics Studio preview animation enabled', () => {
    const el = render(<StageBossPreview interactive />)
    expect(el.querySelector('[data-testid="stage-boss-preview-enemy"]').dataset.staticPose).toBe('false')
  })

  it('plays the same short reaction when the lobby boss preview is touched', () => {
    vi.useFakeTimers()
    const el = render(<StageBossPreview />)
    const preview = el.querySelector('[data-testid="stage-boss-preview"]')

    act(() => {
      preview.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    })

    expect(preview.dataset.motionActive).toBe('true')
    expect(el.querySelector('[data-testid="stage-boss-preview"]').dataset.motionActive).toBe('true')

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(preview.dataset.motionActive).toBe('false')
    vi.useRealTimers()
  })
})

describe('StageBossPreview B04 chef framing', () => {
  it('centers the chef face using its dedicated local height', () => {
    expect(faceWorldY('B04', 0)).toBeCloseTo(0, 6)
    expect(Math.abs(faceNdcY({ bossType: 'B04' }))).toBeLessThan(0.005)
  })

  it('uses the same zoom meaning for B04 and the other stage bosses', () => {
    for (const bossType of ['B01', 'B02', 'B03', 'B04']) {
      expect(resolveBossPreviewZoom(DEFAULT_BASE_ZOOM, bossType)).toBe(DEFAULT_BASE_ZOOM)
    }
  })
})

describe('StageBossPreview ?쇨뎬 ?몃줈 以묒븰 ?듭빱', () => {
  it('蹂댁뒪 ??낅퀎 癒몃━ ?ㅽ봽?뗭쓣 諛섏쁺??base Y瑜???궛?쒕떎', () => {
    // baseY = -faceLocalY * previewScale
    expect(resolveBossPreviewBaseY('B01')).toBeCloseTo(-(FACE_LOCAL_Y.B01 * previewScale()), 6)
    expect(resolveBossPreviewBaseY('B02')).toBeCloseTo(-(FACE_LOCAL_Y.B02 * previewScale()), 6)
    // B02??移대뱶 ?꾩슜 紐⑤뜽 ?ㅼ??쇱쓣 ??텛誘濡??쇨뎬 ?듭빱??洹?異뺤냼媛믪쓣 諛섏쁺?쒕떎.
    expect(resolveBossPreviewBaseY('B02')).toBe(resolveBossPreviewBaseY('B01'))
  })

  it('panY=0?대㈃ ?쇨뎬 ?붾뱶 Y媛 ?묒떆??0)???뺥솗???듭빱?쒕떎', () => {
    expect(faceWorldY('B01', 0)).toBeCloseTo(0, 6)
    expect(faceWorldY('B02', 0)).toBeCloseTo(0, 6)
  })

  it('panY=0?대㈃ ?쇨뎬???붾㈃ ?몃줈 以묒븰(NDC.y??)???⑤떎', () => {
    expect(Math.abs(faceNdcY({ bossType: 'B01' }))).toBeLessThan(0.005)
    expect(Math.abs(faceNdcY({ bossType: 'B02' }))).toBeLessThan(0.005)
  })

  it('湲곗쥌/酉고룷??罹붾쾭???믪씠쨌?덈퉬)媛 ?щ씪???몃줈 以묒븰 ?뺣젹???좎??쒕떎', () => {
    // ?ㅼ뼇????酉고룷???꾨젅???ш린 ??ortho + lookAt?대?濡?以묒븰? 罹붾쾭???ш린? 臾닿??댁빞 ?쒕떎.
    const sizes = [
      { width: 160, height: 104 },
      { width: 220, height: 144 },
      { width: 320, height: 144 },
      { width: 400, height: 260 },
      { width: 120, height: 640 },
    ]
    for (const bossType of ['B01', 'B02', 'B03']) {
      for (const size of sizes) {
        expect(Math.abs(faceNdcY({ bossType, ...size }))).toBeLessThan(0.005)
      }
    }
  })

  it('zoom???щ씪???몃줈 以묒븰 ?뺣젹???좎??쒕떎', () => {
    for (const zoom of [50, 100, 140, 180]) {
      expect(Math.abs(faceNdcY({ bossType: 'B01', zoom }))).toBeLessThan(0.005)
      expect(Math.abs(faceNdcY({ bossType: 'B02', zoom }))).toBeLessThan(0.005)
    }
  })

  it('panY??以묒븰 ?꾩뿉?쒖쓽 誘몄꽭 ?ㅽ봽?뗭쑝濡??숈옉?쒕떎', () => {
    // baseY媛 ?쇨뎬??0???듭빱?섎?濡??쇨뎬 ?붾뱶 Y??怨?panY? 媛숇떎.
    expect(faceWorldY('B01', 0.2)).toBeCloseTo(0.2, 6)
    expect(faceWorldY('B01', -0.3)).toBeCloseTo(-0.3, 6)
    // ?묒닔 panY???붾㈃?먯꽌 ?꾨줈(NDC.y 利앷?), ?뚯닔???꾨옒濡??대룞?쒗궓??
    expect(faceNdcY({ bossType: 'B01', panY: 0.2 })).toBeGreaterThan(0.01)
    expect(faceNdcY({ bossType: 'B01', panY: -0.2 })).toBeLessThan(-0.01)
  })
})

describe('StageBossPreview ?꾨젅??梨꾩?(湲곕낯 zoom)', () => {
  // ?щ씪???곷떒 ?щ갚? ?쇱씠釉?釉뚮씪?곗?(?ㅽ뒠?붿삤 ?꾨━酉곕? 濡쒕퉬 議곌굔 144px濡?媛뺤젣)濡??뺤씤:
  // 湲곕낯 zoom 110?먯꽌 B01 癒몃━ ?꾩껜媛 ?곷떒 ?щ갚???먭퀬 ?꾨젅?꾩쓣 苑?梨꾩슦硫??섎━吏 ?딆쓬(148? ?섎┝).
  // ?쒖닔 湲고븯濡쒕뒗 R3F ?ㅼ젣 ?뚮뜑???щ씪???쎌????좊ː???덇쾶 ?ы쁽?섍린 ?대젮??
  // 嫄곗쭞 ?듦낵瑜??좊컻?섎뜕 ?덈?-?щ갚 ?댁꽌?섏? ?쒓굅?섍퀬, 寃利?媛?ν븳 媛믩쭔 ?④릿??
  it('湲곕낯 zoom? ?쇱씠釉??ㅼ륫媛?110?대떎', () => {
    expect(DEFAULT_STAGE_BOSS_PREVIEW.zoom).toBe(110)
    expect(DEFAULT_BASE_ZOOM).toBe(DEFAULT_STAGE_BOSS_PREVIEW.zoom)
  })



  it('湲곕낯 zoom(?뚮뜑 zoom)?먯꽌???쇨뎬? ?몃줈 以묒븰(NDC.y??)???좎??쒕떎', () => {
    expect(Math.abs(faceNdcY({ bossType: 'B01', zoom: resolveBossPreviewZoom(DEFAULT_BASE_ZOOM, 'B01') }))).toBeLessThan(0.005)
    expect(Math.abs(faceNdcY({ bossType: 'B02', zoom: resolveBossPreviewZoom(DEFAULT_BASE_ZOOM, 'B02') }))).toBeLessThan(0.005)
  })
})
