# 마틸다 게임오버 복귀 재연출 회귀 검증

- Kanban: `t_be692ddb`, 후속 `t_caaba080`

## 회귀 조건

마틸다 사망(`phase: gameover`, `deathCause: matilda`) 뒤 이미 확인된 결과 팝업으로 복귀하는 HUD를 렌더한다. 앱 라우팅은 코인상점·랭킹·미션센터 각각에서 게임오버 상태로 진입하고 뒤로 복귀한다.

## RED

`npm.cmd test -- src/components/HUD.test.jsx`

신규 HUD 테스트 1건이 실패했다. `matildaDeath` SFX가 다시 발생해, 복귀 시 사망 연출이 재생되는 증상을 직접 포착했다. 후속 라우팅 테스트에서는 랭킹·미션센터 왕복 2건이 `instant-result-prop=false`로 실패했다.

## GREEN

`npm.cmd test -- src/components/HUD.test.jsx src/components/ReadyGameApp.test.jsx`

2 files passed, 51 tests passed. 코인상점·랭킹·미션센터 복귀 시 결과 팝업은 즉시 존재하고, 마틸다 대사·SFX·화면 흔들림·흑백 전환은 다시 발생하지 않는다. 일반 `playing` 상태 코인상점 복귀는 `false`를 유지한다.

## 범위 제한

실제 브라우저/Firebase/5173은 이번 검증 대상에서 제외했다. 테스트는 해당 HUD 재마운트와 인접한 코인상점 복귀 전달 경로만 실행했다.
