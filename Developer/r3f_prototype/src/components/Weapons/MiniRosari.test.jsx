import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 2026-10-30: 오니기리에서 떼어 낸 미니 주인공 분신 발사체(b3fada83 · 3c0bcbe8)를 꼬마 로자리로 옮겼다.
// 아래 검사는 원래 Onigiri.test.jsx가 고정하던 분신 동작을 그대로 이 무기에 건다.
describe('MiniRosariWeapon projectile visual (mini protagonist)', () => {
  const source = readFileSync(new URL('./MiniRosari.jsx', import.meta.url), 'utf8')

  it('renders the real player model chosen by the saved appearance and the run outfit', () => {
    expect(source).toContain('loadSavedPlayerAppearance()')
    expect(source).toContain('outfit: useGameStore.getState().runOutfitId')
    expect(source).toContain('<PlayerV9Model movingRef={movingRef} animateRef={animateRef} gameplay outfit={look.outfit} sharedClone />')
    expect(source).toContain('<PlayerRosariModel movingRef={movingRef} animateRef={animateRef} gameplay />')
    expect(source).toContain('<PlayerMesh movingRef={movingRef} outfit={look.outfit} />')
    expect(source).not.toContain('OnigiiriModel')
  })

  // 2026-11-02: 분신 1개 상한(projRef 게이트)을 없애고 슬롯 풀로 바꿨다. 모델은 슬롯마다 1번만 만들고
  // 재사용한다(발사마다 복제하지 않음). 2026-11-22 Terry: 화면 최대 3명 — 공용 판단에 살아 있는 수를 넘기고,
  // 무리가 받아들인 뒤에만 슬롯을 빌린다.
  it('reuses pooled mini player instances, gates the throw at 3 alive, and claims a slot only after the swarm accepts', () => {
    expect(source.match(/<MiniRosariModel animateRef=\{slot\.activeRef\} \/>/g)).toHaveLength(1)
    // 2026-11-13: 발사체 컴포넌트 없이 무기 루프가 슬롯 group을 직접 움직인다.
    expect(source).toContain('writeMiniRosariPose(entry, slots[entry.slotIndex], camera, fading ? projectileFadeProgress(swarm, entry) : 0)')
    expect(source).toContain('entry.slotIndex = claimMiniRosariSlot(slots, launch.id)')
    expect(source).toContain('aliveCount: swarm.entries.length,')
    expect(source).toContain('maxAlive: swarm.maxAlive,')
    expect(source).toContain('maxAlive: MINI_ROSARI_MAX_ALIVE')
    expect(source).not.toContain('if (projRef.current.length > 0) return')
  })

  it('skips the hidden mini player pose work while a slot has no projectile in flight', async () => {
    const { claimMiniRosariSlot, releaseMiniRosariSlot } = await import('./MiniRosari.jsx')
    const slots = []
    const a = claimMiniRosariSlot(slots, 1)
    expect(slots[a].activeRef.current).toBe(true)
    releaseMiniRosariSlot(slots, 1)
    expect(slots[a].activeRef.current).toBe(false)
    for (const file of ['../PlayerV9Model.jsx', '../PlayerRosariModel.jsx']) {
      const model = readFileSync(new URL(file, import.meta.url), 'utf8')
      expect(model).toContain('animateRef = null')
      expect(model).toContain('if (animateRef && !animateRef.current) return')
    }
  })

  it('grows the clone pool only when every clone is busy and reuses freed clones', async () => {
    const { claimMiniRosariSlot, releaseMiniRosariSlot } = await import('./MiniRosari.jsx')
    const slots = []
    expect([claimMiniRosariSlot(slots, 1), claimMiniRosariSlot(slots, 2), claimMiniRosariSlot(slots, 3)]).toEqual([0, 1, 2])
    releaseMiniRosariSlot(slots, 2)
    expect(claimMiniRosariSlot(slots, 4)).toBe(1)
    expect(slots).toHaveLength(3)
    expect(claimMiniRosariSlot(slots, 5)).toBe(3)
    expect(slots).toHaveLength(4)
  })

  // 2026-11-17 끊김 수정: 오래 빈 슬롯을 내려놓았다가 다음 투척 때 주인공 모델을 통째로 다시 복제해 멈췄다.
  // 이제 무기를 얻는 순간 화면 상한(3명)만큼 미리 만들고, 풀은 줄이지 않는다(쓰지 않는 분신은 숨김).
  it('prefills the clone pool up to the on-screen cap (3) once, and never trims it', async () => {
    const {
      claimMiniRosariSlot, releaseMiniRosariSlot, prefillMiniRosariSlots, MINI_ROSARI_PREBUILT_SLOTS,
    } = await import('./MiniRosari.jsx')
    const { MINI_ROSARI_MAX_ALIVE: MINI_ROSARI_HOVER_CAP } = await import('../../lib/onigiri.js')
    expect(MINI_ROSARI_HOVER_CAP).toBe(3)
    expect(MINI_ROSARI_PREBUILT_SLOTS).toBe(MINI_ROSARI_HOVER_CAP)
    const slots = []
    expect(prefillMiniRosariSlots(slots)).toBe(MINI_ROSARI_HOVER_CAP)
    expect(prefillMiniRosariSlots(slots)).toBe(0) // 두 번째 호출은 아무것도 만들지 않는다
    expect(slots).toHaveLength(MINI_ROSARI_HOVER_CAP)
    expect(slots.every((slot) => slot.ownerId === null && slot.activeRef.current === false)).toBe(true)

    // 미리 만든 슬롯을 앞에서부터 재사용하고, 다 바쁠 때만 는다. 끝나도 줄지 않는다.
    const first = slots[0]
    for (let id = 1; id <= MINI_ROSARI_HOVER_CAP; id += 1) expect(claimMiniRosariSlot(slots, id)).toBe(id - 1)
    expect(slots[0]).toBe(first)
    expect(claimMiniRosariSlot(slots, 99)).toBe(MINI_ROSARI_HOVER_CAP)
    for (let id = 1; id <= MINI_ROSARI_HOVER_CAP; id += 1) releaseMiniRosariSlot(slots, id)
    releaseMiniRosariSlot(slots, 99)
    expect(slots).toHaveLength(MINI_ROSARI_HOVER_CAP + 1)
  })

  it('builds the clones when the weapon is acquired, not on a throw, and has no idle trim in the frame loop', () => {
    const weaponSource = source.slice(source.indexOf('export function MiniRosariWeapon'))
    expect(source).not.toContain('trimIdleMiniRosariSlots')
    expect(weaponSource).toMatch(/useEffect\(\(\) => \{\s+if \(!active\) \{[\s\S]*?if \(prefillMiniRosariSlots\(slotsRef\.current\) > 0\) setSlotVersion\(\(v\) => v \+ 1\)\s+\}, \[active, resetAll\]\)/)
    // 판 리셋은 분신 주인·표시만 비우고 미리 만든 모델은 남긴다.
    const resetAll = weaponSource.slice(weaponSource.indexOf('const resetAll'), weaponSource.indexOf('}, [])'))
    expect(resetAll).not.toContain('slotsRef.current = []')
  })

  it('hidden clones skip per-frame matrix updates until a pose shows them again', async () => {
    const { hideMiniRosariClone } = await import('./MiniRosari.jsx')
    const group = { visible: true, matrixWorldAutoUpdate: true, userData: { miniRosariOwnerId: 3 } }
    hideMiniRosariClone(group, 3)
    expect(group.matrixWorldAutoUpdate).toBe(false)
    const projectileSource = source.slice(source.indexOf('function writeMiniRosariPose'), source.indexOf('function hitMiniRosariTarget'))
    expect(projectileSource).toMatch(/group\.visible = shown\s+group\.matrixWorldAutoUpdate = shown/)
    expect(source).toContain('<group key={index} ref={slot.ref} visible={false} matrixWorldAutoUpdate={false}>')
  })

  it('hops toward the target and bounces with the shared flight stepper', () => {
    expect(source).toContain('MINI_ROSARI_HOP_HEIGHT')
    expect(source).toContain("rotation.set(0.18, Math.atan2(flight.dirX, flight.dirZ), 0, 'YXZ')")
    expect(source).toContain('createProjectileSwarm({ speed: MINI_ROSARI_SPEED')
    expect(source).toContain('stepProjectileSwarm(swarm, delta, { onHit: hitMiniRosariTarget, onRetire: retireRef.current })')
    expect(source).toContain('applyEnemyHit(flight.hitTarget.rb, flight.hitTarget.generation')
    expect(source).not.toContain('enemyBodies.forEach')
  })

  it('reads its own weapon slot, not onigiri', () => {
    expect(source).toContain('weapons.miniRosari')
    expect(source).not.toContain('weapons.onigiri')
  })

  it('scales the mini player down to a half-size clone', async () => {
    const { MINI_ROSARI_SCALE, MiniRosariWeapon } = await import('./MiniRosari.jsx')
    expect(MINI_ROSARI_SCALE).toBeGreaterThan(0.3)
    expect(MINI_ROSARI_SCALE).toBeLessThan(0.75)
    expect(MiniRosariWeapon).toBeTypeOf('function')
  })

  it('is exported from the weapons barrel and mounted by Game', () => {
    const barrel = readFileSync(new URL('./index.js', import.meta.url), 'utf8')
    const game = readFileSync(new URL('../Game.jsx', import.meta.url), 'utf8')
    expect(barrel).toContain("export { MiniRosariWeapon }")
    expect(game).toContain('<MiniRosariWeapon />')
  })
})

// 2026-11-02 Terry 확정: 새 분신은 언제나 로자리 몸에서(2026-11-22부터 화면 최대 3명). 바운스가 남은 분신은 사라지지 않고
// 그 자리에서 다음 적을 찾거나 깡충거리며 기다린다(동작 검증은 lib/onigiri.test.js flight rules).
describe('MiniRosari launch origin and flight wiring (2026-11-02)', () => {
  const source = readFileSync(new URL('./MiniRosari.jsx', import.meta.url), 'utf8')
  const projectileSource = source.slice(source.indexOf('function writeMiniRosariPose'), source.indexOf('function createMiniRosariSlot'))
  const weaponSource = source.slice(source.indexOf('export function MiniRosariWeapon'))

  it('never ends early to relaunch from the player', () => {
    expect(projectileSource).not.toMatch(/onDone\(id, \{/)
    expect(projectileSource).not.toContain('playerPos')
    // 코드에서 playerPos는 새 투척의 출발점으로만 쓴다(주석 제외).
    expect(weaponSource.split('\n').filter((line) => !line.trim().startsWith('//') && line.includes('playerPos'))).toEqual(['        origin: playerPos,'])
    expect(source).not.toContain('relaunch')
  })

  it('every new clone starts from the current playerPos through the shared frame planner', () => {
    expect(source).toMatch(/import \{[^}]*planOnigiriFrame[^}]*stepProjectileSwarm[^}]*\} from '..\/..\/lib\/onigiri.js'/)
    expect(weaponSource).not.toContain('start:')
    expect(weaponSource).not.toContain('createOnigiriLaunch')
    expect(weaponSource.match(/planOnigiriFrame\(/g)).toHaveLength(1)
    expect(weaponSource).toContain('origin: playerPos,')
  })
})

// balanceqa M1 (2026-11-01): 표적을 잃은 프레임과 바운스를 다 쓴 프레임에 분신이 공중에 멈춘 채 1~2프레임 보였다.
describe('MiniRosari clone hides on the frame it ends (balanceqa M1)', () => {
  const source = readFileSync(new URL('./MiniRosari.jsx', import.meta.url), 'utf8')
  const projectileSource = source.slice(source.indexOf('function writeMiniRosariPose'), source.indexOf('function createMiniRosariSlot'))

  it('hides the clone right before it ends, and keeps the owner-checked unmount safety net', () => {
    // 끝난 분신(바운스 소진 = 그 스텝 / 3초 대기 = 스르륵이 끝난 스텝)은 무리 스텝이 끝내는 그 스텝에 축척을
    // 되돌리고 숨긴 뒤 슬롯을 놓는다(발사체 컴포넌트 없음).
    expect(source).toMatch(/retireRef\.current = \(entry\) => \{\s+const group = slotsRef\.current\[entry\.slotIndex\]\?\.ref\.current\s+if \(group\) group\.scale\.set\(1, 1, 1\)\s+hideMiniRosariClone\(group, entry\.id\)\s+releaseMiniRosariSlot\(slotsRef\.current, entry\.id\)/)
    // 무기 해제·리셋 때도 주인 확인 숨김으로 정리한다.
    expect(source).toMatch(/clearProjectileSwarm\(swarmRef\.current, \(entry\) => \{\s+const group = slotsRef\.current\[entry\.slotIndex\]\?\.ref\.current\s+if \(group\) group\.scale\.set\(1, 1, 1\)\s+hideMiniRosariClone\(group, entry\.id\)/)
    expect(projectileSource).toMatch(/group\.userData\.miniRosariOwnerId = id\s+group\.visible = shown/)
  })

  it('only the projectile that owns the clone can hide it, so a late cleanup never blinks the next clone off', async () => {
    const { hideMiniRosariClone } = await import('./MiniRosari.jsx')
    const group = { visible: true, userData: { miniRosariOwnerId: 2 } }

    hideMiniRosariClone(group, 1) // 늦게 도는 이전 발사체 정리
    expect(group.visible).toBe(true)
    expect(group.userData.miniRosariOwnerId).toBe(2)

    hideMiniRosariClone(group, 2) // 현재 주인이 끝남
    expect(group.visible).toBe(false)
    expect(group.userData.miniRosariOwnerId).toBeNull()

    expect(() => hideMiniRosariClone(null, 2)).not.toThrow()
  })
})

// balanceqa F2 (2026-11-02): 기다리는 분신이 상한 없이 쌓여도 렌더 비용이 커지지 않게 한다.
// 그림자 끔 + 화면 밖에서 기다리는 분신은 숨기고 포즈 계산을 건너뛴다. 탐색·피격은 그대로 돈다.
describe('MiniRosari waiting clone render cost (balanceqa F2)', () => {
  const source = readFileSync(new URL('./MiniRosari.jsx', import.meta.url), 'utf8')
  const projectileSource = source.slice(source.indexOf('function writeMiniRosariPose'), source.indexOf('function createMiniRosariSlot'))

  async function makeCamera() {
    const THREE = await import('three')
    // 게임과 같은 탑다운 직교 카메라: 원점 위에서 내려다보며 가로 ±8, 세로 ±5가 보인다.
    const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100)
    camera.position.set(0, 20, 0)
    camera.up.set(0, 0, -1)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    camera.updateProjectionMatrix()
    return camera
  }

  it('hides a waiting clone only when it is outside the camera view', async () => {
    const { shouldRenderMiniRosariClone } = await import('./MiniRosari.jsx')
    const { FLIGHT_HOVERING, FLIGHT_FLYING, FLIGHT_HIT } = await import('../../lib/onigiri.js')
    const camera = await makeCamera()

    expect(shouldRenderMiniRosariClone(FLIGHT_HOVERING, camera, 2, 0.2, 1)).toBe(true)   // 화면 안에서 대기
    expect(shouldRenderMiniRosariClone(FLIGHT_HOVERING, camera, 30, 0.2, 0)).toBe(false) // 화면 밖에서 대기
    expect(shouldRenderMiniRosariClone(FLIGHT_HOVERING, camera, 0, 0.2, -30)).toBe(false)
    // 뛰어가는 분신은 화면 밖이어도 그대로 그린다(대기 중일 때만 숨김).
    expect(shouldRenderMiniRosariClone(FLIGHT_FLYING, camera, 30, 0.2, 0)).toBe(true)
    expect(shouldRenderMiniRosariClone(FLIGHT_HIT, camera, 30, 0.2, 0)).toBe(true)
    // 카메라를 모르면 숨기지 않는다.
    expect(shouldRenderMiniRosariClone(FLIGHT_HOVERING, null, 30, 0.2, 0)).toBe(true)
  })

  it('wires visibility to both the clone group and its pose switch, after the gameplay step', () => {
    expect(projectileSource).toContain('const shown = shouldRenderMiniRosariClone(entry.state, camera, flight.x, y, flight.z)')
    expect(projectileSource).toContain('group.visible = shown')
    expect(projectileSource).toContain('slot.activeRef.current = shown')
    // 탐색·피격(무리 스텝)은 표시 판단(자세 쓰기)보다 먼저, 조건 없이 돈다.
    const weaponSource = source.slice(source.indexOf('export function MiniRosariWeapon'))
    const stepAt = weaponSource.indexOf('stepProjectileSwarm(swarm, delta')
    const showAt = weaponSource.indexOf('writeMiniRosariPose(entry')
    expect(stepAt).toBeGreaterThan(-1)
    expect(showAt).toBeGreaterThan(stepAt)
    expect(source).toContain('<MiniRosariModel animateRef={slot.activeRef} />')
  })

  it('turns off shadow casting on every mesh of the clone, once per slot', async () => {
    const THREE = await import('three')
    const { disableMiniRosariCloneShadows } = await import('./MiniRosari.jsx')
    const root = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
    const hull = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
    body.castShadow = true
    hull.castShadow = true
    body.add(hull)
    root.add(body)

    expect(disableMiniRosariCloneShadows(root)).toBe(2)
    expect(body.castShadow).toBe(false)
    expect(hull.castShadow).toBe(false)
    expect(disableMiniRosariCloneShadows(new THREE.Group())).toBe(0) // 모델이 아직 안 붙음 → 다음 프레임에 다시
    expect(disableMiniRosariCloneShadows(null)).toBe(0)
    expect(projectileSource).toContain('if (!group.userData.miniRosariShadowsOff && disableMiniRosariCloneShadows(group) > 0)')
  })
})
