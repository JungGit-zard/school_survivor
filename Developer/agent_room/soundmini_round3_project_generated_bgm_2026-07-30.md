# soundmini Round 3 — 프로젝트 생성 BGM 교체

## 반드시 지킨 사항

- 권리·출처를 증명할 수 없던 `src/assets/audio/title_bgm.m4a`를 출시 경로에서 제거했다. 기존 파일의 라이선스 문자열을 임의 승인으로 바꾸지 않았다.
- `scripts/generate-project-bgm.mjs`는 Node 기본 기능과 결정론적 수학 파형만 사용한다. 외부 샘플, 녹음, 패키지, Firebase, Graphics Studio, localStorage를 사용하지 않는다.
- 생성물은 22,050Hz, 모노, 16-bit PCM WAV, 각 8초 루프다. 타이틀과 게임플레이 각각 352,844 bytes로 700KB 미만이다.
- 타이틀은 첫 사용자 `pointerdown`/`touchstart`/`keydown` 이후에만 재생을 시도한다. 로그인 시작, 언마운트에서 pause 및 source 해제를 수행한다.
- 게임플레이는 `ReadyGameApp`의 game 화면에서만 한 인스턴스로 마운트한다. `playing`에서 재생, `paused`/`levelup`에서 pause, `gameover`/`cleared`/언마운트에서 pause 및 source 해제를 수행한다. play 거부는 타이머가 아니라 다음 `playing` 전환에서만 재시도한다.

## 생성 원천과 측정값

| Logical ID | SHA-256 | PCM peak | PCM RMS |
| --- | --- | ---: | ---: |
| titleBgm | `e9faecd990959359a56f42723cafcaedd915b5fa515af944616bdabcb42cc756` | 0.312204 | 0.124328 |
| gameplayBgm | `1bde953a4fac3ee8058b6d20f725fc857e29e7a2c1e503e50ab8b9e08ab6d8d8` | 0.311319 | 0.125392 |

위 peak/RMS는 생성된 PCM의 산술 측정값이며, 통합 LUFS 또는 실제 스피커 청취 품질의 주장으로 사용하지 않는다. 매니페스트는 75 SFX와 두 BGM의 exact path, bytes, SHA-256을 검증한다.

## 검증

- `npm.cmd run generate:project-bgm`
- `npm.cmd exec -- vitest run scripts/generate-project-bgm.test.js scripts/verify-audio-manifest.test.js src/components/TitleScreen.bgm.test.jsx src/components/GameplayBgm.test.jsx` → 4 files / 13 tests passed
- `npm.cmd run verify:audio-manifest` → `75 SFX IDs, 150 fallback files, 2 project-generated BGM loops`
- `npm.cmd test -- --silent --reporter=dot` → 완료
- `npm.cmd run build` → 완료. 기존 `vendor-three` 500KB chunk 경고는 남아 있으며 BGM 로직 실패가 아니다.

## 아직 해야 하는 실제 검증

- Android 소형 스피커와 데스크톱 헤드폰에서 `title → login → lobby → stage → boss → pause/resume → result`를 각각 10분 이상 실제 청취·녹화해야 한다.
- 두 BGM의 실제 체감 음량, SFX 마스킹, clipping, danger/player cue 청취는 이 코드·PCM 검증으로 증명되지 않는다. 이 작업에서 실제 청취했다고 주장하지 않는다.
