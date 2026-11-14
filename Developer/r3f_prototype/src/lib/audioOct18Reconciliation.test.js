import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { URL } from 'node:url'
import vm from 'node:vm'

const file = (path) => readFileSync(new URL(`../../${path}`, import.meta.url))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const selectedBytes = {
  // 2026-11-14 Terry "마틸다 음성은 지금 괴기스러우니까 100퍼센트 완전히 바꿔" — Spawn/Death/Laugh는
  // scripts/generate_matilda_girl_voice.mjs(CC0 실제 4살 여자아이 녹음, 자르기·정리만) 바이트로 교체됐다.
  'enemies/matildaSpawn.ogg': '02fd745e83aac72ede8b4ce4f76b35adfb12d74fd5cc0cf5a110bb5d81bd92dd',
  'enemies/matildaSpawn.mp3': '34f231f6c2fb4a52a179949e2c67e1de622dbb9c7ab47cc462414f50fd754dba',
  'enemies/matildaDeath.ogg': '43331dfc00800e401e9bc43028ff489f984ce82c78478d58f10403c6d14299aa',
  'enemies/matildaDeath.mp3': '1302f49076631ffbf248e854ef111007af318b0c24dc2592e8ec95fbc7ee40b2',
  'events/matildaWarningTick.ogg': '0bb56c645ad13da9e721d292f4c64e3b92928c6db9b730da3c85b420ff0b7cd3',
  'events/matildaWarningTick.mp3': 'f0ffdfbb952b85fba284da02503d7d1f141bdc10d0a31b03f5ebff2a0997ed8d',
  'enemies/matildaLaugh.ogg': 'a4e048a9aa252e984317b84682bdfd29d6202409ddf4b603ac7ee627710158d2',
  'enemies/matildaLaugh.mp3': '838f16bbdf08e1a16ced5cee5fb4c7513f154fe199aa0df0797dacb6d7288edc',
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
