# Stage 1·2 BGM 분위기 및 작곡 방향 기획

작성일: 2026-08-06
개정일: 2026-08-06
프로젝트: Escape! zombie school
담당: `soundmini` / Sound_Mini / 사운드미니
산출물 범위: Stage 1·Stage 2 BGM의 분위기·작곡 방향 기획만 작성/개정. 음원 제작, 코드 수정, 에셋 다운로드, Firebase 접근/변경, 브라우저/localStorage 접근, 빌드/AAB, 커밋/푸시는 하지 않는다.

---

## 0. 결론 요약

### 최상위 감정 축

이번 Stage 1·2 BGM의 최상위 음악 정체성은 **유쾌, 신남, 다정, 청춘**이다.

- **유쾌:** 학교 소동의 재치. 책상, 종, 복도, 운동화 리듬이 장난스럽게 튀는 느낌.
- **신남:** 속도감 있는 액션. 플레이어가 “한 번 더!” 하고 뛰어들 수 있는 밝은 전진감.
- **다정:** 상대는 없애야 할 괴물이 아니라 다시 돌아올 친구다. 음악은 전투를 구조와 회복의 놀이처럼 감싼다.
- **청춘:** 함께 뛰고 성장하는 밝은 에너지. 실패해도 다시 웃으며 도전하는 학교 모험의 기운.

### 추천 방향

- **Stage 1 추천:** `교실 장난감 구조대 칩튠` — 친근한 교실 소동, 첫 모험의 설렘, 책상·연필·종소리 같은 학교 물건 액션, 감염된 친구들을 되돌리는 다정한 구조 감각을 담은 밝은 칩튠 루프.
- **Stage 2 추천:** `복도 스포츠 아케이드 런` — Stage 1보다 빠르고 바쁜 복도 액션. 운동화 스텝, 레인 이동, 슬랩스틱 술래잡기 에너지, 팀워크 구조 낙관을 살리되 무서운 감정은 만들지 않는 아케이드 루프.

### 공통 제작 원칙

- 직접 작곡한 트래커/칩튠 루프를 원본으로 만들고, 후속 구현에서 압축 오디오로 렌더한다.
- 기본 루프 길이는 56~64초, 허용 범위는 48~72초다.
- Stage 1과 Stage 2는 같은 4음 이하 핵심 정체성 motif를 공유하되, Stage 1은 둥근 교실 장난감 색, Stage 2는 스포티한 복도 아케이드 색으로 분리한다.
- `bossWarning`, `playerHit`, `levelUp`, 대화/튜토리얼, 밀집 액션 SFX를 가리지 않도록 BGM은 짧은 음가·낮은 잔향·중역 여백·이벤트 ducking 전제를 둔다.
- 난이도 성장은 리듬의 바쁨, 앞으로 달리는 운동감, 밝은 클라이맥스, 승리 직전의 통쾌한 밀도로 표현한다. 무서운 감정으로 난이도를 전달하지 않는다.

---

## 1. 정본 세계관 전제: 모든 좀비는 돌아올 학생이다

이 문서의 음악 판단은 아래 전제를 정본으로 삼는다.

1. Escape! zombie school의 좀비는 본질적으로 **감염된 학생**이다.
2. 그 학생들은 최종적으로 다시 평범한 학생으로 돌아올 것으로 기대된다.
3. 따라서 BGM은 “처치/소멸/괴물 사냥”의 감정이 아니라 **친구를 도와 회복시키는 구조 액션**의 감정을 만든다.
4. 게임플레이가 전투처럼 보이는 순간에도 음악은 “학교에서 벌어진 큰 소동을 함께 해결한다”는 태도를 유지한다.
5. Stage 1·2의 공통 정체성은 “유쾌한 좀비 액션”이며, 공포 장르의 정서가 아니다.

### 금지되는 정서 사용 방식

아래 단어들은 이 문서에서 **금지/제거 대상 설명 또는 검증 대상**으로만 언급한다. 추천안이나 작곡 지시에는 적용하지 않는다.

- 공포, 불안, 공포감, 불길함, 위협, 공포 추격, creepy mystery, ominous pursuit, survival-horror, menace, dread, anxiety, oppressive threat.
- 단조/minor는 사용할 수 있지만 “무서운 색”이 아니라 장난스러운 영웅감, 밝은 modal 색, 스포츠 만화식 의욕으로 들릴 때만 허용한다.

---

## 2. 확인한 프로젝트 사실

이 항목은 이번 작업에서 실제 파일을 읽고 확인한 사실이다. 과거 문서와 충돌하는 수치는 현행 코드와 이번 카드 본문 지시를 우선한다.

1. Stage 공통 현행 duration은 `Developer/r3f_prototype/src/lib/stageConfig.js`의 `STAGE_DURATION_SEC = 240`이다.
2. `stageConfig.js` 기준 `BOSS_SPAWN_CENTER_SEC = 180`, `BOSS_SPAWN_JITTER_SEC = 10`이다. 따라서 음악 기획에서는 **180초부터 240초까지를 boss/warning 전환 구간**으로 취급한다. 실제 보스 등장 시각은 런타임에서 170~190초 범위로 변할 수 있으므로, 음악은 정확한 프레임 싱크가 아니라 안전한 후반 레이어 전환으로 대응해야 한다.
3. Stage 1의 현재 코드/문서상 제목은 `교실 생존`, boss type은 `B01`, 맵은 교실형 세로 공간이며, Stage 1은 E04 원거리 탄환을 사용하지 않는 접근·돌진 학습 스테이지다. 여기의 `교실 생존`은 현행 제목 사실로만 남기며, 음악 정서는 구조/회복 액션으로 재해석한다.
4. Stage 2의 현재 제목은 `복도 투사체 시험`, boss type은 `B02`, `e04IntroSec = 72`, 맵은 복도형이며, 핵심 학습은 원거리 탄환 읽기와 안전 레인 변경이다.
5. `waveTimelines.js` 기준 Stage 1은 0~60초 E01 중심 학습, 60~180초 탱커·러너·돌진·거대가 점진 합류, 180~240초 boss/warning 이후 일반 적 수를 낮추며 B01 중심의 후반 하이라이트를 만든다.
6. `waveTimelines.js` 기준 Stage 2는 0~60초 복도 이동 적응, 72초 이후 E04 투사체 도입, 120초 이후 E05/E04 조합, 168초 이후 E06 벽+탄환, 180초 이후 boss/warning 후반 하이라이트를 만든다.
7. `stage2ProjectileRules.js` 기준 E04 발사 관련 핵심 수치는 첫 등장/발사 게이트 72초, 첫 발사 지연 900ms, 화면 내 탄환 상한 6, 최소 발사 거리 3.5, 보스 구간 투사체 억제 플래그다.
8. 이전 SoundMini 문서는 스테이지 BGM 제작 방식으로 직접 작곡한 트래커/칩튠 루프 + 렌더된 압축 오디오 배포를 1순위로 권고했고, 48~72초 seamless loop를 권장했다.
9. 타이틀 BGM 정본은 `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a`, 998122 bytes, SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`이며, 이번 작업에서는 변경하지 않는다.

---

## 3. 전체 음악 정체성

### Escape! zombie school 공통 음악 언어

- 한 문장: **감염된 학생들을 다시 친구로 되돌리는 유쾌한 학교 액션을, 짧고 밝은 전자음 motif와 통통 튀는 리듬으로 들려준다.**
- 공통 motif: `짧게-짧게-쉼-상행 응답` 또는 `상행 2음 + 밝은 완전5도/장6도 응답`의 4음 이하 형태.
- 공통 음색: square lead, triangle/pulse bass, 짧은 noise percussion, toy bell 또는 school-bell 계열의 절제된 accent.
- 공통 금지: 특정 게임, 프랜차이즈, 유명 멜로디, 고전 콘솔 곡의 코드 서명·리듬 패턴·샘플을 모사하지 않는다.

### Stage 차별화 원칙

| 항목 | Stage 1 | Stage 2 |
| --- | --- | --- |
| 공간 감각 | 교실 안, 책상 사이에서 첫 모험을 배우는 친근한 소동 | 긴 복도, 레인과 탄환을 읽으며 달리는 스포츠 아케이드 |
| 액션 수단 | 물량, 접근, 돌진, B01 하이라이트를 학교 물건 놀이처럼 표현 | 투사체, 좁은 레인, E04/E05/B02 조합을 운동회식 순발력으로 표현 |
| 음색 | 둥글고 장난감 같은 square·toy bell | 선명한 pulse·운동화 tick·filtered noise |
| 리듬 | 8분 기반의 배우기 쉬운 교실 groove | 16분 pulse와 offbeat tick의 경쾌한 달리기 groove |
| 멜로디 | 조금 더 노래 가능하고 초보자 친화 | 짧고 단속적이며 레인 이동 박자를 도와줌 |

---

## 4. Stage 1 — 교실 구조 첫 모험

### 4-1. 감정 약속과 mood keyword

- 감정 약속: **처음 연필을 던지며 배울 수 있을 만큼 부드럽고, 4분 끝으로 갈수록 책상 사이의 소동이 커지지만 끝까지 “친구들을 되돌리러 간다”는 다정한 모험감이 유지된다.**
- Mood keywords: `친근한 교실 소동`, `첫 모험 설렘`, `장난감 전자음`, `학교 물건 액션`, `친구 회복 구조대`, `유쾌`, `신남`, `다정`, `청춘`

### 4-2. 240초 감정 arc

| 구간 | 게임 흐름 | 음악 처리 |
| --- | --- | --- |
| 0~60초 | E01 중심 학습, 이동·자동 공격·XP 수집을 익힘 | bass 1성부 + soft tick + 짧은 4음 motif만 사용. lead 음역은 밝지만 얇게, 화성은 넓게 비워 첫 레벨업·튜토리얼 감각을 가리지 않는다. 교실에 막 들어온 첫 모험처럼 가볍고 다정하게 시작한다. |
| 60~180초 | E02/E03/E05/E06가 점진 합류, 접근·돌진 패턴이 늘어남 | 8분 arpeggio와 두 번째 percussion layer를 추가한다. motif 마지막 음을 매 16마디마다 바꿔 반복 피로를 줄인다. 리듬은 더 바빠지지만 감정은 학교 운동장처럼 밝게 앞으로 간다. E05 경고와 playerHit가 들리도록 2~5kHz의 지속음을 피한다. |
| 180~240초 | bossWarning/B01 후반 하이라이트, 일반 적 수는 낮아지고 B01 중심 이벤트가 두드러짐 | 새 곡으로 급전환하지 않고 낮은 pulse와 짧은 noise roll을 4~8마디 동안 올려 “클라이맥스 학교 소동”을 만든다. bossWarning 순간에는 BGM lead를 1박 또는 1마디 비워 경고 SFX가 앞으로 나오게 한다. 210초 이후 escape portal 감각은 밝은 toy bell 한두 음으로 “거의 다 도왔다”는 청춘 구조 낙관을 준다. |

### 4-3. 후보 음악 방향 비교

| 후보 | 방향 | 강점 | 리스크/대응 |
| --- | --- | --- | --- |
| A. 교실 장난감 구조대 칩튠 | square lead + triangle bass + toy bell accent, 132~144 BPM | Stage 1의 학습/유쾌/다정/첫 모험을 가장 잘 균형 잡음. 초보자 첫 플레이에 덜 피곤함. | 너무 산만하면 SFX를 가릴 수 있으므로 bell은 16마디 1~2회로 제한. |
| B. 책상 드럼라인 아케이드 | 책상 두드림 같은 short noise percussion 중심, 140~150 BPM | 물량이 늘어나는 체감과 액션성이 좋음. 무기 SFX와 맞물리면 통쾌함. | 드럼이 많으면 playerHit, levelUp, 무기 spam과 충돌하기 쉬우므로 -4~-6dB 여백과 dropout 필요. |
| C. 방과 후 동아리 행진곡 | 2마디 call/response와 밝은 modal dyad, 128~138 BPM | 청춘·팀워크 감각이 강하고 “친구들을 데려오자”는 정서가 분명함. | 액션감이 약해질 수 있어 후반 arpeggio와 8분 pulse 보강 필요. |

### 4-4. Stage 1 추천안

추천: **A. 교실 장난감 구조대 칩튠**

구체 파라미터:

| 항목 | 권장값 |
| --- | --- |
| BPM | 136~144 BPM. 1차 draft는 140 BPM 권장. |
| Mode/key-color | C major/A Dorian/D Mixolydian 계열의 밝은 modal hybrid. A minor 색을 쓰더라도 장난스러운 완전5도·장6도·상행 응답으로 “어두움”이 아니라 귀여운 영웅감을 만든다. |
| Meter | 4/4 고정. 모바일 조작 리듬을 방해하지 않는다. |
| Motif shape | 4음 이하. 예: `상행 2음 → 쉼 → 밝은 응답음` 또는 `짧은 반복음 2개 → 높은 응답음`. 실제 음정은 신규 작곡에서 독창적으로 작성. |
| Harmony density | 2~3 chord 느낌만 암시. 지속 pad 금지. bass 단음 + occasional dyad 중심. |
| Rhythm identity | 8분 pulse 중심, 16분은 후반 arpeggio에만 제한. 킥/스네어 역할은 짧은 click/noise로 대체. |
| Instrument palette | square lead 1개, triangle bass 1개, short noise kick/snare/hat, toy bell accent 1개, 후반 thin arpeggio 1개. |
| Texture | 초반은 2~3성부, 중반 4성부, 후반 5성부 이하. reverb 거의 없음. |
| Intensity layers | L0 bass+tick, L1 motif lead, L2 arpeggio, L3 boss low pulse/noise roll. 후속 구현에서 런타임 layer를 쓰지 않더라도 작곡 구조 안에 이 밀도 차를 반영. |
| Loop length/structure | 64초 권장. 0~8초 intro-lite, 8~24초 main A, 24~32초 percussion rest, 32~48초 A', 48~56초 denser school-action lift, 56~64초 loop return. |
| Seamless loop exit/return | 마지막 1마디에서 lead와 bell을 쉬고 bass+tick만 남겨 첫 마디로 돌아간다. tail reverb 없이 zero-crossing 기준으로 렌더. |

---

## 5. Stage 2 — 복도 스포츠 아케이드

### 5-1. 감정 약속과 mood keyword

- 감정 약속: **복도는 더 빠르고 바쁘지만 무섭지 않다. 운동화 스텝 같은 pulse와 짧은 tick이 레인 이동 박자를 도와주며, 탄환을 피하는 순간도 친구를 구하러 뛰어가는 청춘 아케이드 액션으로 들린다.**
- Mood keywords: `스포티한 복도 액션`, `슬랩스틱 술래잡기`, `아케이드 momentum`, `팀워크 구조`, `탄환 읽기`, `밝은 클라이맥스`, `유쾌`, `신남`, `다정`, `청춘`

### 5-2. 240초 감정 arc

| 구간 | 게임 흐름 | 음악 처리 |
| --- | --- | --- |
| 0~60초 | 탄환 없이 복도 이동 적응, E01/E03/E02로 레인 감각 학습 | melody를 줄이고 pulse bass와 thin tick으로 “운동화로 복도를 달리는” 감각을 만든다. Stage 1보다 처음부터 조금 더 빠르고 선명하지만, 고음 정보량은 아껴 조작 학습을 돕는다. |
| 60~180초 | 72초 이후 E04 투사체 도입, 96초 이후 E04 cap 상승, E05/E06 조합 | 16분 pulse 또는 offbeat tick을 추가해 레인 변경 타이밍을 몸으로 느끼게 한다. 실제 탄환 발사음/경고선 SFX와 같은 리듬을 반복하지 않는다. 144~180초에는 bass ostinato를 짧게 고정해 앞으로 달리는 momentum을 강화한다. |
| 180~240초 | bossWarning/B02 후반 하이라이트, E04/E05/B02 조합과 탈출 전 구조 액션 | bossWarning 직전 1마디는 high tick을 줄이고 low pulse를 정리해 SFX 공간을 확보한다. boss 구간은 무서운 만남이 아니라 장난꾸러기 선배/친구와 부딪히는 학교 액션 클라이맥스처럼 rhythm density를 올린다. 210초 이후에는 escape portal을 암시하는 짧은 상행 2음만 넣고, 긴 lead는 피해 탄환/SFX 가독성을 지킨다. |

### 5-3. 후보 음악 방향 비교

| 후보 | 방향 | 강점 | 리스크/대응 |
| --- | --- | --- | --- |
| A. 복도 스포츠 아케이드 런 | pulse bass ostinato + 운동화 tick + filtered noise, 144~152 BPM | Stage 2의 복도/탄환/레인 정체성과 가장 잘 맞음. Stage 1과 명확히 구분되며 무서운 감정 없이 난이도 상승을 전달함. | 반복 ostinato가 피로할 수 있어 16마디 단위 필터/음역 변주가 필요. |
| B. 학교 방송부 응원 리듬 | 짧은 school-bell fragment, syncopated cheer motif, call/response | 팀워크와 구조 낙관이 강함. “다 같이 뛰자”는 청춘감이 좋음. | 실제 bossWarning, levelUp, UI 알림과 음색 충돌 위험이 있어 bell은 낮은 빈도와 다른 pitch로 제한. |
| C. 빠른 체육관 칩튠 레이스 | 152~158 BPM, 빠른 arpeggio와 짧은 lead 중심 | 액션감이 강하고 플레이 흥분도가 높음. | 탄환 회피 스테이지에서 정보량이 너무 많아질 수 있으므로 lead sustain 금지와 SFX ducking 필요. |

### 5-4. Stage 2 추천안

추천: **A. 복도 스포츠 아케이드 런**

구체 파라미터:

| 항목 | 권장값 |
| --- | --- |
| BPM | 144~152 BPM. 1차 draft는 148 BPM 권장. |
| Mode/key-color | G Mixolydian/E Dorian/B minor heroic hybrid. minor 색은 “스포츠 만화의 결승 직전 의욕”처럼 짧고 영웅적으로만 사용하며 무서운 색으로 만들지 않는다. Locrian처럼 중심감이 심하게 흐려지는 색은 피한다. |
| Meter | 4/4 고정. 2마디 단위 call/response로 레인 변경 리듬을 만든다. |
| Motif shape | 3음 이하의 끊긴 motif. 예: `같은 음 짧게 2회 → 위쪽 응답` 또는 `상행 3음 cheer`. 실제 멜로디는 새로 작곡. |
| Harmony density | 1~2 chord 또는 bass pedal 중심. 화성보다 ostinato와 texture 변화로 전진감 형성. |
| Rhythm identity | 16분 pulse, offbeat 운동화 tick, 짧은 noise hat. 탄환 발사음과 겹치지 않게 tick은 -6dB 여유. |
| Instrument palette | narrow pulse bass, hollow square blip, dry tick synth, filtered noise hat, low boss-compatible pulse. toy bell은 Stage 1보다 적게 사용. |
| Texture | 건조하고 얇게. sustain pad 금지. 음 사이 공간을 크게 남겨 탄환/SFX를 읽게 함. |
| Intensity layers | L0 pulse bass, L1 corridor tick, L2 short blip motif, L3 E04 action hat, L4 boss low pulse. |
| Loop length/structure | 56초 또는 64초. 0~8초 pulse intro, 8~24초 main corridor, 24~32초 tick dropout, 32~48초 projectile-action lift, 48~56/64초 boss-compatible lead-out. |
| Seamless loop exit/return | 마지막 2박에서 tick을 끊고 low pulse만 첫 박과 같은 음으로 유지한다. loop point에 긴 noise tail을 남기지 않는다. |

---

## 6. Stage 1과 Stage 2의 공통 정체성과 차이

### 공유할 것

1. 4음 이하의 짧은 학교 구조 motif 문법.
2. square/pulse/triangle/noise 중심의 직접 작곡 칩튠 팔레트.
3. 잔향이 짧고 모바일 스피커에서 SFX를 가리지 않는 dry mix.
4. 48~72초 seamless loop와 8~16마디 단위 미세 변주.
5. boss/warning 구간에서 완전히 다른 곡으로 갈아타기보다 낮은 pulse·리듬 밀도 변화로 밝은 클라이맥스를 올리는 방식.
6. 모든 stage에서 감염 학생의 회복 가능성을 전제로 “다정한 구조 액션”을 유지한다.

### 다르게 만들 것

1. Stage 1은 melody가 조금 더 “노래”처럼 기억되게 하고, Stage 2는 rhythm/pulse가 기억되게 한다.
2. Stage 1은 toy bell과 둥근 square로 교실 장난감성을 만들고, Stage 2는 dry tick과 hollow pulse로 복도 달리기성을 만든다.
3. Stage 1의 난이도 성장은 악기 수가 늘어나는 친근한 교실 소동으로, Stage 2의 난이도 성장은 더 빠른 박자·offbeat·짧은 dropout의 아케이드 momentum으로 전달한다.
4. Stage 1은 초반 60초가 더 따뜻하고 안전해야 하며, Stage 2는 초반부터 “다음 스테이지”임을 알 수 있게 약간 더 빠르고 스포티해야 한다.

---

## 7. 게임플레이 판독성 보호 원칙

이 문서는 코드 변경을 지시하지 않는다. 아래는 후속 작곡·믹싱·런타임 구현 카드에서 지킬 arrangement/ducking 원칙이다.

### 우선순위

1. `playerHit`, `bossWarning`, `gameOver`, `stageClear`는 BGM보다 항상 우선한다.
2. `levelUp`과 선택 UI가 열릴 때는 BGM이 정보의 주역이 되면 안 된다.
3. 대화/튜토리얼/경고 문구가 있는 구간에서는 lead melody보다 bass/tick 중심의 얇은 texture를 유지한다.
4. 밀집 액션 SFX가 많을 때 BGM은 noise wall을 만들지 않아야 한다.

### Arrangement 원칙

- 긴 cymbal, 긴 noise sweep, 긴 reverb pad 금지.
- 2~5kHz의 지속 lead를 피하고, 필요한 lead는 50~180ms의 짧은 음가로 둔다.
- bossWarning 전후 300~800ms는 BGM lead를 비우거나 약하게 한다.
- playerHit가 빈번한 구간에서는 BGM low pulse와 high tick을 동시에 키우지 않는다.
- levelUp 순간에는 BGM이 멈추기보다 -4~-6dB 정도 ducking되는 전제를 둔다. 단, 실제 수치는 후속 구현/QA에서 결정한다.
- bossWarning 또는 stageClear 같은 큰 이벤트는 -6~-8dB ducking 후보를 둔다.
- Stage 2의 tick은 E04 탄환 발사음·탄환 경고음과 다른 pitch/rhythm에 둔다.
- boss 순간은 장난꾸러기 학교 액션 하이라이트로 처리하되, BGM이 앞에 나오지 않고 SFX와 플레이 판단 공간을 남긴다.

---

## 8. 독창성·라이선스 guardrails

- Nintendo, Sega, Capcom, Konami, Namco, 특정 고전 게임 또는 현대 게임의 음원, 멜로디, chord signature, 리듬 signature, 샘플을 복사하지 않는다.
- `놀러와요 동물의 숲`/Animal Crossing 등은 보이스 방법론 참고로만 취급하며, 이번 BGM 계획의 melody/샘플 reference로 사용하지 않는다.
- “8-bit/chiptune”은 하드웨어 제약과 단순 파형 설계 원리를 뜻할 뿐, 유명 게임 곡을 떠올리게 만드는 모사가 아니다.
- 릴리스 후보는 직접 제작, 직접 녹음, CC0/public-domain, 또는 상업 이용과 변형 허용이 명확한 자료만 사용한다.
- NC, GPL/SA, 라이선스 불명, 출처/권리자/다운로드일/hash를 남길 수 없는 파일은 제외한다.
- 후속 제작물은 source project, export setting, release file bytes, SHA-256, license/provenance manifest를 남긴다.

---

## 9. 창작 제안

아래는 아직 구현·청음되지 않은 SoundMini 창작 제안이다.

### Stage 1 제안

- 140 BPM, C major/A Dorian/D Mixolydian 색의 64초 loop.
- 교실 motif는 “짧은 상행 2음 + 쉼 + 밝은 응답음”으로 시작한다.
- toy bell은 school bell처럼 들릴 수 있으므로 과하게 반복하지 않고, 16마디마다 1~2회만 사용한다.
- 후반 boss layer는 낮은 pulse와 짧은 noise roll만 추가하고, 별도 긴 boss melody는 만들지 않는다.
- 핵심 이미지는 “연필·책상·종소리가 통통 튀는 친구 구조대”다.

### Stage 2 제안

- 148 BPM, G Mixolydian/E Dorian/B minor heroic hybrid 색의 56~64초 loop.
- pulse bass ostinato가 복도 운동화 스텝 역할을 하고, dry tick이 레인 이동 박자를 돕는다.
- melody는 Stage 1보다 짧고 덜 노래처럼 만든다.
- E04 도입 이후를 고려해 60초 이후 loop 반복에서 tick density가 체감상 높아지도록 작곡한다. 단, 실제 런타임 layer가 없을 수도 있으므로 base loop 자체가 과밀하지 않아야 한다.
- 핵심 이미지는 “복도에서 친구들과 웃으며 뛰는 스포츠 아케이드 구조전”이다.

---

## 10. 사용자 승인 또는 후속 확인이 필요한 가정

1. **Stage 2 boss 표기:** 현행 `stageConfig.js`는 Stage 2 boss type을 `B02`로 둔다. 일부 오래된 문서는 Stage 2 보스 설명에 B01 표현이 남아 있으므로, 최종 음악 manifest에는 Stage 2 보스명을 `B02`로 표기해도 되는지 확인이 필요하다.
2. **boss 전환 방식:** 이번 계획은 180~240초를 boss/warning 구간으로 보고 gradual layer를 권장한다. 후속 구현에서 실제 boss 전용 loop를 만들지, 같은 stage loop의 후반 layer만 만들지는 사용자 선택이 필요하다.
3. **Stage 1/2 loop 길이:** Stage 1 64초, Stage 2 56~64초를 권장하지만, 제작 도구와 loop seam 실측에 따라 48초 또는 72초 후보가 더 좋을 수 있다.
4. **최종 포맷:** OGG/MP3/M4A 중 실제 Android WebView에서 loop gap이 가장 적은 포맷은 아직 실측하지 않았다.
5. **실시간 layer 여부:** 이 문서는 arrangement layer를 음악 설계 원칙으로만 제안한다. 런타임에서 동적 layer를 켤지 여부는 후속 구현 카드에서 결정해야 한다.

---

## 11. 사용자 결정 시트

### 추천안

- Stage 1: **교실 장난감 구조대 칩튠**
  - 140 BPM 전후, C major/A Dorian/D Mixolydian, 64초 loop, square lead + triangle bass + toy bell accent.
- Stage 2: **복도 스포츠 아케이드 런**
  - 148 BPM 전후, G Mixolydian/E Dorian/B minor heroic hybrid, 56~64초 loop, pulse bass + dry tick + filtered noise.

### 선택이 필요한 A/B 결정

1. **Boss 구간 처리**
   - A: 같은 stage loop 안에서 후반 밀도만 올라가게 만든다. 용량·구현이 단순하고 SFX 공간 관리가 쉽다.
   - B: 24~40초 boss 전용 짧은 loop/layer를 별도로 만든다. 장난꾸러기 클라이맥스 연출은 강하지만 파일·구현·QA가 늘어난다.

2. **Stage 1 교실 감성 강도**
   - A: toy bell과 밝은 장난감 색을 조금 더 살린다. 첫 모험 매력과 다정함이 좋다.
   - B: 책상 드럼라인과 8분 pulse를 더 살린다. 학교 물건 액션감과 신남이 강해진다.

3. **Stage 2 속도감 강도**
   - A: 144~148 BPM의 절제된 스포츠 pulse. 탄환 회피 가독성과 SFX 여백이 좋다.
   - B: 152 BPM 근처의 빠른 아케이드 런. 액션성은 좋지만 SFX 마스킹 위험이 커져 lead와 tick을 더 짧게 제한해야 한다.

4. **공통 정체성 강조점**
   - A: 다정/청춘을 더 앞세워 “친구 회복 구조대” 정서를 강화한다.
   - B: 유쾌/신남을 더 앞세워 “학교 소동 아케이드”의 속도감을 강화한다.

---

## 12. 이번 작업에서 읽은 파일

- `AGENTS.md`
- `project_develop_policy.md`
- `Developer/agent_room/subagent_system_wiring_2026-07-03.md`
- `Developer/agent_room/soundmini_free_game_audio_rnd_2026-07-04.md`
- `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
- 기존 대상 문서: `Planner/stage1_stage2_bgm_mood_plan_2026-08-06.md`

이전 작성 작업에서 이미 확인해 문서에 유지한 근거 파일:

- `Developer/r3f_prototype/src/lib/stageConfig.js`
- `Developer/r3f_prototype/src/lib/waveTimelines.js`
- `Developer/r3f_prototype/src/lib/stage2ProjectileRules.js`
- `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a` 정본 경로/bytes/SHA-256 기록

---

## 13. 작업 기록 및 검증 결과

### 작업 전 git status 요약

작업 전 `git status --short --branch` 결과, 기존 수정/미추적 파일이 다수 있었다. 이번 작업은 이를 보존하고, 요구된 Planner 산출물만 수정한다.

기존 변경 예시:

- 수정: `AGENTS.md`, `CLAUDE.md`, `project_develop_policy.md`, `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md`
- 수정: `Developer/r3f_prototype/database.rules.json`, `Developer/r3f_prototype/src/lib/upgrades.js`, `Developer/r3f_prototype/src/lib/weaponCatalog.js` 및 관련 테스트/컴포넌트 파일들
- 미추적: `Developer/agent_room/soundmini_better_minigame_bgm_research_and_implementation_plan_2026-08-05.md`, `Graphic_designer/stage1_class_president_dedicated_model_2026-08-06.md`, `marketing/google_playstore_image/` 등

### 이번 작업 생성/변경 파일

- 수정: `Planner/stage1_stage2_bgm_mood_plan_2026-08-06.md`

### 검증

실행 명령:

```bash
git status --short --branch
git diff --check -- Planner/stage1_stage2_bgm_mood_plan_2026-08-06.md
```

결과:

- `git status --short --branch` exit code `0`.
- 현재 브랜치: `zombie_only...origin/zombie_only [ahead 1]`.
- 대상 파일은 `?? Planner/stage1_stage2_bgm_mood_plan_2026-08-06.md`로 표시된다.
- 작업 전부터 존재하던 다른 수정/미추적 파일들은 그대로 남아 있으며, 이번 카드에서는 대상 Planner 문서만 의도적으로 수정했다.
- `git diff --check -- Planner/stage1_stage2_bgm_mood_plan_2026-08-06.md` exit code `0`, 출력 없음. 대상 파일의 whitespace error 없음.

금지 정서 텍스트 점검:

- 점검어: `공포`, `불안`, `공포감`, `불길`, `위협`, `추격`, `creepy`, `ominous`, `survival-horror`, `menace`, `dread`, `anxiety`, `oppressive threat`, `horror`.
- 점검 결과: 추천안/감정 약속/키워드/arc/후보 비교/파라미터/결정 시트에는 금지 정서 프레이밍이 남지 않았다.
- 전체 문서 hit는 5건이며 모두 금지·제거·검증 문맥이다.
  - line 45: `Stage 1·2의 공통 정체성은 “유쾌한 좀비 액션”이며, 공포 장르의 정서가 아니다.`
  - line 51: 금지되는 정서 목록 자체.
  - line 352: 점검어 목록 자체.
  - line 355: line 45 hit를 설명하는 검증 기록.
  - line 359: 금지 추격 프레이밍을 추천·키워드 문맥에서 제거했다는 검증 기록.
- Stage 2 추천·키워드 본문은 `슬랩스틱 술래잡기`, `스포티한 복도 액션`, `아케이드 momentum`, `팀워크 구조`로 표현한다.

Scope guard 확인:

- 코드, 오디오 파일, Firebase, 브라우저/localStorage, 빌드/AAB, 커밋/푸시 작업 없음.
- `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a` 및 재생 경로 변경 없음.
