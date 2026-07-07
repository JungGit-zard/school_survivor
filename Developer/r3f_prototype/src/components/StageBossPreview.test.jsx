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

const invalidate = vi.fn()

const SIZE_MULT = 4 / 3 // ENEMY_SIZE_MULTIPLIER (mock)
const BOSS_SCALE = 2 // B01/B02 ENEMY_STATS.scale (mock)
const DEFAULT_BASE_ZOOM = 148 // graphicsStudioConfig.DEFAULT_STAGE_BOSS_PREVIEW.zoom
const LOBBY_FRAME_HEIGHT = 144 // Lobby styles.cardBossPreview.height (실제 카드 프레임)
const BASE_ROT_X = 0.08 // StageBossPreview.jsx BASE_ROT_X 미러
const BASE_ROT_Y = -0.5 // StageBossPreview.jsx BASE_ROT_Y 미러
const OUT = (s) => 1 + (s - 1) * 2 // toon.inflateScale (OUTLINE_THICKNESS_MULT=2)

// ZombieMesh 머리 그룹의 자식 블록(크라운 후보): [size, headGroup 내 위치, outlineScale]
const HEAD_BLOCKS = {
  B01: [
    [[0.58, 0.50, 0.48], [0, 0, 0], 1.08],
    [[0.60, 0.18, 0.46], [-0.02, 0.25, -0.02], 1.06],
  ],
  B02: [
    [[0.62, 0.62, 0.50], [0, 0, 0], 1.08],
    [[0.70, 0.12, 0.56], [0, 0.37, -0.02], 1.04],
    [[0.12, 0.52, 0.50], [-0.37, 0.02, -0.02], 1.03],
    [[0.12, 0.52, 0.50], [0.37, 0.02, -0.02], 1.03],
    [[0.66, 0.56, 0.12], [0, 0.02, -0.31], 1.03],
    [[0.32, 0.26, 0.24], [0, 0.40, -0.43], 1.04],
  ],
}

function previewScale() {
  return BOSS_SCALE * SIZE_MULT * ENEMY_VISUAL_SCALE
}

function makeCamera({ zoom, width = 220, height = LOBBY_FRAME_HEIGHT }) {
  const cam = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 1000)
  cam.position.set(0, 2.2, 5.5)
  cam.zoom = zoom
  cam.lookAt(0, 0, 0)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld()
  return cam
}

// 프리뷰 그룹 전체 변환(scale → rotate → translate) 재현.
function makeGroup(bossType, panY = 0) {
  const g = new THREE.Object3D()
  g.position.set(0, resolveBossPreviewBaseY(bossType) + panY, 0)
  g.rotation.set(BASE_ROT_X, BASE_ROT_Y, 0)
  g.scale.setScalar(previewScale())
  g.updateMatrixWorld()
  return g
}

function pixelFromCenter(worldVec, cam, height = LOBBY_FRAME_HEIGHT) {
  return worldVec.clone().project(cam).y * (height / 2)
}

// 머리 크라운의 프레임 상단 여백(px). 양수=여백, 음수=클리핑.
function crownTopMargin(bossType, { baseZoom = DEFAULT_BASE_ZOOM, height = LOBBY_FRAME_HEIGHT } = {}) {
  const cam = makeCamera({ zoom: resolveBossPreviewZoom(baseZoom, bossType), height })
  const g = makeGroup(bossType)
  let topPixel = -Infinity
  for (const [size, pos, os] of HEAD_BLOCKS[bossType]) {
    const hx = (size[0] / 2) * OUT(os)
    const hy = (size[1] / 2) * OUT(os)
    const hz = (size[2] / 2) * OUT(os)
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const local = new THREE.Vector3(pos[0] + sx * hx, FACE_LOCAL_Y[bossType] + pos[1] + sy * hy, pos[2] + sz * hz)
      const pixel = pixelFromCenter(g.localToWorld(local), cam, height)
      if (pixel > topPixel) topPixel = pixel
    }
  }
  return height / 2 - topPixel
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
  it('B01 머리 크라운이 144px 프레임 상단 안에서 잘리지 않고 잘 채운다', () => {
    const margin = crownTopMargin('B01')
    expect(margin).toBeGreaterThan(4) // 클리핑 없음(상단 여백 존재)
    expect(margin).toBeLessThan(18) // 과한 여백 아님 — 얼굴/상반신이 프레임을 채움
  })

  it('B02(올림머리)도 크라운이 잘리지 않고 비슷한 여백으로 채운다', () => {
    const margin = crownTopMargin('B02')
    expect(margin).toBeGreaterThan(4)
    expect(margin).toBeLessThan(18)
  })

  it('B02는 크라운이 더 높아 B01보다 낮은 렌더 zoom을 쓴다(잘림 방지)', () => {
    expect(resolveBossPreviewZoom(DEFAULT_BASE_ZOOM, 'B02'))
      .toBeLessThan(resolveBossPreviewZoom(DEFAULT_BASE_ZOOM, 'B01'))
  })

  it('base zoom을 낮추면 크라운 여백이 커진다(스튜디오 튜닝 반영)', () => {
    expect(crownTopMargin('B01', { baseZoom: 120 }))
      .toBeGreaterThan(crownTopMargin('B01', { baseZoom: DEFAULT_BASE_ZOOM }))
  })

  it('새 zoom에서도 얼굴은 세로 중앙 근처(±6px)를 유지한다', () => {
    for (const bossType of ['B01', 'B02']) {
      const cam = makeCamera({ zoom: resolveBossPreviewZoom(DEFAULT_BASE_ZOOM, bossType) })
      const g = makeGroup(bossType)
      const facePixel = pixelFromCenter(g.localToWorld(new THREE.Vector3(0, FACE_LOCAL_Y[bossType], 0)), cam)
      expect(Math.abs(facePixel)).toBeLessThan(6)
    }
  })
})
