import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import ErrorBoundary from '../ErrorBoundary.jsx'
import StudioTunedGroup from '../StudioTunedGroup.jsx'
import { useKaykitFurniture } from '../../lib/kaykitFurniture.js'
import { createTemplateInstanceLayer } from '../../lib/templateInstanceLayer.js'
import {
  getStagePropOutlineMaterial,
  getStagePropOutlineUserData,
  STAGE_PROP_OUTLINE_RENDER_ORDER,
  STAGE_PROP_SURFACE_RENDER_ORDER,
} from './propRendering.js'
import { buildKaykitPropInstances, KAYKIT_PROP_RECIPES } from './kaykitPropRecipes.js'

// KayKit furniture renderers (2026-11-14).
// - KaykitStagePropBatch: every placement of one stage-object type -> per part ONE Studio-tuned hidden
//   template (fill + outline mesh) and a templateInstanceLayer (2 draw calls per part for the whole stage).
// - KaykitPropModel: one prop as plain meshes (title scene, Graphics Studio preview).
// Both suspend on the GLB inside their own KaykitBoundary, so a slow or failed load only leaves the
// furniture out for a moment; floor, actors and the rest of the scene never wait for it.
const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3()
const _e = new THREE.Euler()

export function KaykitBoundary({ children }) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>{children}</Suspense>
    </ErrorBoundary>
  )
}

function halfWidthGetter(assets) {
  return (node, fit) => {
    const entry = assets?.get(node, fit)
    if (!entry) return 0
    const box = entry.geometry.boundingBox
    return (box.max.x - box.min.x) / 2
  }
}

function KaykitPartMeshes({ entry, material, outlineMaterial }) {
  return (
    <>
      <mesh
        name="kaykit-fill"
        geometry={entry.geometry}
        material={material}
        castShadow={false}
        receiveShadow={false}
        renderOrder={STAGE_PROP_SURFACE_RENDER_ORDER}
        dispose={null}
      />
      <mesh
        name="kaykit-outline"
        geometry={entry.outlineGeometry}
        material={outlineMaterial}
        userData={getStagePropOutlineUserData()}
        castShadow={false}
        receiveShadow={false}
        renderOrder={STAGE_PROP_OUTLINE_RENDER_ORDER}
        dispose={null}
      />
    </>
  )
}

// Studio part paths: StudioTunedGroup > [part group 0, part group 1, ...] > slot group > [fill, outline].
// The runtime template of part i keeps empty groups for the other parts so "i.0.0" means the same mesh in
// the Studio preview (KaykitPropModel) and in the game.
function KaykitInstancedPart({ itemId, partIndex, partCount, entry, material, outlineMaterial, matrices }) {
  const templateRef = useRef(null)
  const layerRef = useRef(null)
  if (layerRef.current === null) layerRef.current = createTemplateInstanceLayer(Math.max(1, matrices.length), `kaykit-${itemId}-${partIndex}`)
  const layer = layerRef.current

  useLayoutEffect(() => {
    const slots = matrices.map((matrix) => {
      matrix.decompose(_p, _q, _s)
      const slot = layer.claim()
      layer.write(slot, _p, _e.setFromQuaternion(_q), _s.x)
      return slot
    })
    layer.syncTemplate(templateRef.current)
    return () => { for (const slot of slots) layer.release(slot) }
  }, [layer, matrices])

  useEffect(() => () => layer.dispose(), [layer])

  // Static props: re-reading the 2-mesh template each frame is allocation-free and only re-uploads when a
  // Studio Apply changed it.
  useFrame(() => { layer.syncTemplate(templateRef.current) })

  return (
    <>
      <group ref={templateRef} visible={false}>
        <StudioTunedGroup itemId={itemId}>
          {Array.from({ length: partCount }, (_, index) => (
            <group key={index} name={`kaykit-part-${index}`}>
              {index === partIndex && (
                <group name="kaykit-slot-0">
                  <KaykitPartMeshes entry={entry} material={material} outlineMaterial={outlineMaterial} />
                </group>
              )}
            </group>
          ))}
        </StudioTunedGroup>
      </group>
      <primitive object={layer.group} />
    </>
  )
}

function KaykitStagePropBatchInner({ type, placements }) {
  const assets = useKaykitFurniture()
  const recipe = KAYKIT_PROP_RECIPES[type]
  const parts = useMemo(
    () => (assets ? buildKaykitPropInstances(type, placements, halfWidthGetter(assets)) : []),
    [assets, type, placements],
  )
  const outlineMaterial = getStagePropOutlineMaterial(0.96, 0x050209)
  if (!recipe || !assets) return null
  return (
    <group name={`kaykit-batch-${type}`}>
      {parts.map((part) => {
        const entry = assets.get(part.node, part.fit)
        if (!entry || part.matrices.length === 0) return null
        return (
          <KaykitInstancedPart
            key={part.key}
            itemId={recipe.itemId}
            partIndex={part.partIndex}
            partCount={recipe.parts.length}
            entry={entry}
            material={assets.material}
            outlineMaterial={outlineMaterial}
            matrices={part.matrices}
          />
        )
      })}
    </group>
  )
}

export function KaykitStagePropBatch({ type, placements = [] }) {
  return (
    <KaykitBoundary>
      <KaykitStagePropBatchInner type={type} placements={placements} />
    </KaykitBoundary>
  )
}

function KaykitPropModelInner({ kind, variant }) {
  const assets = useKaykitFurniture()
  const recipe = KAYKIT_PROP_RECIPES[kind]
  const parts = useMemo(
    () => (assets ? buildKaykitPropInstances(kind, [{ position: [0, 0, 0], props: { variant } }], halfWidthGetter(assets)) : []),
    [assets, kind, variant],
  )
  const outlineMaterial = getStagePropOutlineMaterial(0.96, 0x050209)
  if (!recipe || !assets) return null
  return (
    <StudioTunedGroup itemId={recipe.itemId}>
      {recipe.parts.map((_, index) => {
        const part = parts.find((candidate) => candidate.partIndex === index)
        const entry = part ? assets.get(part.node, part.fit) : null
        return (
          <group key={index} name={`kaykit-part-${index}`}>
            {entry && part.matrices.map((matrix, slot) => {
              const position = new THREE.Vector3()
              const quaternion = new THREE.Quaternion()
              const scale = new THREE.Vector3()
              matrix.decompose(position, quaternion, scale)
              return (
                <group key={slot} name={`kaykit-slot-${slot}`} position={position} quaternion={quaternion} scale={scale}>
                  <KaykitPartMeshes entry={entry} material={assets.material} outlineMaterial={outlineMaterial} />
                </group>
              )
            })}
          </group>
        )
      })}
    </StudioTunedGroup>
  )
}

// One KayKit prop (title scene, Studio preview). Group props (position/rotation/scale) go on the outer group.
export function KaykitPropModel({ kind, variant, ...props }) {
  return (
    <group {...props}>
      <KaykitBoundary>
        <KaykitPropModelInner kind={kind} variant={variant} />
      </KaykitBoundary>
    </group>
  )
}
