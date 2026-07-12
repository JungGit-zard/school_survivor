import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ENEMY_STATS } from './Enemy.jsx'
import { B01_BOSS_FACE_LAYOUT, B01_BOSS_VISUAL_PALETTE, B01_BOSS_VISUAL_PARTS, B02_TEACHER_BOSS_FACE, B02_TEACHER_BOSS_PALETTE, B02_TEACHER_BOSS_PARTS, B03_PE_TEACHER_FACE_LAYOUT, B03_PE_TEACHER_PALETTE, B03_PE_TEACHER_PARTS } from './ZombieMesh.jsx'

const zombieMeshSource = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')

describe('Stage 1 boss visual reference', () => {
  it('restores B01 as the blocky green suit zombie boss at the current gameplay scale', () => {
    expect(ENEMY_STATS.B01).toMatchObject({
      hp: 1150,
      speed: 0.475,
      scale: 2,
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

  it('keeps the restored B01 face simple and readable', () => {
    expect(B01_BOSS_FACE_LAYOUT).toEqual({
      leftEye: { size: [0.12, 0.09, 0.035], position: [-0.14, 0.05, 0.265], color: 'dark' },
      rightEye: { size: [0.14, 0.105, 0.035], position: [0.14, 0.05, 0.265], color: 'light' },
      rightPupil: { size: [0.045, 0.045, 0.02], position: [0.14, 0.045, 0.292] },
      leftBrow: { size: [0.18, 0.055, 0.035], position: [-0.14, 0.14, 0.292], rotation: [0, 0, -0.14] },
      rightBrow: { size: [0.2, 0.055, 0.035], position: [0.14, 0.15, 0.292], rotation: [0, 0, 0.12] },
      mouth: { size: [0.18, 0.105, 0.04], position: [0.01, -0.16, 0.27] },
      tooth: { size: [0.055, 0.04, 0.035], position: [-0.005, -0.125, 0.295] },
      cheekShadow: { size: [0.07, 0.16, 0.035], position: [0.275, -0.02, 0.20] },
    })

    expect(B01_BOSS_FACE_LAYOUT.leftBrow.position[1]).toBeGreaterThan(B01_BOSS_FACE_LAYOUT.leftEye.position[1])
    expect(B01_BOSS_FACE_LAYOUT.rightBrow.position[1]).toBeGreaterThan(B01_BOSS_FACE_LAYOUT.rightEye.position[1])
  })

  it('keeps the original B01 model separate from the PE teacher model', () => {
    expect(zombieMeshSource).toContain('<B01BossZombieMesh hitFlash={hitFlash} reg={reg} />')
    expect(zombieMeshSource).toContain('<B03PhysicalEducationBossMesh hitFlash={hitFlash} reg={reg} />')
  })
})

describe('B03 muscular PE teacher boss', () => {
  it('registers independent boss stats and the sportswear palette', () => {
    expect(ENEMY_STATS.B03).toMatchObject({ hp: 1150, scale: 2, charger: true })
    expect(B03_PE_TEACHER_PALETTE).toMatchObject({
      skin: 0x91ad68,
      jersey: 0x18324a,
      jerseyStripe: 0xf1eee2,
      shorts: 0x26394d,
      whistle: 0xf5c542,
      wristband: 0xd94a3d,
    })
    expect(B03_PE_TEACHER_PARTS).toContain('oversizedBiceps')
    expect(B03_PE_TEACHER_FACE_LAYOUT.leftEye.position[0]).toBeLessThan(0)
  })

  it('builds the PE teacher silhouette from controllable B03 parts', () => {
    const source = zombieMeshSource

    expect(source).toContain('studioPartId="b03-shoulders"')
    expect(source).toContain('studioPartId="b03-chest-l"')
    expect(source).toContain('studioPartId="b03-chest-r"')
    expect(source).toContain('studioPartId="b03-bicep-l"')
    expect(source).toContain('studioPartId="b03-bicep-r"')
    expect(source).toContain('studioPartId="b03-shorts"')
  })

  it('replaces the modeled PE-teacher face/whistle with the supplied face texture decal', () => {
    const source = zombieMeshSource

    // 사용자 제공 얼굴 텍스처(머리띠·호루라기 포함)를 머리 앞면 데칼로 사용
    expect(source).toContain("import boss03FaceUrl from '../assets/faces/b03_pe_teacher_face.png'")
    expect(source).toContain('function B03PeTeacherFaceTexture')
    expect(source).toContain('<B03PeTeacherFaceTexture />')
    expect(source).toContain('THREE.SRGBColorSpace')
    // 텍스처에 그려진 이목구비/호루라기와 중복되던 3D 파츠는 제거됨
    expect(source).not.toContain('studioPartId="b03-whistle"')
    expect(source).not.toContain('name="b01WhistleCord')
    expect(source).not.toContain('name="b01Nose"')
    expect(source).not.toContain('name="b01EyeL"')
  })

  it('uses Matilda idle by default but enables her movement pose in the enemy runtime path', () => {
    const source = zombieMeshSource

    expect(source).toContain('<MatildaMesh movementPose={animPhase !== \'stun\'} />')
  })

  it('keeps the B01 eye area clear of the old square side-hair blocks', () => {
    const source = zombieMeshSource

    expect(source).not.toContain('position={[-0.23, 0.12, 0.16]}')
    expect(source).not.toContain('position={[0.24, 0.11, 0.12]}')
    expect(source).not.toContain('position={[0.03, 0.12, 0.18]}')
  })
})

describe('Studio part-edit freeze contract', () => {
  it('skips the animation frame loop entirely while frozen', () => {
    const source = zombieMeshSource

    expect(source).toMatch(/useFrame\(\(state, delta\) => \{\s*if \(frozen\) return/)
  })

  it('captures the JSX rest pose and restores it when freezing for studio part editing', () => {
    const source = zombieMeshSource

    // ref 등록 시 애니메이션 시작 전 rest transform 캡처
    expect(source).toContain('userData.zombieRestRotation = el.rotation.clone()')
    expect(source).toContain('userData.zombieRestScale = el.scale.clone()')
    // frozen 진입 시 rest 복원 + 애니메이션 도중 캡처된 스튜디오 base 폐기 → rest 기준 재캡처
    expect(source).toContain('el.rotation.copy(el.userData.zombieRestRotation)')
    expect(source).toContain('delete el.userData.studioPartBaseRotation')
    expect(source).toContain('delete el.userData.studioPartBaseScale')
  })
})

describe('Stage 2 boss visual reference', () => {
  it('defines B02 as a clean low-poly female teacher zombie boss', () => {
    expect(ENEMY_STATS.B02).toMatchObject({
      hp: 1150,
      speed: 0.475,
      scale: 2,
      charger: true,
    })

    expect(B02_TEACHER_BOSS_PALETTE).toMatchObject({
      skin: 0x8fb0d8,
      suit: 0x111923,
      hair: 0x2e251e,
      skirt: 0x101821,
    })
    expect(B02_TEACHER_BOSS_PARTS).toEqual(expect.arrayContaining([
      'headWithFaceTexture',
      'topHairPlate',
      'leftHairPlate',
      'rightHairPlate',
      'backHairPlate',
      'bunBlock',
      'teacherSuit',
      'skirt',
      'forwardArms',
    ]))
  })

  it('uses a head-attached face texture and separate controllable hair parts', () => {
    const source = zombieMeshSource

    expect(source).toContain("import boss02FaceUrl from '../assets/enemies/boss_02.webp'")
    expect(source).toContain('<B02TeacherFaceTexture />')
    expect(source).toContain('<B02TeacherBossMesh hitFlash={hitFlash} reg={reg} />')
    expect(source).toContain("itemId={getStudioZombieItemId('B02')}")
    expect(source).toContain('studioRenderOutline')
    expect(source).toContain('studioPartId="b02-head"')
    const hairPartIds = Array.from(source.matchAll(/studioPartId="(b02-(?:hair|bun)[^"]*)"/g)).map((match) => match[1])
    expect(hairPartIds).toEqual([
      'b02-hair-top-plate',
      'b02-hair-left-plate',
      'b02-hair-right-plate',
      'b02-hair-back-plate',
      'b02-bun-block',
    ])
    expect(source).toContain('studioPartId="b02-body"')
    expect(source).toContain('studioPartId="b02-arm-l"')
    expect(source).toContain('studioPartId="b02-arm-r"')
    expect(source).not.toContain("studioPartId: 'b02-front-hair'")
    expect(source).not.toContain("studioPartId: 'b02-bun'")
    expect(source).not.toContain('itemId="zombie-b02"')
    expect(B02_TEACHER_BOSS_FACE.size).toEqual([0.62, 0.62])
    expect(B02_TEACHER_BOSS_FACE.repeat).toEqual([1, 1])
    expect(B02_TEACHER_BOSS_FACE.offset).toEqual([0, 0])
  })
})
