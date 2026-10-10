# 포스팅 wrapper

> 최신 운영 상태: [2026-10-10 인수인계](../Developer/agent_room/social_posting_operations_2026-10-10.md). 오늘은 즉시 실행 후 14:27·17:27·20:27·23:27 KST, 내일부터 원래 5개 시각에 실행한다. 게시 후 확인은 사용자가 맡는다.

이 폴더는 운영자가 쓰는 진입점입니다. 수동 게시 래퍼는 `marketing/Invoke-ZombieSchoolSocialPosting.ps1`로 인자를 전달하며, 예약 실행기는 기존 X·Facebook 게시기를 순서대로 호출합니다. 실제 브라우저 게시 로직은 `marketing/` 정본에만 있습니다.

## 매일 자동 게시

Windows 예약 작업 `EscapeZombieSchool-SocialPostingFiveSlots`가 한국시간 **02:00, 06:00, 11:00, 17:00, 21:00**에 실행됩니다. 매 시각 Facebook 한국어·영어·일본어·베트남어 4건을 시도한 뒤 X의 같은 4건을 시도합니다. 한 플랫폼이 실패해도 다른 플랫폼은 시도하며, 성공·실패는 각 플랫폼 영수증에 남습니다. 기존 `EscapeZombieSchool-XPosting`과 `EscapeZombieSchool-FacebookPosting` 예약은 중복 실행 방지를 위해 비활성화했습니다.

예약 재설치·검증은 `Install-ZombieSchoolFiveSlotPostingSchedule.ps1 -WhatIf`로 먼저 확인한 뒤 해당 파일을 `-WhatIf` 없이 실행합니다. 실제 게시에는 해당 Windows 사용자의 로그인 상태와 켜진 대화형 데스크톱이 필요합니다. 로그아웃·계정 인증·사이트 장애가 있으면 예약 시각이 되어도 성공을 보장하지 않습니다.

## 베트남어 X 1회 게시 명령

실제 게시가 필요할 때만 아래처럼 실행합니다. 이번 보존 작업에서는 새 라이브 게시를 하지 않습니다.

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\포스팅\Invoke-ZombieSchoolSocialPosting.ps1 -Platform X -Language vi -RunId 2026-10-05-0257-vi-once01
```

위 RunId는 이미 성공한 기록의 재현 예시이므로 그대로 다시 실행해도 새 게시를 만들지 않습니다. 새 게시에는 새 고유 RunId를 정하고, 그 게시의 실패 재시도에만 동일한 RunId를 사용합니다.

## 안전 확인 / dry run

브라우저 UI나 게시를 건드리지 않고 소스·카피·이미지·영수증 선택만 검증합니다.

```powershell
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File .\포스팅\Invoke-ZombieSchoolSocialPosting.ps1 -Platform X -Language vi -RunId 2026-10-05-0257-vi-once01 -DryRun
```

## 같은 RunId 재시도 원칙

실패·중단 뒤에는 새 RunId를 만들지 말고 같은 `-RunId`를 다시 사용합니다. X 정본 runner는 영수증 상태를 먼저 보고, 이미 검증된 게시물은 스킵하며, `publish_intent`처럼 클릭 여부가 불확실한 상태에서는 두 번째 게시 클릭을 하지 않고 검증/수동 확인을 요구합니다.

## X 계정 확인 위치

`@jungsilx` 계정 확인은 compose 화면에 들어가기 전에 프로필 화면에서 `Account menu`를 열어 `Log out @jungsilx` 메뉴 항목으로 확인합니다. compose 화면에서는 계정 메뉴가 숨겨져 있어서 composer 내부에서 계정 확인을 시도하면 실패하거나 잘못된 재시도를 유발할 수 있습니다.

## 검증된 성공 기록

- 게시 URL: https://x.com/jungsilx/status/2106809115905507587
- 영수증: `Developer/agent_room/x_posting_receipts/2026-10-05-0257-vi-once01.json`

## 다른 PC에 배포할 때

캠페인 이미지 경로는 설정에 기록된 절대 드라이브 경로 대신 `image_pool` 아래의 동일한 상대 경로를 사용해 현재 저장소의 `marketing/x_daily_zombie_school_posting/image_pool`로 해석합니다. 플랫폼별 활성 이미지 구조는 `image_pool/x/<locale>/<collection>` 및 `image_pool/facebook/<locale>/<collection>`이며, locale은 `ko`, `en`, `ja`, `vi`입니다. X runner는 `x` 경로를 사용하고 Facebook runner는 같은 campaign pair를 `facebook` 경로의 독립 복사본으로 매핑합니다. 다른 PC에도 이 폴더 구조와 지정 이미지 파일이 있어야 하며, 이미지 이름이나 언어별 하위 폴더를 바꾸지 않습니다. 기존 receipt는 보존하고 경로를 다시 써 넣지 않습니다.

X 로그인 복구는 현재 Windows 사용자의 Credential Manager에 저장된 Generic Credential `EscapeZombieSchool-XPosting`을 로그인 폼이 보일 때만 읽습니다. 사용자명과 암호는 실행 중 메모리에서만 사용하며 명령 인자, 환경 변수, 로그, receipt, 저장소에 기록하지 않습니다. 계정은 `@jungsilx`로 검증하며 2단계 인증, 패스키, CAPTCHA, 보안 확인 또는 계정이 다른 경우 자동 진행을 멈춥니다. Credential Manager 항목은 배포 대상 PC에서 별도로 준비해야 합니다.

요청된 날짜 구간의 receipt 상태만 읽으려면 아래처럼 실행합니다. 결과에는 X/Facebook별 파일·언어 상태가 표시되며 `receiptOnly=true`는 실제 타임라인 확인과 다른 값입니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\포스팅\Get-ZombieSchoolSocialPostingCycleInventory.ps1 -StartDate 2026-10-06 -EndDate 2026-10-09
```

## 예약 슬롯의 지속 재시도

설치기가 만드는 각 슬롯 task는 `Invoke-ZombieSchoolFiveSlotPosting.ps1 -PersistentScheduledRun -ScheduledSlot <HHmm>`으로 시작합니다. task별 고정 슬롯과 30분 intake 유예를 확인해 trigger의 날짜와 slot으로 하나의 `yyyy-MM-dd-HHmm` RunId를 확정합니다. 그 RunId만 `Developer/agent_room/social_posting_scheduled_retries/<RunId>.json`에 기록합니다. 실패 뒤에는 동일 RunId로 300초 기다린 뒤 다시 시도하며, 이미 게시 의도가 기록된 항목은 재클릭하지 않습니다. 계정·창·포커스 검사는 재시도마다 유지합니다. 손상된 영수증이나 불확실한 클릭은 중단 기록을 보존합니다. 사용자 지시에 따라 사후 게시 조회는 생략하며 제출 상태를 검증 완료로 보고하지 않습니다.

이 예약 경로는 `-AuthorizedHistoricalRun`을 전달하지 않으며 과거 슬롯을 계산하거나 추가하지 않습니다. 과거 누락분은 별도의 백로그 명령에 명시한 `-CycleIds`로만 실행합니다. 예약 작업은 이 문서 변경만으로 등록·활성화되지 않습니다.

## 30분 운영 상태 보고

`EscapeZombieSchool-SocialPostingStatusReport`는 종료 시각 없이 30분마다 receipt·예약·재시도 상태를 읽어 Markdown 보고서를 갱신합니다. 미해결 `retry_wait`/`failed`/`partial_failed`/`stopped_unsafe`, 실제 누락 시작, 또는 상태 읽기 오류가 있을 때만 Windows 알림과 Orca 현재 작업공간 comment/unread를 보냅니다. 정상·일시 `running`·`publish_intent` 사용자 확인 대기·terminal 제출·자정 cutoff 단독·과거 task 결과 오류만 있으면 알림하지 않습니다. 게시 실행과 분리되어 있으며, `publish_intent`는 성공 검증으로 바꾸지 않습니다. 이 채팅에 자동 메시지가 전달되는 것은 보장되지 않습니다.

보고기·테스트·설치기는 `Developer/agent_room/`에 있습니다. 다른 PC에서는 저장소 루트에서 다음 명령을 실행해 해당 clone 경로에 예약을 설치합니다.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Developer\agent_room\Install-ZombieSchoolPostingStatusReportSchedule.ps1
```

### 예약 트리거 큐와 순차 처리

설치기는 5개의 task를 만듭니다. `EscapeZombieSchool-SocialPostingFiveSlots`는 02:00, 나머지는 `-0600`, `-1100`, `-1700`, `-2100` 접미사를 쓰며 각 task는 하루 한 번 자기 고정 `-ScheduledSlot` 값으로 intake를 시작합니다. `Parallel` 정책으로 active worker가 있어도 intake가 슬롯 ID를 `social_posting_scheduled_queue.json`에 먼저 기록합니다. 한 worker만 desktop mutex를 소유하고 큐의 정확한 ID를 시간순으로 처리합니다. 진행 중 새 슬롯 trigger가 발생하면 ID가 큐에 남아 현재 cycle이 완료되거나 안전 중단된 뒤 처리됩니다. 따라서 게시 시각은 앞선 cycle의 재시도 시간만큼 밀릴 수 있지만, trigger ID를 버리거나 과거 slot을 계산해 채우지 않습니다. 300초 무기한 재시도를 위해 Scheduled Task의 실행 제한은 무제한(PT0S)으로 검증합니다.
