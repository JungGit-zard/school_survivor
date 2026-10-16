import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Rosari room title entry wiring', () => {
  it('keeps the title button text exact and lazy-loads the room from ReadyGameApp', () => {
    const titleSource = readFileSync(resolve(process.cwd(), 'src/components/TitleScreen.jsx'), 'utf8')
    const readySource = readFileSync(resolve(process.cwd(), 'src/components/ReadyGameApp.jsx'), 'utf8')

    expect(titleSource).toContain('로자리의 방')
    expect(titleSource).toContain('onOpenRosariRoom')
    expect(readySource).toContain("const RosariRoom = lazy(() => import('./RosariRoom.jsx'))")
    expect(readySource).toContain("screen === 'rosariRoom'")
  })
})
