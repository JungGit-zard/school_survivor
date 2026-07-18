# Current Risk Register

Last updated: 2026-05-16

## 1. 목적

현재 Escape! zombie school에서 반복 확인해야 하는 위험을 한 곳에 모은다.

상태 정의:
- `open`: 아직 해결되지 않음
- `testing`: 수정 또는 검증 중
- `resolved`: 수정과 검증 완료
- `deferred`: 의도적으로 보류

## 2. 위험 목록

| ID | 위험 | 심각도 | 상태 | 검증 방법 |
|---|---|---|---|---|
| QA-001 | `gainXp`가 한 번에 한 레벨업만 처리 | P0 | resolved | store unit test |
| QA-002 | B01 보너스 교과서 XP 0 | P0 | resolved | drop 보상 테스트 |
| QA-003 | 모바일 조이스틱 미연결 | P0 | testing | gstack `snapshot -i`, 모바일 플레이 |
| QA-004 | 모바일 pause/resume 버튼 없음 | P0 | testing | gstack 모바일 viewport |
| QA-005 | 레벨업/결과 모달 모바일 폭 초과 | P1 | testing | gstack 375x812/390x844 캡처 |
| QA-006 | `resetGame`이 `refs.js` 전역 상태를 초기화하지 않음 | P1 | resolved | reset 반복 테스트 |
| QA-007 | 시간 기반 골드 최악 분포 5분 8개 | P1 | open | 5분 시뮬레이션/수동 3회 기록 |
| QA-008 | Stage 1 E04 투사체 회귀 위험 | P2 | open | spawn config 테스트, `rg E04` |
| QA-009 | WebGL `ReadPixels` 성능 경고 | P2 | open | gstack console, DevTools performance |
| QA-010 | 번들 크기 500 kB 초과 | P2 | open | `npm run build`, 로딩 성능 QA |

## 3. 최근 자동 검증

- `npm test`: 통과, 19 tests passed
- `npm run build`: 통과
- gstack browser: 초기 렌더링, 콘솔, 네트워크, 반응형 캡처 확인

## 4. 다음 해결 순서

1. QA-003
2. QA-004
3. QA-005
4. QA-007
5. QA-008
