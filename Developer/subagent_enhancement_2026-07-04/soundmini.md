# Sound_Mini 금일 30분 고도화 결과 — 2026-07-04 18:58 KST

## 범위

- 대상 프로필: `soundmini` / Sound_Mini / 소리미니
- 요청: 나머지 서브에이전트 금일 모두 고도화 작업 각 30분씩 시작 중, Sound_Mini 자체 30분 capability-hardening iteration
- 변경 금지: 코드 수정, 배포, 커밋, 외부 메시지 전송 없음
- 참조 파일:
  - `AGENTS.md`
  - `project_develop_policy.md`
  - `Developer/agent_room/subagent_system_wiring_2026-07-03.md`
  - `Developer/agent_room/soundmini_free_game_audio_rnd_2026-07-04.md`
  - `Developer/GOOGLE_SIGN_IN_MAINTENANCE_CHECKLIST_AI_AGENT_READY.md`
  - `Developer/r3f_prototype/src/lib/sfxRegistry.js`
  - `C:/Users/admin/AppData/Local/hermes/sub-agent-room/agents/Sound_Mini.toml`
  - `C:/Users/admin/AppData/Local/hermes/sub-agent-room/global-agent-room/minigame_sound_voice_rnd_specialist/*`

## 오늘 강화한 운영 규칙

### 1. Google Sign-In 유지보수 체크리스트의 사운드 도메인 반영

Google Sign-In 자체는 `backendmini`/`launchmini`의 1차 영역이지만, 사운드 레이어는 로그인 실패 체감을 악화시킬 수 있으므로 다음만 Sound_Mini 영역에 편입한다.

- 로그인/계정 연동 화면에서는 BGM·반복 경고음·보이스 bark를 자동 재생하지 않는다.
- 로그인 진행 중에는 UI 클릭음만 짧게 허용하고, 무한 스피너나 실패 루프를 사운드로 덮어 숨기지 않는다.
- `DEVELOPER_ERROR`, 네트워크 실패, 취소, 타임아웃 같은 계정 이벤트는 사운드가 아니라 명확한 텍스트/UI 피드백이 주가 되어야 한다.
- 로그인 실패 후 게스트 진행/재시도 UI로 돌아올 때 사운드는 non-blocking이어야 한다. 즉, AudioContext unlock 실패나 SFX 로드 실패가 인증 흐름을 막으면 안 된다.
- 릴리스 전 Google 로그인 QA 매트릭스에 “소리 끔/켬, 첫 터치 전/후, 앱 복귀 후” 오디오 상태를 곁들여 체크한다.

### 2. 현재 프로젝트 SFX 레지스트리 관찰

`Developer/r3f_prototype/src/lib/sfxRegistry.js` 확인 결과:

- Howler 기반 지연 생성 구조이며, 파일 로드 실패 시 `_failed`에 넣고 이후 무음 실패 처리한다.
- OGG 우선, MP3 fallback 구조가 있다.
- 일부 정보성 SFX(`playerHit`, `coinCollect`, `zombieDeath`)에는 쿨다운이 있다.
- 현재 코드 수정은 하지 않았다.

사운드 관점에서 좋은 점:

- 에셋 누락 시 게임 흐름을 막지 않는 무음 실패 설계는 로그인/릴리스 안정성에도 맞다.
- OGG/MP3 fallback은 브라우저 호환성 측면에서 안전하다.

추가 개선 후보:

- 로그인/계정 화면에서 `playSfx` 호출을 제한하는 상태 가드(`authOverlayActive` 또는 `sfxCategoryAllowlist`)를 UI/Backend와 합의한다.
- 전역 mute/volume 상태가 신규 Howl 생성 시점에도 일관되게 반영되는지 테스트가 필요하다.
- 소리 필수 플레이를 피한다는 마케팅 방향(`no sound required`)에 맞춰 모든 핵심 위협은 시각 피드백 우선, 사운드는 보조 피드백으로 유지한다.

## Sound_Mini 도메인 체크리스트 추가안

릴리스/로그인 QA 시 Sound_Mini가 확인할 항목:

| ID | 항목 | 기준 |
|---|---|---|
| SM-AUTH-01 | 로그인 화면 자동음 금지 | 첫 사용자 조작 전 BGM/SFX 자동 재생 없음 |
| SM-AUTH-02 | 인증 실패를 사운드로 은폐 금지 | 실패/타임아웃은 텍스트와 버튼 복귀가 우선 |
| SM-AUTH-03 | SFX 실패가 Auth를 막지 않음 | Howler/WebAudio 실패 시 로그인 플로우 정상 진행 |
| SM-AUTH-04 | 무음 플레이 가능성 | Google 로그인/게스트 진입/튜토리얼이 음소거 상태에서도 이해됨 |
| SM-AUTH-05 | 복귀/재시도 상태 | 앱 복귀 또는 로그인 재시도 후 AudioContext/Howler 상태가 중복 재생·폭주하지 않음 |

## 리스크

1. `soundmini_wiring_check_2026-07-04.md`에 `C:/Users/admin/AppData/Local/hermes/profiles/soundmini/home/SOUL.md` 누락 메모가 남아 있다. Kanban 실행은 확인된 상태지만, 향후 worker bootstrap 정책이 SOUL을 요구하면 프로필 위생 리스크가 된다.
2. 실제 iOS/Android 기기에서 AudioContext/Howler 상태와 Google 로그인 복귀 상태를 함께 검증하지 않았다.
3. 현재 작업은 코드 변경 없이 운영 규칙·체크리스트 고도화에 한정했다.

## 다음 추천 작업

`uimini`/`backendmini`와 함께 Google 로그인 화면 상태(`idle/loading/success/fail/guest`)별로 허용 SFX 목록을 1페이지 표로 확정하고, 이후 `sfxRegistry` 또는 UI 호출부에 테스트 가능한 auth-overlay 사운드 가드를 추가한다.
