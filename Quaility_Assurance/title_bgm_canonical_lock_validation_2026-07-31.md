# QA — 타이틀 BGM 및 타이틀 전면 정본 잠금 검증 (2026-07-31)

## 검증 대상

- 타이틀 BGM source: `src/assets/audio/title_bgm.m4a`, 998,122 bytes, SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`.
- TitleScreen 및 audio diagnostics의 정확한 M4A import, 대체 title WAV 부재, title 생성기 참조 부재.
- provenance manifest의 exact metadata와 `owner-mandated-permanent` marker.
- 타이틀 전면 파일 목록/해시 기준선과 source, build artifact의 hashed M4A 1개/WAV 0개.

## 절차 변경 기록

- 2026-07-30 절차 생성 title WAV 교체는 2026-07-31 사용자 명시 지시로 무효화됐다.
- 권리·출처 검토 결과를 확인했다고 주장하지 않으며, 그러한 검토·품질·최적화·비평 점수는 이 영구 정본의 교체·제외 근거가 아니다.

## 자동 게이트

- `npm.cmd run verify:title-bgm`
- `npm.cmd run verify:title-surface`
- predev, prepreview, pretest, pretest:watch, prebuild, postbuild의 title canonical gate.
