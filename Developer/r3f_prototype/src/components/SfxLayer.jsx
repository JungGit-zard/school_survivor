import { useEffect } from 'react'
import { subscribeSfx } from '../lib/sfxEvents.js'
import { playSfx } from '../lib/sfxRegistry.js'

// sfxEvents 구독 → Howler 재생. null 렌더링이므로 Canvas 밖 어디든 마운트 가능.
export default function SfxLayer() {
  useEffect(() => subscribeSfx(({ id, volume, rate }) => playSfx(id, volume, { rate })), [])
  return null
}
