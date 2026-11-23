import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  CanvasTexture,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
} from 'three'

// 2026-11-24 Terry: "눈은 눈의 결정 그래픽이 회전하면서 떨어지는걸로 해."
// 타이틀 전용 계절 눈. 6갈래 눈 결정 4종을 실행 중에 캔버스 한 장(2x2 아틀라스)에 그리고,
// 메시 하나(인스턴스 지오메트리)로 전부 그린다 — draw call 1회.
// 떨어짐·좌우 흔들림·자전·살짝 기울어지는 흔들림은 전부 버텍스 셰이더가 시간 uniform 하나로 계산한다.
// 매 프레임 CPU가 하는 일은 uTime 숫자 하나 바꾸기뿐이고, React 상태는 건드리지 않는다.
// 화면 밖(아래)으로 나간 결정은 셰이더의 fract()로 위에서 다시 떨어진다(재활용).
// 카메라는 건드리지 않는다: 결정은 클립 공간에 직접 그려 장면 카메라와 무관하다.

export const TITLE_SNOW_COUNT_PHONE = 80
export const TITLE_SNOW_COUNT_WIDE = 110
export const TITLE_SNOW_COUNT_REDUCED = 36
export const TITLE_SNOW_VARIANTS = 4
const ATLAS_CELL = 128

export function titleSnowCount({ width = 0, height = 0, reducedMotion = false } = {}) {
  if (reducedMotion) return TITLE_SNOW_COUNT_REDUCED
  return Math.min(width, height) < 600 ? TITLE_SNOW_COUNT_PHONE : TITLE_SNOW_COUNT_WIDE
}

// 고정 시드 난수: 매번 같은 눈 배치(재현 가능한 화면).
export function seededRandom(seed = 0x5a17a) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 결정 하나의 6갈래 경로(중심 기준, 반지름 r). 외곽선 패스와 흰 패스가 같은 경로를 쓴다.
function traceCrystal(ctx, r, variant) {
  const arm = (fn) => {
    for (let k = 0; k < 6; k += 1) {
      ctx.save()
      ctx.rotate((k * Math.PI) / 3)
      fn()
      ctx.restore()
    }
  }
  const line = (x1, y1, x2, y2) => {
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
  }
  // 팔 위 지점 d에서 바깥쪽으로 ±60° 가지 길이 len
  const branch = (d, len) => {
    const bx = Math.cos(Math.PI / 3) * len
    const by = Math.sin(Math.PI / 3) * len
    line(0, -d, -by, -d - bx)
    line(0, -d, by, -d - bx)
  }
  ctx.beginPath()
  if (variant === 0) {
    // 나뭇가지형(dendrite)
    arm(() => {
      line(0, 0, 0, -r)
      branch(r * 0.34, r * 0.3)
      branch(r * 0.6, r * 0.24)
      branch(r * 0.82, r * 0.13)
    })
  } else if (variant === 1) {
    // 별 판형: 가운데 육각판 + 끝이 갈라진 팔
    for (let k = 0; k <= 6; k += 1) {
      const a = (k * Math.PI) / 3 - Math.PI / 2
      const x = Math.cos(a) * r * 0.3
      const y = Math.sin(a) * r * 0.3
      if (k === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    arm(() => {
      line(0, -r * 0.3, 0, -r)
      branch(r * 0.7, r * 0.22)
    })
  } else if (variant === 2) {
    // 단순 별: 끝이 V로 갈라지고 가운데 작은 고리
    arm(() => {
      line(0, -r * 0.18, 0, -r * 0.92)
      branch(r * 0.62, r * 0.3)
    })
    ctx.moveTo(r * 0.18, 0)
    ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2)
  } else {
    // 고사리형: 짧은 가지가 촘촘히
    arm(() => {
      line(0, 0, 0, -r)
      for (let i = 0; i < 5; i += 1) {
        const d = r * (0.22 + i * 0.16)
        branch(d, r * (0.2 - i * 0.03))
      }
    })
  }
}

export function drawSnowflakeAtlas(canvas) {
  const size = ATLAS_CELL * 2
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext?.('2d')
  if (!ctx) return false
  ctx.clearRect(0, 0, size, size)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let variant = 0; variant < TITLE_SNOW_VARIANTS; variant += 1) {
    const cx = (variant % 2) * ATLAS_CELL + ATLAS_CELL / 2
    const cy = Math.floor(variant / 2) * ATLAS_CELL + ATLAS_CELL / 2
    const r = ATLAS_CELL * 0.4
    ctx.save()
    ctx.translate(cx, cy)
    // 밝은 하늘 배경에서도 보이게 옅은 푸른 테두리를 먼저 깔고 그 위에 흰 선을 긋는다.
    traceCrystal(ctx, r, variant)
    ctx.strokeStyle = 'rgba(70, 112, 160, 0.55)'
    ctx.lineWidth = 11
    ctx.stroke()
    traceCrystal(ctx, r, variant)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 6
    ctx.stroke()
    ctx.restore()
  }
  return true
}

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec2 uViewport;
  attribute vec4 aSeed;   // x: 가로 위치 0..1, y: 낙하 위상 0..1, z: 회전/흔들림 위상 0..1, w: 결정 종류 0..3
  attribute vec4 aMotion; // x: 낙하 속도(화면 높이/초), y: 크기(px), z: 자전 속도(rad/s), w: 기울기 흔들림 속도
  attribute vec3 aSway;   // x: 좌우 흔들림 폭(px), y: 흔들림 속도(rad/s), z: 불투명도
  varying vec2 vUv;
  varying float vAlpha;

  vec2 rotate2(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  }

  void main() {
    float sizePx = aMotion.y;
    float phase = aSeed.z * 6.2831853;
    vec2 toNdc = 2.0 / max(uViewport, vec2(1.0));

    // 낙하: 위쪽 화면 밖에서 아래쪽 화면 밖까지, fract로 끝없이 반복(재활용).
    float marginY = sizePx * toNdc.y;
    float span = 2.0 + 2.0 * marginY;
    float fall = fract(aSeed.y + uTime * aMotion.x * 2.0 / span);
    float y = 1.0 + marginY - fall * span;

    float marginX = (sizePx + aSway.x) * toNdc.x;
    float x = (aSeed.x * 2.0 - 1.0) * (1.0 + marginX)
      + sin(uTime * aSway.y + phase) * aSway.x * toNdc.x;

    // 결정 자체의 회전: 자기 축 자전 + 살짝 앞뒤로 기울어지는 3D 흔들림(정사영).
    vec2 p = position.xy * sizePx;
    p = rotate2(p, phase + uTime * aMotion.z);
    float tilt = sin(uTime * aMotion.w + phase * 1.7) * 1.05;
    p.y *= cos(tilt);
    p = rotate2(p, phase * 2.3);

    gl_Position = vec4(x + p.x * toNdc.x, y + p.y * toNdc.y, 0.0, 1.0);

    float variant = floor(aSeed.w + 0.5);
    vec2 cell = vec2(mod(variant, 2.0), floor(variant / 2.0));
    // 캔버스 위쪽 줄이 텍스처 v=1 쪽(flipY)이라 줄 번호를 뒤집는다.
    vUv = (uv + vec2(cell.x, 1.0 - cell.y)) * 0.5;
    vAlpha = aSway.z;
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float a = tex.a * vAlpha;
    if (a < 0.02) discard;
    // 텍스처는 premultiplied alpha로 올려 가장자리 검은 테두리(fringe)를 막는다.
    gl_FragColor = tex * vAlpha;
  }
`

function buildInstanceAttributes(count, random) {
  const seed = new Float32Array(count * 4)
  const motion = new Float32Array(count * 4)
  const sway = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    // depth 0(먼 결정: 작고 느리고 옅음) .. 1(가까운 결정: 크고 빠르고 진함)
    const depth = random()
    seed[i * 4] = random()
    seed[i * 4 + 1] = random()
    seed[i * 4 + 2] = random()
    seed[i * 4 + 3] = Math.floor(random() * TITLE_SNOW_VARIANTS)
    motion[i * 4] = 0.06 + depth * 0.08 + random() * 0.02
    motion[i * 4 + 1] = 9 + depth * 17 + random() * 3
    const spin = 0.5 + random() * 1.1
    motion[i * 4 + 2] = random() < 0.5 ? -spin : spin
    motion[i * 4 + 3] = 0.6 + random() * 1.0
    sway[i * 3] = 8 + random() * 22
    sway[i * 3 + 1] = 0.35 + random() * 0.7
    sway[i * 3 + 2] = 0.55 + depth * 0.35
  }
  return { seed, motion, sway }
}

// 메시·지오메트리·재질·텍스처를 만들고 dispose 하나로 전부 정리한다(WebGL 없이도 생성 가능).
export function createTitleSnow({
  count = TITLE_SNOW_COUNT_PHONE,
  random = seededRandom(),
  createCanvas = () => (typeof document !== 'undefined' ? document.createElement('canvas') : null),
} = {}) {
  const canvas = createCanvas()
  if (canvas) drawSnowflakeAtlas(canvas)
  const texture = new CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.premultiplyAlpha = true
  texture.needsUpdate = Boolean(canvas)

  const plane = new PlaneGeometry(1, 1)
  const geometry = new InstancedBufferGeometry()
  geometry.index = plane.index
  geometry.setAttribute('position', plane.getAttribute('position'))
  geometry.setAttribute('uv', plane.getAttribute('uv'))
  const { seed, motion, sway } = buildInstanceAttributes(count, random)
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(seed, 4))
  geometry.setAttribute('aMotion', new InstancedBufferAttribute(motion, 4))
  geometry.setAttribute('aSway', new InstancedBufferAttribute(sway, 3))
  geometry.instanceCount = count

  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uViewport: { value: new Vector2(1, 1) },
      uMap: { value: texture },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
  })

  const mesh = new Mesh(geometry, material)
  mesh.name = 'TitleSnow'
  mesh.frustumCulled = false
  mesh.renderOrder = 1000
  mesh.raycast = () => {}

  return {
    mesh,
    geometry,
    material,
    texture,
    count,
    setViewport(width, height) {
      material.uniforms.uViewport.value.set(Math.max(1, width || 1), Math.max(1, height || 1))
    },
    setTime(seconds) {
      material.uniforms.uTime.value = seconds
    },
    dispose() {
      geometry.dispose()
      plane.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}

export default function TitleSnow({ reducedMotion = false }) {
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)
  const getState = useThree((state) => state.get)
  // 개수는 처음 마운트할 때 정한다(창 크기 바뀔 때마다 다시 만들지 않는다).
  const snow = useMemo(() => {
    const size = getState?.()?.size ?? {}
    return createTitleSnow({ count: titleSnowCount({ width: size.width, height: size.height, reducedMotion }) })
  }, [getState, reducedMotion])
  useEffect(() => () => snow.dispose(), [snow])
  useEffect(() => {
    snow.setViewport(width, height)
  }, [snow, width, height])
  // 움직임 줄이기: 시간을 멈춰 결정이 제자리에 가만히 있다(캔버스도 demand 루프).
  useFrame(({ clock }) => {
    if (!reducedMotion) snow.setTime(clock.elapsedTime)
  })
  return <primitive object={snow.mesh} />
}
