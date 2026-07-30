# Sound_Mini — 타이틀 BGM 및 타이틀 전면 정본 잠금 (2026-07-31)

## Sound_Mini 관여 및 결정

- `title_bgm.m4a`(998,122 bytes, SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`)는 사용자 명시 지시에 따른 영구 정본이다.
- 2026-07-30 절차 생성 title WAV 교체는 사용자 지시로 무효화됐다. 대체 `title_bgm.wav`는 삭제했고, 생성기는 gameplay BGM만 생성·매니페스트 갱신한다.
- 권리·출처는 이 기록이나 매니페스트가 확인했다고 주장하지 않는다. 권리·출처·품질·최적화·비평 점수는 정본의 교체·제외 권한이 아니다.
- `assert-title-bgm-canonical.mjs`가 source hash, TitleScreen/audioDiagnostics의 m4a import, 생성기 타이틀 참조 부재, 매니페스트, build 산출물의 m4a 1개/WAV 0개를 검증한다.
- `assert-title-surface-canonical.mjs`는 현재 사용자 의도 상태의 타이틀 구성 파일과 m4a를 해시로 고정한다. 기준선은 자동 생성·갱신하지 않으며, 사용자 현재 대화의 직접 지시만 변경할 수 있다.

## 범위와 비변경 사항

- Firebase, Graphics Studio, localStorage에는 접근하거나 변경하지 않았다.
- gameplay BGM은 별개 절차 생성 WAV로 유지하며 타이틀 잠금으로 변경하지 않았다.
