# SoundMini critical-hit SFX remake

- 날짜: 2026-08-09
- 프로젝트: Escape! zombie school
- 담당: `soundmini`
- Kanban: `t_78bfebe2`
- 범위: 기존 임시 `criticalHit -> milestoneGold` 별칭 제거, 새 전용 critical-hit SFX OGG/MP3 제작 및 registry 연결

## 필수 게이트 확인

- pre-command checker 실행:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile soundmini -Domain auto -TaskSummary "remake-critical-hit-sfx"`
- `matched_domains`: `audio`
- `match_evidence`: `domain=audio`, `keyword=sfx`
- `combined_receipt_sha256`: `be2efd005ea3c441affe140ea5443165808a61a40d370784422ea4164b65ff01`
- 읽은 필수 문서: checker가 반환한 `AGENTS.md`, `Bang_Rules.md`, `CLAUDE.md`, mandatory wiring/manifest/README, latest soundmini record, mobile WebAudio constraints, project policy, session continuity, latest single session memory entry.
- 추가 soundmini 기준 문서: `Developer/agent_room/subagent_system_wiring_2026-07-03.md`, `Developer/agent_room/soundmini_free_game_audio_rnd_2026-07-04.md`, `Developer/agent_room/soundmini_atari_grade_machine_sfx_training_2026-07-05.md`, `Developer/agent_room/soundmini_sfx_parameter_sheet_2026-07-05.md`.

## critical-hit game-feel 원칙

참조한 것은 특정 게임 음원이나 샘플이 아니라, 액션/RPG/아케이드 계열에서 통용되는 일반적인 판독성 원칙이다.

1. 일반 hit와 다른 onset: 0~20ms 구간에 아주 짧고 딱딱한 click/noise transient를 둔다.
2. 피해량 강조 body: 40~120ms 구간에 낮은 주파수 impact body를 넣어 큰 피해로 읽히게 한다.
3. 성공 확인 accent: 50~100ms 부근에 짧은 밝은 고역 tone을 얹어 “크리티컬 확정”을 알려준다.
4. 짧은 길이: 긴 fanfare/jingle 대신 약 190ms one-shot으로 전투 spam 상황에서 UI 보상음, milestone reward, boss cue와 섞이지 않게 한다.
5. 비음성/비샘플: 목소리, 실녹음, 타 게임 자산, Nintendo/Sega/고전게임 음원 복제 없이 직접 절차합성한다.
6. 모바일 저사양: OGG 우선 + MP3 fallback, 기존 Howler 무음 실패/쿨다운 경로를 그대로 사용한다.

## 제작한 전용 사운드 설계

- logical ID: `criticalHit`
- category: `events`
- 길이: 약 0.190s
- 레이어:
  - hard transient: 18ms 이하 click/noise, `click=1.18`
  - impact body: 96Hz 중심 저역 사인/고조파, 짧은 하강 sweep
  - bright confirm accent: 55ms 지점에서 1760Hz + 2349Hz 짧은 accent
- 볼륨/쿨다운:
  - 기존 critical emit 볼륨 유지: 일반 critical `0.76`, strong critical `0.9`
  - 기존 `POLYPHONY_COOLDOWN.criticalHit = 140` 유지
- 의미 구분:
  - `milestoneGold`의 보상형 상승 chime/arpeggio와 다르게, `criticalHit`은 충격/확정음 중심으로 설계했다.

## 생성 파일 및 provenance

새 파일:

- `Developer/r3f_prototype/public/sfx/events/criticalHit.ogg`
  - bytes: `5455`
  - SHA-256: `4bfae122e664920c077df7cca782b0fd7f98cf9e2ed98cb261a485019680e378`
- `Developer/r3f_prototype/public/sfx/events/criticalHit.mp3`
  - bytes: `2657`
  - SHA-256: `770b31139d80c9a7e1bd33bba1dc4abf517b8bddff9ec7f438a86ee359563b18`

출처/라이선스:

- provenance type: `generated`
- source: `scripts/generate_sfx_refresh.py (procedural synthesis + ffmpeg OGG/MP3 conversion)`
- license evidence: `project-generated-procedural`
- 외부 음원, 불명확 라이선스, NC/GPL/SA, 실성우/실인물/타 게임 샘플 사용 없음.

## 코드 연결

변경/확인 사항:

- `Developer/r3f_prototype/src/lib/sfxRegistry.js`
  - `SOUND_MAP.criticalHit`을 `/sfx/events/milestoneGold.ogg`에서 `/sfx/events/criticalHit.ogg`로 교체.
  - `POLYPHONY_COOLDOWN.criticalHit = 140` 유지.
- `Developer/r3f_prototype/src/components/Enemy.jsx`
  - 기존 dirty diff의 confirmed critical branch에서 `criticalHit.isCritical`일 때 한 번 emit하는 경로 확인.
- `Developer/r3f_prototype/src/components/Enemies.jsx`
  - pooled enemy confirmed critical branch에서 `critical.isCritical`일 때 한 번 emit하는 경로 확인.
- `Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json`
  - 새 `criticalHit` logical ID와 OGG/MP3 bytes/SHA/provenance 추가.
- `Developer/r3f_prototype/scripts/generate_sfx_refresh.py`
  - `events/criticalHit` procedural preset 추가.
  - optional filter 인자를 추가해 `events/criticalHit`만 선택 재생성 가능하게 했다. 기존 전체 랜덤 refresh를 피하기 위한 안전장치다.
- `Developer/r3f_prototype/scripts/verify-audio-manifest.mjs`
  - registry 증가에 맞춰 성공 메시지를 `76 SFX IDs, 152 fallback files`로 갱신.

## 실행 명령 및 결과

- `test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING`
  - 결과: `GSTACK_OK`
- `git status --short --branch`
  - 작업 시작 시 이미 여러 dirty/untracked 파일 존재. 관련 없는 파일은 수정하지 않음.
- `python scripts/generate_sfx_refresh.py events/criticalHit`
  - 1차 실패: 시스템 `ffmpeg`가 PATH에 없어 `FileNotFoundError`.
- `npm --prefix C:/Users/admin/AppData/Local/Temp/soundmini_ffmpeg_static install ffmpeg-static --no-audit --no-fund --silent`
  - 임시 폴더에 ffmpeg static 확보.
- `FFMPEG_BINARY='C:/Users/admin/AppData/Local/Temp/soundmini_ffmpeg_static/node_modules/ffmpeg-static/ffmpeg.exe' python scripts/generate_sfx_refresh.py events/criticalHit`
  - 결과: `events/criticalHit: ogg=5455 mp3=2657`, `generated=1`
- `python - <<'PY' ... sha256 ... PY`
  - 결과: criticalHit OGG/MP3 bytes/SHA 확인 및 `title_bgm.m4a` bytes/SHA 정본 유지 확인.

## 보존 경계

- `title_bgm.m4a` 경로/bytes/SHA 유지:
  - `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a`
  - bytes `998122`
  - SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`
- 일반 hit SFX 파일/경로는 변경하지 않았다.
- gameplay values, Firebase, title screen, normal weapon hit sounds, unrelated dirty files, commit/push/store build는 건드리지 않았다.
- 사용자 지시에 따라 automated tests/build/browser QA/commit/push는 수행하지 않았다.

## 남은 QA 메모

- 브라우저 청음 QA는 사용자 지시상 수행하지 않았다.
- 실제 전투 swarm에서 `criticalHit`의 140ms cooldown과 bright accent가 충분히 읽히는지는 후속 수동 QA에서 확인하면 된다.
