# Sound_Mini 기록 — 텀블러 유효 피해 둔탁한 타격음

- 담당: soundmini
- Kanban: `t_69ffc042`
- 날짜: 2026-08-18
- 범위: `Developer/r3f_prototype` 텀블러가 실제 적에게 유효 피해를 준 경우에만 `tumblerHit` 1회 재생 회귀 고정

## 라우팅 확인

- Mandatory pre-command checker 실행 결과: `matched_domains=["audio"]`, `match_evidence=[{"domain":"audio","keyword":"sfx"}]`
- `combined_receipt_sha256`: `f177895d8582185d5fe93b66b393530c2d48af1d56e4f93454bc0d985074909c`
- 필독 문서: checker의 `read_required` 목록과 soundmini 필수 문서를 읽고 진행했다.

## 구현 판정

`src/components/Weapons/Tumbler.jsx`의 현재 런타임 seam은 다음 순서를 따른다.

1. `scanOrbitEnemiesInto(...)`로 텀블러 궤도 안의 후보를 수집한다.
2. 적별/세대별 hit interval을 통과한 후보만 `applyEnemyHit(...)`에 넘긴다.
3. `applyEnemyHit(...)`가 `true`를 반환한 실제 유효 피해 성공 뒤에만 `emitSfx({ id: 'tumblerHit', ... })`를 실행한다.
4. 같은 성공 적중 1건당 emit은 1회이고, 실패/빗나감/피해 거절은 emit하지 않는다.

## 자산/라이선스

- 기존 자산 재사용: `Developer/r3f_prototype/public/sfx/weapons/tumblerHit.ogg`, `tumblerHit.mp3`
- 레지스트리 연결: `src/lib/sfxRegistry.js` `SOUND_MAP.tumblerHit = '/sfx/weapons/tumblerHit.ogg'`
- 생성기 출처: `scripts/generate_sfx_refresh.py`, `weapons/tumblerHit` = `muted_tumbler_donk`
- 외부 음원/타 게임 음원/불명확 라이선스 음원 도입 없음. 프로젝트 직접 합성 자산만 사용.

## 자산 측정

- OGG magic: `OggS`
- OGG bytes: `5,542`
- OGG pages: `3`
- OGG final granule: `9,040`
- duration: `9,040 / 44,100 = 0.2049886621s`
- 생성 PCM 기준 peak: `0.5454573199` (`-5.2648 dBFS`)
- 생성 PCM 기준 RMS: `0.1483643092` (`-16.5734 dBFS`)
- 참고: 이 환경에는 `ffmpeg`가 없어 OGG 디코드 후 실측 peak/RMS는 수행하지 못했고, 동일 생성기 파라미터와 seed의 PCM 합성값으로 peak/RMS를 계산했다.

## 변경 범위

- 런타임 구현: 기존 `Tumbler.jsx`의 `applyEnemyHit(...)` 성공 뒤 `tumblerHit` emit seam을 그대로 사용했다.
- 테스트 보강: `src/components/Weapons/Tumbler.test.jsx`에 실제 프로덕션 프레임 루프 실행 하네스에서 emit 이벤트를 수집하도록 보강하고, 실패 hit 0회 / 성공 hit 1회를 검증했다.
- activation(`tumblerFire`), explosion, critical, 다른 무기 SFX는 변경하지 않았다.
- 사용자 변경 금지 범위인 `CompassBlade*`, `compassBlade.js`, `weaponCatalog*`, `weaponPermanentUpgrades.test.js`는 수정하지 않았다.

## 실행한 검증

```text
powershell -NoProfile -ExecutionPolicy Bypass -File D:/JungSil/2.Minigame_project/school_survivor-integration/Developer/agent_room/mandatory_precommand/check-required-documents.ps1 -Profile soundmini -Domain auto -TaskSummary "tumbler enemy damage impact sfx"
test -d ~/.claude/skills/gstack/bin && echo GSTACK_OK || echo GSTACK_MISSING
git status --short --branch
npm test -- src/components/Weapons/Tumbler.test.jsx src/lib/sfxRegistry.test.js src/components/Weapons/WeaponHitSfx.test.jsx
```

## 현재 확인 결과

- 집중 테스트: 3 files / 41 tests 통과.
- `npm run build` 통과: prebuild gates, Studio sync tests 4 files / 41 tests, Vite production build, dist legacy B02 artifact gate, hosting asset verification 통과. 기존 chunk-size/dynamic-import 경고만 표시.
- scoped `git diff --check -- Developer/r3f_prototype/src/components/Weapons/Tumbler.test.jsx` 통과. Git의 CRLF 안내 경고는 표시됐지만 whitespace 오류는 없었다.
