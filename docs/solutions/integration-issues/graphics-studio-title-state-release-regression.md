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

## 과거 기록의 취급

과거 문서와 Git 이력에 남은 23개 로컬 시드 및 localStorage 복구 절차는 사고 원인을 확인하기 위한 역사적 증거일 뿐이다. 현재 구현의 복구 자료, 마이그레이션 입력 또는 작업 근거로 사용할 수 없다.

## 회귀 검사

- 활성 코드에서 `graphicsStudioPlayerSource`, `STUDIO_PLAYER_SOURCE`, `sourceRevision` 참조가 없어야 한다.
- Graphics Studio 관련 `localStorage` 읽기·쓰기·삭제 시도는 fatal guard가 차단해야 한다.
- Firebase hydrate 전의 Studio dataset 읽기와 쓰기는 fail-closed 오류를 발생시켜야 한다.
- Studio, 타이틀, 게임이 동일 Firebase revision을 소비하는지 검증해야 한다.
