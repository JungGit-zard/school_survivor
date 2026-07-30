# 1차 사운드·전투 피드백·캐주얼 폴리시 비평 — 2026-07-30

## 평가 범위와 원칙

- 역할: `soundmini` 관점의 1차 비평 및 참여 증거. 코드, 오디오 자산, Firebase, Graphics Studio 값은 변경하지 않았다.
- 반드시 준수: 브라우저 `localStorage`와 Firebase 정본에는 접근·기록·테스트를 하지 않았다. 파일 시스템의 정적 확인과 메모리 mock 기반 테스트만 사용했다.
- 하지 말아야 할 일: 정적 파일 존재, 호출 문자열, mock 테스트만으로 실제 믹스·청취 품질을 8점 이상으로 판정하지 않는다.
- 사운드 라우팅: `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md:53,60`의 오디오 작업 `soundmini` 필수 규칙에 따라 작성한 산출물이다.

## 직접 확인한 현재 증거와 한계

1. `Developer/r3f_prototype/src/lib/sfxRegistry.js:13-102`에는 무기·플레이어·적·UI·이벤트의 **75개 논리 SFX ID**가 있고, `:117-153`에는 일부 반복음을 억제하는 ID별 cooldown이 있다. `:199-226`은 Howler를 lazy 생성하고 OGG 우선/MP3 fallback, 음량·rate 적용을 수행한다.
2. `Developer/r3f_prototype/public/sfx/**`를 재집계한 결과는 **150개 파일(OGG 75 + MP3 75), 905,433 B = 약 0.863 MiB**다. 논리 ID마다 두 포맷이 있어 배포 예산은 작지만, 실제 압축 품질·길이·피크·LUFS는 `ffprobe` 미설치로 측정하지 못했다.
3. 이벤트 흐름은 `src/lib/sfxEvents.js:8-15`의 발행/구독, `src/components/SfxLayer.jsx:8-14`의 인증 상태 전달, `src/lib/sfxRegistry.js:199-226`의 재생으로 이어진다. 전투 호출도 확인했다. 예: `Pencil.jsx:92,181`, `Flask.jsx:137,213,239`, `StudentLantern.jsx:138,174`, `Starlink.jsx:198,278`, `HUD.jsx:592-600`.
4. 2026-07-30에 아래의 현재 테스트를 실행해 **3 파일 / 18 테스트 PASS**를 확인했다. 이는 asset 경로, cooldown 경계, auth-overlay 차단, mock Howler 호출 계약의 증거일 뿐 실제 발음 증거는 아니다.

   ```text
   npm exec -- vitest run src/lib/sfxRegistry.test.js src/components/SfxLayer.test.jsx src/components/TitleScreen.bgm.test.jsx
   ```

   특히 `sfxRegistry.test.js:176-186`은 전 등록 ID의 OGG/MP3 파일 존재를, `:196-213`은 감사 대상 cooldown의 경계를, `SfxLayer.test.jsx:26-40`은 이벤트 인계만 검증한다.
5. 타이틀 BGM은 `TitleScreen.jsx:126-209`에서 `Audio` 한 개를 loop/volume 0.5로 만들고 자동재생 실패 시 재시도한다. 그러나 현재 정적 근거에서는 게임플레이 BGM, BGM/SFX 분리 음량, 거리 감쇠, 전역 voice 수 상한, 출력 장치별 청취 기록을 확인하지 못했다. `Quaility_Assurance/full_game_content_audit_2026-07-25.md:1353-1361,1499-1502`도 이 공백과 로그인 중 타이틀 BGM 정지 미검증을 지적한다.
6. 자산의 제작 원천·라이선스·변환 설정을 파일별로 연결한 대장은 찾지 못했다. 같은 QA 문서 `:603`은 `scripts/generate_sfx.mjs`의 외부 샘플 없는 57개 합성 정의를 언급하지만, 75개 논리 SFX와 타이틀 BGM 전체를 포괄하는 출시용 provenance 증거는 아니다.

## 공통 7개 범주 점수

가중치는 기존 1차 비평과 같은 읽기 비중(시각 15%, 전투 20%, 성장 12%, UI 25%, 오디오 8%, 성능 10%, 제품 10%)을 썼다. 직접 플레이·실기기 청취·녹화가 없는 범주는 8점 이상을 주지 않았다.

| 범주 | 점수 /10 | 가중치 | 직접 근거와 감점 |
|---|---:|---:|---|
| 1. visual readability / art direction | 6.0 | 15% | 타이틀의 3D 장면·글자 등장 CSS는 `TitleScreen.jsx:34-56`, UI 1차 화면 증거는 `Quaility_Assurance/critic_round1_ui_ux_mobile_2026-07-30.md:4-5`에서 확인한다. 그러나 전투 중 적·VFX·경고와 SFX가 함께 읽히는 장면은 미관찰이다. |
| 2. core combat loop / game feel | 5.0 | 20% | 발사·실제 hit·AOE 후 1회 emit을 분리한 호출과 cooldown은 존재한다(`Pencil.jsx:92,181`, `Flask.jsx:137,213,239`, `sfxRegistry.js:117-153`). 타격 타이밍, 회피 경고의 체감, 동시 무기 난전은 청취하지 못했다. |
| 3. progression / balance | 4.0 | 12% | 4분 목표·레벨 선택의 정적 경로는 기존 비평에 있으나, 선택-화력-사운드 보상 루프의 실플레이 데이터가 없다. 전체 감사는 시간축·보상·장기 생존 점수 문제를 기록한다(`full_game_content_audit_2026-07-25.md:930-933,1043-1054`). |
| 4. UI / mobile / accessibility | 4.0 | 25% | auth 중 gameplay SFX는 막고 click만 허용한다(`sfxRegistry.js:155-162`; test `:110-126`). 반면 320px 로그인/터치표적, 모달 키보드 흐름 문제는 UI 비평 `:30-45`에 남아 있고, 청각 대체 신호·BGM/SFX 개별 접근성 설정의 실증은 없다. |
| 5. audio / feedback | 4.0 | 8% | 75개 ID, 포맷 fallback, 전투·보스 경고 배선, 일부 cooldown은 장점이다. 다만 실제 스피커·헤드폰·모바일 청취, loudness/peak, priority/voice-cap, gameplay BGM, 로그인 전환, 라이선스 대장이 없으므로 믹스 품질을 높게 평가할 수 없다. |
| 6. performance / stability | 4.5 | 10% | Howl lazy cache와 동일 ID cooldown은 비용을 낮춘다(`sfxRegistry.js:111-153,213-226`). 그러나 총 동시 재생 상한·카테고리 priority·거리/화면 밖 감쇠·저사양 Android soak은 미측정이며, 대량 적 소리 마스킹 위험이 남는다. |
| 7. product / onboarding / retention | 4.0 | 10% | 타이틀 BGM 재시도와 위험 경고는 첫 인상에 기여한다. 하지만 첫 60초의 조작·자동공격·레벨업 안내, 전투 BGM의 긴장 곡선, 실패 후 재시도 동기는 실증되지 않았다. UI 비평도 첫 플레이 안내가 부족하다고 기록한다(`critic_round1_ui_ux_mobile_2026-07-30.md:40-41`). |

**전체: 4.6 / 10**

계산: `6.0×0.15 + 5.0×0.20 + 4.0×0.12 + 4.0×0.25 + 4.0×0.08 + 4.5×0.10 + 4.0×0.10 = 4.55`, 반올림 4.6. 이 점수는 구현 부재가 아니라 **청취·실기기·플레이 증거 부재와 제품 수준의 믹스 제어 공백**을 크게 반영한 보수적 1차 점수다.

## 플레이어 영향 기준 상위 5개 문제

| 우선순위 | 문제와 플레이어 영향 | 근거 | 8점 도달을 위한 가장 작은 구체적 개선 | 재평가 합격 조건 |
|---|---|---|---|---|
| P0 | **게임플레이 BGM과 상태 전환 정책이 없다.** 전투 긴장·보스 전조·결과 보상이 소리로 연결되지 않고, 로그인 중 타이틀 BGM이 지속될 수 있다. | `TitleScreen.jsx:126-209`은 타이틀 Audio만 생성/정리한다. 전체 감사 `full_game_content_audit_2026-07-25.md:1353-1361`은 gameplay BGM 부재와 `signingIn` 중 별도 HTML Audio 정지 누락을 직접 지적한다. | 먼저 타이틀 BGM을 `signingIn` 시작에 즉시 pause/정리하고 회귀 테스트를 추가한다. 그 다음 한 개의 loop 가능한 gameplay BGM만 stage 시작/일시정지/결과/이탈에서 명확히 start-stop하도록 최소 구현한다. | Android 실제 기기에서 title→로그인 시작→취소/성공, lobby→stage→pause→resume→result 전환을 녹화해 각 상태에 의도한 트랙이 1개 이하로만 들림을 확인한다. `signingIn` 테스트는 BGM pause를 검증한다. |
| P0 | **난전에서 중요한 위험음의 우선순위·동시재생 상한이 없다.** 다수 무기의 자동 hit와 적 사망이 보스 경고·플레이어 피격을 덮어 회피를 늦출 수 있다. | `POLYPHONY_COOLDOWN`은 ID별 시간 억제만 제공(`sfxRegistry.js:117-153`)하며, `playSfx`는 priority/category/거리/총 voice cap 없이 캐시된 Howl을 재생한다(`:199-226`). 전체 감사도 적 행동과 SFX의 1회성, 동시 재생·거리 감쇠·화면 밖 우선순위 검증을 요구한다(`:1397-1398`). | 기존 registry에 danger/player/UI와 combat/ambient의 2~3단계 priority만 추가하고, 재생 중인 combat voice를 작은 상한으로 제한한다. `bossWarning`, `playerHit`, `matildaCountdownEnd`는 제한에서 보호한다. | 16종 무기+대량 적 60초 재현에서 위험음 누락 0회, 동시에 들리는 combat voice가 정한 상한 이하, 모바일 스피커 녹음에서 clipping·보스 경고 마스킹이 없다는 청취 기록을 남긴다. |
| P1 | **타격 타이밍과 반복 피로가 정적으로만 검증됐다.** 코드상 hit 후 emit이어도 프레임 지연·속사·AOE·모바일 출력에서 "맞는 순간"과 다르게 들리거나 피로할 수 있다. | 무기 호출은 존재하고 focused test도 cooldown 경계를 검증한다(`sfxRegistry.test.js:196-213`). 그러나 QA는 실제 React/R3F 프레임에서 정확한 emit 횟수를 대체하지 못한다고 명시한다(`weapon_sfx_full_coverage_validation_2026-07-11.md:114-115`). | 수정 전 우선 `pencilHit`, `flaskTick`, `stunGunHit`, `starlinkExplosion`, `zombieDeath` 다섯 ID를 대상으로 10분 청취 매트릭스(헤드폰/Android 소형 스피커)를 기록한다. 문제가 확인된 ID에만 volume/cooldown 하나씩 조정한다. | 다섯 ID별 발사·적중·AOE·동시무기 사례가 녹화/청취표에 있으며, 각 사례에서 시각적 hit와 청각 onset이 플레이어가 구별 가능한 한 이벤트로 일치한다. 피로·masking·clip의 미해결 항목 0개. |
| P1 | **음량·피크·압축·출력 장치 품질을 측정하지 못했다.** 0.863 MiB라는 파일 예산은 좋지만, 작다는 사실은 깨끗하거나 들린다는 보장이 아니다. | 직접 재집계: `public/sfx/**` 150개/0.863 MiB. 이 환경에는 `ffprobe`가 없어 duration/codec/loudness를 확인하지 못했고 실제 청취도 없다. `soundmini_sfx_parameter_sheet_qa_notes_2026-07-05.md:30-37`도 mobile clipping/masking과 청취 QA를 미실시로 남긴다. | 75개 OGG 원본에 대해 최소한 peak·통합 loudness·duration을 한 표에 산출하고, danger/player/BGM의 목표 상대 음량만 정한다. 파일 재인코딩은 측정에서 벗어난 항목에만 한다. | 표가 75개 논리 ID와 title BGM을 모두 포괄하고, Android 소형 스피커와 헤드폰에서 보스 경고·playerHit·폭발의 clip/마스킹 없음이 두 명 이상의 청취 체크로 확인된다. |
| P1 | **출시용 음원 provenance가 불완전하다.** 권리 불명 음원은 출시 중단·교체 비용·신뢰 저하로 이어진다. | `scripts/generate_sfx.mjs`의 57개 합성 정의 근거는 전체 감사 `:603`에 있으나, 타이틀 BGM과 나머지 SFX를 포함한 파일별 생성일·원천·라이선스·변환 hash 대장은 찾지 못했다. QA 노트도 이를 별도 기록 과제로 둔다(`soundmini_sfx_parameter_sheet_qa_notes_2026-07-05.md:30-31`). | 새 자산을 만들지 말고 현재 75개 논리 ID와 title BGM에 대해 원천(합성 script/외부), 라이선스, 생성·변환 명령, SHA-256만 담은 한 장의 manifest를 만든다. | 모든 배포 음원이 manifest에 1:1 매핑되고 SHA-256이 일치한다. 외부 음원은 상업 배포 가능 증빙/귀속 문구가, 합성 음원은 재생성 명령이 각각 있다. |

## 재평가 게이트

다음 네 조건이 모두 충족되기 전에는 오디오·피드백 또는 전체 점수를 8점 이상으로 올리지 않는다.

1. 실제 Android 기기와 데스크톱 헤드폰에서 title/login/lobby/stage/boss/pause/result의 10분 이상 녹화·청취 증거가 있다.
2. 대량 전투에서 danger/player cue 우선순위, voice-cap, SFX/BGM 상태 전환을 자동 테스트와 수동 청취로 모두 검증한다.
3. 75개 논리 SFX와 title BGM에 loudness/peak/duration·라이선스·provenance manifest가 완비되어 있다.
4. 로그인 시작 시 title BGM 정지, gameplay BGM의 lifecycle, 그리고 5개 고빈도/고위험 SFX의 타격 타이밍이 회귀 테스트와 실기기 녹화에서 일치한다.

## 자체 점검

- 지정된 단일 산출물만 추가했다.
- `public/sfx` 수량/용량을 현재 파일 시스템에서 재확인했고, SFX 경로·호출부·테스트·사운드/QA 문서를 직접 읽었다.
- 테스트는 3 파일/18 테스트 PASS였으며, Firebase·Graphics Studio·오디오 자산·게임 코드는 변경하지 않았다.
