# Facebook 재시도 기록 — 2026-10-10 20:13 KST 이후

## 실행 범위와 초기 상태
- 사용자 지시: Facebook 재시도. Frozen RunId `2026-10-10-0600`을 유지했고, 이미 `publish_intent`였던 언어는 재클릭하지 않았다.
- 시작 시 `EscapeZombieSchool-SocialPostingToday-20261010-1427`는 실행 중이었고 retry queue는 `2026-10-10-0600`, `retry_wait`, 68회, 오류 `Expected one visible Facebook Chrome window; found 3`이었다.
- UI 충돌을 피하기 위해 해당 14:27 task만 `Stop-ScheduledTask`로 일시 정지했다. 비활성화하지 않았고 다른 사용자 창이나 프로세스는 종료하지 않았다.
- process의 MainWindow 정보에서 PID 18872 / HWND 2558728 / 제목 `(4) Facebook - Chrome`을 찾았다. wrapper의 자동 발견은 모호성 때문에 거부했으나 명시 HWND 발견은 성공했다. 기존 선택 페이지는 Facebook story였다.

## 계정 창 복구 및 초안 가드
- 같은 Chrome 창에서 `OpenProfileNewTab`을 호출해 프로필로 이동했다. 이 wrapper는 Facebook 탭이 이미 있으면 기존 탭을 재사용하므로 새 탭 생성이나 story 탭 보존을 보장하지 않는다. 스크린샷에서 `Hyun Uk Jung`과 `facebook.com/hyunuk.jung.56`을 확인했다. 스크린샷은 임시 위치에만 두고 저장소에는 복사하지 않았다.
- UIA가 프로필 계정 마커를 offscreen으로 잘못 분류해 readiness 가드가 처음 실패했다. 부모 검토 후 wrapper의 `OpenProfile -ForceReload` 경로를 사용했고, 재시도 진단에서 정확한 프로필 주소 1개, 계정 마커 4개, own-profile composer 1개, account error 없음이 확인됐다.
- `ReadState` 결과 초안 없음. `OpenComposer`의 기존 초안 가드를 통과했다. 이후 게시 확인용 피드 조회는 하지 않았다.

## 언어별 실행 결과
각 언어는 같은 RunId로 `SelectSourcePair → OpenComposer → TypeText → AttachImage → VerifyDraft → PublishOnce -AuthorizePublish` 순서로 실행했다. 각 UI 동작 전에 wrapper로 명시 WindowId를 다시 발견했다.

| 언어 | PublishOnce 시각 (KST) | wrapper 결과 | 상태 |
|---|---|---|---|
| ja | 20:23:24.837–20:23:28.633 | exit 0, 1회 호출 | `publish_intent`, 사용자 확인 대기 |
| en | 20:24:55.308–20:24:59.130 | exit 0, 1회 호출 | `publish_intent`, 사용자 확인 대기 |
| vi | 20:26:05.484–20:26:09.193 | exit 0, 1회 호출 | `publish_intent`, 사용자 확인 대기 |
| ko | 20:26:56.180–20:26:59.959 | exit 0, 1회 호출 | `publish_intent`, 사용자 확인 대기 |

- 각 언어의 초안 검증은 성공했다. 대상은 해당 언어의 frozen pair, Facebook 전용 이미지 1장, Friends audience였다.
- Facebook receipt: `Developer/agent_room/facebook_posting_receipts/2026-10-10-0600.json`. 사후 피드 조회나 permalink 검증은 생략했다. 게시 성공으로 보고하지 않는다.
- Facebook wrapper의 `FullCycleResumeSafe` readback은 네 언어 모두 `publish_intent`, `uncertain_requires_manual_verification`이었다. 이는 게시 의도 상태이며 실제 사이트 검증 완료가 아니다.

## 예약 큐 인계
- ko의 PublishOnce 호출은 20:26:59.959 KST에 끝났다. 20:27 정시 자동 worker가 이어서 `0600`을 `submitted_with_unresolved_intents`로 종료 처리했고, 부모 확인 기준 `1100`은 running, `1700`은 pending으로 자동 큐에 남았다.
- 14:27 task는 중복 worker를 만들 수 있어 재시작하지 않는다. 자동 큐가 재개됐으며 예약 task를 임의로 다시 시작하거나 비활성화하지 않았다.
- guardian mutex를 실제로 획득했다는 증거는 없으므로 보호/잠금 성공으로 주장하지 않는다.

## 코드 및 테스트
- 이 작업 중 worker가 코드 변경·커밋·푸시하지 않았다. ForceReload의 최소 wrapper 변경은 별도 구현 worker가 수행했고, 부모가 diff 검토와 별도 publish clone의 Facebook Daily 테스트 통과를 직접 확인했다.
- 본 작업은 X를 실행하거나 receipt를 변경하지 않았다.