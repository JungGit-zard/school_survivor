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
    })
  })
})
