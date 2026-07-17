# Sound_Mini Matilda Animalese Laugh Review — 2026-07-17

담당 경로: `soundmini` / Sound_Mini  
대상: 마틸다 반복 돌진 사이 `오호호호` 웃음

## 읽은 기준

- `project_develop_policy.md`
- `Developer/agent_room/subagent_system_wiring_2026-07-03.md`
- `Developer/agent_room/soundmini_sfx_parameter_sheet_2026-07-05.md`
- `Developer/agent_room/soundmini_animalese_voice_methodology_2026-07-15.md`
- `.claude/agents/soundmini.md`

## 판단

- 사용자가 언급한 `놀러와요 동물의 숲`식 방법은 실제 Nintendo 음원 복제가 아니라 Animalese의 구조적 원리만 참고해야 한다.
- 이번 적용은 글자/음절 단위의 짧은 합성 토큰을 빠르게 이어 붙이는 방식으로 제한한다.
- 실제 인물 음성, 타 게임 샘플, 긴 녹음 파일은 사용하지 않는다.

## 구현 반영

- 런타임 SFX ID: `matildaLaugh`
- 현재 파일: `public/sfx/enemies/matildaLaugh.ogg`, `public/sfx/enemies/matildaLaugh.mp3`
- 생성 프리셋: `scripts/generate_sfx.mjs`의 `enemies/matildaLaugh`
- 프리셋 방향: 620Hz, 540Hz, 660Hz의 세 짧은 합성 토큰을 0.16초 간격으로 이어 붙인 `o-ho-ho`형 pseudo voice
- 라이선스: 외부 음원 없음. 프로젝트 자체 합성 프리셋.

## 제한

- 현재 실행 환경에는 `ffmpeg`가 없어 OGG/MP3 파일을 재생성하지 못했다.
- 따라서 이번 변경은 사운드 생성 프리셋과 런타임 호출 구조의 구현이며, 실제 음색 파일 교체는 후속 오디오 생성 환경에서 필요하다.

## QA 포인트

- 마틸다 웃음이 보스 경고음보다 커서 위험 정보를 가리지 않는지 확인한다.
- 돌진 반전 시 `matildaDash` 저피치 재호출이 너무 자주 반복되지 않는지 확인한다.
- 모바일 스피커에서 2~5kHz 대역이 찌르지 않는지 청음한다.
