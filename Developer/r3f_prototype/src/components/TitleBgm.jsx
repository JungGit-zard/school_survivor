import { useEffect } from 'react'
import { acquireStreamingBgm } from '../lib/streamingBgm.js'
import { TITLE_BGM_URL } from '../lib/titleBgm.js'

// 타이틀 곡을 잡아두는 홀더. streamingBgm은 URL당 플레이어 1개를 공유하므로, 같은 곡을 쓰는
// 화면 사이를 오갈 때 재시작·정지가 없다(owner rule 2026-10-27: 세션 중 무음 금지).
// 2026-10-30: 로자리의 방은 로비 좌상단에서 들어오는 로비의 자식 화면이 되어 로비 곡을
// 유지한다 — 이 컴포넌트는 타이틀 곡 전용이며 앱 셸에서 마운트하지 않는다.
export default function TitleBgm() {
  useEffect(() => {
    let handle
    try {
      handle = acquireStreamingBgm(TITLE_BGM_URL, { volume: 0.5 })
    } catch {
      return undefined
    }
    return () => handle.release()
  }, [])
  return null
}
