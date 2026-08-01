import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BOSS_FACE_RECIPES_EVENT,
  getBossFacePartIndex,
  loadBossFaceRecipes,
  normalizeBossFaceRecipe,
} from '../lib/bossFaceParts.js'

const disableRaycast = () => null

const FACE_LAYOUT_BY_BOSS = Object.freeze({
  B01: { size: [0.58, 0.50], position: [0, 0, 0.263] },
  B02: { size: [0.58, 0.50], position: [0, 0, 0.263] },
  B03: { size: [0.56, 0.48], position: [0, 0, 0.242] },
  B04: { size: [0.66, 0.48], position: [0, 0, 0.283] },
})

const FACE_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FACE_FRAGMENT_SHADER = `
  precision mediump float;
  uniform float uTime;
  uniform int uBrow;
  uniform int uEye;
  uniform int uNose;
  uniform int uMouth;
  varying vec2 vUv;

  float circle(vec2 p, vec2 c, vec2 r) {
    vec2 q = (p - c) / r;
    return 1.0 - smoothstep(0.76, 1.0, dot(q, q));
  }

  float lineSeg(vec2 p, vec2 a, vec2 b, float w) {
    vec2 ab = b - a;
    float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);
    return 1.0 - smoothstep(w * 0.72, w, length(p - (a + ab * h)));
  }

  float arcSmile(vec2 p, vec2 c, vec2 r, float startY, float w) {
    float ring = 1.0 - smoothstep(w, w + 0.012, abs(length((p - c) / r) - 1.0));
    return ring * step(p.y, startY);
  }

  float browShape(vec2 p) {
    if (uBrow == 1) {
      return lineSeg(p, vec2(-0.23, 0.19), vec2(-0.06, 0.13), 0.018)
        + lineSeg(p, vec2(0.06, 0.13), vec2(0.23, 0.19), 0.018);
    }
    if (uBrow == 2) {
      return lineSeg(p, vec2(-0.23, 0.14), vec2(-0.08, 0.20), 0.018)
        + lineSeg(p, vec2(0.08, 0.20), vec2(0.23, 0.14), 0.018);
    }
    if (uBrow == 3) {
      return lineSeg(p, vec2(-0.22, 0.17), vec2(-0.06, 0.17), 0.017)
        + lineSeg(p, vec2(0.06, 0.17), vec2(0.22, 0.17), 0.017);
    }
    if (uBrow == 4) {
      return lineSeg(p, vec2(-0.23, 0.17), vec2(-0.16, 0.20), 0.015)
        + lineSeg(p, vec2(-0.16, 0.20), vec2(-0.07, 0.16), 0.015)
        + lineSeg(p, vec2(0.07, 0.16), vec2(0.16, 0.20), 0.015)
        + lineSeg(p, vec2(0.16, 0.20), vec2(0.23, 0.17), 0.015);
    }
    return lineSeg(p, vec2(-0.22, 0.15), vec2(-0.07, 0.18), 0.018)
      + lineSeg(p, vec2(0.07, 0.18), vec2(0.22, 0.15), 0.018);
  }

  float eyeShape(vec2 p) {
    float blink = pow(max(0.0, sin(uTime * 0.62)), 24.0);
    if (uEye == 1) {
      return lineSeg(p, vec2(-0.22, 0.06), vec2(-0.08, 0.08), 0.018)
        + lineSeg(p, vec2(0.08, 0.08), vec2(0.22, 0.06), 0.018);
    }
    if (uEye == 2) {
      return lineSeg(p, vec2(-0.21, 0.06), vec2(-0.08, 0.06), 0.015)
        + circle(p, vec2(-0.145, 0.06), vec2(0.075, mix(0.055, 0.010, blink))) * 0.65
        + lineSeg(p, vec2(0.08, 0.06), vec2(0.21, 0.06), 0.015)
        + circle(p, vec2(0.145, 0.06), vec2(0.075, mix(0.055, 0.010, blink))) * 0.65;
    }
    if (uEye == 3) {
      return lineSeg(p, vec2(-0.205, 0.115), vec2(-0.085, -0.005), 0.017)
        + lineSeg(p, vec2(-0.205, -0.005), vec2(-0.085, 0.115), 0.017)
        + lineSeg(p, vec2(0.085, 0.115), vec2(0.205, -0.005), 0.017)
        + lineSeg(p, vec2(0.085, -0.005), vec2(0.205, 0.115), 0.017);
    }
    if (uEye == 4) {
      return lineSeg(p, vec2(-0.22, 0.075), vec2(-0.08, 0.04), 0.017)
        + lineSeg(p, vec2(0.08, 0.04), vec2(0.22, 0.075), 0.017);
    }
    return circle(p, vec2(-0.145, 0.06), vec2(0.044, mix(0.052, 0.010, blink)))
      + circle(p, vec2(0.145, 0.06), vec2(0.044, mix(0.052, 0.010, blink)));
  }

  float noseShape(vec2 p) {
    if (uNose == 1) return circle(p, vec2(0.0, -0.04), vec2(0.030, 0.025));
    if (uNose == 2) return lineSeg(p, vec2(0.0, 0.035), vec2(-0.045, -0.06), 0.014) + lineSeg(p, vec2(-0.045, -0.06), vec2(0.045, -0.055), 0.014);
    if (uNose == 3) return lineSeg(p, vec2(0.005, 0.04), vec2(0.005, -0.075), 0.014) + lineSeg(p, vec2(0.005, -0.075), vec2(0.055, -0.07), 0.012);
    if (uNose == 4) return circle(p, vec2(-0.035, -0.035), vec2(0.024, 0.020)) + circle(p, vec2(0.035, -0.035), vec2(0.024, 0.020));
    return lineSeg(p, vec2(0.02, 0.05), vec2(-0.02, -0.06), 0.014) + lineSeg(p, vec2(-0.02, -0.06), vec2(0.038, -0.078), 0.014);
  }

  float mouthShape(vec2 p) {
    if (uMouth == 1) {
      return lineSeg(p, vec2(-0.17, -0.18), vec2(-0.05, -0.205), 0.018)
        + lineSeg(p, vec2(-0.05, -0.205), vec2(0.06, -0.185), 0.018)
        + lineSeg(p, vec2(0.06, -0.185), vec2(0.18, -0.215), 0.018);
    }
    if (uMouth == 2) return circle(p, vec2(0.0, -0.18), vec2(0.075, 0.095));
    if (uMouth == 3) {
      return lineSeg(p, vec2(-0.18, -0.16), vec2(-0.10, -0.21), 0.017)
        + lineSeg(p, vec2(-0.10, -0.21), vec2(-0.02, -0.16), 0.017)
        + lineSeg(p, vec2(-0.02, -0.16), vec2(0.07, -0.21), 0.017)
        + lineSeg(p, vec2(0.07, -0.21), vec2(0.17, -0.16), 0.017);
    }
    if (uMouth == 4) return lineSeg(p, vec2(-0.095, -0.17), vec2(0.095, -0.15), 0.017) + lineSeg(p, vec2(-0.095, -0.17), vec2(-0.13, -0.12), 0.014);
    return arcSmile(p, vec2(0.0, -0.105), vec2(0.23, 0.17), -0.09, 0.020);
  }

  void main() {
    vec2 p = vUv - 0.5;
    float ink = clamp(browShape(p) + eyeShape(p) + noseShape(p) + mouthShape(p), 0.0, 1.0);
    float faceMask = 1.0 - smoothstep(0.50, 0.55, length(vec2(p.x / 0.88, p.y)));
    float alpha = ink * faceMask;
    gl_FragColor = vec4(vec3(0.035, 0.018, 0.025), alpha);
  }
`

function readSavedRecipe(bossType) {
  try {
    return loadBossFaceRecipes()[bossType] ?? null
  } catch {
    return null
  }
}

function useRuntimeBossFaceRecipe(bossType) {
  const [recipe, setRecipe] = useState(() => readSavedRecipe(bossType))

  useEffect(() => {
    const update = () => setRecipe(readSavedRecipe(bossType))
    update()
    if (typeof window === 'undefined') return undefined
    window.addEventListener(BOSS_FACE_RECIPES_EVENT, update)
    return () => window.removeEventListener(BOSS_FACE_RECIPES_EVENT, update)
  }, [bossType])

  return recipe
}

export default function BossFacePartsOverlay({ bossType, recipe: recipeOverride = undefined }) {
  const materialRef = useRef(null)
  const savedRecipe = useRuntimeBossFaceRecipe(bossType)
  const recipe = recipeOverride === undefined ? savedRecipe : recipeOverride
  const normalized = useMemo(() => (recipe ? normalizeBossFaceRecipe(recipe) : null), [recipe])
  const layout = FACE_LAYOUT_BY_BOSS[bossType] ?? FACE_LAYOUT_BY_BOSS.B01
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBrow: { value: 0 },
    uEye: { value: 0 },
    uNose: { value: 0 },
    uMouth: { value: 0 },
  }), [])

  useEffect(() => {
    if (!normalized) return
    uniforms.uBrow.value = getBossFacePartIndex(normalized.brow)
    uniforms.uEye.value = getBossFacePartIndex(normalized.eye)
    uniforms.uNose.value = getBossFacePartIndex(normalized.nose)
    uniforms.uMouth.value = getBossFacePartIndex(normalized.mouth)
  }, [normalized, uniforms])

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
  })

  if (!normalized) return null

  return (
    <mesh
      name={`${bossType.toLowerCase()}ProceduralFacePartsOverlay`}
      position={layout.position}
      renderOrder={8}
      raycast={disableRaycast}
      userData={{ studioNonFocusable: true, studioNonTunable: true }}
    >
      <planeGeometry args={layout.size} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={FACE_VERTEX_SHADER}
        fragmentShader={FACE_FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  )
}
