# Sound_Mini research start result — 2026-07-04

Project: Escape! zombie school
Profile: `soundmini` / Sound_Mini / 소리미니
Scope: 무료·저용량·최소스펙 게임 사운드와 음성 R&D 1차 시작 기록

## 1. 이번 카드에서 확인한 정본

- Project policy: `project_develop_policy.md`
- Project agent routing: `AGENTS.md`
- Agent Room wiring: `Developer/agent_room/subagent_system_wiring_2026-07-03.md`
- Sound_Mini project doc: `Developer/agent_room/soundmini_free_game_audio_rnd_2026-07-04.md`
- Global profile: `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Sound_Mini.toml`
- Existing Sound_Mini knowledge:
  - `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_sound_voice_rnd_specialist/knowledge/knowledge_base.md`
  - `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_sound_voice_rnd_specialist/knowledge/source_index.md`
  - `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_sound_voice_rnd_specialist/knowledge/iterations/2026-07-04_initial_free_low_spec_audio.md`

## 2. Source categories for first iteration

1. Procedural SFX / 직접 합성
   - WebAudio API, ZzFX, jsfxr, sfxr, Bfxr, ChipTone 계열.
   - 출시 후보 라이선스 위험이 가장 낮다. 사운드 파라미터와 생성 코드를 프로젝트가 직접 소유할 수 있다.

2. 8-bit / chiptune 원리 참고
   - NES APU, Game Boy audio 같은 공개 기술 문서에서 pulse / triangle / noise / envelope / 제한된 채널 설계 원리만 참고한다.
   - Nintendo, Sega, 기존 게임 음원 자체는 복제하지 않는다.

3. 짧은 BGM loop 제작 도구
   - BeepBox, FamiStudio, Bosca Ceoil, Furnace Tracker.
   - 15~30초 루프를 먼저 만들고 OGG/Opus/AAC/MP3 fallback을 비교한다.

4. 편집과 압축
   - Audacity, FFmpeg, Ogg Vorbis, Opus.
   - 모바일 최소스펙 기준으로 mono, 22.05kHz 또는 24kHz, 짧은 decay를 우선 검토한다.

5. 무료 외부 에셋 후보
   - Kenney audio, OpenGameArt, Freesound, Sonniss GDC bundle, Pixabay, Mixkit, 99Sounds.
   - 단, 외부 에셋은 사이트 단위가 아니라 개별 파일 단위로 license/source/author/URL/date를 기록해야 한다.

6. Voice bark / pseudo voice
   - 긴 성우 대사보다 0.2~0.8초 감탄사, 텍스트 blip, gibberish voice를 우선한다.
   - 실제 인물·배우·유명 캐릭터 음성 모사는 출시 후보에서 금지한다.

## 3. License-safe default policy

- 1순위: 직접 WebAudio/ZzFX/jsfxr 파라미터 생성.
- 2순위: 직접 녹음 후 강한 스타일화(bitcrush, pitch shift, filter).
- 3순위: CC0/public-domain 외부 소스.
- 조건부: CC-BY는 크레딧 파일과 스토어 표기 준비가 있을 때만 후보.
- 차단: NC, GPL/SA, 불명확 license, Nintendo/Sega/타 게임 음원 복제, 실제 인물 음성 모사.

## 4. Escape! zombie school first implementation hypotheses

1. Runtime procedural-first SFX
   - UI click/back/confirm, pickup, enemy hit/die, boss warning은 파일 없이 WebAudio 또는 ZzFX 파라미터로 시작한다.
   - 이 방식은 다운로드 용량을 줄이고 라이선스 기록을 단순화한다.

2. Informational sound priority
   - 플레이 정보성이 높은 순서: player_hit, low_hp, level_up, boss_warning, pickup, enemy_die, UI confirm.
   - 장식성 ambience보다 플레이 판단에 도움 되는 소리를 먼저 만든다.

3. Small initial sound budget
   - UI 4개, Player 4개, Enemy 3개, Weapons 5~6개, Result 2개, BGM 2~3개, pseudo voice 5개 이하.
   - 모든 SFX는 0.03~0.4초, 징글은 1~5초 안에서 우선 설계한다.

4. Mobile web constraints
   - 첫 터치/클릭에서 AudioContext unlock/resume.
   - BGM/SFX 볼륨 분리, mute 상태 저장.
   - 동일 SFX spam 방지를 위한 cooldown, priority, voice stealing 필요.

5. Voice direction
   - “아!”, “헉!”, “좋아!”, zombie_groan_blip 같은 짧은 bark로 감정만 전달한다.
   - 긴 한국어/영어 대사는 현지화·녹음·반복 피로도 비용이 커서 후순위다.

## 5. Blockers / risks

- 일본 닌텐도·세가·인디 커뮤니티 세부 출처는 아직 1차 문헌 수준으로만 정리됨. 다음 반복에서 일본어 키워드와 합법적 공개 기술/개발자 자료를 보강해야 한다.
- 현재 게임 코드의 실제 오디오 삽입 지점은 아직 조사하지 않았다. 이번 카드는 코드 수정 금지이므로 구현 파일을 변경하지 않았다.
- 외부 무료 에셋은 license가 섞여 있으므로, release candidate에 넣기 전 개별 파일별 증빙 표가 필요하다.
- pseudo voice를 실제 인물처럼 들리게 만들면 권리·초상·음성 모사 리스크가 생긴다. 추상적 blip/gibberish로 제한한다.

## 6. Next research slices

1. `soundmini`: WebAudio/ZzFX 기반 SFX parameter sheet 작성
   - 대상: ui_click, player_hit, enemy_die, pickup_xp, level_up, boss_warning.
   - 산출물: `Developer/agent_room/soundmini_sfx_parameter_sheet_YYYY-MM-DD.md`.

2. `soundmini`: external audio source license matrix 작성
   - Kenney/OpenGameArt/Freesound/Sonniss/Pixabay/Mixkit/99Sounds를 release-safe 기준으로 분류.
   - 산출물: `Developer/agent_room/soundmini_audio_license_matrix_YYYY-MM-DD.md`.

3. `soundmini` + `balanceqa`: audio QA checklist 작성
   - 모바일 unlock, mute, 반복 피로도, 동시 재생 제한, 이어폰/스피커 확인.
   - QA 산출물은 `Quaility_Assurance/`에 둔다.

4. `soundmini` + implementation profile if requested later
   - 현재 코드의 오디오 삽입 지점 조사 후 최소 SFX manager 제안.
   - 이번 카드에서는 코드 변경 금지라 조사/구현을 진행하지 않는다.

## 7. Commands / verification

- `git status --short --branch`
  - 목적: 기존 변경과 새 산출물 범위 확인.
  - 주의: 이 카드 시작 전부터 다른 미커밋 변경이 존재했다. 본 카드의 의도된 새 산출물은 이 파일 하나다.

## 8. Result

Sound_Mini의 첫 무료·저용량 게임 오디오 R&D 루프는 `procedural-first`, `short chiptune loop`, `pseudo-voice`, `CC0/direct-source`, `mobile unlock/voice limit` 기준으로 시작한다. 다음 단계는 실제 SFX 파라미터 표와 license matrix를 작게 나눠 누적하는 것이다.
