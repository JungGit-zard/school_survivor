# 포스팅 운영 인수인계 — 2026-10-10

이 문서는 10월 9일 인수인계의 비활성 예약·사후 조회 절차를 대체하는 최신 운영 기록이다. 사용자는 게시 후 확인을 직접 맡는다. 에이전트는 게시 후 피드 조회를 하지 않으며 `publish_intent`를 `verified`로 바꾸지 않는다.

## 실제 실행과 예약

- 즉시 실행: 2026-10-10 11:27~11:40 KST에 Facebook/X 각각 ja/en/vi/ko 게시 버튼을 1회씩 실행했다. 논리 RunId는 `2026-10-10-0200`. 두 플랫폼의 해당 영수증 8개 항목은 `publish_intent`이며 재클릭하지 않는다. 게시 결과는 사용자가 확인한다.
- 오늘 추가 실행: 14:27 / 17:27 / 20:27 / 23:27 KST. 각각 RunId `2026-10-10-0600`, `-1100`, `-1700`, `-2100`에 대응한다. RunId의 슬롯은 중복 방지 식별자이며 실제 실행시각은 아니다.
- 오늘 전용 task 이름: `EscapeZombieSchool-SocialPostingToday-20261010-<실행HHmm>`. 실행 인자: `-TodayOnlyOverride -RunId <위ID>`. 오늘의 큐는 `social_posting_today_override_queue_2026-10-10.json`으로 정기 큐와 분리한다. 자정 이후 새 게시를 시작하지 않는다.
- 2026-10-11부터 정기 실행: 매일 02:00 / 06:00 / 11:00 / 17:00 / 21:00 KST. `EscapeZombieSchool-SocialPostingFiveSlots` 및 `-0600`, `-1100`, `-1700`, `-2100` 5개 task가 활성화됐다. 오늘과 중복되지 않도록 첫 trigger는 내일부터다.
- 실제 등록한 오늘 task 정보는 `social_posting_today_schedule_20261010.json`에 있다. 이전 단일 X/Facebook task는 중복 방지를 위해 비활성 상태를 유지한다.
- 모든 예약은 현재 checkout에서 계산한 실행기 절대경로를 사용한다. 콘솔은 `-WindowStyle Hidden`; Chrome은 대화형 데스크톱에서 실행한다.

## 실패와 중복 방지

`포스팅/Invoke-ZombieSchoolFiveSlotPosting.ps1`가 Facebook과 X를 언어별 순서로 실행한다. 실패한 언어가 있어도 다른 언어를 시도한다. 같은 RunId로 300초 간격 재시도하며 이미 `publish_intent` 또는 `verified`인 항목은 재게시하지 않는다. 계정·창·포커스 검사는 매 시도 유지하며 보안 확인을 우회하지 않는다. 손상된 영수증이나 불확실한 게시 클릭은 그대로 기록하고 무작정 다시 클릭하지 않는다.

정기 trigger는 시각에 큐에 들어간다. 한 데스크톱을 사용하는 동안 다음 trigger도 기록되지만, 실제 클릭은 앞선 작업이 끝난 후 진행될 수 있다. 예약 등록 성공을 실제 게시 성공으로 보고하지 않는다.

`submitted`는 게시 실행기가 반환한 제출 상태다. `submitted_with_unresolved_intents`는 이전 의도 기록을 재실행하지 않았다는 뜻이다. 둘 다 사이트 게시 확인을 뜻하지 않는다.

## 11:57 KST 코드 검증

- 실제 `-TodayOnlyOverride -RunId 2026-10-10-0200` 실행은 기존 8개 `publish_intent`를 건너뛰고 exit 0, `submitted_with_unresolved_intents`로 종료했다. 추가 게시 클릭은 하지 않았다.
- 최초 시험에서 cutoff 시간의 PowerShell 동적 범위 충돌을 발견해 수정했고, 실제 subprocess 엔트리포인트 회귀 테스트를 추가했다. 다중 줄 JSON을 출력하는 Facebook 실행기의 응답 해석도 수정했다.
- FiveSlot/Backlog/X Launch/Facebook Daily/Facebook Window Discovery 테스트가 통과했다. 게시용 별도 clone에서도 FiveSlot과 변경된 X/Facebook 테스트를 실행했다.
- Facebook의 현지화된 `• Facebook` 탭 제목과 한 Chrome 창에서의 프로필 탭 복구를 지원한다. 복구 동작도 프로필 잠금 안에서 처리한다. 고른 지역별 이미지가 고정 variant 이미지로 되돌아가던 문제와 그 이미지의 draft 검증 거부를 함께 수정했다.

## 30분 상황보고

사용자 지시: 종료일 없이 30분마다 계속 보고한다. 보고는 게시 실행기와 분리하고 예약 상태·오늘 영수증·재시도 상태만 읽는다. 비밀번호/토큰을 읽거나 보고서에 포함하지 않는다.

Orca 자동화 `bbecc7e3-1787-4ad3-a4e9-a5bd35b6fe79`의 첫 두 시험 실행은 Codex TUI 로그인 화면에서 `dispatch_failed`였다. 이 실패 경로는 아래 Windows 보고 예약으로 교체한 뒤 비활성화했다. 시험 중 만든 로그인 대기 터미널 2개만 닫았으며 다른 작업 세션은 건드리지 않았다.

- 실행 프로그램: `Developer/agent_room/Write-ZombieSchoolPostingStatusReport.ps1`. 별도 AI 로그인 없이 상태를 읽어 보고서를 저장하고 Windows 알림을 요청한다.
- Windows task: `EscapeZombieSchool-SocialPostingStatusReport`. `PT30M` 반복, Duration/EndBoundary 없음, 활성화 상태. 숨김 PowerShell, 현재 사용자 대화형 실행, 깨우기/놓친 실행 재개, 겹침 방지, 5분 실행 제한을 적용했다.
- 첫 실제 task 실행: 2026-10-10 12:00:07 KST, 종료 코드 0. `latest.md`가 12:00:09에 갱신됐다. 다음 예약은 12:30 KST이며 이후 매시 00/30분에 계속 실행한다.
- 보고서: `Developer/agent_room/social_posting_status_reports/latest.md` 및 같은 폴더의 시각별 MD. Windows 알림 API 전송도 성공했다. 이 채팅에 자동 메시지가 도착한다는 뜻은 아니며 전달 표면은 Windows 알림과 저장 보고서다.

### 최종 30분 보고 설치·전달 확인

- 보고기 `Developer/agent_room/Write-ZombieSchoolPostingStatusReport.ps1`, 테스트 `Test-ZombieSchoolSocialPostingStatusReport.ps1`, 설치기 `Install-ZombieSchoolPostingStatusReportSchedule.ps1`은 모두 `Developer/agent_room/`에 있다.
- 2026-10-10 12:12:51 KST 실제 task 실행은 exit 0으로 끝났다. 12:12:53 KST의 `social_posting_status_reports/latest.delivery.json`에서 `notificationSent=true`, `orcaCommentUpdated=true`를 확인했다. 요약은 활성 재시도 없음, 사용자 확인 대기 8건, 다음 게시 14:27 KST다.
- `EscapeZombieSchool-SocialPostingStatusReport`는 종료 시각 없이 30분마다 실행한다. 다음 실행은 12:30 KST이며 이후에도 계속 반복한다.
- 전달 위치는 `latest.md`와 시각별 Markdown 보고서, Windows 알림, Orca 현재 작업공간 comment/unread다. 이 채팅에 자동 메시지가 전달되는 것은 보장하지 않는다.
- 다른 PC에서는 저장소 루트에서 다음 명령으로 그 PC의 현재 clone 경로를 기준으로 예약을 설치한다: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Developer\agent_room\Install-ZombieSchoolPostingStatusReportSchedule.ps1`.

## 다른 PC

이 저장소의 `포스팅/`와 `marketing/`가 프로그램 정본이다. 다른 PC에서는 clone 경로를 기준으로 정기 예약을 새로 설치한다. 현재 PC의 F:/D: 경로나 Temp 폴더를 코드 기본값으로 복사하지 않는다. Chrome 세션과 Windows Credential Manager는 대상 PC의 해당 사용자 환경에서 준비한다. 비밀번호는 Git에 넣지 않는다. 동일 캠페인은 한 PC에서만 실행한다.

이미지 정본은 `marketing/x_daily_zombie_school_posting/image_pool/{x,facebook}/{ko,en,ja,vi}/`다. 새 제작 요청은 플랫폼별·언어별 10장씩 총 80장이다. collection 이름은 `marketing_social_20261010_add10`; 완성 및 등록 수량은 생성 완료 후 별도 기록한다. 이미지에는 현지어 제목·홍보 문구·무료/광고 없음 문구가 들어가며, 첨부 기준의 귀여운 넨드로이드 비율과 단순한 만화 묘사를 유지한다.

이전 상세 배포 설명은 `social_posting_portable_automation_handoff_2026-10-09.md`를 참고하되, 일정·사후 조회·활성화 상태는 이 문서가 우선한다.
