import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { URL } from 'node:url'
import vm from 'node:vm'

const file = (path) => readFileSync(new URL(`../../${path}`, import.meta.url))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const selectedBytes = {
  'enemies/matildaSpawn.ogg': 'e5a19f7955f34680817304d120cc1247fea58718ed675dfebc0cfcc68ac134af',
  'enemies/matildaSpawn.mp3': '4eac667f37d6e2952c025c5518c7ec91b90a4cf38d153537a7888f263a4d663f',
  'enemies/matildaDeath.ogg': 'f345745d2be112f16c8be6b875b27e94fd68eded93814659ef02be3074361b98',
  'enemies/matildaDeath.mp3': '3d4021d55d80693a6a7aa924be079b1597725702ec3b8ccb790d0ad1f1b478ae',
  'events/matildaWarningTick.ogg': '0bb56c645ad13da9e721d292f4c64e3b92928c6db9b730da3c85b420ff0b7cd3',
  'events/matildaWarningTick.mp3': 'f0ffdfbb952b85fba284da02503d7d1f141bdc10d0a31b03f5ebff2a0997ed8d',
  'enemies/matildaLaugh.ogg': 'dab2f2a8aaeb3f946d9434adb34f456251aaf1d58df2fc23267007ae1e2289fc',
  'enemies/matildaLaugh.mp3': '322ef0812fd87cda83a628751bda7d49966a4721f8a9b84030a2e3f1be9d4fbe',
}
const redo = {
  A: 'f2e93b0eabb4d76a53ff4628ceb1b5b674d1975f4d12b8c52e525e7388f0484b',
  B: '8607c892a0afdd9cca845aac13f464d08f1ab4bd42ac31949e5f98391f81d1eb',
  C: '8545b1016a20755a1e4afcf47427fa923e6d270d0b73ad3114b742c7f18123f0',
}

describe('2026-10-18 owner-requested audio reconciliation', () => {
  for (const [variant, expected] of Object.entries(redo)) {
    it(`serves the actual newly authored Matilda ${variant} audition, not the older slight variation`, () => {
      expect(sha(file(`public/sfx/audition-20261016/dialogue-matilda-${variant}.wav`))).toBe(expected)
    })
  }
  it('describes all three new distinct designs without changing original comparison paths', () => {
    const sandbox = { window: {} }
    vm.runInNewContext(file('public/sfx/audition-20261016/manifest.js').toString('utf8'), sandbox)
    const entry = sandbox.window.SFX_AUDITION_MANIFEST.cases.find((item) => item.id === 'dialogue-matilda')
    expect(entry.variants.map((item) => item.label)).toEqual([
      'A · 고음 칼웃음·스타카토', 'B · 콧소리 교장·모음 영창', 'C · 쉰 괴물 사감·엇박 웃음',
    ])
    expect(entry.original.src).toBe('/sfx/audition-20261016/dialogue-matilda-original.wav')
    for (const item of entry.variants) expect(item.src).toBe(`/sfx/audition-20261016/dialogue-matilda-${item.id}.wav`)
  })
  for (const [path, expected] of Object.entries(selectedBytes)) {
    it(`preserves final owner-selected runtime bytes: ${path}`, () => {
      expect(sha(file(`public/sfx/${path}`))).toBe(expected)
    })
  }
})
