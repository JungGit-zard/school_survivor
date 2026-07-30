# 모바일 접근성 비평 개선 기록 · 2026-07-30

## 변경

- `GoogleAccountPanel`은 360px 이하에서 계정 정보와 로그인/로그아웃 버튼을 두 줄로 배치하며, 모든 계정 버튼의 최소 높이를 44px로 맞췄다.
- HUD의 일반 일시정지 버튼을 44×44px로 조정하고 상단 HUD 요소에 노치 safe-area 여백을 적용했다. 개발용 버튼과 게임 상태 전환 로직은 변경하지 않았다.
- 레벨업 카드는 기존 3열 배치를 유지했다. 각 카드에 무기/업그레이드명과 효과를 포함한 `aria-label`을 제공하고, 360px 이하에서 제목 두 줄 및 11px 설명을 지원한다.
- 타이틀 시작 CTA에 첫 플레이 핵심 안내를 추가하고, 로그인·CTA·일시정지·레벨업 카드에 `:focus-visible` 표시를 추가했다.

## 변경하지 않은 영역

- Firebase 인증, 로그인 상태, 인증 지속성, Graphics Studio, 저장 방식 및 게임 상태 로직은 변경하지 않았다.

## 검증

- `npm.cmd test -- src/components/GoogleAccountPanel.test.jsx src/components/HUD.test.jsx src/components/TitleScreen.settings.test.jsx`: 3개 파일, 43개 테스트 통과.
- `git diff --check`: 통과.
- 전체 build는 다른 작업자의 병렬 변경과 충돌 가능성이 있어 실행하지 않았다.
