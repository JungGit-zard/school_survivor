# Zombie Death Random All Styles QA

## 확인 항목

- 강한 막타도 `scatter` 고정이 아니라 전체 죽음 연출 풀에서 선택된다.
- 일반 좀비와 보스가 같은 collapse 사망 연출 데이터를 사용한다.
- 예전 `ZombieDeathAnim` 경로 참조가 남아 있지 않다.

## 실행 결과

- `npm test`: 65 files, 356 tests passed.
- `npm run build`: passed. 기존 대형 chunk 경고만 표시됨.

