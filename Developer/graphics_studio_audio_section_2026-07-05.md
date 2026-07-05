# Graphics Studio Audio Section

- Date: 2026-07-05
- Area: `Developer/r3f_prototype`

## 변경 내용

- Graphics Studio 상단에 `Graphics` / `Audio` 탭을 추가했다.
- Audio 탭에서 기존 `SOUND_MAP`에 등록된 모든 SFX를 열람한다.
- 선택한 SFX의 Volume, Pitch 값을 localStorage에 저장한다.
- `playSfx()`가 저장된 튜닝값을 매번 읽어 게임 재생에 즉시 반영한다.

## 제외

- 새 사운드 파일 제작, 교체, BGM/보이스 편집은 제외했다.
