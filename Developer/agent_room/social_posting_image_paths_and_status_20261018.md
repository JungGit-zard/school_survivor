# 게시 상태와 홍보 이미지 경로 (2026-10-18)

확인 시각: 2026-10-18 15:30 KST. 이 문서는 로컬 F: 작업 폴더의 설정·파일·영수증·예약 대기열을 읽어 작성했다. `publish_intent`는 게시 버튼을 누른 기록이며, 실제 게시 성공 확인은 아니다.

## 게시 상태

- 2026-10-18 00:00·06:00·12:00 회차는 대기열에서 `pending`이고, X·Facebook 모두 오늘 날짜의 언어별 게시 영수증이 없다. 오늘 게시 완료라고 말할 근거가 없다.
- 대기열 맨 앞의 2026-10-16 12:00 회차가 `running`에 머물러 있다. 그 회차의 X 4개 언어는 `publish_intent`, Facebook 한국어는 `selected`, 나머지 Facebook 3개 언어는 미선택이다. 이후 회차가 밀려 있다.
- 2026-10-16 06:00 회차는 X·Facebook 각각 4개 언어에 `publish_intent`가 있다. 사후 게시 확인 기록은 별개다.
- 예약 작업은 매일 00:00·06:00·12:00·18:00에 활성화되어 있고, 5분 재시도 작업도 등록되어 있다. 작업 스케줄러 종료 코드 0은 게시 성공의 증거가 아니다. 다음 정규 회차는 오늘 18:00이다.

대기열: `Developer/agent_room/social_posting_scheduled_queue.json`  
X 영수증: `Developer/agent_room/x_posting_receipts/`  
Facebook 영수증: `Developer/agent_room/facebook_posting_receipts/`  
30분 상태 보고: `Developer/agent_room/social_posting_status_reports/latest.md`

## 그림이 있는 곳

이미지 전체 공통 루트 (파일 탐색기 주소창에 그대로 붙여넣기):

```text
F:\From_SSD_D_20261005\JungSil\2.Minigame_project\school_survivor-integration\marketing\x_daily_zombie_school_posting\image_pool
```

이 루트 아래의 이미지 파일은 X 223장, Facebook 352장, 참고용 11장으로 총 586장이다. Facebook 한국어 `정리본_20261018`에 있는 64장은 기존 파일을 해시로 정리한 복사본이며, 현재 자동 게시 후보가 아니다. `reference`의 시안·연락 시트도 게시 후보가 아니다. ZIP 4개는 이 이미지 개수에 포함하지 않았다.

| 플랫폼 | 언어별 폴더 | 현재 자동 게시 설정에 등록된 4컷 만화 |
|---|---|---|
| X | `image_pool/x/ko`, `en`, `ja`, `vi` | 각 언어의 `zombie_catch_comic_words_20261014/01.png`~`05.png`와 `backlog_comic_20261015/01.png`~`10.png`: 각 15장, 모두 존재 |
| Facebook | `image_pool/facebook/ko`, `en`, `ja`, `vi` | 각 언어의 `zombie_catch_comic_words_20261015/01.png`~`05.png`와 `backlog_comic_20261015/01.png`~`10.png`: 각 15장 등록 |

Facebook 한국어의 `zombie_catch_comic_words_20261015/01.png`~`05.png`는 등록만 되어 있고 실제 파일은 없다. 같은 폴더에는 이름이 다른 `C_011.png`~`C_015.png` 5장이 존재한다. 이 다섯 파일이 같은 그림인지는 확인하지 않았으므로 자동으로 대체하지 않는다. 따라서 현재 실제로 선택 가능한 4컷 만화는 X 각 언어 15장, Facebook 한국어 10장, Facebook 나머지 언어 각 15장이다. 전체 활성 후보는 115장이다.

과거에 만든 일반 홍보 이미지와 다른 만화는 각 언어 폴더의 `marketing_social_*`, `boss_localized_20261003`, `zombie_catch_comic_20261014`, Facebook의 `facebook_rotation_20261013` 등에 보관되어 있다. 현재 설정은 **모든 생성 이미지를 자동 게시하지 않는다.** 최신 지시인 4컷 만화 게시와 이미지 속 현지어 게임 시작 문구 조건에 따라 위 두 만화 컬렉션만 선택한다.

## 회차마다 그림을 가져와 붙이는 과정

1. `marketing/x_daily_zombie_school_posting/posting_config.json`의 `localized_social_image_pool`(X)과 `facebook_rotation_image_pool`(Facebook)이 언어별 15개 상대 경로를 지정한다. `image_pool/image_catalog.json`에 해당 플랫폼·언어·파일·현지어 게임 시작 문구가 정확히 등록된 파일만 후보로 인정한다. 파일이 없으면 제외한다.
2. `marketing/x_daily_zombie_school_posting/PostingVariant.ps1`의 `Select-PostingLocaleImagePath`가 이전 영수증을 읽는다. 게시 버튼을 누른 `publish_intent`와 `verified`에 쓰인 그림은 후보 15장이 모두 소진되기 전까지 다시 고르지 않는다. `selected`·`prepared`도 바로 다음 선택에서 같은 그림을 피하는 데 쓴다. 기존 회차를 재개할 때는 영수증에 고정된 `imagePath`를 그대로 사용한다.
3. **현재 코드는 무작위 추첨이 아니다.** 설정 목록에서 마지막 선택 다음 위치부터 순서대로 돌면서 사용하지 않은 파일을 고른다. 15장 전체가 소진되면 다시 처음으로 순환한다. 그러므로 “매번 랜덤”이라는 과거 요청은 아직 구현되지 않았다. 다만 후보가 둘 이상이면 직전과 같은 그림은 피하도록 작성되어 있다. 게시 대기열이 멈춘 현재는 이 선택 자체가 새 회차에 실행되지 않고 있다.
4. X는 선택한 파일을 열어 이미지 자체를 Windows 클립보드에 넣고 게시 작성창에 붙여넣는다(`WindowsXPosting.ps1`의 `Prepare-XPost`). 설정의 `x_link_card.enabled`는 `false`이며 사진 1장을 붙이는 방식이다. Facebook은 선택한 **Facebook 전용 경로**를 영수증에 고정하고, Chrome의 `Photo/video` 파일 선택 창에 절대 경로를 입력한 뒤 `Open`을 눌러 사진 1장을 첨부한다(`FacebookNative.ps1`).

예시 경로:

```text
F:\From_SSD_D_20261005\JungSil\2.Minigame_project\school_survivor-integration\marketing\x_daily_zombie_school_posting\image_pool\x\ko\backlog_comic_20261015\01.png
F:\From_SSD_D_20261005\JungSil\2.Minigame_project\school_survivor-integration\marketing\x_daily_zombie_school_posting\image_pool\facebook\ko\backlog_comic_20261015\01.png
```

다른 PC에서는 `image_pool` 이하의 플랫폼·언어·파일 상대 경로를 유지한 채 저장소를 체크아웃해야 한다. 실행 중에는 그 PC의 저장소 위치를 기준으로 절대 경로를 만들며, F: 드라이브 자체가 필수인 것은 아니다.
