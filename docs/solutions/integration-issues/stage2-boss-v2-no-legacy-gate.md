---
title: Stage 2 boss v2 no-legacy gate
date: 2026-07-17
category: docs/solutions/integration-issues
module: Stage 2 boss v2
problem_type: integration_policy
severity: critical
tags: [stage2-boss, v2, fail-closed, no-legacy]
---

# Stage 2 보스 v2 재유입 금지 게이트

## 정본

Stage 2 보스 시각 구현은 `stage2-boss-v2`만 정본이다.

과거 코드, 에셋, 튜닝, 보정값, 저장 상태, 캡처, 빌드 산출물은 복구 자료로
사용하지 않는다. 문제가 발생하면 현재 v2 코드와 현재 승인 상태만 조사한다.

## 강제 중단

다음 작업은 즉시 중단한다.

- 숫자 자식 경로 대신 `id:b02-face-texture`로 런타임 대상을 탐색하거나 이 연결을 복구·호환·변환하는 작업. 해당 방식은 구형 B02 전용 치명적 버그다.
- Git 이력이나 이전 커밋에서 Stage 2 보스 구현을 복사하는 작업
- 다른 작업 트리 또는 빌드 산출물에서 과거 구현을 가져오는 작업
- 과거 저장 상태를 v2로 자동 변환하거나 이식하는 작업
- 화면별 임시 크기 보정으로 v2 모듈 문제를 숨기는 작업
- v2 이외의 시각 구현을 fallback으로 렌더링하는 작업

중단 후 사용자의 새 사양을 기준으로 v2 안에서 새로 구현한다. 기존 복구 경로를
되살리지 않는다.

## 변경 전 확인

1. 변경 대상이 현재 v2 모듈인지 확인한다.
2. 과거 구현이나 저장 상태를 읽는 경로가 포함되지 않았는지 확인한다.
3. 게임, 로비, 타이틀, Graphics Studio가 같은 v2 모듈을 소비하는지 확인한다.
4. 화면별 보정이 아니라 명시적인 현재 설계값만 변경하는지 확인한다.

## 완료 게이트

- v2 이외의 Stage 2 보스 시각 경로가 없다.
- 과거 구현을 복구·변환·fallback하는 경로가 없다.
- 전체 테스트와 프로덕션 빌드가 통과한다.
- 게임, 로비, 타이틀, Graphics Studio 실제 화면이 같은 승인 상태를 표시한다.
