import { useEffect } from 'react'
import { subscribeSfx } from '../lib/sfxEvents.js'
import { applySfxMasterVolume, playSfx } from '../lib/sfxRegistry.js'
import { installUiSfxListener } from '../lib/uiSfx.js'
import { useAuthStore } from '../store/useAuthStore.js'

// sfxEvents 구독 → Howler 재생. null 렌더링이므로 Canvas 밖 어디든 마운트 가능.
export default function SfxLayer() {
  // 마스터 헤드룸. 개별 음원이 거의 풀스케일이라 겹치면 destination에서 클리핑한다.
  // 값과 측정 근거는 sfxRegistry의 SFX_MASTER_VOLUME 주석 참고.
  useEffect(() => { applySfxMasterVolume() }, [])

  useEffect(
    () => subscribeSfx(({ id, volume, rate, ui }) => {
      const authOverlayActive = useAuthStore.getState().signingIn
      playSfx(id, volume, ui === true ? { rate, authOverlayActive, ui: true } : { rate, authOverlayActive })
    }),
    [],
  )

  // 모든 UI 조작(버튼·탭·토글·슬라이더)의 개그 효과음 — 문서 루트 위임 리스너 하나. 종류 정본은 lib/uiSfx.js.
  useEffect(() => installUiSfxListener(document), [])
  return null
}
