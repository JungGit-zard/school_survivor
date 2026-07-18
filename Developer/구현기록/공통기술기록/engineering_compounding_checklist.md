# Engineering Compounding Checklist

Last updated: 2026-05-16

## 1. 목적

개발 작업이 끝날 때마다 다음 작업을 쉽게 만들기 위해 무엇을 남겨야 하는지 확인하는 체크리스트다.

## 2. 작업 시작 전

- [ ] `project_develop_policy.md`에서 관련 정책을 확인했다.
- [ ] 관련 Planner 문서를 확인했다.
- [ ] 기존 코드 구조를 `rg` 또는 파일 탐색으로 확인했다.
- [ ] 이미 있는 사용자 변경을 되돌리지 않는다.

## 3. 구현 중

- [ ] 기존 패턴을 우선 사용했다.
- [ ] 플레이 가능한 동작을 장식적 구조보다 우선했다.
- [ ] 새 추상화는 실제 중복/복잡도를 줄일 때만 추가했다.
- [ ] role-specific 기록은 해당 폴더에만 남겼다.

## 4. 작업 종료 전

- [ ] `npm test`를 실행했다.
- [ ] `npm run build`를 실행했다.
- [ ] 프론트/시각 변경이면 gstack browser 또는 동등한 브라우저 검증을 실행했다.
- [ ] `git status --short --branch`를 확인했다.

## 5. Compounding Step

아래 중 최소 하나를 남긴다.

- [ ] 새 단위 테스트
- [ ] 새 QA 체크리스트
- [ ] 위험 목록 갱신
- [ ] 재현 절차
- [ ] 현재 기준 문서 갱신
- [ ] gstack 검증 기록
- [ ] 다음 작업 우선순위 정리

## 6. 현재 테스트로 전환할 후보

| 후보 | 권장 위치 |
|---|---|
| `gainXp(40)` 연속 레벨업 | store 테스트 |
| B01 보너스 교과서 XP > 0 | drop 보상 테스트 |
| Stage 1 스폰 테이블 E04 없음 | spawn config 테스트 |
| `resetGame` refs 초기화 | store/refs 테스트 |
| 후반 카드 후보 no-op 제거 | upgrades/HUD 테스트 |
| 무기 4개 제한 유지 | upgrades 테스트 확장 |
