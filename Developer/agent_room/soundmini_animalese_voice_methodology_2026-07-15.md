# Sound_Mini 교육 메모 — Animal Crossing식 생명체 기계음 보이스 방법론

날짜: 2026-07-15
대상: `soundmini` / Sound_Mini
목적: `탈출! 좀비학교`의 도지/좀비/교내 생명체 bark를 “말처럼 들리지만 실제 대사는 아닌”, 귀엽고 생명체 같은 기계음으로 설계할 수 있게 한다.

## 1. 조사 요약

`놀러와요 동물의 숲` 계열의 NPC 말소리는 흔히 Animalese로 불린다. 핵심은 실제 성우 대사를 녹음해 재생하는 방식이 아니라, 텍스트를 아주 짧은 문자/음절 단위 소리로 쪼개 빠르게 이어 붙이는 합성형 보이스다.

확인한 공개 자료 기준:

- Nookipedia의 Animalese 설명: 각 글자 또는 일본어 kana 음절을 해당 언어의 기본 소리와 매칭해 합성한다. 숫자는 더 또렷하게 발음되며, 캐릭터·성격·기분에 따라 피치가 달라진다. 텍스트를 빠르게 넘기면 Animalese도 빨라지고 더 높게 들린다.
- Nookipedia 설명상 New Horizons/Pocket Camp 계열은 언어별 합성기가 더 명료하게 맞춰졌고, 종/species의 몸집 차이가 피치 차이에 반영되는 것으로 보인다.
- Josh Simmons의 `animalese.js` 공개 구현은 26개 알파벳 샘플 라이브러리에서 글자별 0.15초 원본 구간을 잘라, 출력은 글자당 약 0.075초로 이어 붙이고, pitch 파라미터로 샘플 인덱스 진행 속도를 조절한다.
- 공개 Python 예제들도 “문자 → 미리 녹음/합성한 짧은 wav → 순차 재생” 구조를 사용한다.

참조:

- Nookipedia, “Animalese”: https://nookipedia.com/wiki/Animalese
- `animalese.js` README: https://github.com/Acedio/animalese.js
- `animalese.js` core idea: https://raw.githubusercontent.com/Acedio/animalese.js/master/animalese.js
- Python 예제: https://github.com/27Aditi/animalese-speech-synthesizer

## 2. 프로젝트에 적용할 핵심 원리

### A. “대사”를 녹음하지 말고 “발음 토큰”을 만든다

필요한 기본 토큰:

- 한국어용 최소 토큰: `아, 이, 우, 에, 오, 으, 음, 응, 악, 끽, 꺅, 캭, 컹, 멍, 헥`
- 도지용 토큰: `멍, 컹, 끼잉, 헥, 왁, 우웅`
- 좀비용 토큰: `어, 으, 그, 끄, 아, 캭, 크르`
- 교사/보스용 토큰: `흠, 헛, 얍, 카, 두, 둥`

실제 텍스트를 모두 읽을 필요는 없다. UI 문장 길이와 감정만 받아서 토큰을 랜덤/규칙 혼합으로 이어 붙이면 된다.

### B. 글자당 길이는 매우 짧게

Animalese 느낌의 기준값:

- 토큰 원본 길이: 80~160ms
- 출력 토큰 길이: 45~90ms
- 토큰 사이 gap: 0~18ms
- 문장 쉼표/마침표 pause: 90~180ms
- 느낌표 pause 후 마지막 토큰 pitch up: +2~+5 semitone

빠르게 말해야 “기계 합성인데 살아있는 말”처럼 들린다. 너무 길면 그냥 몬스터 울음이 된다.

### C. 캐릭터 정체성은 pitch/formant/envelope로 나눈다

권장 프리셋:

- 도지
  - pitch: +3~+7 semitone
  - formant: +1~+3 semitone 느낌
  - envelope: attack 2~5ms, decay 짧게, release 20~40ms
  - rhythm: 16분음표처럼 통통 튀게, 중간중간 panting `헥헥`
  - 금지: 너무 실제 강아지 녹음처럼 길게 짖기. 도지는 밈/이벤트 캐릭터라 말소리+강아지 사이가 좋다.

- 일반 좀비
  - pitch: -4~0 semitone
  - formant: -2~-5 semitone
  - envelope: attack 10~25ms, release 60~120ms
  - rhythm: 느린 토큰 2~4개 + 랜덤 growl tail
  - 금지: 대사를 알아들을 정도의 명료한 발음.

- 작은 적/귀여운 적
  - pitch: +6~+10 semitone
  - 토큰 길이: 35~65ms
  - gap: 거의 없음
  - 소리: `삐, 끽, 얍, 뿅` 계열

- 보스/큰 적
  - pitch: -6~-12 semitone
  - formant: -4~-8 semitone
  - sub layer: 80~140Hz 짧은 톤을 약하게 추가
  - 토큰 길이: 90~160ms

### D. 감정은 같은 토큰 세트를 변형해서 만든다

- happy: pitch +2~+5, 속도 +15%, 끝 토큰 상승
- angry: pitch -2, formant -2, 볼륨 +1~2dB, distortion/saturation 소량
- sad/death: pitch down glide, 속도 -20%, release 길게
- surprise: 첫 토큰 pitch +7, 아주 짧은 silence 후 2~3토큰
- panic/runaway: 속도 +25%, pitch 랜덤 범위 확대, 토큰 반복률 증가

## 3. WebAudio/Howler 구현 레시피

### 실시간 합성형

1. `voiceTokenBank`를 만든다.
   - 각 캐릭터 family별로 8~20개 짧은 mono wav/ogg 토큰 보유.
   - 원본은 44.1kHz 또는 48kHz mono.
2. 텍스트/상황 입력을 `token plan`으로 변환한다.
   - 예: `dogeDeath` → `['왁', '끼잉', '헥']`
   - 예: `dogeChestDrop` → `['멍', '헥', '왁']` + pitch up
3. 각 토큰을 `AudioBufferSourceNode`로 순차 스케줄링한다.
   - `source.playbackRate.value = 2 ** (semitone / 12)`
   - `gain`으로 짧은 envelope 적용.
4. 캐릭터별 post chain:
   - `BiquadFilter` highpass 120Hz, lowpass 5~8kHz
   - `WaveShaper` 아주 약한 saturation
   - 필요시 `DelayNode` 20~45ms 아주 낮은 mix로 생동감
5. 최종 출력은 기존 `sfxRegistry`와 동일하게 실패해도 게임 흐름을 막지 않는 non-blocking 구조.

### 오프라인 에셋 생성형

1. Python/DAW에서 토큰 bank를 만든다.
2. 이벤트별로 여러 variation을 미리 렌더한다.
   - `doge_death_animalese_01.ogg`
   - `doge_chest_pop_voice_01.ogg`
   - `zombie_notice_voice_01.ogg`
3. 게임에서는 랜덤 variation만 재생한다.

프로토타입은 오프라인 에셋 생성형이 빠르고 안전하다. 나중에 대화형 NPC가 많아지면 실시간 합성형으로 확장한다.

## 4. 도지 이벤트에 바로 쓸 제안

### 도지 등장/춤

- 짧은 `헥-멍-헥` 루프를 음악처럼 작게.
- pitch +5, 토큰 55ms, gap 10ms.
- 너무 자주 반복하지 말고 1.5~2.5초마다 1회.

### 도지 피격

- `왁!` 또는 `깨갱!`을 80ms 이하.
- pitch 랜덤 +3~+8.
- weapon hit SFX보다 앞서지 않게 volume -4~-7dB.

### 도지 사망 → 상자 드랍

- `와-끼잉-퐁` 같은 하강 후 상승 구조.
- death token은 pitch down glide, chest drop 순간은 짧은 pitch-up `뿅/퐁`.
- 상자 오픈 SFX와 충돌하지 않게 death voice는 250~450ms 안에 끝낸다.

예시 plan:

```js
const dogeDeathVoicePlan = [
  { token: '왁', ms: 70, semitone: +5 },
  { token: '끼잉', ms: 120, semitone: +1, glideTo: -4 },
  { token: '퐁', ms: 55, semitone: +8, delayMs: 35 },
]
```

### 상자 오픈

- 보이스보다는 물리 SFX가 주역.
- 아주 작게 `야!` 같은 토큰을 섞으면 코믹 보상감이 생긴다.
- `milestoneGold` 임시음 대체 후보: wood pop + metal click + coin sparkle + tiny animalese cheer.

## 5. 품질 기준

- 1초 안에 정체성이 보여야 한다.
- 반복 재생해도 사람 말처럼 피로하지 않아야 한다.
- 알아들을 수 있는 실제 단어를 의도적으로 줄인다. 의미는 UI 텍스트가 전달하고, 보이스는 생명감/감정만 전달한다.
- 모바일 스피커에서 2~5kHz가 너무 찌르지 않게 lowpass/eq 체크한다.
- 무음 플레이 가능성은 유지한다. 보이스는 정보 전달의 유일한 수단이 되면 안 된다.

## 6. Sound_Mini에게 주는 액션 아이템

1. 도지 family용 token bank 8~12개를 먼저 만든다.
2. `dogeSpawn`, `dogeHit`, `dogeDeath`, `dogeChestOpen` 4개 이벤트 variation을 각 3개씩 만든다.
3. 각 파일은 0.5초 이하, mono, OGG 우선 + MP3 fallback 필요 여부 검토.
4. 기존 임시 주석 위치 확인:
   - `src/components/DancingDogeEvent.jsx`: 도지 전용 사망 SFX 교체 예정.
   - `src/components/TreasureChest.jsx`: 전용 오픈 SFX 교체 예정.
5. 적용 전 사운드 QA:
   - 모바일 첫 터치 전 자동재생 없음.
   - 같은 이벤트 연속 발생 시 cooldown/volume stacking 문제 없음.
   - 도지 death voice와 chest open SFX가 겹쳐도 main feedback이 묻히지 않음.

## 결론

Animalese의 본질은 “글자/음절 단위의 아주 짧은 기계 합성 토큰 + 캐릭터별 pitch/formant/rhythm 변형”이다. `탈출! 좀비학교`에서는 실제 언어 발음보다 캐릭터 감정과 종족성을 우선하고, 도지부터 작은 token bank 기반 이벤트 보이스로 적용하는 것이 가장 안전하다.
