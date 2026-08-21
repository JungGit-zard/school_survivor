# Graphics Studio Scale 1 원본 크기 복원 검증

## 검증 목표

선택한 루트, 파트 또는 그룹의 Scale 입력란에 `1`을 입력하면 해당 선택 범위의
배율이 `[1, 1, 1]`로 복원되는지 검증한다.

## 필수 검증

1. 무작위 uniform scale과 축별 scale을 입력한다.
2. 실제 Scale 숫자 입력란에 `1`을 입력하고 blur를 발생시킨다.
3. `scale`, `scaleX`, `scaleY`, `scaleZ`가 모두 `1`인지 확인한다.
4. 위치, 회전, 색상과 다른 파트 값이 보존되는지 확인한다.
5. Studio preview와 live sync payload가 같은 상태인지 확인한다.
6. 각 파트에서 반복해도 transform drift가 없는지 확인한다.

## 판정

하나라도 복원되지 않거나 다른 파트에 변경이 번지면 실패다. 자동화 결과만으로
완료 처리하지 않고 실제 Studio 화면에서 최종 상태를 확인한다.
