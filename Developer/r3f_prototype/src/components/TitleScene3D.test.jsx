import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { GRAPHICS_STUDIO_STORAGE_KEY } from '../lib/graphicsStudioConfig.js'
import {
  TITLE_BOARD_BACK_LIMIT_Z,
  TITLE_SCENE_DIRECTION,
  TITLE_ZOMBIE_GROUND_LIFT_Y,
  applyClubLightFrame,
  applyTitleCharacterOutline,
  clampTitleBackgroundZ,
  disposeTitleCharacterOutlines,
  isTitleOutlineStorageEvent,
  prepareTitleCharactersForStudioUpdate,
} from './TitleScene3D.jsx'
import { applyStudioTuning } from './StudioTunedGroup.jsx'

describe('TitleScene3D direction', () => {
  it('lifts every title zombie family above the floor without changing model internals', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(TITLE_ZOMBIE_GROUND_LIFT_Y).toBe(0.16)
    expect(source.match(/const liftedPosition = \[position\[0\], position\[1\] \+ TITLE_ZOMBIE_GROUND_LIFT_Y, position\[2\]\]/g)).toHaveLength(3)
    expect(source).toContain('ref.current.position.y = liftedPosition[1] + Math.sin(t * 2.1) * 0.035')
    expect(source).toContain('ref.current.position.y = liftedPosition[1] + Math.sin(t * 1.9) * 0.035')
    expect(source.match(/position=\{liftedPosition\}/g)).toHaveLength(3)
  })

  it('keeps the title scene focused on exit and zombie pursuit', () => {
    expect(TITLE_SCENE_DIRECTION.scene).toMatchObject({
      exitGlow: true,
      infectionStreaks: 2,
      warningLights: 2,
      zombieStudents: 5,
      bossZombies: 3,
      matildaPursuers: 1,
      clubLights: {
        beams: 2,
        palette: ['cyan', 'magenta'],
        animated: true,
        dynamicLights: 1,
        fixtures: 0,
      },
      realForegroundResources: [
        'ZombieMesh',
        'MatildaMesh',
        'ClassroomDesk',
        'ClassroomChair',
        'UnconsciousStudent',
      ],
    })
  })

  it('keeps the blue and purple light beams while removing fixtures and lens squares', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain('function ClubLightRig({ reducedEffects })')
    expect(source).toContain('function ClubLightBeam')
    expect(source).toContain('export function applyClubLightFrame')
    expect(source).toContain('<ClubLightRig reducedEffects={reducedEffects} />')
    expect(source).toContain('const CLUB_LIGHT_BEAMS = [')
    expect(source).toContain('0x59c7ff')
    expect(source).toContain('0xd64fa8')
    expect(source).toContain('<pointLight ref={washRef}')
    expect(source).toContain('<coneGeometry args={[1.18, 4.6, 10, 1, true]} />')
    expect(source).toContain('<coneGeometry args={[0.46, 4.3, 8, 1, true]} />')
    expect(source).not.toContain('<circleGeometry args={[0.13, 12]} />')
    expect(source).not.toContain('CLUB_LIGHT_HOUSING_GEO')
    expect(source).not.toContain('housingMat')
    expect(source).not.toContain('getCachedToonMat(0x17131e, 0.06)')
  })

  it('freezes the restored light beams in reduced-effects mode and resumes animation', () => {
    const beamStates = Array.from({ length: 2 }, () => ({
      node: { rotation: { z: 99 } },
      beamMat: { opacity: 99 },
      coreMat: { opacity: 99 },
    }))
    const wash = { color: new THREE.Color(), intensity: 99 }

    applyClubLightFrame(beamStates, wash, 3, true)

    expect(beamStates.map(({ node }) => node.rotation.z)).toEqual([0.13, -0.13])
    expect(beamStates.map(({ beamMat }) => beamMat.opacity)).toEqual([0.065, 0.065])
    expect(beamStates.map(({ coreMat }) => coreMat.opacity)).toEqual([0.08, 0.08])
    expect(wash.intensity).toBe(0.45)

    applyClubLightFrame(beamStates, wash, 3, false)

    expect(beamStates[0].node.rotation.z).not.toBe(0.13)
    expect(beamStates[0].beamMat.opacity).not.toBe(0.065)
    expect(beamStates[0].coreMat.opacity).not.toBe(0.08)
    expect(wash.intensity).not.toBe(0.45)
  })

  it('uses the real Matilda model upright and facing the chase target', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain("import MatildaMesh from './MatildaMesh.jsx'")
    expect(source).toContain('const yaw = faceTitleTargetYaw(position)')
    expect(source).toContain('ref.current.rotation.y = yaw + Math.sin(t * 1.1) * 0.018')
    expect(source).toContain('rotation={[0, yaw, 0]} scale={scale}')
    expect(source).toContain('<MatildaMesh />')
  })

  it('fills title foreground props with real in-game resources', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain("import ZombieMesh from './ZombieMesh.jsx'")
    expect(source).toContain("import { ClassroomChair, ClassroomDesk, UnconsciousStudent } from './StageObjects/index.js'")
    expect(source).toContain('<ZombieMesh type={type} animPhase="charge" />')
    expect(source).toContain('<TitleBossZombie type="B02" position={[-1.99, 0.18, -3.7]} scale={0.93} delay={0.9} />')
    expect(source).toContain('<TitleBossZombie type="B03" position={[0.02, 0.4, -4.04]} scale={1.344} delay={1.35} />')
    expect(source).toContain('<TitleBossZombie type="B01" position={[-0.86, 0.34, -1.12]} scale={1.02} />')
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
    expect(source).toContain('<TitleMatildaPursuer position={[1.45, 0.36, -2.92]} delay={1.8} scale={1.44} />')
  })

  it('places the real duck potty and Chibiko models in the title foreground', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain("import { CompassBladeModel } from './Weapons/CompassBlade.jsx'")
    expect(source).toContain("import { ChibikoModel } from './Weapons/Chibiko.jsx'")
    expect(source).toContain('position={[-0.22, 0.2, 0.82]}')
    expect(source).toContain('<CompassBladeModel />')
    expect(source).toContain('<ChibikoModel attackPhaseRef={chibikoAttackPhaseRef} />')
    expect(source).toContain('<TitleCompanions />')
  })

  it('restores the far-background models below the blue and purple lights', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain("import { StarlinkSatelliteModel, ZomlonbiskModel } from './Weapons/StarlinkSatellite.jsx'")
    expect(source).toContain('function TitleFarBackgroundStory({ reducedEffects })')
    expect(source).toContain('<StarlinkSatelliteModel studioItemId="title-crashed-starlink" />')
    expect(source).toContain('<ZomlonbiskModel running={false} />')
    expect(source).toContain('<TitleFarBackgroundStory reducedEffects={reducedEffects} />')
  })

  it('restores the far Zomlonbisk animation and keeps both DancingDoges', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain('const zomlonbiskRef = useRef()')
    expect(source).toContain('zomlonbiskRef.current.position.y = 0.68 + Math.abs(s) * 0.05')
    expect(source).toContain('<DancingDoge position={[-1.27, 0.0, 1.55]} dance="twist"')
    expect(source).toContain('<DancingDoge position={[1.97, 0.0, 1.5]} dance="disco"')
  })

  it('keeps far-background story models behind the title board', () => {
    expect(TITLE_BOARD_BACK_LIMIT_Z).toBe(-4.62)
    expect(clampTitleBackgroundZ(-4.2)).toBe(-4.62)
    expect(clampTitleBackgroundZ(-7)).toBe(-7)
  })

  it('keeps the title board surface and glow overlay at the restored size', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain('const doorMat = useMemo(() => toonMat(0x805947, 0.05), [])')
    expect(source).toContain('position={[0, 1.3, -4.62]} material={doorMat}')
    expect(source).toContain('<boxGeometry args={[1.7, 1.3, 0.32]} />')
    expect(source).toContain('<boxGeometry args={[1.475, 1.15, 0.08]} />')
    expect(source).toContain('<circleGeometry args={[2.6, 36]} />')
  })

  it('removes the two dark side-wall rectangles behind the title text', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain('const wallMat = useMemo(() => toonMat(0x2d2738, 0.05), [])')
    expect(source).not.toContain('position={[-3.15, 1.1, -0.4]} rotation={[0, 0.16, 0]} material={wallMat}')
    expect(source).not.toContain('position={[3.15, 1.1, -0.4]} rotation={[0, -0.16, 0]} material={wallMat}')
    expect(source).not.toContain('<boxGeometry args={[0.32, 3.3, 9.2]} />')
  })

  it('removes both clicked exit-light boxes and their unused component', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).not.toContain('ToonBox')
  })

  it('keeps the removed club-light housing boxes from returning', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain('function ClubLightBeam')
    expect(source).not.toContain('CLUB_LIGHT_HOUSING_GEO')
    expect(source).not.toContain('housingMat')
    expect(source).not.toContain('getCachedToonMat(0x17131e, 0.06)')
    expect(source).not.toContain('geometry={CLUB_LIGHT_HOUSING_GEO} material={housingMat}')
  })

  it('reports the clicked Three.js mesh to the CDP inspector', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain('export function inspectTitleSceneObject(event)')
    expect(source).toContain('window.__zombieSchoolScreenInspector')
    expect(source).toContain('inspector.inspectThree({')
    expect(source).toContain('onPointerDown={inspectTitleSceneObject}')
  })

  it('turns all title zombies toward the chase target', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')

    expect(source).toContain('const TITLE_CHASE_TARGET = [0.48, 0.08]')
    expect(source).toContain('function faceTitleTargetYaw(position)')
    expect(source).toContain('ref.current.rotation.y = yaw + Math.sin(t * 1.15) * 0.025')
    expect(source).toContain('ref.current.rotation.y = yaw + Math.sin(t * 0.95) * 0.018')
  })

  it('renders the Firebase-tuned Studio player without title-only mesh or outline mutation', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')
    const outlineStart = source.indexOf('<TitleCharacterOutlineGroup>')
    const outlineEnd = source.indexOf('</TitleCharacterOutlineGroup>', outlineStart)
    const titlePlayerIndex = source.indexOf('<TitlePlayer />')

    expect(source).toContain("import { PlayerVisual } from './Player.jsx'")
    expect(source).toContain('function TitlePlayer()')
    expect(source).toContain('position={[0.48, 0.88, 0.38]} rotation={[-0.08, 0.48, 0.05]} scale={2}')
    expect(source).toContain('<PlayerVisual')
    expect(source).toContain('showHealthBar={false}')
    expect(source).not.toContain('graphicsStudioPlayerSource')
    expect(titlePlayerIndex).toBeGreaterThan(outlineEnd)
  })

  it('gives character fills and outlines stencil ref 2 without changing background ref 1', () => {
    const scene = new THREE.Group()
    const characterRoot = new THREE.Group()
    const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x224466 })
    backgroundMaterial.stencilWrite = true
    backgroundMaterial.stencilRef = 1
    backgroundMaterial.stencilFunc = THREE.AlwaysStencilFunc
    const background = new THREE.Mesh(new THREE.BoxGeometry(), backgroundMaterial)
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x050209,
      opacity: 0.6,
      side: THREE.BackSide,
      transparent: true,
    })
    outlineMaterial.stencilWrite = true
    outlineMaterial.stencilRef = 1
    outlineMaterial.stencilFunc = THREE.NotEqualStencilFunc
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: 0xff55aa,
      opacity: 0.72,
      transparent: true,
    })
    fillMaterial.stencilWrite = true
    fillMaterial.stencilRef = 1
    fillMaterial.stencilFunc = THREE.AlwaysStencilFunc
    const outline = new THREE.Mesh(new THREE.BoxGeometry(), outlineMaterial)
    const fill = new THREE.Mesh(new THREE.BoxGeometry(), fillMaterial)
    outline.scale.set(1.04, 1.08, 0.96)
    fill.scale.set(0.9, 1.1, 1.2)
    scene.add(background, characterRoot)
    characterRoot.add(outline, fill)

    const outlineBaseScale = outline.scale.clone()
    const fillBaseScale = fill.scale.clone()
    applyTitleCharacterOutline(characterRoot)

    expect(background.material).toBe(backgroundMaterial)
    expect(background.material.stencilRef).toBe(1)
    expect(fill.material).not.toBe(fillMaterial)
    expect(fill.material.stencilRef).toBe(2)
    expect(fill.material.color.getHex()).toBe(fillMaterial.color.getHex())
    expect(fill.material.opacity).toBe(fillMaterial.opacity)
    expect(fill.material.transparent).toBe(fillMaterial.transparent)
    expect(outline.material).not.toBe(outlineMaterial)
    expect(outline.material.stencilRef).toBe(2)
    expect(outline.material.color.getHex()).toBe(0x000000)
    expect(outline.material.opacity).toBe(1)
    expect(outline.material.transparent).toBe(false)
    expect(outline.scale.x).toBeCloseTo(outlineBaseScale.x * 1.02)
    expect(outline.scale.y).toBeCloseTo(outlineBaseScale.y * 1.02)
    expect(outline.scale.z).toBeCloseTo(outlineBaseScale.z * 1.02)
    expect(fill.scale.equals(fillBaseScale)).toBe(true)

    const appliedScale = outline.scale.clone()
    const appliedFill = fill.material
    applyTitleCharacterOutline(characterRoot)
    expect(outline.scale.equals(appliedScale)).toBe(true)
    expect(fill.material).toBe(appliedFill)
  })

  it('disposes only owned outline clones and can apply again from the base scale', () => {
    const root = new THREE.Group()
    const sourceMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide })
    sourceMaterial.stencilFunc = THREE.NotEqualStencilFunc
    const outline = new THREE.Mesh(new THREE.BoxGeometry(), sourceMaterial)
    const fillSource = new THREE.MeshBasicMaterial({ color: 0x336699 })
    fillSource.stencilWrite = true
    fillSource.stencilRef = 1
    fillSource.stencilFunc = THREE.AlwaysStencilFunc
    const fill = new THREE.Mesh(new THREE.BoxGeometry(), fillSource)
    const fillTwin = new THREE.Mesh(new THREE.BoxGeometry(), fillSource)
    outline.scale.set(1.1, 0.9, 1.05)
    root.add(outline, fill, fillTwin)
    const baseScale = outline.scale.clone()
    const sourceDispose = vi.spyOn(sourceMaterial, 'dispose')
    const fillSourceDispose = vi.spyOn(fillSource, 'dispose')

    applyTitleCharacterOutline(root)
    const fillClone = fill.material
    expect(fillTwin.material).toBe(fillClone)
    const fillCloneDispose = vi.spyOn(fillClone, 'dispose')
    const firstClone = outline.material
    const firstCloneDispose = vi.spyOn(firstClone, 'dispose')
    const replacementSource = sourceMaterial.clone()
    const replacementDispose = vi.spyOn(replacementSource, 'dispose')
    outline.material = replacementSource
    applyTitleCharacterOutline(root)

    expect(firstCloneDispose).not.toHaveBeenCalled()
    const secondClone = outline.material
    const secondCloneDispose = vi.spyOn(secondClone, 'dispose')
    disposeTitleCharacterOutlines(root)

    expect(firstCloneDispose).toHaveBeenCalledOnce()
    expect(secondCloneDispose).toHaveBeenCalledOnce()
    expect(fillCloneDispose).toHaveBeenCalledOnce()
    expect(sourceDispose).not.toHaveBeenCalled()
    expect(fillSourceDispose).not.toHaveBeenCalled()
    expect(replacementDispose).not.toHaveBeenCalled()
    expect(outline.material).toBe(replacementSource)
    expect(fill.material).toBe(fillSource)
    expect(fillTwin.material).toBe(fillSource)
    expect(outline.scale.equals(baseScale)).toBe(true)
    expect(outline.userData.titleCharacterOutline).toBeUndefined()

    applyTitleCharacterOutline(root)
    expect(outline.material).not.toBe(replacementSource)
    expect(fill.material).not.toBe(fillSource)
    expect(fillTwin.material).toBe(fill.material)
    expect(fill.material.stencilRef).toBe(2)
    expect(outline.scale.x).toBeCloseTo(baseScale.x * 1.02)
  })

  it('restores live Studio materials before repeated reset and hydrate passes', () => {
    const root = new THREE.Group()
    const fillSource = new THREE.MeshToonMaterial({ color: 0xff4f86 })
    fillSource.stencilWrite = true
    fillSource.stencilFunc = THREE.AlwaysStencilFunc
    const fill = new THREE.Mesh(new THREE.BoxGeometry(), fillSource)
    root.add(fill)

    applyStudioTuning(root, {
      color: '#35c9f2',
      colorStrength: 1,
    })
    const studioOwnedSource = fill.material
    const studioOwnedDispose = vi.spyOn(studioOwnedSource, 'dispose')

    applyTitleCharacterOutline(root)
    expect(fill.material).not.toBe(studioOwnedSource)

    for (let pass = 0; pass < 3; pass += 1) {
      prepareTitleCharactersForStudioUpdate(root)
      expect(fill.material).toBe(studioOwnedSource)
      expect(studioOwnedDispose).not.toHaveBeenCalled()

      applyStudioTuning(root)
      applyTitleCharacterOutline(root)

      expect(fill.material.color.getHex()).toBe(0xff4f86)
      expect(fill.material.stencilRef).toBe(2)
      expect(studioOwnedDispose).not.toHaveBeenCalled()
    }

    prepareTitleCharactersForStudioUpdate(root)
    const hydratedSource = new THREE.MeshToonMaterial({ color: 0x6bcf63 })
    hydratedSource.stencilWrite = true
    hydratedSource.stencilFunc = THREE.AlwaysStencilFunc
    fill.material = hydratedSource
    applyTitleCharacterOutline(root)
    expect(fill.material.color.getHex()).toBe(0x6bcf63)

    prepareTitleCharactersForStudioUpdate(root)
    expect(fill.material).toBe(hydratedSource)
    expect(fill.material.color.getHex()).toBe(0x6bcf63)
  })

  it('reapplies outlines only for graphics-studio storage changes or storage clear', () => {
    expect(isTitleOutlineStorageEvent({ key: GRAPHICS_STUDIO_STORAGE_KEY })).toBe(true)
    expect(isTitleOutlineStorageEvent({ key: null })).toBe(true)
    expect(isTitleOutlineStorageEvent({ key: 'unrelated.storage.key' })).toBe(false)

    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')
    expect(source).toContain('GRAPHICS_STUDIO_STORAGE_KEY, GRAPHICS_STUDIO_TUNING_EVENT')
    expect(source).toContain('prepareTitleCharactersForStudioUpdate(group)')
    expect(source).toContain('if (isTitleOutlineStorageEvent(event)) markDirty()')
    expect(source).toContain('disposeTitleCharacterOutlines(group)')
  })

  it('keeps scene props outside the title character outline pass', () => {
    const source = readFileSync(new URL('./TitleScene3D.jsx', import.meta.url), 'utf8')
    const wrapperStart = source.indexOf('<TitleCharacterOutlineGroup>')
    const wrapperEnd = source.indexOf('</TitleCharacterOutlineGroup>', wrapperStart)
    const characterSource = source.slice(wrapperStart, wrapperEnd)

    expect(wrapperStart).toBeGreaterThan(-1)
    expect(wrapperEnd).toBeGreaterThan(wrapperStart)
    expect(characterSource).toContain('<TitleFarBackgroundStory reducedEffects={reducedEffects} />')
    expect(characterSource.match(/<TitleBossZombie/g)).toHaveLength(3)
    expect(characterSource.match(/<TitleZombie/g)).toHaveLength(5)
    expect(characterSource).toContain('<TitleMatildaPursuer')
    expect(characterSource.match(/<DancingDoge/g)).toHaveLength(2)
    expect(characterSource).toContain('<TitleCompanions />')
    expect(characterSource).not.toContain('<TitleClassroomProps />')
    expect(characterSource).not.toContain('<SpeedStreak')
    expect(characterSource).not.toContain('<WarningLight')
  })
})
