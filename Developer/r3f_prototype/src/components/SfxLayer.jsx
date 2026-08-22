import { useEffect } from 'react'
import { subscribeSfx } from '../lib/sfxEvents.js'
import { applySfxMasterVolume, playSfx } from '../lib/sfxRegistry.js'
import { useAuthStore } from '../store/useAuthStore.js'

// sfxEvents 구독 → Howler 재생. null 렌더링이므로 Canvas 밖 어디든 마운트 가능.
export default function SfxLayer() {
  // 마스터 헤드룸. 개별 음원이 거의 풀스케일이라 겹치면 destination에서 클리핑한다.
  // 값과 측정 근거는 sfxRegistry의 SFX_MASTER_VOLUME 주석 참고.
  useEffect(() => { applySfxMasterVolume() }, [])

  useEffect(
    () => subscribeSfx(({ id, volume, rate }) => {
      const authOverlayActive = useAuthStore.getState().signingIn
      playSfx(id, volume, { rate, authOverlayActive })
    }),
    [],
  )
  return null
}
