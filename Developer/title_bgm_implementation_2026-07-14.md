# 타이틀 BGM 연결 구현 (2026-07-14)

## 원인

- 준비된 `title_bgm.m4a`와 타이틀 재생 코드는 `feature/stage2-corridor-floor-graphics` 브랜치의 `9c06feb` 이후에만 존재했다.
- 현재 작업 브랜치 `zombie_claude`에는 에셋과 재생 호출이 모두 없어 타이틀에서 네트워크 요청조차 발생하지 않았다.

## 구현

- 기존 96 kbps AAC M4A 에셋을 `src/assets/audio/title_bgm.m4a`로 복구했다.
- `TitleScreen`이 첫 `pointerdown` 또는 `keydown`에서 50% 음량으로 루프 재생한다.
- 재생이 거부되면 다음 입력에서 다시 시도한다.
- Google 인증 중에는 BGM 인스턴스를 만들지 않으며, 인증 시작 시 기존 재생을 정지·정리한다.
- 타이틀을 벗어나면 이벤트 리스너를 제거하고 오디오를 정지한 뒤 소스를 해제한다.

## 범위 제외

- 전역 BGM 음소거·볼륨 설정은 현재 제품 설정에 해당 개념이 없어 추가하지 않았다.
- 다른 브랜치의 무제스처 300/1500ms 자동 재시도와 `window.__titleBgm` 디버그 전역 변수는 이식하지 않았다.
