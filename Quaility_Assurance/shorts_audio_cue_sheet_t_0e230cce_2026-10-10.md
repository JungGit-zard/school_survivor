# QA — 30초 쇼츠 오디오 큐시트 검토 기록

Date: 2026-10-10
Kanban task: t_0e230cce
Artifact: `Graphic_designer/쇼츠프로젝트_20261010/audio_cues.md`

## 검토 범위

- `timeline.csv` 0–30초 컷 구조와 `storyboard.md` 연출 메모에 맞춰 오디오 큐가 존재하는지 확인.
- 학교 종, 연필/자 impacts, 동료 전환, B01 보스, 포탈, voice/no-voice, mix/ducking guidance 항목 포함 여부 확인.
- 게임 오디오 변경 또는 라이선스 확정 주장 여부 확인.

## 판정

조건부 PASS.

- 0.00–30.00초 전체 타임라인에 beat point별 큐가 들어 있다.
- 학교 종, 연필 투척/명중, 30cm 자, 텀블러/플라스크, 치비코·하나코·이누콘 전환, B01 보스, 포탈, 엔드카드 sting이 구분되어 있다.
- 내레이션 없이 자막+SFX 중심을 기본 권장하고, optional pseudo-voice는 Animalese식 짧은 토큰으로 제한했다.
- 자막/CTA 구간 ducking, 18초 보스 ducking, 25–27초 포탈 믹스 분리, 스마트폰 스피커 과자극 방지 메모가 포함되어 있다.
- 실제 음원 파일, 게임 런타임, `SOUND_MAP`, 정본 `title_bgm.m4a`를 변경하지 않았으며 권리 확보 완료를 주장하지 않는다.

## 남은 검증

- 최종 편집본과 실제 음악/SFX 후보가 생기면 청감 검수, loudness/LUFS, 모바일 스피커 테스트가 필요하다.
- 실제 보이스 토큰이나 SFX 파일을 제작할 경우 별도 soundmini 라이선스/출처 기록과 QA가 필요하다.
