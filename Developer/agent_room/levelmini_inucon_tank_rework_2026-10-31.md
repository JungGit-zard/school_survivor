# levelmini — 이누콘 "대신 맞는 경호견" 본체 (Terry 2026-10-31, receipt 5bcfc83f)

- 체력: `lib/inucon.js` `resolveInucon(state, nowMs)` — 활성 시 maxHp = 주인공 maxHp × 0.20, 첫 활성 만피, 주인공 maxHp 변경 시 현재 체력 비율 유지.
- 대신 맞기: `damagePlayer`에서 phase·godMode·무적 체크 뒤 흡수. absorbed = min(피해, 이누콘 hp), 초과분만 주인공에게 간다. 흡수가 생기면 `inuconBark`를 울리고 데미지 숫자를 띄우며 주인공 무적 520ms를 켠다.
- 기절: 이누콘 hp가 0이 되면 `fainted`, `respawnAtMs = 게임시간 + 35000`. Inucon.jsx는 기절 중 따라다니기만 하고 물기·밀어내기·회복을 멈춘다. 매 프레임 `updateInucon()`을 불러 게임 시간(일시정지 시 정지)으로 리스폰한다.
- 미니 체력바: 이누콘 머리 위 y=2.0(부모 스케일 0.36 기준, 월드 폭 약 0.30u). 기절 중 숨김. 바가 회전을 받지 않도록 모델 yaw를 내부 그룹으로 분리.
- 마틸다 즉사(`killPlayer`)는 손대지 않았다. resetGame에서 `inucon: null`로 초기화.
- 유지: 2초 2% 회복·밀어내기(Terry 삭제 지시 없음). HUD 카드 문구 2줄 갱신.
- 테스트: useGameStore.test.js(+7), Inucon.test.jsx(+1). 관련 9파일 212 통과.
- balanceqa 핸드오프: 보스 특수기(ignoreInvulnerability)도 흡수된다. 근접 연속 피격에서 이누콘 체력(기본 maxHp의 20%)이 몇 초 버티는지 실측 필요.
