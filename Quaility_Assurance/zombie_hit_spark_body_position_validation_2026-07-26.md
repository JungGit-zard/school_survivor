# 풀 좀비 피격 스파크 위치 QA

## 반드시 지킬 사항

- 스파크 높이 `0.42 * visualScale`, 숫자 높이 `0.95 * visualScale` 분리를 회귀 테스트로 확인한다.
- 고정 용량 큐의 FIFO, overflow 방지, scratch 재사용을 보존한다.

## 앞으로 하면 안 되는 사항

- 피격 플래시, 넉백, 피해 계산, Firebase/Graphics Studio/localStorage 변경을 허용하지 않는다.

## 검증 결과

- RED: 단일 높이 큐 구현에서 실패 확인.
- GREEN: 집중 테스트 9개와 관련 전체 테스트 77개 통과, `git diff --check` 통과.
