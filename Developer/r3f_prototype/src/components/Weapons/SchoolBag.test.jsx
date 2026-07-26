import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('SchoolBagSwing pure sweep', () => {
  it('uses proximity and oriented-box tests without Rapier intersection callbacks', () => {
    const source = readFileSync(new URL('./SchoolBag.jsx', import.meta.url), 'utf8')

    expect(source).toContain('scanRadiusEnemiesInto')
    expect(source).toContain('scanOrientedBoxEnemiesInto')
    expect(source).not.toContain('enemyBodies.forEach')
    expect(source).toContain('applyEnemyHit')
    expect(source).not.toContain('other.rigidBody')
    expect(source).not.toContain('@react-three/rapier')
  })

  it('hides the ruler itself when idle or complete, then shows it only during an active swing', () => {
    const source = readFileSync(new URL('./SchoolBag.jsx', import.meta.url), 'utf8')
    const idleStart = source.indexOf('if (!swing.active) {')
    const idleEnd = source.indexOf('\n    const elapsed', idleStart)
    const completeStart = source.indexOf('if (elapsed >= duration) {')
    const completeEnd = source.indexOf('\n    const t =', completeStart)
    const activeVisualStart = source.indexOf('if (visualRef.current) {')
    const activeVisualEnd = source.indexOf('\n    const scratch =', activeVisualStart)
    const idleBranch = source.slice(idleStart, idleEnd)
    const completeBranch = source.slice(completeStart, completeEnd)
    const activeVisualBranch = source.slice(activeVisualStart, activeVisualEnd)
    const usesHideContract = (branch) => (
      branch.includes('visualRef.current.visible = false')
      && branch.includes('trailRef.current.visible = false')
      && branch.includes('trailRef.current.material.opacity = 0')
    ) || branch.includes('hideSchoolBagSwingVisuals(')
    const usesActiveContract = (
      activeVisualBranch.includes('visualRef.current.visible = true')
      && activeVisualBranch.includes('trailRef.current.visible = true')
      && activeVisualBranch.includes('trailRef.current.material.opacity = 0.88 * swingPower')
    ) || activeVisualBranch.includes('showSchoolBagSwingVisuals(')

    // Both JSX nodes begin hidden to prevent a pre-frame flash. Trail opacity is
    // not a substitute for hiding the ruler group after a swing finishes.
    expect(source).toMatch(/<mesh\s+ref=\{trailRef\}[^>]*visible=\{false\}/)
    expect(source).toMatch(/<group\s+ref=\{visualRef\}[^>]*visible=\{false\}/)
    expect(usesHideContract(idleBranch)).toBe(true)
    expect(usesHideContract(completeBranch)).toBe(true)
    expect(usesActiveContract).toBe(true)
  })
})
