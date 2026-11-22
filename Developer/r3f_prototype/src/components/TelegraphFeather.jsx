// 바닥 경고 채움 메시의 "자식"으로 두는 부드러운 가장자리(2026-11-22 Terry "공격궤도 표시자 … 끝에 블러").
// 채움 윤곽 바깥쪽에만 TELEGRAPH_FEATHER 폭의 띠를 그리고 정점 알파로 0까지 사라진다 — 채움(=피격 범위)은 그대로다.
// 부모 채움 재질의 색·불투명도를 렌더 직전마다 복사하므로(syncTelegraphFeather, 할당 없음) 깜빡임·페이드·색 전환을 그대로 따른다.
//   disc={r}            : 부모가 <circleGeometry args={[r, segments]}>를 X -90° 눕힌 메시(plane 'xy', 기본)
//   rect={[가로, 세로]}  : 부모가 눕히지 않은 <boxGeometry args={[가로, 두께, 세로]}> 메시면 plane="xz", y=두께/2
// 지오메트리는 크기가 바뀔 때만 다시 만들고 이전 것을 dispose한다. Studio 재질 튜닝·포커스 대상이 아니다(studioNonTunable).
import { useEffect, useMemo } from 'react'
import {
  TELEGRAPH_FEATHER, buildTelegraphFeatherGeometry, circleLoop, createTelegraphFeatherMaterial, rectLoop, syncTelegraphFeather,
} from '../lib/telegraphStyle.js'

function attachSync(mesh) {
  if (mesh) mesh.onBeforeRender = syncTelegraphFeather
}

export default function TelegraphFeather({ disc = 0, rect = null, plane = 'xy', y = 0, segments = 48, renderOrder = 0 }) {
  const u = rect?.[0] ?? 0
  const v = rect?.[1] ?? 0
  const geometry = useMemo(
    () => buildTelegraphFeatherGeometry([disc > 0 ? circleLoop(disc, { segments }) : rectLoop(u / 2, v / 2)], { plane, y }),
    [disc, u, v, plane, y, segments],
  )
  const material = useMemo(() => createTelegraphFeatherMaterial(), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  return <mesh ref={attachSync} name={TELEGRAPH_FEATHER.name} geometry={geometry} material={material} renderOrder={renderOrder} userData={{ studioNonTunable: true, studioNonFocusable: true }} />
}
