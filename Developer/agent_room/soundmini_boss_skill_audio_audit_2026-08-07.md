# SoundMini 보스 스킬 오디오 감사

- 날짜: 2026-08-07
- 프로젝트: Escape! zombie school
- 역할: `soundmini` 오디오 범위 감사 및 구현 전 핸드오프
- 범위: B01~B04 보스 스킬 문서, 현재 SFX registry/자산/발화 지점/테스트의 읽기 전용 점검
- 비범위: 런타임 코드, `public/sfx/**`, Firebase, 브라우저, 커밋·푸시. `title_bgm.m4a`는 읽거나 변경하지 않았다.

## 결론

**정본 보스 스킬 요구 중 보스별 특수기 SFX·포효·텔레그래프 음을 의무화한 항목은 없다.**

`Planner/boss_skill_authoritative_inventory_and_gap_map_2026-08-07.md:9`는 B01 특수기, B02/B03 공통 돌진, B04 포격→격노 돌진이 이미 구현돼 새로 구현할 미구현 스킬 목록이 없다고 판정한다. 같은 문서는 행동 SFX가 아직 연결되지 않은 *부분 갭*임을 기록하지만(`Planner/boss_skill_authoritative_inventory_and_gap_map_2026-08-07.md:16`), 그 자체는 어떤 ID·볼륨·쿨다운도 승인하지 않는다.

따라서 이 감사는 다음을 구분한다.

| 구분 | 판정 |
|---|---|
| 보스 공통 입장/경고/사망/클리어 SFX | 현재 등록·자산·런타임 발화가 있음 |
| B01 삼각자, B02/B03 돌진, B04 포격·격노의 신규 행동 SFX | 필요 여부/정확한 cue가 정본에서 미결정 |
| 새 자산 또는 registry 수치 추가 | soundmini 승인과 별도 구현 카드가 생기기 전 금지 |

## 보스 스킬별 정본 근거와 오디오 요구 판정

| 보스 | 정본 스킬 근거 | 오디오에 대한 명시 | 판정 |
|---|---|---|---|
| B01 수학 선생 | 삼각자 준비 320ms → 충격 → 회복 430ms → 기절; `Planner/boss_skill_authoritative_inventory_and_gap_map_2026-08-07.md:44` | 같은 줄이 spawn/death 공통 SFX만 있고 삼각자 전용 SFX 요구/자산은 없다고 명시 | **전용 SFX 의무 없음** |
| B02 Stage 2 | 공통 차저만; `Planner/boss_skill_authoritative_inventory_and_gap_map_2026-08-07.md:45` | 전용 스킬/투사체 요구 없음. 공통 charge cue/SFX만 서술 | **고유 SFX 의무 없음** |
| B03 체육 교사 | B02와 동일 공통 차저; `Planner/boss_skill_authoritative_inventory_and_gap_map_2026-08-07.md:46` | 공통 charge cue/SFX만 서술, B03 고유 스킬 없음 | **고유 SFX 의무 없음** |
| B04 주방장 | P1 포격, HP 50% 전환 1,000ms 텔레그래프 후 P2 차저; `Planner/boss_skill_authoritative_inventory_and_gap_map_2026-08-07.md:47` | 공통 보스 SFX만 있고 포격/격노 전용 SFX 요구 없음 | **전용 SFX 의무 없음** |

`Planner/boss_skill_authoritative_inventory_and_gap_map_2026-08-07.md:105`도 B04 전용 SFX의 정확 수치가 정본에서 발견되지 않았으므로 추정 구현을 금지한다. B02 시각 경로는 `docs/solutions/integration-issues/stage2-boss-v2-no-legacy-gate.md:15-18`의 v2 단일 정본을 그대로 유지해야 하며, 이 오디오 감사는 B02 모델·Studio·저장 경로를 바꾸지 않는다.

## 현재 승인·등록된 공통 보스 cue와 실제 발화

아래는 이미 `SOUND_MAP`과 provenance manifest에 들어 있고, 해당 경로의 OGG/MP3 쌍이 존재함을 manifest 검사로 확인한 cue다. 이는 **새 행동 연결이 승인됐다는 뜻은 아니다.**

| cue | 등록 자산·근거 | 현재 게임 발화 | 재사용 상태 |
|---|---|---|---|
| `bossWarning` | `Developer/r3f_prototype/src/lib/sfxRegistry.js:89`; `Developer/agent_room/soundmini_sfx_parameter_sheet_2026-07-05.md:79` | 보스 등장 3초 카운트다운 및 대형 스폰 경고에서 발생: `Developer/r3f_prototype/src/components/HUD.jsx:621-627`, `:669-679` | 기존 경고용으로만 승인·사용 중 |
| `bossSpawn` | `Developer/r3f_prototype/src/lib/sfxRegistry.js:90`; parameter sheet `:80` | 모든 B01~B04가 `isBossType`으로 같은 spawn cue를 얻음: `Developer/r3f_prototype/src/components/Enemy.jsx:189-201`; 중복 발화를 막는 소유권 테스트: `Developer/r3f_prototype/src/components/Enemies.test.jsx:743-751` | 기존 보스 등장용으로 재사용 완료 |
| `bossDeath` | `Developer/r3f_prototype/src/lib/sfxRegistry.js:75` | 모든 보스 사망에 선택: `Developer/r3f_prototype/src/components/Enemy.jsx:295-299`, 실제 death emit: `Developer/r3f_prototype/src/components/Enemy.jsx:676` | 기존 보스 사망용으로 재사용 완료 |
| `bossClearJingle` | `Developer/r3f_prototype/src/lib/sfxRegistry.js:96`; parameter sheet `:87` | 마지막 생존 보스만 1회 발화: `Developer/r3f_prototype/src/store/useGameStore.js:719-732`; 단일 발화 테스트: `Developer/r3f_prototype/src/store/useGameStore.test.js:122-136` | 기존 보스 클리어용으로 재사용 완료 |
| `bossRoar` | `Developer/r3f_prototype/src/lib/sfxRegistry.js:67`; parameter sheet `:81` | 현재 실제 게임 전투에서는 발화하지 않고, 로비 B01 쇼타임에서만 사용: `Developer/r3f_prototype/src/components/Lobby.jsx:38-42` | **기술적으로는 재사용 가능하나 행동 연결은 미승인** |

`SfxLayer`가 event bus의 `emitSfx`를 Howler 재생으로 전달한다(`Developer/r3f_prototype/src/components/SfxLayer.jsx:6-15`). `playSfx`는 OGG 우선·MP3 fallback, Firebase 런타임 tuning, 전투 보이스 상한 및 쿨다운을 적용한다(`Developer/r3f_prototype/src/lib/sfxRegistry.js:244-282`).

## 기존 cue만으로 가능한 후보 (승인 전에는 구현 금지)

현재 자산을 더 만들지 않고 행동음을 연결하기로 별도 결정될 때에만 아래 후보를 쓸 수 있다. 이 표는 **정본 요구가 아니라 soundmini의 기술적 재사용 후보**다.

| 행동 상태 | 자산 추가 없는 후보 | 근거와 제약 |
|---|---|---|
| B01/B02/B03/B04 공통 `warn → charge` | `zombieChargeRoar` | 차저 위협 cue로 이미 등록: `Developer/r3f_prototype/src/lib/sfxRegistry.js:65`; parameter sheet가 빠른 적 위협음을 별도 정의: `Developer/agent_room/soundmini_sfx_parameter_sheet_2026-07-05.md:76`. 상태 진입당 한 번만 발화해야 한다. |
| B01 삼각자 충격 | `zombieGiantThud` | 저역 충격 cue로 이미 등록: `Developer/r3f_prototype/src/lib/sfxRegistry.js:66`; parameter sheet `:78`. 전용 삼각자 요구가 없으므로 연결 여부는 별도 승인 사항이다. |
| B04 P1 실제 투사체 발사 | `zombieRangedShoot` | 원거리 공격 cue로 이미 등록: `Developer/r3f_prototype/src/lib/sfxRegistry.js:64`; parameter sheet `:77`. 발사 성공 지점에서 한 번만 발화해야 하며, 투사체 풀/공유 E04 경로에 중복 emit을 추가하면 안 된다. |
| B04 HP 50% 격노 전환 | `bossRoar` | 보스 포효 cue로 이미 등록: `Developer/r3f_prototype/src/lib/sfxRegistry.js:67`; parameter sheet `:81`. 전환은 되돌아가지 않는 단발 상태라는 정본(`Planner/boss_skill_authoritative_inventory_and_gap_map_2026-08-07.md:47`)과 맞춰 정확히 한 번으로 제한한다. |

`bossRoar`, `zombieChargeRoar`, `zombieGiantThud`, `zombieRangedShoot`는 모두 보호 danger cue라 일반 전투 6보이스 상한에서 버려지지 않는다(`Developer/r3f_prototype/src/lib/sfxRegistry.js:115-141`). 다만 이 ID들에는 현재 명시적 `POLYPHONY_COOLDOWN` 값이 없고(`Developer/r3f_prototype/src/lib/sfxRegistry.js:162-198`), parameter sheet의 권장 쿨다운은 출시용 확정값이 아니다. 따라서 다중 호출 가능성이 있는 곳에는 상태 전환의 일회성 가드가 우선이다.

## 라이선스·출처 및 title BGM 경계

- 위 cue의 OGG/MP3는 프로젝트 내부 절차 생성 자산으로 manifest에 `provenanceType: generated`, `licenseEvidence: project-generated-procedural`로 기록돼 있다. 대상 logical ID의 manifest 위치는 `Developer/agent_room/audio_asset_provenance_manifest_2026-07-30.json:866-943`, `:1046-1063`, `:1246-1283`, `:1386-1403`이다.
- 생성기는 외부 의존성 없이 Node 내장 기능과 SFXR 파라미터 기반 합성을 사용한다고 명시한다: `Developer/r3f_prototype/scripts/generate_sfx.mjs:1-12`; boss/enemy/event 정의 위치는 `:301-314`, `:352`, `:438-480`이다.
- 기존 parameter sheet는 개별 파일 제작 원천·라이선스의 출시 후보 provenance 기록이 별도로 필요하다고 주의한다: `Developer/agent_room/soundmini_sfx_parameter_sheet_2026-07-05.md:98-102`. 따라서 외부 CC0/CC-BY/다운로드 음원이나 실성우·실동물 모방 자산을 이 카드에서 추가할 수 없다.
- `title_bgm.m4a`는 영구 정본이며 권리/출처 검토가 교체 권한을 만들지 않는다: `Developer/agent_room/soundmini_title_bgm_canonical_lock_2026-07-31.md:5-7`. 이번 감사는 이 파일과 재생 경로를 건드리지 않았다.
- 읽기 전용 검증 `node Developer/r3f_prototype/scripts/verify-audio-manifest.mjs`는 PASS했다. 이 검사는 75 SFX ID, 150 fallback 파일, canonical title BGM의 크기·SHA-256·manifest 경계를 검증한다: `Developer/r3f_prototype/scripts/verify-audio-manifest.mjs:13-21`, `:50-121`, `:127-131`.

## 구현·테스트 권고 (후속 card 전용)

1. 구현 worker와 soundmini가 먼저 위 후보 중 실제 cue 매핑과 볼륨을 명시 승인한다. 새 파일, `SOUND_MAP` ID, 임의의 cooldown 수치는 이 승인 없이는 추가하지 않는다.
2. 상태 전환을 소유한 `Enemy.jsx`에만 단발 event를 둔다. 현재 공통 차저 전환은 `Developer/r3f_prototype/src/components/Enemy.jsx:908-933`, B01 충격은 `:973-998`에 있고, B04 phase/fire는 `Planner/boss_skill_authoritative_inventory_and_gap_map_2026-08-07.md:47`의 현재 경로를 따라야 한다. `Enemies.jsx`가 보스 spawn cue를 중복 발화하지 않는다는 회귀 계약(`Developer/r3f_prototype/src/components/Enemies.test.jsx:743-751`)을 보존한다.
3. focused test는 각 승인된 행동에서 `emitSfx`가 상태 전환당 정확히 한 번, B04 P2 전환이 재진입하지 않을 때 재발화하지 않음을 검증한다. registry 쪽은 경로 쌍 검증(`Developer/r3f_prototype/src/lib/sfxRegistry.test.js:176-187`)과 보호 cue가 voice cap을 통과하는 검증(`:282-302`)을 유지한다.
4. 현재 정본 inventory가 권장하는 Firebase 비접촉 집중 검증은 `Planner/boss_skill_authoritative_inventory_and_gap_map_2026-08-07.md:69-78`의 vitest 묶음과 build다. 브라우저/실기기 청취 검증은 이 감사 범위 밖이며 별도 QA card에서만 한다.

## 차단 상태와 handoff

- Hermes `soundmini` 실행은 OAuth 401로 차단됐다. 따라서 이 문서는 `Developer/agent_room/`의 secondary specialist trail이며, `Developer/agent_room/escape_zombie_school_subagent_mandatory_wiring_2026-07-25.md:13-25`가 허용하는 Kanban 차단 시 기록 방식에 따른다.
- 차단으로 인해 새 SFX mapping, 런타임 변경, 자산 생성, Firebase 변경, 브라우저 실행, 커밋·푸시는 수행하지 않았다.
- 구현을 계속하려면 soundmini card에서 cue 매핑을 확정한 뒤, 해당 상태 전환에만 최소 연결하고 위의 focused test를 추가해야 한다. 현재 정본만으로는 보스별 전용 SFX를 추가하거나 수치를 추정할 권한이 없다.
