# 진행도 저장 P0 수리 후보

담당 라우팅은 backendmini, 카드 `t_a33559b6`이다. 최신 원격에서 별도 checkout으로 구현했고 기존 통합 후보와 타이틀·방·오디오·홈페이지 source는 변경하지 않았다.

실제 SDK는 미션 counter의 점 키를 거부했다. counter map 전용 가역 wire codec으로 고쳤다. 모든 저장은 서버 transaction과 세션·런별 watermark를 사용한다. 의미 있는 이벤트 즉시 checkpoint, 화면 상태와 독립적인 5초/online 재시도, 다음 이동·로비·로그아웃의 ACK/readback 경로를 연결했다. pending 데이터는 UID별로 보존한다.

충돌 구매의 정확한 환불, 보상 중 로컬 변화 합성, 미ACK 상태에서 A→B 실제 플레이→A 복귀, 동시 미션 counter, 타이틀 hydrate만으로 생기던 가짜 run을 회귀 검증했다. `progress.checkpointRevision`은 일반 저장과 보상의 서버 transaction에서 증가하며 구버전 전체 progress 덮어쓰기를 거부한다. 동적 ledger 일부를 악의적으로 직접 조작하는 경우까지 완벽히 방어한다고 주장하지 않는다.

관련 필수76개와 독립 actual SDK 검증을 통과했다. 자세한 실제 실행, source 해시, 전체 suite의 남은 실패, preview와 자산 보존 증거는 `Quaility_Assurance/20261018_progress_sdk_p0/README.md`에 있다. 실제 Google 새 OAuth는 아직 미검증이며 live Hosting/Rules 승격은 보류한다.

P0와 Admin 명부는 별도 commit으로 분리한다. Admin만 되돌려도 P0 revision Rules와 저장 기능이 남아야 한다. 운영 전체 복귀는 기존 `d6b5abe3d7bb45aa` Hosting 버전으로 수행하고 Firebase 사용자 데이터를 과거 snapshot으로 덮어쓰지 않는다.
