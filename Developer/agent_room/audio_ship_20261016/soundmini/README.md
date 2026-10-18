# Sound_Mini 오디오 구현 인계 — 2026-10-16

카드: escape-zombie-school / t_3dc10901. 등록 soundmini 수동 단독 오디오 writer.
상태: 구현·오프라인 검증 완료, Advisor 통합/브라우저 최종 수용 대기. READY/배포 완료 선언이 아니다.
정본 루트: F:/From_SSD_D_20261005/JungSil/2.Minigame_project/school_survivor-integration

## 실제 산출물

- SOUND_MAP 90건(무기42/플레이어4/적23/UI6/이벤트15) + 대사 프로필3 = 정확히93건.
- 후보279개 실제 PCM WAV. 기존90개 OGG 원본 경로 + 현행 대사 프로필의 직접 렌더 WAV3개로 원본93건 제공.
- 신규 디렉터리: `Developer/r3f_prototype/public/sfx/audition-20261016/`. WAV282개 + manifest.js. PCM 44.1kHz/mono/16-bit로 브라우저 기본 재생 가능.
- 계약: `window.SFX_AUDITION_MANIFEST={generatedAt,cases:[{id,category,name,description,original:{src,label},variants:[{id,label,description,src}]}]}`. 모든 src는 `/sfx/` 루트, 케이스 이름/후보 설명은 한국어.
- 후보는 비교용이며 SOUND_MAP·사용자 선택·사용자 튜닝을 변경하지 않는다. 자동 후보 적용 없음.
- `public/sfx-audition-20261016.html`은 uimini 소유. 읽기만 했고 수정하지 않았다.

## 실제 런타임 변경

1. `Developer/r3f_prototype/src/lib/dialogueVoice.js`
   - timer마다 최종 voicedIndex를 함께 읽던 버그 수정: 글자별 index 캡처로 기존 프로필의 음높이 패턴 복원.
   - resume는 사용자 동작 안에서 즉시 호출하되, 완료 후 글자 타이머를 시작한다. Promise 거부/동기 예외를 음성 실패로만 처리한다.
   - 발화 세대별 disposer로 이전 대사의 정지 핸들이 새 대사를 끊지 못하게 한다. unlock 대기 중 취소 후 재생 부활 방지.
   - closed AudioContext 재생성, 생성 실패 무음 처리, 노드 생성 실패가 게임으로 전파되지 않도록 처리.
   - gain/filter/highpass/overtone/vibrato 노드와 정리 타이머를 추적해 취소 때 연결 해제.
   - 프로필 수치·음량 clamp·문장 의미/본문·HUD 호출부 불변.
2. `Developer/r3f_prototype/src/lib/sfxRegistry.js`
   - 일시적인 로드 오류를 영구 mute로 고정하지 않고 3000ms backoff 뒤 다음 이벤트에서 재시도.
   - 실패 Howl unload, 이전 인스턴스의 지연 callback이 새 cache/보이스 슬롯을 건드리지 못하도록 identity guard.
   - pause에도 전투 보이스 슬롯 반환, null play 결과를 슬롯으로 예약하지 않음, 동기 재생 예외 격리.
   - SOUND_MAP, 보호 큐·예약 슬롯·쿨다운·튜닝 함수·master volume 함수·기존 rate/volume 의미 불변.
3. `SfxLayer.jsx`, `sfxEvents.js`, `enemyDeathSfx.js`는 조사 후 변경 필요 없는 기존 경로를 유지했다.

## 후보 설계·출처

- 기존 `generate_sfx.mjs`, `generate_voice_sfx.mjs`, `generate_zombie_death_voices.mjs`의 합성기를 재사용한다.
- `generate_sfx.mjs`는 import할 때 원본 전체를 생성하지 않도록 직접 실행 guard와 export만 추가했다. 기존 프리셋/직접 실행 출력 알고리즘은 변경하지 않았다.
- 케이스별 원래 생성 파형/시드와 물성 분류(공명 타격, 물성 충격, 전기 파열, 공기 궤적, 경고 호출, 보상, 생명체)를 사용한다.
- A: 짧고 건조한 어택/윤곽, B: 둥근 몸통/지연 공명, C: 이중 응답/맥동 꼬리. 길이·필터·새 배음/노이즈·어택·리듬 모두 달라 단순 gain/파일명 변경이 아니다.
- export 가능한 현행 프리셋이 없는 일부 케이스는 보존된 기존 원본을 ffmpeg로 디코드한 후 새 후보를 설계한다. Inucon은 8월30일 교체된 개 짖음 원본을 사용하며 폐기된 이전 발성 프리셋을 원본으로 표시하지 않는다.
- 새 대사 후보는 기존 source-filter 합성기로 52/72/60ms 포먼트 토큰을 생성한다. 기존 프로필 원본과 명확히 구분한다.
- 대사 원본은 현재 dialogueVoice.js의 실제 playGlyphBleep 그래프(필터, 배음, vibrato, 지수 gain 포함)를 native Chrome OfflineAudioContext에서 직접 렌더했다. 근사 oscillator 재제작/정규화 없음. 수정된 글자별 index, volume=1 기준의 동일 예문이며 임의 사용자 gain 설정을 복제한 녹음은 아니다.
- 프로젝트 자체 합성 또는 기존 프로젝트 자체 합성 원본만 사용. 외부 게임/Nintendo/실존 인물 음성/유료 자산 없음. 세부 입력, 이유, 라이선스 근거, SHA는 `source-reason-sha.json`.

## Inucon provenance 정정

`Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json`의 inuconBite 항목만 수정했다.
- 원본 파일은 bb88ebb9bbdd945e6aba807d5bf8d7e59f679c80의 blob과 byte-identical이며 2026-08-30 제작 기록의 수치와도 동일하다.
- OGG:6656 bytes / 91a515d574ea36ce148a09ba7d3ff2dcae2d71695d1be7e5c856bdd3e63126c4
- MP3:3761 bytes / 0cc80254c7fa8348379e9749b445348cd226d5d82a8758a1688176b7c673bb99
- source를 당시 Python numpy/formant 합성 + soundfile/lameenc 기록으로 정정하고 오래된 길이·SHA만 갱신했다. 다른 자산 메타데이터/최상위 필드는 동일하다.

## 실행·검증 결과

- 필수 게이트: `-Profile soundmini -Domain auto -TaskSummary gameplay-audio`, exit0. matched_domains gameplay/audio, evidence gameplay/audio. 시작/종료 receipt 동일:170f3d0cad8eadc5a0531c149b199f4bf87747f338c973459fb1dc135b4734a9. gstack GSTACK_OK.
- TDD: 기존 코드에서 대사5건/registry4건 실패 재현. 실패 Howl 해제 회귀도 수정 전 실패 확인. 수정 후 아래63개 통과.
- `node node_modules/vitest/vitest.mjs run src/lib/dialogueVoice.test.js src/lib/dialogueVoice.lifecycle.test.js src/lib/sfxRegistry.test.js src/lib/enemyDeathSfx.test.js src/components/HUD.dialogueVoice.test.js scripts/verify-audio-manifest.test.js scripts/generate-audition-20261016.test.js --maxWorkers=1 --testTimeout=15000`
  - 7 files passed / 63 tests passed. 원본 검증 테스트의 시스템 부하성 timeout을 피하기 위해 CLI에서만15초를 허용했고 단언은 약화하지 않았다.
- `node scripts/verify-audio-manifest.mjs`:90 SFX IDs,180 fallback files, canonical title BGM verified.
- `node scripts/verify-voice-sfx-assets.mjs`:29 voice-like IDs /58 files verified.
- `node scripts/verify-audition-20261016.mjs`:462 files 실제 ffmpeg 디코드, failures0. 후보279개 hash unique. 93개 케이스의 후보쌍279개 모두 정규화 파형/시간 envelope/FFT 스펙트럼 차이 통과.
  - 후보 최대 peak0.699981689453125, RMS0.05499821991432335~0.12999625960522898, clipped samples0.
  - 후보쌍 시간 정렬 절대 cosine 최대0.6740894232819805(1이면 동일 파형). 단순 볼륨 변경이 아님.
  - 기존 OGG/MP3 180개 SHA가 HEAD와 전부 동일. 누락 baseline0이므로 불필요한 복구/교체 없음.
  - 기존 원본14파일에서 full-scale 인접 샘플(절대값≥0.999) 관측. 원본의 legacy 측정 한계이며 실제 가청 왜곡 확정이나 이번 신규 결함으로 주장하지 않는다. 요청대로 원본은 보존했다.
- 후보 재생성:282개 WAV 재생성 전후 SHA 일치, mismatch0. 대사 원본은 재사용했으며 이 검사는 대사 원본의 브라우저 간 재렌더 bit determinism을 주장하지 않는다.
- `python Developer/agent_room/audio_ship_20261016/soundmini/audit-preservation.py`:11개 보존 조건 통과. 정확한 구현파일293개와 SHA 수록.
- scoped `git diff --check`:오류0. 공유 트리의 무관한 변경은 reset/stash/checkout/stage하지 않았다.

## 브라우저 및 실패 복구 기록

Advisor가 승인한 정확히1개의 headless browser만 대사 오프라인 렌더에 사용했다. `npm run browser:reserve` 통과(2/3) 후 실행. Playwright 전용 실행파일이 설치되어 있지 않아 첫 launch는 시작 전 실패했고, 설치된 Chrome channel로 재실행했다. PID2084, finally close=true, 별도 Get-Process 조회에서도 PID2084_CLOSED 확인. about:blank에서만 합성했으며 게임/로그인/Firebase/저장소에 접근하지 않았다. 슬롯은 Advisor에게 반환했다. 이후 추가 브라우저 실행 없음.

최초 후보 생성은270 SFX를 만든 뒤 faithful 대사 원본 미존재를 명시적으로 오류 처리했다. 가짜 원본으로 대체하지 않고 native 렌더 후 재실행해 최종93/279 매니페스트를 완성했다.

## 정확한 변경 경로

기존 수정5개:
- Developer/r3f_prototype/src/lib/dialogueVoice.js
- Developer/r3f_prototype/src/lib/sfxRegistry.js
- Developer/r3f_prototype/src/lib/sfxRegistry.test.js
- Developer/r3f_prototype/scripts/generate_sfx.mjs
- Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json

신규 소스/테스트5개:
- Developer/r3f_prototype/src/lib/dialogueVoice.lifecycle.test.js
- Developer/r3f_prototype/scripts/generate-audition-20261016.mjs
- Developer/r3f_prototype/scripts/generate-audition-20261016.test.js
- Developer/r3f_prototype/scripts/render-dialogue-audition-20261016.mjs
- Developer/r3f_prototype/scripts/verify-audition-20261016.mjs

신규 자산283개:
- Developer/r3f_prototype/public/sfx/audition-20261016/manifest.js
- 같은 폴더 `<SOUND_MAP id>-A.wav`, `-B.wav`, `-C.wav` 270개
- 같은 폴더 `dialogue-<protagonistIntro|protagonistUrgent|matilda>-<original|A|B|C>.wav`12개
- 생략 없는 개별 경로·크기·SHA는 `scope-audit.json`의 exactImplementationFiles293개.

기록:본 폴더의 README.md,source-reason-sha.json,decode-measurements.json,dialogue-render.json,reproducibility.json,focused-tests.txt,audit-preservation.py,scope-audit.json 및 Quaility_Assurance/audio_ship_20261016_soundmini.md.

## 인계·한계

- 삭제 목록:없음. 원본 자산 복구/교체 목록:없음. BGM/타이틀/튜닝/auth/progress/shared gameplay 변경:없음. Firebase/localStorage/사용자 데이터 쓰기:없음. commit/push/deploy:없음.
- 음향 수치·디코드와 제어 mock 회귀는 실제 청취 선호/모바일 스피커 품질 승인을 대신하지 않는다. 실제 audition UI/취소/모바일 수용은 Advisor/uimini의 독립 검증 대상이다. 전체 통합 빌드/실기기 검증을 수행했다고 주장하지 않는다.
- 카드 blocked mirror/수동 소유권은 그대로 두었다. 자동 dispatcher unblock/재실행 없음. 최종 READY와 통합/배포는 Advisor 및 integration owner가 결정한다.
- Advisor의 독립 verifier가 decode-measurements.json을 재작성할 수 있으므로 이 보고서는 그 증거 파일의 최종 SHA를 동결하지 않는다. 실제 자산과 소스의 SHA만 인계한다.
