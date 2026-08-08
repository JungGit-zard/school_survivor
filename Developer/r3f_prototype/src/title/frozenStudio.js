import snapshot from './studioSnapshot.json'
import { commitFirebaseStudioRuntime, isFirebaseStudioRuntimeReady } from '../lib/studioRuntimeState.js'

// 타이틀 화면 동결 스냅샷 — Firebase 정본 studioWorkspaces/v1/canonical/current
// revision 1861 (2026-08-08T04:52:39.863Z)을 모델링 그대로 복사해 둔 것이다.
// 타이틀은 이 파일만 보고 렌더한다: 네트워크·로그인·Firebase 의존이 없고,
// 하이드레이트 실패로 화면이 숨겨지는 fail-closed 경로도 없다(무조건 렌더).
// 그래픽 스튜디오(/graphics-studio)만 Firebase를 읽고 쓰며, 편집 시 런타임을 덮어쓴다.
export const FROZEN_STUDIO_SNAPSHOT = snapshot

export function applyFrozenStudioSnapshot({ force = false } = {}) {
  if (!force && isFirebaseStudioRuntimeReady()) return false
  commitFirebaseStudioRuntime(snapshot.datasets, { revision: snapshot.revision })
  return true
}
