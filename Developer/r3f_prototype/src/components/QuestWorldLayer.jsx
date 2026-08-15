import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore.js'
import { getStageBounds } from '../lib/stageConfig.js'
import { getStageQuestDefinitions } from '../lib/quests.js'
import { usePlayingFrame } from '../lib/usePlayingFrame.js'
import { playerPos } from '../lib/refs.js'
import { getStageObjectFootprint } from './StageObjects/stageObjectColliders.js'
import { getStageObjectPlacements } from './StageObjects/stageObjectPlacements.js'
import StudioTunedGroup, {
  composeStudioPartPosition,
  composeStudioPartRotation,
} from './StudioTunedGroup.jsx'

export const QUEST_ITEM_INTERACTION_RADIUS = 0.82

export const QUEST_ITEM_STYLE = Object.freeze({
  book: { color: 0xe85c9b, shape: 'book' },
  'red-book': { color: 0xc92f38, shape: 'red-book' },
  'attendance-sheet': { color: 0xf1e0ae, shape: 'sheet' },
  bandage: { color: 0xf4f0de, shape: 'bandage' },
  key: { color: 0xd6af43, shape: 'key' },
  whistle: { color: 0xdd4f56, shape: 'whistle' },
  fuse: { color: 0xffa83b, shape: 'fuse' },
  list: { color: 0x85c7d8, shape: 'sheet' },
  valve: { color: 0xd94b3f, shape: 'valve' },
})

function targetTypes(target = {}) {
  return [target.type, ...(target.fallbackTypes ?? [])].filter(Boolean)
}

function getPlacementRotationY(placement = {}) {
  return Array.isArray(placement.rotation) ? placement.rotation[1] ?? 0 : placement.rotation ?? 0
}

function getPlacementScale(placement = {}) {
  return Array.isArray(placement.scale) ? placement.scale : [placement.scale ?? 1, placement.scale ?? 1, placement.scale ?? 1]
}

export function getQuestSurfacePosition(placement, localPosition) {
  const [scaleX, scaleY, scaleZ] = getPlacementScale(placement)
  const [localX, localY, localZ] = localPosition
  const yaw = getPlacementRotationY(placement)
  const scaledX = localX * scaleX
  const scaledZ = localZ * scaleZ
  const [x, y = 0, z] = placement.position

  return [
    x + scaledX * Math.cos(yaw) + scaledZ * Math.sin(yaw),
    y + localY * scaleY,
    z - scaledX * Math.sin(yaw) + scaledZ * Math.cos(yaw),
  ]
}

// placementId is authoritative. Type fallbacks keep authored quests usable when
// Firebase Graphics Studio replaces a prop layout.
export function resolveQuestTargetPlacement(target, placements = []) {
  if (target?.placementId) {
    const exact = placements.find(({ id }) => (
      id === target.placementId || id.startsWith(`${target.placementId}-copy-`)
    ))
    if (exact) return exact
  }
  for (const type of targetTypes(target)) {
    const byType = placements.find((placement) => placement.type === type)
    if (byType) return byType
  }
  return null
}

function hashUnit(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967296
}

export function getQuestFallbackPosition(stageId, questId) {
  const { halfX, halfZ } = getStageBounds(stageId)
  const inset = 1.4
  const angle = hashUnit(`${stageId}:${questId}`) * Math.PI * 2
  return [
    Math.cos(angle) * Math.max(0, halfX - inset),
    0.18,
    Math.sin(angle) * Math.max(0, halfZ - inset),
  ]
}

// The resolved location is placed just outside a collider AABB, rather than in
// its centre, so collecting an item never requires clipping a solid prop.
export function getQuestTargetPosition(stageId, questId, target, placements = []) {
  const placement = resolveQuestTargetPlacement(target, placements)
  if (!placement) {
    return {
      position: getQuestFallbackPosition(stageId, questId),
      sourceId: `${questId}:fallback`,
      placement: null,
    }
  }

  const [x, y = 0, z] = placement.position
  if (target?.surface?.localPosition) {
    return {
      position: getQuestSurfacePosition(placement, target.surface.localPosition),
      rotationY: getPlacementRotationY(placement),
      sourceId: placement.id,
      placement,
    }
  }
  const footprint = getStageObjectFootprint(placement)
  if (!footprint) {
    return {
      position: [x, y + 0.2, z],
      sourceId: placement.id,
      placement,
    }
  }

  const distance = Math.hypot(footprint.x, footprint.z) || 1
  const offsetX = (footprint.x / distance) * (footprint.halfX + 0.38)
  const offsetZ = (footprint.z / distance) * (footprint.halfZ + 0.38)
  return {
    position: [footprint.x + offsetX, y + 0.22, footprint.z + offsetZ],
    sourceId: placement.id,
    placement,
  }
}

export function isQuestInteractionInRange(playerX, playerZ, position, radius = QUEST_ITEM_INTERACTION_RADIUS) {
  const dx = playerX - position[0]
  const dz = playerZ - position[2]
  return dx * dx + dz * dz <= radius * radius
}

export function getQuestWorldInteraction({
  playerX,
  playerZ,
  itemTargets,
  completionTargets,
  questProgress,
}) {
  for (const { quest, target } of itemTargets) {
    if (questProgress?.[quest.id]?.status === 'active'
      && isQuestInteractionInRange(playerX, playerZ, target.position)) {
      return { type: 'collect', quest, target }
    }
  }
  for (const { quest, target } of completionTargets) {
    if (questProgress?.[quest.id]?.status === 'item-acquired'
      && isQuestInteractionInRange(playerX, playerZ, target.position)) {
      return { type: 'complete', quest, target }
    }
  }
  return null
}

export function markQuestActionHandled(handledIds, key, actionResult) {
  if (actionResult !== true) return false
  handledIds.add(key)
  return true
}

function QuestItemModel({ visualKind }) {
  const style = QUEST_ITEM_STYLE[visualKind] ?? QUEST_ITEM_STYLE.book
  const material = <meshStandardMaterial color={style.color} roughness={0.42} metalness={0.12} />

  if (style.shape === 'sheet') {
    return <mesh rotation={[-Math.PI / 2, 0, 0]}>{material}<boxGeometry args={[0.62, 0.04, 0.82]} /></mesh>
  }
  if (style.shape === 'bandage') {
    return <mesh rotation={[Math.PI / 2, 0, 0]}>{material}<torusGeometry args={[0.28, 0.11, 8, 18]} /></mesh>
  }
  if (style.shape === 'key') {
    return <group rotation={[0, 0.45, 0]}>
      <mesh>{material}<cylinderGeometry args={[0.08, 0.08, 0.62, 8]} /></mesh>
      <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>{material}<torusGeometry args={[0.17, 0.06, 8, 16]} /></mesh>
      <mesh position={[0.12, -0.2, 0]}>{material}<boxGeometry args={[0.2, 0.1, 0.12]} /></mesh>
    </group>
  }
  if (style.shape === 'whistle') {
    return <group rotation={[0, 0.35, Math.PI / 2]}>
      <mesh>{material}<capsuleGeometry args={[0.16, 0.4, 4, 8]} /></mesh>
      <mesh position={[0.26, 0, 0]}>{material}<torusGeometry args={[0.13, 0.035, 6, 12]} /></mesh>
    </group>
  }
  if (style.shape === 'fuse') {
    return <group rotation={[0, 0.6, Math.PI / 2]}>
      <mesh>{material}<cylinderGeometry args={[0.12, 0.12, 0.52, 10]} /></mesh>
      <mesh position={[0.32, 0, 0]}>{material}<sphereGeometry args={[0.08, 8, 8]} /></mesh>
    </group>
  }
  if (style.shape === 'valve') {
    return <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>{material}<torusGeometry args={[0.3, 0.08, 8, 16]} /></mesh>
      <mesh>{material}<boxGeometry args={[0.62, 0.1, 0.1]} /></mesh>
      <mesh>{material}<boxGeometry args={[0.1, 0.62, 0.1]} /></mesh>
    </group>
  }
  if (style.shape === 'red-book') {
    return <group>
      <mesh position={[0, -0.045, 0]}>
        <boxGeometry args={[0.54, 0.035, 0.4]} />
        <meshStandardMaterial color={0x8e1722} roughness={0.46} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.5, 0.085, 0.36]} />
        <meshStandardMaterial color={0xf3dfb2} roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.54, 0.035, 0.4]} />
        <meshStandardMaterial color={style.color} roughness={0.38} metalness={0.06} />
      </mesh>
      <mesh position={[-0.255, 0.008, 0]}>
        <boxGeometry args={[0.035, 0.125, 0.4]} />
        <meshStandardMaterial color={0x70101a} roughness={0.42} />
      </mesh>
    </group>
  }
  return <mesh>{material}<boxGeometry args={[0.62, 0.18, 0.46]} /></mesh>
}

export function QuestItemMarker({ position, visualKind, rotationY = 0, resting = false }) {
  const groupRef = useRef(null)
  const markerRef = useRef(null)
  const markerRotationRef = useRef(0)
  const baseY = position[1]

  useFrame(({ clock }, delta) => {
    if (resting) {
      if (!markerRef.current) return
      const elapsed = clock.getElapsedTime()
      markerRotationRef.current += delta * 0.72
      markerRef.current.position.y = composeStudioPartPosition(
        markerRef.current, 'y', 0, Math.sin(elapsed * 2.4) * 0.06,
      )
      markerRef.current.rotation.y = composeStudioPartRotation(
        markerRef.current, 'y', 0, markerRotationRef.current,
      )
      return
    }
    if (!groupRef.current) return
    const elapsed = clock.getElapsedTime()
    groupRef.current.position.y = baseY + Math.sin(elapsed * 2.4) * 0.09
    groupRef.current.rotation.y += delta * 0.72
  })

  if (!resting) {
    return (
      <group ref={groupRef} position={position}>
        <StudioTunedGroup itemId={`quest-item-${visualKind}`}>
          <QuestItemModel visualKind={visualKind} />
          <mesh position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.38, 0.45, 16]} />
            <meshBasicMaterial color={0x21162e} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <octahedronGeometry args={[0.09, 0]} />
            <meshBasicMaterial color={0xfff1a8} />
          </mesh>
        </StudioTunedGroup>
      </group>
    )
  }

  return (
    <group position={position}>
      <StudioTunedGroup itemId={`quest-item-${visualKind}`}>
        <group rotation={[0, rotationY, 0]}><QuestItemModel visualKind={visualKind} /></group>
        <group ref={markerRef}>
          <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.31, 0.37, 16]} />
            <meshBasicMaterial color={0x21162e} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <octahedronGeometry args={[0.09, 0]} />
            <meshBasicMaterial color={0xfff1a8} />
          </mesh>
        </group>
      </StudioTunedGroup>
    </group>
  )
}

export default function QuestWorldLayer({ stageId }) {
  const gameKey = useGameStore((s) => s.gameKey)
  const questProgress = useGameStore((s) => s.questProgress)
  const handledRef = useRef(new Set())
  const quests = useMemo(() => getStageQuestDefinitions(stageId), [stageId])
  const placements = useMemo(() => getStageObjectPlacements(stageId), [stageId, gameKey])

  useEffect(() => {
    handledRef.current = new Set()
  }, [gameKey, stageId])

  const itemTargets = useMemo(() => quests.map((quest) => ({
    quest,
    target: getQuestTargetPosition(stageId, quest.id, quest.itemTarget, placements),
  })), [placements, quests, stageId])
  const completionTargets = useMemo(() => quests
    .map((quest) => ({
      quest,
      target: getQuestTargetPosition(stageId, quest.id, quest.completion, placements),
    })), [placements, quests, stageId])

  usePlayingFrame(() => {
    const store = useGameStore.getState()
    if (store.phase !== 'playing') return
    const interaction = getQuestWorldInteraction({
      playerX: playerPos.x,
      playerZ: playerPos.z,
      itemTargets,
      completionTargets,
      questProgress: store.questProgress,
    })
    if (!interaction) return

    const { quest, target } = interaction
    if (interaction.type === 'collect') {
      const key = `item:${target.sourceId}`
      if (handledRef.current.has(key)) return
      const collected = markQuestActionHandled(
        handledRef.current,
        key,
        store.collectQuestItem?.(quest.id, target.sourceId),
      )
      if (collected) {
        store.recordMissionEventOnce?.(
          `interaction:${gameKey}:${stageId}:quest-item:${quest.id}:${target.sourceId}`,
          { type: 'interaction_triggered' },
        )
      }
      return
    }

    const key = `complete:${target.sourceId}`
    if (handledRef.current.has(key)) return
    const completed = store.completeQuest?.(quest.id, target.sourceId)
    if (!markQuestActionHandled(handledRef.current, key, completed)) return
    store.recordMissionEventOnce?.(
      `interaction:${gameKey}:${stageId}:quest-complete:${quest.id}:${target.sourceId}`,
      { type: 'interaction_triggered' },
    )
    if (useGameStore.getState().questProgress?.[quest.id]?.status === 'completed') {
      store.openStudentDialogue?.(quest.completionDialogueId, null, {
        subjectType: 'quest',
        subjectName: quest.completion.name,
      })
    }
  })

  return (
    <group name={`quest-world-layer-${stageId}`}>
      {itemTargets.map(({ quest, target }) => {
        const progress = questProgress?.[quest.id]
        if (progress?.status !== 'active') return null
        return <QuestItemMarker
          key={quest.id}
          position={target.position}
          rotationY={target.rotationY}
          resting={Boolean(quest.itemTarget.surface)}
          visualKind={quest.item.visualKind}
        />
      })}
    </group>
  )
}
