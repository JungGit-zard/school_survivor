# Subagent Validation Pipeline

Last updated: 2026-05-16

## 1. 목적

이 문서는 Escape! zombie school에서 기능 추가, 큰 수정, QA, 시각 검증을 할 때 사용할 표준 서브에이전트 순서를 정의한다.

서브에이전트는 사용자가 명시적으로 요청했을 때만 사용한다.

## 2. 표준 순서

| 순서 | 역할 | 목적 | 산출 위치 |
|---|---|---|---|
| 1 | `code-mapper` | 기존 코드 구조와 영향 범위 파악 | 필요 시 `Developer/` |
| 2 | `reviewer` | 변경 diff, 회귀 위험, 누락 테스트 검토 | 필요 시 `Quaility_Assurance/` |
| 3 | `qa-reviewer` | 테스트 계획, 통과/실패 기준, 위험 기록 | `Quaility_Assurance/` |
| 4 | `game-developer` | 게임 루프, 밸런스, 스폰/드롭/무기 검증 | `Developer/` |
| 5 | `graphic_designer` | 3D 카툰 렌더링, HUD, VFX, 모바일 가독성 검증 | `Graphic_designer/` |
| 6 | gstack browser | 실제 브라우저 실행, 콘솔, 네트워크, 반응형 확인 | `Quaility_Assurance/` |

## 3. 상황별 추가 역할

| 상황 | 추가 역할 |
|---|---|
| HUD/모바일 조작/레이아웃 | `ui-designer` |
| React/R3F UI 구현 안정성 | `frontend-developer` |
| 골드/점수/저장값 조작 방지 | `security-auditor` |
| 작업 범위와 우선순위 정리 | `develop-director` |
| 실시간/멀티플레이 | `websocket-engineer` |

## 4. 각 단계의 완료 기준

### code-mapper

- 현재 기능 목록이 정리됐다.
- 파일별 책임이 정리됐다.
- 영향 범위가 좁혀졌다.

### reviewer

- 심각도별 버그 위험이 정리됐다.
- 빠진 테스트가 정리됐다.
- 코드 수정 없이 리뷰 결과를 남겼다.

### qa-reviewer

- 자동 테스트 항목이 정리됐다.
- 수동 플레이테스트 체크리스트가 정리됐다.
- 검증하지 않은 기능을 완료로 쓰지 않았다.

### game-developer

- 5분 루프, 피격, 스폰, 드롭, 무기 흐름을 확인했다.
- 반드시 고칠 항목과 후순위 항목을 구분했다.

### graphic_designer

- 3D 카툰 렌더링 정책 준수 여부를 확인했다.
- HUD, VFX, 모바일 가독성 위험을 정리했다.

### gstack browser

- 로컬 서버 응답을 확인했다.
- 콘솔 오류를 확인했다.
- 모바일/태블릿/데스크톱 스크린샷을 확인했다.
- 인터랙티브 요소와 모바일 조작 가능 여부를 확인했다.

## 5. 현재 검증에서 확정된 우선순위

1. XP 연속 레벨업 처리
2. B01 보너스 교과서 XP 0 수정
3. 모바일 조이스틱 연결
4. 모바일 pause/resume 버튼 추가
5. 레벨업/결과 모달 모바일 폭 수정
6. `refs.js` 전역 상태 리셋
7. 골드 코인 최소 획득량 보정
