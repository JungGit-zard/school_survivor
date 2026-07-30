# 오디오 비평 후속 개선 기록 — 2026-07-30

## 변경

- 타이틀 BGM은 Google 로그인 시작(`signingIn=true`) 즉시 정지한다. 같은 TitleScreen 마운트에서 로그인 취소가 되어도 자동재생 타이머·제스처·가시성 재시도를 다시 열지 않는다. 인증 전환 중 중복 또는 예기치 않은 재생을 막기 위한 보수적 정책이다.
- SFX는 `protected`와 `combat` 두 단계로 분류했다. player/UI/event 및 명시적 적 위험 신호(예: `bossWarning`, `bossRoar`, `matildaDash`, `playerHit`, `matildaCountdownEnd`)는 상한에 의해 버리지 않고, 반복 무기·일반 적 신호만 전역 6 voice 상한을 적용한다. Howler `end`/`stop`/`playerror` 콜백은 같은 voice를 한 번만 반환한다.
- `Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json`에 `SOUND_MAP` 75개 ID의 OGG/MP3 150개와 title BGM 1개를 bytes/SHA-256으로 기록했다. 절차 음향은 생성 스크립트를 출처로 적고 `licenseEvidence: "project-generated-procedural"`로 표시했으며, title BGM은 근거를 찾지 못해 `project_asset`, `licenseEvidence: "unverified"`로 기록했다.

## 검증

- `npm exec -- vitest run src/lib/sfxRegistry.test.js src/components/TitleScreen.bgm.test.jsx`
- `npm run verify:audio-manifest`
- `git diff --check`

## 한계와 범위

- 실제 Android 기기 청취, loudness/peak 측정, gameplay BGM lifecycle은 별도 작업이다. 이 변경만으로 실기기 mix 품질이나 라이선스 적합성을 통과로 주장하지 않는다.
- Firebase, Graphics Studio, 브라우저 localStorage, 오디오 파일 자체는 변경하지 않았다.
