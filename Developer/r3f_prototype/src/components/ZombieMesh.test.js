import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ENEMY_STATS } from './Enemy.jsx'
import { B01_BOSS_VISUAL_PALETTE, B01_BOSS_VISUAL_PARTS, B01_MATH_SET_SQUARE_LAYOUT, B02_STAGE2_BOSS_PALETTE, B02_STAGE2_BOSS_PARTS, B03_PE_TEACHER_FACE_LAYOUT, B03_PE_TEACHER_PALETTE, B03_PE_TEACHER_PARTS, B04_CHEF_PALETTE, B04_CHEF_PARTS, RUN_ZOMBIE_VISUAL, STAGE2_GUARD_CHASE_VISUAL, ZOMBIE_PALETTE } from './ZombieMesh.jsx'
import { getBossFaceLayout } from './BossProceduralFace.jsx'
import { GRAPHICS_STUDIO_CATALOG, getStudioZombieItemId } from '../lib/graphicsStudioConfig.js'

const zombieMeshSource = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')
const titleSceneSource = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')
const graphicsStudioConfigSource = readFileSync(new URL('../lib/graphicsStudioConfig.js', import.meta.url), 'utf8')
const legacyB02ItemId = ['zombie', 'b02', 'teacher'].join('-')

describe('Stage 1 boss visual reference', () => {
  it('restores B01 as the blocky green suit zombie boss at the current gameplay scale', () => {
    expect(ENEMY_STATS.B01).toMatchObject({
      hp: 1150,
      speed: 0.5225,
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
      'proceduralFace',
      'suitJacket',
      'whiteShirt',
      'redTie',
      'brownPants',
      'blackShoes',
      'forwardArms',
      'raggedTears',
    ])
  })

  it('draws the B01 math-teacher face procedurally on the head block front, inside the flat (un-chamfered) face', () => {
    const layout = getBossFaceLayout('B01')
    expect(layout.size[0]).toBeCloseTo(0.58 - 2 * 0.48 * 0.14, 6)
    expect(layout.size[1]).toBeCloseTo(0.50 - 2 * 0.48 * 0.14, 6)
    expect(layout.position).toEqual([0, 0, 0.24 + 0.0015])
    expect(zombieMeshSource).not.toContain('boss01FaceUrl')
    expect(zombieMeshSource).not.toContain('FaceTexture')
    expect(zombieMeshSource).toMatch(/<ZBlock size=\{\[0\.58, 0\.50, 0\.48\]\}[^>]*>\s*<BossProceduralFace bossType="B01" recipe=\{bossFaceRecipe\} \/>\s*<\/ZBlock>/)
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
    expect(zombieMeshSource).toContain('<B01BossZombieMesh hitFlash={hitFlash} reg={reg} bossFaceRecipe={bossFaceRecipe} />')
    expect(zombieMeshSource).toContain('<B03PhysicalEducationBossMesh hitFlash={hitFlash} reg={reg} bossFaceRecipe={bossFaceRecipe} />')
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
    // 2026-08-24 사용자 지시: 스3 보스 실효 HP = 스2 보스(1,380) × 1.3 = 1,794.
    // stage3 배수 1.44로 역산한 base가 1246이다(round(1246 × 1.44) = 1794).
    expect(ENEMY_STATS.B03).toMatchObject({ hp: 1246, scale: 2, charger: true })
    expect(Math.round(ENEMY_STATS.B03.hp * 1.44)).toBe(Math.round(Math.round(ENEMY_STATS.B02.hp * 1.2) * 1.3))
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
      /function B03PhysicalEducationBossMesh[\s\S]*?function B04ChefBossMesh/,
    )?.[0]

    expect(b03Source).toBeDefined()
    expect(b03Source).not.toContain('studioPartId=')
    expect(b03Source.match(/<ZBlock/g)).toHaveLength(25)
  })

  it('keeps the charging torso clear of the shorts and legs through the Studio position composition path', () => {
    expect(zombieMeshSource).toContain('composeStudioPartPosition')
    expect(zombieMeshSource).toMatch(
      /const titleB03Charge = titleRunPose && type === 'B03' && animPhase === 'charge'[\s\S]*?const b03ChargeTorsoLift = titleB03Charge\s*\?[\s\S]*?Math\.sin\(bodyTiltX\) \* 0\.23\s*:\s*0/,
    )
    expect(zombieMeshSource).toMatch(
      /pt\.body\.position\.y = composeStudioPartPosition\(pt\.body, 'y', 0\.28, b03ChargeTorsoLift\)/,
    )
    const frameStart = zombieMeshSource.indexOf('useFrame((state, delta) => {')
    const positionComposition = zombieMeshSource.indexOf('pt.body.position.y = composeStudioPartPosition', frameStart)
    const firstAnimationBranch = zombieMeshSource.indexOf('if (specialActive)', frameStart)
    expect(positionComposition).toBeGreaterThan(frameStart)
    expect(positionComposition).toBeLessThan(firstAnimationBranch)
  })

  it('scopes torso lift and reduced stride to the B03 title charge pose', () => {
    const b03Source = zombieMeshSource.match(
      /function B03PhysicalEducationBossMesh[\s\S]*?function B04ChefBossMesh/,
    )?.[0]

    expect(b03Source).toContain("name=\"b01PeTeacherLegLRig\" ref={reg('legL')} position={[-0.19, 0.00, 0]}")
    expect(b03Source).toContain("name=\"b01PeTeacherLegRRig\" ref={reg('legR')} position={[0.19, 0.00, 0]}")
    expect(zombieMeshSource).toContain('titleRunPose = false')
    expect(zombieMeshSource).toContain("titleRunPose && type === 'B03' && animPhase === 'charge' ? 0.30")
    expect(zombieMeshSource).toContain("(animPhase === 'charge' ? 0.55 : 0.38)")
    expect(titleSceneSource).toMatch(
      /type === 'B03'[\s\S]*?<ZombieMesh type=\{type\} animPhase="charge" titleRunPose idleRig=\{idleRig\} \/>[\s\S]*?<ZombieMesh type=\{type\} animPhase="charge" idleRig=\{idleRig\} \/>/,
    )
  })

  it('raises and separates only the B03 title pelvis and legs through Studio position composition', () => {
    expect(zombieMeshSource).toContain("groupRef={reg('shorts')}")
    expect(zombieMeshSource).toContain("const b03TitleShortsLift = titleB03Charge ? 0.50 : 0")
    expect(zombieMeshSource).toContain("const b03TitleLegLift = titleB03Charge ? 0.12 : 0")
    expect(zombieMeshSource).toContain("const b03TitleLegSpread = titleB03Charge ? 0.04 : 0")
    expect(zombieMeshSource).toContain("composeStudioPartPosition(pt.shorts, 'y', -0.17, b03TitleShortsLift)")
    expect(zombieMeshSource).toContain("composeStudioPartPosition(pt.legL, 'y', 0, b03TitleLegLift)")
    expect(zombieMeshSource).toContain("composeStudioPartPosition(pt.legR, 'y', 0, b03TitleLegLift)")
    expect(zombieMeshSource).toContain("composeStudioPartPosition(pt.legL, 'x', -0.19, -b03TitleLegSpread)")
    expect(zombieMeshSource).toContain("composeStudioPartPosition(pt.legR, 'x', 0.19, b03TitleLegSpread)")
    expect(zombieMeshSource).toContain("const titleB03Charge = titleRunPose && type === 'B03' && animPhase === 'charge'")
    expect(zombieMeshSource).toContain("(animPhase === 'charge' ? 0.55 : 0.38)")
    const legLift = 0.12
    const thighTop = 0.05 + legLift
    const shortsBottom = -0.17 + 0.50 - 0.14
    const overlap = Math.max(0, thighTop - shortsBottom)
    expect(Number(overlap.toFixed(2))).toBe(0)
  })

  it('narrows only the B03 title legs and brings the jersey V medal detail forward', () => {
    const b03Source = zombieMeshSource.match(
      /function B03PhysicalEducationBossMesh[\s\S]*?function B04ChefBossMesh/,
    )?.[0]

    expect(b03Source).toBeDefined()
    expect(b03Source).toContain('<group name="b01JerseyVLeft" />')
    expect(b03Source).toContain('<group name="b01JerseyVRight" />')
    expect(b03Source).not.toContain('<ZBlock name="b01JerseyVLeft"')
    expect(b03Source).not.toContain('<ZBlock name="b01JerseyVRight"')
    expect(zombieMeshSource).toContain("const b03TitleLegSpread = titleB03Charge ? 0.04 : 0")
    expect(zombieMeshSource).not.toContain('b03TitleVForward')
    expect(zombieMeshSource).not.toContain('pt.jerseyVLeft')
    expect(zombieMeshSource).not.toContain('pt.jerseyVRight')
    expect(zombieMeshSource).toContain("const titleB03Charge = titleRunPose && type === 'B03' && animPhase === 'charge'")
    expect(b03Source.indexOf('b01JerseyVLeft')).toBeLessThan(b03Source.indexOf('b01JerseyVRight'))
  })

  it('draws the PE-teacher face, headband and whistle procedurally on the head block front', () => {
    const source = zombieMeshSource
    expect(source).not.toContain('boss03FaceUrl')
    expect(source).toMatch(/<ZBlock name="b01Head"[^>]*>\s*<BossProceduralFace bossType="B03" recipe=\{bossFaceRecipe\} \/>\s*<\/ZBlock>/)
    // 절차적 얼굴에 그려지므로 3D 이목구비/호루라기 파츠는 다시 만들지 않는다.
    expect(source).not.toContain('name="b01WhistleCord')
    expect(source).not.toContain('name="b01Nose"')
    expect(source).not.toContain('name="b01EyeL"')
    const layout = getBossFaceLayout('B03')
    expect(layout.size[0]).toBeCloseTo(0.56 - 2 * 0.44 * 0.14, 6)
    expect(layout.size[1]).toBeCloseTo(0.48 - 2 * 0.44 * 0.14, 6)
    expect(layout.position).toEqual([0, 0, 0.22 + 0.0015])
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
      'proceduralFace',
      'body',
      'neckerchief',
      'armL',
      'armR',
      'apron',
      'hips',
      'legL',
      'legR',
    ])
    const layout = getBossFaceLayout('B04')
    expect(layout.size[0]).toBeCloseTo(0.66 - 2 * 0.48 * 0.14, 6)
    expect(layout.size[1]).toBeCloseTo(0.48 - 2 * 0.48 * 0.14, 6)
    expect(layout.position).toEqual([0, 0, 0.26 + 0.0015])
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
    expect(chefSource).not.toContain('name="chefFaceCleanPlate"')
    expect(chefSource).toMatch(/<ZBlock name="chefHead"[^>]*>\s*<BossProceduralFace bossType="B04" recipe=\{bossFaceRecipe\} \/>\s*<\/ZBlock>/)
    // 귀는 예전 얼굴 평면 자리(빈 슬롯) 뒤에 남아 Studio 숫자 경로 2·3번을 유지한다.
    expect(chefSource.indexOf('<group name="chefFaceSlot" />')).toBeGreaterThan(-1)
    expect(chefSource.indexOf('<group name="chefFaceSlot" />')).toBeLessThan(chefSource.indexOf('name="chefEarL"'))
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
    expect(zombieMeshSource).toContain('<B04ChefBossMesh hitFlash={hitFlash} reg={reg} bossFaceRecipe={bossFaceRecipe} />')
    expect(zombieMeshSource).not.toContain('boss04FaceUrl')
    expect(chefSource).toBeDefined()
    expect(chefSource).not.toContain('studioPartId')
  })

  it('gives every chef group and block a distinct Studio label without changing numeric paths', () => {
    const chefSource = zombieMeshSource.match(
      /function B04ChefBossMesh[\s\S]*?function B02Stage2BossMesh/,
    )?.[0]
    const blockTags = chefSource?.match(/<ZBlock\b[^>]*\/?>/g) ?? []
    const blockNames = blockTags.map((tag) => tag.match(/name="([^"]+)"/)?.[1])
    const groupNames = [...(chefSource?.matchAll(/<group name="([^"]+)"/g) ?? [])].map((match) => match[1])

    expect(blockTags).toHaveLength(44)
    expect(blockNames.every(Boolean)).toBe(true)
    expect(new Set(blockNames).size).toBe(blockNames.length)
    expect(groupNames).toHaveLength(12)
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
    expect(chefSource).not.toContain('name="chefFaceCleanPlate"')
    expect(chefSource).not.toContain('renderOrder={20}')
    expect(chefSource).not.toContain('depthTest={false}')
    expect(chefSource).not.toContain('studioPartId')
  })
})

describe('Stage 3 run zombie crew visual reference', () => {
  it('registers leader and crew enemy stats separately from normal runners', () => {
    expect(ENEMY_STATS.RZL).toMatchObject({ hp: 90, speed: 2.695, scale: 1.08, runCrew: true })
    expect(ENEMY_STATS.RZC).toMatchObject({ hp: 28, speed: 2.398, scale: 0.78, runCrew: true })
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

describe('Stage 2 security guard chase visuals', () => {
  it('registers fully clothed fugitive and guard models through the shared Studio wrapper', () => {
    expect(ENEMY_STATS.RZT).toMatchObject({ hp: 140, speed: 1.4025, damage: 6, scale: 1.76, xp: 5, contactDist: 0.22, runCrew: true })
    expect(ENEMY_STATS.RZG).toMatchObject({ hp: 48, speed: 1.3475, damage: 9, scale: 0.92, xp: 6, contactDist: 0.24, runCrew: true })
    expect(ZOMBIE_PALETTE.RZT).toMatchObject({ body: 0xa87843 })
    expect(ZOMBIE_PALETTE.RZG).toMatchObject({ body: 0x173a5e })
    expect(STAGE2_GUARD_CHASE_VISUAL.parts).toEqual(expect.arrayContaining(['longTanTrenchCoat', 'navySecurityCap', 'yellowSecurityVest', 'fullClothing']))
    expect(getStudioZombieItemId('RZT')).toBe('zombie-rzt')
    expect(getStudioZombieItemId('RZG')).toBe('zombie-rzg')
    expect(GRAPHICS_STUDIO_CATALOG.some((entry) => entry.id === 'zombie-rzt')).toBe(true)
    expect(GRAPHICS_STUDIO_CATALOG.some((entry) => entry.id === 'zombie-rzg')).toBe(true)
    expect(zombieMeshSource).toContain('function Stage2GuardChaseZombieMesh')
    expect(zombieMeshSource).toContain("if (type === 'RZT' || type === 'RZG')")
    expect(zombieMeshSource).toContain('<StudioTunedGroup itemId={getStudioZombieItemId(type)}>')
  })
})

describe('Studio part-edit workaround cleanup', () => {
  it('does not keep the removed frozen/rest capture path in ZombieMesh', () => {
    const source = zombieMeshSource

    expect(source).not.toMatch(/if \(frozen\) return/)
    expect(source).not.toContain('frozen =')
    expect(source).toContain('staticPose = false')
    const frameStart = source.indexOf('useFrame((state, delta) => {')
    const staticGate = source.indexOf('if (staticPose) return', frameStart)
    const partLookup = source.indexOf('const pt = p.current', frameStart)
    expect(staticGate).toBeGreaterThan(frameStart)
    expect(staticGate).toBeLessThan(partLookup)
  })

  it('keeps staticPose as an early animation gate without the old rest-capture workaround', () => {
    const source = zombieMeshSource

    // ref ?깅줉 ???좊땲硫붿씠???쒖옉 ??rest transform 罹≪쿂
    expect(source).not.toContain('zombieRestRotation')
    expect(source).not.toContain('zombieRestScale')
    // staticPose is an early animation gate, not the removed base-transform recapture workaround.
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
      speed: 0.5225,
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
      'blockHeadWithProceduralFace',
      'brownBobAndBunHair',
      'redTornBlazer',
      'whiteShirtTieLanyard',
      'darkSkirt',
      'blueSkinHandsLegs',
      'blackShoes',
      'slightB02Walk',
    ])
  })

  it('uses a head-attached procedural face and separate controllable hair parts', () => {
    const source = zombieMeshSource

    expect(source).not.toContain('boss02FaceUrl')
    expect(source).toMatch(/<ZBlock name="b02Head"[^>]*>\s*<BossProceduralFace bossType="B02" recipe=\{bossFaceRecipe\} \/>\s*<\/ZBlock>/)
    expect(source).toContain('<B02Stage2BossMesh hitFlash={hitFlash} reg={reg} bossFaceRecipe={bossFaceRecipe} />')
    expect(source).toContain('itemId={getStudioZombieItemId(type)}')
    expect(source).toContain('studioRenderOutline')
    expect(source).not.toContain(legacyB02ItemId)
    const layout = getBossFaceLayout('B02')
    expect(layout.size[0]).toBeCloseTo(0.58 - 2 * 0.48 * 0.14, 6)
    expect(layout.size[1]).toBeCloseTo(0.50 - 2 * 0.48 * 0.14, 6)
    expect(layout.position).toEqual([0, 0, 0.24 + 0.0015])
    expect(graphicsStudioConfigSource).not.toContain(legacyB02ItemId)
  })

  it('disables raycasting on render-only ZBlock outlines', () => {
    expect(zombieMeshSource).toMatch(
      /<mesh(?=[^>]*renderOrder=\{1\})(?=[^>]*studioRenderOutline: true)(?=[^>]*raycast=\{disableRaycast\})[^>]*\/>/,
    )
  })
})

describe('general zombie chamfered block polish', () => {
  it('uses 1-step chamfer by default for zombie blocks while E08 keeps the 2-step inspection target', () => {
    const source = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')
    const instanceSource = readFileSync(new URL('./ZombieInstanceLayer.jsx', import.meta.url), 'utf8')
    expect(source).toContain('ZOMBIE_CHARACTER_CHAMFER_STEPS = 1')
    expect(source).toContain('chamferSteps = ZOMBIE_CHARACTER_CHAMFER_STEPS')
    expect(instanceSource).toContain("part[6] === 'chamfer2' ? 2 : 1")
    expect(instanceSource).toContain('getCachedChamferedBoxGeo(...part[2], chamferSteps)')
  })
})

describe('coin jingle zombie visual concept', () => {
  it('registers E08 as a coin-attract zombie with gold visual roles and 2-step chamfer blocks', () => {
    const source = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')
    const instanceSource = readFileSync(new URL('./ZombieInstanceLayer.jsx', import.meta.url), 'utf8')
    const toonSource = readFileSync(new URL('../lib/toon.js', import.meta.url), 'utf8')
    expect(source).toContain('E08')
    expect(source).toContain('coin:')
    expect(source).toContain('coinBag:')
    expect(source).toContain('CoinJingleZombieMesh')
    expect(source).toContain('getCachedChamferedBoxGeo')
    expect(source).toContain('chamferSteps={2}')
    expect(instanceSource).toContain("'chamfer2'")
    expect(instanceSource).toContain('const chamferSteps = part[6] === \'chamfer2\' ? 2 : 1')
    expect(instanceSource).toContain('getCachedChamferedBoxGeo(...part[2], chamferSteps)')
    expect(toonSource).toContain('RoundedBoxGeometry')
    expect(toonSource).toContain('getCachedChamferedBoxGeo')
  })
})


describe('hit flash keeps Studio-owned materials', () => {
  it('swaps the ZBlock flash imperatively instead of through the material prop', () => {
    const source = readFileSync(new URL('./ZombieMesh.jsx', import.meta.url), 'utf8')
    // A prop swap made R3F restore the raw cached material and drop the Studio-tuned clone.
    expect(source).not.toContain('flash ? getFlashMat() : getCachedToonMat(color, emissive)')
    expect(source).toContain('const mat    = getCachedToonMat(color, emissive)')
    expect(source).toContain('mesh.material = getFlashMat()')
    expect(source).toContain('mesh.material = restore')
  })

  it('never recolors the shared cached expansion materials for the flash', () => {
    const source = readFileSync(new URL('./expansion/ExpansionZombieMesh.jsx', import.meta.url), 'utf8')
    expect(source).not.toContain("mat.color.set('#ffffff')")
    expect(source).toContain('node.material=getFlashMat()')
    expect(source).toContain('node.material=node.userData.expansionFlashRestore')
  })
})
