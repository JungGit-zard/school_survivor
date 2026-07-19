# Firebase Graphics Studio → 게임·타이틀 실시간 연동 및 300회 검증 보고서

## 최종 상태

- 기능 구현: 완료
- 모델별 300회 자동검증: 완료
- 실 Firebase 300회 일괄검증: 완료
- 프로덕션 빌드: 통과
- 실 Firebase의 테스트 전 모델값 복구: **실패**
- 전체 작업 판정: **기능 검증 완료 / Firebase 원본 모델값 복구 미완료**

원본 모델값을 복구하지 못했으므로 이 보고서는 프로젝트 상태가 정상 복구됐다고 판정하지 않는다.

## 구현 내용

다음 경로로 Firebase 단일 정본의 새 리비전이 Studio, 게임, 타이틀에 전달되도록 구현했다.

```text
Graphics Studio 입력
  → Firebase Realtime Database transaction 저장
  → Firebase onValue 구독
  → 공용 Firebase Studio runtime 갱신
  → Studio / 게임 / 타이틀에 동일 리비전 이벤트 전달
  → StudioTunedGroup이 동일한 tuning을 즉시 다시 렌더링
```

관련 파일:

- `Developer/r3f_prototype/src/lib/firebaseStudio.js`
- `Developer/r3f_prototype/src/App.jsx`
- `Developer/r3f_prototype/src/components/GraphicsStudio.jsx`
- `Developer/r3f_prototype/src/lib/firebaseStudio.test.js`
- `Developer/r3f_prototype/src/lib/firebaseStudioParity300.test.jsx`
- `Developer/r3f_prototype/src/App.firebaseBootstrap.test.jsx`
- `Developer/r3f_prototype/src/App.virtualJoystick.test.jsx`

저장 또는 로드의 정본으로 localStorage, 로컬 시드, 소스 기본값을 추가하지 않았다.

## 300회 검증 대상

각 모델당 300회, 총 11개 모델과 3,300개 랜덤 tuning을 검증했다.

| 구분 | Firebase Studio ID | 회수 |
|---|---|---:|
| 주인공 | `player` | 300 |
| 일반 좀비 | `zombie-e01` | 300 |
| 일반 좀비 | `zombie-e02` | 300 |
| 일반 좀비 | `zombie-e03` | 300 |
| 일반 좀비 | `zombie-e04` | 300 |
| 일반 좀비 | `zombie-e05` | 300 |
| 일반 좀비 | `zombie-e06` | 300 |
| 보스 | `zombie-b01` | 300 |
| 스테이지 2 보스 | `stage2-boss-v2` | 300 |
| 보스 | `zombie-b03-pe-teacher` | 300 |
| 보스 | `zombie-b04-chef` | 300 |
| 합계 | 11개 | **3,300** |

매 회차에 scale, 축별 scale, position, rotation, outline, opacity, saturation, brightness, emissive intensity를 유효 범위 안에서 난수로 생성했다. 테스트는 다음 항목을 확인했다.

1. Firebase transaction 저장이 성공하고 리비전이 1 증가하는가
2. 저장된 Firebase snapshot에 해당 모델의 정확한 tuning이 들어가는가
3. Firebase 구독 snapshot이 공용 runtime에 즉시 적용되는가
4. 게임과 타이틀 소비자가 같은 리비전의 scale, position, rotation을 동시에 렌더링하는가

## 자동검증 결과

실행 명령:

```text
npm test -- --run src/lib/firebaseStudio.test.js src/lib/firebaseStudioParity300.test.jsx src/App.firebaseBootstrap.test.jsx src/App.virtualJoystick.test.jsx src/components/GraphicsStudio.test.jsx src/components/StudioTunedGroup.test.jsx src/components/PlayerMesh.test.js
```

결과:

```text
Test Files  7 passed (7)
Tests       97 passed (97)
Duration    29.07s
```

`firebaseStudioParity300.test.jsx`의 11개 테스트가 각각 내부에서 300회 반복하므로 모델 tuning 검증 총수는 3,300회다.

프로덕션 검증:

```text
npm run build
```

결과:

- Vite 프로덕션 빌드 통과
- Legacy B02 source gate 통과
- Legacy B02 artifact gate 통과
- 큰 번들 청크 경고만 존재하며 빌드 실패는 없음

별도로 실행했던 전체 테스트 스위트는 기존 다른 영역의 실패가 남아 있다.

```text
Test Files: 103 passed / 28 failed
Tests:      926 passed / 106 failed
Unhandled:  113
```

따라서 이 보고서는 프로젝트 전체 테스트가 모두 통과했다고 주장하지 않는다.

## 실제 브라우저·Firebase 확인

`http://localhost:5173`에서 로그인된 실제 Firebase 계정으로 Player scale을 `1.00 → 1.20 → 1.00`으로 변경해 다음을 확인했다.

- Studio Apply 후 Firebase 저장 상태 표시
- 타이틀 Player 크기 즉시 변경
- 실제 Stage 1 게임 Player 크기 즉시 변경
- `1.00` 재적용 후 게임 화면 즉시 복원

증거 이미지:

- `screenshots/player-studio-before-live-batch.png`
- `screenshots/title-player-before-scale-change.png`
- `screenshots/title-player-scale-120-live.png`
- `screenshots/game-player-scale-120-live.png`
- `screenshots/game-player-scale-100-live.png`

그 뒤 임시 QA 화면에서 매 회차 11개 모델 전체의 랜덤 root tuning을 한 Firebase 리비전에 저장하고 다시 읽어 정확히 비교하는 작업을 300회 실행했다.

```text
phase: passed
iteration: 300
checks: 3300
revision: 611
authStatus: signedIn
authenticated: true
```

증거: `screenshots/live-firebase-300-passed-revision-611.png`

임시 QA 라우트와 컴포넌트는 실행 후 삭제했으며 현재 제품 코드에 남아 있지 않다.

## Firebase 원본값 훼손 사고

실 Firebase에서 랜덤 300회 테스트를 수행한 것은 잘못된 테스트 방법이었다. 격리된 Firebase QA 계정이나 원자적 백업 없이 실제 사용자의 `studioWorkspaces/v1/users/{uid}/current`를 직접 덮어썼다.

발생 순서:

1. 첫 번째 라이브 실행이 첫 랜덤 저장 뒤 리비전 판정 오류로 중단됐다.
2. 예외 처리에서 원본 복구를 시도했지만 복구 성공을 검증하지 않았다.
3. 두 번째 실행은 이미 첫 랜덤값으로 오염된 상태를 “원본”으로 캡처했다.
4. 두 번째 실행 종료 시 `restored: true`는 실제 테스트 전 원본이 아니라 첫 랜덤값 상태로 돌아갔다는 뜻이었다.
5. Studio에서 Player가 `Scale 1.13`, `Width X 1.08`과 임의 회전 상태로 표시되어 오염을 확인했다.
6. Studio `Reset`도 이미 오염된 값을 기준으로 사용해 Player가 `Scale 1.13`인 채 저장됐다.
7. 이후 다른 10개 모델에는 Reset을 누르지 않았고 모든 추가 저장을 중단했다.

증거:

- `screenshots/studio-post-batch-random-player.png`
- `screenshots/player-reset-failed-scale-113.png`

Firebase 저장 구조에는 `current` 한 경로만 있고 과거 리비전 이력 경로가 없다. Firebase Console의 백업 탭도 Spark 요금제에서 백업이 생성되지 않은 상태임을 확인했다.

증거: `screenshots/firebase-spark-no-backups.png`

따라서 테스트 전 11개 모델의 정확한 Firebase root tuning은 현재 저장소나 Firebase 앱 API만으로 복원할 수 없다. 임의 기본값이나 로컬 기록으로 대체하면 프로젝트의 Firebase 단일 정본 규칙을 다시 위반하므로 수행하지 않았다.

## 잔여 조치

다음 중 하나의 Firebase 정본이 제공되기 전에는 정확한 복구가 불가능하다.

- 테스트 전 Firebase export
- Firebase/Google Cloud 외부 백업
- 사용자가 Studio에서 다시 확정해 Apply한 11개 모델의 값

정본이 확보되면 해당 데이터만 Firebase에 한 번 저장하고, 구독된 Studio·게임·타이틀 세 화면에서 같은 리비전을 확인해야 한다. 실 사용자 Firebase를 이용한 파괴적 랜덤 반복 테스트는 다시 실행하면 안 된다.
