# 미디어 사이트 B (만화 · 마케팅 이미지)

게임 프로젝트 A(escapezombie.com)와 **완전히 분리된** 정적 사이트다. 게임 코드·번들·에셋에 대한 의존이 0이고,
게임 dist에는 이 폴더의 어떤 파일도 들어가지 않는다. 게임 랜딩은 이 사이트로 가는 텍스트 링크만 가진다
(`src/lib/mediaSite.js`의 `MEDIA_SITE_URL` 상수 하나 — 도메인 확정 시 그 한 줄만 바꾼다).

## 배포 루트

`media-site/site/` 를 그대로 정적 호스팅(Cloudflare Pages 프로젝트 B)의 출력 폴더로 쓴다. 빌드 단계 없음.
`_headers` / `_redirects` 는 배포 담당(backendmini)이 이 폴더에 추가한다.

```
site/
  index.html            만화 뷰어 (순수 HTML)
  styles.css
  app.js                최소 JS: 언어 선택, 썸네일 목록, 원본 보기 dialog, #ko/07 딥링크
  comics/
    episodes.json       편 목록·언어별 제목/요약·UI 문구·이미지 경로
    thumbs/{shared|ko|en|ja|vi}/NN.webp   400x300 첫 컷 크롭, q72 (~30KB)
    full/{shared|ko|en|ja|vi}/NN.webp     폭 ≤1080, q82 (~300KB)
  share/x/              X(트위터) 공유 카드 — backendmini가 배치 (현재 비어 있음)
  blog/                 블로그/포스팅 이미지 — backendmini가 배치 (현재 비어 있음)
```

- 1~5화(`shared/`)는 한국어 대사 v2 원본 한 벌을 모든 언어가 공유한다(기존 랜딩 동작과 동일).
- 6~15화는 언어별(ko/en/ja/vi) 원본.
- 뷰어(index.html/app.js)는 `comics/full`·`comics/thumbs`의 WebP만 사용한다. PNG 원본은 보관용:
  - 1~5화: `media-site/originals/web-comics-v2/*.png` (배포 금지 폴더)
  - 6~15화: `public/comics/backlog-20261015/{lang}/NN.png` (게임 빌드에서 제외됨 — `vite.config.js` `GAME_DIST_PUBLIC_EXCLUDES`)

- `comics/backlog-*/`, `web-comics/`, `share/x/`, `x-website-cards-manifest.json`, `_headers` 는 backendmini가
  옛 링크(이미 X에 올라간 escapezombie.com/comics/... 등 → 게임 사이트 `_redirects` 301) 호환을 위해 배치한 것이다.
  뷰어는 이 경로들을 참조하지 않는다.
- 도메인: `https://media.escapezombie.com/` (게임 쪽 상수 `src/lib/mediaSite.js`).

## 다시 만들기

r3f_prototype 폴더에서:

```
python media-site/tools/build_comics.py
```

- 제목/요약 문구 원본: `media-site/tools/comic-copy.json` (게임 `webLandingCopy.js`에서 한 번 추출한 사본, 이후 독립 관리).
- Pillow 필요. 원본 PNG는 읽기만 한다.

## 미사용 후보 원본(참고)

`Developer/agent_room/hosting_cleanup_release_20261022/dist/` 에 이전 배포본이 남아 있다:
`web-comics/v3`, `web-comics/localized-v3/{en,ja,vi,id,zh-CN}`(1~5화 현지화판), `comics/backlog-dialogue-20261018`(6~15화 대사 개정판),
`web-comics/daily/2026-10-13`, `share/x/*`. 1~5화 현지화판으로 바꾸려면 `build_comics.py`의 소스 경로만 교체하면 된다.

## 로컬 확인

```
python -m http.server 8090 --directory media-site/site
```
