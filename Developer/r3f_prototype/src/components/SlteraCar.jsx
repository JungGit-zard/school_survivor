// Sltera(슬테라) — '멜론마스크'가 만든 패러디 전기차. 무작위로 스테이지에 돌진해 좀비와 플레이어를
// 들이받는 이벤트용 비주얼(게임플레이 미구현, 비주얼 전용). Terry 2026-10-31:
//   낮은 2인승 오픈톱 로드스터 실루엣(긴 코, 짧은 꼬리, 넓은 스탠스), 메탈릭 실버 차체,
//   검은 칵핏 + 작은 운전자 실루엣, 어두운 림의 큰 바퀴, 꼬리 전폭을 가로지르는 연속 라이트바(시그니처).
// 상표·패러디 안전: 실존 브랜드 로고·워드마크·배지·번호판·실제 헤드램프/테일램프 형상 복제 없음.
// 화면에 보이는 이름은 꼬리의 작은 'SLTERA' 하나뿐이다(제작사 '멜론마스크'는 데이터 라벨).
// 저예산 폴리곤: 챔퍼 박스 + 12분할 원기둥만, 외부 자산·새 의존성 없음. 툰 + 인버티드 헐 외곽선.
// 예고(1,400ms) 훅: telegraph(0..1) 또는 telegraphRef.current로 헤드램프·꼬리 라이트바가 맥동한다.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getCachedChamferedBoxGeo, getCachedCylinderGeo, getToonGradient, inflateScale, outlineMat } from '../lib/toon.js'

export const SLTERA_LABEL = 'Sltera'
export const SLTERA_MAKER_LABEL = '멜론마스크'
export const SLTERA_TELEGRAPH_MS = 1400

export const SLTERA_COLORS = Object.freeze({
  silver: 0xb7bec8,
  cockpit: 0x111216,
  seat: 0x1c1c22,
  glass: 0x26323e,
  driver: 0x2c2c34,
  tire: 0x17171a,
  rim: 0x363b42,
  headlight: 0xeaf4ff,
  tailBar: 0xff2a2a,
})

// 차량 로컬 좌표: +Z = 앞(코), 길이 약 3.3, 폭 1.6, 높이 약 1.1(운전자 포함). 좀비(키 약 1.4)와 같은 로컬 스케일.
// [key, shape(box|wheel|rim), size, position, rotation, colorKey, glow(null|'head'|'tail')]
export const SLTERA_CAR_PARTS = Object.freeze([
  ['lowerBody', 'box', [1.50, 0.28, 3.10], [0, 0.36, 0.02], [0, 0, 0], 'silver', null],
  // 긴 코: 앞으로 갈수록 낮아지는 쐐기. 짧은 꼬리: 뒤 데크가 살짝 솟는다.
  ['nose', 'box', [1.34, 0.14, 1.20], [0, 0.50, 0.98], [-0.17, 0, 0], 'silver', null],
  ['rearDeck', 'box', [1.50, 0.26, 0.80], [0, 0.60, -1.12], [0.12, 0, 0], 'silver', null],
  ['cockpit', 'box', [1.18, 0.10, 1.02], [0, 0.60, -0.18], [0, 0, 0], 'cockpit', null],
  ['windshield', 'box', [1.26, 0.32, 0.06], [0, 0.80, 0.42], [-0.55, 0, 0], 'glass', null],
  ['seatL', 'box', [0.44, 0.40, 0.14], [-0.30, 0.80, -0.56], [-0.18, 0, 0], 'seat', null],
  ['seatR', 'box', [0.44, 0.40, 0.14], [0.30, 0.80, -0.56], [-0.18, 0, 0], 'seat', null],
  ['driverBody', 'box', [0.34, 0.30, 0.22], [-0.30, 0.82, -0.36], [0, 0, 0], 'driver', null],
  ['driverHead', 'box', [0.24, 0.24, 0.24], [-0.30, 1.08, -0.34], [0, 0, 0], 'driver', null],
  ['wheelFL', 'wheel', [0.74, 0.30, 0.74], [-0.80, 0.37, 1.10], [0, 0, Math.PI / 2], 'tire', null],
  ['wheelFR', 'wheel', [0.74, 0.30, 0.74], [0.80, 0.37, 1.10], [0, 0, Math.PI / 2], 'tire', null],
  ['wheelRL', 'wheel', [0.78, 0.32, 0.78], [-0.80, 0.39, -1.06], [0, 0, Math.PI / 2], 'tire', null],
  ['wheelRR', 'wheel', [0.78, 0.32, 0.78], [0.80, 0.39, -1.06], [0, 0, Math.PI / 2], 'tire', null],
  ['rimFL', 'rim', [0.44, 0.33, 0.44], [-0.80, 0.37, 1.10], [0, 0, Math.PI / 2], 'rim', null],
  ['rimFR', 'rim', [0.44, 0.33, 0.44], [0.80, 0.37, 1.10], [0, 0, Math.PI / 2], 'rim', null],
  ['rimRL', 'rim', [0.46, 0.35, 0.46], [-0.80, 0.39, -1.06], [0, 0, Math.PI / 2], 'rim', null],
  ['rimRR', 'rim', [0.46, 0.35, 0.46], [0.80, 0.39, -1.06], [0, 0, Math.PI / 2], 'rim', null],
  // 앞: 가는 직사각 램프 두 개(실제 차량 램프 형상 복제 아님)
  ['headlightL', 'box', [0.32, 0.07, 0.08], [-0.44, 0.47, 1.60], [-0.17, 0, 0], 'headlight', 'head'],
  ['headlightR', 'box', [0.32, 0.07, 0.08], [0.44, 0.47, 1.60], [-0.17, 0, 0], 'headlight', 'head'],
  // 시그니처: 꼬리 전폭을 끊김 없이 가로지르는 한 줄 라이트바. 위(카메라)에서도 보이도록 꼬리 윗모서리를 감싼다.
  ['tailBar', 'box', [1.54, 0.09, 0.12], [0, 0.70, -1.52], [0.12, 0, 0], 'tailBar', 'tail'],
])

// 예고 맥동: 진행도(0..1)가 오를수록 맥동이 빨라지고(2→8Hz) 밝아진다. 평시(progress<0)는 기본 밝기.
const _glow = { head: 0, tail: 0 }
export function slteraTelegraphGlow(progress, timeSec, out = _glow) {
  if (!(progress >= 0)) { out.head = 0.7; out.tail = 0.45; return out }
  const p = Math.min(1, progress)
  const hz = 2 + 6 * p
  const pulse = 0.5 + 0.5 * Math.sin(timeSec * Math.PI * 2 * hz)
  out.head = 0.8 + p * 1.2 * pulse + p * 0.5
  out.tail = 0.55 + p * 0.9 * pulse + p * 0.45
  return out
}

let _silverRamp = null
// 밝은 실버 툰 램프(차가운 하이라이트). 어두운 바닥·밝은 바닥 모두에서 외곽선과 함께 읽힌다.
export function getSilverToonRamp() {
  if (_silverRamp) return _silverRamp
  const c = document.createElement('canvas'); c.width = 4; c.height = 1
  const ctx = c.getContext('2d')
  ;['#3c424b', '#7a8390', '#b4bcc8', '#e2e8f1'].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i, 0, 1, 1) })
  _silverRamp = new THREE.CanvasTexture(c)
  _silverRamp.minFilter = _silverRamp.magFilter = THREE.NearestFilter
  _silverRamp.generateMipmaps = false
  _silverRamp.colorSpace = THREE.SRGBColorSpace
  return _silverRamp
}

function partMaterial(colorKey) {
  const color = SLTERA_COLORS[colorKey]
  const glow = colorKey === 'headlight' || colorKey === 'tailBar'
  // 발광 파츠는 어두운 바탕색 + 발광으로 그려, 평시 대비 예고 맥동이 눈에 보이게 한다(색 포화 방지).
  const m = new THREE.MeshToonMaterial({
    color: colorKey === 'tailBar' ? new THREE.Color(color).multiplyScalar(0.25) : color,
    gradientMap: colorKey === 'silver' ? getSilverToonRamp() : getToonGradient(),
    emissive: glow ? color : colorKey === 'silver' ? 0x9fb8d8 : color,
    emissiveIntensity: glow ? 0.45 : colorKey === 'silver' ? 0.06 : 0.06,
  })
  if (glow) m.toneMapped = false
  m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp
  return m
}
function partGeometry(shape, size) {
  if (shape === 'box') return getCachedChamferedBoxGeo(size[0], size[1], size[2], 1)
  // 원기둥 축은 Y. size = [지름, 폭, 지름]
  return getCachedCylinderGeo(size[0] / 2, size[0] / 2, size[1], 12)
}

// 꼬리의 작은 'SLTERA' 글자(런타임 캔버스, 이미지 자산 없음).
function useTailWordmark() {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#1b1d22'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('SLTERA', 64, 17)
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

export default function SlteraCar({ telegraph = -1, telegraphRef = null, ...props }) {
  const meshes = useMemo(() => SLTERA_CAR_PARTS.map(([key, shape, size, position, rotation, colorKey, glow]) => ({
    key, position, rotation, glow, geometry: partGeometry(shape, size), material: partMaterial(colorKey),
  })), [])
  const outline = useMemo(() => outlineMat(0.96), [])
  const wordmark = useTailWordmark()
  // 메시 ref로 '현재' 재질을 읽는다. Graphics Studio 미리보기는 재질을 복제해 소유하므로
  // 처음 만든 재질 핸들을 들고 있으면 맥동이 화면에 반영되지 않는다.
  const meshRefs = useRef([])
  useEffect(() => () => { for (const m of meshes) m.material.dispose(); outline.dispose(); wordmark.dispose() }, [meshes, outline, wordmark])
  useFrame((state) => {
    const progress = telegraphRef ? telegraphRef.current : telegraph
    const g = slteraTelegraphGlow(progress, state.clock.elapsedTime)
    for (let i = 0; i < meshes.length; i += 1) {
      const glow = meshes[i].glow
      const material = glow ? meshRefs.current[i]?.material : null
      if (!material || Array.isArray(material)) continue
      material.emissiveIntensity = glow === 'head' ? g.head : g.tail
    }
  })
  const hull = inflateScale(1.05)
  return (
    <group name="slteraCar" userData={{ label: SLTERA_LABEL, maker: SLTERA_MAKER_LABEL }} {...props}>
      {meshes.map((m, i) => (
        <group key={m.key} position={m.position} rotation={m.rotation}>
          {/* 램프는 예고 훅이 발광을 소유한다. Studio 미리보기의 매 프레임 튜닝(발광 덮어쓰기)에서 제외한다. */}
          <mesh ref={(node) => { meshRefs.current[i] = node }} geometry={m.geometry} material={m.material} renderOrder={2} userData={m.glow ? { studioNonTunable: true, studioNonFocusable: true } : undefined} />
          <mesh geometry={m.geometry} material={outline} scale={[hull, hull, hull]} renderOrder={1} />
        </group>
      ))}
      <mesh position={[0, 0.48, -1.575]} rotation={[0, Math.PI, 0]} renderOrder={3}>
        <planeGeometry args={[0.44, 0.11]} />
        <meshBasicMaterial map={wordmark} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}
