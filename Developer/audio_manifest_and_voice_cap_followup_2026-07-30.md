# 오디오 매니페스트·voice cap 후속 수정 — 2026-07-30

## 수정 사항

- Howler `onloaderror`가 발생하면 해당 logical ID의 active combat voice token을 모두 제거한다. 같은 load error가 중복 호출되어도 Set 삭제가 반복될 뿐 다른 logical ID의 token은 건드리지 않는다.
- 매니페스트 검증기는 registry의 각 logical ID에 대해 OGG/MP3 배열을 정확히 비교한다. `titleBgm`도 `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a` 한 경로와 정확히 비교한다.
- `unverified`, `unknown`, `pending`, `tbd`, `todo`, `missing`은 승인된 라이선스 근거가 아니므로 검증 실패와 nonzero 종료로 처리한다.

## title BGM 권리 조사와 출시 상태

- Git 이력에서 파일 최초 추가는 `4c36dfb609fba673fcef40589d041d4179e67194`(2026-07-14, `feat(title): add looping title BGM (optimized 96k AAC, autoplay-policy fallback)`)이다. 이후 `59ce4e526beffdd8468ccab091bb63cde69fca97`에서 관련 구현·Sound_Mini·QA 문서가 추가됐고 `cc50eefa24d9c0a763c8da2040b7dcae109020fa`에서 파일이 최적화됐다.
- `Developer/title_bgm_implementation_2026-07-14.md`는 기존 96 kbps AAC M4A를 복구했다고 기록하고, `Developer/title_bgm_soundmini_review_2026-07-14.md`와 `Quaility_Assurance/title_bgm_validation_2026-07-14.md`는 재생 정책과 빌드 포함 여부만 검증한다.
- 저장소 검색과 위 Git 이력에는 원출처, 저작권자, 상업 배포 허용 범위를 증명하는 문서가 없다. 이를 추측하지 않고 manifest의 `licenseEvidence: "unverified"`를 유지한다.
- 따라서 실제 매니페스트 검증 실패는 의도된 **출시 차단 상태**다. 권리자가 확인된 상업 배포 허용 증거가 기록되기 전에는 title BGM을 포함한 출시 승인을 내릴 수 없다.

## duration·peak·loudness 증거 공백

- 2026-07-30 현재 작업 환경에서 `Get-Command`로 `ffprobe`, `ffmpeg`, `mediainfo`, `sox`를 확인했으나 모두 없었다. `Developer/r3f_prototype/node_modules`에도 같은 이름의 로컬 측정 바이너리가 없다. 설치된 신뢰 가능한 디코더/측정 도구 없이 압축된 75 OGG와 M4A의 peak·통합 loudness를 정확히 산출할 수 없다.
- 새 의존성 설치 및 음원 재인코딩은 하지 않았다. 따라서 75 OGG + title BGM의 duration/peak/loudness 표는 아직 생성하지 못했으며 출시 QA 증거 공백으로 남는다.

## 검증 명령

- `npm exec -- vitest run src/lib/sfxRegistry.test.js scripts/verify-audio-manifest.test.js`
- `node scripts/verify-audio-manifest.mjs` — title BGM 권리 미확인으로 의도된 nonzero 실패
- `git diff --check`

Firebase, Graphics Studio, localStorage, 오디오 파일 자체는 읽거나 변경하지 않았다.
