# 탈출 좀비학교 무비용 개발자 마케팅 실행안

기준일 2026년 10월 14일 · 1인 개발자 Terry · 현금 지출 0원

개발 과정을 공개하고, 작은 커뮤니티에서 한 가지 질문으로 플레이를 부탁하고, 받은 의견에 답한 뒤 실제 반영 내용을 공개한다. 처음 온 사람이 다음 변경을 확인하러 돌아오고, 재미를 느낀 사람이 자발적으로 공유하도록 이 흐름을 반복한다. 비용 대신 기존 자산과 하루 30분의 개발자 시간을 사용한다.

목표는 조회수 확대보다 **첫 판 시작 → 첫 판 60초 생존 → 두 번째 판 → 다음 날과 7일 뒤 재방문**이다. 60초는 첫인상을 부탁하는 기준이며 별도 게임 모드가 아니다. 이 문서는 실행 설계이며 실제 게시·발송·게임 수정은 별도 행동이다.

## 1 게임과 첫 번째 부탁

탈출! 좀비학교는 학교에서 몰려오는 좀비를 피하면서 자동 공격과 레벨업 카드로 성장하고 탈출을 노리는 생존 액션이다. 연필·자·텀블러 같은 생활용품 무기와 친구의 부탁이 처음 소개할 소재다. 기능을 전부 나열하기보다 한 장면과 한 질문으로 시작한다.

**첫 부탁:** “연필로 좀비학교에서 첫 판 60초만 버텨 주세요. 처음 조작과 목표를 이해했는지 한 줄만 부탁드립니다.”

| 알려 줄 사실 | 표현 |
| --- | --- |
| 가격 | 무료이며 게임 내 광고와 유료 구매가 없다. |
| 시작 조건 | 설치 없이 브라우저에서 플레이하며 시작 전 Google 로그인이 필요하다. |
| 조작 | 이동으로 피하고 공격은 자동이다. 레벨업 때 카드를 선택한다. |
| 첫 플레이 목표 | 60초는 테스트 부탁의 기준이다. 전용 모드·클리어 시간·보상으로 약속하지 않는다. |
| 현재 검토 사항 | 3개 랭킹 탭과 누적랭킹 기본 선택, 0점 기록 요청은 미배포다. 현재 제공되는 기능으로 소개하지 않는다. |

[웹 플레이](https://escapezombie.com/game)를 첫 링크로 둔다. [게임 소개](https://escapezombie.com/landing)는 상세 설명을 원할 때 보조로 쓴다. “무가입”, “로그인 없이 즉시 시작”은 사용하지 않는다. 기존 가이드의 게스트 설명보다 현재 확인된 Google 로그인 필요 조건을 따른다.

Android는 프로젝트에서 확인된 [Google Play 주소](https://play.google.com/store/apps/details?id=com.jungyoon.zombieschool)만 보조 링크로 사용한다. 공개 트랙과 이용 가능 국가 확인 전 누구나 설치 가능하다고 약속하지 않는다.

## 2 개발자가 반복할 운영 흐름

| 단계 | 실제 행동 | 다음 단계로 이어지는 이유 |
| --- | --- | --- |
| 개발일지 | 현재 게임의 장면 하나와 고민 하나를 공개한다. | 무엇을 만들고 있는지 이해한 사람이 테스트를 선택한다. |
| 소수 테스트 | 조건을 충족한 커뮤니티 한 곳에서 질문 하나로 첫 판을 부탁한다. | 답할 부담을 줄이고 실제 플레이 경험을 받는다. |
| 의견 정리 | 조작 혼란·재미·문제를 구분하고 재현 조건을 확인한다. | 막연한 호불호를 다음 작업의 근거로 바꾼다. |
| 작은 개선 결정 | 영향이 큰 문제 하나를 별도 개발 과제로 제안한다. | 요청 범위와 검증을 거쳐 실제 개선할 대상을 좁힌다. |
| 업데이트 공개 | 반영이 끝난 항목만 전후 장면과 함께 공개한다. | 전에 의견을 준 사람이 결과를 확인할 이유가 생긴다. |
| 재방문과 공유 | 원할 때만 다시 해 보도록 부탁하고 공식 링크를 제공한다. | 재방문을 강요하지 않고 경험에서 나온 자발적 공유를 만든다. |

이 흐름의 중심은 관계와 응답이다. 게시글 수를 늘리는 것보다 “의견을 읽었고 무엇을 할지 결정했다”는 답을 남긴다. 아직 반영하지 못했다면 예정 또는 보류로 표시한다. 후기·추천·친구 초대를 참여 조건으로 요구하지 않는다.

## 3 누구에게 어떤 글을 어디에 쓰는가

| 채널과 대상 | 글과 소재 | 운영 빈도 | 재방문 연결 |
| --- | --- | --- | --- |
| 기존 Tistory 독자와 검색 이용자 | 실제 개발 문제 하나, 해결 과정, 스크린샷, 끝에 플레이 링크 | 개발 내용이 있을 때 주 1편을 작업 기준으로 한다. | 같은 글에 결과를 갱신하고 다음 개발일지로 연결한다. |
| 자격을 충족한 국내 개발 커뮤니티 | 개발 참여를 밝힌 테스트 요청, 실제 장면, 질문 1개 | 첫 주 허용된 곳 1곳에 1건. 이후 규칙과 실제 변경을 기준으로 한다. | 원글 댓글로 결과를 알리고 완료된 개선을 연결한다. |
| r/playmygame의 무료 게임 테스터 | 개발자 역할·무료 조건·로그인 필요·직접 링크가 있는 영어 글 | 동일 게임 재게시까지 1개월 이상. 기존 계정 게시일을 먼저 확인한다. | 피드백에 답하고 원글에서 업데이트 소식을 알린다. |
| 인디터 회원 | 게시판 규칙을 확인한 뒤 개발일지 또는 테스트 글 | 등급·허용 간격 확인 전 미정이다. | 허용된 원글·댓글로 후속 소식을 전한다. |
| itch.io 이용자 | 무료 개발 소개와 devlog, 실제 장면과 공식 웹 링크 | 등록 조건을 통과한 뒤 의미 있는 변경 때 갱신한다. | 새 devlog에서 전후 결과와 플레이 링크를 제공한다. |
| 공개 테스트 모집을 연 크리에이터 | 모집 조건에 맞는 자발적 참여 신청 | 현재 모집과 웹게임·로그인 조건이 맞을 때 1회 신청한다. | 신청 결과를 존중하고 답변 요구나 반복 연락을 하지 않는다. |

생존 액션을 좋아하는 일반 플레이어와 개발자는 별도 집단으로 기록한다. 개발자는 문제 설명에 도움을 주고, 일반 플레이어는 실제 재미와 다시 할 이유를 보여 준다. 기존 X·Facebook 자동 예약은 그대로 유지하며 이 계획으로 중복 등록하거나 비활성화하지 않는다.

## 4 지금 쓸 채널과 조건을 확인할 후보

공개 규칙 확인일은 2026년 10월 14일이다. 무료 채널이라는 사실과 현재 계정이 게시할 자격이 있다는 사실은 다르다.

| 구분과 주소 | 확인된 조건 | 실행 |
| --- | --- | --- |
| 기존 Tistory 운영 계정 | 기존 원고 자산은 있다. 실제 공개 글 주소는 확인해 기록한다. | 본인 게시 권한과 공개 주소가 확인되면 일지와 플레이 링크를 운영한다. |
| [디시 인디 게임 개발 갤러리](https://gall.dcinside.com/mgallery/board/lists/?id=game_dev) | 2026년 10월 6일 공지는 홍보·테스트 글에 일지탭 글 5개 이상을 전제로 한다. 홍보탭은 HIT탭과 통합되었다고 안내한다. | 계정의 기존 일지 5개 확인 전 테스트 모집을 보류한다. 실제 과정이 없는 분량 채우기나 도배는 하지 않는다. |
| [r/playmygame](https://www.reddit.com/r/playmygame/) | 무료로 지금 플레이 가능, 직접 링크, 게임 설명과 개발 참여, 사실에 맞는 표현, 동일 게임 1개월 재게시 간격이다. NDA 게임 금지, 공포 성격의 NSFW 표기 규칙도 있다. | Google 로그인 필요를 공개한다. 규칙 JSON에 계정 요구 허용 여부는 명시되지 않아 고정글·작성 양식·운영 판단을 추가 확인한다. |
| [인디터](https://cafe.naver.com/indiedev) | 본문 접근 오류로 현재 홍보 게시판·등급·빈도는 미확인이다. | 로그인한 계정에서 공지와 게시판을 읽은 뒤 선택한다. |
| [itch.io](https://itch.io/) | 등록·검색 노출·iframe 인증은 서로 다른 조건이다. | §9 조건을 검토한 뒤 등록 후보로 판단한다. |

국내 개발갤은 [최신 공지](https://gall.dcinside.com/mgallery/board/view/?id=game_dev&no=229623&page=1)의 일지 5개 조건을 우선 확인하고 [기본 규칙](https://gall.dcinside.com/mgallery/board/view/?id=game_dev&no=174286)도 읽는다. Reddit는 [공식 규칙 JSON](https://www.reddit.com/r/playmygame/about/rules.json)을 근거로 하며, 게시 직전 현재 고정글과 계정의 마지막 게시일을 확인한다. 국내 웹게임 포털에 개발자 접수 규칙이 없으면 게시 가능한 곳으로 추정하지 않는다.

채널 기록은 `게시판 / 계정 자격 / 공지 URL / 확인 시각 / 마지막 게시일 / 다음 허용일 / 원글 URL`로 남긴다. 삭제된 글을 곧바로 재게시하지 않는다.

## 5 스크린샷과 GIF로 재미를 보여 주기

기존 자산과 실제 게임 장면만 사용한다. 스크린샷은 장면 하나를 이해시키고, GIF는 연속 움직임이 설명에 꼭 필요할 때만 짧게 붙인다. 새 유료 도구를 설치하지 않고 기존 캡처·편집 도구를 사용한다.

| 장면 | 보여 줄 것 | 붙일 질문 |
| --- | --- | --- |
| 연필 공격과 회피 | 학교에서 학용품으로 버티는 첫인상 | 처음 보고 무엇을 해야 하는지 알았나요? |
| 텀블러 등 무기 행동 | 생활용품이 전투 도구가 되는 재미 | 이 무기를 다시 써 보고 싶었나요? |
| 카드 선택 전후 | 선택이 공격이나 플레이에 미친 실제 변화 | 카드를 고를 때 설명이 충분했나요? |
| 친구의 부탁 | 생존 중 다른 행동을 선택하는 상황 | 부탁을 따라가고 싶었나요, 지나쳤나요? |

게시글에는 첫 장면 1개를 중심으로 두고 필요하면 보조 이미지 1~2개를 붙인다. GIF만 올리지 말고 개발자 역할·게임 설명·직접 링크·질문을 본문에 쓴다. 첫 화면과 UI를 바꾸어 홍보 장면을 만들지 않는다. 이메일 등 개인 정보가 보이는 로그인 화면은 소재에서 제외한다.

`Graphic_designer/blog_tistory_20261011/tistory_body.html`과 `title.txt`에는 기존 소개와 질문이 있다. 콘셉트 이미지의 “실제 게임 화면이 아닙니다” 표기를 유지한다. `Planner/escape_zombie_school_complete_guide_20261011.html`은 내부 설명 참고다. 로컬 가이드의 무기·퀘스트 갯수나 등장 시각을 실제 배포 검증 없이 새 약속으로 내세우지 않는다.

## 6 검색되는 개발일지와 문제 해결 글

개발일지는 단순히 “만들었습니다”를 반복하는 글보다 한 문제와 결과를 보여 주는 글로 쓴다. 게임을 찾는 사람이 읽을 수 있는 제목과 개발자가 찾는 문제 설명을 함께 둔다. 첫 문단과 끝에 플레이 링크를 하나씩 배치하고 시작 전 Google 로그인을 안내한다.

제목 후보는 “무료 웹게임 탈출 좀비학교 첫 플레이 방법”, “연필 무기를 처음 본 사람이 조작을 이해했는지 테스트하기”, “탈출 좀비학교 카드 선택 설명을 점검한 과정”이다. 해결하지 않은 문제에는 “해결”이라고 붙이지 않는다. 검색 노출 시점과 상위 노출을 보장하지 않는다.

### 개발일지 복사 양식

```text
제목: 탈출 좀비학교에서 [실제 문제 또는 작업]을 확인한 과정

이번에 확인한 것은 [문제 하나]입니다.
실제 장면: [스크린샷 또는 GIF]
처음에는 [관찰된 행동]이 있었고, [현재까지 한 확인]을 했습니다.

현재 상태: [확인 완료 / 수정 예정 / 반영 완료 / 보류]
반영 완료라면 달라진 점: [전후 차이와 확인 범위]

게임은 무료이며 게임 내 광고와 유료 구매가 없습니다.
설치 없이 웹에서 플레이하고, 시작 전 Google 로그인이 필요합니다.
플레이: [Tistory용 UTM 링크]

이번 질문: [하나의 질문]
기기·브라우저와 겪은 장면을 알려 주시면 도움이 됩니다.
```

기존 소개 글의 공개 주소를 확인해 일지에 연결하고, 소개 글에서도 최신 일지로 연결한다. 여러 글에 같은 소개를 통째로 반복하지 않는다. 7일에는 유입 검색어와 첫 판 여부, 30일에는 일지에서 들어온 사람의 재방문을 확인한다.

## 7 한국어와 영어 테스트 모집문

### 한국어 커뮤니티 글

```text
제목: 연필로 좀비학교에서 첫 판 60초를 부탁드립니다

안녕하세요. 탈출! 좀비학교 개발자입니다.
학교에서 좀비를 피하고, 연필과 텀블러 같은 무기와 레벨업 카드로 성장하며 탈출을 노리는 생존 액션을 만들고 있습니다.
[실제 게임 스크린샷 1장]

무료이며 게임 내 광고와 유료 구매가 없습니다.
광고나 비즈니스 모델은 일절 없습니다.
설치 없이 브라우저에서 플레이하고 시작 전 Google 로그인이 필요합니다.
플레이: [해당 커뮤니티의 UTM 링크]

처음 한 판에서 60초 생존을 목표로 해 보시고 질문 하나에 답해 주시면 감사하겠습니다.
“처음 조작과 목표를 이해하기 어려웠던 순간은 어디였나요?”
공격은 자동이고 이동으로 피하며 레벨업 때 카드를 고릅니다.
60초는 제 테스트 부탁의 기준이며 별도 모드는 아닙니다.

의견을 받은 뒤 확인 결과와 실제 반영 내용을 이 글에서 알려 드리겠습니다.
짧은 첫인상도 도움이 됩니다. 감사합니다.
```

### 영어 Reddit 글

현재 작성 양식과 게시 자격을 확인한 뒤 사용한다. Description은 100단어 이상으로 준비했다.

```text
Title: Could you test the first minute of Escape! Zombie School?
Game Title: Escape! Zombie School
Playable Link: https://escapezombie.com/game?utm_source=reddit&utm_medium=community&utm_campaign=dev_playtest_202610&utm_content=first_controls_en
Platform: Web browser
Free to Play Status: Free to play. No in-game ads or paid purchases.
Involvement: I am the developer.

Description:
Escape! Zombie School is a survival action game set in a school overrun by zombies. You move to avoid enemies while your weapons attack automatically, then choose upgrade cards as you level up. Familiar items such as pencils and tumblers become weapons, and helping school friends is part of the game's setting and quests. I would appreciate a short first-play test rather than a long review. Could you try your first run and answer one question: at what moment were the controls or goal unclear? Surviving the first 60 seconds is a suggested test goal, not a separate game mode. The game is free and runs in a browser without installation. Google sign-in is required before starting. If something breaks, please include your device, browser, and the moment it happened. I will reply with what I learn and share any completed changes in this thread. Thank you for trying it.
```

### 질문 하나의 피드백 양식

```text
이번 질문: 처음 조작과 목표가 이해되지 않은 순간은 어디였나요?
답변: [한 줄이면 충분합니다]
문제가 있을 때만: 기기 / 브라우저 / 발생 장면
선택: 이 글에서 다음 변경을 알고 싶습니다 / 직접 다시 찾아오겠습니다
```

## 8 개선 결과와 재방문 연결

의견을 조작 혼란·재미·문제·재시작 이유로 나눈다. 같은 장면의 문제가 반복되는지 살피고 영향이 큰 문제 하나를 다음 개발 후보로 정리한다. 작은 개선과 문제 수정은 별도 개발 요청과 검증을 거치며 여기서는 실행 계획으로 다룬다.

답변은 “장면을 확인하겠습니다”, “확인되어 다음 작업 후보에 넣었습니다”, “이번 변경에서는 다루지 않습니다”처럼 현재 상태를 알려 주면 된다. 모두 고치겠다고 약속하지 않는다. 완료된 뒤에는 변경점과 확인 범위를 제시해 이전 참가자가 같은 장면을 다시 볼 이유를 만든다.

### 한국어 업데이트와 재방문 글

```text
제목: 탈출 좀비학교 첫 플레이 의견에서 확인한 것

지난 글에서 [문제 또는 질문]에 대한 의견을 받았습니다. 감사합니다.
이번에 실제 반영한 것은 [완료된 변경 한 가지]입니다.
이전: [실제 관찰]
현재: [완료된 차이와 확인 범위]
[전후 스크린샷 또는 GIF]

원하시면 같은 장면을 다시 해 보시고 “이번에는 이해하기 쉬웠나요?”만 알려 주세요.
플레이: https://escapezombie.com/game?utm_source=tistory&utm_medium=blog&utm_campaign=dev_playtest_202610&utm_content=update01_ko
무료 · 게임 내 광고와 유료 구매 없음 · 시작 전 Google 로그인 필요
아직 예정인 항목: [예정과 완료를 분리]
```

### 영어 업데이트 글

```text
Thanks for the feedback on [specific issue]. The completed change is [actual change].
Before: [observed behavior]. Now: [verified behavior].
If you would like to try the same moment again, I would appreciate one answer: is it clearer this time?
Play: [source-specific update URL]
Free browser game. Google sign-in is required. No in-game ads or paid purchases.
Still planned, not completed: [pending item].
```

후속 안내는 원글과 본인 개발일지에 남긴다. 참가자가 명시적으로 원할 때만 허용된 채널에서 알린다. 이 계획에서 연락처 수집 폼을 설치하거나 메일을 보내지 않는다. 자발적 공유를 원하는 사람에게는 공식 웹 링크와 한 줄 설명을 제공하고 추천·공유 보상을 조건으로 걸지 않는다.

## 9 무료 개발 페이지와 공개 모집 참여

itch.io는 무료 개발 페이지와 devlog 후보지만, 소개 등록·검색 노출·게임 실행 호환성은 각각 검토한다. [HTML5 공식 안내](https://itch.io/docs/creators/html5)는 브라우저 게임이 iframe 안에서 실행되며 ZIP 루트에 `index.html`이 필요하다고 설명한다. 현재 게임의 Google/Firebase 로그인은 팝업·리디렉션·허용 도메인·쿠키 조건과 함께 실제 호환성 확인이 필요하다.

[itch.io 품질 가이드](https://itch.io/docs/creators/quality-guidelines)는 방해되는 광고와 제3자 로그인을 피하도록 안내한다. 이는 단순 업로드 파일 형식과 다른 품질·노출 검토 조건이다. 게임 내 광고가 없더라도 Google 로그인이 필요하므로 등록·노출에 적합하다고 단정하지 않는다. 공개 devlog는 게임 파일을 업로드하지 않아도 검색 등록이 가능하다. 우선 무료 개발일지 공개를 검토하고, 작품 페이지의 검색 등록과 브라우저 게임 배포는 따로 판단한다. 작품 페이지 검색 등록에는 다운로드 또는 브라우저 플레이 같은 제공 조건이 있다. 로그인벽을 피하라는 안내는 필요한 경우를 인정하는 권고이며 절대 금지로 해석하지 않는다. [검색 등록 안내](https://itch.io/docs/creators/getting-indexed)도 함께 적용한다. 새 기능·업데이트 devlog는 플랫폼의 이메일 요약에 포함될 수 있지만 발송·수신을 보장하지 않는다. 커뮤니티 홍보는 지정된 Release announcements 게시판의 현재 규칙을 확인하고 다른 게임의 댓글에 링크를 남기지 않는다. 인증이나 iframe 코드를 임의 수정해 등록을 밀어붙이지 않는다.

크리에이터에게는 공개된 테스트 모집에 조건이 맞을 때 자발적으로 신청한다. 최근 모집 상태·브라우저 게임 허용·로그인 요구 허용을 확인한다. 대량 DM, 반복 연락, 무료 영상 제작 요구를 하지 않는다.

```text
공개 모집 신청 초안
안녕하세요. 공개하신 [모집 제목]의 조건을 보고 신청합니다.
저는 탈출! 좀비학교 개발자입니다. 무료 웹 생존 액션이며 시작 전 Google 로그인이 필요합니다.
게임: [UTM 링크]
원하시면 첫 판에서 조작과 목표가 이해되는지 의견을 부탁드립니다.
영상 제작이나 긍정적인 소개를 요구하지 않습니다. 모집 취지와 다르면 제외하셔도 괜찮습니다.
```

[게임을 플레이하고 메모를 제공하겠다는 Reddit 글](https://www.reddit.com/r/playmygame/comments/1wj2u9x/i_will_play_your_game_and_make_a_video_with_notes/)은 모집 형태의 참고 사례다. 절대 게시일을 확인하지 못했으므로 현재 모집 중이라고 취급하지 않는다. 최신 댓글과 마감을 확인하기 전 실행 대상으로 삼지 않는다.

## 10 유입 이름표와 실제 플레이 측정

UTM은 링크 끝에 붙이는 유입 이름표다. `utm_source`는 온 곳, `utm_medium`은 방식, `utm_campaign`은 모집 활동, `utm_content`는 글이나 변경 내용을 뜻한다. 이름·이메일·UID·토큰을 넣지 않는다. 기존 자동화 링크는 이 표만 보고 변경하지 않는다.

| 사용처 | 복사할 링크 |
| --- | --- |
| Tistory 개발일지 | https://escapezombie.com/game?utm_source=tistory&utm_medium=blog&utm_campaign=dev_playtest_202610&utm_content=devlog01_ko |
| 개발갤 자격 충족 뒤 | https://escapezombie.com/game?utm_source=dc_game_dev&utm_medium=community&utm_campaign=dev_playtest_202610&utm_content=first_controls_ko |
| 인디터 규칙 확인 뒤 | https://escapezombie.com/game?utm_source=naver_indiedev&utm_medium=community&utm_campaign=dev_playtest_202610&utm_content=first_controls_ko |
| Reddit | https://escapezombie.com/game?utm_source=reddit&utm_medium=community&utm_campaign=dev_playtest_202610&utm_content=first_controls_en |
| itch.io 개발 페이지 검토 | https://escapezombie.com/game?utm_source=itchio&utm_medium=referral&utm_campaign=dev_playtest_202610&utm_content=devpage01_en |
| 공개 테스트 모집 신청 | https://escapezombie.com/game?utm_source=public_playtest&utm_medium=referral&utm_campaign=dev_playtest_202610&utm_content=request01_ko |
| 반영 결과 공개 | https://escapezombie.com/game?utm_source=tistory&utm_medium=blog&utm_campaign=dev_playtest_202610&utm_content=update01_ko |

글을 다시 쓸 때 content만 `devlog02_ko`처럼 바꾸고 실제 게시 URL과 함께 기록한다. 업데이트를 다른 커뮤니티에 알릴 때 source도 해당 커뮤니티로 바꾼다. URL을 만들었다고 이벤트 수집이 확인된 것은 아니다.

현재 웹 측정 ID `G-HZ3LTGHV6F`, 속성 `541779330`, 계정 `332638246`, 웹 스트림 `15119854600`, Android 스트림 `15200017955` 연결 정보는 확인되어 있다. 실제 이벤트 송신과 대시보드 수집은 아직 검증되지 않았다. [GA 속성](https://analytics.google.com/analytics/web/#/p541779330/reports/intelligenthome)에서 수집이 확인되기 전 실측 수치를 추정해 채우지 않는다.

| 지표 | 계산과 관찰 |
| --- | --- |
| 방문에서 첫 판까지 | 첫 판 시작 신규 이용자 ÷ 방문 신규 이용자 × 100 |
| 로그인 성공률 | 로그인 성공 신규 이용자 ÷ 로그인 시도 신규 이용자 × 100 |
| 첫 60초 도달률 | 첫 판 60초 생존 신규 이용자 ÷ 첫 판 시작 신규 이용자 × 100 |
| 두 번째 판 비율 | 같은 날 두 번째 판을 시작한 신규 이용자 ÷ 첫 판 시작 신규 이용자 × 100 |
| D1 재방문 | 첫 플레이 다음 날 방문한 이용자 ÷ 추적 가능한 첫 플레이 이용자 × 100 |
| D7 재방문 | 첫 플레이 7일 뒤 방문한 이용자 ÷ 추적 가능한 첫 플레이 이용자 × 100 |
| 업데이트 확인 | 자발적으로 다시 온 사람의 같은 문제에 대한 응답을 기록한다. 플레이 측정과 별도다. |

같은 기간·채널·신규 집단을 분모와 분자에 사용한다. 60초는 게임 시계의 생존 시간이며 웹 체류·일시정지 시간을 뜻하지 않는다. D1과 D7은 방문 복귀와 실제 판 시작 복귀를 구분한다. 분모가 0이면 계산 불가, 동일인 식별이나 이벤트가 없으면 미측정이다. Firebase 랭킹 기록 수는 방문자수가 아니다.

측정 준비는 현재 이벤트 정의 확인 → 실제 송신 확인 → 실시간 또는 DebugView 수집 확인 → UTM과 로그인 복귀 연결 확인 순서다. `run_checkpoint`라는 이름만으로 정확한 60초라고 간주하지 않는다. 미비한 계측은 별도 개발 과제로 분리하며 localStorage 저장이나 인증정보 복제는 사용하지 않는다. 실제 Firebase 테스트는 초기 스냅샷·완전 복원 규칙을 먼저 충족한다. [Firebase 웹 분석](https://firebase.google.com/docs/analytics/web/get-started), [GA DebugView](https://support.google.com/analytics/answer/7201382?hl=ko)

## 11 하루 30분과 기간별 실행

매일 30분을 답변 10분, 일지 또는 모집문 준비 10분, 기록과 다음 행동 결정 10분으로 나눈다. 게시하지 않는 날도 피드백에 답하고 결과를 정리한다. 개발 자체의 시간은 이 운영 30분과 별도다. 아래 작업량은 운영 예시이며 커뮤니티가 허용하는 게시 빈도를 대신하지 않는다.

| 기간 | 실행 | 측정과 산출물 |
| --- | --- | --- |
| 첫 24시간 | 기존 소개 글 주소 확인, 실제 장면 1개 선택, 질문 1개와 모집문 준비, 채널 자격 확인. 허용된 곳이 있으면 1건 게시한다. | 원글 URL·UTM·게시 시각·자격 기록. 진입과 이벤트 상태를 확인하고 미측정 칸을 표시한다. |
| 2~3일 | 첫인상에 답하고 기기·장면을 확인한다. 개발일지 1개를 준비한다. | 조작 혼란·재미·문제·재시작 이유를 구분한다. 첫 판과 60초를 확인 가능한 범위에서 기록한다. |
| 4~7일 | 영향이 큰 문제 하나를 별도 작업 후보로 정리한다. 조건을 충족하면 영어 모집 1건을 시도한다. | 첫 판·두 번째 판·D1과 피드백 원문을 비교한다. 반영 전이면 예정으로 공개한다. |
| 8~14일 | 실제 완료된 개선이 있을 때 전후 장면과 업데이트를 공개한다. 참가자가 원하면 원글에서 알린다. | 같은 문제의 재응답, D7, 업데이트 링크 유입을 기록한다. |
| 15~21일 | 가장 도움이 된 질문과 채널을 유지한다. 새로운 문제 해결 일지 1개를 준비한다. | 채널별 판 시작과 응답의 구체성, 사용 시간을 비교한다. |
| 22~30일 | 계속 운영할 채널 최대 2개를 선택한다. Reddit 재게시 가능 날짜는 별도 확인한다. | 신규 시작·두 번째 판·재방문과 개발자 시간 대비 성과를 평가한다. |

**검증 목표 예시:** 첫 주 낯선 플레이어 3~5명의 첫인상을 확보한다. 사람 수는 유입 예측이나 달성 보장이 아니다. 한 명이라도 구체적인 시작 문제와 재방문 이유를 알려 주면 다음 실험의 근거가 된다. 작은 표본의 비율을 시장 전체의 성공으로 해석하지 않는다.

일일 기록은 `날짜 / 채널 / 글 URL / 질문 / 소재 / 방문 / 로그인 / 첫 판 / 60초 / 두 번째 판 / D1·D7 / 받은 의견 / 답변 / 완료·예정 / 다음 행동 / 사용 시간`이다. 수집되지 않는 수치는 미측정으로 남기고, 자발적인 댓글을 방문자 전체 통계로 확대하지 않는다.

## 12 중단 기준과 출처

| 관찰 | 결정 |
| --- | --- |
| 계정 자격 또는 홍보 허용이 불명확하다 | 해당 게시처를 보류하고 본인 개발일지와 이미 허용된 채널을 사용한다. |
| 로그인이나 시작이 막힌다는 제보가 반복된다 | 새 모집 확대를 멈추고 별도 복구 과제로 분리한다. 기존 정상 라이브 서비스는 유지한다. |
| 방문만 있고 실제 시작을 확인하지 못한다 | 노출을 늘리기보다 시작 흐름과 측정 상태를 확인한다. |
| 첫 판은 하지만 다시 할 이유가 없다 | 새 채널 추가보다 어떤 선택·성장이 두 번째 판을 만들지 질문한다. |
| 2주 동안 구체적 응답과 실제 시작이 모두 없다 | 그 채널에 쓰는 시간을 줄이고 실제 플레이를 만든 채널에 집중한다. |
| 의견은 많지만 모두 다른 내용을 말한다 | 가장 반복되는 시작 문제 하나로 질문을 좁힌다. |
| 완료된 변경이 없다 | 업데이트 완료라고 게시하지 않고 관찰한 내용과 다음 확인을 일지로 공유한다. |

외부 출처 확인일은 **2026년 10월 14일**이다. 게시일과 확인일은 구분한다.

| 출처 | 적용 범위 |
| --- | --- |
| [디시 최신 공지](https://gall.dcinside.com/mgallery/board/view/?id=game_dev&no=229623&page=1) | 2026년 10월 6일 게시, 홍보·테스트의 개발일지 5개 선행 조건 |
| [디시 기본 규칙](https://gall.dcinside.com/mgallery/board/view/?id=game_dev&no=174286) | 기본 이용 규칙. 최신 공지와 함께 읽는다. |
| [Reddit 공식 규칙 JSON](https://www.reddit.com/r/playmygame/about/rules.json) | 무료 현재 플레이·게임 설명·개발 참여·직접 링크·1개월 재게시 간격 |
| [인디터](https://cafe.naver.com/indiedev) | 주소 후보. 현재 게시 자격과 빈도는 추가 확인 필요 |
| [itch.io HTML5](https://itch.io/docs/creators/html5), [품질 가이드](https://itch.io/docs/creators/quality-guidelines), [검색 등록](https://itch.io/docs/creators/getting-indexed) | 업로드 방식·제3자 로그인 품질 조건·검색 노출을 각각 검토 |
| [공개 플레이 모집 예시](https://www.reddit.com/r/playmygame/comments/1wj2u9x/i_will_play_your_game_and_make_a_video_with_notes/) | 모집 형태의 참고, 게시일과 현재 모집 상태 미확인 |
| [Firebase 웹 분석](https://firebase.google.com/docs/analytics/web/get-started), [GA DebugView](https://support.google.com/analytics/answer/7201382?hl=ko) | 실제 수집을 확인하는 측정 준비 |

프로젝트 참고는 `Planner/escape_zombie_school_complete_guide_20261011.html`, `Graphic_designer/blog_tistory_20261011/tistory_body.html`, 같은 폴더의 `title.txt`다. 과거 홍보안의 채널·예산은 이번 무비용 설계의 실행 조건으로 사용하지 않는다. 기존 자산·무료 도구·본인 시간만 사용하며 게시·발송·지출·게임 변경·예약 변경을 이 문서 작성으로 수행한 것은 아니다.
