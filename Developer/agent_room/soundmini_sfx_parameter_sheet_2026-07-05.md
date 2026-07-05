# Sound_Mini SFX Parameter Sheet — Atari급 기계음 표현 확장

작성: 2026-07-05 11:43 KST  
담당: `soundmini` / Sound_Mini  
프로젝트: Escape! zombie school  
범위: 현재 `SOUND_MAP` ID 기반 초저용량 procedural/asset parameter sheet

## 0. 읽은 기준 파일

- `AGENTS.md`
- `project_develop_policy.md`
- `Developer/agent_room/subagent_system_wiring_2026-07-03.md`
- `Developer/agent_room/soundmini_free_game_audio_rnd_2026-07-04.md`
- `Developer/agent_room/soundmini_atari_grade_machine_sfx_training_2026-07-05.md`
- `Developer/r3f_prototype/src/lib/sfxRegistry.js`
- `Developer/r3f_prototype/public/sfx/**`

## 1. 현재 런타임/인벤토리 기준

- Runtime: `Howler` lazy `Howl` 생성.
- Source path: `SOUND_MAP`은 OGG 경로를 가리키고, 런타임에서 `.ogg`를 `.mp3`로 바꿔 MP3 fallback을 같이 등록한다.
- Failure: `onloaderror` 시 `_failed`에 등록하고 이후 무음 skip. 게임/로그인 흐름을 막지 않는 좋은 방향이다.
- Auth overlay: `authOverlayActive` 중에는 `buttonClick`만 허용.
- 현재 cooldown: `zombieDeath=50ms`, `zombieHeavyDeath=50ms`, `playerHit=80ms`, `coinCollect=40ms`.
- 현재 public/sfx 관측: 총 124 files = 62 OGG + 62 MP3 pair.
- Terry 기준: “Claude Code/OpenAI Codex식 거의 Atari급 기본 기계음”을 더 큰 녹음 파일로 덮기보다, 같은 극저용량 제약 안에서 pitch/rate/envelope/filter/noise/layer/cooldown variation으로 표현 폭을 최대화한다.

## 2. 공통 parameter 원칙

- Primitive-first: oscillator, noise, filter, short envelope, 1–2 layer까지만 기본으로 본다.
- 반복 이벤트는 새 파일보다 `rate`/pitch ±3–12% micro variation을 먼저 적용한다.
- 의미 차이가 큰 변형은 0.6–1.4x rate, filter sweep, envelope 길이로 만든다.
- Spam SFX는 1 voice 또는 very short decay, 중요한 이벤트는 2 voice까지만 허용한다.
- Priority: `boss/player danger > level/result/portal > weapon hit/fire > pickup/enemy spam > UI decoration`.
- QA는 “소리가 멋진가”보다 “눈을 떼지 않고 사건을 읽을 수 있는가, 몰려도 피로하지 않은가, 무음 실패해도 게임이 망가지지 않는가”를 본다.

## 3. SOUND_MAP ID별 parameter sheet

| ID | 이벤트 의미 | Primitive recipe | Pitch/rate variation | Envelope/filter/noise/layer variation | Cooldown / priority | Fallback asset path | QA note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `buttonClick` | UI 클릭/인증 화면 허용 확인음 | 1 square/pulse click, 1.5–3kHz, 25–45ms | rate 0.96–1.04 | 즉시 attack, 매우 짧은 decay, high-pass로 저역 제거 | cooldown 20–40ms 제안 / UI low, auth-safe | `/sfx/ui/buttonClick.ogg` + `.mp3` | 로그인 화면에서 유일하게 허용되는 SFX. 너무 밝거나 길면 인증 실패음처럼 들리지 않게 한다. |
| `coinCollect` | 코인/획득 피드백 | sine/triangle 2-note up blip | rate 0.95–1.10, 연속 획득 시 pitch step 0/+2/+4 semitone | 45–90ms, soft attack, no noise | 현재 40ms / pickup mid-low | `/sfx/ui/coinCollect.ogg` + `.mp3` | 떼획득 시 귀 피로가 가장 쉬우므로 겹침 1–2개 제한. |
| `levelUp` | 성장/레벨업 | 3-note rising arpeggio, triangle + faint pulse | rate 0.9–1.05 | 250–500ms, 약한 delay 느낌은 20ms 보조 tone으로 대체 | cooldown 300ms 제안 / result high | `/sfx/ui/levelUp.ogg` + `.mp3` | 전투 중에도 reward로 읽혀야 하며 boss warning보다 앞서면 안 됨. |
| `stageClear` | 스테이지 클리어 | 짧은 4–5 note jingle, square/triangle mix | 고정 pitch 중심, rate 0.98–1.02만 | 1–2초 이내, low-pass 없이 선명하게 | cooldown 1000ms 제안 / result high | `/sfx/ui/stageClear.ogg` + `.mp3` | BGM/전투음 위에서도 결과음으로 읽혀야 한다. |
| `gameOver` | 실패/게임오버 | descending 3-note tone + low pulse | rate 0.95–1.00 | decay 600–1200ms, low-pass로 무거움 | cooldown 1000ms 제안 / result high | `/sfx/ui/gameOver.ogg` + `.mp3` | 공포감은 주되 너무 긴 드론으로 재시작 UX를 방해하지 않는다. |
| `pencilFire` | 연필 발사 | short pulse zip, 800–1800Hz sweep | rate 0.94–1.08 | 35–70ms, no noise 또는 아주 작은 click layer | cooldown 30–50ms 제안 / weapon mid | `/sfx/weapons/pencilFire.ogg` + `.mp3` | 기본 투사체라 반복성이 높다. micro pitch random이 필수. |
| `pencilHit` | 연필 타격 | wood/plastic tick: pulse click + tiny noise | rate 0.92–1.12 | 20–50ms, high-pass noise 5–15ms | cooldown 25–50ms 제안 / weapon spam | `/sfx/weapons/pencilHit.ogg` + `.mp3` | 다수 히트 때 “딱딱딱”으로 읽히되 white-noise 벽이 되면 안 됨. |
| `rulerFire` | 자/탄성 발사 | springy square blip, slight downward snap | rate 0.88–1.12 | 60–100ms, pitch bend down, click layer optional | cooldown 40–60ms 제안 / weapon mid | `/sfx/weapons/rulerFire.ogg` + `.mp3` | 연필보다 탄성 있는 학교 도구 느낌. |
| `rulerHit` | 자 타격 | slap tick: noise burst + pulse body | rate 0.9–1.15 | noise 15ms + tone 45ms, band-pass 1–3kHz | cooldown 40–70ms 제안 / weapon spam | `/sfx/weapons/rulerHit.ogg` + `.mp3` | 여러 적을 때릴 때 체벌 느낌이 아니라 만화적 플라스틱 slap로 유지. |
| `boxCutterFire` | 커터칼 발사/베기 시작 | thin saw/square chirp | rate 1.0–1.20 for sharpness | 30–60ms, high-pass, tiny metallic click | cooldown 40ms 제안 / weapon mid | `/sfx/weapons/boxCutterFire.ogg` + `.mp3` | 너무 사실적인 칼 소리 금지. 장난감/아케이드 금속성만. |
| `boxCutterHit` | 커터 히트 | short high noise slice + pulse tick | rate 0.95–1.18 | 20–55ms, high-pass noise, no blood/gore texture | cooldown 35–60ms 제안 / weapon spam | `/sfx/weapons/boxCutterHit.ogg` + `.mp3` | 피격 판독성은 유지하되 잔혹한 절단음처럼 들리지 않게. |
| `tumblerFire` | 텀블러 발사/둔탁 투척 | low triangle thump + click | rate 0.82–1.02 | 70–130ms, low-pass body, short attack | cooldown 60–90ms 제안 / weapon mid | `/sfx/weapons/tumblerFire.ogg` + `.mp3` | 무게감이 연필/자와 구분되어야 함. |
| `tumblerHit` | 텀블러 충돌 | low thud + hollow mid blip | rate 0.8–1.05 | 80–150ms, low-pass + 20ms offset mid click | cooldown 50–80ms 제안 / weapon spam | `/sfx/weapons/tumblerHit.ogg` + `.mp3` | 저역이 누적되면 모바일 스피커에서 뭉개지므로 길이 제한. |
| `bellFire` | 종 발사 | two decaying tones, metallic interval | rate 0.95–1.08 | 200–450ms, sine/triangle pair, no long reverb | cooldown 80–120ms 제안 / weapon mid-high | `/sfx/weapons/bellFire.ogg` + `.mp3` | “학교 종” identity. 긴 샘플 대신 두 tone 간격으로 표현. |
| `bellHit` | 종 타격 | short ding + click impact | rate 0.92–1.12 | 120–250ms, click 10ms + tone decay | cooldown 70–120ms 제안 / weapon mid | `/sfx/weapons/bellHit.ogg` + `.mp3` | fire와 hit는 decay 길이/attack click로 구분. |
| `flaskFire` | 플라스크 투척/화학 발사 | upward bubbly sweep: sine + filtered noise | rate 0.9–1.12 | 80–160ms, band-pass noise, pitch up | cooldown 60–90ms 제안 / weapon mid | `/sfx/weapons/flaskFire.ogg` + `.mp3` | 실제 액체 녹음 없이도 화학/버블 identity를 준다. |
| `flaskHit` | 플라스크 폭발/깨짐 | noise pop + down/up micro sweep | rate 0.85–1.15 | noise burst 60ms + tone 100ms, high-pass shard optional | cooldown 80–120ms 제안 / weapon mid-high | `/sfx/weapons/flaskHit.ogg` + `.mp3` | 깨지는 유리 사실음보다 장난감 실험실 pop으로 처리. |
| `stunGunFire` | 전기 발사 | square tremolo zap | rate 0.9–1.25 | 70–140ms, rapid amplitude gate, crackle noise 20% | cooldown 50–80ms 제안 / weapon high | `/sfx/weapons/stunGunFire.ogg` + `.mp3` | 같은 스펙에서 가장 기계음답게 표현 가능. 반복 시 pitch를 많이 흔든다. |
| `stunGunHit` | 감전 히트 | crackle burst + short descending pulse | rate 0.85–1.30 | 80–180ms, noise crackle 2–5 grains, band-pass | cooldown 70–120ms 제안 / weapon high | `/sfx/weapons/stunGunHit.ogg` + `.mp3` | 적중 정보가 중요하므로 일반 hit보다 우선순위 높게. |
| `missileFire` | 미사일 발사 | low-to-high thrust zip + noise tail | rate 0.85–1.10 | 120–250ms, filtered noise tail, triangle body | cooldown 100–160ms 제안 / weapon high | `/sfx/weapons/missileFire.ogg` + `.mp3` | 길어지면 swarm 상황에서 마스킹. tail은 짧게. |
| `missileHit` | 미사일 폭발 | noise burst + low thump, 2 layer max | rate 0.80–1.05 | 150–300ms, low-pass thump + high noise 40ms | cooldown 120–200ms 제안 / impact high | `/sfx/weapons/missileHit.ogg` + `.mp3` | 보스/플레이어 위험음보다 크면 안 되지만 일반 히트와는 확실히 구분. |
| `starlinkFall` | 위성/특수 낙하 | descending sweep, triangle/saw body | rate 0.9–1.05 | 400–900ms, pitch down, optional 20ms warning tick start | cooldown 500ms 제안 / event high | `/sfx/weapons/starlinkFall.ogg` + `.mp3` | 화면 밖 낙하를 예고해야 하므로 시각 경고와 함께 읽혀야 함. |
| `starlinkExplosion` | 위성 폭발 | large noise burst + low thump + short sparkle | rate 0.75–1.05 | 250–500ms, 2 layers only, no long rumble | cooldown 500–800ms 제안 / event high | `/sfx/weapons/starlinkExplosion.ogg` + `.mp3` | 특수 이벤트라 커도 되지만 모바일 스피커 clipping 확인 필요. |
| `compassFire` | 컴퍼스 발사/회전 | spinning pulse tick pattern | rate 0.92–1.14 | 80–160ms, 2–3 fast ticks, high-mid filter | cooldown 60–90ms 제안 / weapon mid | `/sfx/weapons/compassFire.ogg` + `.mp3` | 회전 도구 identity는 반복 tick 간격으로 표현. |
| `umbrellaFire` | 우산 발사/펼침 | pop-open pulse + soft whoosh noise | rate 0.88–1.08 | 100–200ms, attack pop 20ms + noise tail | cooldown 80–120ms 제안 / weapon mid | `/sfx/weapons/umbrellaFire.ogg` + `.mp3` | 우산 펼침 느낌은 noise tail, 타격은 둔탁함으로 분리. |
| `eraserFire` | 지우개 발사 | muffled rubber blip | rate 0.86–1.10 | 60–120ms, low-pass, soft attack | cooldown 50–80ms 제안 / weapon mid | `/sfx/weapons/eraserFire.ogg` + `.mp3` | 고무/부드러움. pencil/ruler보다 모서리가 둥글게. |
| `chibikoFire` | 치비코/특수 캐릭터성 발사 | cute high blip, triangle + pulse | rate 0.95–1.20 | 70–140ms, 2-note tiny chirp | cooldown 60–100ms 제안 / weapon mid | `/sfx/weapons/chibikoFire.ogg` + `.mp3` | 캐릭터성이 있으나 voice imitation 금지. 추상 blip만. |
| `sharkFire` | 상어/강한 특수 발사 | bite-like low snap + splash noise | rate 0.82–1.08 | 90–180ms, low pulse + high noise snap | cooldown 100–150ms 제안 / weapon high | `/sfx/weapons/sharkFire.ogg` + `.mp3` | 물/상어 느낌은 실제 동물소리보다 만화적 snap으로 처리. |
| `lanternFire` | 랜턴/빛 발사 | warm sine glow + tiny click | rate 0.92–1.08 | 120–220ms, gentle attack, low noise | cooldown 80–140ms 제안 / weapon mid | `/sfx/weapons/lanternFire.ogg` + `.mp3` | 어둠/빛 정보가 있으면 높은 주파수 과다보다 따뜻한 tone. |
| `playerHit` | 플레이어 피격 | short danger hit: noise slap + low pulse | rate 0.92–1.08 | 80–160ms, band-pass noise + low body | 현재 80ms / player danger top | `/sfx/player/playerHit.ogg` + `.mp3` | 최우선 정보음. 적/무기 hit보다 반드시 구분되어야 한다. |
| `playerDeath` | 플레이어 사망 | descending tone + low noise fade | rate 0.95–1.00 | 800–1500ms, low-pass, no harsh repeat | cooldown 1000ms 제안 / result top | `/sfx/player/playerDeath.ogg` + `.mp3` | 결과 전환음. 긴 사운드가 재시작 조작을 막지 않게. |
| `playerStep` | 플레이어 발걸음 | tiny foot tick/noise, alternating pitch | rate 0.92/1.08 alternating | 20–45ms, low volume, high-pass | cooldown 120–180ms 제안 / ambient low | `/sfx/player/playerStep.ogg` + `.mp3` | 모바일에서는 꺼도 무방한 장식음. 과잉 반복 금지. |
| `zombieGroan` | 일반 좀비 존재감 | filtered noise + low oscillator growl | rate 0.85–1.15 | 150–350ms, band-pass 300–900Hz, random decay | cooldown 300–600ms 제안 / enemy low-mid | `/sfx/enemies/zombieGroan.ogg` + `.mp3` | 실제 인물/동물 모사 금지. 추상 괴물 noise로. |
| `zombieDeath` | 일반 좀비 사망 | short noise puff + falling blip | rate 0.90–1.20 | 80–180ms, band-pass, 1 layer | 현재 50ms / enemy spam | `/sfx/enemies/zombieDeath.ogg` + `.mp3` | 떼죽음 시 가장 피로하기 쉬움. cooldown 유지/확장 필요. |
| `zombieHeavyDeath` | 탱커/무거운 적 사망 | low thud + muffled noise | rate 0.75–1.00 | 140–280ms, low-pass, 2 layer 가능 | 현재 50ms, 80–120ms 검토 / enemy mid | `/sfx/enemies/zombieHeavyDeath.ogg` + `.mp3` | 저역 누적을 피하고 일반 death와 무게 차이만 준다. |
| `zombieRunnerScreech` | 빠른 좀비 위협 | high band-pass squeal | rate 1.0–1.25 | 120–240ms, band-pass 1.5–3.5kHz, fast attack | cooldown 300ms 제안 / enemy threat high | `/sfx/enemies/zombieRunnerScreech.ogg` + `.mp3` | 귀를 찌르는 피로음 금지. warning 역할이면 짧고 선명하게. |
| `zombieRangedShoot` | 원거리 좀비 발사 | spit/noise pop + pulse | rate 0.9–1.15 | 70–140ms, noise 30ms + tone body | cooldown 80–120ms 제안 / enemy attack high | `/sfx/enemies/zombieRangedShoot.ogg` + `.mp3` | 플레이어 회피 정보라 일반 groan보다 우선. |
| `zombieGiantThud` | 거대 좀비 발/충격 | low thump + short dust noise | rate 0.75–1.0 | 120–260ms, low-pass, no long rumble | cooldown 200–350ms 제안 / enemy threat high | `/sfx/enemies/zombieGiantThud.ogg` + `.mp3` | 진동감은 필요하지만 저성능 스피커에서 뭉개지면 제거. |
| `bossWarning` | 보스 출현/위험 경고 | distinctive interval/tick motif | rate 고정 또는 0.98–1.02 | 2–4 ticks, 500–900ms, high clarity | cooldown 1000ms 제안 / boss top | `/sfx/events/bossWarning.ogg` + `.mp3` | 절대 decorative SFX에 묻히면 안 됨. 플레이어가 즉시 위험으로 인식해야 한다. |
| `bossSpawn` | 보스 등장 | low roar synth + warning accent | rate 0.9–1.0 | 700–1200ms, band-pass growl, no real voice imitation | cooldown 1500ms 제안 / boss top | `/sfx/events/bossSpawn.ogg` + `.mp3` | 실제 성우/동물 모사 금지. 합성 괴물톤으로만. |
| `bossRoar` | 보스 포효 | noise + low oscillator growl | rate 0.82–1.05 | 400–900ms, band-pass sweep, 2 layer max | cooldown 800–1500ms 제안 / boss top | `/sfx/enemies/bossRoar.ogg` + `.mp3` | 길고 큰 소리보다 패턴 인식이 중요. |
| `portalAppear` | 포털 등장 | rising shimmer: triangle arpeggio | rate 0.95–1.05 | 400–900ms, high-pass sparkle, no long reverb | cooldown 1000ms 제안 / event high | `/sfx/events/portalAppear.ogg` + `.mp3` | 목표/탈출 방향을 알려주는 긍정 이벤트로 stageClear와 구분. |
| `portalSuction` | 포털 흡입 | filtered noise + descending/warble tone | rate 0.9–1.1 | 500–1200ms, low-pass sweep, amplitude wobble | cooldown 1000ms 제안 / event high | `/sfx/events/portalSuction.ogg` + `.mp3` | 지속음이 되면 피로하므로 loop보다 짧은 one-shot 우선. |
| `matildaWarningTick` | 마틸다 경고 카운트 | dry metronome tick, square click | rate fixed, countdown마다 pitch +1 가능 | 20–50ms, high-pass, no reverb | cooldown tick interval 종속 / warning top | `/sfx/events/matildaWarningTick.ogg` + `.mp3` | 시간 정보를 주는 소리라 가장 읽기 쉬워야 한다. |
| `matildaCountdownEnd` | 카운트 종료/발동 | final tick + short burst | rate 0.95–1.05 | 250–600ms, tick + noise pop | cooldown 1000ms 제안 / warning top | `/sfx/events/matildaCountdownEnd.ogg` + `.mp3` | bossWarning과 충돌하지 않도록 다른 음정/리듬 사용. |
| `escapePortalClear` | 탈출 성공 | bright short jingle | rate 0.98–1.02 | 1–2초, triangle/square melody, soft end | cooldown 1000ms 제안 / result top | `/sfx/events/escapePortalClear.ogg` + `.mp3` | stageClear보다 “탈출” 느낌이 강해야 하며 지나치게 길면 안 됨. |
| `bossClearJingle` | 보스 클리어 | victory motif, 4–6 notes | rate fixed | 1–3초, melody 중심, low CPU | cooldown 2000ms 제안 / result top | `/sfx/events/bossClearJingle.ogg` + `.mp3` | 스테이지 클리어와 혼동하지 않게 첫 interval을 다르게. |
| `milestoneGold` | 마일스톤 보상 | coin + arpeggio hybrid | rate 0.95–1.08 | 300–700ms, coin click + rising tones | cooldown 500ms 제안 / reward high | `/sfx/events/milestoneGold.ogg` + `.mp3` | coinCollect보다 확실히 큰 보상으로 읽히되 반복 보상 시 피로 금지. |

## 4. 현재 코드에 반영할 때의 안전한 순서

1. 파일을 추가하기 전, 현재 `playSfx(id, volume, { rate })`의 rate variation만으로 1차 표현폭을 만든다.
2. `POLYPHONY_COOLDOWN`을 spam ID 중심으로 넓힌다. 후보: `pencilHit`, `rulerHit`, `zombieGroan`, `zombieRunnerScreech`, `zombieRangedShoot`, `playerStep`.
3. boss/player danger 계열은 낮은 우선순위 SFX에 묻히지 않도록 future mixer에서 priority를 둔다.
4. procedural fallback module을 만들 경우 release behavior를 즉시 바꾸지 말고, prototype-only flag 또는 missing-asset fallback으로만 시작한다.
5. Auth overlay 규칙은 유지한다. 인증 중 자동 BGM/보이스/전투음은 금지, `buttonClick`만 짧게 허용한다.

## 5. 라이선스/출처 메모

- 이 표는 새 외부 음원을 제안하지 않는다.
- 권장 primitive는 직접 합성/절차합성 기준이므로 Nintendo/Sega/타 게임 음원 복제 리스크를 만들지 않는다.
- 현재 fallback asset은 프로젝트 내부 `public/sfx`의 OGG/MP3 pair를 전제로 한다. 개별 파일의 실제 제작 원천/라이선스는 출시 후보 전 별도 asset provenance 기록이 필요하다.

## 6. Blockers / QA 필요

- 실제 청음 QA와 모바일 기기 QA는 이 문서 작업에서 수행하지 않았다.
- 파일별 peak/loudness/길이 측정은 아직 미수행이다. 후속 QA에서 clipping, fatigue, overlap, boss warning readability를 확인해야 한다.
- 현재 표는 parameter direction sheet이며 코드 변경/새 음원 생성은 하지 않았다.
