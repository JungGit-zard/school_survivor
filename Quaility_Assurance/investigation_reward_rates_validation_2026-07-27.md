# 조사 보상 확률 검증 기록

작성일: 2026-07-27

## 검증 대상

- 학생: 총 보상 확률 50% 경계와 당첨 뒤 50:50 업그레이드/골드 10개.
- 사물함: 난수 없이 100% 업그레이드.
- 불레틴보드 등 기타: 기존 총 보상 확률 10% 경계와 기존 보상 풀.
- 런타임: `StudentDialogueTrigger`에서 `target.subjectType`을 보상 정책으로 전달.

## TDD RED/GREEN 증거

| 단계 | 명령 | 핵심 결과 |
|---|---|---|
| 학생 RED | `npx vitest run src/lib/studentSearchRewards.test.js` | 기존 10% 상수와 새 API 부재로 실패 |
| 학생 GREEN | 같은 명령 | 2 tests passed |
| 사물함 RED | 같은 명령 | 기대 업그레이드 대신 `null` 수신 |
| 사물함 GREEN | 같은 명령 | 3 tests passed |
| 기타 RED | 같은 명령 | 기본 10% 상수 부재로 실패 |
| 기타 GREEN | 같은 명령 | 4 tests passed |
| 전달 RED | `npx vitest run src/components/StudentDialogueTrigger.test.jsx` | `subjectType` 전달 부재로 실패 |
| 전달 GREEN | `npx vitest run src/components/StudentDialogueTrigger.test.jsx src/lib/studentSearchRewards.test.js` | 5 tests passed |

## 최종 결과

- `npx vitest run src/lib/studentSearchRewards.test.js src/components/StudentDialogueTrigger.test.jsx src/store/useGameStore.studentDialogue.test.js src/lib/studentProximity.test.js`: 4 files, 25 tests passed.
- 소유된 추적 파일에 `git diff --check`를 실행했고 공백 오류가 없었다.

Firebase, Graphics Studio, 브라우저 `localStorage`는 변경하지 않았다.
