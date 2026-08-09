---
title: Graphics Studio local seed and fallback are fatal bugs
date: 2026-07-19
category: docs/solutions/integration-issues
module: Graphics Studio Firebase canonical state
problem_type: integration_issue
component: tooling
severity: critical
tags: [graphics-studio, firebase-only, fail-closed, local-seed-forbidden]
---

# Graphics Studio 로컬 시드 및 fallback 전면 폐기

## 절대 대전제 (2026-07-19 사용자 확정 — 최상위 규칙)

**스튜디오 세팅값(Firebase 튜닝)이 적용되지 않은 상태로 오브젝트가 존재하거나 렌더되는 것 자체가 치명적 오류다.** 플레이든 개발이든 무엇을 하든 예외 없다.

- 튜닝이 적용되지 않았으면 그 오브젝트는 **렌더하지 않는다(fail-closed, 숨김)**. 기본 포즈·기본값·`DEFAULT_STUDIO_TUNING`·preview 패스스루로 "일단 그려두는" 것은 전부 위반이다.
- "나중에 튜닝으로 교체" 목적의 임시 미튜닝 렌더도 금지. 적용 완료 전까지는 존재 자체가 없어야 한다.
- 타이틀 주인공 정본: `TitleScene3D.jsx`는 `playerVisualReady`(= `studioVisualsReady`, Firebase 런타임 ready)가 true일 때 `StudioTuningRuntimeProvider` 경로로만 렌더하고, 그 외에는 `null`이다. preview 폴백 분기를 두지 않는다.

## 영구 결론

Graphics Studio 입력값을 소스 파일, `Source-Controlled Player Seed`, `sourceRevision`, 브라우저 `localStorage`, 임시 JSON, 빌드 번들, 창 간 메시지 또는 다른 로컬 저장소에 저장하거나 그곳에서 불러오는 방법론 전체를 치명적인 버그로 분류한다.

Studio, 타이틀, 게임은 Firebase에 영구 저장된 현재 사용자 스냅샷의 동일 revision만 소비한다.

## 삭제 대상

- `graphicsStudioPlayerSource.js` 및 동등한 로컬 시드 파일
- 로컬 시드로 Firebase 또는 런타임 상태를 초기화·복구·보완·마이그레이션하는 코드
- `sourceRevision`을 이용해 과거 payload를 승격하거나 덮어쓰는 코드
- origin별 `localStorage` 값으로 Studio 상태를 선택하는 코드
- Firebase 실패 시 소스 기본값이나 과거 스냅샷으로 계속 실행하는 fallback

## 필수 실패 동작

Firebase 로그인, 연결, hydrate, schema, revision 또는 payload 검증이 실패하면 저장과 적용을 즉시 중단한다. Apply를 누르면 저장 불가 상태를 사용자에게 표시한다. 로컬 값으로 조용히 계속 실행하지 않는다.

## 타이틀 화면 주인공 표시 (2026-07-19 확정)

타이틀 화면 주인공은 **Firebase에 저장된 최신 스튜디오 수치값(current revision)이 적용된 상태에서만 렌더**한다(위 절대 대전제). 튜닝이 적용되지 않은 로그인 전 상태에서는 주인공을 **렌더하지 않는다(숨김)** — 기본 포즈로 대체하는 것은 대전제 위반이므로 금지한다. (2026-07-19 개정: 직전의 "로그인 전 기본 포즈 표시" 폴백은 대전제 위반으로 폐기됨.)

**치명적 오류로 규정**: (a) 최신 Firebase revision이 아닌 값으로 렌더, (b) 기본·캐시·하드코딩·preview 포즈로 렌더, (c) 튜닝 미적용 상태로 잠깐이라도 존재/렌더 — 전부 치명적 버그다. "일단 기본값으로 두고 나중에 반영"은 허용하지 않는다.

정본 구현: `TitleScene3D.jsx`의 `playerVisualReady = studioVisualsReady`가 유일한 게이트이며, `true`일 때만 `StudioTuningRuntimeProvider`로 렌더하고 그 외에는 `null`이다(preview 폴백 분기 금지). 다른 조건 추가 금지 — 과거 `hasFirebaseTitlePlayerTuning()`가 `tunings.player` 명시 키를 요구해 파트 전용 튜닝 계정에서 주인공이 영구 미표시되던 회귀가 실제 사례다. `App.jsx`의 `subscribeFirebaseStudio` 라이브 구독이 revision 갱신 시 런타임을 자동 갱신하므로, 하이드레이션 이후 별도 폴링 없이 최신 값이 유지된다.

**로그인 전에도 주인공을 보이게 하려면**: uid가 없어 계정 경로를 못 읽으므로, 로그인 없이 읽을 수 있는 **공개 정본 노드**(`studioWorkspaces/v1/canonicalTitle/current`, 읽기 공개·쓰기 마스터 전용)에서 튜닝을 하이드레이트해야 한다. 이 경로가 하이드레이트돼 `studioVisualsReady`가 true가 되면 대전제를 지키면서 로그인 전에도 튜닝된 주인공이 보인다. 규칙은 `database.rules.json`에 정의되어 있으며 배포 + 마스터 최초 게시가 선행되어야 실제 동작한다. 로컬/빌드 시드로 대체하는 것은 금지(위 로컬 시드 폐기 원칙과 동일).

## 과거 기록의 취급

과거 문서와 Git 이력에 남은 23개 로컬 시드 및 localStorage 복구 절차는 사고 원인을 확인하기 위한 역사적 증거일 뿐이다. 현재 구현의 복구 자료, 마이그레이션 입력 또는 작업 근거로 사용할 수 없다.

## 회귀 검사

- 활성 코드에서 `graphicsStudioPlayerSource`, `STUDIO_PLAYER_SOURCE`, `sourceRevision` 참조가 없어야 한다.
- Graphics Studio 관련 `localStorage` 읽기·쓰기·삭제 시도는 fatal guard가 차단해야 한다.
- Firebase hydrate 전의 Studio dataset 읽기와 쓰기는 fail-closed 오류를 발생시켜야 한다.
- Studio, 타이틀, 게임이 동일 Firebase revision을 소비하는지 검증해야 한다.
- 타이틀 화면 주인공은 `studioReady===true`일 때 `StudioTuningRuntimeProvider` 경로로만 렌더돼야 하며, 명시적 `tunings.player` 키 존재 등 부가 게이트를 추가해서는 안 된다(추가 시 주인공 미표시 회귀).
