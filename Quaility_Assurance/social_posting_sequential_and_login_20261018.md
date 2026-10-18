# 게시 이미지 순차 사용·로그인 실패 보고 검증 — 2026-10-18

Kanban: `escape-zombie-school / t_bd0b01fc` (operations: madangsue). 구현은 Codex Luna workers, 최종 diff 및 테스트 검증은 메인 세션에서 수행했다. 라이브 Facebook 복구는 별도 게시 담당이 수행했다.

## 적용한 동작

- 플랫폼·언어별 설정 목록에서 아직 사용하지 않은 SHA-256 그림을 처음부터 하나씩 선택한다. N개면 N개 전체를 사용하기 전에 같은 그림이 다시 선택되지 않는다. 이름·폴더만 다른 동일 바이트 그림도 재사용하지 않는다. 전체 소진 시 `IMAGE_POOL_EXHAUSTED`를 기록하며 자동 초기화하지 않는다.
- `selected`/`prepared` 초안은 사용 완료로 계산하지 않는다. `publish_intent`는 클릭 직전 저장되므로 실제 클릭 성공을 뜻하지 않지만, 중복 방지를 위해 보수적으로 사용 이력에 포함한다. 같은 게시의 재개는 기존 고정 intent를 보존한다.
- 과거 영수증의 파일이 이동되어도 저장된 이미지 해시를 사용한다. 원본 경로까지 사라진 과거 3건은 당시 source manifest의 정확한 SHA-256으로 연결했다. 출처는 `integrated_release_20261016/legacy_social_image_hash_provenance.md`에 기록했다. 영수증 본문·상태는 수정하지 않았다.
- Facebook 한국어에서 이름이 바뀐 기존 파일과 canonical 파일의 SHA-256 일치를 확인하고 경로 16개를 복구했다. 사용자가 정리한 파일은 보존했다. 활성 만화 파일은 플랫폼·언어별 15개, 총 120개 모두 존재한다.
- 명시적인 로그인 폼을 감지하면 `LOGIN_REQUIRED`로 즉시 기록한다. Facebook은 보이는 비밀번호 입력란과 로그인 버튼이 함께 있는 경우를 사용하며, 프로필 로딩 실패나 보안 확인창을 로그아웃으로 단정하지 않는다.
- 통합 실행기는 로그인 실패를 `Developer/agent_room/social_posting_login_failures.json`에 플랫폼·언어·회차·시각만 기록하고 기존 Windows/Orca 보고 경로를 즉시 호출한다. 미해결 기록은 30분 보고의 알림 억제에서 제외한다. 실제 알림 전송 테스트는 스팸을 피하기 위해 수행하지 않았으며 전송 결과는 기존 `latest.delivery.json`에 기록한다.
- Facebook Post는 정확한 계정 주소·작성창·유일한 활성 버튼을 재확인하고 UIA Invoke를 우선한다. 좌표 클릭으로 돌아갈 때만 기존 전면 창 확인을 사용한다.

## 검증 결과

메인이 실제 실행해 통과한 검사:

- `marketing/x_daily_zombie_school_posting/Test-ComicImageRotation.ps1`: 순차 소진, 동일 SHA 중복, 이동한 파일, 과거 해시 매핑, 전체 소진, 불명확한 이력 차단.
- `marketing/x_daily_zombie_school_posting/Test-BacklogComicImagePool.ps1`: 80개 backlog 만화 등록·언어·CTA 확인.
- `marketing/facebook_daily_zombie_school_posting/Test-FacebookPublishInvoke.ps1`: 지원되는 UIA Invoke에 포커스/좌표 입력이 없으며, 비활성 버튼·다른 계정·모호한 작성창에서는 게시하지 않음.
- `marketing/facebook_daily_zombie_school_posting/Test-FacebookWindowDiscovery.ps1`: 로그인 폼 판별 및 기존 창/작성창 검증.
- `marketing/facebook_daily_zombie_school_posting/Test-FacebookDailyZombieSchoolPosting.ps1`: 선택·고정 intent·CTA·저장 경고·로그인 실패 전파.
- `Developer/agent_room/Test-ZombieSchoolSocialPostingStatusReport.ps1`: 즉시 로그인 실패 분류, 미해결 30분 알림 조건, 해결 후 억제. 배포용 clean checkout에서도 통과.
- 실제 로컬 영수증을 읽는 다음 이미지 선택 preview 8개(X/Facebook × ja/en/vi/ko)가 모두 통과했다. 실제 게시나 영수증 변경은 하지 않는 선택 함수만 실행했다.

## 라이브 Facebook의 실제 제한

Facebook 로그인과 `Hyun Uk Jung` 계정은 실제 UI에서 확인했다. 원래 영어 초안은 이후 사라져 새로 작성하지 않았다. 베트남어 빈 작성창은 열었으나 사용자 게임 `SO3D_x64` (`-KR_LIVE_x64`)가 전면을 반복적으로 회수해 본문 입력에 실패했다. 게임만 최소화해도 즉시 복귀했으며, 사용자 기존 방해 앱 종료 지시에 따라 해당 프로세스 한 개를 종료하려 했지만 Windows가 `Access is denied`로 거부했다. 다른 사용자 앱은 종료하지 않았다.

따라서 이 복구의 게시 완료를 주장하지 않는다. 2026-10-16 12:00 회차의 ja/en은 `publish_intent`로 실제 게시 여부 미확정, vi/ko는 미게시다. 사용자 게임의 전면 점유가 해제되어야 남은 입력을 진행할 수 있다. 00/06/12/18 정규 예약, RetryDrain, 30분 보고 작업은 활성 상태다.

## 사용자 재시도 지시 후 — 2026-10-18 16:35~16:37 KST

- Chrome 본문 입력이 가능해져 남은 베트남어·한국어 게시를 실행했다. 베트남어 Post UIA Invoke: **16:35:10 KST**, 작성창 닫힘 확인: 16:35:20. 한국어 Post UIA Invoke: **16:36:26 KST**, 작성창 닫힘 확인: 16:36:42.
- 실행 증거: `Developer/agent_room/facebook_posting_receipts/runlogs/2026-10-16-1200-retry-click-evidence-20261018.json`. 메인이 두 이미지의 SHA-256, 클릭 후 작성창 닫힘 시각 순서, X/Facebook의 해당 회차 8개 영수증 상태를 대조했다.
- 일본어·영어는 기존 `publish_intent`가 불확실해 새로 작성하거나 클릭하지 않았다. 피드·고유 게시물 주소 확인은 수행하지 않았고 어떤 영수증도 `verified`로 바꾸지 않았다.
- 해당 회차 대기열은 상태 잠금 아래 `submitted_with_unresolved_intents`, 시도 3회로 갱신하고 실행 증거 경로를 연결했다. 이전 오류 기록은 보존했다. 이는 일본어·영어의 실제 게시 성공이나 사후 검증 완료를 뜻하지 않는다.
