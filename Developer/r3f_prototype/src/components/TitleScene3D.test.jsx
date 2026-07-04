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
      largeZombieSilhouette: 1,
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

  it('uses the real Matilda model in the pursuing enemy group', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain("import MatildaMesh from './MatildaMesh.jsx'")
    expect(source).toContain('<MatildaMesh movementPose />')
  })

  it('fills title foreground props with real in-game resources', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain("import ZombieMesh from './ZombieMesh.jsx'")
    expect(source).toContain("import { ClassroomChair, ClassroomDesk, UnconsciousStudent } from './StageObjects/index.js'")
    expect(source).toContain('<ZombieMesh type={type} animPhase="charge" />')
    expect(source).toContain('<ClassroomDesk')
    expect(source).toContain('<ClassroomChair')
    expect(source).toContain('<UnconsciousStudent')
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
})
