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
// 라이브 실측(스튜디오 프리뷰를 144px로 강제해 브라우저 캡처) 기준 기본 zoom.
const DEFAULT_BASE_ZOOM = 110 // = graphicsStudioConfig.DEFAULT_STAGE_BOSS_PREVIEW.zoom

function previewScale() {
  return BOSS_SCALE * SIZE_MULT * ENEMY_VISUAL_SCALE
}

// 프리뷰 그룹 안 얼굴(머리 그룹 원점)의 월드 Y.
function faceWorldY(bossType, panY = 0) {
  return resolveBossPreviewBaseY(bossType) + panY + FACE_LOCAL_Y[bossType] * previewScale()
}

// 실제 프리뷰와 동일한 ortho 카메라(lookAt origin)로 얼굴을 투영한 화면 세로 좌표(NDC.y).
// R3F 8.x 기본 카메라는 rotation 미지정 시 lookAt(0,0,0)을 적용하므로 동일 조건.
function faceNdcY({ bossType, panY = 0, zoom = 100, width = 220, height = 144 }) {
  const cam = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 1000)
  cam.position.set(0, 2.2, 5.5)
  cam.zoom = zoom
  cam.lookAt(0, 0, 0)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()
  return new THREE.Vector3(0, faceWorldY(bossType, panY), 0).project(cam).y
}

// Canvas는 자식을 렌더하지 않는 빈 div로 mock → ReactiveBoss의 R3F 훅은 실행되지 않는다.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="stage-boss-preview-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: (selector) => selector({ invalidate }),
}))

vi.mock('./Enemy.jsx', () => ({
  EnemyVisual: ({ frozen }) => <div data-testid="stage-boss-preview-enemy" data-frozen={String(frozen)} />,
  ENEMY_STATS: { B01: { scale: 2 }, B02: { scale: 2 } },
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

describe('StageBossPreview 온디맨드 모션', () => {
  it('비인터랙티브 프리뷰의 pointerdown은 throw하지 않고 framing 속성을 반영한다', () => {
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

  it('keeps the lobby boss frozen until an entry motion token is requested', () => {
    const el = render(<StageBossPreview />)
    expect(el.querySelector('[data-testid="stage-boss-preview-enemy"]').dataset.frozen).toBe('true')
  })

  it('unfreezes the lobby boss while an entry motion token is active', () => {
    const el = render(<StageBossPreview motionToken={1} />)
    expect(el.querySelector('[data-testid="stage-boss-preview-enemy"]').dataset.frozen).toBe('false')
  })
})

describe('StageBossPreview 얼굴 세로 중앙 앵커', () => {
  it('보스 타입별 머리 오프셋을 반영해 base Y를 역산한다', () => {
    // baseY = -faceLocalY * previewScale
    expect(resolveBossPreviewBaseY('B01')).toBeCloseTo(-(FACE_LOCAL_Y.B01 * previewScale()), 6)
    expect(resolveBossPreviewBaseY('B02')).toBeCloseTo(-(FACE_LOCAL_Y.B02 * previewScale()), 6)
    // 머리 오프셋이 큰 B02가 더 아래(더 음수)로 앵커되어야 얼굴이 같은 높이로 온다.
    expect(resolveBossPreviewBaseY('B02')).toBeLessThan(resolveBossPreviewBaseY('B01'))
  })

  it('panY=0이면 얼굴 월드 Y가 응시점(0)에 정확히 앵커된다', () => {
    expect(faceWorldY('B01', 0)).toBeCloseTo(0, 6)
    expect(faceWorldY('B02', 0)).toBeCloseTo(0, 6)
  })

  it('panY=0이면 얼굴이 화면 세로 중앙(NDC.y≈0)에 온다', () => {
    expect(Math.abs(faceNdcY({ bossType: 'B01' }))).toBeLessThan(0.005)
    expect(Math.abs(faceNdcY({ bossType: 'B02' }))).toBeLessThan(0.005)
  })

  it('기종/뷰포트(캔버스 높이·너비)가 달라도 세로 중앙 정렬이 유지된다', () => {
    // 다양한 폰 뷰포트 프레임 크기 — ortho + lookAt이므로 중앙은 캔버스 크기와 무관해야 한다.
    const sizes = [
      { width: 160, height: 104 },
      { width: 220, height: 144 },
      { width: 320, height: 144 },
      { width: 400, height: 260 },
      { width: 120, height: 640 },
    ]
    for (const bossType of ['B01', 'B02']) {
      for (const size of sizes) {
        expect(Math.abs(faceNdcY({ bossType, ...size }))).toBeLessThan(0.005)
      }
    }
  })

  it('zoom이 달라도 세로 중앙 정렬이 유지된다', () => {
    for (const zoom of [50, 100, 140, 180]) {
      expect(Math.abs(faceNdcY({ bossType: 'B01', zoom }))).toBeLessThan(0.005)
      expect(Math.abs(faceNdcY({ bossType: 'B02', zoom }))).toBeLessThan(0.005)
    }
  })

  it('panY는 중앙 위에서의 미세 오프셋으로 동작한다', () => {
    // baseY가 얼굴을 0에 앵커하므로 얼굴 월드 Y는 곧 panY와 같다.
    expect(faceWorldY('B01', 0.2)).toBeCloseTo(0.2, 6)
    expect(faceWorldY('B01', -0.3)).toBeCloseTo(-0.3, 6)
    // 양수 panY는 화면에서 위로(NDC.y 증가), 음수는 아래로 이동시킨다.
    expect(faceNdcY({ bossType: 'B01', panY: 0.2 })).toBeGreaterThan(0.01)
    expect(faceNdcY({ bossType: 'B01', panY: -0.2 })).toBeLessThan(-0.01)
  })
})

describe('StageBossPreview 프레임 채움(기본 zoom)', () => {
  // 크라운 상단 여백은 라이브 브라우저(스튜디오 프리뷰를 로비 조건 144px로 강제)로 확인:
  // 기본 zoom 110에서 B01 머리 전체가 상단 여백을 두고 프레임을 꽉 채우며 잘리지 않음(148은 잘림).
  // 순수 기하로는 R3F 실제 렌더의 크라운 픽셀을 신뢰성 있게 재현하기 어려워
  // 거짓 통과를 유발하던 절대-여백 어서션은 제거하고, 검증 가능한 값만 남긴다.
  it('기본 zoom은 라이브 실측값 110이다', () => {
    expect(DEFAULT_STAGE_BOSS_PREVIEW.zoom).toBe(110)
    expect(DEFAULT_BASE_ZOOM).toBe(DEFAULT_STAGE_BOSS_PREVIEW.zoom)
  })

  it('B02(올림머리)는 크라운이 더 높아 B01보다 낮은 렌더 zoom을 쓴다(잘림 방지)', () => {
    expect(resolveBossPreviewZoom(DEFAULT_BASE_ZOOM, 'B02'))
      .toBeLessThan(resolveBossPreviewZoom(DEFAULT_BASE_ZOOM, 'B01'))
  })

  it('기본 zoom(렌더 zoom)에서도 얼굴은 세로 중앙(NDC.y≈0)을 유지한다', () => {
    expect(Math.abs(faceNdcY({ bossType: 'B01', zoom: resolveBossPreviewZoom(DEFAULT_BASE_ZOOM, 'B01') }))).toBeLessThan(0.005)
    expect(Math.abs(faceNdcY({ bossType: 'B02', zoom: resolveBossPreviewZoom(DEFAULT_BASE_ZOOM, 'B02') }))).toBeLessThan(0.005)
  })
})
