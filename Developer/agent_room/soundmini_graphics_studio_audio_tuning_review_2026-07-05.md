# soundmini Graphics Studio Audio Tuning Review

- Date: 2026-07-05
- Area: Graphics Studio / SFX registry

## soundmini 관여 범위

- 사운드 파일 제작, 교체, 라이선스 변경은 하지 않는다.
- 기존 `SOUND_MAP`에 등록된 모든 SFX를 스타지오에서 열람한다.
- 변형은 재생 볼륨 배율과 피치 재생속도 배율만 허용한다.
- 튜닝값은 localStorage에 저장하고 `playSfx()`에서 매번 읽어 게임에 즉시 반영한다.

## 제한

- BGM, 보이스, 새 에셋 추가는 이번 범위에서 제외한다.
- 출력 과밀을 막기 위해 기존 폴리포니 쿨다운 정책은 유지한다.
