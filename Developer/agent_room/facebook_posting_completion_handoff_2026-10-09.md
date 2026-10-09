# Facebook 게시 작업 기록

작성일: 2026-10-09 (Asia/Seoul)
캠페인 RunId: `2026-10-05-2347-restore01`
기준 영수증: `Developer/agent_room/facebook_posting_receipts/2026-10-05-2347-restore01.json`

확인 경위는 언어별로 다르다. 사용자 확인 중단 지시 전에 EN 기존 게시물을 검증했고, JA는 게시 후 확인을 시도했으나 완료하지 못했다. 지시를 받은 뒤 추가 조회를 중단해 VI와 KO는 게시 후 확인을 생략했다. 이에 따라 JA/VI/KO 영수증 상태는 `publish_intent`로 남아 있다. `PublishOnce` 호출이 예외 없이 끝났다는 사실만으로 라이브 게시 완료를 단정하지 않는다.

| 언어 | 고정 variant | 이번 실행 | 영수증 최종 상태 | `publishIntentUtc` (게시 직전 기록, UTC) | 결과 확인 |
|---|---|---|---|---|---|
| EN | `escape` | 기존 게시물 확인. 새 게시 없음 | `verified` | 새 실행 없음 | 기존 permalink가 영수증에 기록됨 |
| JA | `supplies` | `PublishOnce` 1회, 예외 없이 완료 | `publish_intent` | `2026-10-09T05:37:04.8227175+00:00` | 게시 후 확인 시도는 미완료 |
| VI | `escape` | `PublishOnce` 1회, 예외 없이 완료 | `publish_intent` | `2026-10-09T05:45:14.3640491+00:00` | 사용자 지시 후 조회 생략 |
| KO | `escape` | `PublishOnce` 1회, 예외 없이 완료 | `publish_intent` | `2026-10-09T05:46:20.4866945+00:00` | 사용자 지시 후 조회 생략 |

영수증의 EN permalink는 [기존 영문 게시물](https://www.facebook.com/hyunuk.jung.56/posts/pfbid0LHwaGf1mHjxKGzCgsh2zzzonSpDv8rtHJmBziMFyzBz12moLETn3efQwC6jr4fGel)이다. 이 게시물은 이번에 새로 게시하지 않았다. 영수증의 `verifiedUtc`는 `2026-10-09T05:35:35.5043331+00:00`이다.

이 RunId는 재실행하지 않는다. 사용자가 라이브 확인을 맡기로 했으므로 영수증을 `verified`로 올리거나 permalink를 추정해 추가하지 않는다. 후속 확인에는 기존 `OpenExactPost` 조회 동작을 사용한다. 이 동작은 주어진 permalink를 열어 확인하는 조회 전용 경로다.

재개 시 같은 RunId와 영수증에 저장된 각 언어의 frozen text/image pair를 유지한다. `publish_intent` 항목은 게시 여부가 아직 확인되지 않은 상태이므로 새 게시로 재실행하거나 같은 문구/이미지로 다시 클릭하지 않는다. 먼저 정확한 항목을 조회해 기존 게시 여부를 확인하고 결과에 따라 영수증을 처리한다.

새 게시를 별도로 승인받은 경우의 수동 wrapper 경로는 `marketing/facebook_daily_zombie_school_posting/Invoke-FacebookDailyZombieSchoolPosting.ps1`이다. 실제 wrapper 파라미터는 `-Action`, `-RunId`, `-Language`, `-ReceiptDirectory`, `-VariantId`, `-WindowId`, `-Permalink`, `-AuthorizePublish`다. 아래는 새 승인 RunId에 한해 각 단계를 개별 호출하는 형태이며, 현재 RunId에는 사용하지 않는다. `DiscoverWindow`의 반환 HWND를 다음 단계의 `-WindowId`로 전달하고 frozen pair를 선택한 뒤 화면에서 초안 검증을 완료해야만 PublishOnce가 허용된다.

```powershell
$runner = '.\marketing\facebook_daily_zombie_school_posting\Invoke-FacebookDailyZombieSchoolPosting.ps1'
$receiptDir = '.\Developer\agent_room\facebook_posting_receipts'
$runId = '<NEW_EXPLICITLY_AUTHORIZED_RUNID>'
powershell -NoProfile -STA -ExecutionPolicy Bypass -File $runner -Action DiscoverWindow -RunId $runId -Language en -ReceiptDirectory $receiptDir
powershell -NoProfile -STA -ExecutionPolicy Bypass -File $runner -Action OpenProfile -RunId $runId -Language en -ReceiptDirectory $receiptDir -WindowId <DISCOVERED_HWND>
powershell -NoProfile -STA -ExecutionPolicy Bypass -File $runner -Action SelectSourcePair -RunId $runId -Language en -VariantId <EXPLICIT_VARIANT_ID> -ReceiptDirectory $receiptDir
powershell -NoProfile -STA -ExecutionPolicy Bypass -File $runner -Action OpenComposer -RunId $runId -Language en -ReceiptDirectory $receiptDir -WindowId <DISCOVERED_HWND>
powershell -NoProfile -STA -ExecutionPolicy Bypass -File $runner -Action TypeText -RunId $runId -Language en -ReceiptDirectory $receiptDir -WindowId <DISCOVERED_HWND>
powershell -NoProfile -STA -ExecutionPolicy Bypass -File $runner -Action AttachImage -RunId $runId -Language en -ReceiptDirectory $receiptDir -WindowId <DISCOVERED_HWND>
powershell -NoProfile -STA -ExecutionPolicy Bypass -File $runner -Action VerifyDraft -RunId $runId -Language en -ReceiptDirectory $receiptDir -WindowId <DISCOVERED_HWND>
powershell -NoProfile -STA -ExecutionPolicy Bypass -File $runner -Action PublishOnce -RunId $runId -Language en -ReceiptDirectory $receiptDir -WindowId <DISCOVERED_HWND> -AuthorizePublish
```

`SelectSourcePair`의 `-VariantId`는 승인된 해당 cycle의 frozen pair ID로 지정한다. 언어별로 같은 단계를 수행한다. 게시 이후 확인은 별도 단계이며 이번 RunId의 `publish_intent`를 새 게시로 전환하는 근거로 사용하지 않는다.

오프라인 회귀 테스트 `powershell -NoProfile -STA -ExecutionPolicy Bypass -File .\marketing\facebook_daily_zombie_school_posting\Test-FacebookDailyZombieSchoolPosting.ps1`를 실행했고 `FACEBOOK_POSTING_TEST_OK`로 통과했다. 여기에는 `OpenExactPost`의 고정 프로필 permalink 허용 및 다른 주소 거부 검증이 포함된다. 이 테스트는 게시하지 않는다.

기존 논쟁 항목 `2026-10-05-1400-facebook4`는 수정, 삭제 또는 성공 상태 승격을 하지 않았다.

작업은 `F:\From_SSD_D_20261005\JungSil\2.Minigame_project\school_survivor-integration` 체크아웃과 이 PC의 현재 Chrome 프로필에서 수행됐다. 이는 다른 PC의 설치나 로그인 상태를 뜻하지 않는다. 다른 PC 배포는 [휴대용 자동화 인계 문서](social_posting_portable_automation_handoff_2026-10-09.md)의 목적 PC 요구사항을 따른다. Chrome 프로필, 브라우저 데이터, 쿠키 또는 비밀값은 복사하거나 이 문서에 기록하지 않는다.

정본 스케줄은 Kanban 카드 `t_77083b1f`에 기록된 양 플랫폼 공통 `02:00`, `06:00`, `11:00`, `17:00`, `21:00` KST이며 슬롯당 8개 게시다. 이번 문서 작업에서 스케줄이나 작업 등록 상태를 변경하지 않았다.
