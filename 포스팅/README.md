# 포스팅 wrapper

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
