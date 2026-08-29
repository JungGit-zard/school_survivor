import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import snapshot from '../title/studioSnapshot.json'
import { findStudioPartByKey } from './StudioTunedGroup.jsx'

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const playerMeshBody = (source, component) => {
  const start = source.indexOf(`function ${component}`)
  const end = source.indexOf('\nfunction ', start + 1)
  return source.slice(start, end === -1 ? source.length : end)
}

const hasStrictOrder = (source, markers) => markers.every((marker, index) => {
  const previous = index === 0 ? -1 : source.indexOf(markers[index - 1])
  return source.indexOf(marker) > previous
})

const studioNode = (type, children = []) => ({ type, children })
const blockNode = () => studioNode('group', [studioNode('mesh')])
const outlineNode = () => studioNode('mesh')

function playerStudioTree({ image2 }) {
  const block = image2 ? blockNode : blockNode
  const outline = image2 ? outlineNode : outlineNode
  const lantern = studioNode('group', [
    outline(), block(), block(), block(), block(), outline(), block(), block(), outline(), block(),
  ])
  const leg = () => studioNode('group', [
    outline(), block(), studioNode('group', [outline(), block(), outline(), block()]),
  ])
  const scaledPlayer = studioNode('group', [
    outline(),
    studioNode('group', [outline(), outline(), outline(), outline(), outline()]),
    block(), block(), block(), block(),
    studioNode('group', [block()]),
    studioNode('group', [block()]),
    studioNode('group', [block()]),
    studioNode('group', [block()]),
    studioNode('group', [block()]),
    studioNode('group', [block()]),
    studioNode('group', [block()]),
    studioNode('group', [block()]),
    studioNode('group', [block()]),
    studioNode('group', [block(), block()]),
    block(), block(),
    studioNode('group', [block(), block()]),
    studioNode('group', [block(), block(), lantern]),
    leg(), leg(),
  ])
  return studioNode('group', [scaledPlayer])
}

const pathSignature = (root, key) => {
  const object = findStudioPartByKey(root, key)
  return object ? `${object.type}:${object.children.length}` : null
}

describe('Player Image 2.0 GLB vertical slice', () => {
  it('keeps the final Blender-validated GLB in the runtime asset path', () => {
    expect(existsSync(new URL('../assets/models/player/player-image2-2026-08-29.glb', import.meta.url))).toBe(true)
  })

  it('uses one named GLB hierarchy for gameplay and the Graphics Studio player preview', () => {
    const playerMesh = read('./PlayerMesh.jsx')
    const player = read('./Player.jsx')

    expect(playerMesh).toContain("player-image2-2026-08-29.glb?url")
    expect(playerMesh).toContain("head: 'player__head'")
    expect(playerMesh).toContain("lantern: 'player__lantern'")
    expect(playerMesh).toContain('<StudioTunedGroup itemId="player">')
    expect(player).toContain('<PlayerMesh modelVariant="image2"')
  })

  it('keeps the established Studio direct-child sequence and animated pivots while replacing only mesh geometry', () => {
    const source = read('./PlayerMesh.jsx')
    const legacy = playerMeshBody(source, 'LegacyPlayerMesh')
    const image2 = playerMeshBody(source, 'PlayerImage2Mesh')
    const legacyChildren = [
      '<PlayerOuterOutline />',
      'Block size={PLAYER_MESH_LAYOUT.body.size}',
      'Block size={[0.38, 0.18, 0.12]}',
      'Block size={[0.8, 0.13, 0.5]}',
      'Block size={[0.94, 0.36, 0.56]}',
      "ref={reg('head')}",
      "ref={reg('bag')}",
      "ref={reg('slvL')}",
      "ref={reg('slvR')}",
      "ref={reg('legL')}",
      "ref={reg('legR')}",
    ]
    const image2Children = [
      '<PlayerImage2OutlineSlot parts={assets.parts} />',
      'part="torso"',
      'part="shirt"',
      'part="tie"',
      'part="lower"',
      "ref={reg('head')}",
      "ref={reg('bag')}",
      "ref={reg('slvL')}",
      "ref={reg('slvR')}",
      "ref={reg('legL')}",
      "ref={reg('legR')}",
    ]

    expect(hasStrictOrder(legacy, legacyChildren)).toBe(true)
    expect(hasStrictOrder(image2, image2Children)).toBe(true)
    for (const pivot of [
      "ref={reg('head')} position={[0, PLAYER_MESH_LAYOUT.head.baseY, 0]}",
      "ref={reg('bag')} position={[-0.52, 0.46, -0.22]}",
      "ref={reg('slvL')} position={[-0.6, 0.72, 0]}",
      "ref={reg('slvR')} position={[0.6, 0.72, 0]}",
      "ref={reg('legL')} position={[-0.22, -0.34, 0]}",
      "ref={reg('legR')} position={[0.22, -0.34, 0]}",
    ]) {
      expect(legacy).toContain(pivot)
      expect(image2).toContain(pivot)
    }
    expect(image2).not.toContain('<primitive object={model}')
  })

  it('preserves every canonical player Studio/Firebase numeric-key target at the same tree depth and type', () => {
    const source = read('./PlayerMesh.jsx')
    const keys = Object.keys(snapshot.datasets.tunings)
      .filter((key) => key.startsWith('player::part::') || key.startsWith('player::group::'))
      .flatMap((key) => key.replace(/^player::(?:part|group)::/, '').split('+'))
    const legacyTree = playerStudioTree({ image2: false })
    const image2Tree = playerStudioTree({ image2: true })

    expect(source).toContain('function PlayerImage2Block')
    expect(source).toContain('<group position={position} rotation={rotation}>')
    expect(source).toContain('function PlayerImage2OutlineBlock')
    expect(source).toContain('<PlayerImage2OutlineBlock parts={assets.parts} part="legL"')
    for (const key of new Set(keys)) {
      expect(pathSignature(image2Tree, key)).toBe(pathSignature(legacyTree, key))
    }
    for (const key of ['0.0.8.0.0', '0.0.19.2.0.8']) {
      expect(pathSignature(image2Tree, key)).toBe(pathSignature(legacyTree, key))
      expect(pathSignature(image2Tree, key)).not.toBeNull()
    }
  })

  it('leaves the title player call site on the legacy default model path', () => {
    const title = read('./TitleScene3D.jsx')
    const titlePlayer = title.match(/function TitlePlayer[\s\S]*?<\/group>\s*\)/)?.[0] ?? ''

    expect(titlePlayer).toContain('<PlayerMesh groupRef={meshGroup} movingRef={movingRef} />')
    expect(titlePlayer).not.toContain('modelVariant="image2"')
  })
})
