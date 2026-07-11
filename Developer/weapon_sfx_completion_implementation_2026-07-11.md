# 16종 무기 동작 SFX 보완 구현

작성: 2026-07-11 KST

## 범위

- `WEAPON_CATALOG` 16종의 발사·시작, 직접 타격, 연쇄, 반사, 지속 틱, 광역 충돌, 폭발 동작을 점검했다.
- Sound_Mini 감사 정본은 `Developer/agent_room/soundmini_weapon_sfx_audit_2026-07-11.md`다.
- 공격력, 공격 주기, 범위, 타겟팅, 그래픽, 해금 규칙은 변경하지 않았다.

## 구현

- 기존에 등록만 되어 있던 15종 무기 타격음을 실제 성공 타격·폭발 시점에 연결했다.
- `flaskTick`, `lanternTick`은 새 음원 파일 없이 기존 짧은 프로젝트 음원의 별도 이벤트 ID로 재사용했다.
- 학생용 랜턴의 잘못된 `pencilHit` 재사용을 `lanternTick`으로 교체했다.
- 전기 무기는 실제 타겟을 찾은 뒤에만 발사음이 나도록 순서를 바로잡았다.
- 나침반 칼날은 활성화 시작음과 접촉음을 연결하고 기존 5스택 폭발음을 유지했다.
- 광역 공격은 적 수만큼 소리를 내지 않고 공격 또는 폭발 단위로 한 번만 재생한다.
- 다중 투사체·관통·연쇄·지속 공격의 중첩음을 줄이기 위해 무기 이벤트 20개에 35~650ms 폴리포니 쿨다운을 추가했다.
- 기존 OGG/MP3 33쌍을 재사용했으며 새 오디오 파일이나 외부 에셋은 추가하지 않았다.

## 변경 영역

- `Developer/r3f_prototype/src/lib/sfxRegistry.js`
- `Developer/r3f_prototype/src/components/Weapons/*.jsx` 중 런타임 무기 16종
- `Developer/r3f_prototype/src/lib/sfxRegistry.test.js`
- `Developer/r3f_prototype/src/components/Weapons/WeaponHitSfx.test.jsx`
- `Developer/r3f_prototype/src/components/Weapons/AoeWeaponSfx.test.jsx`
- 기존 랜턴·플라스크 테스트

## 검증

- 구현 통합 집중 테스트: 16 files, 81 tests passed.
- 리뷰 후속 집중 테스트: 7 files, 32 tests passed.
- Production build: passed.
- 전체 테스트: 671개 중 669개 통과. 기존 Stage 2 복도 위치·시간 설정 불일치 테스트 2개만 실패했으며 무기 SFX 변경과 무관하다.
- 정적 diff 검사에서 게임 밸런스 수치 변경이 없음을 확인했다.
- 코드 리뷰에서 발견한 30cm 자의 사망 대상 유령 타격음을 수정하고 실제 컴포넌트 테스트를 추가했다.
- 무기 쿨다운 20개 전체의 경계값과 `emitSfx → SfxLayer → playSfx`의 rate 전달을 실행형 테스트로 확인했다.

## 잔여 위험

- 자동 검증으로 이벤트 배선과 중첩 제한은 확인했지만 실제 모바일 스피커 청음은 수행하지 못했다.
- 기존 음원 전체의 출시용 자산 provenance manifest는 아직 미완료다. 이번 작업에서는 기존 프로젝트 음원만 재사용했다.

커밋·푸시·스토어 제출은 수행하지 않았다.
