# Sound_Mini — 전기 스턴건 SFX 볼륨·피치 조정 기록

Date: 2026-10-05
Kanban task: t_bf30ed61
Profile: soundmini
Scope: 전기 스턴건 효과음만 현재 볼륨 x0.5, 현재 피치 x0.7로 조정. 다른 무기, 글로벌 오디오, 타이틀 BGM, 에셋, Firebase는 변경하지 않음.

## 변경 파일

- `Developer/r3f_prototype/src/components/Weapons/StunGun.jsx`
  - `stunGunHit` hit SFX volume: `0.1925` → `0.09625` (현재값의 50%)
  - `stunGunHit` pitch/rate base: `0.64` → `0.448` (현재값의 70%)
  - `stunGunFire` fire SFX: weapon-specific event에서 `volume: 0.5`, `rate: 0.7` 지정
- `Developer/r3f_prototype/src/components/Weapons/WeaponHitSfx.test.jsx`
  - 스턴건 전용 hit/fire SFX 계약 문자열 검증을 새 값으로 갱신
  - 다른 무기 SFX 계약은 변경하지 않음
- `Developer/r3f_prototype/src/lib/sfxRegistry.js`
  - `0.448` 피치가 공용 최솟값 `0.5`로 치환되지 않도록 `stunGunHit` ID에만 재생률 최솟값 `0.25` 적용
  - 다른 SFX의 기존 최솟값 `0.5`와 마스터 볼륨은 유지
- `Developer/r3f_prototype/src/lib/sfxRegistry.test.js`
  - `stunGunHit`가 실제 Howler 호출까지 `volume: 0.09625`, `rate: 0.448`을 그대로 전달하는지 검증

## 보존 경계

- 다른 무기 SFX 파라미터 변경 없음.
- `SfxLayer`, global/master volume, BGM/title audio, `public/sfx`, Firebase 관련 코드 변경 없음.
- Howler registry 변경은 `stunGunHit`의 사용자 지정 피치가 clamp되지 않게 하는 ID 전용 하한 예외뿐이며 다른 SFX 출력은 변경하지 않음.
- 새 오디오 에셋 추가/삭제/교체 없음.
- 커밋, 푸시, 배포 없음.

## 소스 / 라이선스

- 외부 음원, 녹음, 샘플, AI 음성, Nintendo/Sega/타 게임 자산 사용 없음.
- 기존 procedural/event-based SFX playback 파라미터만 조정했으므로 신규 라이선스 검토 대상 에셋 없음.

## 실행 명령 및 결과

```text
powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile soundmini -Domain auto -TaskSummary 'electric-stungun-sfx-volume-pitch'
=> exit 0, resolved_domains: common/audio, matched_domains: audio, combined_receipt_sha256: b5e470b56a979b646a3fca297b710f56d714385babe9e2cd1714b548b56f7eb0

test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
=> GSTACK_OK

git status --short --branch
=> branch zombie_only, 기존 dirty worktree 다수 확인; 이번 작업은 scoped 파일만 변경

npm test -- src/components/Weapons/WeaponHitSfx.test.jsx --runInBand
=> 실패: Vitest가 --runInBand 옵션을 지원하지 않음(CACError Unknown option)

npm test -- src/components/Weapons/WeaponHitSfx.test.jsx
=> PASS: 1 file, 7 tests

npm test -- --run src/components/Weapons/WeaponHitSfx.test.jsx src/components/SfxLayer.test.jsx src/lib/sfxRegistry.test.js
=> PASS: 3 files, 39 tests

git diff --check -- Developer/r3f_prototype/src/components/Weapons/StunGun.jsx Developer/r3f_prototype/src/components/Weapons/WeaponHitSfx.test.jsx Developer/r3f_prototype/src/lib/sfxRegistry.js Developer/r3f_prototype/src/lib/sfxRegistry.test.js
=> PASS: whitespace error 없음
```

## 차단 사항

- 없음. 단, 작업 트리에는 이번 범위 밖의 기존 modified/untracked 파일이 다수 있어 보존함.
