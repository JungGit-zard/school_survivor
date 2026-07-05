# Graphics Studio Part Position Sliders

- Date: 2026-07-05
- Area: `Developer/r3f_prototype`

## 변경 내용

- Studio tuning에 `positionX`, `positionY`, `positionZ` 값을 추가했다.
- Graphics Studio Inspector에 Position X/Y/Z 슬라이더와 숫자 입력칸을 추가했다.
- 파츠포커싱 상태에서는 선택 파츠의 원래 위치를 기준으로 position offset을 적용한다.
- 전체 모델 튜닝에서도 같은 position 값이 runtime `StudioTunedGroup`에 적용된다.

## 제한

- 좌표 범위는 우선 `-3`부터 `3`까지로 제한했다.
