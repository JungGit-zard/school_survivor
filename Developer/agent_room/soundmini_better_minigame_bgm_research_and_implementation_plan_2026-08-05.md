# Sound_Mini — 더 나은 미니게임용 BGM 제작 방식 조사 및 구현안

작성일: 2026-08-05  
프로젝트: Escape! zombie school  
담당: `soundmini` / Sound_Mini / 사운드미니  
산출물 범위: 조사·설계 문서만 작성. 새 음원 생성, 코드 수정, 런타임 적용, Firebase 변경, 빌드/AAB 생성, 커밋/푸시는 수행하지 않음.

---

## 0. 결론 요약

### 0-1. 1순위 권고

이 프로젝트의 스테이지용 새 BGM은 **직접 작곡한 짧은 트래커/칩튠 루프를 원본으로 만들고, 배포본은 압축 오디오 파일로 넣는 방식**을 1순위로 권고한다.

권고 형태:

- 원본 제작: FamiStudio, BeepBox, Furnace/DefleMask 계열 트래커, 또는 DAW의 칩튠 악기.
- 원본 보존: 프로젝트 내 권리 증빙용 원본 파일과 export log를 별도 문서에 기록.
- 배포 파일: `ogg` 우선 + `mp3` 또는 `m4a/aac` fallback 후보. 단, 최종 포맷은 후속 구현 카드에서 브라우저/Android WebView 실측 후 확정.
- 곡 길이: 48–72초 seamless loop. 4–5분 생존 플레이에서는 루프 4–6회 반복을 전제로 하되, 8–16마디마다 미세 변주를 넣어 피로를 줄인다.
- 곡 수: Stage 1–4 기본 4곡 + boss/후반 layer 또는 boss loop 1–2개를 목표로 하되, 첫 도입은 Stage 1 한 곡만으로 검증한다.

이유:

1. WebAudio 실시간 절차생성 BGM보다 청감 품질과 루프 안정성을 관리하기 쉽다.
2. 외부 음원 채택보다 라이선스 리스크가 낮고, 게임 정체성에 맞춘 변주를 만들기 쉽다.
3. 완성 오디오 파일로 배포하면 Capacitor/Android WebView에서 재생 실패 지점을 줄일 수 있다.
4. 998KB 타이틀 BGM 정본을 건드리지 않고, 스테이지용 BGM 계통을 별도로 재도입할 수 있다.

### 0-2. 차선책

차선책은 **직접 작곡/트래커 루프를 만들기 전, WebAudio/ZzFX 계열 procedural prototype으로 멜로디·BPM·긴장도만 빠르게 검증한 뒤, 최종은 렌더된 오디오 파일로 굳히는 방식**이다.

이 방식은 초기 기획 검증에는 빠르지만, 최종 런타임 BGM을 전부 실시간 procedural로 유지하는 것은 유지보수와 모바일 안정성 측면에서 1순위보다 불리하다.

### 0-3. 외부 음원 채택에 대한 판단

권리 확인된 외부 음원은 임시 후보로만 고려한다. 릴리스 후보에는 다음 조건을 모두 만족하는 자료만 포함한다.

- CC0 또는 명확한 상업적 사용 허용.
- 저작자/출처/라이선스 URL/다운로드일/파일 해시 보존 가능.
- NC, GPL/SA, 라이선스 불명, 게임 원곡 모사, 특정 프랜차이즈를 떠올리게 하는 곡은 제외.

---

## 1. 현재 프로젝트 상태와 절대 보존 항목

### 확인한 프로젝트 사실

- 현재 런타임 SFX는 `Developer/r3f_prototype/src/lib/sfxRegistry.js` 기준 Howler lazy `Howl` 생성 구조다.
- `SOUND_MAP`은 OGG 경로를 1차로 사용하고, 런타임에서 `.ogg`를 `.mp3`로 바꾼 fallback을 같은 `Howl`에 등록한다.
- 오디오 실패는 `_failed`에 등록하고 이후 무음 skip한다. 즉, 사운드 실패가 게임플레이/로그인 흐름을 막지 않는 구조다.
- 전투용 반복 SFX에는 `COMBAT_VOICE_CAP = 6`, `POLYPHONY_COOLDOWN`이 이미 있다.
- `Developer/r3f_prototype/src/lib/audioDiagnostics.js`는 SFX 75개 + title BGM 1개, 총 76개 catalog를 진단 대상으로 삼는다.
- `Developer/r3f_prototype/package.json`은 `howler ^2.2.4`를 사용한다.

### 타이틀 BGM 영구 잠금

다음 파일은 이 카드에서 확인만 했고 변경하지 않았다.

- 파일: `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a`
- 크기: `998122 bytes`
- SHA-256: `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`
- 정책: 삭제, 교체, 변환, 재생 경로 변경, 대체 생성 금지.

새 스테이지 BGM은 반드시 이 파일과 별도 계통으로 설계해야 한다. 제목 화면의 BGM 품질, 권리, 용량, 포맷 논의는 이번 스테이지 BGM 도입 근거가 될 수 없다.

---

## 2. 방법별 비교표

| 방식 | 품질 | 제작 난이도 | 반복 피로도 | 루프 연결 품질 | Android AAB 크기 | 브라우저/Capacitor 호환성 | 유지보수 | 라이선스 위험 | 평가 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 직접 작곡/DAW 렌더 루프 | 높음. 믹싱/마스터링 가능 | 중간~높음. 작곡 역량 필요 | 낮게 설계 가능. 48–72초 구조와 변주 가능 | DAW에서 샘플 단위로 검증 가능 | 중간. 압축률 관리 필요 | 오디오 파일 재생 경로만 안정화하면 좋음 | 원본 세션 관리 필요 | 낮음. 직접 제작이면 증빙 쉬움 | 고품질 최종 후보 |
| 트래커/칩튠 제작 후 렌더 | 중간~높음. 게임성 강함 | 중간. 패턴 기반이라 반복 수정 쉬움 | 낮음~중간. 패턴 변주가 쉬움 | 트래커 loop point 관리가 좋음 | 낮음~중간. 단순 악기라 압축 효율 좋음 | 렌더 파일은 일반 오디오로 호환 | 매우 좋음. 패턴/악기/템포 관리 쉬움 | 낮음. 직접 제작이면 안전 | 이 프로젝트 1순위 |
| WebAudio/procedural 실시간 생성 | 중간. 잘 만들면 독창적이나 음악적 완성도 편차 큼 | 높음. scheduler/tempo/state 관리 필요 | 중간. 패턴이 짧으면 피로 큼 | 코드 scheduler 정확도에 의존 | 매우 낮음. 파일 거의 없음 | 자동재생 unlock, background pause, WebView 차이 고려 필요 | 코드 복잡도 증가 | 낮음. 직접 합성 | 프로토타입/동적 layer용 차선 |
| 권리 확인 외부 음원 채택 | 곡에 따라 높음 | 낮음. 선곡/검수 중심 | 곡에 따라 다름 | 이미 완성된 loop면 좋음 | 중간~높음 | 파일 포맷만 맞추면 보통 안정 | 출처 관리가 핵심 | 중간~높음. CC/상업/변경/표기 조건 검수 필요 | 임시·후보용, 릴리스는 엄격 제한 |
| AI 음악 생성 서비스 | 빠르게 그럴듯함 | 낮음 | 곡 품질 편차 큼 | seamless loop 불확실 | 중간~높음 | 일반 오디오로는 가능 | 재생산성과 권리 증빙 관리 필요 | 서비스 약관·학습 데이터·상업권 확인 필요 | 이번 릴리스 후보 기본 제외 |

---

## 3. 이 게임의 4~5분 생존형 구조에 맞춘 BGM 방향

현재 `Bang_Rules.md`에는 2026-07-16 기준 Stage 1 좀비 스폰 수 1.3배, 2026-06-11 기준 스테이지 길이 5분→4분 축소 메모, 그리고 다른 구간에는 300초/5분 수치가 혼재한다. 따라서 BGM은 **4분 플레이에도 어색하지 않고, 5분 구조가 남아도 버틸 수 있는 루프형**으로 설계한다.

### 공통 설계 원칙

- 한 곡은 48–72초를 기본으로 한다.
- 0–60초 초반은 악기 수를 적게 시작한다.
- 60–180초 중반은 리듬/베이스를 강화한다.
- 180초 이후 후반은 하이햇/아르페지오/노이즈 퍼커션으로 압박을 추가한다.
- 보스/클리어 직전은 별도 보스 loop를 재생하거나, 같은 곡의 후반 layer를 페이드인한다.
- 게임 이벤트 판독성 때문에 BGM은 SFX의 bossWarning, playerHit, levelUp을 마스킹하지 않아야 한다.

### Stage 1–4 분위기 브리프

#### Stage 1: 교실 생존 — 장난감 같은 불안감

- 분위기: 방과 후 교실, 귀엽지만 좀비가 몰려오는 긴장.
- BPM: 132–148.
- 조성/모드: A minor, D Dorian, E Phrygian 중 하나. 너무 어둡지 않게 minor pentatonic 섞기.
- 길이: 64초 권장.
- 구조: 8마디 intro-lite → 16마디 main → 8마디 break → 16마디 denser main → 8마디 loop lead-in.
- 악기군: square lead, triangle bass, short noise drum, toy bell accent, school bell motif는 1–2회만.
- 긴장도 변화: 초반은 베이스+킥 중심, 후반은 8분 arpeggio와 noise tick 추가.
- 루프 이음새: 마지막 1마디에서 lead를 쉬고 bass/drum만 유지해 첫 마디로 자연스럽게 회귀.

#### Stage 2: 복도/추격 — 좁은 공간 압박

- 분위기: 복도에서 발소리와 형광등이 밀려오는 느낌.
- BPM: 140–156.
- 조성/모드: C# minor, E minor, Locrian 느낌은 피하고 Dorian/Phrygian 색만 일부 사용.
- 길이: 56–72초.
- 악기군: pulse bass ostinato, short metallic tick, filtered noise hat.
- 긴장도: 반복 bass로 추격감을 만들되 melody는 짧게.
- 주의: 특정 고전 호러/콘솔 게임 멜로디를 따라가지 않는다.

#### Stage 3: 급식실/실험실 계열 후보 — 통통 튀는 혼란

- 분위기: 학교 물건이 튀고 미끄러지는 만화적 혼란.
- BPM: 128–144.
- 조성/모드: G minor 또는 A Dorian.
- 악기군: triangle pluck, filtered bubbly arpeggio, noise snare.
- 긴장도: 리듬 syncopation으로 불안정함을 주되, 귀가 피곤한 dissonance는 제한.

#### Stage 4: 탈출 직전 — 승리감 섞인 압박

- 분위기: 마지막 층/옥상/탈출구가 보이는 고조.
- BPM: 148–164.
- 조성/모드: E minor에서 G major 느낌으로 일부 전환.
- 악기군: square lead 2성부 이하, fast arpeggio, 강한 but 짧은 kick/noise.
- 긴장도: 후반 layer를 가장 강하게 두되, playerHit·bossWarning 대역을 비워둔다.

#### Boss 변주 전략

- 완전히 다른 긴 곡보다 24–40초 boss loop 또는 layer를 권장한다.
- boss layer 요소: 낮은 pulse ostinato, 2음 warning interval, noise roll.
- bossWarning SFX와 같은 pitch/rhythm을 쓰지 않는다. SFX가 우선이다.

---

## 4. 독창적 음악 브리프

다음 브리프는 Nintendo/Sega/특정 게임 곡의 모사가 아니라, 학교 생존 아케이드라는 원 프로젝트 정체성에 맞춘 독자 방향이다.

### Core identity

- 키워드: “학교 물건으로 버티는 귀여운 공포”, “장난감 전자음”, “초보자도 오래 들어도 피곤하지 않은 긴장”.
- 금지: 특정 게임 곡 멜로디, 코드 진행, 리듬 패턴, 악기 샘플 복제. 특히 Nintendo/Sega/classic game reference는 제약 기반 설계 원리만 참고한다.

### 음악 언어

- BPM: 132–156 기본, Stage 4만 164까지 허용.
- 박자: 4/4 고정 권장. 모바일 짧은 플레이에서 예측 가능한 groove가 좋다.
- 조성: minor/dorian 중심. 지나치게 우울한 natural minor만 쓰지 말고 장난감 같은 장3도/완전5도 반짝임을 드문드문 섞는다.
- 화성: 2–4 chord loop. 예: i–VI–VII–i, i–iv–VII–VI, i–bII color는 boss/위험에만 짧게.
- 멜로디: 4–6음 motif. 반복마다 마지막 음만 바꾸는 식으로 변주.
- 드럼: kick/snare 역할은 짧은 noise/pulse로 만들고, 긴 cymbal/reverb는 피한다.
- 베이스: triangle 또는 pulse 1성부. playerHit·bossWarning 저역을 침범하지 않게 -3~-6 dB 여유.

### 루프 구조 예시 — Stage 1 64초

- 0–8초: bass + soft tick, 낮은 긴장.
- 8–24초: main motif A.
- 24–32초: melody를 줄이고 percussion만 유지해 귀를 쉬게 함.
- 32–48초: motif A 변주 + arpeggio 추가.
- 48–56초: 후반 압박용 8분 pulse.
- 56–64초: lead를 정리하고 첫 마디 bass로 되돌아가는 tail-less loop.

---

## 5. 기술 구현안

### 5-1. 권장 원본·배포 포맷

#### 원본 보존

- `source`: `.fms`(FamiStudio), `.json`/song URL(BeepBox류), `.wav` master, 또는 DAW project export.
- `master`: 44.1kHz 또는 48kHz, 24-bit WAV 권장.
- `release`: 후속 실측 전 후보는 OGG Vorbis + MP3 fallback. Android 배포에서 AAC/M4A가 더 안전하면 m4a 후보를 추가 비교한다.

#### 브라우저/Android fallback 원칙

- 현재 SFX 구조처럼 `ogg` 우선 + `mp3` fallback은 WebAudio/Howler 관점에서 익숙하다.
- Android 공식 지원 포맷에는 AAC/MP3/Vorbis 등이 포함된다. 그러나 실제 WebView/Capacitor에서 loop gap과 decode latency는 별도 실측이 필요하다.
- BGM은 SFX보다 길고 루프 gap이 더 크게 들리므로, 후속 구현 전 `AudioDiagnostics`와 실제 WebView 청음 QA를 같이 수행한다.

### 5-2. 샘플레이트/채널

권장값:

- 샘플레이트: 44.1kHz 또는 48kHz. 칩튠 질감만 필요하면 32kHz 후보도 A/B 테스트 가능.
- 채널: mono 또는 very narrow stereo. 모바일 스피커 기준 mono가 용량·위상 안정성에 유리하다.
- 길이: 48–72초. boss loop는 24–40초.
- 파일 크기 예산:
  - Stage loop 1곡: 350–900KB 목표.
  - 4 stage + boss 1개 전체: 2.0–4.5MB 목표.
  - 1차 도입: Stage 1 한 곡만 추가해 AAB 증가량과 청감 피로를 먼저 검증.

### 5-3. 라우드니스/피크 목표

정확한 LUFS/true peak는 브라우저 `decodeAudioData`만으로는 측정할 수 없다. 후속 제작/QA에서 ffmpeg/ebur128 또는 전용 loudness meter로 측정한다.

권장 목표:

- BGM integrated loudness: 약 -18 ~ -16 LUFS.
- Boss/후반 layer 포함 시: -17 LUFS 근처, 단 SFX보다 앞으로 나오지 않기.
- True peak: -1.0 dBTP 이하.
- PCM sample peak: `audioDiagnostics` 기준 0.89 이하를 1차 안전 목표로 두고, overs/clipping은 실패 처리.
- SFX ducking 시 BGM -4~-8 dB 감쇠 후보.

### 5-4. 재생 수명주기

후속 구현 카드에서의 권장 수명주기:

1. 첫 사용자 입력 후 AudioContext unlock.
2. 타이틀 BGM은 기존 정본 경로 유지.
3. 게임 시작 시 stage BGM preload 또는 lazy load.
4. 스테이지 시작 전 fade in 500–900ms.
5. levelUp/선택 UI에서는 BGM 일시정지보다 -4~-6 dB ducking.
6. playerHit, bossWarning, gameOver, stageClear는 BGM ducking 우선순위 최상위.
7. pause/앱 background/visibility hidden에서는 BGM pause 또는 volume 0 fade.
8. resume 시 loop position 복귀 여부는 플랫폼 실측 후 결정. 단순 재시작이 더 안정적이면 재시작 허용.
9. gameOver/stageClear에서는 BGM fade out 400–800ms 후 결과 SFX.

### 5-5. Howler vs native Audio 선택

현재 프로젝트가 Howler를 이미 사용하므로 1차 구현은 Howler 유지가 안전하다.

- Howler 장점: 현재 SFX 구조와 일관, `src: [ogg, mp3]` fallback 사용 중, 볼륨/rate 제어 경험 있음.
- Howler 리스크: BGM loop gap, 모바일 unlock/pause 정책, 긴 파일 memory decode는 실측 필요.
- native Audio 장점: 긴 스트리밍성 오디오에 단순할 수 있음.
- native Audio 리스크: 기존 SFX mixer와 별도 계통이 되어 mute/ducking/diagnostic 관리가 분산됨.

권고: `Howler BGM manager`를 먼저 설계하되, loop gap이 실측에서 실패하면 native Audio 또는 WebAudio buffer scheduling을 비교한다.

### 5-6. 매니페스트·권리 증빙

새 BGM 도입 전 다음 manifest를 권장한다.

```text
logicalId: stage1Bgm
sourceType: self-composed tracker render
sourceProject: <path or URL>
author: Terry/Hana/SoundMini or named creator
license: self-owned / CC0 / commercial permitted
createdOrDownloadedAt: YYYY-MM-DD
sourceUrl: if any
sourceHash: sha256
releaseFiles:
  - ogg path, bytes, sha256
  - mp3 or m4a path, bytes, sha256
loopStartSec: 0
loopEndSec: exact duration
bpm: number
keyMode: e.g. A minor / D dorian
loudness: integrated LUFS, true peak
qaStatus: draft / candidate / approved
notes: title_bgm.m4a untouched
```

---

## 6. 단계별 구현 계획

이 카드는 문서화만 수행했다. 실제 제작·도입은 아래처럼 작은 카드로 나누는 것을 권장한다.

### Phase 1 — 음악 브리프 확정

- 작업: Stage 1용 64초 loop 브리프를 확정하고, 금지 reference를 명시한다.
- 완료 조건: BPM, mode, 구조, 악기, loop 전략, boss layer 필요 여부가 문서화됨.
- 실패 시 되돌리기: 문서만 수정 전 상태로 되돌리면 됨. 소스/음원 변경 없음.
- QA: SoundMini 자체 검토 + 필요 시 levelmini가 stage pacing과 충돌 여부만 검토.

### Phase 2 — 프로토타입 작곡

- 작업: FamiStudio/BeepBox/DAW 중 하나로 Stage 1 draft loop 작성.
- 완료 조건: 원본 파일, WAV master, 압축 후보 1종 이상, 권리 manifest 초안 존재.
- 실패 시 되돌리기: draft 파일 삭제 또는 `rejected/`로 이동. 런타임 연결 금지.
- QA: 청음 3회 이상, loop seam 확인, melody가 특정 게임을 떠올리게 하지 않는지 자체 검수.

### Phase 3 — 파일 포맷 A/B

- 작업: OGG/MP3/M4A 후보를 같은 원본에서 인코딩해 크기·loop gap·Android WebView decode를 비교.
- 완료 조건: 각 파일 bytes/hash, decode 성공, loop seam 청음 결과 기록.
- 실패 시 되돌리기: 후보 파일 삭제, manifest에서 제외.
- QA: desktop Chrome + Android WebView 또는 에뮬레이터 청음.

### Phase 4 — 런타임 BGM manager 설계/구현

- 작업: title BGM 계통을 건드리지 않고 stage BGM만 별도 manager로 추가.
- 완료 조건: title BGM canonical test 통과, stage BGM play/pause/duck/fade 테스트 통과.
- 실패 시 되돌리기: manager와 stage asset import 제거. title_bgm.m4a 변경 금지.
- QA: unit test + browser smoke + audio diagnostic.

### Phase 5 — Stage 1 제한 도입

- 작업: Stage 1 gameplay에만 새 BGM을 연결.
- 완료 조건: 게임 시작/일시정지/게임오버/클리어/재시작 수명주기 확인.
- 실패 시 되돌리기: Stage 1 연결 flag off 또는 import 제거.
- QA: 4분 또는 5분 전체 청취 1회 이상, SFX 마스킹 점검.

### Phase 6 — Stage 2–4 확장

- 작업: Stage별 motif 변주 제작.
- 완료 조건: 각 stage manifest, loop QA, total AAB budget 확인.
- 실패 시 되돌리기: 해당 stage만 제외 가능해야 함.
- QA: stage별 1회 이상 full-loop 청음 + boss transition 점검.

---

## 7. 청취 QA 체크리스트

### 루프/구조

- [ ] loop seam에서 클릭, 공백, 박자 밀림이 없다.
- [ ] 4분 반복 청취 후 멜로디가 과하게 질리지 않는다.
- [ ] 5분 구조가 남아도 루프 횟수가 어색하지 않다.
- [ ] boss 구간으로 넘어갈 때 갑자기 볼륨이 튀지 않는다.

### 게임플레이 판독성

- [ ] `playerHit`가 BGM 위에서 즉시 들린다.
- [ ] `bossWarning`과 `bossSpawn`이 BGM에 묻히지 않는다.
- [ ] `levelUp`, `stageClear`, `gameOver`가 결과음으로 읽힌다.
- [ ] 좀비 떼/무기 spam 시 BGM이 noise wall을 만들지 않는다.

### 기술/호환성

- [ ] desktop Chrome에서 preload/play/pause/resume이 동작한다.
- [ ] Android WebView/Capacitor에서 첫 입력 unlock 후 재생된다.
- [ ] background/visibility hidden 후 재개 시 오디오가 중복 재생되지 않는다.
- [ ] mute/volume 설정이 SFX와 충돌하지 않는다.
- [ ] decode 실패 시 게임은 무음으로 계속 진행한다.

### 파일/권리

- [ ] 모든 후보 파일의 bytes와 SHA-256이 기록됐다.
- [ ] source project와 export command 또는 export setting이 기록됐다.
- [ ] 직접 제작 또는 CC0/상업 허용 라이선스가 증빙됐다.
- [ ] NC, GPL/SA, unclear-license, 특정 게임 모사 후보가 제외됐다.
- [ ] title_bgm.m4a 정본은 변경되지 않았다.

---

## 8. 후보 소스·도구 정책

### 우선 허용

- 직접 작곡한 트래커/DAW 원본.
- ZzFX/jsfxr/sfxr 스타일 procedural sketch.
- CC0/public-domain 오디오. 단, 실제 다운로드 파일 단위로 출처와 hash를 기록해야 한다.

### 조건부 허용

- OpenGameArt/Freesound 등에서 가져온 CC BY 또는 상업 허용 음원. 표기 의무와 변형 허용을 확인해야 한다.
- AI 음악 생성물. 서비스 약관·상업 이용권·재생산성·원본성 검토가 끝나기 전 릴리스 후보로 쓰지 않는다.

### 금지

- Nintendo/Sega/타 게임 음원 복사.
- 특정 게임 곡의 멜로디·화성·리듬을 알아볼 수 있을 정도로 모사.
- NC, GPL/SA, unclear-license.
- 권리자/출처/라이선스 URL을 보존할 수 없는 파일.

---

## 9. 사실 / 제안 / 미검증 가정 구분

### 도구로 확인한 사실

- `title_bgm.m4a`는 `998122 bytes`, SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`다.
- 현재 SFX registry는 Howler를 import하고 OGG 우선 + MP3 fallback을 구성한다.
- 현재 `audioDiagnostics` catalog는 SFX 75개 + title BGM 1개를 기대한다.
- 현재 `package.json`에는 `howler ^2.2.4`가 있다.
- 작업 전 git status에는 기존 수정/미추적 파일이 다수 있었다. 이 카드에서는 필수 산출물 문서만 새로 작성했다.

### SoundMini 제안

- Stage BGM 1순위 제작 방식은 직접 작곡한 트래커/칩튠 루프 + 렌더된 압축 파일 배포다.
- Stage 1부터 한 곡만 도입해 AAB 크기, loop seam, 청취 피로, Android WebView 재생을 검증한다.
- BGM loudness는 -18~-16 LUFS, true peak -1.0 dBTP 이하를 목표로 한다.
- Howler 기반 BGM manager를 먼저 비교하되, loop gap 문제가 있으면 native Audio 또는 WebAudio scheduled buffer를 후보로 비교한다.

### 미검증 가정

- 현재 target AAB에서 OGG/MP3/M4A 중 어느 포맷이 가장 gapless에 가까운지는 아직 실측하지 않았다.
- 새 stage BGM이 전체 AAB 크기와 다운로드/설치 지표에 미치는 영향은 아직 산출하지 않았다.
- 실제 Android 기기 스피커에서 피로도와 SFX 마스킹은 아직 청음하지 않았다.
- Stage 2–4의 최종 테마/공간 콘셉트는 이 문서의 분위기 제안이며, 레벨 기획 정본 변경이 있으면 맞춰 조정해야 한다.

---

## 10. 조사 출처

조사일: 2026-08-05. 아래는 이번 카드에서 접근 확인한 공개 자료다.

1. MDN Web Audio API best practices  
   https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices  
   용도: WebAudio 수명주기, 브라우저 오디오 best practice 확인.

2. MDN Media container formats  
   https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers  
   용도: 브라우저 미디어 container/format 검토 출처.

3. Android Developers — Supported media formats  
   https://developer.android.com/media/platform/supported-formats  
   용도: Android 플랫폼의 미디어 포맷 지원 확인.

4. howler.js README  
   https://raw.githubusercontent.com/goldfire/howler.js/master/README.md  
   용도: 현재 프로젝트가 쓰는 Howler 계열 웹 오디오 라이브러리 확인.

5. ZzFX README  
   https://raw.githubusercontent.com/KilledByAPixel/ZzFX/master/README.md  
   용도: 1KB 미만 tiny sound generator, 20개 파라미터, MIT/open-source 성격 확인.

6. jsfxr README  
   https://raw.githubusercontent.com/chr15m/jsfxr/master/README.md  
   용도: sfxr 계열 HTML5/WebAudio 효과음 생성 접근 확인.

7. FamiStudio Documentation  
   https://famistudio.org/doc/  
   용도: NES/Famicom 계열 트래커/칩튠 제작 도구 후보 확인.

8. FamiStudio LICENSE  
   https://raw.githubusercontent.com/BleuBleu/FamiStudio/master/LICENSE  
   용도: 도구 자체 MIT License 확인. 단, 도구 라이선스와 생성 음악 권리는 별도 관리해야 한다.

9. BeepBox  
   https://www.beepbox.co/  
   용도: 브라우저 기반 칩튠/루프 스케치 도구 후보 확인.

10. Freesound FAQ  
    https://freesound.org/help/faq/#licenses  
    용도: 외부 음원 후보 사용 시 라이선스 확인 필요성 기록.

11. OpenGameArt FAQ  
    https://opengameart.org/content/faq  
    용도: 외부 게임 아트/오디오 플랫폼 후보의 라이선스 검토 필요성 기록.

12. Creative Commons CC0/Public Domain  
    https://creativecommons.org/public-domain/cc0/  
    용도: CC0/public-domain 우선 정책의 기준 출처.

---

## 11. 이번 카드의 서브에이전트 라우팅 기록

Subagent mandatory routing

- Board: `escape-zombie-school`
- Trigger: Escape! zombie school의 BGM/오디오 제작 방식 조사와 구현안 작성. 사운드·BGM 도메인이므로 `soundmini` 필수.
- Specialists involved: `soundmini` 현재 카드 `t_9e2a11c3`.
- Cards/artifacts/review trail: 이 문서 `Developer/agent_room/soundmini_better_minigame_bgm_research_and_implementation_plan_2026-08-05.md`.
- Verification: 문서 생성 후 파일 검사와 git status로 산출물 외 기존 변경을 건드리지 않았는지 확인한다.
- Remaining blockers: 실제 음원 제작·청음·Android WebView 실측은 후속 카드 범위.

---

## 12. 완료 기준 대응표

| 완료 기준 | 대응 |
| --- | --- |
| 비교표 | §2 |
| 1순위/차선 권고 | §0, §3 |
| 독창적 음악 브리프 | §4 |
| 기술 사양 | §5 |
| 단계별 구현안 | §6 |
| 청취 QA | §7 |
| 출처 | §10 |
| 제안/사실/미검증 가정 구분 | §9 |
| 타이틀 BGM 잠금 보존 | §1 |
| 소스/음원 변경 없음 | 이 문서 외 변경 금지, 후속 git status로 확인 |
