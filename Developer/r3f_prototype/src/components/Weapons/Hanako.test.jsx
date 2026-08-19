import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Hanako companion source contract', () => {
  it('exports the Hanako gameplay model and weapon with toon outline coverage', () => {
    const source = readFileSync(new URL('./Hanako.jsx', import.meta.url), 'utf8')
    expect(source).toContain('export function HanakoModel')
    expect(source).toContain('export function HanakoWeapon')
    expect(source).toContain('<StudioTunedGroup itemId="weapon-hanako">')
    expect(source).toContain('outlineMaterial={outline}')
    expect(source).toContain('cherryBlossomMat')
    expect(source).toContain('kimonoMat')
    expect(source).toContain('hairMat')
  })

  it('uses CSS LightPink hair materials on every visible Hanako hair part', () => {
    const source = readFileSync(new URL('./Hanako.jsx', import.meta.url), 'utf8')
    expect(source).toContain('const hairMat = useMemo(() => toonMat(0xffb6c1')
    expect(source).toContain('const hairShadeMat = useMemo(() => toonMat(0xe7a0ac')

    const hairPartMatches = source.match(/<Part\s+[^>]*material=\{hair(?:Shade)?Mat\}/g) ?? []
    expect(hairPartMatches).toHaveLength(5)
    expect(source).not.toContain('toonMat(0x100c12')
    expect(source).not.toContain('toonMat(0x241725')
  })

  it('has the second companion trail and healing gameplay contract wired in source', () => {
    const source = readFileSync(new URL('./Hanako.jsx', import.meta.url), 'utf8')
    expect(source).toContain('HANAKO_TRAIL_FOLLOW_DISTANCE')
    expect(source).toContain('HANAKO_HEAL_INTERVAL_MS')
    expect(source).toContain('computeHanakoHealAmount(player.maxHp)')
    expect(source).toContain('healPlayer(healAmount)')
    expect(source).toContain('shouldRenderHanakoCompanion(weapons)')
    expect(source).toContain('startedAtRef.current = now')
  })

  it('is exported, mounted, and previewed through the allowed Hanako wiring only', () => {
    const gameSource = readFileSync(new URL('../Game.jsx', import.meta.url), 'utf8')
    const indexSource = readFileSync(new URL('./index.js', import.meta.url), 'utf8')
    const studioConfigSource = readFileSync(new URL('../../lib/graphicsStudioConfig.js', import.meta.url), 'utf8')
    const previewSource = readFileSync(new URL('../GraphicsStudioPreview.jsx', import.meta.url), 'utf8')

    expect(indexSource).toContain("export { HanakoWeapon }")
    expect(gameSource).toContain('HanakoWeapon')
    expect(gameSource).toContain('<HanakoWeapon />')
    expect(studioConfigSource).toContain('15_wea_hanako.svg')
    expect(studioConfigSource).toContain("['weapon-hanako', 'Hanako', 'hanako'")
    expect(studioConfigSource).toContain("if (type === 'E07') return 'zombie-procedural-face-test'")
    expect(previewSource).toContain("import { HanakoModel } from './Weapons/Hanako.jsx'")
    expect(previewSource).toContain("if (type === 'hanako')")
    expect(previewSource).toContain('<HanakoModel />')
  })
})
