# 이누콘 무기/펫 구체화 기획안 (2026-08-21)

## 1. 목적
- 첨부된 치비 강아지 이미지를 기반으로 신규 무기/동반자 `이누콘`을 추가한다.
- 이누콘은 공격형 펫이 아니라, 주인공에게 붙은 좀비를 밀어내고 주기적으로 회복하는 생존 보조 무기다.
- 구현은 기존 치비코/하나코처럼 React Three Fiber 절차형 모델과 게임 런타임 무기 시스템에 직접 연결한다.

## 2. 시각 콘셉트
- 실루엣: 강아지답게 세로로 긴 몸통, 작은 머리, 뾰족한 귀, 짧은 다리, 옆으로 흔드는 꼬리.
- 색상: 주황/갈색 강아지 본체 + 검은 굵은 외곽선 + 보라색 포인트 스카프.
- 표정: 단순한 검은 점 눈, 작은 코, 웃는 입.
- 애니메이션: 주인공 뒤를 통통 따라오며 꼬리를 흔들고 한쪽 앞발을 들고 흔드는 느낌.
- 카메라/게임 화면 가독성: R3F 저폴리/툰 셰이딩으로 멀리서도 강아지 형태가 보이도록 세로 비율을 강조한다.

## 3. 기본 게임플레이 스펙
- 무기 ID: `inucon`
- 표시 이름: `이누콘`
- 카드: `이누콘 해금`
- 등장 레벨: Lv.8부터 등장
- 장착 조건: 스타터 계열 무기처럼 계정 해금 게이트 없이 런 중 카드로 획득
- 추종: 주인공의 이동 궤적을 따라 뒤쪽에서 동반자처럼 따라다님
- 밀어내기:
  - 주인공 주변에 붙은 좀비를 주기적으로 밀어낸다.
  - 기본 반경: `0.85`
  - 기본 넉백: `2.8`
  - 기본 넉백 유지: `180ms`
  - 접촉 펄스 간격: `250ms`
- 회복:
  - 10초마다 주인공 최대 HP의 10% 회복
  - 기본 간격: `10000ms`
  - 기본 회복 비율: `0.10`

## 4. 레벨업 설계
- `inuconHeal`: 회복량 +2%p, 최대 18%
- `inuconPushRadius`: 밀어내기 반경 +0.1, 최대 1.25
- `inuconKnockback`: 넉백 +0.4, 최대 4.4 / 부가로 넉백 유지시간 +20ms
- 만렙 방향: 공격력 대신 생존성 상승. 붙은 적 처리, 회복량, 탈출 여유 시간이 함께 오른다.

## 5. 구현 위치
- 무기 카탈로그: `Developer/r3f_prototype/src/lib/weaponCatalog.js`
- 업그레이드 효과: `Developer/r3f_prototype/src/lib/upgrades.js`
- 이누콘 유틸: `Developer/r3f_prototype/src/lib/inucon.js`
- R3F 모델/런타임: `Developer/r3f_prototype/src/components/Weapons/Inucon.jsx`
- 무기 export: `Developer/r3f_prototype/src/components/Weapons/index.js`
- 게임 배치: `Developer/r3f_prototype/src/components/Game.jsx`
- HUD 카드/아이콘: `Developer/r3f_prototype/src/components/HUD.jsx`
- 그래픽 스튜디오: `Developer/r3f_prototype/src/lib/graphicsStudioConfig.js`, `Developer/r3f_prototype/src/components/GraphicsStudioPreview.jsx`
- 아이콘: `Developer/r3f_prototype/src/assets/weapon_icon/19_wea_inucon.svg`

## 6. 검증 기준
- 유닛 테스트:
  - weaponCatalog에 20번째 무기로 등록되는지
  - starter 목록과 기본 스펙이 맞는지
  - 업그레이드 카드가 활성/레벨/상한 규칙을 지키는지
  - i18n 누락이 없는지
- 빌드:
  - `npm run build` 성공
- 시각 검증:
  - 그래픽 스튜디오/게임 화면에서 세로로 긴 강아지 모델이 확인되어야 함
  - 화면 캡처를 채팅 스레드에 업로드

## 7. 현재 우선순위
1. 세로로 긴 강아지 실루엣을 더 확실히 보이도록 `InuconModel` 보강
2. 무기/업그레이드/영구 강화/번역 테스트 통과
3. Vite 빌드 통과
4. 브라우저에서 모델을 띄우고 스크린샷 캡처 후 공유
