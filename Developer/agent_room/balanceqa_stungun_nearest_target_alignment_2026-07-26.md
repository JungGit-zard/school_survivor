# balanceqa 라우팅 기록 — 전기충격기 최근접 타깃 정렬

- 일자: 2026-07-26
- 역할: `balanceqa`
- 권한: 코드 수정·스테이징·커밋·푸시 없음. 검증 및 QA 기록만 수행.
- 대상: `Developer/r3f_prototype/src/components/Weapons/StunGun.jsx`와 최근접 타깃 회귀 테스트.

## 최초 검증 결과

- 최근접 타깃 우선 선택: 통과.
- 동일 `{ rb, generation }`의 live translation으로 투사체 이동과 그래픽 방향을 함께 계산: 통과.
- 저프레임 이동 오버슈트 방지(`travel <= dist`): 통과.
- 사망/generation 불일치와 체인 live endpoint의 기존 계약: 통과.
- Studio/Firebase/시각 모델 파라미터 불변: 통과.
- 투사체 2.5초 수명: 실패. 이동용 `frameDelta`를 수명 누적에도 사용하여 긴 프레임에서 실제 시간 기준 만료가 크게 연장됐다.

## 증거

- Vitest: 6 파일, 57 테스트 통과.
- Production build: 통과. branch guard 및 Legacy B02 source/artifact gate 통과.
- `git diff --check` 대상 범위: 통과.

## 수정 후 재검증

- `ageRef.current += delta`로 2.5초 playing-time 만료를 복원했고, `frameDelta`는 이동/포즈에만 사용함을 확인했다.
- `delta=.1` 26회 후 만료 1회, 추가 10회 후 중복 만료 없음 회귀 테스트를 확인했다.
- 지정 Vitest 재실행: 6 파일, **58 테스트 통과**.
- Production build, branch guard, Legacy B02 source/artifact gate 및 scoped `git diff --check` 통과.
- 브라우저/Firebase/Graphics Studio는 사용하지 않았다.

## 최종 라우팅 판정

전체 QA는 **PASS**. 최초 수명 회귀는 해결됐고, 현재 자동 검증 범위의 잔여 위험은 브라우저 수동 시각 검증을 수행하지 않은 점뿐이다. 상세 이력은 `Quaility_Assurance/stungun_nearest_target_alignment_validation_2026-07-26.md`에 기록했다.
