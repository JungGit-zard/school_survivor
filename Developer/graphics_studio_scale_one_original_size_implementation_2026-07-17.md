# Graphics Studio Scale 1 원본 크기 복원 구현

## 범위

Graphics Studio의 공통 Scale 입력은 현재 선택한 루트, 파트 또는 그룹의 tuning
배율만 다룬다. 화면 배치용 presentation scale과 게임 규칙용 collision scale은
변경하지 않는다.

## 동작

- `Scale`에 `1`을 입력하면 선택 범위의 `scale`, `scaleX`, `scaleY`, `scaleZ`를
  모두 `1`로 저장한다.
- `Scale`이 `1`이 아니면 uniform scale만 변경하고 축별 비율은 보존한다.
- 위치, 회전, 색상, 애니메이션과 다른 선택 범위의 값은 보존한다.
- 보스 전용 보정이나 과거 저장 상태 마이그레이션은 두지 않는다.

## 검증 기준

- 실제 숫자 입력과 blur 이벤트를 통해 `1` 복원이 동작한다.
- 루트, 파트, 그룹에서 동일한 계약을 따른다.
- live sync payload와 Studio preview가 같은 결과를 표시한다.
- 반복 입력과 Apply 뒤 값이 누적되지 않는다.
