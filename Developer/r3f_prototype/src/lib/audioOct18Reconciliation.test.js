import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { URL } from 'node:url'
import vm from 'node:vm'

const file = (path) => readFileSync(new URL(`../../${path}`, import.meta.url))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const selectedBytes = {
  // 2026-11-14 Terry "귀여운 여자아이 목소리로 완전히 바꿔라" — Spawn/Death/Laugh는
  // scripts/generate_matilda_girl_voice.mjs 후보 A(CC0 실제 아이 목소리 가공) 바이트로 교체됐다.
  'enemies/matildaSpawn.ogg': '83f558127161b0c5b843c62552ffa7783c7a5e67c2b7257a9682562c5baf1dd0',
  'enemies/matildaSpawn.mp3': 'f2a81170e42a69b15f2bb856c05975298eb3dfe7f4b63cb3aa4939ad78f4a4e3',
  'enemies/matildaDeath.ogg': '938bb77c27c96605eb84efa0cfd60b9666f268866befdf5c04204fded56c8bba',
  'enemies/matildaDeath.mp3': 'a75585a8e3e5139f1bdb5b2e3bc2940ce6b4518727495d8d03bc8ef113ea20f7',
  'events/matildaWarningTick.ogg': '0bb56c645ad13da9e721d292f4c64e3b92928c6db9b730da3c85b420ff0b7cd3',
  'events/matildaWarningTick.mp3': 'f0ffdfbb952b85fba284da02503d7d1f141bdc10d0a31b03f5ebff2a0997ed8d',
  'enemies/matildaLaugh.ogg': '74ddfa682cb26b5c85ebb8a04d21bc50cdf9189dbf0e292be7980dd273b0414c',
  'enemies/matildaLaugh.mp3': '6ddd9c31bc7fdefd6f67f2a1fd01a2dd3941b501f713efd9c6a2e874aab72f7b',
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
