import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 2026-10-30: 오니기리에서 떼어 낸 미니 주인공 분신 발사체(b3fada83 · 3c0bcbe8)를 꼬마 로자리로 옮겼다.
// 아래 검사는 원래 Onigiri.test.jsx가 고정하던 분신 동작을 그대로 이 무기에 건다.
describe('MiniRosariWeapon projectile visual (mini protagonist)', () => {
  const source = readFileSync(new URL('./MiniRosari.jsx', import.meta.url), 'utf8')

  it('renders the real player model chosen by the saved appearance and the run outfit', () => {
    expect(source).toContain('loadSavedPlayerAppearance()')
    expect(source).toContain('outfit: useGameStore.getState().runOutfitId')
    expect(source).toContain('<PlayerV9Model movingRef={movingRef} animateRef={animateRef} gameplay outfit={look.outfit} />')
    expect(source).toContain('<PlayerRosariModel movingRef={movingRef} animateRef={animateRef} gameplay />')
    expect(source).toContain('<PlayerMesh movingRef={movingRef} outfit={look.outfit} />')
    expect(source).not.toContain('OnigiiriModel')
  })

  // 2026-11-02 Terry: "화면상 오니기리가 몇 개 있더라도 늘려" — 분신 1개 상한(projRef 게이트)을 없애고
  // 슬롯 풀로 바꿨다. 모델은 슬롯마다 1번만 만들고 재사용한다(발사마다 복제하지 않음).
  it('reuses pooled mini player instances instead of cloning a model per shot, with no one-at-a-time gate', () => {
    expect(source.match(/<MiniRosariModel animateRef=\{slot\.activeRef\} \/>/g)).toHaveLength(1)
    expect(source).toContain('visualRef={slotsRef.current[p.slotIndex].ref}')
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

  it('hops toward the target and bounces with the shared flight stepper', () => {
    expect(source).toContain('MINI_ROSARI_HOP_HEIGHT')
    expect(source).toContain("rotation.set(0.18, Math.atan2(flight.dirX, flight.dirZ), 0, 'YXZ')")
    expect(source).toContain('stepOnigiriFlight(flight, delta, MINI_ROSARI_SPEED)')
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

// 2026-11-02 Terry 확정: 새 분신은 언제나 로자리 몸에서, 상한 없이. 바운스가 남은 분신은 사라지지 않고
// 그 자리에서 다음 적을 찾거나 깡충거리며 기다린다(동작 검증은 lib/onigiri.test.js flight rules).
describe('MiniRosari launch origin and flight wiring (2026-11-02)', () => {
  const source = readFileSync(new URL('./MiniRosari.jsx', import.meta.url), 'utf8')
  const projectileSource = source.slice(source.indexOf('function MiniRosariProjectile'), source.indexOf('export function MiniRosariWeapon'))
  const weaponSource = source.slice(source.indexOf('export function MiniRosariWeapon'))

  it('never ends early to relaunch from the player', () => {
    expect(projectileSource).not.toMatch(/onDone\(id, \{/)
    expect(projectileSource).not.toContain('playerPos')
    expect(source).not.toContain('relaunch')
  })

  it('every new clone starts from the current playerPos through the shared frame planner', () => {
    expect(source).toContain("import { FLIGHT_DONE, createOnigiriFlight, planOnigiriFrame, stepOnigiriFlight } from '../../lib/onigiri.js'")
    expect(weaponSource).not.toContain('start:')
    expect(weaponSource).not.toContain('createOnigiriLaunch')
    expect(weaponSource.match(/planOnigiriFrame\(/g)).toHaveLength(1)
    expect(weaponSource).toContain('origin: playerPos,')
  })
})

// balanceqa M1 (2026-11-01): 표적을 잃은 프레임과 바운스를 다 쓴 프레임에 분신이 공중에 멈춘 채 1~2프레임 보였다.
describe('MiniRosari clone hides on the frame it ends (balanceqa M1)', () => {
  const source = readFileSync(new URL('./MiniRosari.jsx', import.meta.url), 'utf8')
  const projectileSource = source.slice(source.indexOf('function MiniRosariProjectile'), source.indexOf('export function MiniRosariWeapon'))

  it('hides the clone right before it ends, and keeps the owner-checked unmount safety net', () => {
    expect(projectileSource).toContain('doneRef.current = true; hideMiniRosariClone(groupRef.current, id); onDone(id); return')
    expect(projectileSource).not.toMatch(/doneRef\.current = true;?\s+onDone\(id/)
    expect(projectileSource).toMatch(/useEffect\(\(\) => \(\) => \{\s+hideMiniRosariClone\(groupRef\.current, id\)/)
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
  const projectileSource = source.slice(source.indexOf('function MiniRosariProjectile'), source.indexOf('export function MiniRosariWeapon'))

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
    expect(projectileSource).toContain('const shown = shouldRenderMiniRosariClone(state, camera, flight.x, y, flight.z)')
    expect(projectileSource).toContain('group.visible = shown')
    expect(projectileSource).toContain('if (animateRef) animateRef.current = shown')
    // 탐색·피격(stepOnigiriFlight, applyEnemyHit)은 표시 판단보다 먼저, 조건 없이 돈다.
    const stepAt = projectileSource.indexOf('stepOnigiriFlight(flight, delta, MINI_ROSARI_SPEED)')
    const hitAt = projectileSource.indexOf('applyEnemyHit(')
    const showAt = projectileSource.indexOf('const shown =')
    expect(stepAt).toBeGreaterThan(-1)
    expect(hitAt).toBeGreaterThan(stepAt)
    expect(showAt).toBeGreaterThan(hitAt)
    expect(source).toContain('animateRef={slotsRef.current[p.slotIndex].activeRef}')
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
