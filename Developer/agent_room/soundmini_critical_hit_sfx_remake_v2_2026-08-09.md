# SoundMini critical-hit SFX remake v2

- 날짜: 2026-08-09
- 프로젝트: Escape! zombie school
- 담당: `soundmini`
- Kanban: `t_2e3fcb30`
- 범위: 직전 `criticalHit` OGG/MP3를 superseded 처리하고 동일 runtime 경로에 전용 critical-hit SFX v2 재생성

## 필수 게이트 확인

- pre-command checker 실행:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile soundmini -Domain auto -TaskSummary 'remake-critical-hit-sfx-v2'`
- `matched_domains`: `audio`
- `match_evidence`: `domain=audio`, `keyword=sfx`
- `combined_receipt_sha256`: `83d57bc855778effce4dbf1ebaa9276405179f2a2bf58c6f881e3b695e84402d`
- 읽은 필수 문서: checker가 반환한 `AGENTS.md`, `Bang_Rules.md`, `CLAUDE.md`, mandatory wiring/manifest/README, latest soundmini record, mobile WebAudio constraints, `project_develop_policy.md`, `SESSION_CONTINUITY.md`, `SESSION_MEMORY.md` 최신 단일 엔트리.
- 추가 soundmini 기준 문서: `Developer/agent_room/subagent_system_wiring_2026-07-03.md`, `Developer/agent_room/soundmini_free_game_audio_rnd_2026-07-04.md`, `Developer/agent_room/soundmini_atari_grade_machine_sfx_training_2026-07-05.md`, `Developer/agent_room/soundmini_sfx_parameter_sheet_2026-07-05.md`.

## v2 제작 방향

직전 v1은 hard transient + low impact + bright accent의 190ms 전용 SFX였다. v2는 같은 의미를 유지하되 더 짧고 더 건조한 “크랙/스냅 + 짧은 저역 툭 + 고역 틱”으로 바꿔 일반 히트 및 보상 징글과 더 멀어지게 했다.

- logical ID: `criticalHit`
- category: `events`
- 길이: 약 0.145s
- 설계:
  - onset: 18ms 이하 고강도 noise click/snap, `click=1.35`, `noise=0.55`
  - body: 82Hz 기반 compact low thump, `sweep=-70`, long tail 없음
  - confirmation: 68ms 지점, 26ms짜리 3120Hz + 4680Hz 짧은 tick
- 제외:
  - reward jingle 없음
  - voice/pseudo-voice 없음
  - 외부 샘플 없음
  - Nintendo/Sega/타 게임 음원 복제 없음

## 생성 파일 및 provenance

교체된 파일:

- `Developer/r3f_prototype/public/sfx/events/criticalHit.ogg`
  - bytes: `5223`
  - SHA-256: `ecbd38de25f5ef5bf723be28b45a984bd2ff82c76ecfeb97bb63c1b09b166614`
- `Developer/r3f_prototype/public/sfx/events/criticalHit.mp3`
  - bytes: `2135`
  - SHA-256: `57d7a01d70ca6592e08b3524e2f174862428d2c565b05d8c206779079f069b52`

출처/라이선스:

- provenance type: `generated`
- source: `scripts/generate_sfx_refresh.py events/criticalHit (v2 procedural crack/thump/tick synthesis + ffmpeg OGG/MP3 conversion)`
- license evidence: `project-generated-procedural`
- 외부 음원, 불명확 라이선스, NC/GPL/SA, 실성우/실인물/타 게임 샘플 사용 없음.

## 코드/런타임 경계 확인

유지한 사항:

- `SOUND_MAP.criticalHit` 경로는 `/sfx/events/criticalHit.ogg` 그대로 유지.
- `POLYPHONY_COOLDOWN.criticalHit = 140` 유지.
- `Enemy.jsx`와 `Enemies.jsx`의 critical-only single emit 경로는 변경하지 않음.
- gameplay values, visual motion, Firebase, title screen, 일반 hit SFX는 변경하지 않음.

업데이트한 사항:

- `Developer/r3f_prototype/scripts/generate_sfx_refresh.py`
  - `events/criticalHit` preset을 `critical_v2_crack_thump_tick`로 갱신.
  - accent timing/frequency/gain을 preset에서 지정할 수 있게 하여 v2의 짧은 confirmation tick을 직접 기록.
- `Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json`
  - `criticalHit` OGG/MP3 bytes/SHA/source/notes를 v2로 갱신.

## 실행 명령 및 결과

- `test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING`
  - 결과: `GSTACK_OK`
- `git status --short --branch`
  - 시작 시 unrelated dirty: `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`, `Developer/r3f_prototype/src/components/GraphicsStudio.test.jsx`
  - 최종 상태에는 다른 프로필/동시 작업으로 보이는 unrelated dirty 파일들이 추가 관측됐고, 본 작업은 criticalHit asset/generator/provenance/report 파일만 대상으로 했다.
- `FFMPEG_BINARY='C:/Users/admin/AppData/Local/Temp/soundmini_ffmpeg_static/node_modules/ffmpeg-static/ffmpeg.exe' python scripts/generate_sfx_refresh.py events/criticalHit`
  - 결과: `events/criticalHit: ogg=5223 mp3=2135`, `generated=1`
- `python - <<'PY' ... bytes/sha256 ... PY`
  - 결과: criticalHit OGG/MP3 bytes/SHA 확인 및 `title_bgm.m4a` 정본 유지 확인.

## 보존 경계

- `title_bgm.m4a` 경로/bytes/SHA 유지:
  - `Developer/r3f_prototype/src/assets/audio/title_bgm.m4a`
  - bytes `998122`
  - SHA-256 `991bf9871fe70b55852920390b3b1434892cfc50da79d3e8fd900062b191cffe`
- 사용자 지시대로 tests/build/browser/commit/push는 수행하지 않았다.
- unrelated dirty files는 수정하지 않았다.
