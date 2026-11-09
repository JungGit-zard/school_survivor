import snapshot from './studioSnapshot.json'
import { commitFirebaseStudioRuntime, isFirebaseStudioRuntimeReady } from '../lib/studioRuntimeState.js'

// 타이틀 화면 고정 스냅샷 — Firebase 정본 studioWorkspaces/v1/canonical/current
// revision 1952 (2026-08-10T16:17:15.598Z)를 `npm run studio:pin`(scripts/export-studio-snapshot.mjs,
// 공개 노드 GET 1회·Firebase 쓰기 없음)으로 그대로 내보내 고정한 것이다. 파일의 revision/sha256이 정본 기록이다.
// 스튜디오에서 Apply한 값은 이 스크립트로 다시 고정하기 전까지 타이틀에 반영되지 않는다(`-- --check`로 차이만 확인).
// 타이틀은 이 파일만 보고 렌더한다: 네트워크·로그인·Firebase 의존이 없고,
// 하이드레이트 실패로 화면이 숨겨지는 fail-closed 경로도 없다(무조건 렌더).
// 그래픽 스튜디오(/graphics-studio)만 Firebase를 읽고 쓰며, 편집 시 런타임을 덮어쓴다.
export const FROZEN_STUDIO_SNAPSHOT = snapshot

export function applyFrozenStudioSnapshot({ force = false } = {}) {
  if (!force && isFirebaseStudioRuntimeReady()) return false
  commitFirebaseStudioRuntime(snapshot.datasets, { revision: snapshot.revision })
  return true
}
