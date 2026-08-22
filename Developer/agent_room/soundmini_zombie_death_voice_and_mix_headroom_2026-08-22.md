# 좀비 사망 발성 5종 + 오디오 믹스 헤드룸 / 보이스 예약

- 작성: Sound_Mini (soundmini)
- 날짜: 2026-08-22
- 워크트리: `D:/JungSil/2.Minigame_project/zombie_claude` (branch `claude-dev`, upstream `origin/zombie_only`)
- 커밋하지 않음. 작업 트리에만 남김.

작업 3건:
1. 좀비 사망 효과음 5종 신규 (원 요청)
2. 마스터 헤드룸 부재 (후속)
3. 동시 발음 캡을 쿨다운이 잠식하는 문제 (후속)

---

# 작업 1 — 좀비 사망 발성 5종

요청 원문: "좀비들에게 각각 다른 5가지의 죽을때 효과음", "가능한, 최대한 음성느낌",
"8비트 시절에 어떻게 그런걸 표현했는지 연구해"

## 1-1. 조사 — 8비트 하드웨어는 사람 목소리를 어떻게 흉내냈나

네 갈래가 있었고 비용과 표현력이 다르다.

### (A) 샘플 재생 — NES DPCM
NES APU 5번 채널은 DPCM(Delta PCM)이다. 샘플 절대값이 아니라 **직전 샘플과의 차이만
저장**해 카트리지 ROM을 아꼈다. 짧은 음성·타악기 원샷용이었다.

제약:
- 출력이 **7비트 카운터(0~127)** 라 다이내믹 레인지가 얕다
- **재생 레이트가 16단계 고정**이고 그마저 정확한 값이 아니다
- 채널이 피치를 못 바꾼다 → 한 샘플을 여러 음정으로 못 돌려쓴다
- ROM을 그대로 먹으므로 길이가 곧 돈이다

→ 이건 "음성을 어떻게 만드나"가 아니라 "녹음을 어떻게 욱여넣나"의 답이다. 저용량 절차
생성 방침과 안 맞는다. 다만 **열화 질감**(7비트 양자화, 낮은 고정 레이트)은 빌려왔다.

### (B) LPC 음성 합성 칩 — TI TMS5220 / TMS5100 계열
Speak & Spell, 아케이드(Star Wars, Gauntlet, Road Blasters), 핀볼에 들어갔다.
**PE-LPC(pitch-excited linear predictive coding)** 구조가 이번 작업의 핵심 참고다:

- **여기(excitation) 2종 택일**
  - 유성음: 성문 파형이 담긴 **excitation ROM의 "chirp"** 를 가변 주기로 루프 → 성대 역할
  - 무성음/마찰음: **LFSR 노이즈 발생기**로 교체
- 이 여기 신호를 **격자 필터(lattice filter)** 에 통과시켜 성도 공명을 만든다
- 파형이 아니라 필터 계수만 저장하니 데이터량이 극적으로 준다

→ **음성의 정체는 "성문 펄스 + 공명 필터"**. 가장 큰 수확.

### (C) 소프트웨어 포먼트 합성 — SAM (Software Automatic Mouth, C64/Apple II, 1982)
전용 칩 없이 순수 소프트웨어로 음성을 만들었다. 근사식이 노골적이다:

```
A = A1*sin(f1*t) + A2*sin(f2*t) + A3*rect(f3*t)
```

f1/f2/f3 = 세 **포먼트** 주파수, A1/A2/A3 = 각 진폭. 음소마다
`frequency1[] / frequency2[] / frequency3[] / amplitude1[] ...` 테이블을 두고
**음소 사이를 보간**해 말이 이어지게 했다.

→ **세 포먼트와 그 시간적 이동**만 있으면 모음이 들린다. 3개면 충분하다.

### (D) 1비트 PWM — ZX Spectrum 비퍼
스피커가 1비트뿐이라 펄스 폭 변조와 인터리빙으로 다채널·샘플 재생 착시를 만들었다.
어떤 격투 게임은 **시스템 ROM의 임의 영역을 그대로 스피커로 밀어** 비명을 냈다.
→ 표현력보다 "제약 우회 태도"의 사례. 직접 적용할 건 적다.

### (E) 부수 기법
- **포먼트 필터 = 좁은 대역통과 공명**. 주기적 펄스를 여러 공명에 통과시키면 모음이 된다.
  F1은 혀 높이와 반비례, F2는 혀의 전후 위치, F3는 원순성 구분에 쓰인다.
- 칩튠 보컬은 "스퀘어파 + 포먼트 필터"로 8비트 합창을 만든다 — 같은 파형 DNA라 믹스에 붙는다.
- SID 시절 **링 모듈레이션**은 괴물 목소리 질감의 상투 수단이었다.

### 채택 결론

**(B) 성문 펄스 + LFSR 노이즈 여기 × (C) 3포먼트 시간 보간** 을 뼈대로 삼았다.

1. 필요한 건 "말"이 아니라 **모음 색깔이 있는 신음**이다. 3포먼트면 충분하고
   음소 사전이나 텍스트 파싱이 전혀 필요 없다.
2. 파라미터가 전부 숫자 테이블이라 **좀비 타입별 변주가 값만 바꾸면 된다**.
3. 저장하는 건 결과 오디오 몇 KB뿐, **생성기는 Node 내장 기능만** 쓴다. 외부 음원 0건,
   라이선스 리스크 0.

SAM의 고정 사인 3개는 그대로 쓰지 않고 **2-pole 공명기 3개로 교체**했다. 사인 3개는 배음이
없어 지나치게 삐-소리가 난다. 성문 펄스(배음 풍부)를 공명기에 통과시키면 같은 포먼트
구조로 훨씬 목소리다운 소리가 난다. TMS5220의 격자 필터를 싸게 흉내낸 셈이다.

## 1-2. 구현

생성기: `Developer/r3f_prototype/scripts/generate_zombie_death_voices.mjs` (신규, 무의존)

```
성문 펄스열(Rosenberg 근사 → 미분)  ─┐
                                     ├─ 믹스 → 병렬 3포먼트 공명기(F1/F2/F3) →
15비트 LFSR 노이즈(무성음)          ─┘
   → 진폭 포락선 → 진동음/링모드 → tanh 드라이브
   → sample-and-hold 다운샘플 → 6~8비트 양자화        (8비트 열화)
   → 게이티드 라우드니스 정규화 + tanh 리미터 → WAV → ffmpeg → .ogg/.mp3
```

- **모음 테이블 8종** (`aa/aw/oh/oo/eu/uh/ee/ng`) — F1·F2·F3 + 각 대역폭 + 각 진폭.
  받침 'ㅇ'(`ng`)은 비음이라 대역폭을 넓게(200/200/260) 줘서 먹먹하게 만들었다.
- **키프레임 보간** — SAM의 음소 전이 테이블과 같은 방식. `{t, 모음, amp, voice, noise}`를
  시간축에 늘어놓고 선형 보간한다. 모음이 **움직여야** "으윽"으로 읽힌다.
- **자음** — `amp: 0` 구간(폐쇄) 뒤 `voice:0, noise:1` 버스트(파열). 받침 ㄱ/ㅋ이 이렇게 난다.
- **8비트 열화** — S&H 다운샘플(hold ×1~3) + 6~8비트 양자화. 없으면 너무 매끈해서 레트로 톤이 안 난다.
- **결정적 생성** — 난수를 전부 시드 고정(mulberry32 + LFSR). 재실행해도 바이트가 같다.
  기존 `generate_sfx.mjs`는 `Math.random`을 써서 전체 재생성 시 무관한 파일까지 바뀌는
  문제가 있었는데 그 함정을 피했다.

## 1-3. 5종 배분과 근거

배분 축은 **덩치와 속도**다. 화면 구석을 안 봐도 무엇이 죽었는지 알게 하려면
**기본 피치대가 겹치면 안 된다**. 다섯을 피치로 줄 세웠다.

| ID | 발성 | 담당 타입 | F0 (Hz) | 길이 | 비트/hold | 근거 |
|---|---|---|---|---|---|---|
| `zombieDeathGrunt` | "으윽" | E01, E07, RZG | 136→92 | 0.34s | 7bit / ×2 | 평범한 잡몹. 가장 자주 들리니 **짧고 건조하게** |
| `zombieDeathHeavy` | "우어억" | E02, E05, RZT | 92→56 | 0.60s | 6bit / ×3 | 뚱뚱이(1.40)·차저·트렌치코트(1.76). 5.2Hz 비브라토로 **축 늘어진 웨블** |
| `zombieDeathShriek` | "끼야악" | E03, RZL, RZC | 300→238 | 0.30s | 8bit / ×1 | 러너·런크루. 유일하게 **열화 최소**로 밝고 날카롭게 |
| `zombieDeathGurgle` | "커르륵" | E04 | 152→100 | 0.48s | 6bit / ×2 | 원거리 침 뱉는 놈. **26Hz 진동음** + 노이즈 비율 최고(0.45~0.55) |
| `zombieDeathBellow` | "끄아아앙" | E06 | 74→45 | 0.82s | 6bit / ×3 | 거대 좀비 **단독**. 최저 피치 + **31Hz 링모드** + 비음 받침 |

- **E06 단독인 이유**: 유일한 hp 320 / scale 1.60 준보스급이라 죽는 순간이 사건이다.
  나눠주면 "가장 큰 놈이 죽었다"는 신호가 희석된다. 테스트로 단독 점유를 고정했다.
- **E05(차저)를 bellow가 아닌 heavy로**: scale 1.15로 덩치가 중간이다. bellow는 체급
  신호이므로 아껴야 한다.
- **RZL(런크루 리더, speed 2.695)을 shriek로**: 덩치(1.08)보다 속도가 정체성이다.

모음 궤적도 서로 다르게 짰다 — `ㅡ→ㅓ→ㅜ` / `ㅜ→ㅓ→ㅏ` / `ㅣ→ㅏ` / `ㅓ→ㅡ→ㅜ` / `ㅡ→ㅏ→ㅇ`.
피치대만 갈라두면 같은 모음이라 "같은 놈의 높낮이"로 들린다.

## 1-4. 기존 2종 처리 — 대체(삭제)

`zombieDeath` / `zombieHeavyDeath`는 **폐기**했다. 노이즈+톱니 버스트라 "음성"이 전혀
아니었고, 5종이 이들의 담당 범위(E02/E06 = heavy, 나머지 = 일반)를 완전히 덮는다.
남겨두면 어느 쪽을 써야 하는지 모호해진다. 호출 지점이 2곳뿐이라 정리 비용도 없었다.

- `SOUND_MAP` / `POLYPHONY_COOLDOWN`에서 제거
- 자산 4개 삭제
- `generate_sfx.mjs`의 생성 항목 제거 (자산 없는 유령 규칙 방지)
- 프로비넌스 매니페스트 항목 제거

## 1-5. 디스패치 일원화

`src/lib/enemyDeathSfx.js` (신규)를 정본으로 두 호출 지점을 합류시켰다.

- 이전: `Enemy.jsx`의 로컬 `deathSfxId()` **와** `Enemies.jsx:1321`의 인라인 삼항식이
  같은 규칙을 **따로** 들고 있었다. 풀링 렌더 경로와 개별 렌더 경로가 서로 다른 소리를
  내는 사고가 나기 딱 좋은 구조였다.
- 이후: 양쪽 모두 `deathSfxId(type, isMatilda)` 하나를 부른다.
  우선순위: 마틸다 > 보스 > 좀비 타입별 발성 > 기본 grunt 폴백.

## 1-6. 자산

`Developer/r3f_prototype/public/sfx/enemies/` — 10개 (5 ID × ogg/mp3)

| ID | .ogg | .mp3 |
|---|---|---|
| zombieDeathGrunt | 5,339 B | 3,596 B |
| zombieDeathHeavy | 6,719 B | 5,477 B |
| zombieDeathShriek | 4,883 B | 3,178 B |
| zombieDeathGurgle | 6,118 B | 4,641 B |
| zombieDeathBellow | 7,691 B | 7,358 B |

합계 55,000 B. 삭제한 구 자산 4개(약 25KB)를 빼면 순증 30KB.
포맷: mono 22,050Hz / OGG Vorbis `-q:a 2` / MP3 64kbps. 22.05kHz인 이유는 음성이
8kHz 위에 정보가 거의 없어서다.

**라이선스**: 전량 본 프로젝트 절차 합성. 외부 음원 0건, 실제 인물 녹음 0건,
기존 게임 음원 복제 0건. 8비트 기법은 **방법론 참조**로만 썼다.
프로비넌스 매니페스트에 `project-generated-procedural`로 등록했다.

## 1-7. 작업 1 검증 — 실제로 돌린 것

```
$ npx vitest run --maxWorkers=1 --no-file-parallelism \
    src/lib/sfxRegistry.test.js src/components/SfxLayer.test.jsx \
    src/components/PickupAndDogeSfx.test.jsx src/lib/enemyDeathSfx.test.js \
    src/lib/audioDiagnostics.test.js src/components/Enemies.test.jsx \
    src/lib/burstEvents.test.js src/lib/enemySimulation.parity.test.js
Test Files  8 passed (8)
     Tests  208 passed (208)
```

신규 `src/lib/enemyDeathSfx.test.js` 9건 전부 통과:
1. 5개 ID가 `SOUND_MAP`에 등록되고 ogg/mp3 양쪽 자산이 1KB 초과로 존재
2. 각 발성의 쿨다운이 한 프레임보다 길고 **자기 음원 길이보다 짧다**
3. 폐기한 2종이 `SOUND_MAP`과 쿨다운 맵에서 실제로 사라졌다
4. 타입별 디스패치가 설계대로 갈린다 (11개 타입 개별 검증)
5. 로스터가 실제로 **5갈래로 쪼개진다** (한 개로 뭉개지는 회귀 차단)
6. 마틸다/보스가 좀비 발성보다 우선한다
7. 미매핑 타입은 grunt로 폴백한다
8. `ENEMY_STATS`의 **모든 비보스 타입이 매핑돼 있다** — 새 좀비가 조용히 기본값으로
   새는 걸 막는다 (regex가 E01~E07/RZL/RZC/RZT/RZG/B01~B04 15종을 실제로 잡는 걸 확인)
9. **두 호출 지점 모두 공용 디스패치를 쓴다** — 삼항식 하드코딩 재발 차단

```
$ node scripts/verify-audio-manifest.mjs
audio manifest verified: 85 SFX IDs, 170 fallback files, canonical title BGM
```

### 음향 검증 — 파형/스펙트럼 분석 (귀로 듣지 않았음)

**나는 이 소리를 실제로 들어보지 못했다.** 생성된 .ogg/.mp3를 디코드해 수치로만 확인했다.
사람 귀 판정은 Terry의 실플레이가 필요하다.

**포먼트 존재 확인 — LPC 극점 추적** (order 12, pre-emphasis 0.97, 20%/45%/70% 지점):

| 소리 | 20% | 45% | 70% | 해석 |
|---|---|---|---|---|
| Grunt | F0 130 / F 1422,2905 | F0 121 / 796,2347 | F0 110 / 570,2450 | F2 1422→796→570 = ㅡ→ㅓ→ㅜ |
| Heavy | F0 81 / 560,2496 | F0 75 / 769,2584 | F0 69 / 772,2523 | ㅜ→ㅓ→ㅏ |
| Shriek | F0 362 / 2053,3055 | F0 329 / 739,2257 | F0 294 / 921,2840 | F2 2053(ㅣ)→2840, F1 등장 = ㅣ→ㅏ |
| Gurgle | — | F0 133 / 1283,2368 | F0 117 / 1039,2552 | ㅓ→ㅡ→ㅜ |
| Bellow | F0 65 / 949,2649 | F0 57 / 957,2719 | F0 55 / 841,2604 | ㅏ 지속 후 하강 |

→ **포먼트가 실재하고 시간에 따라 이동한다**. 노이즈 버스트라면 나올 수 없는 결과다.
F0도 다섯이 45~362Hz 구간에 겹치지 않게 배치된 게 실측으로 확인된다.

**자음(폐쇄+파열) 확인 — 10ms 프레임 진폭 포락선** (`#`>0.66 `+`>0.33 `.`>0.06 `_`무음):

```
Grunt   +####################++++...__.+#.      <- __ 폐쇄 후 +# 파열 = 받침 ㄱ
Heavy   .++####+##+####+##+####+####+######+#++++++++++...____.+##+.
Shriek  ++###++++#############++++.____          <- 급격히 끊김
Gurgle  +#######+++##++##+##++##++##++##++++.++...__.++.  <- 26Hz 진동음이 보인다
Bellow  +####+#+++#++++++#++#++#++#++#+++#+++++#+++++++.++++++.++.++.+++.+........._____
```

**이 과정에서 잡은 결함 3건 (전부 실측으로 발견)**

1. **음량 역전.** 처음엔 피크 정규화를 썼는데 bellow RMS 0.17 vs shriek 0.52로 **약 10dB**
   벌어졌다. 거대 좀비가 러너보다 작게 죽는 역전이었다. 단순 전체 RMS로 바꿔도 bellow는
   꼬리가 길어 조용한 구간이 평균을 끌어내렸다. → **게이티드 라우드니스**(10ms 프레임 중
   큰 쪽 40%만, EBU R128 방식) + tanh 리미터로 해결.
2. **클리핑.** 리미터 상한 0.95/0.90에서 **bellow의 ogg 디코드가 4샘플 -32768로 포화**했다.
   손실 압축 디코드 오버슈트다. → 상한 0.85로 낮춰 두 포맷 모두 클리핑 0 확인.
3. **라이브러리 대비 과다 음량.** 처음 뽑은 5종의 게이티드 라우드니스가 0.361~0.402로,
   **전 음원 87개 중 최상위권**이었다. 이들이 대체하는 구 자산은 zombieDeath 0.200 /
   zombieHeavyDeath 0.229 였고 라이브러리 중앙값은 0.190이다. 즉 사망음이 갑자기 +5dB
   커져 난전에서 믹스를 잡아먹을 참이었다. → 구 자산 실측치에 맞춰 재튜닝.

**최종 음량 (재튜닝 후, 실측)**

| ID | gated (ogg) | peak (ogg) | 클리핑 |
|---|---|---|---|
| zombieDeathGrunt | 0.200 | 0.472 | 0 |
| zombieDeathHeavy | 0.211 | 0.544 | 0 |
| zombieDeathShriek | 0.177 | 0.291 | 0 |
| zombieDeathGurgle | 0.200 | 0.547 | 0 |
| zombieDeathBellow | 0.230 | 0.833 | 0 |

(구 zombieDeath 0.200 / zombieHeavyDeath 0.229와 정렬. 등청감 보정으로 고음 shriek은
낮게, 저음 bellow는 높게 유지.)

---

# 작업 2 — 마스터 헤드룸이 없다

## 2-1. 확인한 사실

```
$ grep -rn "Howler\." src/
(결과 없음)
```

`Howler.volume()`을 **어디서도 호출하지 않았다.** 마스터 게인이 기본값 1.0이었다.
`setSfxVolume()`이 export돼 있었지만 **호출처가 0곳**이었고, 그나마도 캐시된 Howl
인스턴스의 볼륨을 덮어써서 **스튜디오 ID별 튜닝을 파괴하는 함정**이었다.

`src/components/Weapons/Bell.jsx:207` 주석이 이 문제를 이미 알고 있었다:
> "마스터 리미터가 없어서(setSfxVolume은 미호출) 이 합을 여기서 눌러야 한다"

즉 개별 호출부가 임시방편으로 볼륨을 깎아 버티는 중이었다.

## 2-2. 실측 — 우리 에셋의 실제 피크

전 자산 87개(ogg 85 + wav 2)를 44.1kHz mono로 디코드해 측정:

```
assets measured: 87
peak      : min 0.087  median 0.579  mean 0.650  max 1.000
  >=0.99 (풀스케일): 18 files
  >=0.95            : 23 files
  >=0.90            : 26 files
gated loud: min 0.018  median 0.190  mean 0.206  max 0.472
```

**87개 중 18개가 피크 1.000, 26개가 0.90 이상.** 두 개만 겹쳐도 합이 1.0을 넘는다.

## 2-3. 값 결정 — 몬테카를로

기록에 있던 권고치 0.8을 그대로 받아쓰지 않고 시뮬레이션했다.
전투 중 실제로 겹치는 66종(weapons/ + enemies/ + 픽업)을 풀로 삼아,
**300ms 창 안에 N개를 임의 시점에 재생해 합산 피크를 측정, 각 N마다 2000회**:

```
  N  median     p90     p99     max
  2   0.833   1.168   1.488   1.997
  3   1.000   1.371   1.746   2.042
  4   1.142   1.521   1.822   2.551
  5   1.264   1.654   1.986   2.439
  6   1.383   1.773   2.188   2.875
  8   1.590   1.990   2.397   2.856
```

마스터 게인별 클리핑(합 > 1.0) 발생률:

| gain | N=2 | N=3 | N=4 | N=5 | N=6 | N=8 |
|---|---|---|---|---|---|---|
| 1.00 (현재) | 24.3% | 48.5% | 69.0% | 83.5% | 91.3% | 98.5% |
| 0.90 | 13.8% | 33.9% | 54.6% | 71.8% | 82.5% | 95.5% |
| **0.80 (문서 권고치)** | 6.0% | 18.3% | 36.4% | 51.9% | **67.0%** | 87.5% |
| 0.70 | 1.7% | 7.4% | 16.4% | 29.2% | 44.1% | 70.7% |
| 0.60 | 0.1% | 1.8% | 4.2% | 9.3% | 17.5% | 40.3% |
| **0.50 (채택)** | 0.0% | 0.1% | **0.3%** | 0.9% | **2.7%** | 9.6% |
| 0.45 | 0.0% | 0.0% | 0.1% | 0.1% | 0.8% | 3.2% |
| 0.40 | 0.0% | 0.0% | 0.1% | 0.0% | 0.2% | 0.6% |

**결론: `SFX_MASTER_VOLUME = 0.5` (-6dB).**

- **0.8은 부족하다.** 캡이 찬 N=6에서 67% 확률로 클리핑한다. 권고치를 그대로 썼다면
  문제가 거의 그대로 남았을 것이다.
- **0.5는** 실제로 흔한 2~4중첩에서 클리핑을 사실상 없애고(≤0.3%), 캡(6)이 꽉 찬
  최악에서도 2.7%로 억제한다. 게임 SFX 버스에서 -6dB는 통상 범위다.
- **0.4는** 더 안전하지만 -8dB라 게임이 다른 앱 대비 눈에 띄게 작아진다. 클리핑은
  되돌릴 수 없지만 음량은 기기 볼륨으로 보정 가능하다 — 그래도 -8dB는 과하다고 봤다.
- 시뮬레이션은 **모든 emit이 volume=1.0**이라고 가정했다. 실제로는 `bellFire`처럼 0.55로
  낮춰 부르는 호출부가 있으므로 이 추정은 **보수적(최악)** 이다.

## 2-4. 스튜디오 볼륨 경로와의 관계 (이중 적용 없음)

두 층은 서로 다르다:
- **스튜디오 튜닝**(`sfxTunings`): ID별 volume/rate. `playSfx` 안에서
  `tunedVolume = clamp(volume * tuning.volume, 0, 1)`로 **Howl 인스턴스에** 적용된다.
- **마스터**(`Howler.volume`): 그 위의 **전역** 게인.

곱해질 뿐 같은 값이 두 번 적용되지 않는다. 스튜디오에서 특정 사운드를 키우면 그 사운드만
커지고, 마스터는 전체를 함께 내린다 — 의도한 계층이다.

**`setSfxVolume()`은 삭제했다.** 호출처가 0곳이었고, 캐시된 각 Howl의 볼륨을 덮어써서
스튜디오 ID별 튜닝을 조용히 파괴하는 함정이었다. 마스터는 `applySfxMasterVolume()`이 맡는다.

## 2-5. 배선

- `sfxRegistry.js`: `SFX_MASTER_VOLUME = 0.5`, `applySfxMasterVolume(volume?)` 추가.
  `Howler`를 import하고 0~1로 클램프한다.
- `SfxLayer.jsx`: 마운트 시 `useEffect(() => { applySfxMasterVolume() }, [])`.
  SfxLayer는 앱당 한 번 마운트되는 SFX 부트스트랩 지점이라 여기가 자연스럽다.

---

# 작업 3 — 동시 발음 캡을 쿨다운이 잠식한다

## 3-1. 현재 구조 (옛 수치를 믿지 않고 코드에서 다시 확인)

동시 발음 제한은 **Howler 기본 풀이 아니라 우리가 만든 것**이다. `sfxRegistry.js`:

- `COMBAT_VOICE_CAP = 6`
- `SFX_VOICE_CLASS`: `PROTECTED_DANGER_SFX` 10종이거나 경로가 `/weapons/`·`/enemies/`가
  **아니면** `protected`. 즉 ui/·events/·player/ 는 전부 protected(캡 면제)이고,
  weapons/·enemies/ 는 위 10종을 뺀 나머지가 `combat`.
- `playSfx`에서 `!protected && _activeCombatVoices.size >= CAP` 이면 **조용히 버린다**.
- 보이스는 `onend`/`onstop`/`onplayerror`에서 반납된다 = **음원이 끝날 때까지 슬롯을 잡는다**.

**사망 발성 5종은 `/enemies/` 경로이고 PROTECTED 목록에 없다 → 전부 `combat` 클래스다.**
런타임에서 직접 확인했다:

```
zombieDeathGrunt : combat    bossDeath   : protected
zombieDeathHeavy : combat    matildaDeath: protected
zombieDeathShriek: combat
zombieDeathGurgle: combat
zombieDeathBellow: combat
```

보스/마틸다 사망은 보호받는데 **좀비 사망은 안 받는다.** 즉 방금 만든 5종이 난전에서
밀려 안 들릴 수 있다 — 작업 1을 통째로 무의미하게 만드는 위험이다.

## 3-2. 실측 — 타격음이 캡을 얼마나 먹나

슬롯 점유량 = **음원 길이 / 쿨다운** (쿨다운이 최대 발화율을 정하고, 보이스는 음원이
끝날 때까지 슬롯을 잡으므로 이 비율이 정상 상태 점유 슬롯 수다).

타격/틱 사운드 실측(음원 길이는 디코드해서 잰 값):

| sound | dur | cooldown | 최대 점유 slots | 캡(6) 대비 |
|---|---|---|---|---|
| starlinkHit | 0.420s | 90ms | 4.67 | 78% |
| stunGunHit | 0.302s | 55ms | 3.48 | 58% |
| sharkHit | 0.414s | 180ms | 2.30 | 38% |
| tumblerHit | 0.205s | 90ms | 2.28 | 38% |
| **타격/틱 17종 합계** | | | **43.9** | **732%** |

- **상위 2종(starlinkHit + stunGunHit)만으로 8.15 slots ≥ 캡 6.** 무기 두 개가
  붙으면 사망 발성이 들어갈 자리가 남지 않는다.
- 이전 세션 기록의 "tumblerHit 90ms 게이트가 캡의 38%를 먹는다"는 **현재 코드에서도
  그대로 성립**한다(2.28/6 = 38%). 다만 tumblerHit는 최악이 아니었다 — starlinkHit가
  78%로 두 배 이상이다.

사망 발성 자신의 최대 점유:

| ID | dur | cooldown | 최대 slots |
|---|---|---|---|
| zombieDeathHeavy | 0.604s | 70ms | 8.62 |
| zombieDeathShriek | 0.319s | 45ms | 7.09 |
| zombieDeathGrunt | 0.348s | 50ms | 6.97 |
| zombieDeathGurgle | 0.488s | 90ms | 5.42 |
| zombieDeathBellow | 0.842s | 200ms | 4.21 |

합계 32.3 slots. **이 때문에 "사망 발성을 protected로 승격"은 택하지 않았다** —
캡을 완전히 면제받으면 최악에서 30개 넘게 동시 재생될 수 있다. 모바일 CPU와 클리핑
양쪽으로 나쁘다.

## 3-3. 선택한 해법 — 총량 유지 + 예약 슬롯

**캡을 올리지 않았다.** 동시 재생 보이스는 모바일 CPU 비용이고, 작업 2에서 본 대로
동시 발음이 늘수록 클리핑 확률이 급등한다(N=6에서 2.7% → N=8에서 9.6%). 총량을
늘리면 방금 확보한 헤드룸을 도로 까먹는다.

대신 **총량은 6 그대로 두고 예약분만 뒀다**:

```js
export const DEATH_VOICE_RESERVED_SLOTS = 2

export function combatVoiceCapFor(id) {
  return isDeathVoiceSfx(id) ? COMBAT_VOICE_CAP : COMBAT_VOICE_CAP - DEATH_VOICE_RESERVED_SLOTS
}
```

- 사망 발성이 **아닌** combat 사운드(타격음 등)는 **최대 4슬롯**까지만 쓴다.
- 사망 발성은 **최대 6슬롯**(= 예약 2 + 공용 4)까지 쓸 수 있다.
- 총 동시 재생은 **여전히 6** — 모바일 CPU 비용 증가 0, 클리핑 확률 증가 0.

근거: 타격음은 이미 쿨다운으로 촘촘히 게이팅돼 있고, 4개가 겹쳐 울리는 상황에서
5번째 동일 계열 타격음은 **어차피 들리지 않는다**(마스킹). 반면 사망 발성은
"내가 뭘 죽였는가"라는 별개 정보라 하나만 빠져도 피드백이 사라진다.
버릴 것을 고르라면 5번째 타격음이 맞다.

사망 발성 ID 목록은 `enemyDeathSfx.js`의 `ZOMBIE_DEATH_SFX_IDS`를 그대로 가져온다
(정본 1개 유지, 순환 import 없음 — `enemyDeathSfx`는 `burstEvents`만 의존한다).

## 3-4. 작업 2·3 검증 — 실제로 돌린 것

```
$ npx vitest run --maxWorkers=1 --no-file-parallelism src/lib/sfxRegistry.test.js
Test Files  1 passed (1)
     Tests  27 passed (27)
```

추가한 테스트 3건:
1. **`holds the master bus below full scale`** — `SFX_MASTER_VOLUME === 0.5`이고
   `applySfxMasterVolume()`이 `Howler.volume(0.5)`를 부른다. **값이 지워지면 실패한다.**
2. **`clamps an explicit master volume into range`** — 2.5→1, -1→0, NaN→기본값.
3. **`reserves voice slots so weapon hits cannot starve the death voices`** —
   무기음으로 실효 캡(4)을 채운 뒤 추가 무기음은 막히지만 사망 발성 2개는 들어가고,
   3번째 사망 발성은 전체 캡(6)에서 막힌다.

`SfxLayer.test.jsx`에 1건 추가:
4. **`applies the master headroom once on mount`** — 마운트 시 마스터가 정확히 1회 적용된다.

기존 캡 테스트 3건은 `COMBAT_VOICE_CAP` 대신 `combatVoiceCapFor('pencilFire')`를 쓰도록
갱신했다(예약분 반영). 그 과정에서 하드코딩된 soundId `7`을
`howlPlay.mock.results.at(-1).value`로 바꿨다 — 상수로 박아두면 캡이 바뀔 때 엉뚱한
보이스를 반납하고 테스트가 조용히 무의미해진다.

`audioDiagnostics.js`의 tripwire 상수도 갱신했다: SFX 84→87, 전체 85→88
(사망 발성 5종 추가, 구 2종 폐기 = 순증 3). 이건 의도적 수동 갱신용 상수다.

## 3-5. 작업 2·3에서 확인하지 못한 것

- **실제 청감.** 마스터 0.5가 체감상 적절한 음량인지 귀로 확인하지 않았다.
  클리핑 제거는 수치로 확인했지만 "충분히 크게 들리는가"는 실플레이 판정이 필요하다.
- **인게임 실측.** dev 서버를 띄워 난전에서 사망 발성이 실제로 들리는지 확인하지 않았다.
  예약 슬롯 로직은 단위 테스트로만 검증했다.
- **모바일 CPU 실측.** 총 보이스 수를 늘리지 않았으므로 비용 증가는 없다고 보지만,
  실기 프로파일링은 하지 않았다.
- **몬테카를로의 한계.** 300ms 창 안 균등 분포 시작이라는 단순 모델이다. 실제 게임의
  사운드 발생 타이밍 분포(무기 쿨다운 주기성, 웨이브 밀도)는 반영하지 않았다.
  또 발사음(`*Fire`)에는 폴리포니 쿨다운이 없어 슬롯 점유 계산에서 제외했다 —
  실제 발화율은 무기 자체 쿨다운(예: 2200ms)이 정하므로 별도 조사가 필요하다.

---

# 기존 결함 (내 작업과 무관, 손대지 않음)

전체 스위트를 돌렸다:
```
Test Files  15 failed | 212 passed (227)
     Tests  34 failed | 2046 passed | 20 skipped (2100)
```

이 중 **`audioDiagnostics.test.js` 3건만 내 변경 때문**이었고(사운드 ID 순증 3),
tripwire 상수를 갱신해 해결했다. 나머지 14개 파일은 오디오와 무관한 선행 실패다:

- `CriticalScreenShakeWiring.test.js` — `git show HEAD:...Enemies.jsx`로 대조해
  **커밋된 HEAD에서 이미 실패함을 확인**. 테스트는
  `import { emitEnemyHitScreenShake } from '.../criticalScreenShake.js'`를 기대하는데
  실제 import는 심볼이 두 개(`emitCriticalHitScreenShake, emitEnemyHitScreenShake`)다.
- `ZombieMesh.test.js` — RZT hp를 28로 기대하는데 실제 `ENEMY_STATS`는 140. 스탯 드리프트.
- `StudioTunedGroup` / `GraphicsStudioPreview` / `ProceduralFaceTestZombie` /
  `StagePropPlacementEditor` / `stageObjectAssets` / `stageObjectPlacements` /
  `TitleScreen.settings` — 스튜디오·프롭·타이틀 계열
- `consent` / `firebaseProgress` / `firebaseInspectionMode` — Firebase 계열

작업 시작 시 이 워크트리는 `git status` 클린이었고, 내가 만진 파일은 오디오 관련과
Enemy/Enemies의 import 2줄뿐이다. 위 실패들과 겹치는 지점이 없다.

---

# 재현 절차

```bash
cd D:/JungSil/2.Minigame_project/zombie_claude/Developer/r3f_prototype

# 사망 발성 5종 재생성 (시드 고정 -> 바이트 동일하게 재현됨)
FFMPEG_BINARY="/c/Program Files (x86)/kdisk.co.kr/ffmpeg.exe" \
  node scripts/generate_zombie_death_voices.mjs

# 하나만 재생성
FFMPEG_BINARY=... node scripts/generate_zombie_death_voices.mjs Bellow

# 검증
npx vitest run --maxWorkers=1 --no-file-parallelism \
  src/lib/sfxRegistry.test.js src/components/SfxLayer.test.jsx \
  src/components/PickupAndDogeSfx.test.jsx src/lib/enemyDeathSfx.test.js \
  src/lib/audioDiagnostics.test.js
node scripts/verify-audio-manifest.mjs
```

- ffmpeg가 PATH에 없다. 이 머신에는 `C:\Program Files (x86)\kdisk.co.kr\ffmpeg.exe`
  (2.5.2, libvorbis + libmp3lame 포함)가 있어 `FFMPEG_BINARY`로 지정해 썼다.
- 소리를 바꾸면 **바이트가 바뀌므로 프로비넌스 매니페스트의 bytes/sha256도 갱신**해야 한다.
  `verify-audio-manifest.mjs`가 불일치를 잡는다.

# 변경 파일

**신규**
- `Developer/r3f_prototype/scripts/generate_zombie_death_voices.mjs`
- `Developer/r3f_prototype/src/lib/enemyDeathSfx.js`
- `Developer/r3f_prototype/src/lib/enemyDeathSfx.test.js`
- `public/sfx/enemies/zombieDeath{Grunt,Heavy,Shriek,Gurgle,Bellow}.{ogg,mp3}` (10개)

**수정**
- `src/lib/sfxRegistry.js` — 5 ID 등록 + 쿨다운, 구 2종 제거, `SFX_MASTER_VOLUME`/
  `applySfxMasterVolume`/`DEATH_VOICE_RESERVED_SLOTS`/`combatVoiceCapFor` 추가,
  `setSfxVolume` 삭제
- `src/lib/sfxRegistry.test.js` — 캡 테스트 예약분 반영, 마스터/예약 테스트 3건 추가
- `src/components/SfxLayer.jsx` — 마운트 시 마스터 헤드룸 적용
- `src/components/SfxLayer.test.jsx` — 목 갱신 + 마스터 적용 테스트 1건 추가
- `src/components/Enemy.jsx` — 로컬 `deathSfxId` 제거, 공용 import
- `src/components/Enemies.jsx` — 삼항식 하드코딩 -> 공용 디스패치
- `src/lib/audioDiagnostics.js` — tripwire 상수 84/85 -> 87/88
- `scripts/generate_sfx.mjs` — 구 좀비 사망음 항목 제거
- `Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json` — 구 2종 제거, 신규 5종 등록

**삭제**
- `public/sfx/enemies/zombieDeath.{ogg,mp3}`, `zombieHeavyDeath.{ogg,mp3}`

> 줄바꿈 주의: `sfxRegistry.js` / `sfxRegistry.test.js` / `SfxLayer.jsx` /
> `SfxLayer.test.jsx` / `audioDiagnostics.js` / `generate_sfx.mjs` / 매니페스트 JSON은
> **작업 트리가 CRLF**다(git index는 LF, `text=auto eol=lf`로 정규화됨).
> 기존 관례를 보존해 편집했다 — 전체 줄바꿈 변환은 하지 않았고 diff에 공백 잡음이 없다.
> 신규 파일은 전부 LF다.

# 참고 자료

- NES DPCM 채널 제약 — https://forums.nesdev.org/viewtopic.php?t=5613 , https://soundcy.com/article/how-are-nes-sounds-made
- TMS5220 PE-LPC (chirp ROM + LFSR 여기, 격자 필터) — https://www.vgmpf.com/Wiki/index.php?title=TMS5220 , http://www.avoidspikes.com/dsplib/chips/tms5220.html , https://en.wikipedia.org/wiki/Texas_Instruments_LPC_Speech_Chips
- SAM 3포먼트 근사식 — https://github.com/s-macke/SAM , https://en.wikipedia.org/wiki/Software_Automatic_Mouth
- 포먼트 필터/모음 합성 — https://cim.mcgill.ca/~clark/nordmodularbook/nm_speech.html , https://www.soundbridge.io/formants-vowel-sounds
- 모음 포먼트 수치 — https://corpus.eduhk.hk/english_pronunciation/index.php/2-2-formants-of-vowels/ , https://sail.usc.edu/~lgoldste/General_Phonetics/Source_Filter/SFc.html
- ZX Spectrum 1비트 PWM 음성 — https://irrlichtproject.de/2015/09/20/7d7e/ , https://www.gamejournal.it/the-sound-of-1-bit-technical-constraint-as-a-driver-for-musical-creativity-on-the-48k-sinclair-zx-spectrum/
