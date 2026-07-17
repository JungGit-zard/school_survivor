# 타이틀 화면 Stage 2 보스 크기 축소 검증 기록

## 변경 확인

- `TitleScene3D.jsx`의 B02 타이틀 배치가 `scale={0.62}`로 변경됐다.
- 관련 소스 문자열 테스트 기대값도 `scale={0.62}`로 갱신했다.

## 자동 검증 제한

- 현재 셸에서는 WSL 1 Node 실행 문제로 `npm test`가 실행되지 않는다.
- 이전 동일 환경 메시지: `WSL 1 is not supported. Please upgrade to WSL 2 or above. Could not determine Node.js install directory`

## 수동 검증 권장

- 타이틀 화면에서 좌측 Stage 2 보스가 더 이상 B01/B03보다 과도하게 크게 보이지 않는지 확인한다.
- B02가 타이틀 문구와 중앙 캐릭터를 과도하게 가리지 않는지 확인한다.
