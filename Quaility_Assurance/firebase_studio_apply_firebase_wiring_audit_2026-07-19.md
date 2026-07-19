# Graphics Studio Apply·Firebase 단일 저장 배선 감사

검사일: 2026-07-19  
대상 브랜치: `zombie_only`

## 최종 판정

1. 2026-07-18에 중단된 300회 테스트는 `Studio 수치변형 = 인게임 즉시적용 = 타이틀 즉시적용`을 확인한 테스트가 아니다.
2. 별도의 2026-07-19 Firebase 패리티 테스트는 11개 실제 게임 모델에 대해 Firebase 저장값을 게임과 타이틀이 동일하게 소비하는 것을 모델별 300회, 총 3,300회 확인했다.
3. Graphics Studio의 72개 등록 항목과 다섯 데이터셋은 Firebase snapshot에 저장되고 같은 구조로 읽힌다.
4. 기존 구현에는 슬라이더를 움직이는 즉시 공용 실행 상태와 Firebase 저장을 요청하는 결함이 있었다.
5. 현재 구현은 Studio 입력을 초안으로만 유지하고, `Apply`를 누른 뒤 Firebase 저장이 성공해야만 공용 실행 상태와 게임·타이틀을 갱신한다.
6. Firebase 인증·초기 읽기·Apply 저장 중 하나라도 실패하면 실행 상태를 갱신하지 않고 `Firebase 저장 불가` 팝업을 표시한다.
7. 로그인 사용자의 지속 보존 대상 게임 데이터는 `users/{uid}` Firebase 경로만 사용한다. 브라우저 durable storage(localStorage, sessionStorage, IndexedDB)는 사용자 데이터 키에 대해 실행 중 치명적 오류로 차단된다.

## 1. 2026-07-18 테스트 기록 검사

`Quaility_Assurance/graphics_studio_300x_2026-07-18/progress.ndjson`의 종료 기록:

```json
{"recordType":"summary","status":"aborted","completedIterations":0,"reason":"active_page_lost"}
```

같은 실행의 보고서에도 다음 내용이 기록돼 있다.

- 실제 실행 회차: 0
- Pass / Fail: 0 / 0
- Apply 사용 횟수: 0
- 이전 E04 1회 변형·복원은 `incomplete_prior_attempt`로 제외

따라서 7월 18일 실행을 게임·타이틀 즉시 적용의 완료 증거로 사용하면 안 된다.

## 2. Firebase Studio 데이터 배선

정본 경로:

```text
studioWorkspaces/v1/users/{uid}/current
```

저장 snapshot의 다섯 데이터셋:

- `tunings`: Graphics 탭 모델·파츠의 크기, 위치, 회전, 외곽선, 색상, 애니메이션 등
- `sfxTunings`: Audio 탭 수치
- `stageBossPreview`: 스테이지 보스 카드 미리보기 확대·이동 수치
- `decals`: 텍스처 데칼 배치
- `propPlacements`: 맵 소품 배치

전체 흐름:

```text
Firebase 로그인
→ Firebase current 읽기
→ 공용 Firebase Studio runtime 생성
→ Studio·게임·타이틀이 같은 runtime/revision 소비

Studio 입력
→ Studio 내부 초안만 변경
→ Apply
→ Firebase transaction 저장
→ 저장 성공 revision 확인
→ 공용 runtime 갱신
→ 게임·타이틀 동일 revision 다시 렌더링
```

Firebase 저장 전에는 게임·타이틀 runtime을 바꾸지 않는다. Firebase 저장 실패 후에도 runtime을 바꾸지 않는다.

## 3. 등록 항목 전수 확인

`GRAPHICS_STUDIO_CATALOG`에 등록된 72개 항목 각각에 서로 다른 최신 tuning을 넣고 다음 왕복을 검사했다.

```text
등록 항목 tuning
→ Firebase 저장 형식 인코딩
→ Firebase 읽기 형식 디코딩
→ hydrate
→ 72개 ID와 모든 수치의 완전 일치 확인
```

테스트: `Developer/r3f_prototype/src/lib/firebaseStudio.test.js`

게임과 타이틀의 실제 모델 소비 경로는 Player, E01~E06, B01~B04 총 11개 모델에 대해 각 300회, 총 3,300회 확인했다.

테스트: `Developer/r3f_prototype/src/lib/firebaseStudioParity300.test.jsx`

## 4. Apply 동작

수정 전 결함:

- 슬라이더 `onChange`가 공용 tuning을 즉시 변경했다.
- 입력 중 Firebase 저장 큐를 즉시 요청했다.
- Apply 성공 전에도 게임 동기화 이벤트가 발생할 수 있었다.

수정 후:

- 슬라이더, 파츠, 데칼, 보스 미리보기, 오디오는 초안만 변경한다.
- Apply가 현재 Firebase runtime과 해당 초안을 합쳐 완전한 다섯 데이터셋 snapshot을 만든다.
- 인증된 사용자와 성공한 Firebase hydrate가 없으면 저장을 시작하지 않는다.
- Firebase transaction이 `saved`를 반환한 뒤에만 해당 revision을 공용 runtime에 적용한다.
- 그 뒤 게임·타이틀 동기화를 발생시킨다.
- 쓰기 실패 시 초안 외의 상태는 그대로 유지하고 저장 불가 팝업을 표시한다.

구현: `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`

## 5. 로그인 사용자 데이터 Firebase 단일 저장

정본 경로:

```text
users/{uid}
```

지속 보존 대상:

- 프로필: uid, 표시 이름, 닉네임
- 보유 골드
- 플레이 기록과 스테이지 클리어 기록
- 무기 해금
- 무기 영구 강화
- 패시브 강화
- 타이틀 설정
- 마지막 플레이 활동

게임 진입 전 Firebase hydrate가 성공해야 한다. 원격 사용자 snapshot이 없거나 읽기에 실패하면 로컬 기본값을 Firebase로 올리지 않고 진입을 차단한다.

`installPlayerStorageFatalGuard()`는 사용자 지속 데이터 키를 localStorage, sessionStorage, IndexedDB에서 읽거나 쓰려는 시도를 차단한다.

`adminConfig.js`의 localStorage는 개발자용 Firebase 프로젝트 설정이며 로그인 사용자의 게임 데이터 경로가 아니다.

이번 검사에서 `titleSettings.unlockAllStagesCheat`가 실행 snapshot에는 포함되지만 Database Rules에는 허용되지 않았던 규칙 불일치도 발견했다. 규칙에 boolean 필드를 추가하고 테스트했다.

## 6. 검증 결과

관련 회귀 테스트:

```text
Test Files  12 passed
Tests       130 passed
```

프로덕션 빌드:

- Vite build 통과
- Legacy B02 source gate 통과
- Legacy B02 artifact gate 통과

`git diff --check`는 이번 Firebase 변경이 아니라 동시에 작업 중인 Stage 4 파일의 기존 trailing whitespace 때문에 전체 저장소 기준으로 실패했다. 해당 파일은 이번 요청 범위 밖이라 수정하지 않았다.

## 7. 배포 상태

애플리케이션 코드와 Database Rules 수정은 작업 트리에 구현돼 있다.

Firebase CLI를 `zard5388@gmail.com` 계정으로 재인증하고 대상 프로젝트가 `escape-zombie-school`임을 확인했다.

```text
database: rules syntax for database escape-zombie-school-default-rtdb is valid
database: rules for database escape-zombie-school-default-rtdb released successfully
Deploy complete
```

따라서 `unlockAllStagesCheat` 규칙 수정을 포함한 Realtime Database Rules가 실제 Firebase 프로젝트에 반영됐다.
