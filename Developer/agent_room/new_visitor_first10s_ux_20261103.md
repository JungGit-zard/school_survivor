# 신규 방문자 첫 10초 UX 감사 (2026-11-03, uimini)

조사만 했고 코드·커밋·배포는 하지 않았다. 대상은 라이브 https://escapezombie.com/?utm_source=... 이고, 저장소가 비어 있는 새 게스트로 접속했다.
도구는 Playwright 1.60(F:\ezs-work\rel의 node_modules) + 시스템 Chrome headless(SwiftShader WebGL)이고, locale은 en-US다.
모바일 프로필은 Fast-4G 스로틀(지연 150ms, 9Mbps)을 걸었다.
스크립트 원본은 스크래치패드의 audit.cjs, flow3.cjs에 있다. 로그인은 하지 않았다.

## 측정 요약

| 프로필 | FCP | 타이틀+START 버튼 표시 | 3D 타이틀 씬 완성 | 첫 10초 다운로드 |
|---|---|---|---|---|
| desktop 1366x768 | 3.2초 | 약 4~5초 (씬은 비어 있음) | 약 7~10초 | 7.0MB / 118요청 |
| galaxy 412x915 | 1.8초 ("Loading game…"만) | 약 2.5~3초 | 약 5초 | 7.2MB / 124요청 |
| fb_inapp 360x640 (FB_IAB UA) | 1.7초 | 약 2초 | 약 3~5초 | 7.2MB |
| landscape 915x412 | 1.7초 | 약 2초 | 약 5초 | 7.2MB |

- 0~1.7초(데스크톱은 3.2초)는 완전히 검은 화면이다. 그다음 약 1초 동안 검정 바탕에 "Loading game…" 문구만 뜬다.
- 가장 큰 전송은 타이틀 BGM `music.escapezombie.com/zombie_openning.mp3`(3.87MB)다. 탭하기 전, 타이틀에 도착한 지 약 6초 만에 받기 시작한다. 그 뒤로 vendor-rapier.js(714KB)와 PLAYER GLB 3개(각 약 370KB)가 이어지는데, 이 중 2개는 같은 모델의 중복(366KB x2)이다. 첫 10초 전송량의 54%가 오디오다.
- 콘솔 에러: landscape에서 GA collect가 ERR_NO_BUFFER_SPACE로 1건 실패했다. 나머지 프로필은 경고 1건("Deprecated API for given entry type")뿐이다.
- 실패 요청: 4개 프로필 모두 GA4 `page_view` collect 요청이 ERR_ABORTED로 끝났다. headless 환경 탓일 수 있어서 확정은 아니다. 다만 사실이라면 GA의 방문 수와 이탈 수치 자체가 틀렸을 수 있으니 확인할 가치가 있다.
- 차단 요소: 쿠키·동의 배너, 언어 선택, 방향 잠금, 오디오 잠금 게이트는 하나도 없다. 로그인은 강제가 아니고, 게스트로 바로 진행할 수 있다.

## 착지에서 실제 런까지 탭 수: 5탭, 빠르게 눌러도 약 15초

1. 타이틀 "START GAME" (`flow_galaxy_00_title.png`)
2. 로비 Stage 1 "ENTER" (`flow_galaxy_01_lobby.png`). 로비에는 잠긴 Stage 2~4 카드, Weapons/Ranking/Shop/Missions, Rosari's Room, 시즌 배너가 함께 떠서 신규 방문자가 고를 것이 많다.
3~5. 스토리 대사 3장을 각각 "Tap the screen to continue"로 넘긴다. 문구를 읽고 넘기면 약 7초가 걸린다. 대사가 떠 있는 동안 HUD는 00:00에서 멈춰 있다.
- 실측 경과: 진입 후 4.8초에 START, 9.0초에 ENTER, 17.4초에 런이 시작됐다(`flow_galaxy_04_run2.png`). 런 자체는 정상 동작한다.

## 언어

- 화면 문구는 en-US에서 전부 영어로 나온다. 그런데 `<html lang="ko">`이고 `<title>`이 "탈출! 좀비학교🧟‍♀️🏫❤️"다. FB·X 인앱 브라우저 상단 바, 탭 제목, 최근 앱 목록에 한국어 제목이 그대로 보인다. og:title과 description은 영어다.

## 좁은 화면과 짧은 화면에서 깨지는 곳

- fb_inapp 360x640: 상단 "Ready to link account / Sign in with Google" 카드가 2줄로 커지면서 "ESCAPE!" 헤드라인을 가린다(`fb_inapp_03000ms.png`). 첫 화면에서 가장 눈에 띄는 요소가 로그인 카드가 된다.
- landscape 915x412: 세로형 레이아웃이 가운데 기둥으로 줄고 좌우가 흰 바탕으로 남는다. "ZOMBIE SCHOOL"은 "MBIE SCHOO"로 잘리고, 로그인 카드의 "Sign in with Goog…"도 잘린다(`landscape_short_05000ms.png`).
- desktop: 1366 폭 화면 중앙에 432px 폭 기둥만 있고 좌우는 흰 여백이다. 깨진 페이지처럼 보인다. 5초 시점에는 3D 씬이 비어 있고 "SCH O" 글자가 흩어져 있다(`desktop_05000ms.png`).
- 터치 타깃: START 224x58, Homepage 224x44, Contact/EN 72x44. 모두 44px 기준을 만족한다. 다만 "Homepage"가 START 바로 아래에 같은 크기로 있어서 게임 밖으로 나가는 두 번째 CTA 역할을 한다.

## 이탈 원인 가설 (순위)

1. 5탭과 약 15초가 걸리는 시작 경로. 0~9초 안에 이탈하는 방문자는 그 시점에 아직 타이틀이나 로비에 있다. 로비 선택지와 대사 3장이 START 뒤에 추가로 버티고 있다.
2. 첫 2~3초의 검은 화면과 "Loading game…", 그리고 데스크톱에서 흰 여백과 빈 씬이 약 5초 이어지는 것. 인앱 브라우저에서 링크를 연 사람은 검은 화면을 보는 시점에 뒤로가기를 누른다. 3.9MB BGM이 같은 회선을 차지한다.
3. 첫 화면 위계. 신규 방문자 눈에 가장 먼저 들어오는 것이 로그인 카드("Ready to link account")와 Homepage/Contact다. 360폭에서는 로그인 카드가 제목을 가리고, 가로 화면은 잘린다. 거기에 한국어 페이지 제목이 겹쳐 "로그인해야 하는 외국 사이트"처럼 보인다.

## 빠른 수정 후보 (구현은 해당 상주 에이전트 담당)

- 신규 게스트(기록 없음)는 START 한 번에 Stage 1로 바로 진입하고 로비는 건너뛴다. 스토리는 1장으로 줄이거나 자동으로 넘기고, 넘기는 동안에도 런 타이머를 시작한다. (levelmini + uimini)
- index.html 안에 정적 타이틀 이미지와 START 버튼을 인라인으로 넣어 0.5초 안에 보이게 한다. 3D 씬은 그 뒤에 점진적으로 붙인다. (uimini + threemini)
- 타이틀 BGM은 첫 탭 이후에 받는다(`preload="none"`). 128kbps 이하 짧은 루프로 줄이고, 중복 PLAYER GLB는 제거한다. (soundmini + threemini)
- 게스트에게는 로그인 카드를 숨기거나 작은 아이콘으로 접는다. Homepage 버튼의 위계를 낮춘다. 가로 화면과 데스크톱의 흰 여백은 어두운 배경으로 채운다. (uimini)
- `<title>`과 `lang`을 접속 언어에 맞춰 동적으로 바꾸거나, 기본값을 영어로 둔다. (uimini/englishgradmini)
- GA page_view ERR_ABORTED를 실기기에서 확인한다. (backendmini)

## 스크린샷 (F:\ezs-work\oni\Developer\agent_room\new_visitor_first10s_shots_20261103\)

- 타임라인: `{desktop,galaxy,fb_inapp,landscape_short}_{00500..15000}ms.png` (0.5/1/2/3/5/7/10/15초)
- 핵심 컷: `galaxy_02000ms.png`(Loading 화면), `galaxy_05000ms.png`(타이틀), `fb_inapp_03000ms.png`(제목 가림), `landscape_short_05000ms.png`(잘림), `desktop_05000ms.png`(흰 여백 + 빈 씬)
- 흐름: `flow_galaxy_00_title.png`, `flow_galaxy_01_lobby.png`, `flow_galaxy_02_story2.png`, `flow_galaxy_03_run.png`, `flow_galaxy_04_run2.png`, 로그 `flow_galaxy.log`
- 원자료: `results.json`

한계: headless SwiftShader로 측정했으므로 실기기 GPU, 실제 FB·X WebView, 실제 셀룰러 환경과는 차이가 있다.
