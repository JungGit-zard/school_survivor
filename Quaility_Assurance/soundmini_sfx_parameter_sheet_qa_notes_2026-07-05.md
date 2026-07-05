# Sound_Mini SFX Parameter Sheet QA Notes

작성: 2026-07-05 11:43 KST  
대상 문서: `Developer/agent_room/soundmini_sfx_parameter_sheet_2026-07-05.md`  
대상 런타임: `Developer/r3f_prototype/src/lib/sfxRegistry.js`  
대상 에셋: `Developer/r3f_prototype/public/sfx/**`

## QA 목적

이번 작업은 코드/음원 변경이 아니라 현재 `SOUND_MAP` ID의 초저용량 parameter direction sheet 작성이다. 따라서 “검증 완료”가 아니라 후속 청음/모바일 QA에서 확인할 항목을 남긴다.

## 후속 QA 체크리스트

1. Boss/player danger readability
   - `bossWarning`, `bossSpawn`, `bossRoar`, `playerHit`, `matildaWarningTick`, `matildaCountdownEnd`가 일반 weapon/enemy spam에 묻히지 않는지 확인.

2. Spam fatigue
   - `zombieDeath`, `zombieHeavyDeath`, `coinCollect`, `pencilHit`, `rulerHit`, `playerStep` 반복 재생 시 피로도가 높은지 확인.
   - 현재 cooldown이 있는 ID와 없는 ID를 비교한다.

3. Mobile speaker clipping/masking
   - `missileHit`, `starlinkExplosion`, `zombieGiantThud`, `bossRoar`의 저역이 모바일 스피커에서 뭉개지거나 clip되는지 확인.

4. Auth overlay safety
   - `authOverlayActive=true` 상태에서 `buttonClick` 외 gameplay SFX가 재생되지 않는지 유지 확인.

5. Silent failure behavior
   - 파일 load 실패 시 게임/로그인 흐름이 중단되지 않고 무음 skip되는지 유지 확인.

6. License/provenance gap
   - 현재 public/sfx 파일의 제작 원천/라이선스 provenance가 출시 후보 전 별도 기록되어야 한다.

## 이번 작업에서 수행하지 않은 검증

- 실제 청음 테스트 미수행.
- iOS/Android 실기 테스트 미수행.
- loudness/peak/길이 자동 분석 미수행.
- 코드 변경 및 빌드 테스트 미수행.

## QA 판정

- 문서 산출물 QA 관점: 후속 검증 항목은 명시됨.
- 사운드 구현 품질 판정: 아직 불가. 실제 청음/모바일 QA 필요.
