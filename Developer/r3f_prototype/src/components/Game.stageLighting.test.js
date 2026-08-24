import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Stage 1~3 theatrical lighting Game wiring', () => {
  it('keeps the common three lights unchanged and mounts one StageLighting subtree before Floor', () => {
    const source = readFileSync(new URL('./Game.jsx', import.meta.url), 'utf8')

    expect(source).toContain("import StageLighting from './StageLighting.jsx'")
    expect(source).toContain('<ambientLight intensity={0.38} color={0x6d6780} />')
    expect(source).toContain('position={[-10, 22, 12]}')
    expect(source).toContain('intensity={3.2}')
    expect(source).toContain('<directionalLight position={[10, 12, -10]} intensity={0.85} color={0xffe2b0} />')

    const stageLightingIndex = source.indexOf('<StageLighting stageId={currentStageId} />')
    const floorIndex = source.indexOf('<Floor stageId={currentStageId} />')
    expect(stageLightingIndex).toBeGreaterThan(source.indexOf('<ambientLight intensity={0.38}'))
    expect(stageLightingIndex).toBeLessThan(floorIndex)
    expect(source.match(/<StageLighting stageId=\{currentStageId\} \/>/g)).toHaveLength(1)
  })
})
