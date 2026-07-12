import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TITLE_SCENE_DIRECTION } from './TitleScene3D.jsx'

describe('TitleScene3D direction', () => {
  it('uses the referenced pink-haired school survivor look', () => {
    expect(TITLE_SCENE_DIRECTION.player).toMatchObject({
      hair: 'pink',
      jacket: 'red',
      shirt: 'white',
      ribbon: 'red',
      skirt: 'blue-check',
      backpack: 'blue',
      pose: 'running-to-exit',
    })
  })

  it('keeps the title scene focused on exit, student survivor, and zombie pursuit', () => {
    expect(TITLE_SCENE_DIRECTION.scene).toMatchObject({
      exitGlow: true,
      infectionStreaks: 2,
      warningLights: 2,
      zombieStudents: 5,
      bossZombies: 3,
      matildaPursuers: 1,
      realForegroundResources: [
        'PlayerMesh',
        'ZombieMesh',
        'MatildaMesh',
        'ClassroomDesk',
        'ClassroomChair',
        'UnconsciousStudent',
      ],
    })
  })

  it('uses the real Matilda model upright and facing the player in the pursuing enemy group', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain("import MatildaMesh from './MatildaMesh.jsx'")
    expect(source).toContain('const yaw = faceTitlePlayerYaw(position)')
    expect(source).toContain('ref.current.rotation.y = yaw + Math.sin(t * 1.1) * 0.018')
    expect(source).toContain('rotation={[0, yaw, 0]} scale={scale}')
    expect(source).toContain('<MatildaMesh />')
  })

  it('fills title foreground props with real in-game resources', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain("import ZombieMesh from './ZombieMesh.jsx'")
    expect(source).toContain("import { ClassroomChair, ClassroomDesk, UnconsciousStudent } from './StageObjects/index.js'")
    expect(source).toContain('<ZombieMesh type={type} animPhase="charge" />')
    expect(source).toContain('<TitleBossZombie type="B02" position={[-1.35, 0.26, -3.7]} scale={0.98} delay={0.9} />')
    expect(source).toContain('<TitleBossZombie type="B03" position={[0.02, 0.28, -4.04]} scale={1.12} delay={1.35} />')
    expect(source).toContain('<TitleBossZombie type="B01" position={[0.1, 0.25, -1.62]} scale={1.02} />')
    expect(source).toContain('<TitleZombie position={[-0.92, 0.18, -2.72]} delay={2.1} scale={0.52} type="E03" />')
    expect(source).toContain('<ClassroomDesk')
    expect(source).toContain('<ClassroomChair')
    expect(source).toContain('<UnconsciousStudent')
    expect(source).not.toContain('function LargeZombieSilhouette')
    expect(source).not.toContain('function ZombieHeadSilhouette')
    expect(source).not.toContain('function SchoolSign')
  })

  it('scales title classroom furniture 3x and Matilda 2x from the previous title layout', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain('rotation={[0, 0.42, -0.06]} scale={0.72}')
    expect(source).toContain('rotation={[0, -0.36, 0.04]} scale={1.02}')
    expect(source).toContain('rotation={[0, 0.9, 0]} scale={0.84}')
    expect(source).toContain('rotation={[0, -0.78, 0]} scale={0.84}')
    expect(source).toContain('<TitleMatildaPursuer position={[1.05, 0.36, -2.92]} delay={1.8} scale={1.44} />')
  })

  it('turns the title player face toward the user', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain('ref.current.rotation.y = 0.48 + Math.sin(t * 2.2) * 0.055')
    expect(source).toContain('position={[0.48, 0.88, 0.38]} rotation={[-0.08, 0.48, 0.05]} scale={2}')
  })

  it('turns all title zombies toward the player', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain('const TITLE_PLAYER_TARGET = [0.48, 0.08]')
    expect(source).toContain('function faceTitlePlayerYaw(position)')
    expect(source).toContain('ref.current.rotation.y = yaw + Math.sin(t * 1.15) * 0.025')
    expect(source).toContain('ref.current.rotation.y = yaw + Math.sin(t * 0.95) * 0.018')
  })
})
