# X 웹사이트 카드 게시 인수인계 — 2026-10-10

## 범위와 최종 상태

- 대상은 X 전용 웹사이트 카드 게시다. 기존 사진 게시물은 정본으로 유지하며 수정·삭제·교체하지 않는다.
- 웹사이트 카드 72개(한국어·영어·일본어·베트남어 각 18개)를 안전한 미리보기 검증 후 라이브에 승격했다. baseline Hosting version `8e9519ae235dc93c`의 기존 290개 파일과 Hosting 설정을 보존했고, HTML·PNG 144개를 추가한 promoted version은 `ca008e9ac31ddefa`다. 미리보기 주소는 `https://escape-zombie-school--x-cards-20261010-9dl9nxv0.web.app`이다.
- 기존 JavaScript 파일 56개의 HTTP 검사와 카드 72개의 HTML·PNG 및 SHA 검증이 통과했다. 라이브 카드 `https://escapezombie.com/share/x/ko/77d1fc620bc61ed1`은 HTTP 200과 카드 메타데이터를 반환했다.
- 2026-10-10 14:04:12Z에 작성기 준비가 성공했고, 전체 문구와 `https://escapezombie.com/share/x/ko/b3b795b213eeda0a` URL이 들어간 미리보기에서 516×272 native group, `From`, `Remove` 표시를 확인했다.
- 앞선 좌표 클릭 결과는 불확실했다. 사용자가 명시적으로 다시 게시하라고 한 뒤 UI Automation의 `PostButton.Invoke()`가 `POST_BUTTON_INVOKED`를 반환했고, 직후 `composerOpen=false`, `editorCount=0`을 확인했다. 따라서 게시 버튼 동작은 완료된 것으로 기록하되, 피드에서 게시물을 확인하지 않았으므로 상태는 `published_unverified`다. 이번 실행 주기에는 재시도하지 않는다. 게시 후 피드 확인은 사용자가 담당한다.
- `KR_LIVE_x64`는 한국어 X 계정명이 아니라 화면을 가리던 게임 창 제목이다. `WebsiteCardOnly=true` 설정을 사용한다. 사용자는 “좋다 아주 좋다 잘했다.”라고 답했다.
- GitHub 반영 대상은 `JungGit-zard/school_survivor` 저장소의 `zombie_only` 브랜치다. 검증 결과는 아래 기록과 해당 커밋을 참조한다.

## CTA 문구가 들어간 이미지

- CTA가 실제 이미지 안에 보이는 4개 언어 신규 이미지를 생성하고 X/Facebook 경로에 각각 복사했다. 기존 image pool과 기존 72개 카드 이미지는 보존한다.
- 그림에 보이는 정확한 CTA: ko `게임시작`, en `START GAME`, ja `ゲームスタート`, vi `BẮT ĐẦU CHƠI`. 제목, 헤드라인, 무료/광고 없음 badge도 언어별로 눈으로 확인했다.
- 프롬프트, 경로, 해시 증거: `Graphic_designer/social_posting_cta_20261010/manifest.json`. image_catalog.json에 X/Facebook 8행을 등록하고 실제 문구와 일치하는 gameStartText 및 SHA-256를 기록했다. posting_config.json에는 기존 로컬 pool을 보존하며 언어별 신규 X 경로를 1개씩 뒤에 추가했다. CTA 게시 선택은 실제 시각 확인된 gameStartText가 있는 신규 행만 대상으로 한다.
- CTA 카드 4개의 새로운 호스팅 버전: `4cf0fa84de6c481f`. 기준 version `ca008e9ac31ddefa`의 기존 434개 파일과 설정을 보존하고 CTA HTML/PNG 8개를 추가했다. 기존 144개 카드 파일 경로는 변하지 않았다. 76개 카드와 기존 JavaScript 56개 검사가 통과했다. 미리보기: https://escape-zombie-school--x-cards-cta-20261010-nmdhft2e.web.app.
- 이 CTA 이미지를 쓴 실제 X 게시는 없다. 기존 `published_unverified` 게시 의도와 피드 사후 확인 상태를 변경하지 않는다.

## 카드 생성기 와 다음 Hosting 빌드

- `marketing/x_daily_zombie_school_posting/Build-XWebsiteCards.mjs`는 현재 설정에서 정적 X 카드 76개를 만든다(한국어·영어·일본어·베트남어 각 19개). 이전 카드도 유지하지만 새 게시에는 CTA 조건을 통과한 이미지만 선택한다.
- 저장소 최상위에서 실행할 명령:

  ```powershell
  node marketing/x_daily_zombie_school_posting/Build-XWebsiteCards.mjs --output <output-directory> --repo-root <repository-root>
  ```

- `--output`은 필수이며 `--repo-root`는 생략할 수 있다. 입력은 캠페인 `posting_config.json`의 기본 이미지, 활성 변형 이미지, 활성 언어별 이미지 및 `image_pool/image_catalog.json`이다. 카드 URL 해시는 원본 이미지 SHA-256 앞 16자리다.
- 생성 manifest에는 원본·이미지·카드 경로, 해시, 필요한 HTTP 검사 항목이 기록된다. 생성기 테스트는 `Build-XWebsiteCards.test.mjs`에 있다.
- `Developer/r3f_prototype/firebase.json`의 `hosting.predeploy` 마지막 단계가 `--output dist`로 생성기를 실행한다. 기존 nonce 검사 → 게임 빌드 → 법률 페이지 빌드 순서는 유지된다.

## 배포와 작업 환경 경계

- Deploy-XWebsiteCards.cjs와 연관 파일은 F canonical의 Developer/agent_room에 있다.

- 검증되지 않은 라이브 REST 직접 배포는 금지한다. 기존 라이브 파일 보존, 미리보기 및 검증을 거치는 추가 파일 배포 절차만 사용한다.
- 생성기 실행 결과인 임시 폴더는 운영 정본이 아니다. 다른 PC의 임시 폴더 결과를 정본 배포 입력으로 사용하지 말고, 배포 PC에서 정본 원본을 기준으로 다시 생성한다.

## 변경 범위와 검증 기록

- 생성기와 테스트: `marketing/x_daily_zombie_school_posting/Build-XWebsiteCards.mjs`, `Build-XWebsiteCards.test.mjs`.
- 다음 Hosting 빌드의 카드 재생성 연결: `Developer/r3f_prototype/firebase.json`.
- 공유 작업트리는 관련 없는 변경이 있어 전체 stage/push를 하지 않는다. 커밋·푸시는 메인 작업자가 명시된 변경 경로만 확인해 진행한다.
- 테스트: `node --test marketing/x_daily_zombie_school_posting/Build-XWebsiteCards.test.mjs`; 현재 작업에서 전달된 추가 검증은 PowerShell 6건과 Node 7건 통과.
- 안전한 Hosting 승격은 메인 작업자가 수행했다. 기록자는 게임 빌드나 배포를 실행하지 않았다.
