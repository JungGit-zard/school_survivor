import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ENEMY_STATS } from './Enemy.jsx'
import { B01_BOSS_FACE, B01_BOSS_VISUAL_PALETTE, B01_BOSS_VISUAL_PARTS, B01_MATH_SET_SQUARE_LAYOUT, B02_STAGE2_BOSS_FACE, B02_STAGE2_BOSS_PALETTE, B02_STAGE2_BOSS_PARTS, B03_PE_TEACHER_FACE, B03_PE_TEACHER_FACE_LAYOUT, B03_PE_TEACHER_PALETTE, B03_PE_TEACHER_PARTS, B04_CHEF_PALETTE, B04_CHEF_PARTS, RUN_ZOMBIE_VISUAL, ZOMBIE_PALETTE } from './ZombieMesh.jsx'
import { GRAPHICS_STUDIO_CATALOG, getStudioZombieItemId } from '../lib/graphicsStudioConfig.js'

const zombieMeshSource = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')
const graphicsStudioConfigSource = readFileSync(new URL('../lib/graphicsStudioConfig.js', import.meta.url), 'utf8')
const legacyB02ItemId = ['zombie', 'b02', 'teacher'].join('-')

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
      'faceTexture',
      'suitJacket',
      'whiteShirt',
      'redTie',
      'brownPants',
      'blackShoes',
      'forwardArms',
      'raggedTears',
    ])
  })

  it('replaces the modeled B01 math-teacher face parts with the supplied face texture decal', () => {
    expect(B01_BOSS_FACE).toEqual({
      size: [0.58, 0.50],
      position: [0, 0, 0.251],
      repeat: [1, 1],
      offset: [0, 0],
    })

    expect(zombieMeshSource).toContain("import boss01FaceUrl from '../assets/faces/b01_math_teacher_face.webp'")
    expect(zombieMeshSource).toContain('function B01MathTeacherFaceTexture')
    expect(zombieMeshSource).toContain('<B01MathTeacherFaceTexture />')
    expect(zombieMeshSource).toContain('THREE.SRGBColorSpace')
    expect(zombieMeshSource).not.toContain('B01_BOSS_FACE_LAYOUT')
    expect(zombieMeshSource).not.toContain('face.leftBrow')
    expect(zombieMeshSource).not.toContain('face.rightBrow')
    expect(zombieMeshSource).not.toContain('face.leftEye')
    expect(zombieMeshSource).not.toContain('face.rightEye')
    expect(zombieMeshSource).not.toContain('face.rightPupil')
    expect(zombieMeshSource).not.toContain('face.mouth')
    expect(zombieMeshSource).not.toContain('face.tooth')
    expect(zombieMeshSource).not.toContain('face.cheekShadow')
  })

  it('keeps the original B01 model separate from the PE teacher model', () => {
    expect(zombieMeshSource).toContain('<B01BossZombieMesh hitFlash={hitFlash} reg={reg} />')
    expect(zombieMeshSource).toContain('<B03PhysicalEducationBossMesh hitFlash={hitFlash} reg={reg} />')
  })

  it('equips B01 with a toon set square that appears only during the special swing', () => {
    expect(B01_MATH_SET_SQUARE_LAYOUT).toMatchObject({
      bodyColor: 0xf6c844,
      markColor: 0xff743d,
    })
    expect(B01_MATH_SET_SQUARE_LAYOUT.bars).toHaveLength(3)
    expect(zombieMeshSource).toContain("ref={reg('mathSetSquare')}")
    expect(zombieMeshSource).toContain("const specialActive = type === 'B01' && animPhase === 'special'")
    expect(zombieMeshSource).toContain('pt.mathSetSquare.visible = specialActive')
    expect(zombieMeshSource).toContain('<B01MathSetSquare hitFlash={hitFlash} />')
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

  it('uses only the shared numeric scene-tree path for B03 parts', () => {
    const b03Source = zombieMeshSource.match(
      /function B03PhysicalEducationBossMesh[\s\S]*?function B02Stage2BossFaceTexture/,
    )?.[0]

    expect(b03Source).toBeDefined()
    expect(b03Source).not.toContain('studioPartId=')
    expect(b03Source.match(/<ZBlock/g)).toHaveLength(27)
  })

  it('replaces the modeled PE-teacher face/whistle with the supplied face texture decal', () => {
    const source = zombieMeshSource

    // ?ъ슜???쒓났 ?쇨뎬 ?띿뒪泥?癒몃━?졖룻샇猷⑤씪湲??ы븿)瑜?癒몃━ ?욌㈃ ?곗뭡濡??ъ슜
    expect(source).toContain("import boss03FaceUrl from '../assets/faces/b03_pe_teacher_face.webp'")
    expect(source).toContain('function B03PeTeacherFaceTexture')
    expect(source).toContain('<B03PeTeacherFaceTexture />')
    expect(source).toContain('THREE.SRGBColorSpace')
    // ?띿뒪泥섏뿉 洹몃젮吏??대ぉ援щ퉬/?몃（?쇨린? 以묐났?섎뜕 3D ?뚯툩???쒓굅??
    expect(source).not.toContain('name="b01WhistleCord')
    expect(source).not.toContain('name="b01Nose"')
    expect(source).not.toContain('name="b01EyeL"')

    // ?몄텧 ?쇨뎬硫??ㅻ뱶 諛뺤뒪 ?욌㈃ 0.56횞0.48, center y=0) cover-fit:
    // 醫낇슒鍮?7:6 留욎땄 ?곷떒 14.3% ?щ∼(?ㅻ뱶諛대뱶 ???щ갚), z???욌㈃ 0.22 + 0.01
    expect(B03_PE_TEACHER_FACE.size).toEqual([0.56, 0.48])
    expect(B03_PE_TEACHER_FACE.position).toEqual([0, 0, 0.23])
    expect(B03_PE_TEACHER_FACE.repeat).toEqual([1, 0.857])
    expect(B03_PE_TEACHER_FACE.offset).toEqual([0, 0])
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

describe('Stage 4 chef zombie boss', () => {
  it('defines the chef palette and stable ordered part groups', () => {
    expect(B04_CHEF_PALETTE).toMatchObject({
      skin: 0x7fa65a,
      chefWhite: 0xf2efe2,
      eye: 0x101010,
      neckerchief: 0xb92828,
      checkerLight: 0x898b8d,
      checkerDark: 0x4d5054,
      shoe: 0x151515,
    })
    expect(B04_CHEF_PARTS).toEqual([
      'hat',
      'head',
      'body',
      'neckerchief',
      'armL',
      'armR',
      'apron',
      'hips',
      'legL',
      'legR',
    ])
  })

  it('builds the chef as a dedicated model with the characteristic silhouette', () => {
    const chefSource = zombieMeshSource.match(
      /function B04ChefBossMesh[\s\S]*?function B02Stage2BossMesh/,
    )?.[0]

    expect(chefSource).toBeDefined()
    expect(chefSource.match(/pal\.chefWhite/g)?.length).toBeGreaterThanOrEqual(10)
    expect(chefSource.match(/pal\.button/g)).toHaveLength(4)
    expect(chefSource.match(/pal\.neckerchief/g)).toHaveLength(4)
    expect(chefSource.match(/ref=\{reg\('(head|armL|armR|legL|legR)'\)\}/g)).toHaveLength(5)
    expect(chefSource).not.toContain('name="chefEyeL"')
    expect(chefSource).not.toContain('name="chefEyeR"')
    expect(chefSource).toContain('name="chefFaceCleanPlate"')
    expect(chefSource).toContain('name="chefEarL"')
    expect(chefSource).toContain('name="chefEarR"')
    expect(chefSource).not.toContain('name="chefNose"')
    expect(chefSource).not.toContain('name="chefMouth"')
    expect(chefSource).not.toContain('name="chefUpperTeeth"')
    expect(chefSource).not.toContain('name="chefLowerTeeth"')
    expect(chefSource).not.toContain('name="chefTongue"')
  })

  it('uses the B04 Studio wrapper and numeric scene-tree paths only', () => {
    const chefSource = zombieMeshSource.match(
      /function B04ChefBossMesh[\s\S]*?function B02Stage2BossMesh/,
    )?.[0]

    expect(zombieMeshSource).toContain("if (type === 'B04')")
    expect(zombieMeshSource).toContain("itemId={getStudioZombieItemId('B04')}")
    expect(zombieMeshSource).toContain('<B04ChefBossMesh hitFlash={hitFlash} reg={reg} />')
    expect(chefSource).toBeDefined()
    expect(chefSource).toContain('name="chefFaceCleanPlate"')
    expect(chefSource).toContain('renderOrder={20}')
    expect(chefSource).toContain('depthTest={false}')
    expect(chefSource).not.toContain('studioPartId')
  })

  it('gives every chef group and block a distinct Studio label without changing numeric paths', () => {
    const chefSource = zombieMeshSource.match(
      /function B04ChefBossMesh[\s\S]*?function B02Stage2BossMesh/,
    )?.[0]
    const blockTags = chefSource?.match(/<ZBlock\b[^>]*\/>/g) ?? []
    const blockNames = blockTags.map((tag) => tag.match(/name="([^"]+)"/)?.[1])
    const groupNames = [...(chefSource?.matchAll(/<group name="([^"]+)"/g) ?? [])].map((match) => match[1])

    expect(blockTags).toHaveLength(44)
    expect(blockNames.every(Boolean)).toBe(true)
    expect(new Set(blockNames).size).toBe(blockNames.length)
    expect(groupNames).toHaveLength(11)
    expect(groupNames.every(Boolean)).toBe(true)
    expect(new Set(groupNames).size).toBe(groupNames.length)
    expect(blockNames).toEqual(expect.arrayContaining([
      'chefHatBand',
      'chefHatLobeCenter',
      'chefHead',
      'chefButtonUpperL',
      'chefFistL',
      'chefApronPanel',
      'chefShoeL',
      'chefShoeR',
    ]))
    expect(chefSource).not.toContain('studioPartId')
  })
})

describe('Stage 3 run zombie crew visual reference', () => {
  it('registers leader and crew enemy stats separately from normal runners', () => {
    expect(ENEMY_STATS.RZL).toMatchObject({ hp: 90, speed: 2.45, scale: 1.08, runCrew: true })
    expect(ENEMY_STATS.RZC).toMatchObject({ hp: 28, speed: 2.18, scale: 0.78, runCrew: true })
    expect(ENEMY_STATS.RZL.speed).toBeGreaterThan(ENEMY_STATS.E03.speed)
    expect(ENEMY_STATS.RZC.speed).toBeGreaterThan(ENEMY_STATS.E03.speed)
  })

  it('defines voxel low-poly sportswear for the leader and the twelve followers', () => {
    expect(ZOMBIE_PALETTE.RZL).toMatchObject({ body: 0x5a2484, skin: 0x8fa85e })
    expect(ZOMBIE_PALETTE.RZC).toMatchObject({ body: 0x1671a6, skin: 0x8fa85e })
    expect(RUN_ZOMBIE_VISUAL.leader).toMatchObject({ bib: '001', medal: 0xf0b62d })
    expect(RUN_ZOMBIE_VISUAL.crew).toMatchObject({ bib: '013', jersey: 0xf0eee4 })
    expect(RUN_ZOMBIE_VISUAL.parts).toEqual(expect.arrayContaining(['headband', 'bib', 'medal', 'wristbands', 'chunkyRunningShoes', 'runningPose']))
  })

  it('renders run zombie leader and crew through the dedicated RunZombieMesh branch', () => {
    expect(zombieMeshSource).toContain('function RunZombieMesh')
    expect(zombieMeshSource).toContain("type === 'RZL' || type === 'RZC'")
    expect(zombieMeshSource).toContain("role={type === 'RZL' ? 'leader' : 'crew'}")
    expect(zombieMeshSource).toContain('<BibDigits text={cfg.bib} />')
  })
})

describe('Studio part-edit workaround cleanup', () => {
  it('does not keep the removed frozen/rest capture path in ZombieMesh', () => {
    const source = zombieMeshSource

    expect(source).not.toMatch(/if \(frozen\) return/)
  })

  it('captures the JSX rest pose and restores it when freezing for studio part editing', () => {
    const source = zombieMeshSource

    // ref ?깅줉 ???좊땲硫붿씠???쒖옉 ??rest transform 罹≪쿂
    expect(source).not.toContain('zombieRestRotation')
    expect(source).not.toContain('zombieRestScale')
    // frozen 吏꾩엯 ??rest 蹂듭썝 + ?좊땲硫붿씠???꾩쨷 罹≪쿂???ㅽ뒠?붿삤 base ?먭린 ??rest 湲곗? ?ъ벙泥?
    expect(source).not.toContain('el.rotation.copy(el.userData.zombieRestRotation)')
    expect(source).not.toContain('delete el.userData.studioPartBaseRotation')
    expect(source).not.toContain('delete el.userData.studioPartBaseScale')
  })
})

describe('Stage 2 boss visual reference', () => {
  it('registers B02 through the dedicated Graphics Studio v2 namespace', () => {
    expect(getStudioZombieItemId('B02')).toBe('stage2-boss-v2')
    expect(GRAPHICS_STUDIO_CATALOG.some((entry) => entry.id === 'stage2-boss-v2')).toBe(true)
  })

  it('defines B02 as a clean low-poly female teacher zombie boss', () => {
    expect(ENEMY_STATS.B02).toMatchObject({
      hp: 1150,
      speed: 0.475,
      scale: 2,
      charger: true,
    })

    expect(B02_STAGE2_BOSS_PALETTE).toMatchObject({
      skin: 0x75b6e9,
      blazer: 0x8f2f3b,
      shirt: 0xf2ead8,
      skirt: 0x1c1b1d,
      hair: 0x3b241a,
      shoe: 0x17100d,
    })
    expect(B02_STAGE2_BOSS_PARTS).toEqual([
      'blockHeadWithTextureFace',
      'brownBobAndBunHair',
      'redTornBlazer',
      'whiteShirtTieLanyard',
      'darkSkirt',
      'blueSkinHandsLegs',
      'blackShoes',
      'slightB02Walk',
    ])
  })

  it('uses a head-attached face texture and separate controllable hair parts', () => {
    const source = zombieMeshSource

    expect(source).toContain("import boss02FaceUrl from '../assets/faces/b02_stage2_boss_face.webp'")
    expect(source).toContain('<B02Stage2BossFaceTexture />')
    expect(source).toContain('<B02Stage2BossMesh hitFlash={hitFlash} reg={reg} />')
    expect(source).toContain('itemId={getStudioZombieItemId(type)}')
    expect(source).toContain('studioRenderOutline')
    expect(source).not.toContain(legacyB02ItemId)
    // ?몄텧 ?쇨뎬硫??ㅻ뱶 諛뺤뒪 ?욌㈃ 0.62횞0.62 ?꾩껜, center y=0) cover-fit:
    // ?곷떒 20% 癒몃━ 諛대뱶 + 醫뚯슦 10%??UV ?щ∼(?뺤궗媛??좎?, 臾댁뒪?몃젅移?,
    // z???욌㈃ 0.25 + 0.01濡??⑤윺?숈뒪 理쒖냼??
    expect(B02_STAGE2_BOSS_FACE.size).toEqual([0.58, 0.50])
    expect(B02_STAGE2_BOSS_FACE.repeat).toEqual([1, 1])
    expect(B02_STAGE2_BOSS_FACE.offset).toEqual([0, 0])
    expect(B02_STAGE2_BOSS_FACE.position).toEqual([0, 0, 0.251])
  })

  it('keeps the supplied B02 face texture out of the numeric-path focus list', () => {
    const faceSource = zombieMeshSource.match(
      /function B02Stage2BossFaceTexture[\s\S]*?function B02Stage2BossMesh/,
    )

    expect(faceSource).not.toBeNull()
    expect(faceSource[0]).toContain('studioNonFocusable: true')
    expect(faceSource[0]).toContain('transparent')
    expect(graphicsStudioConfigSource).not.toContain(legacyB02ItemId)
  })

  it('disables raycasting on render-only ZBlock outlines', () => {
    expect(zombieMeshSource).toMatch(
      /<mesh(?=[^>]*renderOrder=\{1\})(?=[^>]*studioRenderOutline: true)(?=[^>]*raycast=\{disableRaycast\})[^>]*\/>/,
    )
  })
})
