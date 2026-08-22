# 마틸다 게임오버 팝업 복귀 재연출 수정

- Kanban: `escape-zombie-school / t_be692ddb`, 후속 `t_caaba080`
- 담당: `uimini`
- 범위: 게임오버 결과 팝업에서 코인 상점·랭킹·미션센터를 거쳐 복귀할 때의 HUD 상태만 수정.

## 원인

기존 코인 상점 복귀 플래그 `showGameoverResultImmediately`는 게임오버 결과 팝업을 즉시 표시했다. 그러나 마틸다 사망 연출 effect는 `isMatildaGameover`만 보고 재마운트마다 다시 시작했다. 따라서 복귀 HUD에서 충돌 효과음, 화면 흔들림, 흑백 전환이 다시 발생했다. 랭킹·미션센터는 이 복귀 플래그 자체를 설정하지 않아 같은 문제가 남아 있었다.

## 변경

`showGameoverResultImmediately`가 참인 복귀 렌더에서는 마틸다 사망 연출 effect를 `idle`로 유지한다. 코인상점에 있던 gameover 복귀 판정을 공통 함수로 추출해 코인상점·랭킹·미션센터가 모두 사용한다. 새 사망의 기존 연출과 일반 `playing` 복귀는 바꾸지 않았다.

## 검증

- RED: `npm.cmd test -- src/components/HUD.test.jsx` — 신규 회귀 테스트가 `matildaDeath` 재생을 감지해 실패.
- RED: `npm.cmd test -- src/components/ReadyGameApp.test.jsx` — 랭킹·미션센터 왕복이 `showGameoverResultImmediately=false`로 복귀해 2건 실패.
- GREEN: `npm.cmd test -- src/components/HUD.test.jsx src/components/ReadyGameApp.test.jsx` — 2 files, 51 tests passed.

실제 브라우저, Firebase, 5173 서버, 타이틀, Studio, 오디오·자산은 지시에 따라 건드리지 않았다.
