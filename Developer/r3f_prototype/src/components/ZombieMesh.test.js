import { describe, expect, it } from 'vitest'
import { ENEMY_STATS } from './Enemy.jsx'
import { B01_BOSS_FACE_LAYOUT, B01_BOSS_VISUAL_PALETTE, B01_BOSS_VISUAL_PARTS } from './ZombieMesh.jsx'

describe('Stage 1 boss visual reference', () => {
  it('defines B01 as the blocky green suit zombie boss without changing gameplay stats', () => {
    expect(ENEMY_STATS.B01).toMatchObject({
      hp: 1400,
      speed: 0.475,
      scale: 3,
      charger: true,
    })

    expect(B01_BOSS_VISUAL_PALETTE).toMatchObject({
      skin: 0x9fb87a,
      jacket: 0x1d2732,
      tie: 0x9f2222,
      pants: 0x5a351d,
      hair: 0x2f281f,
    })
    expect(B01_BOSS_VISUAL_PARTS).toEqual([
      'blockHead',
      'raggedHair',
      'simplifiedFace',
      'suitJacket',
      'whiteShirt',
      'redTie',
      'brownPants',
      'blackShoes',
      'forwardArms',
      'raggedTears',
    ])
  })

  it('keeps the B01 face simple and readable like the reference art', () => {
    expect(B01_BOSS_FACE_LAYOUT).toEqual({
      leftEye: { size: [0.12, 0.09, 0.035], position: [-0.14, 0.05, 0.265], color: 'dark' },
      rightEye: { size: [0.14, 0.105, 0.035], position: [0.14, 0.05, 0.265], color: 'light' },
      rightPupil: { size: [0.045, 0.045, 0.02], position: [0.14, 0.045, 0.292] },
      mouth: { size: [0.18, 0.105, 0.04], position: [0.01, -0.16, 0.27] },
      tooth: { size: [0.055, 0.04, 0.035], position: [-0.005, -0.125, 0.295] },
      cheekShadow: { size: [0.07, 0.16, 0.035], position: [0.275, -0.02, 0.20] },
    })
  })
})
